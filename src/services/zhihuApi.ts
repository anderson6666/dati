import type { ApiConfig, ZhihuPost } from "@/types";

/**
 * 规范化代理地址：自动适配 ?url= 格式
 * 用户可能输入 https://xxx.workers.dev/ 或 https://xxx.workers.dev 而未带 ?url=
 * 此时自动补全为 https://xxx.workers.dev/?url= 以匹配 Worker 代码
 */
export function normalizeProxyUrl(rawProxy: string): string {
  let proxy = rawProxy.trim();
  if (
    proxy &&
    !proxy.endsWith("=") &&
    !proxy.includes("?url=") &&
    !proxy.includes("?quest=") &&
    !proxy.includes("thingproxy") &&
    !proxy.includes("codetabs")
  ) {
    proxy = proxy.endsWith("/") ? `${proxy}?url=` : `${proxy}/?url=`;
  }
  return proxy;
}

/**
 * 测试代理可用性（包括 CORS preflight 处理）
 *
 * 检测项：
 * 1. 代理是否能转发请求到知乎 API
 * 2. 是否正确响应 OPTIONS 预检请求（带自定义头时必需）
 * 3. 是否返回 CORS 头
 *
 * 注意：测试用知乎 API 不带签名，预期返回 401/422，但能验证代理可用性
 *
 * @param rawProxy 用户输入的代理地址
 * @returns 检测结果
 */
export async function testProxyAvailable(
  rawProxy: string
): Promise<{
  ok: boolean;
  message: string;
  details?: {
    preflightOk?: boolean;
    requestOk?: boolean;
    statusCode?: number;
  };
}> {
  const proxy = normalizeProxyUrl(rawProxy);
  if (!proxy) {
    return { ok: false, message: "代理地址为空" };
  }

  // 用 GitHub API 作为测试目标（稳定，返回 200 纯文本）
  const testTarget = "https://api.github.com/zen";
  let finalUrl: string;
  if (proxy.includes("thingproxy")) {
    finalUrl = `${proxy}${testTarget}`;
  } else if (proxy.includes("codetabs")) {
    finalUrl = `${proxy}${testTarget}`;
  } else {
    // ?url= 格式：只编码 & 和 #，避免二次编码
    const encodedTargetUrl = testTarget
      .replace(/&/g, "%26")
      .replace(/#/g, "%23");
    finalUrl = `${proxy}${encodedTargetUrl}`;
  }

  const details: {
    preflightOk?: boolean;
    requestOk?: boolean;
    statusCode?: number;
  } = {};

  try {
    // 第 1 步：测试实际 GET 请求（带自定义头，模拟实际采集场景）
    // 带自定义头会触发 CORS preflight，验证 Worker 是否正确处理 OPTIONS
    try {
      const resp = await fetch(finalUrl, {
        method: "GET",
        headers: {
          "X-Zse-93": "101_3_3.0",
          "X-Zse-96": "test-signature",
          "Cookie": "d_c0=test",
          "Content-Type": "application/json",
        },
      });
      details.statusCode = resp.status;

      // 知乎不带正确签名会返回 401/403/422，但只要收到响应就说明代理可用
      const hasCorsHeader =
        resp.headers.get("Access-Control-Allow-Origin") !== null;

      if (!hasCorsHeader) {
        return {
          ok: false,
          message: `代理响应缺少 CORS 头（状态 ${resp.status}）。请确保 Worker 代码设置了 Access-Control-Allow-Origin。`,
          details,
        };
      }

      // 收到响应 + 有 CORS 头 = 代理可用
      details.requestOk = true;
    } catch (err) {
      details.requestOk = false;
      return {
        ok: false,
        message: `代理请求失败：${err instanceof Error ? err.message : "网络错误"}。代理可能未部署、地址错误，或未正确处理带自定义头的 CORS preflight。`,
        details,
      };
    }

    // 第 2 步：测试 OPTIONS 预检请求（验证带自定义头时的 CORS 处理）
    try {
      const preflightResp = await fetch(finalUrl, {
        method: "OPTIONS",
        headers: {
          "X-Test-Header": "test-value",
          "Content-Type": "application/json",
        },
      });
      details.preflightOk =
        preflightResp.ok || preflightResp.status === 204 || preflightResp.status === 200;

      const allowOrigin = preflightResp.headers.get("Access-Control-Allow-Origin");
      const allowHeaders = preflightResp.headers.get("Access-Control-Allow-Headers");

      if (!details.preflightOk) {
        return {
          ok: false,
          message: `预检请求失败（状态 ${preflightResp.status}）。代理未正确处理 OPTIONS 请求，请更新 Worker 代码。`,
          details,
        };
      }
      if (!allowOrigin && !allowHeaders) {
        return {
          ok: false,
          message: "预检响应缺少 CORS 头。请确保 Worker 代码返回 Access-Control-Allow-Origin 和 Access-Control-Allow-Headers。",
          details,
        };
      }
    } catch (err) {
      details.preflightOk = false;
      return {
        ok: false,
        message: `预检请求被阻止：${err instanceof Error ? err.message : "网络错误"}。代理可能未处理 OPTIONS 请求。`,
        details,
      };
    }

    // 根据状态码给出不同的成功提示
    const status = details.statusCode;
    let message = "代理可用：请求转发正常，CORS 头完整。";
    if (status === 401 || status === 403) {
      message = `代理可用（知乎返回 ${status}，需签名）。代理转发正常，CORS 头完整，可正常使用。`;
    } else if (status === 422) {
      message = `代理可用（知乎返回 422，签名校验）。代理转发正常，CORS 头完整，可正常使用。`;
    } else if (status && status >= 200 && status < 300) {
      message = `代理可用（状态 ${status}）。代理转发正常，CORS 头完整。`;
    }

    return {
      ok: true,
      message,
      details,
    };
  } catch (err) {
    return {
      ok: false,
      message: `代理检测异常：${err instanceof Error ? err.message : "未知错误"}`,
      details,
    };
  }
}

/**
 * 通过 Worker 转发调用知乎官方开放平台 API（避免 CORS）
 *
 * 官方 API 端点：
 * - 全网搜索：POST https://open.zhihu.com/v1/global_search
 * - 站内搜索：POST https://open.zhihu.com/v1/search
 *
 * 鉴权：Authorization: Bearer {AccessKey}
 * Body：{"query": "xxx", "limit": 10, "offset": 0}
 *
 * Worker 端点：/zhihu-official-search?q=xxx&access_key=xxx&offset=0&limit=10&scope=global|site
 * 前端只发简单 GET 请求，不触发 CORS preflight
 */
async function searchOfficial(
  keyword: string,
  config: ApiConfig,
  maxPages = 5
): Promise<ZhihuPost[]> {
  const allPosts: ZhihuPost[] = [];
  const pageSize = 10;

  // 从 corsProxyUrl 提取 Worker 基础地址
  const workerBase = (config.corsProxyUrl || "")
    .trim()
    .replace(/\?url=.*$/, "")
    .replace(/\/$/, "");

  // 搜索范围：全网或站内
  const scope = config.zhihuSearchType === "站内" ? "site" : "global";

  for (let pageNum = 0; pageNum < maxPages; pageNum++) {
    const offset = pageNum * pageSize;

    try {
      let resp: Response;

      if (workerBase) {
        // 通过 Worker 转发（避免 CORS）
        const workerUrl = new URL(`${workerBase}/zhihu-official-search`);
        workerUrl.searchParams.set("q", keyword);
        workerUrl.searchParams.set("access_key", config.zhihuApiKey);
        workerUrl.searchParams.set("offset", String(offset));
        workerUrl.searchParams.set("limit", String(pageSize));
        workerUrl.searchParams.set("scope", scope);

        // 简单 GET 请求，不触发 CORS preflight
        resp = await fetch(workerUrl.toString(), { method: "GET" });
      } else {
        // 直接调用官方 API（可能遇到 CORS，作为回退）
        const endpoint =
          scope === "site"
            ? "https://open.zhihu.com/v1/search"
            : "https://open.zhihu.com/v1/global_search";

        resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.zhihuApiKey}`,
          },
          body: JSON.stringify({
            query: keyword,
            limit: pageSize,
            offset: offset,
          }),
        });
      }

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        if (resp.status === 401 || resp.status === 403) {
          throw new Error(
            `知乎官方 API 鉴权失败（${resp.status}）：AccessKey 无效或已过期。请检查知乎开放平台 API Key。`
          );
        }
        throw new Error(
          `知乎官方 API 请求失败 (${resp.status})：${errText.slice(0, 200) || resp.statusText}`
        );
      }

      const data = await resp.json();
      // 兼容多种响应格式
      const items = data.data || data.items || data.results || data.pageItems || [];

      if (items.length === 0) break;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        allPosts.push({
          id: item.id || `zhihu_p${pageNum}_${i}_${Date.now()}`,
          title: item.title || "（无标题）",
          content: item.content || item.snippet || item.excerpt || "",
          author: item.author || item.source || "匿名用户",
          url: item.url || item.link || "",
          publishedAt:
            item.publish_time ||
            item.published_at ||
            (item.created_time
              ? new Date(item.created_time * 1000)
                  .toISOString()
                  .slice(0, 10)
              : new Date().toISOString().slice(0, 10)),
          voteupCount: item.voteup_count || item.answer_count || 0,
        });
      }

      if (items.length < pageSize || data.has_more === false) break;
    } catch (err) {
      if (pageNum === 0) throw err;
      break;
    }
  }

  return allPosts;
}

/**
 * 知乎搜索主入口
 *
 * 使用官方开放平台 API（合规，通过 Worker 转发避免 CORS）
 */
export async function searchZhihu(
  keyword: string,
  config: ApiConfig,
  maxPages = 5
): Promise<ZhihuPost[]> {
  if (!config.zhihuApiKey?.trim()) {
    throw new Error(
      "未配置知乎 API Key。请在配置区填写知乎开放平台 API Key。"
    );
  }
  return searchOfficial(keyword, config, maxPages);
}

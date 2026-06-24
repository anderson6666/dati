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
    simpleOk?: boolean;
    preflightOk?: boolean;
    requestOk?: boolean;
    statusCode?: number;
    failureStage?: "simple" | "preflight" | "request";
    finalUrl?: string;
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
    simpleOk?: boolean;
    preflightOk?: boolean;
    requestOk?: boolean;
    statusCode?: number;
    failureStage?: "simple" | "preflight" | "request";
    finalUrl?: string;
  } = {};

  // 第 1 步：无自定义头 GET（不触发 CORS preflight，验证基础连通性 + 部署）
  try {
    const simpleResp = await fetch(finalUrl, { method: "GET" });
    details.simpleOk = simpleResp.ok || simpleResp.status >= 400; // 任何 HTTP 响应都算"通"
    if (!details.simpleOk) {
      details.failureStage = "simple";
      return {
        ok: false,
        message: `代理无响应（无自定义头时也失败）。请检查：① Worker 是否已部署；② 地址是否正确（不要带路径）；③ 浏览器能否直接打开 ${proxy}。`,
        details: { ...details, finalUrl },
      };
    }
  } catch (err) {
    details.simpleOk = false;
    details.failureStage = "simple";
    const msg = err instanceof Error ? err.message : "网络错误";
    if (location.protocol === "https:" && proxy.startsWith("http://")) {
      return {
        ok: false,
        message: `混合内容被浏览器拦截：当前页面是 HTTPS，代理是 HTTP。请改用 https:// 的代理地址。`,
        details: { ...details, finalUrl },
      };
    }
    return {
      ok: false,
      message: `代理不可达（${msg}）。可能原因：① Worker 未部署或路由配置错误；② 地址拼写错误（注意是否漏掉 ?url=）；③ DNS / 网络问题。请在浏览器直接访问 ${proxy} 验证。`,
      details: { ...details, finalUrl },
    };
  }

  // 第 2 步：带自定义头 GET（触发 CORS preflight，验证 Worker 是否处理 OPTIONS）
  try {
    const resp = await fetch(finalUrl, {
      method: "GET",
      headers: {
        "X-Zse-93": "101_3_3.0",
        "X-Zse-96": "test-signature",
        Cookie: "d_c0=test",
        "Content-Type": "application/json",
      },
    });
    details.statusCode = resp.status;

    const hasCorsHeader =
      resp.headers.get("Access-Control-Allow-Origin") !== null;

    if (!hasCorsHeader) {
      return {
        ok: false,
        message: `代理响应缺少 CORS 头（状态 ${resp.status}）。请在 Worker 中设置：Access-Control-Allow-Origin: *。`,
        details: { ...details, finalUrl },
      };
    }
    details.requestOk = true;
  } catch (err) {
    details.requestOk = false;
    details.failureStage = "request";
    const msg = err instanceof Error ? err.message : "网络错误";
    return {
      ok: false,
      message: `带自定义头时请求失败（${msg}）。第 1 步能通说明代理已部署；此步失败说明 Worker 没有正确处理带自定义头的 CORS preflight。请在 Worker 的 fetch 处理中，对 OPTIONS 请求直接返回 204 并带上 CORS 头。`,
      details: { ...details, finalUrl },
    };
  }

  // 全部通过：根据状态码给出不同的成功提示
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
    details: { ...details, finalUrl },
  };
}

/**
 * 通过 Worker 转发调用知乎官方开放平台 API（避免 CORS）
 *
 * 官方 API 端点：
 * - 全网搜索：POST https://open.zhihu.com/api/v4/search/global
 * - 站内搜索：POST https://open.zhihu.com/api/v4/search/site
 *
 * 鉴权：OAuth 2.0 client_credentials → Bearer {access_token}
 * Body：{"query": "xxx", "limit": 10, "offset": 0}
 *
 * Worker 端点：/zhihu-official-search?q=xxx&client_secret=xxx&offset=0&limit=10&scope=global|site
 * 前端只发简单 GET 请求，不触发 CORS preflight
 *
 * 鉴权流程：
 * 1. 前端传入 client_secret（API Key，40位十六进制）
 * 2. Worker 内部先调用 OAuth 端点换取 access_token
 * 3. 再用 access_token 调用搜索接口
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

  if (!workerBase) {
    throw new Error("未配置 CORS 代理地址（Worker 地址）。请先填写 Worker 地址后再采集。");
  }

  // 搜索范围：全网或站内
  const scope = config.zhihuSearchType === "站内" ? "site" : "global";

  for (let pageNum = 0; pageNum < maxPages; pageNum++) {
    const offset = pageNum * pageSize;

    try {
      // 通过 Worker 转发（Worker 内部处理 OAuth + 搜索）
      // client_id 和 client_secret 可选：如果前端未填，Worker 从环境变量读取
      const workerUrl = new URL(`${workerBase}/zhihu-official-search`);
      workerUrl.searchParams.set("q", keyword);
      if (config.zhihuClientId?.trim()) {
        workerUrl.searchParams.set("client_id", config.zhihuClientId.trim());
      }
      if (config.zhihuApiKey?.trim()) {
        workerUrl.searchParams.set("client_secret", config.zhihuApiKey.trim());
      }
      workerUrl.searchParams.set("offset", String(offset));
      workerUrl.searchParams.set("limit", String(pageSize));
      workerUrl.searchParams.set("scope", scope);

      // 简单 GET 请求，不触发 CORS preflight
      const resp = await fetch(workerUrl.toString(), { method: "GET" });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        // 尝试解析 Worker 返回的详细错误信息
        let detail = errText;
        try {
          const errObj = JSON.parse(errText);
          detail = errObj.error + (errObj.responseBody ? `\n知乎响应: ${errObj.responseBody}` : "");
        } catch {
          detail = errText.slice(0, 300);
        }
        if (resp.status === 401 || resp.status === 403) {
          throw new Error(
            `知乎 OAuth 鉴权失败（${resp.status}）：client_id/client_secret 无效，或 access_token 已过期。\n${detail}`
          );
        }
        throw new Error(
          `知乎官方 API 请求失败 (${resp.status})：\n${detail}`
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
  // 知乎凭证可选：前端填写 或 Worker 环境变量配置（二选一）
  const hasFrontendCreds = config.zhihuClientId?.trim() && config.zhihuApiKey?.trim();
  if (!hasFrontendCreds) {
    // 前端未填，提醒用户也可在 Worker 环境变量中配置
    console.info(
      "知乎凭证未在前端配置，将依赖 Worker 环境变量 ZHIHU_CLIENT_ID / ZHIHU_CLIENT_SECRET"
    );
  }
  return searchOfficial(keyword, config, maxPages);
}

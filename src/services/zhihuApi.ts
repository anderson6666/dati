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
 * 通过 Worker 代理调用知乎网页搜索 API（避免 CORS，无需 OAuth 凭证）
 *
 * 网页搜索端点：GET https://www.zhihu.com/api/v4/search_v3?t=general&q=xxx&correction=1&offset=0&limit=20
 * 这是知乎网站自用的搜索接口，返回 JSON，无需 client_id/client_secret。
 *
 * Worker 端点：/zhihu-search?q=xxx&offset=0&limit=10
 * 前端只发简单 GET 请求，不触发 CORS preflight
 */
async function searchWeb(
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

  for (let pageNum = 0; pageNum < maxPages; pageNum++) {
    const offset = pageNum * pageSize;

    try {
      // 通过 Worker 代理转发知乎网页搜索 API
      const workerUrl = new URL(`${workerBase}/zhihu-search`);
      workerUrl.searchParams.set("q", keyword);
      // 传入 z_c0 cookie 用于鉴权，避免 403 人机验证
      if (config.zhihuApiKey?.trim()) {
        workerUrl.searchParams.set("z_c0", config.zhihuApiKey.trim());
      }
      workerUrl.searchParams.set("offset", String(offset));
      workerUrl.searchParams.set("limit", String(pageSize));

      // 简单 GET 请求，不触发 CORS preflight
      const resp = await fetch(workerUrl.toString(), { method: "GET" });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        let detail = errText;
        try {
          const errObj = JSON.parse(errText);
          detail = errObj.error + (errObj.responseBody ? `\n知乎响应: ${errObj.responseBody}` : "");
        } catch {
          detail = errText.slice(0, 300);
        }
        if (resp.status === 401 || resp.status === 403) {
          throw new Error(
            `知乎搜索被拒绝（${resp.status}）：z_c0 cookie 可能已过期或无效。请重新登录知乎，复制最新的 z_c0 cookie。\n${detail}`
          );
        }
        throw new Error(
          `知乎搜索请求失败 (${resp.status})：\n${detail}`
        );
      }

      const data = await resp.json();

      // 知乎网页搜索 API 返回格式：{ data: [{ type, object: {...} }], paging: { is_end } }
      const items = data.data || data.items || data.results || [];

      if (items.length === 0) break;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // 网页搜索 API 的每条结果包含 type 和 object 字段
        const obj = item.object || item;
        const author = obj.author?.name || obj.author || "匿名用户";
        const title = obj.title || obj.question?.title || "（无标题）";
        const content = obj.content || obj.excerpt || obj.summary || "";
        // 去除 HTML 标签
        const cleanContent = content.replace(/<[^>]+>/g, "").trim();

        allPosts.push({
          id: String(obj.id || `zhihu_p${pageNum}_${i}_${Date.now()}`),
          title,
          content: cleanContent,
          author: typeof author === "string" ? author : "匿名用户",
          url: obj.url || "",
          publishedAt: obj.created_time
            ? new Date(obj.created_time * 1000).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          voteupCount: obj.voteup_count || obj.vote_count || 0,
        });
      }

      // 检查是否还有更多结果
      if (items.length < pageSize || data.paging?.is_end === true) break;
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
 * 使用知乎网页搜索 API（通过 Worker 代理转发）
 * 需要用户提供 z_c0 cookie 用于鉴权，避免 403 人机验证
 */
export async function searchZhihu(
  keyword: string,
  config: ApiConfig,
  maxPages = 5
): Promise<ZhihuPost[]> {
  if (!config.zhihuApiKey?.trim()) {
    throw new Error(
      "未配置知乎 Key。请在配置区填写知乎 z_c0 cookie（登录知乎 → F12 → Application → Cookies → zhihu.com → z_c0）。"
    );
  }
  return searchWeb(keyword, config, maxPages);
}

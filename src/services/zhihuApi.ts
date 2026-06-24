import type { ApiConfig, ZhihuPost } from "@/types";
import { generateZhihuSign } from "@/lib/zhihuSign";

// 知乎 search_universal 响应结构
interface SearchUniversalItem {
  id?: string;
  type?: string;
  object?: {
    id?: string;
    title?: string;
    content?: string;
    excerpt?: string;
    author?: {
      name?: string;
    };
    voteup_count?: number;
    answer_count?: number;
    created_time?: number;
    updated_time?: number;
    url?: string;
  };
  highlight?: {
    title?: string;
    excerpt?: string;
  };
}

interface SearchUniversalResponse {
  data?: SearchUniversalItem[];
  paging?: {
    is_end?: boolean;
    next?: string;
  };
}

// 公共 CORS 代理列表（按优先级排序，自动回退）
const PUBLIC_PROXIES = [
  "https://corsproxy.io/?url=",
  "https://api.allorigins.win/raw?url=",
  "https://api.codetabs.com/v1/proxy/?quest=",
  "https://thingproxy.freeboard.io/fetch/",
];

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
 * 通过 CORS 代理发送请求，自动尝试多个代理直到成功
 */
async function fetchWithProxy(
  targetUrl: string,
  headers: Record<string, string>,
  customProxy?: string
): Promise<Response> {
  // 构建代理列表：用户自定义代理优先，公共代理回退
  const proxies: string[] = [];
  if (customProxy?.trim()) {
    proxies.push(customProxy.trim());
  }
  proxies.push(...PUBLIC_PROXIES);

  let lastError: Error | null = null;

  for (const rawProxy of proxies) {
    try {
      // 规范化代理地址（自动补全 ?url=）
      const proxy = normalizeProxyUrl(rawProxy);

      let finalUrl: string;
      if (!proxy) {
        // 不使用代理，直接请求
        finalUrl = targetUrl;
      } else if (proxy.includes("thingproxy")) {
        // thingproxy 格式：直接拼接 URL（不编码）
        finalUrl = `${proxy}${targetUrl}`;
      } else if (proxy.includes("codetabs")) {
        // codetabs 格式：直接拼接 URL（不编码）
        finalUrl = `${proxy}${targetUrl}`;
      } else {
        // ?url= 格式：只编码 & 和 =，避免对已编码的 % 再次编码
        // 这样 Worker 的 searchParams.get('url') 解码后能得到正确的 URL
        const encodedTargetUrl = targetUrl
          .replace(/&/g, "%26")
          .replace(/#/g, "%23");
        finalUrl = `${proxy}${encodedTargetUrl}`;
      }

      const resp = await fetch(finalUrl, {
        method: "GET",
        headers,
      });

      // 检查是否是代理本身的错误（404 + HTML = 代理不可用）
      if (resp.status === 404) {
        const text = await resp.text().catch(() => "");
        if (text.includes("<html") || text.includes("Not Found")) {
          lastError = new Error(`代理 ${proxy} 返回 404`);
          continue; // 尝试下一个代理
        }
      }

      if (!resp.ok && resp.status !== 422) {
        const text = await resp.text().catch(() => "");
        // 如果返回 HTML 而非 JSON，说明代理有问题
        if (text.includes("<html") || text.includes("<!DOCTYPE")) {
          lastError = new Error(`代理 ${proxy} 返回非 JSON 内容`);
          continue;
        }
      }

      return resp;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue; // 尝试下一个代理
    }
  }

  // 所有代理都失败
  throw new Error(
    `所有 CORS 代理均不可用。最后错误：${lastError?.message || "未知错误"}。\n` +
      `解决方案：部署自己的 Cloudflare Worker 代理（免费），在采集中心的 CORS 代理配置中填入 Worker 地址。`
  );
}

/**
 * 通过 Worker 的 /zhihu-search 端点调用知乎搜索
 *
 * 优势：前端只发简单 GET 请求（不带自定义头），完全不触发 CORS preflight
 * Worker 内部添加签名头（x-zse-93、x-zse-96、Cookie），避免浏览器忽略这些头
 *
 * 请求格式：GET https://xxx.workers.dev/zhihu-search?q=xxx&d_c0=xxx&x_zse_93=xxx&x_zse_96=xxx&offset=0&limit=10
 */
async function searchViaWorker(
  keyword: string,
  config: ApiConfig,
  maxPages = 5
): Promise<ZhihuPost[]> {
  const allPosts: ZhihuPost[] = [];
  const pageSize = 10;

  // 从 corsProxyUrl 提取 Worker 基础地址
  // 用户输入可能是 https://xxx.workers.dev/?url= 或 https://xxx.workers.dev/
  const workerBase = (config.corsProxyUrl || "")
    .trim()
    .replace(/\?url=.*$/, "")
    .replace(/\/$/, "");

  if (!workerBase) {
    throw new Error("Worker 地址未配置");
  }

  for (let pageNum = 0; pageNum < maxPages; pageNum++) {
    const offset = pageNum * pageSize;

    // 计算签名
    const sign = generateZhihuSign({
      query: keyword,
      d_c0: config.zhihuDc0,
      offset,
      limit: pageSize,
    });

    // 构造 Worker URL（简单 GET 请求，不带自定义头）
    const workerUrl = new URL(`${workerBase}/zhihu-search`);
    workerUrl.searchParams.set("q", keyword);
    workerUrl.searchParams.set("d_c0", config.zhihuDc0);
    workerUrl.searchParams.set("x_zse_93", sign.xZse93);
    workerUrl.searchParams.set("x_zse_96", sign.xZse96);
    workerUrl.searchParams.set("offset", String(offset));
    workerUrl.searchParams.set("limit", String(pageSize));

    try {
      // 简单 GET 请求，不触发 CORS preflight
      const resp = await fetch(workerUrl.toString(), {
        method: "GET",
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        if (resp.status === 422) {
          throw new Error(
            `知乎签名校验失败（422）：x-zse-96 签名不匹配或 d_c0 已过期。请前往签名工具重新获取 d_c0。`
          );
        }
        throw new Error(
          `知乎 search_universal 请求失败 (${resp.status})：${errText.slice(0, 200) || resp.statusText}`
        );
      }

      const data: SearchUniversalResponse = await resp.json();
      const items = data.data || [];

      if (items.length === 0) break;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const obj = item.object || {};
        allPosts.push({
          id: obj.id || item.id || `zhihu_p${pageNum}_${i}_${Date.now()}`,
          title: obj.title || item.highlight?.title || "（无标题）",
          content:
            obj.content || obj.excerpt || item.highlight?.excerpt || "",
          author: obj.author?.name || "匿名用户",
          url: obj.url || "",
          publishedAt: obj.created_time
            ? new Date(obj.created_time * 1000)
                .toISOString()
                .slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          voteupCount: obj.voteup_count || obj.answer_count || 0,
        });
      }

      if (items.length < pageSize || data.paging?.is_end) break;
    } catch (err) {
      if (pageNum === 0) throw err;
      break;
    }
  }

  return allPosts;
}

/**
 * 调用知乎 search_universal 全网搜索接口（带 x-zse-96 签名）
 *
 * 优先级：
 * 1. 若已配置 Worker 地址 → 使用 /zhihu-search 端点（简单 GET，不触发 preflight）
 * 2. 否则 → 使用 fetchWithProxy 多代理回退（带签名头，可能触发 preflight）
 */
async function searchUniversal(
  keyword: string,
  config: ApiConfig,
  maxPages = 5
): Promise<ZhihuPost[]> {
  // 优先使用 Worker 专用端点（避免 CORS preflight）
  if (config.corsProxyUrl?.trim()) {
    try {
      return await searchViaWorker(keyword, config, maxPages);
    } catch (err) {
      // 如果 Worker 专用端点失败，回退到多代理模式
      console.warn("Worker 专用端点失败，回退到多代理模式:", err);
    }
  }

  // 回退：多代理模式
  const allPosts: ZhihuPost[] = [];
  const pageSize = 10;

  for (let pageNum = 0; pageNum < maxPages; pageNum++) {
    const offset = pageNum * pageSize;

    const sign = generateZhihuSign({
      query: keyword,
      d_c0: config.zhihuDc0,
      offset,
      limit: pageSize,
    });

    try {
      const resp = await fetchWithProxy(
        sign.url,
        sign.headers,
        config.corsProxyUrl
      );

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        if (resp.status === 422) {
          throw new Error(
            `知乎签名校验失败（422）：x-zse-96 签名不匹配或 d_c0 已过期。请前往签名工具重新获取 d_c0。`
          );
        }
        throw new Error(
          `知乎 search_universal 请求失败 (${resp.status})：${errText.slice(0, 200) || resp.statusText}`
        );
      }

      const data: SearchUniversalResponse = await resp.json();
      const items = data.data || [];

      if (items.length === 0) break;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const obj = item.object || {};
        allPosts.push({
          id: obj.id || item.id || `zhihu_p${pageNum}_${i}_${Date.now()}`,
          title: obj.title || item.highlight?.title || "（无标题）",
          content:
            obj.content || obj.excerpt || item.highlight?.excerpt || "",
          author: obj.author?.name || "匿名用户",
          url: obj.url || "",
          publishedAt: obj.created_time
            ? new Date(obj.created_time * 1000)
                .toISOString()
                .slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          voteupCount: obj.voteup_count || obj.answer_count || 0,
        });
      }

      if (items.length < pageSize || data.paging?.is_end) break;
    } catch (err) {
      if (pageNum === 0) throw err;
      break;
    }
  }

  return allPosts;
}

/**
 * 调用知乎官方开放平台全网搜索 API
 *
 * 接口：POST https://open.zhihu.com/openapi/v1/search/global
 * 鉴权：Authorization: Bearer {AccessKey}
 */
async function searchOfficial(
  keyword: string,
  config: ApiConfig,
  maxPages = 5
): Promise<ZhihuPost[]> {
  const allPosts: ZhihuPost[] = [];
  const endpoint = "https://open.zhihu.com/openapi/v1/search/global";
  const pageSize = 20;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.zhihuApiKey}`,
        },
        body: JSON.stringify({
          query: keyword,
          page_num: pageNum,
          page_size: pageSize,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(
          `知乎官方 API 请求失败 (${resp.status})：${errText || resp.statusText}`
        );
      }

      const data = await resp.json();
      const items = data.data || data.items || data.results || [];

      if (items.length === 0) break;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        allPosts.push({
          id: `zhihu_p${pageNum}_${i}_${Date.now()}`,
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
      if (pageNum === 1) throw err;
      break;
    }
  }

  return allPosts;
}

/**
 * 知乎全网搜索主入口
 *
 * 优先级：
 * 1. 若已配置 d_c0 → 使用 search_universal 签名调用（多代理自动回退）
 * 2. 否则 → 使用官方开放平台 API（open.zhihu.com，Bearer 鉴权）
 */
export async function searchZhihu(
  keyword: string,
  config: ApiConfig,
  maxPages = 5
): Promise<ZhihuPost[]> {
  if (config.zhihuDc0?.trim()) {
    return searchUniversal(keyword, config, maxPages);
  }
  return searchOfficial(keyword, config, maxPages);
}

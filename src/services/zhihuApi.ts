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

  for (const proxy of proxies) {
    try {
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
        // 标准格式：编码 URL
        finalUrl = `${proxy}${encodeURIComponent(targetUrl)}`;
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
 * 调用知乎 search_universal 全网搜索接口（带 x-zse-96 签名）
 *
 * 接口：GET https://www.zhihu.com/api/v4/search_universal
 * 鉴权：x-zse-93 + x-zse-96 签名 + Cookie d_c0
 * CORS：通过多代理自动回退 + 用户自定义 Worker 代理
 */
async function searchUniversal(
  keyword: string,
  config: ApiConfig,
  maxPages = 5
): Promise<ZhihuPost[]> {
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

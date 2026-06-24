// Cloudflare Worker 代理 — 题库采集专用
// 部署步骤：
//   1. 打开 https://dash.cloudflare.com/?to=/:account/workers
//   2. 点「Create Worker」→ Start with Hello World! → Deploy（先拿到一个默认域名）
//   3. 点「Edit code」→ 全选删除默认代码 → 粘贴本文件全部内容 → Deploy
//   4. 复制 Worker 默认域名（形如 https://xxx.your-subdomain.workers.dev/）
//   5. 回到本前端「采集中心」→ CORS 代理地址输入框 → 填入该域名 → 测试 → 开始采集
//
// 端点说明：
//   GET /zhihu-official-search?q=keyword&access_key=xxx&offset=0&limit=10&scope=global|site
//   GET /?url=https://any-target.example.com/path    （通用代理，可选）

export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "*",
      "Access-Control-Max-Age": "86400",
    };

    // CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ====== 端点 1：知乎官方开放平台 API（推荐） ======
    // 前端只发简单 GET，Worker 内部 POST 到 open.zhihu.com
    if (url.pathname === "/zhihu-official-search") {
      try {
        const q = url.searchParams.get("q") || "";
        const accessKey = url.searchParams.get("access_key") || "";
        const offset = parseInt(url.searchParams.get("offset") || "0", 10);
        const limit = parseInt(url.searchParams.get("limit") || "10", 10);
        const scope = url.searchParams.get("scope") || "global";

        if (!q) {
          return jsonResponse({ error: "Missing q" }, 400, corsHeaders);
        }
        if (!accessKey) {
          return jsonResponse({ error: "Missing access_key" }, 400, corsHeaders);
        }

        const endpoint =
          scope === "site"
            ? "https://open.zhihu.com/v1/search"
            : "https://open.zhihu.com/v1/global_search";

        const upstream = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessKey}`,
          },
          body: JSON.stringify({ query: q, limit, offset }),
        });

        // 透传上游响应 + 强制 CORS 头
        const respHeaders = new Headers(upstream.headers);
        for (const [k, v] of Object.entries(corsHeaders)) {
          respHeaders.set(k, v);
        }
        return new Response(upstream.body, {
          status: upstream.status,
          headers: respHeaders,
        });
      } catch (e) {
        return new Response(`Official search error: ${e.message}`, {
          status: 500,
          headers: { "Content-Type": "text/plain", ...corsHeaders },
        });
      }
    }

    // ====== 端点 2：通用代理 ?url=xxx ======
    if (url.searchParams.has("url")) {
      try {
        const target = url.searchParams.get("url");
        const targetUrl = new URL(target);
        if (!["http:", "https:"].includes(targetUrl.protocol)) {
          return new Response("Only http/https URLs are supported", {
            status: 400,
            headers: corsHeaders,
          });
        }

        const headers = new Headers(request.headers);
        headers.delete("host");
        headers.delete("cf-connecting-ip");
        headers.delete("cf-ipcountry");
        headers.delete("cf-ray");
        headers.delete("cf-visitor");
        headers.delete("origin");
        headers.delete("referer");
        if (targetUrl.hostname.includes("zhihu.com")) {
          headers.set("Referer", "https://www.zhihu.com/search");
        }

        const upstream = await fetch(targetUrl, {
          method: request.method,
          headers,
          body:
            request.method !== "GET" && request.method !== "HEAD"
              ? request.body
              : undefined,
        });

        const respHeaders = new Headers(upstream.headers);
        for (const [k, v] of Object.entries(corsHeaders)) {
          respHeaders.set(k, v);
        }
        return new Response(upstream.body, {
          status: upstream.status,
          headers: respHeaders,
        });
      } catch (e) {
        return new Response(`Proxy error: ${e.message}`, {
          status: 500,
          headers: { "Content-Type": "text/plain", ...corsHeaders },
        });
      }
    }

    // ====== 根路径：健康检查 ======
    return jsonResponse(
      {
        ok: true,
        service: "zhihu-cors-proxy",
        endpoints: [
          "GET /zhihu-official-search?q=&access_key=&offset=&limit=&scope=global|site",
          "GET /?url=https://target.example.com/path",
        ],
      },
      200,
      corsHeaders
    );
  },
};

function jsonResponse(obj, status, corsHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

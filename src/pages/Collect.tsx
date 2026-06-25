import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Cloud,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Key,
  Loader2,
  Lock,
  Radar,
  Sparkles,
  X,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { testProxyAvailable } from "@/services/zhihuApi";
import { runCollectTask } from "@/services/collectTask";
import { QUESTION_TYPE_LABEL } from "@/types";
import { cn } from "@/lib/utils";

export default function Collect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const apiConfig = useStore((s) => s.apiConfig);
  const setApiConfig = useStore((s) => s.setApiConfig);
  const exams = useStore((s) => s.exams);
  const setCurrentExam = useStore((s) => s.setCurrentExam);
  const resetCollectTask = useStore((s) => s.resetCollectTask);

  // 后台采集任务状态（从 store 读取，导航离开再回来不会丢失）
  const task = useStore((s) => s.collectTask);
  const collecting = task.status === "running";
  const done = task.status === "done";
  const error = task.error;
  const stages = task.stages;
  const expansion = task.expansion;
  const subProgress = task.subProgress;
  const resultStats = task.resultStats;

  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [showZhihuKey, setShowZhihuKey] = useState(false);
  const [showAgnesKey, setShowAgnesKey] = useState(false);
  // 代理可用性检测状态
  const [proxyTesting, setProxyTesting] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // 检测代理可用性（手动触发）
  const handleTestProxy = async () => {
    const url = apiConfig.corsProxyUrl.trim();
    if (!url) {
      setProxyTestResult({ ok: false, message: "请先输入代理地址" });
      return;
    }
    setProxyTesting(true);
    setProxyTestResult(null);
    try {
      const result = await testProxyAvailable(url);
      setProxyTestResult({ ok: result.ok, message: result.message });
    } catch (err) {
      setProxyTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "检测失败",
      });
    } finally {
      setProxyTesting(false);
    }
  };

  // 代理地址变化时清除上次检测结果
  const handleProxyChange = (value: string) => {
    setApiConfig({ corsProxyUrl: value });
    setProxyTestResult(null);
  };

  useEffect(() => {
    const kw = searchParams.get("keyword");
    if (kw) setKeyword(kw);
  }, [searchParams]);

  // 验证 API 密钥是否已配置
  const isReady =
    keyword.trim() &&
    apiConfig.zhihuApiKey.trim() &&
    apiConfig.agnesApiKey.trim();

  const startCollect = () => {
    if (!isReady) return;
    const mainKeyword = keyword.trim();
    // 后台异步执行，不阻塞组件；导航离开不中断
    runCollectTask(mainKeyword);
  };

  // 手动停止采集（重置任务状态，runner 内部会检测 status 变化后退出）
  const handleStop = () => {
    resetCollectTask();
  };

  const matchedExam = exams.find(
    (e) => keyword.includes(e.name) || e.name.includes(keyword)
  );

  const handleViewBank = () => {
    if (task.examId) setCurrentExam(task.examId);
    else if (matchedExam) setCurrentExam(matchedExam.id);
    navigate("/bank");
  };

  return (
    <div className="min-h-screen pb-20">
      {/* 页头 */}
      <div className="border-b border-ink-200/40 bg-parchment-100/50 py-12">
        <div className="editorial-container">
          <p className="section-label mb-3">Collect Center · 采集中心</p>
          <h1 className="font-display text-display-md font-semibold text-ink-900">
            全网资料自动采集
          </h1>
          <p className="mt-3 max-w-2xl font-serif text-base text-ink-500">
            输入考试关键词后，Agnes 大模型会先在<strong>深度</strong>（细分章节、知识点、典型题型）与<strong>广度</strong>（相关学科、易混淆考点、跨学科应用）两个维度上扩展出更多专项关键词，再逐一调用知乎搜索 API 抓取真题回忆与经验帖，跨关键词去重后生成最全题库。
          </p>
        </div>
      </div>

      <div className="editorial-container mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[400px_1fr] lg:gap-8">
        {/* 左侧：配置面板 */}
        <div className="space-y-6">
          {/* 关键词输入 */}
          <div className="editorial-card p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
              <Radar className="h-5 w-5 text-amber-dark" strokeWidth={1.5} />
              采集目标
            </h3>
            <label className="mt-4 block font-mono text-xs uppercase tracking-wider text-ink-400">
              考试关键词
            </label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="如：科目一、摩托车D证、高考物理"
              className="input-editorial mt-2"
            />
            {matchedExam && (
              <p className="mt-2 font-serif text-xs text-moss">
                将向已有考试「{matchedExam.name}」补充采集题目
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={startCollect}
                disabled={!isReady || collecting}
                className={cn(
                  "flex-1",
                  !isReady ? "btn-secondary cursor-not-allowed opacity-60" : "",
                  collecting ? "btn-secondary cursor-not-allowed" : "btn-primary"
                )}
              >
                {collecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在搜尽全网…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    开始智能采集
                  </>
                )}
              </button>
              {collecting && (
                <button onClick={handleStop} className="btn-secondary shrink-0">
                  <X className="h-4 w-4" />
                  停止
                </button>
              )}
            </div>
            {collecting && (
              <p className="mt-2 font-serif text-[11px] text-ink-400">
                采集在后台进行，可切换其他页面查看实时生成的题目，不会中断
              </p>
            )}
            {!isReady && (
              <p className="mt-3 rounded-sm bg-wine/8 border border-wine/20 px-3 py-2 font-serif text-xs text-wine">
                请先配置下方两个 API 密钥后才能开始采集
              </p>
            )}
          </div>

          {/* API 配置（必填） */}
          <div className="editorial-card p-6 border-l-2 border-l-amber">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
              <Key className="h-5 w-5 text-amber-dark" strokeWidth={1.5} />
              API 配置
              <span className="ml-auto font-mono text-[10px] text-wine">* 必填</span>
            </h3>

            {/* 知乎搜索（无需凭证） */}
            <div className="mt-5 rounded-sm border border-ink-200/50 p-4">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs uppercase tracking-wider text-ink-700">
                  知乎 Access Secret
                </label>
                <a
                  href="https://developer.zhihu.com/profile"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-dark hover:underline"
                >
                  获取 Key
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="relative mt-2">
                <input
                  type={showZhihuKey ? "text" : "password"}
                  value={apiConfig.zhihuApiKey}
                  onChange={(e) => setApiConfig({ zhihuApiKey: e.target.value })}
                  placeholder="请输入知乎开放平台 Access Secret"
                  className={cn(
                    "input-editorial pr-10",
                    !apiConfig.zhihuApiKey.trim() && "border-wine/40 focus:border-wine focus:ring-wine/30"
                  )}
                />
                <button
                  onClick={() => setShowZhihuKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                >
                  {showZhihuKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!apiConfig.zhihuApiKey.trim() && (
                <p className="mt-1.5 font-mono text-[10px] text-wine">必填项 — 用于知乎开放平台 API 鉴权（Bearer Token）</p>
              )}
              <p className="mt-1.5 font-serif text-[10px] leading-relaxed text-ink-400">
                获取方式：登录知乎开放平台 → 个人中心 → 复制 Access Secret。Key 保存在本地浏览器，不会上传。
              </p>

              {/* 搜索范围选择 */}
              <div className="mt-3 flex items-center gap-2 border-t border-ink-200/40 pt-3">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  搜索范围
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setApiConfig({ zhihuSearchType: "全网" })}
                    className={cn(
                      "rounded-sm border px-2.5 py-1 font-serif text-[11px] transition-all",
                      apiConfig.zhihuSearchType === "全网"
                        ? "border-amber bg-amber/10 text-amber-dark"
                        : "border-ink-200 text-ink-500 hover:border-amber/40"
                    )}
                  >
                    全网搜索
                  </button>
                  <button
                    onClick={() => setApiConfig({ zhihuSearchType: "站内" })}
                    className={cn(
                      "rounded-sm border px-2.5 py-1 font-serif text-[11px] transition-all",
                      apiConfig.zhihuSearchType === "站内"
                        ? "border-amber bg-amber/10 text-amber-dark"
                        : "border-ink-200 text-ink-500 hover:border-amber/40"
                    )}
                  >
                    站内搜索
                  </button>
                </div>
                {apiConfig.zhihuSearchType === "全网" ? (
                  <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-moss">
                    <Check className="h-3 w-3" />
                    检索全网公开资料
                  </span>
                ) : (
                  <span className="ml-auto font-mono text-[10px] text-ink-400">
                    仅检索知乎站内
                  </span>
                )}
              </div>

              {/* CORS 代理配置 */}
              <div className="mt-3 border-t border-ink-200/40 pt-3">
                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  <Globe className="h-3 w-3" />
                  CORS 代理地址
                  <span className="ml-auto text-[10px] normal-case tracking-normal text-ink-400">
                    输入后请先测试
                  </span>
                </label>
                <div className="mt-1.5 flex gap-1.5">
                  <input
                      value={apiConfig.corsProxyUrl}
                      onChange={(e) => handleProxyChange(e.target.value)}
                      placeholder="必须带 ?url= 后缀，如 https://xxx.workers.dev/?url="
                        className="input-editorial flex-1 font-mono text-xs"
                      />
                    <button
                      onClick={handleTestProxy}
                      disabled={proxyTesting || !apiConfig.corsProxyUrl.trim()}
                      className={cn(
                        "shrink-0 rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all",
                        proxyTesting || !apiConfig.corsProxyUrl.trim()
                          ? "border-ink-200 text-ink-300 cursor-not-allowed"
                          : "border-amber/40 bg-amber/10 text-amber-dark hover:bg-amber/20"
                      )}
                    >
                      {proxyTesting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "测试"
                      )}
                    </button>
                  </div>

                  {/* 代理检测结果 */}
                  {proxyTestResult && (
                    <div
                      className={cn(
                        "mt-2 flex items-start gap-1.5 rounded-sm border px-2.5 py-1.5 font-serif text-xs",
                        proxyTestResult.ok
                          ? "border-moss/30 bg-moss/5 text-moss"
                          : "border-wine/30 bg-wine/5 text-wine"
                      )}
                    >
                      {proxyTestResult.ok ? (
                        <Check className="mt-0.5 h-3 w-3 shrink-0" />
                      ) : (
                        <X className="mt-0.5 h-3 w-3 shrink-0" />
                      )}
                      <span className="leading-relaxed">{proxyTestResult.message}</span>
                    </div>
                  )}

                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[
                      { label: "自动回退", url: "" },
                      { label: "corsproxy.io", url: "https://corsproxy.io/?url=" },
                      { label: "allorigins", url: "https://api.allorigins.win/raw?url=" },
                      { label: "codetabs", url: "https://api.codetabs.com/v1/proxy/?quest=" },
                    ].map((proxy) => (
                      <button
                        key={proxy.label}
                        onClick={() => handleProxyChange(proxy.url)}
                        className={cn(
                          "rounded-sm border px-2 py-0.5 font-mono text-[10px] transition-all",
                          apiConfig.corsProxyUrl === proxy.url
                            ? "border-amber bg-amber/10 text-amber-dark"
                            : "border-ink-200 text-ink-500 hover:border-amber/40"
                        )}
                      >
                        {proxy.label}
                      </button>
                    ))}
                  </div>

                  {/* Cloudflare Worker 部署指引 */}
                  <details className="mt-3 rounded-sm border border-moss/20 bg-moss/5 p-3">
                    <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-moss">
                      <Cloud className="mr-1 inline h-3 w-3" />
                      部署自己的 Cloudflare Worker 代理（免费，推荐）
                    </summary>
                    <div className="mt-3 space-y-2">
                      <p className="font-serif text-xs leading-relaxed text-ink-600">
                        部署自己的 Worker 代理（完全免费），用于转发知乎开放平台搜索 API 请求。
                      </p>
                      <ol className="space-y-1 font-serif text-xs leading-relaxed text-ink-500">
                        <li>1. 打开 <a href="https://dash.cloudflare.com/?to=/:account/workers" target="_blank" rel="noreferrer" className="text-amber-dark hover:underline">Cloudflare Workers</a>，注册/登录</li>
                        <li>2. 点击「Create Worker」→ Start with Hello World! → 点击 Deploy</li>
                        <li>3. 点击「Edit code」，粘贴下方代码 → 点击 Deploy</li>
                        <li>4. 复制 Worker 地址，在上方输入框填入 <code className="font-mono text-[10px]">https://xxx.workers.dev/?url=</code>（必须带 <code className="font-mono text-[10px]">?url=</code> 后缀）</li>
                      </ol>
      <pre className="overflow-x-auto rounded-sm bg-ink-900 p-3 font-mono text-[10px] leading-relaxed text-parchment-300">
{`export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 知乎开放平台搜索 API（Bearer Token 鉴权）
    if (url.pathname === '/zhihu-search') {
      try {
        const q = url.searchParams.get('q') || '';
        const accessSecret = url.searchParams.get('access_secret') || '';
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);

        if (!q || !accessSecret) {
          return new Response(JSON.stringify({ error: 'Missing q or access_secret' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // 调用知乎开放平台搜索 API
        const searchUrl = new URL('https://developer.zhihu.com/api/v1/content/zhihu_search');
        searchUrl.searchParams.set('Query', q);
        searchUrl.searchParams.set('Count', String(Math.min(limit, 10)));

        const timestamp = Math.floor(Date.now() / 1000);

        const resp = await fetch(searchUrl.toString(), {
          method: 'GET',
          headers: {
            'Authorization': \`Bearer \${accessSecret}\`,
            'X-Request-Timestamp': String(timestamp),
            'Content-Type': 'application/json',
          },
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          return new Response(JSON.stringify({
            error: \`知乎搜索 API 返回 \${resp.status}\`,
            status: resp.status,
            responseBody: errText.slice(0, 1000),
          }), {
            status: resp.status,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        const newHeaders = new Headers(resp.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));

        return new Response(resp.body, {
          status: resp.status,
          headers: newHeaders,
        });
      } catch (error) {
        return new Response(\`Search error: \${error.message}\`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain', ...corsHeaders },
        });
      }
    }

    // 通用代理端点：?url=xxx
    try {
      const target = url.searchParams.get('url');
      if (!target) {
        return new Response('Missing url parameter', { status: 400, headers: corsHeaders });
      }

      let targetUrl;
      try {
        targetUrl = new URL(target);
      } catch (e) {
        return new Response('Invalid target URL', { status: 400, headers: corsHeaders });
      }
      if (!['http:', 'https:'].includes(targetUrl.protocol)) {
        return new Response('Only http/https URLs are supported', { status: 400, headers: corsHeaders });
      }

      const headers = new Headers(request.headers);
      headers.delete('host');
      headers.delete('cf-connecting-ip');
      headers.delete('cf-ipcountry');
      headers.delete('cf-ray');
      headers.delete('cf-visitor');
      headers.delete('origin');
      headers.delete('referer');
      if (targetUrl.hostname.includes('zhihu.com')) {
        headers.set('Referer', 'https://www.zhihu.com/search');
      }

      const resp = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });

      const newHeaders = new Headers(resp.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));

      return new Response(resp.body, {
        status: resp.status,
        headers: newHeaders,
      });
    } catch (error) {
      return new Response(\`Proxy error: \${error.message}\`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders },
      });
    }
  }
};`}
                      </pre>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 知乎开放平台搜索 API（Bearer Token 鉴权）
    if (url.pathname === '/zhihu-search') {
      try {
        const q = url.searchParams.get('q') || '';
        const accessSecret = url.searchParams.get('access_secret') || '';
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);

        if (!q || !accessSecret) {
          return new Response(JSON.stringify({ error: 'Missing q or access_secret' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // 调用知乎开放平台搜索 API
        const searchUrl = new URL('https://developer.zhihu.com/api/v1/content/zhihu_search');
        searchUrl.searchParams.set('Query', q);
        searchUrl.searchParams.set('Count', String(Math.min(limit, 10)));

        const timestamp = Math.floor(Date.now() / 1000);

        const resp = await fetch(searchUrl.toString(), {
          method: 'GET',
          headers: {
            'Authorization': \`Bearer \${accessSecret}\`,
            'X-Request-Timestamp': String(timestamp),
            'Content-Type': 'application/json',
          },
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          return new Response(JSON.stringify({
            error: \`知乎搜索 API 返回 \${resp.status}\`,
            status: resp.status,
            responseBody: errText.slice(0, 1000),
          }), { status: resp.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        const newHeaders = new Headers(resp.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));

        return new Response(resp.body, { status: resp.status, headers: newHeaders });
      } catch (error) {
        return new Response(\`Search error: \${error.message}\`, {
          status: 500, headers: { 'Content-Type': 'text/plain', ...corsHeaders },
        });
      }
    }

    try {
      const target = url.searchParams.get('url');
      if (!target) {
        return new Response('Missing url parameter', { status: 400, headers: corsHeaders });
      }

      let targetUrl;
      try {
        targetUrl = new URL(target);
      } catch (e) {
        return new Response('Invalid target URL', { status: 400, headers: corsHeaders });
      }
      if (!['http:', 'https:'].includes(targetUrl.protocol)) {
        return new Response('Only http/https URLs are supported', { status: 400, headers: corsHeaders });
      }

      const headers = new Headers(request.headers);
      headers.delete('host');
      headers.delete('cf-connecting-ip');
      headers.delete('cf-ipcountry');
      headers.delete('cf-ray');
      headers.delete('cf-visitor');
      headers.delete('origin');
      headers.delete('referer');
      if (targetUrl.hostname.includes('zhihu.com')) {
        headers.set('Referer', 'https://www.zhihu.com/search');
      }

      const resp = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });

      const newHeaders = new Headers(resp.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));

      return new Response(resp.body, {
        status: resp.status,
        headers: newHeaders,
      });
    } catch (error) {
      return new Response(\`Proxy error: \${error.message}\`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders },
      });
    }
  }
};`);
                        }}
                        className="inline-flex items-center gap-1 rounded-sm border border-moss/30 bg-moss/10 px-2 py-1 font-mono text-[10px] text-moss transition-all hover:bg-moss/20"
                      >
                        <Copy className="h-3 w-3" />
                        复制 Worker 代码
                      </button>
                    </div>
                  </details>
                </div>
            </div>

            {/* Agnes API Key */}
            <div className="mt-4 rounded-sm border border-ink-200/50 p-4">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs uppercase tracking-wider text-ink-700">
                  Agnes 大模型 API Key
                </label>
                <a
                  href="https://platform.agnes-ai.com/settings/apiKeys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-dark hover:underline"
                >
                  获取 Key
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="relative mt-2">
                <input
                  type={showAgnesKey ? "text" : "password"}
                  value={apiConfig.agnesApiKey}
                  onChange={(e) => setApiConfig({ agnesApiKey: e.target.value })}
                  placeholder="请输入 Agnes API Key"
                  className={cn(
                    "input-editorial pr-10",
                    !apiConfig.agnesApiKey.trim() && "border-wine/40 focus:border-wine focus:ring-wine/30"
                  )}
                />
                <button
                  onClick={() => setShowAgnesKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                >
                  {showAgnesKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!apiConfig.agnesApiKey.trim() && (
                <p className="mt-1.5 font-mono text-[10px] text-wine">必填项 — 用于 AI 去重整理与技巧生成</p>
              )}
            </div>

            {/* Agnes Endpoint（只读） */}
            <div className="mt-4">
              <label className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink-500">
                <Lock className="h-3 w-3" />
                Agnes Endpoint
                <span className="ml-auto text-[10px] normal-case tracking-normal text-ink-400">固定地址</span>
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-sm border border-ink-200 bg-ink-100/40 px-4 py-3">
                <Lock className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                <span className="flex-1 font-mono text-xs text-ink-500">
                  https://apihub.agnes-ai.com/v1
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* 右侧：采集进度 */}
        <div className="space-y-6">
          <div className="editorial-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink-900">
                采集进度
              </h3>
              {done && (
                <span className="tag-moss">
                  <Check className="mr-1 h-3 w-3" /> 采集完成
                </span>
              )}
            </div>

            <div className="mt-6 space-y-1">
              {stages.map((stage, idx) => (
                <div key={stage.key} className="flex gap-4">
                  {/* 时间线节点 */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                        stage.status === "done" &&
                          "border-moss bg-moss/10 text-moss",
                        stage.status === "active" &&
                          "border-amber bg-amber/10 text-amber animate-pulse-glow",
                        stage.status === "pending" &&
                          "border-ink-200 bg-parchment-50 text-ink-300"
                      )}
                    >
                      {stage.status === "done" ? (
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      ) : stage.status === "active" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="font-mono text-xs">{idx + 1}</span>
                      )}
                    </div>
                    {idx < stages.length - 1 && (
                      <span
                        className={cn(
                          "my-1 h-8 w-0.5",
                          stage.status === "done" ? "bg-moss/40" : "bg-ink-200"
                        )}
                      />
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 pb-2">
                    <p
                      className={cn(
                        "font-serif text-sm font-medium",
                        stage.status === "pending"
                          ? "text-ink-400"
                          : "text-ink-800"
                      )}
                    >
                      {stage.label}
                    </p>
                    <p className="font-serif text-xs text-ink-400">
                      {stage.detail}
                    </p>
                    {stage.status === "active" && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-1 font-mono text-[10px] text-amber-dark"
                      >
                        ● 处理中…
                      </motion.p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 扩展出的专项关键词 */}
            {expansion && (expansion.depth.length > 0 || expansion.breadth.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-sm border border-amber/30 bg-amber/5 p-4"
              >
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-amber-dark">
                  扩展出的专项关键词（{expansion.all.length}）
                </p>

                {expansion.depth.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 font-serif text-[11px] text-ink-500">
                      <span className="font-mono text-amber-dark">深度 ·</span> 细分章节 / 知识点 / 题型
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {expansion.depth.map((kw) => {
                        const isCurrent =
                          subProgress?.keyword === kw && collecting;
                        const isDone = task.doneKeywords.includes(kw);
                        return (
                          <span
                            key={`d-${kw}`}
                            className={cn(
                              "rounded-sm border px-2 py-0.5 font-serif text-[11px] transition-all",
                              isCurrent
                                ? "border-amber bg-amber text-ink-900 shadow-sm"
                                : isDone
                                ? "border-moss/40 bg-moss/10 text-moss-dark line-through opacity-60"
                                : "border-amber/30 bg-amber/5 text-amber-dark"
                            )}
                          >
                            {isCurrent && "▸ "}
                            {isDone && "✓ "}
                            {kw}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {expansion.breadth.length > 0 && (
                  <div>
                    <p className="mb-1 font-serif text-[11px] text-ink-500">
                      <span className="font-mono text-moss">广度 ·</span> 相关学科 / 易混淆 / 跨学科
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {expansion.breadth.map((kw) => {
                        const isCurrent =
                          subProgress?.keyword === kw && collecting;
                        const isDone = task.doneKeywords.includes(kw);
                        return (
                          <span
                            key={`b-${kw}`}
                            className={cn(
                              "rounded-sm border px-2 py-0.5 font-serif text-[11px] transition-all",
                              isCurrent
                                ? "border-moss bg-moss text-ink-900 shadow-sm"
                                : isDone
                                ? "border-moss/40 bg-moss/10 text-moss-dark line-through opacity-60"
                                : "border-moss/30 bg-moss/5 text-moss-dark"
                            )}
                          >
                            {isCurrent && "▸ "}
                            {isDone && "✓ "}
                            {kw}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 逐项采集进度条 */}
            {collecting && subProgress && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 rounded-sm border border-amber/20 bg-parchment-50 p-3"
              >
                <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  <span>逐项采集进度</span>
                  <span className="text-amber-dark">
                    {subProgress.current} / {subProgress.total}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200/50">
                  <motion.div
                    className="h-full bg-amber"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(subProgress.current / subProgress.total) * 100}%`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="mt-1.5 font-serif text-[11px] text-ink-600">
                  正在采集：<span className="text-amber-dark">{subProgress.keyword}</span>
                </p>
              </motion.div>
            )}

            {/* 实时计数器 + 题目预览（采集中显示） */}
            {collecting && task.liveQuestions > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-sm border border-amber/30 bg-amber/5 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-amber-dark">
                    实时生成
                  </p>
                  <button
                    onClick={handleViewBank}
                    className="font-mono text-[10px] text-amber-dark hover:underline"
                  >
                    查看题库 →
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="font-display text-xl font-semibold text-ink-900">
                      {task.livePosts}
                    </p>
                    <p className="font-mono text-[10px] text-ink-400">已抓素材</p>
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold text-amber-dark">
                      {task.liveQuestions}
                    </p>
                    <p className="font-mono text-[10px] text-ink-400">已生成题目</p>
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold text-wine">
                      {task.liveTechniques}
                    </p>
                    <p className="font-mono text-[10px] text-ink-400">已生成技巧</p>
                  </div>
                </div>

                {/* 最近生成的题目预览 */}
                {task.recentQuestions.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-amber/20 pt-3">
                    <p className="font-mono text-[10px] text-ink-400">
                      最近生成（{task.recentQuestions.length} 条预览）
                    </p>
                    {task.recentQuestions.slice(0, 5).map((q, idx) => (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-sm border border-ink-200/40 bg-parchment-50/50 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded-sm bg-amber/15 px-1.5 py-0.5 font-mono text-[9px] text-amber-dark">
                            {QUESTION_TYPE_LABEL[q.type]}
                          </span>
                          <span className="font-mono text-[9px] text-ink-400">
                            {q.knowledgePoint}
                          </span>
                        </div>
                        <p className="mt-1 font-serif text-[11px] leading-relaxed text-ink-700 line-clamp-2">
                          {q.stem}
                        </p>
                      </motion.div>
                    ))}
                    {task.recentQuestions.length > 5 && (
                      <p className="text-center font-mono text-[10px] text-ink-400">
                        还有 {task.recentQuestions.length - 5} 条，点击「查看题库」浏览全部
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* 采集结果统计 */}
            {done && resultStats && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-sm border border-moss/30 bg-moss/5 p-4"
              >
                <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-moss-dark">
                  采集结果
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="font-display text-2xl font-semibold text-ink-900">
                      {resultStats.posts}
                    </p>
                    <p className="font-mono text-[10px] text-ink-400">原始素材</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-semibold text-amber-dark">
                      {resultStats.questions}
                    </p>
                    <p className="font-mono text-[10px] text-ink-400">结构化题目</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-semibold text-wine">
                      {resultStats.techniques}
                    </p>
                    <p className="font-mono text-[10px] text-ink-400">应试技巧</p>
                  </div>
                </div>
              </motion.div>
            )}

            {done && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex flex-wrap gap-3 border-t border-ink-200/50 pt-5"
              >
                <button onClick={handleViewBank} className="btn-primary">
                  查看生成题库
                </button>
                <button
                  onClick={() => navigate("/techniques")}
                  className="btn-secondary"
                >
                  浏览应试技巧
                </button>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 rounded-sm border border-wine/30 bg-wine/5 p-4"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-wine" />
                  <p className="font-serif text-xs leading-relaxed text-wine">
                    {error}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

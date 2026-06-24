import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  Check,
  Clipboard,
  Copy,
  Key,
  Search,
  Terminal,
  Zap,
} from "lucide-react";
import { generateZhihuSign, type SignResult } from "@/lib/zhihuSign";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

// 一键提取 d_c0 的控制台脚本
const DC0_SCRIPT = `document.cookie.split(';').find(c=>c.trim().startsWith('d_c0='))?.split('=').pop()?.trim()`;

export default function SignTool() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const apiConfig = useStore((s) => s.apiConfig);
  const setApiConfig = useStore((s) => s.setApiConfig);

  const [query, setQuery] = useState(searchParams.get("keyword") || "");
  const [dC0, setDC0] = useState(apiConfig.zhihuDc0 || "");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDc0Helper, setShowDc0Helper] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const kw = searchParams.get("keyword");
    if (kw) setQuery(kw);
  }, [searchParams]);

  const result: SignResult | null = useMemo(() => {
    if (!query.trim() || !dC0.trim()) return null;
    return generateZhihuSign({
      query: query.trim(),
      d_c0: dC0.trim(),
      offset,
      limit,
    });
  }, [query, dC0, offset, limit]);

  // 签名生成成功后自动保存 d_c0
  useEffect(() => {
    if (result && dC0.trim()) {
      setApiConfig({ zhihuDc0: dC0.trim() });
      setSaved(true);
    }
  }, [result, dC0, setApiConfig]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // 一键获取 d_c0：打开知乎 + 复制提取脚本
  const handleGetDC0 = () => {
    navigator.clipboard.writeText(DC0_SCRIPT).then(() => {
      setCopiedField("dc0_script");
      setTimeout(() => setCopiedField(null), 3000);
    });
    window.open("https://www.zhihu.com/search", "_blank");
    setShowDc0Helper(true);
  };

  // 保存并前往采集
  const handleSaveAndCollect = () => {
    setApiConfig({ zhihuDc0: dC0.trim() });
    navigate(`/collect?keyword=${encodeURIComponent(query.trim())}`);
  };

  const copyableFields: { label: string; value: string; field: string }[] = result
    ? [
        { label: "完整请求 URL", value: result.url, field: "url" },
        { label: "x-zse-93", value: result.xZse93, field: "x93" },
        { label: "x-zse-96（签名）", value: result.xZse96, field: "x96" },
        { label: "Cookie", value: result.headers.Cookie, field: "cookie" },
      ]
    : [];

  return (
    <div className="min-h-screen pb-20">
      {/* 页头 */}
      <div className="border-b border-ink-200/40 bg-parchment-100/50 py-12">
        <div className="editorial-container">
          <p className="section-label mb-3">Sign Tool · 离线签名工具</p>
          <h1 className="font-display text-display-md font-semibold text-ink-900">
            知乎签名计算器
          </h1>
          <p className="mt-3 max-w-2xl font-serif text-base text-ink-500">
            纯静态离线计算 <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs text-amber-dark">x-zse-96</code> 签名，不直接请求知乎 API，无跨域问题。生成完整 URL + 请求头后，复制到 Postman 或浏览器手动调用。
          </p>
        </div>
      </div>

      <div className="editorial-container mt-8 grid gap-6 lg:grid-cols-[420px_1fr] lg:gap-8">
        {/* 左侧：输入面板 */}
        <div className="space-y-6">
          {/* 输入区 */}
          <div className="editorial-card p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
              <Calculator className="h-5 w-5 text-amber-dark" strokeWidth={1.5} />
              签名输入
            </h3>

            {/* 搜索关键词 */}
            <div className="mt-5">
              <label className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink-700">
                <Search className="h-3 w-3" />
                搜索关键词
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="如：科目一、高考物理、摩托车D证"
                className="input-editorial mt-2"
              />
            </div>

            {/* d_c0 + 一键获取 */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink-700">
                  <Key className="h-3 w-3" />
                  d_c0 Cookie 值
                </label>
                <button
                  onClick={handleGetDC0}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 font-mono text-[10px] transition-all",
                    copiedField === "dc0_script"
                      ? "border-moss bg-moss/10 text-moss"
                      : "border-amber bg-amber/10 text-amber-dark hover:bg-amber/20"
                  )}
                >
                  {copiedField === "dc0_script" ? (
                    <><Check className="h-3 w-3" /> 脚本已复制</>
                  ) : (
                    <><Zap className="h-3 w-3" /> 一键获取</>
                  )}
                </button>
              </div>
              <textarea
                value={dC0}
                onChange={(e) => setDC0(e.target.value)}
                placeholder="点击「一键获取」自动打开知乎并复制提取脚本，或手动粘贴 d_c0 值"
                rows={2}
                className="input-editorial mt-2 resize-none font-mono text-xs"
              />

              {/* 一键获取引导 */}
              {showDc0Helper && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 overflow-hidden rounded-sm border border-amber/30 bg-amber/5 p-4"
                >
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-dark">
                    <Terminal className="h-3 w-3" />
                    三步获取 d_c0
                  </p>
                  <ol className="mt-2 space-y-2 font-serif text-xs leading-relaxed text-ink-600">
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber/20 font-mono text-[10px] text-amber-dark">1</span>
                      <span>知乎已在新标签页打开，确认已登录（如未登录请先登录）</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber/20 font-mono text-[10px] text-amber-dark">2</span>
                      <span>
                        在知乎页面按 <kbd className="rounded border border-ink-300 bg-parchment-50 px-1.5 font-mono text-[10px]">F12</kbd> 打开控制台，
                        粘贴已复制的脚本并回车：
                      </span>
                    </li>
                    <li className="ml-7">
                      <code className="block break-all rounded bg-ink-900 px-3 py-2 font-mono text-[10px] text-amber-glow">
                        {DC0_SCRIPT}
                      </code>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber/20 font-mono text-[10px] text-amber-dark">3</span>
                      <span>复制输出的字符串，粘贴到上方输入框，签名自动生成</span>
                    </li>
                  </ol>
                </motion.div>
              )}
            </div>

            {/* 分页参数 */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-ink-500">
                  offset
                </label>
                <input
                  type="number"
                  min={0}
                  value={offset}
                  onChange={(e) => setOffset(Math.max(0, Number(e.target.value)))}
                  className="input-editorial mt-1.5 font-mono text-sm"
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-ink-500">
                  limit（最大10）
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={limit}
                  onChange={(e) => setLimit(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="input-editorial mt-1.5 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* 三步签名 */}
          <div className="editorial-card p-6 border-l-2 border-l-amber">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
              <Zap className="h-4 w-4 text-amber-dark" strokeWidth={1.5} />
              三步签名
            </h3>
            <div className="mt-4 space-y-3">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber/20 font-mono text-xs text-amber-dark">1</span>
                <div>
                  <p className="font-serif text-sm font-medium text-ink-800">输入关键词 + 获取 d_c0（点击后自动复制脚本）</p>
                  <p className="font-serif text-xs text-ink-500">输入搜索关键词，点击「一键获取」打开知乎并复制提取脚本</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber/20 font-mono text-xs text-amber-dark">2</span>
                <div>
                  <p className="font-serif text-sm font-medium text-ink-800">粘贴 d_c0，签名自动生成</p>
                  <p className="font-serif text-xs text-ink-500">将控制台输出的 d_c0 粘贴到输入框，右侧自动显示完整签名结果</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber/20 font-mono text-xs text-amber-dark">3</span>
                <div>
                  <p className="font-serif text-sm font-medium text-ink-800">保存并前往采集</p>
                  <p className="font-serif text-xs text-ink-500">点击「保存并前往采集」，d_c0 自动保存，采集时自动使用签名模式</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：结果输出 */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* 可复制字段 */}
              <div className="editorial-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink-900">
                    签名结果
                  </h3>
                  <div className="flex items-center gap-2">
                    {saved && (
                      <span className="tag-moss">
                        <Check className="mr-1 h-3 w-3" /> d_c0 已保存
                      </span>
                    )}
                    <button
                      onClick={handleSaveAndCollect}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-amber bg-amber/15 px-3 py-1.5 font-serif text-xs text-amber-dark transition-all hover:bg-amber/25"
                    >
                      保存并前往采集
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {copyableFields.map((field) => (
                    <div key={field.field}>
                      <div className="flex items-center justify-between">
                        <label className="font-mono text-xs uppercase tracking-wider text-ink-500">
                          {field.label}
                        </label>
                        <button
                          onClick={() => handleCopy(field.value, field.field)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[10px] transition-all",
                            copiedField === field.field
                              ? "border-moss bg-moss/10 text-moss"
                              : "border-ink-200 text-ink-500 hover:border-amber hover:text-amber-dark"
                          )}
                        >
                          {copiedField === field.field ? (
                            <>
                              <Check className="h-3 w-3" /> 已复制
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> 复制
                            </>
                          )}
                        </button>
                      </div>
                      <div className="mt-1.5 break-all rounded-sm border border-ink-200/50 bg-ink-900/95 px-4 py-3 font-mono text-xs leading-relaxed text-amber-glow">
                        {field.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 完整请求头 */}
              <div className="editorial-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink-900">
                    完整请求头
                  </h3>
                  <button
                    onClick={() =>
                      handleCopy(
                        Object.entries(result.headers)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join("\n"),
                        "allHeaders"
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[10px] transition-all",
                      copiedField === "allHeaders"
                        ? "border-moss bg-moss/10 text-moss"
                        : "border-ink-200 text-ink-500 hover:border-amber hover:text-amber-dark"
                    )}
                  >
                    {copiedField === "allHeaders" ? (
                      <><Check className="h-3 w-3" /> 已复制</>
                    ) : (
                      <><Copy className="h-3 w-3" /> 复制全部</>
                    )}
                  </button>
                </div>
                <div className="mt-4 overflow-x-auto rounded-sm border border-ink-200/50 bg-ink-900/95 p-4">
                  <pre className="font-mono text-xs leading-relaxed text-parchment-300">
                    {Object.entries(result.headers).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-amber">{k}</span>
                        <span className="text-parchment-500">: </span>
                        <span className="text-parchment-200">{v}</span>
                      </div>
                    ))}
                  </pre>
                </div>
              </div>

              {/* cURL 命令 */}
              <div className="editorial-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink-900">
                    cURL 命令
                  </h3>
                  <button
                    onClick={() => handleCopy(result.curlCommand, "curl")}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[10px] transition-all",
                      copiedField === "curl"
                        ? "border-moss bg-moss/10 text-moss"
                        : "border-ink-200 text-ink-500 hover:border-amber hover:text-amber-dark"
                    )}
                  >
                    {copiedField === "curl" ? (
                      <><Check className="h-3 w-3" /> 已复制</>
                    ) : (
                      <><Clipboard className="h-3 w-3" /> 复制 cURL</>
                    )}
                  </button>
                </div>
                <div className="mt-4 overflow-x-auto rounded-sm border border-ink-200/50 bg-ink-900/95 p-4">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-parchment-200">
                    {result.curlCommand}
                  </pre>
                </div>
              </div>

              {/* 调试信息 */}
              <details className="editorial-card p-6">
                <summary className="cursor-pointer font-display text-base font-semibold text-ink-900">
                  调试信息（签名原文 + MD5）
                </summary>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-ink-500">
                      签名原文
                    </label>
                    <div className="mt-1.5 break-all rounded-sm border border-ink-200/50 bg-parchment-50 px-4 py-3 font-mono text-xs text-ink-700">
                      {result.signString}
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-ink-500">
                      MD5（32位 hex）
                    </label>
                    <div className="mt-1.5 break-all rounded-sm border border-ink-200/50 bg-parchment-50 px-4 py-3 font-mono text-xs text-ink-700">
                      {result.md5Hex}
                    </div>
                  </div>
                </div>
              </details>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="editorial-card flex flex-col items-center justify-center p-16 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink-200 bg-parchment-50">
                <Calculator className="h-7 w-7 text-ink-300" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-ink-700">
                等待输入
              </h3>
              <p className="mt-2 max-w-sm font-serif text-sm text-ink-400">
                请在左侧输入搜索关键词和 d_c0 Cookie 值，签名结果将自动生成
              </p>
              <p className="mt-1 max-w-sm font-serif text-xs text-amber-dark">
                点击 d_c0 旁的「一键获取」可自动打开知乎并复制提取脚本
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

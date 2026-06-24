import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Download,
  FileJson,
  FileText,
  Settings2,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import {
  buildExportData,
  exportJSON,
  exportPDF,
} from "@/utils/export";
import { cn } from "@/lib/utils";

type Format = "json" | "pdf";

export default function Export() {
  const exams = useStore((s) => s.exams);
  const questions = useStore((s) => s.questions);
  const techniques = useStore((s) => s.techniques);

  const [format, setFormat] = useState<Format>("json");
  const [scope, setScope] = useState<string>("all");
  const [includeAnswer, setIncludeAnswer] = useState(true);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [includeTechnique, setIncludeTechnique] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const options = {
    scope,
    includeAnswer,
    includeAnalysis,
    includeTechnique,
  };

  const previewData = useMemo(
    () => buildExportData(exams, questions, techniques, options),
    [exams, questions, techniques, scope]
  );

  const handleExport = async () => {
    setExporting(true);
    setDone(false);
    await new Promise((r) => setTimeout(r, 600));
    const data = buildExportData(exams, questions, techniques, options);
    if (format === "json") {
      exportJSON(data, options);
    } else {
      exportPDF(data, options);
    }
    setExporting(false);
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* 页头 */}
      <div className="border-b border-ink-200/40 bg-parchment-100/50 py-12">
        <div className="editorial-container">
          <p className="section-label mb-3">Export Center · 导出中心</p>
          <h1 className="font-display text-display-md font-semibold text-ink-900">
            题库文件导出
          </h1>
          <p className="mt-3 max-w-2xl font-serif text-base text-ink-500">
            导出完整 JSON 结构化题库或可打印 PDF 资料，自定义导出范围与内容，用于本地复习。
          </p>
        </div>
      </div>

      <div className="editorial-container mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* 左侧配置 */}
        <div className="space-y-6">
          {/* 格式选择 */}
          <div className="editorial-card p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
              <Settings2 className="h-5 w-5 text-amber-dark" strokeWidth={1.5} />
              导出格式
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <FormatCard
                active={format === "json"}
                onClick={() => setFormat("json")}
                icon={FileJson}
                title="JSON"
                desc="结构化数据"
              />
              <FormatCard
                active={format === "pdf"}
                onClick={() => setFormat("pdf")}
                icon={FileText}
                title="PDF"
                desc="可打印资料"
              />
            </div>
          </div>

          {/* 范围选择 */}
          <div className="editorial-card p-6">
            <h3 className="font-display text-lg font-semibold text-ink-900">
              导出范围
            </h3>
            <div className="mt-4 space-y-2">
              <ScopeRadio
                label="全部考试"
                sub={`${exams.length} 个考试 · ${questions.length} 道题`}
                checked={scope === "all"}
                onChange={() => setScope("all")}
              />
              {exams.map((exam) => {
                const count = questions.filter((q) => q.examId === exam.id).length;
                return (
                  <ScopeRadio
                    key={exam.id}
                    label={exam.name}
                    sub={`${count} 道题`}
                    checked={scope === exam.id}
                    onChange={() => setScope(exam.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* 内容选项 */}
          <div className="editorial-card p-6">
            <h3 className="font-display text-lg font-semibold text-ink-900">
              导出内容
            </h3>
            <div className="mt-4 space-y-3">
              <CheckOption
                label="正确答案"
                checked={includeAnswer}
                onChange={setIncludeAnswer}
              />
              <CheckOption
                label="题目解析"
                checked={includeAnalysis}
                onChange={setIncludeAnalysis}
              />
              <CheckOption
                label="应试技巧"
                checked={includeTechnique}
                onChange={setIncludeTechnique}
              />
            </div>
          </div>

          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className={cn(
              "btn-primary w-full",
              exporting && "cursor-not-allowed opacity-60"
            )}
          >
            {exporting ? (
              <>导出中…</>
            ) : done ? (
              <>
                <Check className="h-4 w-4" />
                导出成功
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                导出 {format.toUpperCase()} 文件
              </>
            )}
          </button>
        </div>

        {/* 右侧预览 */}
        <div className="editorial-card overflow-hidden">
          <div className="border-b border-ink-200/40 bg-parchment-100/40 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink-900">
                导出预览
              </h3>
              <span className="font-mono text-xs text-ink-400">
                {previewData.exams.length} 考试 · {previewData.questions.length} 题 ·{" "}
                {includeTechnique ? `${previewData.techniques.length} 技巧` : "技巧已排除"}
              </span>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto p-6">
            {format === "json" ? (
              <pre className="overflow-x-auto rounded-sm bg-ink-900 p-4 font-mono text-xs leading-relaxed text-parchment-200">
                {JSON.stringify(
                  {
                    meta: {
                      generator: "题库总结大师 QBM",
                      exportedAt: new Date().toISOString(),
                    },
                    exams: previewData.exams.map((e) => ({
                      id: e.id,
                      name: e.name,
                    })),
                    questions: previewData.questions
                      .slice(0, 3)
                      .map((q) => ({
                        id: q.id,
                        type: q.type,
                        stem: q.stem.slice(0, 40) + "…",
                        ...(includeAnswer ? { answer: q.answer } : {}),
                        ...(includeAnalysis ? { analysis: q.analysis.slice(0, 40) + "…" } : {}),
                      })),
                    "...": `共 ${previewData.questions.length} 道题`,
                  },
                  null,
                  2
                )}
              </pre>
            ) : (
              <div className="space-y-4">
                {previewData.exams.map((exam) => {
                  const eq = previewData.questions.filter(
                    (q) => q.examId === exam.id
                  );
                  return (
                    <div
                      key={exam.id}
                      className="rounded-sm border border-ink-200/50 p-4"
                    >
                      <div className="flex items-center justify-between border-b border-ink-200/40 pb-2">
                        <h4 className="font-display text-base font-semibold text-ink-900">
                          {exam.name}
                        </h4>
                        <span className="font-mono text-[10px] text-ink-400">
                          {eq.length} 题
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {eq.slice(0, 3).map((q, i) => (
                          <div key={q.id} className="font-serif text-xs text-ink-600">
                            <span className="font-mono text-ink-400">
                              {i + 1}.
                            </span>{" "}
                            {q.stem.slice(0, 50)}
                            {q.stem.length > 50 ? "…" : ""}
                          </div>
                        ))}
                        {eq.length > 3 && (
                          <p className="font-mono text-[10px] text-ink-400">
                            … 还有 {eq.length - 3} 题
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormatCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-sm border p-4 transition-all",
        active
          ? "border-amber bg-amber/5 shadow-gold-glow"
          : "border-ink-200 hover:border-amber/40"
      )}
    >
      <Icon
        className={cn("h-7 w-7", active ? "text-amber-dark" : "text-ink-400")}
        strokeWidth={1.5}
      />
      <span
        className={cn(
          "font-display text-base font-semibold",
          active ? "text-ink-900" : "text-ink-600"
        )}
      >
        {title}
      </span>
      <span className="font-mono text-[10px] text-ink-400">{desc}</span>
    </button>
  );
}

function ScopeRadio({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "flex w-full items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition-all",
        checked
          ? "border-amber bg-amber/5"
          : "border-ink-200 hover:border-amber/40"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-amber" : "border-ink-300"
        )}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-amber" />}
      </span>
      <div className="flex-1">
        <p
          className={cn(
            "font-serif text-sm",
            checked ? "text-ink-900" : "text-ink-600"
          )}
        >
          {label}
        </p>
        <p className="font-mono text-[10px] text-ink-400">{sub}</p>
      </div>
    </button>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-ink-100/40"
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-sm border transition-all",
          checked ? "border-amber bg-amber text-ink-900" : "border-ink-300"
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="font-serif text-sm text-ink-700">{label}</span>
    </button>
  );
}

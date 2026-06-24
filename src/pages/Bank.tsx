import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Filter, Search, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { ExamIcon, EmptyState } from "@/components/ui";
import QuestionCard from "@/components/bank/QuestionCard";
import type { Difficulty, QuestionType } from "@/types";
import { DIFFICULTY_LABEL } from "@/types";
import { cn } from "@/lib/utils";

export default function Bank() {
  const navigate = useNavigate();
  const exams = useStore((s) => s.exams);
  const questions = useStore((s) => s.questions);
  const currentExamId = useStore((s) => s.currentExamId);
  const setCurrentExam = useStore((s) => s.setCurrentExam);
  const getKnowledgePoints = useStore((s) => s.getKnowledgePoints);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<QuestionType | "all">("all");
  const [pointFilter, setPointFilter] = useState<string>("all");
  const [diffFilter, setDiffFilter] = useState<Difficulty | "all">("all");
  const [showFilter, setShowFilter] = useState(false);

  const activeExamId = currentExamId || exams[0]?.id;
  const activeExam = exams.find((e) => e.id === activeExamId);
  const knowledgePoints = activeExamId
    ? getKnowledgePoints(activeExamId)
    : [];

  const filtered = useMemo(() => {
    let list = questions.filter((q) => q.examId === activeExamId);
    if (typeFilter !== "all") list = list.filter((q) => q.type === typeFilter);
    if (pointFilter !== "all")
      list = list.filter((q) => q.knowledgePoint === pointFilter);
    if (diffFilter !== "all")
      list = list.filter((q) => q.difficulty === diffFilter);
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      list = list.filter(
        (q) =>
          q.stem.toLowerCase().includes(kw) ||
          q.analysis.toLowerCase().includes(kw) ||
          q.options.some((o) => o.toLowerCase().includes(kw))
      );
    }
    return list;
  }, [questions, activeExamId, typeFilter, pointFilter, diffFilter, search]);

  const resetFilters = () => {
    setTypeFilter("all");
    setPointFilter("all");
    setDiffFilter("all");
    setSearch("");
  };

  const hasFilter =
    typeFilter !== "all" ||
    pointFilter !== "all" ||
    diffFilter !== "all" ||
    search.trim();

  return (
    <div className="min-h-screen pb-20">
      {/* 页头 */}
      <div className="border-b border-ink-200/40 bg-parchment-100/50 py-10">
        <div className="editorial-container">
          <p className="section-label mb-3">Question Bank · 题库大厅</p>
          <h1 className="font-display text-display-md font-semibold text-ink-900">
            结构化题库
          </h1>
          <p className="mt-2 font-serif text-sm text-ink-500">
            AI 去重规整后的标准试题，覆盖单选、多选、判断题型，支持多维筛选与全文搜索。
          </p>
        </div>
      </div>

      {/* 考试选择器 */}
      {exams.length > 0 && (
        <div className="border-b border-ink-200/40 bg-parchment-50/60">
          <div className="editorial-container flex gap-2 overflow-x-auto py-4">
            {exams.map((exam) => {
              const active = exam.id === activeExamId;
              return (
                <button
                  key={exam.id}
                  onClick={() => setCurrentExam(exam.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-sm border px-4 py-2 font-serif text-sm transition-all",
                    active
                      ? "border-amber bg-ink-900 text-amber-glow"
                      : "border-ink-200 bg-parchment-50 text-ink-600 hover:border-amber/50"
                  )}
                >
                  <ExamIcon name={exam.icon} className="h-4 w-4" />
                  {exam.name}
                  <span className="font-mono text-[10px] opacity-60">
                    {questions.filter((q) => q.examId === exam.id).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="editorial-container mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* 筛选侧栏 */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <FilterGroup title="题型">
              {([
                { v: "all", l: "全部" },
                { v: "single_choice", l: "单选题" },
                { v: "multi_choice", l: "多选题" },
                { v: "judge", l: "判断题" },
              ] as const).map((opt) => (
                <FilterRadio
                  key={opt.v}
                  label={opt.l}
                  checked={typeFilter === opt.v}
                  onChange={() => setTypeFilter(opt.v)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="知识点">
              <FilterRadio
                label="全部"
                checked={pointFilter === "all"}
                onChange={() => setPointFilter("all")}
              />
              {knowledgePoints.map((p) => (
                <FilterRadio
                  key={p}
                  label={p}
                  checked={pointFilter === p}
                  onChange={() => setPointFilter(p)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="难度">
              {([
                { v: "all", l: "全部" },
                { v: 1, l: DIFFICULTY_LABEL[1] },
                { v: 2, l: DIFFICULTY_LABEL[2] },
                { v: 3, l: DIFFICULTY_LABEL[3] },
                { v: 4, l: DIFFICULTY_LABEL[4] },
                { v: 5, l: DIFFICULTY_LABEL[5] },
              ] as const).map((opt) => (
                <FilterRadio
                  key={String(opt.v)}
                  label={opt.l}
                  checked={diffFilter === opt.v}
                  onChange={() => setDiffFilter(opt.v)}
                />
              ))}
            </FilterGroup>

            {hasFilter && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 font-mono text-xs text-wine hover:underline"
              >
                <X className="h-3 w-3" /> 清除筛选
              </button>
            )}
          </div>
        </aside>

        {/* 主区域 */}
        <main>
          {/* 搜索栏 */}
          <div className="mb-5 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索题干、选项、解析…"
                className="input-editorial pl-10"
              />
            </div>
            <button
              onClick={() => setShowFilter((v) => !v)}
              className="btn-secondary lg:hidden"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>

          {/* 移动端筛选 */}
          {showFilter && (
            <div className="mb-5 grid grid-cols-3 gap-3 rounded-sm border border-ink-200 bg-parchment-50 p-3 lg:hidden">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as QuestionType | "all")}
                className="rounded-sm border border-ink-200 bg-white px-2 py-1.5 font-serif text-xs"
              >
                <option value="all">全部题型</option>
                <option value="single_choice">单选题</option>
                <option value="multi_choice">多选题</option>
                <option value="judge">判断题</option>
              </select>
              <select
                value={pointFilter}
                onChange={(e) => setPointFilter(e.target.value)}
                className="rounded-sm border border-ink-200 bg-white px-2 py-1.5 font-serif text-xs"
              >
                <option value="all">全部知识点</option>
                {knowledgePoints.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={diffFilter}
                onChange={(e) =>
                  setDiffFilter(
                    e.target.value === "all"
                      ? "all"
                      : (Number(e.target.value) as Difficulty)
                  )
                }
                className="rounded-sm border border-ink-200 bg-white px-2 py-1.5 font-serif text-xs"
              >
                <option value="all">全部难度</option>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABEL[d as Difficulty]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 结果统计 */}
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-xs text-ink-400">
              共 <strong className="text-ink-700">{filtered.length}</strong> 道题
              {activeExam && <span> · {activeExam.name}</span>}
            </p>
            <button
              onClick={() => navigate("/practice")}
              className="font-serif text-xs text-amber-dark hover:underline"
            >
              进入刷题模式 →
            </button>
          </div>

          {/* 题目列表 */}
          {filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((q, i) => (
                <QuestionCard key={q.id} question={q} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title={questions.length === 0 ? "题库为空" : "暂无匹配题目"}
              description={
                questions.length === 0
                  ? "尚未采集任何题目，请先前往采集中心调用知乎全网搜索 + Agnes 大模型生成题库"
                  : "尝试调整筛选条件或清除筛选"
              }
              action={
                questions.length === 0 ? (
                  <button onClick={() => navigate("/collect")} className="btn-primary">
                    前往采集中心
                  </button>
                ) : hasFilter ? (
                  <button onClick={resetFilters} className="btn-secondary">
                    清除筛选
                  </button>
                ) : undefined
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 font-mono text-xs uppercase tracking-wider text-amber-dark">
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterRadio({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 font-serif text-sm transition-colors",
        checked
          ? "bg-amber/10 text-amber-dark"
          : "text-ink-500 hover:bg-ink-100/40 hover:text-ink-700"
      )}
    >
      <span
        className={cn(
          "flex h-3 w-3 items-center justify-center rounded-full border",
          checked ? "border-amber" : "border-ink-300"
        )}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-amber" />}
      </span>
      {label}
    </button>
  );
}

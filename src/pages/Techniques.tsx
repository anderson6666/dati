import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Brain, Lightbulb, Link2, Quote } from "lucide-react";
import { useStore } from "@/store/useStore";
import { ExamIcon, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function Techniques() {
  const navigate = useNavigate();
  const exams = useStore((s) => s.exams);
  const techniques = useStore((s) => s.techniques);
  const currentExamId = useStore((s) => s.currentExamId);
  const setCurrentExam = useStore((s) => s.setCurrentExam);
  const getQuestionById = useStore((s) => s.getQuestionById);

  const activeExamId = currentExamId || exams[0]?.id;
  const examTechniques = useMemo(
    () => techniques.filter((t) => t.examId === activeExamId),
    [techniques, activeExamId]
  );

  const categories = useMemo(
    () => Array.from(new Set(examTechniques.map((t) => t.category))),
    [examTechniques]
  );

  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered =
    activeCategory === "all"
      ? examTechniques
      : examTechniques.filter((t) => t.category === activeCategory);

  return (
    <div className="min-h-screen pb-20">
      {/* 页头 */}
      <div className="border-b border-ink-200/40 bg-parchment-100/50 py-12">
        <div className="editorial-container">
          <p className="section-label mb-3">Techniques · 应试技巧</p>
          <h1 className="font-display text-display-md font-semibold text-ink-900">
            秒杀口诀与避坑指南
          </h1>
          <p className="mt-3 max-w-2xl font-serif text-base text-ink-500">
            Agnes 大模型分析出题规律，为每类题型提炼专属解题口诀、易错点与记忆方法，与题目一一绑定。
          </p>
        </div>
      </div>

      {/* 考试选择器 */}
      <div className="border-b border-ink-200/40 bg-parchment-50/60">
        <div className="editorial-container flex gap-2 overflow-x-auto py-4">
          {exams.map((exam) => {
            const active = exam.id === activeExamId;
            return (
              <button
                key={exam.id}
                onClick={() => {
                  setCurrentExam(exam.id);
                  setActiveCategory("all");
                }}
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
                  {techniques.filter((t) => t.examId === exam.id).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="editorial-container mt-8">
        {/* 分类标签 */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-400">
            分类 →
          </span>
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "rounded-sm border px-3 py-1 font-serif text-xs transition-all",
              activeCategory === "all"
                ? "border-amber bg-amber/10 text-amber-dark"
                : "border-ink-200 text-ink-500 hover:border-amber/40"
            )}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-sm border px-3 py-1 font-serif text-xs transition-all",
                activeCategory === cat
                  ? "border-amber bg-amber/10 text-amber-dark"
                  : "border-ink-200 text-ink-500 hover:border-amber/40"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 技巧卡片 */}
        {filtered.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((tech, idx) => (
              <motion.div
                key={tech.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="editorial-card group flex flex-col p-6"
              >
                {/* 头部 */}
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-amber/40 bg-amber/5">
                    <Brain className="h-5 w-5 text-amber-dark" strokeWidth={1.5} />
                  </div>
                  <span className="tag-amber">{tech.category}</span>
                </div>

                <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">
                  {tech.title}
                </h3>

                {/* 口诀引用 */}
                <div className="mt-4 relative rounded-sm border-l-2 border-amber bg-amber/5 px-4 py-3">
                  <Quote className="absolute -left-1 -top-2 h-4 w-4 text-amber/40" />
                  <p className="font-display text-lg font-medium italic leading-relaxed text-ink-900">
                    {tech.mnemonic}
                  </p>
                </div>

                {/* 避坑要点 */}
                {tech.pitfalls.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-wine">
                      <AlertTriangle className="h-3 w-3" />
                      避坑要点
                    </p>
                    <ul className="space-y-1.5">
                      {tech.pitfalls.map((p, i) => (
                        <li
                          key={i}
                          className="flex gap-2 font-serif text-xs leading-relaxed text-ink-600"
                        >
                          <span className="text-wine">·</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 记忆方法 */}
                <div className="mt-4">
                  <p className="mb-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-moss-dark">
                    <Lightbulb className="h-3 w-3" />
                    记忆方法
                  </p>
                  <p className="font-serif text-xs leading-relaxed text-ink-600">
                    {tech.memoryMethod}
                  </p>
                </div>

                {/* 关联题目 */}
                {tech.relatedQuestionIds.length > 0 && (
                  <div className="mt-4 flex-1 border-t border-ink-200/40 pt-3">
                    <p className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink-400">
                      <Link2 className="h-3 w-3" />
                      关联题目 ({tech.relatedQuestionIds.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tech.relatedQuestionIds.slice(0, 3).map((qid) => {
                        const q = getQuestionById(qid);
                        if (!q) return null;
                        return (
                          <button
                            key={qid}
                            onClick={() => navigate("/practice")}
                            className="inline-flex items-center gap-1 rounded-sm border border-ink-200 px-2 py-0.5 font-serif text-[10px] text-ink-500 transition-colors hover:border-amber hover:text-amber-dark"
                          >
                            {q.stem.slice(0, 14)}…
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Brain}
            title={techniques.length === 0 ? "暂无技巧" : "该考试暂无技巧"}
            description={
              techniques.length === 0
                ? "尚未采集任何题目，请先前往采集中心生成题库与技巧"
                : "该考试暂无应试技巧，可前往采集中心生成"
            }
            action={
              techniques.length === 0 ? (
                <button onClick={() => navigate("/collect")} className="btn-primary">
                  前往采集中心
                </button>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

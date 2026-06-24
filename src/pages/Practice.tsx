import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Lightbulb,
  PenTool,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { ExamIcon, EmptyState, QuestionTypeBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Question } from "@/types";

export default function Practice() {
  const navigate = useNavigate();
  const exams = useStore((s) => s.exams);
  const questions = useStore((s) => s.questions);
  const currentExamId = useStore((s) => s.currentExamId);
  const setCurrentExam = useStore((s) => s.setCurrentExam);
  const progress = useStore((s) => s.progress);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const addWrongRecord = useStore((s) => s.addWrongRecord);
  const getTechniqueById = useStore((s) => s.getTechniqueById);

  const activeExamId = currentExamId || exams[0]?.id;
  const examQuestions = useMemo(
    () => questions.filter((q) => q.examId === activeExamId),
    [questions, activeExamId]
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const current: Question | undefined = examQuestions[currentIdx];
  const examProgress = activeExamId ? progress[activeExamId] : undefined;
  const answeredCount = examProgress?.answered.length ?? 0;
  const correctCount = examProgress?.correct.length ?? 0;
  const accuracy =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  // 切换考试时重置
  useEffect(() => {
    setCurrentIdx(0);
    setSelected([]);
    setSubmitted(false);
  }, [activeExamId]);

  // 切换题目时重置答题状态
  useEffect(() => {
    setSelected([]);
    setSubmitted(false);
  }, [currentIdx]);

  if (examQuestions.length === 0 || !current) {
    return (
      <div className="editorial-container py-20">
        <EmptyState
          icon={PenTool}
          title={questions.length === 0 ? "题库为空" : "暂无题目可刷"}
          description={
            questions.length === 0
              ? "尚未采集任何题目，请先前往采集中心生成题库"
              : "请先选择一个考试或前往题库大厅"
          }
          action={
            questions.length === 0 ? (
              <button onClick={() => navigate("/collect")} className="btn-primary">
                前往采集中心
              </button>
            ) : (
              <button onClick={() => navigate("/bank")} className="btn-primary">
                前往题库大厅
              </button>
            )
          }
        />
      </div>
    );
  }

  const correctAnswers = Array.isArray(current.answer)
    ? current.answer
    : [current.answer];
  const isMulti = current.type === "multi_choice";

  const handleSelect = (opt: string) => {
    if (submitted) return;
    if (isMulti) {
      setSelected((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
      );
    } else {
      setSelected([opt]);
    }
  };

  const handleSubmit = () => {
    if (selected.length === 0) return;
    setSubmitted(true);
    const isCorrect =
      selected.length === correctAnswers.length &&
      selected.every((s) => correctAnswers.includes(s));
    if (activeExamId) {
      recordAnswer(activeExamId, current.id, isCorrect);
      if (!isCorrect) {
        addWrongRecord(current.id, selected);
      }
    }
  };

  const handleNext = () => {
    if (currentIdx < examQuestions.length - 1) {
      setCurrentIdx((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setSelected([]);
    setSubmitted(false);
  };

  const technique = getTechniqueById(current.techniqueId);
  const isCorrect =
    submitted &&
    selected.length === correctAnswers.length &&
    selected.every((s) => correctAnswers.includes(s));

  return (
    <div className="min-h-screen pb-20">
      {/* 页头 */}
      <div className="border-b border-ink-200/40 bg-parchment-100/50 py-8">
        <div className="editorial-container">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-label mb-2">Practice · 刷题面板</p>
              <h1 className="font-display text-2xl font-semibold text-ink-900">
                沉浸式答题
              </h1>
            </div>
            {/* 考试选择 */}
            <div className="flex gap-2">
              {exams.map((exam) => {
                const active = exam.id === activeExamId;
                return (
                  <button
                    key={exam.id}
                    onClick={() => setCurrentExam(exam.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 font-serif text-xs transition-all",
                      active
                        ? "border-amber bg-ink-900 text-amber-glow"
                        : "border-ink-200 bg-parchment-50 text-ink-500 hover:border-amber/50"
                    )}
                  >
                    <ExamIcon name={exam.icon} className="h-3.5 w-3.5" />
                    {exam.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="editorial-container mt-8">
        {/* 进度统计条 */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="当前进度" value={`${currentIdx + 1}/${examQuestions.length}`} />
          <StatCard label="已答题数" value={String(answeredCount)} />
          <StatCard label="正确率" value={`${accuracy}%`} />
          <StatCard label="答对题数" value={String(correctCount)} />
        </div>

        {/* 进度条 */}
        <div className="mb-8 h-1 overflow-hidden rounded-full bg-ink-200/50">
          <motion.div
            className="h-full bg-amber"
            initial={{ width: 0 }}
            animate={{
              width: `${((currentIdx + 1) / examQuestions.length) * 100}%`,
            }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="mx-auto max-w-3xl">
          {/* 题目卡片 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="editorial-card overflow-hidden"
            >
              <div className="border-b border-ink-200/40 bg-parchment-100/40 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ink-400">
                      第 {String(currentIdx + 1).padStart(2, "0")} 题
                    </span>
                    <QuestionTypeBadge type={current.type} />
                    <span className="tag-amber">{current.knowledgePoint}</span>
                  </div>
                  {isMulti && (
                    <span className="font-mono text-[10px] text-wine">
                      多选 · 已选 {selected.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 lg:p-8">
                {/* 题干 */}
                <p className="font-serif text-lg leading-relaxed text-ink-900">
                  {current.stem}
                </p>

                {/* 选项 */}
                <div className="mt-6 space-y-3">
                  {current.options.map((opt, i) => {
                    const isSelected = selected.includes(opt);
                    const isCorrectOpt = correctAnswers.includes(opt);
                    const showCorrect = submitted && isCorrectOpt;
                    const showWrong = submitted && isSelected && !isCorrectOpt;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelect(opt)}
                        disabled={submitted}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-sm border px-4 py-3 text-left transition-all",
                          !submitted && isSelected && "border-amber bg-amber/5",
                          !submitted &&
                            !isSelected &&
                            "border-ink-200 hover:border-amber/40 hover:bg-parchment-100/50",
                          showCorrect && "border-moss bg-moss/10",
                          showWrong && "border-wine bg-wine/10",
                          submitted &&
                            !showCorrect &&
                            !showWrong &&
                            "border-ink-200 opacity-60"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                            !submitted && isSelected && "border-amber bg-amber text-ink-900",
                            !submitted && !isSelected && "border-ink-300 text-ink-400",
                            showCorrect && "border-moss bg-moss text-parchment-50",
                            showWrong && "border-wine bg-wine text-parchment-50",
                            submitted &&
                              !showCorrect &&
                              !showWrong &&
                              "border-ink-200 text-ink-400"
                          )}
                        >
                          {showCorrect ? (
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          ) : showWrong ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            String.fromCharCode(65 + i)
                          )}
                        </span>
                        <span className="flex-1 font-serif text-sm text-ink-800">
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 提交按钮 */}
                {!submitted && (
                  <button
                    onClick={handleSubmit}
                    disabled={selected.length === 0}
                    className={cn(
                      "mt-6 w-full",
                      selected.length === 0
                        ? "cursor-not-allowed opacity-40"
                        : "",
                      "btn-primary"
                    )}
                  >
                    提交答案
                  </button>
                )}

                {/* 答题反馈 */}
                <AnimatePresence>
                  {submitted && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 space-y-4"
                    >
                      {/* 正误提示 */}
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-sm border p-4",
                          isCorrect
                            ? "border-moss/40 bg-moss/5"
                            : "border-wine/40 bg-wine/5"
                        )}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="h-6 w-6 text-moss" />
                        ) : (
                          <XCircle className="h-6 w-6 text-wine" />
                        )}
                        <div>
                          <p
                            className={cn(
                              "font-display text-lg font-semibold",
                              isCorrect ? "text-moss" : "text-wine"
                            )}
                          >
                            {isCorrect ? "回答正确" : "回答错误"}
                          </p>
                          <p className="font-serif text-xs text-ink-500">
                            正确答案：
                            {correctAnswers.map((a) => a).join(" · ")}
                          </p>
                        </div>
                      </div>

                      {/* 解析 */}
                      <div className="rounded-sm bg-parchment-100/60 p-4">
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-amber-dark">
                          解析
                        </p>
                        <p className="font-serif text-sm leading-relaxed text-ink-700">
                          {current.analysis}
                        </p>
                      </div>

                      {/* 技巧 */}
                      {technique && (
                        <div className="rounded-sm border border-amber/40 bg-amber/5 p-4">
                          <p className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber-dark">
                            <Lightbulb className="h-3 w-3" />
                            应试技巧 · {technique.title}
                          </p>
                          <p className="font-display text-base font-medium italic text-ink-900">
                            「{technique.mnemonic}」
                          </p>
                          {technique.pitfalls.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {technique.pitfalls.map((p, i) => (
                                <li
                                  key={i}
                                  className="font-serif text-xs text-ink-600"
                                >
                                  · {p}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* 导航 */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className={cn(
                "btn-secondary",
                currentIdx === 0 && "cursor-not-allowed opacity-40"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              上一题
            </button>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 font-mono text-xs text-ink-400 hover:text-amber-dark"
            >
              <RotateCcw className="h-3 w-3" />
              重新开始
            </button>

            {currentIdx < examQuestions.length - 1 ? (
              <button onClick={handleNext} className="btn-primary">
                下一题
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/wrongbook")}
                className="btn-primary"
              >
                查看错题本
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-ink-200/40 bg-parchment-50/60 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
        {value}
      </p>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookX,
  Check,
  CheckCircle2,
  PenTool,
  Trash2,
  XCircle,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { EmptyState, QuestionTypeBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function WrongBook() {
  const navigate = useNavigate();
  const exams = useStore((s) => s.exams);
  const wrongRecords = useStore((s) => s.wrongRecords);
  const getQuestionById = useStore((s) => s.getQuestionById);
  const removeWrongRecord = useStore((s) => s.removeWrongRecord);
  const markWrongMastered = useStore((s) => s.markWrongMastered);
  const setCurrentExam = useStore((s) => s.setCurrentExam);

  const [filterExam, setFilterExam] = useState<string>("all");
  const [showMastered, setShowMastered] = useState(false);

  const filtered = useMemo(() => {
    let list = wrongRecords;
    if (filterExam !== "all") {
      const examQuestionIds = new Set(
        useStore
          .getState()
          .questions.filter((q) => q.examId === filterExam)
          .map((q) => q.id)
      );
      list = list.filter((r) => examQuestionIds.has(r.questionId));
    }
    if (!showMastered) list = list.filter((r) => !r.mastered);
    return list;
  }, [wrongRecords, filterExam, showMastered]);

  // 按知识点统计
  const pointStats = useMemo(() => {
    const map = new Map<string, { total: number; mastered: number }>();
    filtered.forEach((r) => {
      const q = getQuestionById(r.questionId);
      if (!q) return;
      const cur = map.get(q.knowledgePoint) || { total: 0, mastered: 0 };
      cur.total += 1;
      if (r.mastered) cur.mastered += 1;
      map.set(q.knowledgePoint, cur);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [filtered, getQuestionById]);

  const masteredCount = wrongRecords.filter((r) => r.mastered).length;
  const unmasteredCount = wrongRecords.length - masteredCount;

  return (
    <div className="min-h-screen pb-20">
      {/* 页头 */}
      <div className="border-b border-ink-200/40 bg-parchment-100/50 py-12">
        <div className="editorial-container">
          <p className="section-label mb-3">Wrong Book · 错题本</p>
          <h1 className="font-display text-display-md font-semibold text-ink-900">
            错题标记与重做
          </h1>
          <p className="mt-3 max-w-2xl font-serif text-base text-ink-500">
            刷题过程中的错题自动入本，支持按知识点统计掌握度，标记已掌握或移除，针对性复习。
          </p>
        </div>
      </div>

      <div className="editorial-container mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* 左侧统计 */}
        <aside className="space-y-6">
          {/* 总览 */}
          <div className="editorial-card p-5">
            <h3 className="font-display text-lg font-semibold text-ink-900">
              错题总览
            </h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-sm bg-wine/5 px-3 py-2">
                <span className="font-serif text-xs text-ink-600">待掌握</span>
                <span className="font-display text-xl font-semibold text-wine">
                  {unmasteredCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-sm bg-moss/5 px-3 py-2">
                <span className="font-serif text-xs text-ink-600">已掌握</span>
                <span className="font-display text-xl font-semibold text-moss">
                  {masteredCount}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-ink-200/40 pt-3">
                <span className="font-serif text-xs text-ink-600">总计</span>
                <span className="font-display text-xl font-semibold text-ink-900">
                  {wrongRecords.length}
                </span>
              </div>
            </div>
          </div>

          {/* 知识点掌握度 */}
          {pointStats.length > 0 && (
            <div className="editorial-card p-5">
              <h3 className="font-display text-lg font-semibold text-ink-900">
                知识点分布
              </h3>
              <div className="mt-4 space-y-3">
                {pointStats.map(([point, stat]) => {
                  const rate =
                    stat.total > 0
                      ? Math.round((stat.mastered / stat.total) * 100)
                      : 0;
                  return (
                    <div key={point}>
                      <div className="flex items-center justify-between font-serif text-xs">
                        <span className="text-ink-700">{point}</span>
                        <span className="font-mono text-ink-400">
                          {stat.mastered}/{stat.total}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-200/50">
                        <div
                          className={cn(
                            "h-full transition-all",
                            rate === 100 ? "bg-moss" : rate > 0 ? "bg-amber" : "bg-wine"
                          )}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* 右侧错题列表 */}
        <main>
          {/* 筛选栏 */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <select
              value={filterExam}
              onChange={(e) => setFilterExam(e.target.value)}
              className="rounded-sm border border-ink-200 bg-parchment-50 px-3 py-2 font-serif text-xs"
            >
              <option value="all">全部考试</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 font-serif text-xs text-ink-600">
              <input
                type="checkbox"
                checked={showMastered}
                onChange={(e) => setShowMastered(e.target.checked)}
                className="accent-amber"
              />
              显示已掌握
            </label>
            <span className="ml-auto font-mono text-xs text-ink-400">
              {filtered.length} 条记录
            </span>
          </div>

          {/* 错题列表 */}
          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((record, idx) => {
                const q = getQuestionById(record.questionId);
                if (!q) return null;
                const userAns = Array.isArray(record.userAnswer)
                  ? record.userAnswer
                  : [record.userAnswer];
                const correctAns = Array.isArray(q.answer) ? q.answer : [q.answer];
                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                    className="editorial-card overflow-hidden"
                  >
                    <div
                      className={cn(
                        "flex items-stretch",
                      )}
                    >
                      {/* 掌握度色条 */}
                      <div
                        className={cn(
                          "w-1 shrink-0",
                          record.mastered ? "bg-moss" : "bg-wine"
                        )}
                      />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <QuestionTypeBadge type={q.type} />
                              <span className="tag-amber">{q.knowledgePoint}</span>
                              {record.mastered && (
                                <span className="tag-moss">
                                  <Check className="mr-1 h-3 w-3" />已掌握
                                </span>
                              )}
                            </div>
                            <p className="font-serif text-sm leading-relaxed text-ink-800">
                              {q.stem}
                            </p>
                            {/* 答案对比 */}
                            <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px]">
                              <span className="inline-flex items-center gap-1 text-wine">
                                <XCircle className="h-3 w-3" />
                                你的答案：{userAns.join("、") || "未作答"}
                              </span>
                              <span className="inline-flex items-center gap-1 text-moss">
                                <CheckCircle2 className="h-3 w-3" />
                                正确答案：{correctAns.join("、")}
                              </span>
                            </div>
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex shrink-0 flex-col gap-1.5">
                            <button
                              onClick={() => {
                                setCurrentExam(q.examId);
                                navigate("/practice");
                              }}
                              className="inline-flex items-center gap-1 rounded-sm border border-ink-200 px-2 py-1 font-serif text-[10px] text-ink-600 transition-colors hover:border-amber hover:text-amber-dark"
                            >
                              <PenTool className="h-3 w-3" />
                              重做
                            </button>
                            {!record.mastered && (
                              <button
                                onClick={() => markWrongMastered(q.id)}
                                className="inline-flex items-center gap-1 rounded-sm border border-moss/40 px-2 py-1 font-serif text-[10px] text-moss transition-colors hover:bg-moss/10"
                              >
                                <Check className="h-3 w-3" />
                                掌握
                              </button>
                            )}
                            <button
                              onClick={() => removeWrongRecord(q.id)}
                              className="inline-flex items-center gap-1 rounded-sm border border-ink-200 px-2 py-1 font-serif text-[10px] text-ink-400 transition-colors hover:border-wine hover:text-wine"
                            >
                              <Trash2 className="h-3 w-3" />
                              移除
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={BookX}
              title={wrongRecords.length === 0 ? "错题本为空" : "暂无匹配记录"}
              description={
                wrongRecords.length === 0
                  ? "去刷题吧，错题会自动收录到这里"
                  : "尝试调整筛选条件"
              }
              action={
                wrongRecords.length === 0 ? (
                  <button onClick={() => navigate("/practice")} className="btn-primary">
                    前往刷题
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

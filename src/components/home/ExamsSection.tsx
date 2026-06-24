import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useStore } from "@/store/useStore";
import { ExamIcon } from "@/components/ui";

export default function ExamsSection() {
  const navigate = useNavigate();
  const exams = useStore((s) => s.exams);
  const getQuestionsByExam = useStore((s) => s.getQuestionsByExam);
  const getTechniquesByExam = useStore((s) => s.getTechniquesByExam);
  const setCurrentExam = useStore((s) => s.setCurrentExam);

  const handleEnter = (examId: string, target: string) => {
    setCurrentExam(examId);
    navigate(target);
  };

  return (
    <section className="relative bg-parchment-100/60 py-20 lg:py-28">
      <div className="editorial-container">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="section-label mb-3">Popular Exams</p>
            <h2 className="font-display text-display-md font-semibold text-ink-900">
              热门考试题库
            </h2>
            <p className="mt-3 max-w-xl font-serif text-base text-ink-500">
              内置示例题库已就绪，点击直达刷题。也可前往采集中心生成专属题库。
            </p>
          </div>
          <button
            onClick={() => navigate("/bank")}
            className="btn-secondary"
          >
            查看全部题库
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {exams.map((exam, idx) => {
            const qCount = getQuestionsByExam(exam.id).length;
            const tCount = getTechniquesByExam(exam.id).length;
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="editorial-card group flex flex-col p-7"
              >
                {/* 头部 */}
                <div className="flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-ink-200 bg-ink-900 transition-transform group-hover:scale-105">
                    <ExamIcon
                      name={exam.icon}
                      className="h-7 w-7 text-amber-glow"
                    />
                  </div>
                  <span className="tag-amber">{exam.category}</span>
                </div>

                {/* 标题 */}
                <h3 className="mt-5 font-display text-2xl font-semibold text-ink-900">
                  {exam.name}
                </h3>
                <p className="mt-2 flex-1 font-serif text-sm leading-relaxed text-ink-500">
                  {exam.description}
                </p>

                {/* 统计 */}
                <div className="mt-5 flex items-center gap-4 border-t border-ink-200/50 pt-4 font-mono text-xs text-ink-400">
                  <span>
                    <strong className="text-ink-700">{qCount}</strong> 道题
                  </span>
                  <span className="text-ink-200">|</span>
                  <span>
                    <strong className="text-ink-700">{tCount}</strong> 条技巧
                  </span>
                </div>

                {/* 操作 */}
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => handleEnter(exam.id, "/bank")}
                    className="flex-1 rounded-sm border border-ink-300 px-3 py-2 font-serif text-xs text-ink-700 transition-colors hover:border-amber hover:text-amber-dark"
                  >
                    浏览题库
                  </button>
                  <button
                    onClick={() => handleEnter(exam.id, "/practice")}
                    className="flex-1 rounded-sm bg-ink-900 px-3 py-2 font-serif text-xs text-amber-glow transition-colors hover:bg-ink-800"
                  >
                    立即刷题
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

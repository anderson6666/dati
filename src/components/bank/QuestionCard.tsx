import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Lightbulb, PenTool, BookMarked } from "lucide-react";
import type { Question } from "@/types";
import { useStore } from "@/store/useStore";
import {
  DifficultyStars,
  QuestionTypeBadge,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export default function QuestionCard({
  question,
  index,
}: {
  question: Question;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const getTechniqueById = useStore((s) => s.getTechniqueById);
  const technique = getTechniqueById(question.techniqueId);

  const answerArr = Array.isArray(question.answer)
    ? question.answer
    : [question.answer];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
      className="editorial-card overflow-hidden"
    >
      {/* 卡片头部 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        {/* 编号 */}
        <span className="mt-0.5 shrink-0 font-mono text-xs text-ink-300">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="flex-1">
          {/* 标签行 */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <QuestionTypeBadge type={question.type} />
            <span className="tag-amber">{question.knowledgePoint}</span>
            <DifficultyStars level={question.difficulty} />
            {technique && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-dark">
                <Lightbulb className="h-3 w-3" />
                含技巧
              </span>
            )}
          </div>

          {/* 题干 */}
          <p className="font-serif text-sm leading-relaxed text-ink-800">
            {question.stem}
          </p>
        </div>

        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-ink-400 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* 展开内容 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-ink-200/40"
          >
            <div className="space-y-4 p-5 pl-12">
              {/* 选项 */}
              <div className="space-y-2">
                {question.options.map((opt, i) => {
                  const isAnswer = answerArr.includes(opt);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 rounded-sm px-3 py-2 font-serif text-sm",
                        isAnswer
                          ? "bg-moss/10 text-ink-900"
                          : "bg-parchment-100/50 text-ink-600"
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono text-xs",
                          isAnswer ? "text-moss font-bold" : "text-ink-400"
                        )}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {isAnswer && (
                        <span className="font-mono text-[10px] text-moss">
                          ✓ 正确答案
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 解析 */}
              <div className="rounded-sm bg-parchment-100/60 p-3">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-amber-dark">
                  解析
                </p>
                <p className="font-serif text-xs leading-relaxed text-ink-600">
                  {question.analysis}
                </p>
              </div>

              {/* 技巧 */}
              {technique && (
                <div className="rounded-sm border border-amber/30 bg-amber/5 p-3">
                  <p className="mb-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber-dark">
                    <Lightbulb className="h-3 w-3" />
                    应试技巧 · {technique.title}
                  </p>
                  <p className="font-serif text-sm font-medium text-ink-800">
                    「{technique.mnemonic}」
                  </p>
                </div>
              )}

              {/* 来源与操作 */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200/40 pt-3">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-400">
                  <BookMarked className="h-3 w-3" />
                  {question.source}
                </span>
                <button
                  onClick={() => navigate("/practice")}
                  className="inline-flex items-center gap-1 font-serif text-xs text-amber-dark hover:underline"
                >
                  <PenTool className="h-3 w-3" />
                  去刷题
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

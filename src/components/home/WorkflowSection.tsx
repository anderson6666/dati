import { motion } from "framer-motion";
import { Database, Filter, Lightbulb, PenTool } from "lucide-react";

const STEPS = [
  {
    icon: Database,
    no: "I",
    title: "全网采集",
    desc: "知乎全网搜索 API 抓取真题回忆、网友题库、错题解析、高频考题、答题经验帖子。",
  },
  {
    icon: Filter,
    no: "II",
    title: "AI 去重",
    desc: "Agnes 模型剔除重复题目、去除无效信息，整理标准化选择题、判断题。",
  },
  {
    icon: Lightbulb,
    no: "III",
    title: "技巧生成",
    desc: "提炼专属秒杀解题口诀、避坑技巧，与题目一一绑定。",
  },
  {
    icon: PenTool,
    no: "IV",
    title: "在线刷题",
    desc: "筛选知识点刷题、标记错题、导出完整题库文件，本地复习。",
  },
];

export default function WorkflowSection() {
  return (
    <section className="relative overflow-hidden bg-ink-900 py-20 text-parchment-100 lg:py-28">
      <div className="absolute inset-0 bg-paper-grain opacity-20" />
      <div className="editorial-container relative">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
            Workflow · 处理流程
          </p>
          <h2 className="mt-3 font-display text-display-md font-semibold text-parchment-50">
            从碎片资料到结构化题库
          </h2>
          <p className="mx-auto mt-3 max-w-2xl font-serif text-base text-parchment-300/70">
            四步闭环，把互联网分散的备考资料，变成可刷可练可导出的完整题库。
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-4">
          {STEPS.map((step, idx) => (
            <motion.div
              key={step.no}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.12 }}
              className="relative"
            >
              {/* 连接线 */}
              {idx < STEPS.length - 1 && (
                <span className="absolute left-[60%] top-8 hidden h-px w-full bg-gradient-to-r from-amber/40 to-transparent md:block" />
              )}

              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber/40 bg-ink-800">
                  <step.icon className="h-7 w-7 text-amber-glow" strokeWidth={1.5} />
                </div>
                <span className="mt-4 block font-display text-sm italic text-amber">
                  Step {step.no}
                </span>
                <h3 className="mt-1 font-display text-xl font-semibold text-parchment-50">
                  {step.title}
                </h3>
                <p className="mt-2 font-serif text-sm leading-relaxed text-parchment-300/60">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

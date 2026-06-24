import { motion } from "framer-motion";
import {
  BrainCircuit,
  Download,
  Filter,
  Radar,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  no: string;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: Radar,
    no: "01",
    title: "全网资料自动采集",
    desc: "输入考试名称，调用知乎全网搜索 API，抓取全网分散的真题、回忆版题目、网友错题笔记，把互联网零散信息全部汇总。",
  },
  {
    icon: BrainCircuit,
    no: "02",
    title: "AI 去重规整完整题库",
    desc: "依托 Agnes 模型剔除重复、错误题目，统一整理成标准试题格式，构建全网覆盖面最全面的专属题库，覆盖冷门高频小题。",
  },
  {
    icon: Filter,
    no: "03",
    title: "智能生成应试技巧",
    desc: "AI 分析同一类题型的出题规律，总结关键词秒杀方法、易错点、记忆口诀，每一道题目附带定制化答题解析与做题技巧。",
  },
  {
    icon: Download,
    no: "04",
    title: "在线刷题与文件导出",
    desc: "网页端直接在线刷题，对错题进行标记，同时可以导出完整 JSON 题库、PDF 资料，用于本地复习。",
  },
];

export default function FeaturesSection() {
  return (
    <section className="relative py-20 lg:py-28">
      <div className="editorial-container">
        {/* 章节标题 */}
        <div>
          <p className="section-label mb-3">Core Features</p>
          <h2 className="font-display text-display-md font-semibold text-ink-900">
            四大核心功能
          </h2>
          <p className="mt-3 max-w-2xl font-serif text-base leading-relaxed text-ink-500">
            从全网采集到智能整理，从技巧生成到在线刷题，构建一站式备考闭环。
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {FEATURES.map((f, idx) => (
            <motion.div
              key={f.no}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="editorial-card group relative overflow-hidden p-8"
            >
              {/* 编号水印 */}
              <span className="pointer-events-none absolute -right-2 -top-4 font-display text-8xl font-bold text-ink-100/60 transition-colors group-hover:text-amber/10">
                {f.no}
              </span>

              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-amber/40 bg-amber/5 transition-all group-hover:bg-amber/15">
                  <f.icon className="h-6 w-6 text-amber-dark" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-display text-2xl font-semibold text-ink-900">
                  {f.title}
                </h3>
                <p className="mt-3 font-serif text-sm leading-relaxed text-ink-500">
                  {f.desc}
                </p>
              </div>

              {/* 底部金线 */}
              <span className="absolute inset-x-8 bottom-0 h-px scale-x-0 bg-amber transition-transform duration-500 group-hover:scale-x-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

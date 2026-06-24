import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";

export default function HeroSection() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");

  const handleSearch = () => {
    if (keyword.trim()) {
      navigate(`/collect?keyword=${encodeURIComponent(keyword.trim())}`);
    } else {
      navigate("/collect");
    }
  };

  return (
    <section className="relative overflow-hidden bg-ink-900 text-parchment-100">
      {/* 背景纹理与光晕 */}
      <div className="absolute inset-0 bg-paper-grain opacity-30" />
      <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-amber/10 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-wine/10 blur-3xl" />

      <div className="editorial-container relative py-14 lg:py-32">
        {/* 顶部标号 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <span className="h-px w-12 bg-amber" />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
            Vol.01 · 全网智能备考终端
          </span>
        </motion.div>

        {/* 主标题 */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mt-8 max-w-4xl font-display text-display-xl font-semibold leading-[0.95] text-parchment-50"
        >
          全网题库
          <br />
          <span className="text-gradient-gold">一网打尽</span>
          <span className="italic text-parchment-300">，</span>
          <br />
          应试技巧
          <span className="text-amber-glow"> 一键生成</span>
        </motion.h1>

        {/* 副标题 */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-8 max-w-2xl font-serif text-lg leading-relaxed text-parchment-300/80"
        >
          聚合知乎全网分散的真题回忆、网友题库与答题经验，依托 Agnes
          大模型去重标准化，生成覆盖最完整的结构化题库，并自动提炼专属秒杀口诀与避坑技巧。
        </motion.p>

        {/* 搜索框 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-10 max-w-2xl"
        >
          <div className="group relative flex items-center overflow-hidden rounded-sm border border-amber/30 bg-ink-800/60 backdrop-blur-sm transition-all focus-within:border-amber focus-within:shadow-gold-glow">
            <Search className="ml-4 h-4 w-4 shrink-0 text-amber/60 lg:ml-5 lg:h-5 lg:w-5" strokeWidth={1.5} />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="输入考试名称…"
              className="min-w-0 flex-1 bg-transparent px-3 py-3.5 font-serif text-sm text-parchment-100 placeholder:text-parchment-300/40 focus:outline-none lg:px-4 lg:py-4 lg:text-base"
            />
            <button
              onClick={handleSearch}
              className="mr-1.5 inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-amber px-3 py-2 font-serif text-xs font-medium text-ink-900 transition-all hover:bg-amber-light lg:mr-2 lg:gap-2 lg:px-5 lg:py-2.5 lg:text-sm"
            >
              <Sparkles className="h-3.5 w-3.5 lg:h-4 lg:w-4" strokeWidth={1.5} />
              智能采集
            </button>
          </div>
          <p className="mt-3 font-mono text-xs text-parchment-300/40">
            调用知乎全网搜索 API → Agnes 大模型去重整理 → 生成题库与技巧
          </p>
        </motion.div>
      </div>

      {/* 底部金色分隔 */}
      <div className="gold-divider" />
    </section>
  );
}

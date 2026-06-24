import { Link } from "react-router-dom";
import { Github, Library } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative mt-12 border-t border-ink-200/40 bg-ink-900 text-parchment-200 lg:mt-24 lg:pb-0">
      <div className="editorial-container py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-amber/50">
                <Library className="h-5 w-5 text-amber-glow" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-lg font-semibold text-parchment-100">
                  题库总结大师
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">
                  QBM · Terminal
                </span>
              </div>
            </div>
            <p className="mt-4 max-w-xs font-serif text-sm leading-relaxed text-parchment-300/70">
              聚合全网考试资料，AI 去重整理，生成最完整结构化题库与应试技巧。一站式刷题备考终端。
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="section-label !text-amber">导航</h4>
            <ul className="mt-4 space-y-2 font-serif text-sm">
              <li>
                <Link to="/" className="text-parchment-300/70 transition-colors hover:text-amber-glow">
                  首页
                </Link>
              </li>
              <li>
                <Link to="/collect" className="text-parchment-300/70 transition-colors hover:text-amber-glow">
                  采集中心
                </Link>
              </li>
              <li>
                <Link to="/bank" className="text-parchment-300/70 transition-colors hover:text-amber-glow">
                  题库大厅
                </Link>
              </li>
              <li>
                <Link to="/practice" className="text-parchment-300/70 transition-colors hover:text-amber-glow">
                  刷题面板
                </Link>
              </li>
            </ul>
          </div>

          {/* Tech */}
          <div>
            <h4 className="section-label !text-amber">技术架构</h4>
            <ul className="mt-4 space-y-2 font-mono text-xs text-parchment-300/60">
              <li>React 18 · Vite · TypeScript</li>
              <li>TailwindCSS · Zustand · Framer Motion</li>
              <li>知乎全网搜索 API · Agnes 大模型</li>
              <li>GitHub Pages 静态部署</li>
            </ul>
            <a
              href="https://pages.github.com"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-amber transition-colors hover:text-amber-glow"
            >
              <Github className="h-4 w-4" strokeWidth={1.5} />
              GitPages Deploy
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-parchment-300/15 pt-6 sm:flex-row">
          <p className="font-mono text-xs text-parchment-300/50">
            © 2026 题库总结大师 · 全网智能备考终端
          </p>
          <p className="font-serif text-xs italic text-parchment-300/40">
            "知识殿堂，一题一得"
          </p>
        </div>
      </div>
    </footer>
  );
}

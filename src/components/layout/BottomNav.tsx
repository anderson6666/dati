import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Download,
  GraduationCap,
  Home,
  Lightbulb,
  MoreHorizontal,
  PenLine,
  Radar,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 底部导航主项（5个）
const MAIN_ITEMS = [
  { path: "/", label: "首页", icon: Home },
  { path: "/collect", label: "采集", icon: Radar },
  { path: "/bank", label: "题库", icon: BookOpen },
  { path: "/practice", label: "刷题", icon: PenLine },
  { path: "__more__", label: "更多", icon: MoreHorizontal },
];

// 更多面板项
const MORE_ITEMS = [
  { path: "/techniques", label: "应试技巧", icon: Lightbulb, desc: "秒杀口诀与避坑要点" },
  { path: "/wrongbook", label: "错题本", icon: GraduationCap, desc: "错题回顾与掌握度" },
  { path: "/export", label: "导出中心", icon: Download, desc: "JSON / PDF 导出" },
];

export default function BottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const handleMoreClick = () => {
    setMoreOpen((v) => !v);
  };

  return (
    <>
      {/* 底部导航栏 */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200/50 bg-parchment-200/95 backdrop-blur-md lg:hidden">
        <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {MAIN_ITEMS.map((item) => {
            if (item.path === "__more__") {
              return (
                <button
                  key={item.path}
                  onClick={handleMoreClick}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors",
                    moreOpen ? "text-amber-dark" : "text-ink-500"
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="font-serif text-[10px]">{item.label}</span>
                </button>
              );
            }

            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors",
                  active ? "text-amber-dark" : "text-ink-500"
                )}
              >
                <div className="relative">
                  <item.icon
                    className="h-5 w-5"
                    strokeWidth={active ? 2 : 1.5}
                  />
                  {active && (
                    <span className="absolute -top-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber" />
                  )}
                </div>
                <span
                  className={cn(
                    "font-serif text-[10px]",
                    active && "font-medium"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 更多面板 */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm lg:hidden"
            />
            {/* 弹出面板 */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-amber/30 bg-parchment-100 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:hidden"
            >
              {/* 拖拽指示条 */}
              <div className="flex justify-center pt-3">
                <span className="h-1 w-10 rounded-full bg-ink-200" />
              </div>

              <div className="flex items-center justify-between px-5 pt-3 pb-2">
                <h3 className="font-display text-lg font-semibold text-ink-900">
                  更多功能
                </h3>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 px-5 pb-2">
                {MORE_ITEMS.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-4 rounded-lg border p-4 transition-all",
                        active
                          ? "border-amber/40 bg-amber/8"
                          : "border-ink-200/50 bg-parchment-50 active:bg-ink-100/50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-lg",
                          active ? "bg-amber/15" : "bg-ink-100/60"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5",
                            active ? "text-amber-dark" : "text-ink-600"
                          )}
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="flex-1">
                        <p
                          className={cn(
                            "font-serif text-sm font-medium",
                            active ? "text-amber-dark" : "text-ink-800"
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="font-serif text-xs text-ink-400">
                          {item.desc}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

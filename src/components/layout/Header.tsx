import { Link, useLocation } from "react-router-dom";
import { BookOpenCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "首页", en: "Home" },
  { path: "/collect", label: "采集中心", en: "Collect" },
  { path: "/bank", label: "题库大厅", en: "Bank" },
  { path: "/practice", label: "刷题面板", en: "Practice" },
  { path: "/techniques", label: "应试技巧", en: "Techniques" },
  { path: "/wrongbook", label: "错题本", en: "Wrong" },
  { path: "/export", label: "导出中心", en: "Export" },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/40 bg-parchment-200/85 backdrop-blur-md">
      <div className="editorial-container flex h-14 items-center justify-between lg:h-20">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-amber/50 bg-ink-900 transition-transform group-hover:scale-105 lg:h-9 lg:w-9">
            <BookOpenCheck className="h-4 w-4 text-amber-glow lg:h-5 lg:w-5" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-base font-semibold text-ink-900 lg:text-xl">
              题库总结大师
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-amber-dark lg:block">
              QBM · Terminal
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative px-3 py-2 font-serif text-sm transition-colors",
                  active
                    ? "text-amber-dark"
                    : "text-ink-600 hover:text-ink-900"
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-amber" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

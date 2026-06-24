import { Atom, Bike, BookOpen, Car, GraduationCap, type LucideIcon } from "lucide-react";
import type { Difficulty, QuestionType } from "@/types";
import { DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/types";
import { cn } from "@/lib/utils";

// 考试图标映射
const EXAM_ICON_MAP: Record<string, LucideIcon> = {
  Car,
  Bike,
  Atom,
  BookOpen,
  GraduationCap,
};

export function ExamIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = EXAM_ICON_MAP[name] ?? BookOpen;
  return <Icon className={className} strokeWidth={1.5} />;
}

// 难度星级
export function DifficultyStars({
  level,
  className,
}: {
  level: Difficulty;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      title={`难度：${DIFFICULTY_LABEL[level]}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
        {DIFFICULTY_LABEL[level]}
      </span>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              "text-xs",
              i <= level ? "text-amber" : "text-ink-200"
            )}
          >
            ◆
          </span>
        ))}
      </span>
    </span>
  );
}

// 题型徽章
export function QuestionTypeBadge({
  type,
  className,
}: {
  type: QuestionType;
  className?: string;
}) {
  const styles: Record<QuestionType, string> = {
    single_choice: "tag-amber",
    multi_choice: "tag-wine",
    judge: "tag-moss",
  };
  return (
    <span className={cn(styles[type], className)}>
      {QUESTION_TYPE_LABEL[type]}
    </span>
  );
}

// 章节标题
export function SectionHeading({
  label,
  title,
  subtitle,
  align = "left",
}: {
  label?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn(align === "center" && "text-center")}>
      {label && <p className="section-label mb-3">{label}</p>}
      <h2 className="font-display text-display-md font-semibold text-ink-900">
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-3 font-serif text-base leading-relaxed text-ink-500",
            align === "center" && "mx-auto max-w-2xl"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// 空状态
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-ink-200 bg-parchment-50/50 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-200 bg-parchment-100">
        <Icon className="h-6 w-6 text-ink-400" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-ink-700">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-sm font-serif text-sm text-ink-400">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

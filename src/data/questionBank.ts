import type { Exam } from "@/types";

// 考试列表初始为空，由用户采集时动态创建
export const exams: Exam[] = [];

// 题目与技巧均由知乎全网搜索 + Agnes 大模型实时采集生成，初始为空
export const questions: never[] = [];
export const techniques: never[] = [];

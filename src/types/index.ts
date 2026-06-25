// 题库核心数据类型定义

export type QuestionType = "single_choice" | "multi_choice" | "judge";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Exam {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide 图标名
  category: string;
  hot?: boolean;
}

export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  stem: string;
  options: string[];
  answer: string | string[];
  analysis: string;
  knowledgePoint: string;
  difficulty: Difficulty;
  source: string;
  techniqueId?: string;
}

export interface Technique {
  id: string;
  examId: string;
  category: string;
  title: string;
  mnemonic: string;
  pitfalls: string[];
  memoryMethod: string;
  relatedQuestionIds: string[];
}

export interface WrongRecord {
  id: string;
  questionId: string;
  userAnswer: string | string[];
  createdAt: number;
  mastered: boolean;
}

export interface PracticeProgress {
  [examId: string]: {
    answered: string[]; // 已答题目 id
    correct: string[]; // 答对题目 id
  };
}

export interface ApiConfig {
  zhihuClientId: string; // 知乎开放平台 client_id
  zhihuApiKey: string; // 知乎开放平台 client_secret
  zhihuSearchType: "全网" | "站内"; // 知乎搜索范围：全网搜索 / 站内搜索
  zhihuApiMode: "official" | "proxy"; // 官方开放平台 / 第三方中转 API
  zhihuProxyUrl: string; // 第三方中转 API 地址
  corsProxyUrl: string; // CORS 代理地址（用于绕过浏览器跨域限制）
  agnesApiKey: string;
  agnesEndpoint: string;
}

export interface ZhihuPost {
  id: string;
  title: string;
  content: string;
  author: string;
  url: string;
  publishedAt: string;
  voteupCount: number;
}

export interface CollectStage {
  key: string;
  label: string;
  status: "pending" | "active" | "done";
  detail?: string;
}

/**
 * 后台采集任务状态（内存态，不持久化）。
 * 将采集流程从组件生命周期中解耦，使导航切换页面时不中断、已生成题目不丢失。
 */
export interface CollectTaskState {
  status: "idle" | "running" | "done" | "error";
  keyword: string;
  examId: string | null;
  stages: CollectStage[];
  expansion: { depth: string[]; breadth: string[]; all: string[] } | null;
  subProgress: { current: number; total: number; keyword: string } | null;
  resultStats: { posts: number; questions: number; techniques: number } | null;
  error: string;
  /** 实时计数器（随每个关键词完成递增） */
  liveQuestions: number;
  liveTechniques: number;
  livePosts: number;
  /** 最近生成的题目预览（最多保留 30 条，新的在前） */
  recentQuestions: Question[];
  /** 已完成的关键词列表（用于高亮） */
  doneKeywords: string[];
}

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  single_choice: "单选题",
  multi_choice: "多选题",
  judge: "判断题",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: "入门",
  2: "简单",
  3: "中等",
  4: "较难",
  5: "困难",
};

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ApiConfig,
  Exam,
  PracticeProgress,
  Question,
  Technique,
  WrongRecord,
} from "@/types";
import {
  exams as initialExams,
  questions as initialQuestions,
  techniques as initialTechniques,
} from "@/data/questionBank";

interface QuestionBankState {
  // 题库数据
  exams: Exam[];
  questions: Question[];
  techniques: Technique[];

  // 用户数据
  wrongRecords: WrongRecord[];
  progress: PracticeProgress;
  apiConfig: ApiConfig;

  // 当前选中
  currentExamId: string | null;

  // Actions
  setCurrentExam: (examId: string | null) => void;
  addExam: (exam: Exam) => void;
  addWrongRecord: (questionId: string, userAnswer: string | string[]) => void;
  removeWrongRecord: (questionId: string) => void;
  markWrongMastered: (questionId: string) => void;
  recordAnswer: (examId: string, questionId: string, correct: boolean) => void;
  setApiConfig: (config: Partial<ApiConfig>) => void;
  addQuestions: (qs: Question[]) => void;
  addTechniques: (ts: Technique[]) => void;

  // 派生查询
  getQuestionsByExam: (examId: string) => Question[];
  getTechniquesByExam: (examId: string) => Technique[];
  getTechniqueById: (id?: string) => Technique | undefined;
  getQuestionById: (id: string) => Question | undefined;
  getWrongRecordsByExam: (examId: string) => WrongRecord[];
  getExamById: (id: string) => Exam | undefined;
  getKnowledgePoints: (examId: string) => string[];
}

export const useStore = create<QuestionBankState>()(
  persist(
    (set, get) => ({
      exams: initialExams,
      questions: initialQuestions,
      techniques: initialTechniques,
      wrongRecords: [],
      progress: {},
      apiConfig: {
        zhihuApiKey: "",
        zhihuSearchType: "全网",
        zhihuApiMode: "official",
        zhihuProxyUrl: "",
        // 留空：必须由用户部署自己的 Cloudflare Worker（提供 /zhihu-official-search 端点）
        // 通用公共代理（corsproxy.io / allorigins / codetabs）不兼容当前的官方 API 调用方式
        corsProxyUrl: "",
        agnesApiKey: "",
        agnesEndpoint: "https://apihub.agnes-ai.com/v1",
      },
      currentExamId: null,

      setCurrentExam: (examId) => set({ currentExamId: examId }),

      addExam: (exam) =>
        set((state) => {
          if (state.exams.find((e) => e.id === exam.id)) return state;
          return { exams: [...state.exams, exam] };
        }),

      addWrongRecord: (questionId, userAnswer) =>
        set((state) => {
          const existing = state.wrongRecords.find(
            (r) => r.questionId === questionId
          );
          if (existing) {
            return {
              wrongRecords: state.wrongRecords.map((r) =>
                r.questionId === questionId
                  ? { ...r, userAnswer, createdAt: Date.now(), mastered: false }
                  : r
              ),
            };
          }
          return {
            wrongRecords: [
              ...state.wrongRecords,
              {
                id: `wr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                questionId,
                userAnswer,
                createdAt: Date.now(),
                mastered: false,
              },
            ],
          };
        }),

      removeWrongRecord: (questionId) =>
        set((state) => ({
          wrongRecords: state.wrongRecords.filter(
            (r) => r.questionId !== questionId
          ),
        })),

      markWrongMastered: (questionId) =>
        set((state) => ({
          wrongRecords: state.wrongRecords.map((r) =>
            r.questionId === questionId ? { ...r, mastered: true } : r
          ),
        })),

      recordAnswer: (examId, questionId, correct) =>
        set((state) => {
          const examProgress = state.progress[examId] || {
            answered: [],
            correct: [],
          };
          const answered = examProgress.answered.includes(questionId)
            ? examProgress.answered
            : [...examProgress.answered, questionId];
          const correctList = correct
            ? examProgress.correct.includes(questionId)
              ? examProgress.correct
              : [...examProgress.correct, questionId]
            : examProgress.correct.filter((id) => id !== questionId);
          return {
            progress: {
              ...state.progress,
              [examId]: { answered, correct: correctList },
            },
          };
        }),

      setApiConfig: (config) =>
        set((state) => ({ apiConfig: { ...state.apiConfig, ...config } })),

      addQuestions: (qs) =>
        set((state) => {
          const existingIds = new Set(state.questions.map((q) => q.id));
          const newQs = qs.filter((q) => !existingIds.has(q.id));
          return { questions: [...state.questions, ...newQs] };
        }),

      addTechniques: (ts) =>
        set((state) => {
          const existingIds = new Set(state.techniques.map((t) => t.id));
          const newTs = ts.filter((t) => !existingIds.has(t.id));
          return { techniques: [...state.techniques, ...newTs] };
        }),

      getQuestionsByExam: (examId) =>
        get().questions.filter((q) => q.examId === examId),

      getTechniquesByExam: (examId) =>
        get().techniques.filter((t) => t.examId === examId),

      getTechniqueById: (id) =>
        id ? get().techniques.find((t) => t.id === id) : undefined,

      getQuestionById: (id) => get().questions.find((q) => q.id === id),

      getWrongRecordsByExam: (examId) => {
        const state = get();
        const examQuestionIds = new Set(
          state.questions.filter((q) => q.examId === examId).map((q) => q.id)
        );
        return state.wrongRecords.filter((r) =>
          examQuestionIds.has(r.questionId)
        );
      },

      getExamById: (id) => get().exams.find((e) => e.id === id),

      getKnowledgePoints: (examId) => {
        const qs = get().questions.filter((q) => q.examId === examId);
        return Array.from(new Set(qs.map((q) => q.knowledgePoint)));
      },
    }),
    {
      name: "qbm_store",
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { apiConfig?: Partial<ApiConfig> };
        // 旧版本若存了通用 CORS 代理（corsproxy.io / allorigins / codetabs），
        // 这些地址不兼容当前的 /zhihu-official-search 端点协议，必须清空让用户重新配置 Worker
        if (state.apiConfig) {
          const raw = state.apiConfig.corsProxyUrl || "";
          const isPublicGenericProxy =
            raw.includes("corsproxy.io") ||
            raw.includes("allorigins") ||
            raw.includes("codetabs") ||
            raw.includes("thingproxy");
          state.apiConfig = {
            ...state.apiConfig,
            corsProxyUrl: isPublicGenericProxy ? "" : raw,
          };
        }
        return state;
      },
      partialize: (state) => ({
        exams: state.exams,
        questions: state.questions,
        techniques: state.techniques,
        wrongRecords: state.wrongRecords,
        progress: state.progress,
        apiConfig: state.apiConfig,
        currentExamId: state.currentExamId,
      }),
    }
  )
);

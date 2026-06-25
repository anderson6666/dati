/**
 * 后台采集任务 Runner —— 将采集流程从组件生命周期中解耦。
 *
 * 核心设计：
 * 1. 整个采集流程是一个独立 async 函数，不依赖任何 React 组件。
 * 2. 所有状态写入 Zustand store（collectTask），组件只是读取展示。
 * 3. 每搜完一个关键词就立即把题目增量写入题库（addLiveQuestions），
 *    用户可实时在「题库」页或本页预览区看到新题目。
 * 4. 导航离开本页不会中断流程，已生成题目不会丢失。
 */
import type { Exam } from "@/types";
import { useStore } from "@/store/useStore";
import { searchZhihu } from "@/services/zhihuApi";
import {
  expandKeyword,
  processWithAgnes,
  type KeywordExpansionResult,
} from "@/services/agnesApi";

/** 关键词扩展后逐一生成题目时，单个专项关键词最多采集条数 */
const PER_KEYWORD_LIMIT = 8;

/** 采集阶段定义（与 Collect.tsx 中 STAGE_DEFS 保持一致） */
const STAGE_DEFS = [
  { key: "expand", label: "关键词扩展", detail: "Agnes 大模型在深度与广度两个维度上扩展出更多专项关键词" },
  { key: "search", label: "知乎检索 + 素材抓取", detail: "按每个专项关键词调用知乎搜索 API，逐一抓取真题回忆与经验帖" },
  { key: "dedup", label: "AI 去重", detail: "Agnes 模型剔除重复与无效题目，识别相似题干" },
  { key: "standardize", label: "标准化整理", detail: "统一为选择题/判断题标准格式，归纳知识点与难度" },
  { key: "technique", label: "技巧生成", detail: "提炼秒杀口诀、避坑要点、记忆方法，与题目一一绑定" },
];

/**
 * 启动后台采集任务。该函数立即返回，采集在后台异步进行，
 * 进度通过 store 的 collectTask 状态实时反映。
 *
 * @param mainKeyword 主关键词
 * @returns examId 本次采集归属的考试 ID（用于跳转题库）
 */
export async function runCollectTask(mainKeyword: string): Promise<string | null> {
  const store = useStore.getState();
  const apiConfig = store.apiConfig;

  // 初始化任务状态
  store.resetCollectTask();
  store.setCollectTask({
    status: "running",
    keyword: mainKeyword,
    stages: STAGE_DEFS.map((s) => ({ ...s, status: "pending" })),
  });

  const updateStage = (idx: number, status: "pending" | "active" | "done", detail?: string) => {
    useStore.getState().updateCollectStage(idx, status, detail);
  };

  try {
    // ============ 阶段 0：关键词扩展（深度 + 广度） ============
    updateStage(0, "active", "Agnes 正在按深度与广度两个维度扩展专项关键词…");

    let expanded: KeywordExpansionResult;
    try {
      expanded = await expandKeyword(mainKeyword, apiConfig);
    } catch {
      // 扩展失败时回退：只用主关键词自身
      expanded = { depth: [], breadth: [], all: [mainKeyword] };
    }
    useStore.getState().setCollectTask({ expansion: expanded });

    const subKeywords = expanded.all.length > 0 ? expanded.all : [mainKeyword];

    updateStage(
      0,
      "done",
      `扩展出 ${expanded.depth.length} 条深度 + ${expanded.breadth.length} 条广度专项关键词，共 ${subKeywords.length} 个待采集`
    );

    // 确定目标考试：优先匹配已有考试，否则动态创建
    let examId: string;
    const exams = useStore.getState().exams;
    const matchedExam = exams.find(
      (e) => mainKeyword.includes(e.name) || e.name.includes(mainKeyword)
    );
    if (matchedExam) {
      examId = matchedExam.id;
    } else {
      examId = `exam_${Date.now()}`;
      const newExam: Exam = {
        id: examId,
        name: mainKeyword,
        description: `通过知乎全网搜索 + Agnes 大模型自动采集生成（关键词扩展：${subKeywords.length} 个专项）`,
        icon: "BookOpen",
        category: "自定义",
        hot: false,
      };
      useStore.getState().addExam(newExam);
    }
    useStore.getState().setCollectTask({ examId });

    // ============ 阶段 1-4：逐个专项关键词采集 + 生成 ============
    updateStage(1, "active", `开始逐一采集 ${subKeywords.length} 个专项关键词…`);
    updateStage(2, "active", "等待素材进入 Agnes 去重…");
    updateStage(3, "active", "等待 Agnes 标准化整理…");
    updateStage(4, "active", "等待 Agnes 生成应试技巧…");

    const seenQuestionStems = new Set<string>(); // 跨关键词去重

    for (let i = 0; i < subKeywords.length; i++) {
      const subKw = subKeywords[i];

      // 检查任务是否已被重置（用户手动停止）
      if (useStore.getState().collectTask.status !== "running") {
        return examId;
      }

      useStore.getState().setCollectTask({
        subProgress: { current: i + 1, total: subKeywords.length, keyword: subKw },
      });
      updateStage(
        1,
        "active",
        `(${i + 1}/${subKeywords.length}) 正在采集「${subKw}」…`
      );

      // 1) 知乎搜索
      let posts: Awaited<ReturnType<typeof searchZhihu>> = [];
      try {
        posts = await searchZhihu(subKw, apiConfig);
      } catch {
        // 单个关键词失败不阻断整体流程
        useStore.getState().markKeywordDone(subKw);
        continue;
      }

      if (posts.length > 0) {
        useStore.getState().addLivePosts(posts.length);

        // 2) Agnes 处理（去重 + 标准化 + 技巧）
        try {
          const result = await processWithAgnes(
            subKw,
            posts.slice(0, PER_KEYWORD_LIMIT * 2),
            apiConfig,
            examId
          );

          // 跨关键词去重：题干相似度通过简单字符串包含判断
          const dedupedQuestions = result.questions.filter((q) => {
            const stemKey = q.stem.trim().slice(0, 30);
            if (seenQuestionStems.has(stemKey)) return false;
            seenQuestionStems.add(stemKey);
            return true;
          });

          // ★ 增量写入：每搜完一个关键词就立即把题目写入题库
          if (dedupedQuestions.length > 0) {
            useStore.getState().addLiveQuestions(dedupedQuestions);
          }
          if (result.techniques.length > 0) {
            useStore.getState().addLiveTechniques(result.techniques);
          }

          // 实时更新阶段 2/3/4 的描述
          const live = useStore.getState().collectTask;
          updateStage(2, "active", `已去重保留 ${live.liveQuestions} 道有效题目`);
          updateStage(3, "active", `已标准化 ${live.liveQuestions} 道题目`);
          updateStage(4, "active", `已生成 ${live.liveTechniques} 条应试技巧`);
        } catch {
          // 单个关键词处理失败不阻断整体
        }
      }

      useStore.getState().markKeywordDone(subKw);
    }

    useStore.getState().setCollectTask({ subProgress: null });

    const live = useStore.getState().collectTask;
    updateStage(
      1,
      "done",
      `完成 ${subKeywords.length} 个专项关键词采集，共抓取 ${live.livePosts} 条素材`
    );
    updateStage(2, "done", `跨关键词去重后保留 ${live.liveQuestions} 道有效题目`);
    updateStage(3, "done", `标准化为选择题/判断题，归纳知识点与难度`);
    updateStage(4, "done", `生成 ${live.liveTechniques} 条应试技巧，已与题目绑定`);

    useStore.getState().setCollectTask({
      status: "done",
      resultStats: {
        posts: live.livePosts,
        questions: live.liveQuestions,
        techniques: live.liveTechniques,
      },
    });

    return examId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "采集过程中发生未知错误";
    const currentTask = useStore.getState().collectTask;
    useStore.getState().setCollectTask({
      status: "error",
      error: msg,
      stages: currentTask.stages.map((s) =>
        s.status === "active" ? { ...s, status: "pending" } : s
      ),
    });
    return useStore.getState().collectTask.examId;
  }
}

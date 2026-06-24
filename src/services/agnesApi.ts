import type { ApiConfig, Question, Technique, ZhihuPost } from "@/types";

// Agnes 大模型 API 响应结构（OpenAI 兼容格式）
interface AgnesChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AgnesExtractResult {
  questions: Question[];
  techniques: Technique[];
}

/**
 * 调用 Agnes 大模型 API，将原始素材去重、标准化为题目并生成应试技巧
 * 使用 OpenAI 兼容的 chat/completions 接口
 */
export async function processWithAgnes(
  keyword: string,
  posts: ZhihuPost[],
  config: ApiConfig,
  examId: string
): Promise<AgnesExtractResult> {
  const endpoint = `${config.agnesEndpoint.replace(/\/$/, "")}/chat/completions`;

  // 将原始素材拼接为文本
  const materialsText = posts
    .slice(0, 30) // 限制单次处理数量，避免 token 超限
    .map(
      (p, i) =>
        `【素材${i + 1}】标题：${p.title}\n作者：${p.author}\n内容：${p.content.slice(0, 800)}`
    )
    .join("\n\n");

  const systemPrompt = `你是一个专业的题库整理专家。你的任务是从用户提供的网络素材中提取考试题目，去重整理成标准化题库，并生成应试技巧。

要求：
1. 从素材中提取所有与"${keyword}"相关的题目，包括选择题、判断题。
2. 剔除重复题目（题干相似度高的只保留一道最完整的）。
3. 剔除无效信息、广告、无关内容。
4. 为每道题补充解析、知识点分类、难度评估（1-5）、来源标注。
5. 按题型分类总结应试技巧，包括秒杀口诀、避坑要点、记忆方法。
6. 技巧与题目通过 techniqueId 关联。

输出严格的 JSON 格式，不要包含任何其他文字：
{
  "questions": [
    {
      "id": "q_<examId>_<序号>",
      "examId": "${examId}",
      "type": "single_choice | multi_choice | judge",
      "stem": "题干",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确答案（单选为字符串，多选为数组，判断为'正确'或'错误'）",
      "analysis": "解析说明",
      "knowledgePoint": "知识点",
      "difficulty": 1-5的数字,
      "source": "来源标注",
      "techniqueId": "关联的技巧id（可选）"
    }
  ],
  "techniques": [
    {
      "id": "t_<examId>_<序号>",
      "examId": "${examId}",
      "category": "分类",
      "title": "技巧标题",
      "mnemonic": "秒杀口诀",
      "pitfalls": ["避坑要点1", "避坑要点2"],
      "memoryMethod": "记忆方法",
      "relatedQuestionIds": ["关联题目id"]
    }
  ]
}

注意：
- judge 类型（判断题）的 options 固定为 ["正确", "错误"]
- 尽可能多地提取题目，覆盖素材中的所有考点
- 技巧要实用、精炼，口诀要朗朗上口`;

  const userPrompt = `以下是关于"${keyword}"的全网搜索素材，请整理成标准化题库并生成应试技巧：\n\n${materialsText}`;

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.agnesApiKey}`,
    },
    body: JSON.stringify({
      model: "agnes-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(
      `Agnes API 请求失败 (${resp.status})：${errText || resp.statusText}`
    );
  }

  const data: AgnesChatResponse = await resp.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Agnes API 返回内容为空");
  }

  // 解析 JSON 响应
  let parsed: { questions: Question[]; techniques: Technique[] };
  try {
    // 清理可能的 markdown 代码块标记
    const cleanContent = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleanContent);
  } catch {
    throw new Error("Agnes API 返回内容无法解析为 JSON，请重试");
  }

  // 数据校验与补全
  const questions: Question[] = (parsed.questions || []).map((q, i) => ({
    ...q,
    id: q.id || `q_${examId}_agnes_${Date.now()}_${i}`,
    examId,
    type: q.type || "single_choice",
    options: q.options || (q.type === "judge" ? ["正确", "错误"] : []),
    answer: q.answer || "",
    analysis: q.analysis || "",
    knowledgePoint: q.knowledgePoint || "未分类",
    difficulty: (q.difficulty >= 1 && q.difficulty <= 5 ? q.difficulty : 3) as 1|2|3|4|5,
    source: q.source || `Agnes 整理自全网素材`,
  }));

  const techniques: Technique[] = (parsed.techniques || []).map((t, i) => ({
    ...t,
    id: t.id || `t_${examId}_agnes_${Date.now()}_${i}`,
    examId,
    category: t.category || "通用",
    title: t.title || "应试技巧",
    mnemonic: t.mnemonic || "",
    pitfalls: t.pitfalls || [],
    memoryMethod: t.memoryMethod || "",
    relatedQuestionIds: t.relatedQuestionIds || [],
  }));

  return { questions, techniques };
}

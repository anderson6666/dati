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
 * 关键词扩展结果：深度 + 广度两个维度的专项关键词
 */
export interface KeywordExpansionResult {
  /** 深度方向关键词：在主关键词领域内往下钻取的细分考点 */
  depth: string[];
  /** 广度方向关键词：横向辐射的相关考点与跨学科关联 */
  breadth: string[];
  /** 全部专项关键词（深度 + 广度去重） */
  all: string[];
}

/**
 * 调用 Agnes 大模型对用户输入的主关键词进行深度 + 广度扩展，
 * 输出更多可被逐一采集的专项关键词。
 *
 * - 深度：在该考试/学科内部继续细分章节、知识点、题型
 * - 广度：横向辐射到相关学科、易混淆考点、跨学科应用
 */
export async function expandKeyword(
  mainKeyword: string,
  config: ApiConfig
): Promise<KeywordExpansionResult> {
  const endpoint = `${config.agnesEndpoint.replace(/\/$/, "")}/chat/completions`;

  const systemPrompt = `你是一位资深的考试命题与教研专家，精通各学科考纲拆解与考点图谱构建。你的任务是：对用户给出的主关键词，从「深度」与「广度」两个维度，穷尽式地扩展出尽可能多、可被逐一搜索采集真题的专项关键词，最终形成一张覆盖完整、颗粒度合适的考点检索网。

【核心目标】
- 深度：在主关键词所属考试/学科内部，沿"章—节—知识点—题型—陷阱"逐层下钻，做到"考什么就拆什么"。
- 广度：横向辐射到相关学科、易混淆考点、跨学科应用、配套法规、行业前沿，做到"考纲外但真题会考的也要覆盖"。
- 数量：在保证每条关键词都能直接搜出真题的前提下，尽可能多地输出，宁多勿漏。

━━━━━━━━━━━━━━━━━━━━━━━━━━
一、深度方向（depth）—— 至少 25-40 条，按以下 6 个子维度均匀产出
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 章节细分：按官方考纲/教材目录拆到二级、三级章节名（如"长期股权投资·权益法"）。
2. 核心知识点：每个章节下高频考查的具体知识点（如"内部交易抵销处理"）。
3. 典型题型：该学科常考的题型套路名（如"综合题·现金流量表编制"）。
4. 高频考点：近 5 年真题反复出现的考点（如"资产减值损失确认"）。
5. 易错点/陷阱：考生易踩坑的细节（如"暂时性差异与永久性差异区分"）。
6. 历年真题核心：以"年份+考点"形式给出能直接命中的检索词（如"2023 注会 会计 租赁"）。

━━━━━━━━━━━━━━━━━━━━━━━━━━
二、广度方向（breadth）—— 至少 15-25 条，按以下 6 个子维度均匀产出
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 相关学科/考试：与主关键词同源或互认的其他考试/学科（如主关键词为"注会会计"，可辐射"中级会计实务·长期股权投资"）。
2. 易混淆考点：与主关键词考点名称相近、常被考生搞混的概念（如"经营租赁与融资租赁"）。
3. 跨学科应用：该考点在其他学科中的交叉应用（如"会计+税法·递延所得税"）。
4. 配套法规/标准：与考点绑定的法律法规、准则、规范名（如"企业会计准则第 21 号"）。
5. 新增/变动考点：近年考纲新增或修订的内容（如"新收入准则五步法"）。
6. 行业前沿动态：与考点相关的最新实务热点、监管口径（如"ESG 报告披露要求"）。

━━━━━━━━━━━━━━━━━━━━━━━━━━
三、质量约束（必须严格遵守）
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 每条关键词长度 4-25 字，必须是能直接作为搜索引擎 query 的具体子主题，不要给出整句或问句。
2. 不要重复主关键词本身；不要给出过于宽泛（如"考试"、"复习"、"真题"）或过于狭窄（如某个具体年份某道题的完整题干）的词。
3. 同一子维度内部不得重复；跨子维度允许少量必要重复，但最终 depth 与 breadth 两个数组内部各自去重。
4. 按重要性从高到低排序：高频考点 > 一般考点 > 拓展考点。
5. 若主关键词本身已包含具体科目/学科信息，深度方向应聚焦该科目内部；广度方向再向外辐射。
6. 宁可多给也不要漏掉可采集的真题方向；若某子维度确实不适用，可少给但不要省略该类别。

━━━━━━━━━━━━━━━━━━━━━━━━━━
四、输出格式（严格 JSON，不要任何其他文字）
━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "depth": ["深度关键词1", "深度关键词2", "..."],
  "breadth": ["广度关键词1", "广度关键词2", "..."]
}

记住：depth 数组至少 25 条、最多 40 条；breadth 数组至少 15 条、最多 25 条。总量不少于 40 条。`;

  const userPrompt = `主关键词：「${mainKeyword}」\n请严格按上述 6 个深度子维度 + 6 个广度子维度穷尽扩展，确保 depth ≥ 25 条、breadth ≥ 15 条，输出严格 JSON。`;

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.agnesApiKey}`,
    },
    body: JSON.stringify({
      model: "agnes-2.0-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(
      `关键词扩展请求失败 (${resp.status})：${errText || resp.statusText}`
    );
  }

  const data: AgnesChatResponse = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("关键词扩展返回内容为空");
  }

  let parsed: { depth?: string[]; breadth?: string[] };
  try {
    const cleanContent = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleanContent);
  } catch {
    throw new Error("关键词扩展返回内容无法解析为 JSON，请重试");
  }

  // 关键词清洗：去空白、去重、过滤过短/过长/含主关键词本身的条目
  const cleanKeyword = (s: string, mainKw: string) => {
    const kw = String(s).trim();
    if (!kw) return null;
    if (kw.length < 2 || kw.length > 30) return null;
    if (kw === mainKw) return null;
    // 过滤过于宽泛的词
    const tooBroad = ["考试", "复习", "真题", "题库", "资料", "总结", "笔记"];
    if (tooBroad.includes(kw)) return null;
    return kw;
  };

  const depth = (parsed.depth || [])
    .map((s) => cleanKeyword(s, mainKeyword))
    .filter((k): k is string => k !== null);
  const breadth = (parsed.breadth || [])
    .map((s) => cleanKeyword(s, mainKeyword))
    .filter((k): k is string => k !== null);

  const seen = new Set<string>();
  const all: string[] = [];
  for (const kw of [...depth, ...breadth]) {
    if (!seen.has(kw)) {
      seen.add(kw);
      all.push(kw);
    }
  }

  return { depth, breadth, all };
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
      model: "agnes-2.0-flash",
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

import type { AnalysisResult } from '../types';
import { BRANCH_NAMES } from '../data/branches';
import { getLineTooltip } from './lineTooltip';
import { callLLM, hasAIProvider, isModelAvailable } from './aiClient';
import { getDefaultModelId } from './aiModels';

const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

function toYaoName(position: number): string {
  return Number.isFinite(position) && position >= 1 && position <= 6
    ? YAO_NAMES[position - 1]
    : `第${position}爻`;
}

/**
 * 为 Agent 组装的卦象上下文：占问、本卦之卦、世应、日建月建旬空、六爻及每爻详情。
 * 供 LLM 首轮与后续轮使用。
 */
export function buildAgentPayload(question: string, result: AnalysisResult): string {
  const main = result.mainHexagram;
  const change = result.changeHexagram;
  const riKongStr = result.riKongBranches.map((b) => BRANCH_NAMES[b]).join('、');

  const lines: string[] = [];
  lines.push('## 占问');
  lines.push(question || '（未填写）');
  lines.push('');
  lines.push('## 卦象');
  lines.push(`本卦：${main.name}（${main.palaceName}宫）`);
  if (change) lines.push(`之卦：${change.name}`);
  lines.push(`世爻：${toYaoName(main.shiPosition)}`);
  lines.push(`应爻：${toYaoName(main.yingPosition)}`);
  lines.push(`日建：${result.dayBranchName}`);
  lines.push(`月建：${BRANCH_NAMES[result.monthBranch]}`);
  lines.push(`旬空：${riKongStr}`);
  lines.push('');
  lines.push('## 六爻详情（从初爻到上爻）');
  for (let i = 0; i < main.lines.length; i++) {
    const detail = getLineTooltip(result, i);
    lines.push(`--- 爻位 ${i + 1} ---`);
    lines.push(detail);
    lines.push('');
  }
  return lines.join('\n');
}

/** 首轮分析的 System Prompt：角色、用神规则、世应/干支/他爻/变爻解读、4 层 thinking 输出要求 */
export function getSystemPrompt(): string {
  return `你是六爻占卜分析助手。请根据用户提供的「所问事件」与「卦象数据」，按以下步骤输出分析；必须按顺序逐层输出。

## 输出格式（必须严格遵守）
每层输出格式为：
1. 先单独一行写层标题（仅以下四组标题之一，不要加粗、不要加冒号、不要接在标题后写正文）
   【选用神】
   【重要爻位】
   【爻位与干支作用】
   【故事与结论】
2. 换行后写该层正文内容。正文用自然段或分条叙述，不要在标题同一行写「：」或「**」。

错误示例（禁止）：【选用神】**：根据所问事件… 或 1. **【选用神】**：…
正确示例：
【选用神】
所问为面试、工作录用，取官鬼为用神。本卦官鬼在三爻（乙卯木），即世爻，表示问卦者自身与所求的职位一体。卦中官鬼只此一爻，取三爻为用神。

【重要爻位】
- 用神：三爻官鬼卯木（世爻），代表己方与所求之事。
- 应爻：六爻妻财子水，动化兄弟戌土，代表对方（用人单位）。
- 动爻：四爻子孙申金动化父母午火（回头克）；六爻妻财子水动化兄弟戌土（回头克）。
（后续层同理：标题单独一行，换行后写内容。）

## 用神规则（根据所问事件取用神）
- 妻财：求财、生意、妻子、女性配偶、货物、钱财。
- 官鬼：工作、职位、官非、官司、丈夫、男性配偶、疾病、盗贼。
- 父母：长辈、父母、文书、合同、证件、房车、学业、消息。
- 兄弟：同辈、兄弟朋友、竞争、破耗、阻隔。
- 子孙：子女、下属、医药、宠物、解忧、克官（利求财、不利求官）。

若卦中无该六亲或有多爻同六亲，请说明取哪一爻为用神及原因。

## 世应
- 世爻代表问卦者/己方，应爻代表对方/事体。分析时需结合世应生克与用神关系。

## 干支、他爻、变爻
- 日建、月建对爻有生克合冲刑墓空库等作用；他爻对本爻有生克合冲等作用；动爻与变爻有回头生克、化进化退等。分析时要紧扣对用神、世应的具体影响，而非只罗列各爻的旺衰状态。
- **分析动爻须结合动爻与变爻两者的旺衰、空、刑、冲、合等**：卦象数据中「动变作用」已给出本爻（动爻）旺衰摘要与变爻旺衰及干支作用（日建/月建下的生克、旬空、合冲刑墓库等）。断卦时要同时看：(1) 动爻自身旺衰、空刑冲合——动爻有力则动变之象更显，动爻衰空则动而无力；(2) 变爻旺衰、空刑冲合——变爻有力则回头生克与化进化退的力度大，变爻衰空入墓则力度减。综合两者再论回头生克、化进化退的吉凶与应期。
- **分析他爻对用神（或对世应）影响时，须点名各他爻的旺衰**：卦象数据中「他爻作用」已标注每爻的旺衰（日生/日克/月生/月克/旬空/库/墓等），断卦时要据此说明该爻有力或无力，从而判断其生克用神的力度（如他爻旺相则生用神有力、克用神更凶；他爻衰空则生克之力减）。
- **多动爻作用于用神时须用「贪生忘克」**：若同时有多个动爻（或变爻）作用于用神——有的生用神、有的克用神——古法以贪生忘克论：生用神者优先、为主，克用神者相对「忘克」或力度减弱；断卦时先论生、再论克，据此判断用神最终是得助多还是受制多，不可简单把生克数量相抵。

## 各层内容要求
1. 【选用神】：根据所问事件确定用神（六亲），并说明理由；若卦中无该六亲或有多爻同六亲，说明取哪一爻为用神及原因。
2. 【重要爻位】：列出与本问相关的关键爻位（用神爻、世爻、应爻、动爻/变爻，以及可能影响用神的他爻），简要说明为何这些爻重要。
3. 【爻位与干支作用】：分析各爻、日建月建对用神与世应的具体影响。写明：用神爻受日建/月建/他爻/动变后是增力还是减力、对事体有利或不利；世爻、应爻各自受哪些爻与干支生克；先写对用神的影响，再写对世应的影响。**对他爻**：须点名各他爻的旺衰（卦象中「他爻作用」已标日建/月建/旬空/墓库等），据此判断其生克用神或世应的力度。**对动爻**：须结合动爻自身与变爻两者的旺衰、空、刑、冲、合等（卦象「动变作用」中已列本爻旺衰与变爻旺衰及干支作用），综合判断动爻是否有力、变爻回头生克与化进化退的力度，再论吉凶与应期。**若有多动爻同时作用用神**：须按「贪生忘克」论——生用神者为主、克用神者忘克或减力，先论生再论克，据此断用神最终得失。可分条写「日建/月建对用神的影响」「他爻对用神的影响（并点名各他爻旺衰）」「动变对用神的影响（多动爻时注明贪生忘克）」「对世爻、应爻的影响」。
4. 【故事与结论】：根据上述作用与所问事件，用自然语言生成连贯故事（事态如何、有何阻碍或助力、人物/关系对应），并给出明确结论：吉凶倾向、应期或注意事项、具体建议。`;
}

/** 后续对话的 System 补充：用户补充事件细节时，归纳、卦上对应、修正结论与建议 */
export function getFollowUpSystemPrompt(): string {
  return `当前是同一卦的后续对话。用户可能补充事件细节（时间、人物、前因后果、具体关切等）。请：

1. **理解补充信息**：简要归纳用户新提供的时间、人物、关系、具体问题等。
2. **卦上对应**：把补充的细节与卦象对应起来（例如某人对应世/应、某时间对应日建/月建或爻位、某件事对应动爻或某六亲）。
3. **修正结论与建议**：在保持原卦数据不变的前提下，根据新信息调整解读（更精确的应期、更贴合细节的建议，或修正原先结论中与事实不符的部分）。若补充信息与卦象冲突，可说明并给出折中解读。

请先简短归纳用户补充，再写卦上对应，最后给出修正后的结论与具体建议。`;
}

/**
 * 构建首轮分析的 user 消息：所问事件 + 卦象 payload。
 */
export function buildFirstRoundUserMessage(question: string, result: AnalysisResult): string {
  const payload = buildAgentPayload(question, result);
  return `## 所问事件\n${question || '（未填写）'}\n\n## 卦象数据\n${payload}`;
}

/**
 * 判断是否为「请求分析」的首条用户消息（用于区分首轮与后续轮）。
 * 若对话历史中已有助手输出的 4 层分析（含【故事与结论】），则视为后续轮。
 */
export function isFirstAnalysisRound(chatMessages: { role: string; content: string }[]): boolean {
  const hasStoryConclusion = chatMessages.some(
    (m) => m.role === 'assistant' && m.content.includes('【故事与结论】')
  );
  return !hasStoryConclusion;
}

/**
 * 构建后续轮次的 user 消息：首轮分析全文 + 对话历史 + 当前用户输入 + 卦象 payload（便于 Agent 对应卦象）。
 */
export function buildFollowUpUserMessage(
  question: string,
  result: AnalysisResult,
  chatHistory: { role: string; content: string }[],
  currentUserInput: string
): string {
  const payload = buildAgentPayload(question, result);
  const historyText = chatHistory
    .map((m) => `[${m.role}]\n${m.content}`)
    .join('\n\n---\n\n');
  return `## 卦象数据（与原卦一致，供对应参考）\n${payload}\n\n## 对话历史\n${historyText}\n\n## 用户本次补充\n${currentUserInput}`;
}

/** 4 层 thinking 的层标题（用于解析与展示） */
export const ANALYSIS_LAYER_TITLES = ['【选用神】', '【重要爻位】', '【爻位与干支作用】', '【故事与结论】'] as const;

/** 层标题 → 展示用 tag（如 Cursor 的步骤标签） */
export const LAYER_DISPLAY_LABELS: Record<(typeof ANALYSIS_LAYER_TITLES)[number], string> = {
  '【选用神】': '分析用神',
  '【重要爻位】': '分析爻位',
  '【爻位与干支作用】': '分析爻位与干支作用',
  '【故事与结论】': '故事与结论',
};

export type AnalysisLayer = {
  title: (typeof ANALYSIS_LAYER_TITLES)[number];
  content: string;
};

export type StreamingLayer = {
  title: (typeof ANALYSIS_LAYER_TITLES)[number];
  displayLabel: string;
  content: string;
};

export type StreamingState = {
  layers: StreamingLayer[];
  streamingTag: (typeof ANALYSIS_LAYER_TITLES)[number] | null;
  streamingLabel: string;
  streamingContent: string;
};

/**
 * 解析助手回复是否为 4 层分析格式，若是则拆成层数组便于分段展示。
 * 返回 null 表示非 4 层格式，按普通消息展示即可。
 */
export function parseAnalysisLayers(content: string): AnalysisLayer[] | null {
  const layers: AnalysisLayer[] = [];
  let remaining = content;
  for (const title of ANALYSIS_LAYER_TITLES) {
    const idx = remaining.indexOf(title);
    if (idx === -1) continue;
    const afterTitle = remaining.slice(idx + title.length).trimStart();
    const nextTitle = ANALYSIS_LAYER_TITLES.find((t) => t !== title && afterTitle.includes(t));
    const endIdx = nextTitle ? afterTitle.indexOf(nextTitle) : afterTitle.length;
    const layerContent = afterTitle.slice(0, endIdx).trim();
    layers.push({ title, content: layerContent });
    remaining = afterTitle.slice(endIdx);
  }
  return layers.length >= 2 ? layers : null;
}

/**
 * 从流式累积的全文解析出已完成层 + 当前正在输出的层（用于 Cursor 式 tag 展示）。
 */
export function parseStreamingLayers(fullText: string): StreamingState {
  const layers: StreamingLayer[] = [];
  let streamingTag: (typeof ANALYSIS_LAYER_TITLES)[number] | null = null;
  let streamingContent = '';

  let pos = 0;
  for (let i = 0; i < ANALYSIS_LAYER_TITLES.length; i++) {
    const title = ANALYSIS_LAYER_TITLES[i];
    const idx = fullText.indexOf(title, pos);
    if (idx === -1) break;
    const contentStart = idx + title.length;
    const nextTitles = ANALYSIS_LAYER_TITLES.slice(i + 1);
    let contentEnd = fullText.length;
    for (const t of nextTitles) {
      const j = fullText.indexOf(t, contentStart);
      if (j >= 0 && j < contentEnd) contentEnd = j;
    }
    const content = fullText.slice(contentStart, contentEnd).trimStart();

    if (contentEnd < fullText.length) {
      layers.push({ title, displayLabel: LAYER_DISPLAY_LABELS[title], content: content.trim() });
      pos = contentEnd;
    } else {
      streamingTag = title;
      streamingContent = content;
      break;
    }
  }

  return {
    layers,
    streamingTag,
    streamingLabel: streamingTag ? LAYER_DISPLAY_LABELS[streamingTag] : '',
    streamingContent,
  };
}

/**
 * 流式解卦/追问：有 API Key 时走 streamLLM 并按段 onUpdate；否则走 callAnalysisLLM 结束时一次性 onUpdate。
 * modelId 可选，如 "openai:gpt-4o"；不传时使用默认（第一个已配置的厂商旗舰）。
 */
export async function streamAnalysisLLM(
  systemPrompt: string,
  userMessage: string,
  onUpdate: (state: StreamingState) => void,
  modelId?: string
): Promise<string> {
  const effectiveModelId = modelId && isModelAvailable(modelId) ? modelId : getDefaultModelId();
  if (hasAIProvider() && isModelAvailable(effectiveModelId)) {
    const { streamLLM } = await import('./aiClient');
    return streamLLM(systemPrompt, userMessage, (fullText) => {
      onUpdate(parseStreamingLayers(fullText));
    }, effectiveModelId);
  }
  if (typeof (window as unknown as { __LIUYAO_LLM_CALL__?: (s: string, u: string) => Promise<string> }).__LIUYAO_LLM_CALL__ === 'function') {
    const content = await (window as unknown as { __LIUYAO_LLM_CALL__: (s: string, u: string) => Promise<string> }).__LIUYAO_LLM_CALL__(systemPrompt, userMessage);
    onUpdate(parseStreamingLayers(content));
    return content;
  }
  const content = getMockAnalysisResponse();
  onUpdate(parseStreamingLayers(content));
  return content;
}

/**
 * 调用 LLM 进行分析。
 * modelId 可选；不传时使用默认模型。若无 key 或需覆盖时，可使用 window.__LIUYAO_LLM_CALL__；否则返回示例 4 层文本。
 */
export async function callAnalysisLLM(
  systemPrompt: string,
  userMessage: string,
  modelId?: string
): Promise<string> {
  const effectiveModelId = modelId && isModelAvailable(modelId) ? modelId : getDefaultModelId();
  if (hasAIProvider() && isModelAvailable(effectiveModelId)) {
    const out = await callLLM(systemPrompt, userMessage, effectiveModelId);
    if (out) return out;
  }
  if (typeof (window as unknown as { __LIUYAO_LLM_CALL__?: (s: string, u: string) => Promise<string> }).__LIUYAO_LLM_CALL__ === 'function') {
    return (window as unknown as { __LIUYAO_LLM_CALL__: (s: string, u: string) => Promise<string> }).__LIUYAO_LLM_CALL__(systemPrompt, userMessage);
  }
  return getMockAnalysisResponse();
}

/** 专门用于「月建判断爻旺衰」的 System Prompt（独立调用） */
export function getMonthBranchSystemPrompt(): string {
  return `你是六爻占卜中的「月建旺衰判定助手」。你的任务只有一个：
根据给定的卦象数据与当月月建，严格按照「四旺、四衰、一平」的规则，
分别判断每一爻在月建之下属于哪一类旺衰状态，并简要说明理由。

## 判断规则（必须遵守）

一、旺相（爻在月建上得力）
按力度由强到弱分四种：

1. 爻临月建（旺相一，高层次旺）
   - 爻与月建地支相同，如：寅木爻逢寅月。
   - 结论写为：高层次旺相（临月建）。

2. 爻得月令合（旺相二，高层次旺）
   - 爻与月建六合，如：寅木爻逢亥月。
   - 凡卦中得月令相合之爻，一概视为「合旺」，属高层次旺相。
   - 结论写为：高层次旺相（合月建）。

3. 爻得月令生（旺相三，一般旺）
   - 月建五行生爻五行，如：子水月生寅木爻。
   - 结论写为：一般旺相（得月生）。

4. 爻得月令扶（旺相四，一般旺）
   - 爻与月建同一五行，如：寅木爻逢卯月（同为木）。
   - 结论写为：一般旺相（同五行扶）。

> 提示：前两种（临月建、合月建）属于「高层次旺相」，力量通常可以压过一般层次的衰相。

二、衰相（爻在月建上受伤或泄气）
按力度由重到轻分四种：

1. 爻遭月破（衰相一，高层次衰）
   - 月建冲爻，如：寅木爻逢申月。
   - 结论写为：高层次衰相（月破）。

2. 爻被月令五行克伤（衰相二，一般衰）
   - 月建五行克爻五行，如：酉金月克寅木爻。
   - 结论写为：一般衰相（被月克）。

3. 爻克月令（衰相三，休囚）
   - 爻五行去克月建五行，如：寅木爻逢丑土月（木克土）。
   - 名为「爻在月上休囚」。
   - 结论写为：一般衰相（爻克月，休囚）。

4. 爻生月令（衰相四，休囚）
   - 爻五行生月建五行，如：寅木爻逢午火月（木生火）。
   - 名为「爻在月上休囚」，不断输血给环境。
   - 结论写为：一般衰相（爻生月，休囚）。

> 提示：月破属于「高层次衰相」，往往压过一般层次的旺相。

三、平相（得月气，不明显旺衰）

- 按古论：「水爻气在丑月，木爻气在辰月，火爻气在未月，金爻气在戌月」。
- 这些皆为四季末之土月，属「得气而不属休囚」：
  - 结论写为：平相（得月气）。

> 实战中，得气多随其它条件偏向略旺或略衰：
> - 若本身有根、又得他爻或日建生扶，可视为偏旺的平相；
> - 若本身休囚、多受克，则得气难救，可视为偏衰的平相。
> 你在说明中可以简短点出这种偏向。

四、优先级与写法要求

- 若同一爻同时符合多种关系（例如既被月克、又与月建合），
  请按「高层次信息优先」：
  - 高层次旺相（临月建、合月建） > 一般旺相；
  - 高层次衰相（月破） > 一般衰相；
  - 高层次衰相通常压过一般旺相。
- 输出时，请明确标出：
  - 此爻在月建上的总结：高层次旺相 / 一般旺相 / 高层次衰相 / 一般衰相 / 平相；
  - 以及采用了哪一条规则（例如：被月冲 → 月破；得月生 → 得月生）。

## 输出格式要求

1. 不要讨论用神、世应、原神、忌神等，仅讨论「每一爻在月建下的旺衰」。
2. 按从初爻到上爻的顺序输出，每爻一小段，模板示例如下：

初爻某某（某五行，某地支）
- 月建：某月（某五行）
- 月建与本爻关系：……（如「月建五行生本爻」「月建与本爻六合」「月建冲本爻」等）
- 结论：高层次旺相 / 一般旺相 / 高层次衰相 / 一般衰相 / 平相（简要引用规则说明原因）

3. 若某爻与月建之间完全无生克合冲、也不属「得气」四土月之一，可说明为：
   「与月建无明显生克合冲关系，视为接近平相，再结合其它因素另断。」`;
}

/** 专门用于「日建判断爻旺衰」的 System Prompt（独立调用） */
export function getDayBranchSystemPrompt(): string {
  return `你是六爻占卜中的「日建旺衰判定助手」。你的任务只有一个：
根据给定的某一爻（五行 + 地支 + 动静状态）与当日日建，严格按照下面的「旺相 / 平相 / 衰相」规则，
判断该爻在日建之下属于哪一类旺衰状态，并简要说明理由。

注意：本 Prompt 只讨论「日建对某一爻」的旺衰，请不要扩展到用神、世应、原神、忌神等整体断卦内容。

## 一、基本原则

- 日建只分「旺相 / 平相 / 衰相」三类，不用「休囚」这个词。
- 「生旺墓绝」这套理论主要应用于日建与动爻，不用于月建。
- 若同时出现多种关系（如既有合又有克），需要按「高层次旺衰优先」的原则来定最终归类。

## 二、日建旺相的五种情形

遇到以下任一情形，即可判为「旺相」；其中 1、2 为高层次旺相。

1. 爻临日建（同支）——旺相一（高层次旺）
   - 爻与日令地支相同，如：寅木爻逢寅日。
   - 结论用语示例：旺相（临日建，同支）。

2. 静爻得日令合——旺相二（高层次旺）
   - 仅限静爻：静爻与日令六合，如：寅木静爻逢亥日。
   - 在吉凶判断层面，只论「合旺」，不论「日绊」。
   - 结论用语示例：旺相（静爻得日合，高层次旺）。

3. 爻得日令生——旺相三（一般旺）
   - 日令五行生爻五行，如：子水日生寅木爻（水生木）。
   - 结论用语示例：旺相（得日生）。

4. 爻得日令扶（同五行）——旺相四（一般旺）
   - 爻与日令同一五行，如：寅木爻逢卯日（皆为木）。
   - 结论用语示例：旺相（与日同五行）。

5. 爻于日令长生或帝旺——旺相五（一般旺）
   - 爻在日令的长生位或帝旺位，如土爻在申日得长生，在子日得帝旺（具体长生旺地按十二长生体系判）。
   - 结论用语示例：旺相（长生在日）或 旺相（帝旺在日）。

> 提示：1、2 视为「高层次旺相」，通常可以压过一般层次的衰败因素；
> 3、4、5 为一般层次旺相，仍属有力，但权重略低。

## 三、日建平相的两种情形

以下两类一律记为「平相」，不论为旺或为衰：

1. 爻克日令——平相
   - 爻五行去克日令五行，如：寅木爻逢丑日（土），或午火爻逢酉日（金）。
   - 爻在日上虽有动作，但不直接判为旺或衰。

2. 爻生日令——平相
   - 爻五行生日日令，如：寅木爻逢午日（木生火），午火爻逢辰日（火生土）。
   - 这里与月建不同，在日建上不以「休囚」名之，只论平相。

> 提示：判断时可在说明文字中点出「爻克日 / 爻生日」，但最终结论标签仍是「平相」。

## 四、日建衰相的两种情形

遇到以下任一情形，即可判为「衰相」；二者皆属一般层次的衰败：

1. 爻被日令五行克——衰相一
   - 日令五行克爻五行，如：酉金日克寅木爻（金克木）。
   - 结论用语示例：衰相（被日克）。

2. 爻绝在日——衰相二
   - 爻落在日令的绝地，如：子水爻逢巳日，为「子水绝在巳」。
   - 结论用语示例：衰相（绝在日）。

> 提示：日建的两种衰相都算一般层次衰败，权重低于高层次旺相（临日建、静爻合日），
> 但在缺乏其它生扶时，仍然会明显削弱该爻的实际力量。

## 五、综合判断与冲突处理

1. 若同一爻在日建上出现多重关系（如既合又克、既长生又被他爻所制），请按下面顺序优先：
   - 高层次旺相（临日建、静爻合日）；
   - 其次看衰相（被日克、绝在日）；
   - 再看一般旺相（得日生、同五行扶、长生/帝旺）。

2. 输出时：
   - 先用一个词给出总评：旺相 / 平相 / 衰相；
   - 再用 1–3 句说明你采用了哪条规则，以及为何舍弃其它可能的判断（若存在冲突）。

## 六、输出格式要求

1. 第一行：只写最终结论之一 ——「旺相」「平相」「衰相」三选一。
2. 从第二行开始，用 1–3 句话简要解释：
   - 点明日令地支与五行；
   - 点明日令与该爻的主要关系（如：临日建、被日克、爻克日、爻生日、长生在日、绝在日等）；
   - 根据上述某条规则，说明为何判为该类旺衰。
3. 不要加入与整体断卦无关的内容，如：整体吉凶、用神、世应、应期等。

我会提供：
- 某一爻的五行与地支，以及该爻是静爻还是动爻；
- 当前日支（地支 + 五行即可）；
你只需根据以上规则返回该爻在日建上的旺衰结论与简要说明。`;
}


function getMockAnalysisResponse(): string {
  return `【选用神】
根据所问事件推断用神。例如：问财取妻财，问官取官鬼，问长辈取父母，问同辈取兄弟，问子女或下属取子孙。若卦中无该六亲，需看伏神或代用。请结合上方卦象数据与占问内容确定用神并简述理由。

【重要爻位】
列出与本问相关的关键爻位：用神所在爻、世爻、应爻、动爻/变爻，以及生克用神的他爻。说明为何这些爻对断事重要。

【爻位与干支作用】
分析各爻与干支对用神、世应的具体影响：用神爻受日建/月建/他爻/动变后是增力还是减力、对事体有利或不利；世爻、应爻各受哪些生克、对己方与对方意味着什么；哪些爻在生扶用神或世爻、哪些在克泄，综合后对问事的利弊。不要只罗列各爻旺衰状态，要写出对用神与世应的影响。

【故事与结论】
根据上述作用与所问事件，用自然语言生成连贯故事（事态发展、阻碍或助力、人物关系对应），并给出明确结论：吉凶倾向、应期或注意事项、具体建议。

（以上为示例结构。接入 LLM API 后，将返回模型按卦象与占问生成的完整分析。）`;
}

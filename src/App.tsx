import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { CoinGroup, DivinationState, AnalysisResult, LineInfo, Branch } from './types';
import { analyzeDivination } from './lib/analyze';
import { getFullGanzhiBeijing, formatInTimeZone, getLocalTimeZoneName } from './lib/dateGanzhi';
import { getLineSymbolFromCoinGroup } from './lib/lineSymbol';
import { LIU_CHONG } from './data/branches';
import { SIX_GOD_DESC } from './data/sixGods';
import { getLineTooltip } from './lib/lineTooltip';
import { LIUYAO_TIPS } from './data/liuyaoTips';
import {
  getSystemPrompt,
  getFollowUpSystemPrompt,
  buildFirstRoundUserMessage,
  buildFollowUpUserMessage,
  isFirstAnalysisRound,
  parseAnalysisLayers,
  streamAnalysisLLM,
  LAYER_DISPLAY_LABELS,
  type StreamingState,
} from './lib/divinationPrompts';
import { getAvailableModelOptions, getDefaultModelId } from './lib/aiModels';

const defaultCoinGroups: [CoinGroup, CoinGroup, CoinGroup, CoinGroup, CoinGroup, CoinGroup] = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
];

const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

/** 当前北京时间，格式 YYYY-MM-DDTHH:mm（用于默认起卦时间） */
function getNowBeijingString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** 六冲卦：内外卦对应爻位地支两两相冲 */
function isLiuChong(lines: LineInfo[]): boolean {
  const isChong = (a: Branch, b: Branch) =>
    LIU_CHONG.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return (
    isChong(lines[0].branch, lines[3].branch) &&
    isChong(lines[1].branch, lines[4].branch) &&
    isChong(lines[2].branch, lines[5].branch)
  );
}

/** 本卦/变卦每爻显示：六亲+天干+地支+五行，如 子孙癸酉金 */
function lineLabel(line: LineInfo): string {
  return `${line.sixRelationName}${line.stemName}${line.branchName}${line.fiveElement}`;
}

/** 横杠爻象：阳爻一条实杠，阴爻两条断杠 */
function YaoBar({ lineType, className = '' }: { lineType: LineInfo['lineType']; className?: string }) {
  const isYang = lineType === 'lao_yang' || lineType === 'shao_yang';
  return (
    <span className={`inline-flex items-center ${className}`} aria-hidden>
      {isYang ? (
        <span className="block h-2 w-10 bg-stone-800 rounded-sm" />
      ) : (
        <span className="inline-flex gap-2">
          <span className="block h-2 w-4 bg-stone-800 rounded-sm" />
          <span className="block h-2 w-4 bg-stone-800 rounded-sm" />
        </span>
      )}
    </span>
  );
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

/** 根据卦象结果生成一句简要概述，供 AI 对话区首条展示 */
function getInitialAnalysisSummary(result: AnalysisResult): string {
  const main = result.mainHexagram;
  const change = result.changeHexagram;
  const hasMoving = main.lines.some((l) => l.isMoving);
  let text = `本卦 ${main.name}（${main.palaceName}宫）`;
  if (change) {
    text += `，之卦 ${change.name}。${hasMoving ? '有动爻，可看动变与回头生克。' : '静卦。'}`;
  }
  const toYaoName = (pos: number) =>
    Number.isFinite(pos) && pos >= 1 && pos <= 6 ? YAO_NAMES[pos - 1] : `第${pos}爻`;
  text += ` 世在${toYaoName(main.shiPosition)}，应在${toYaoName(main.yingPosition)}。`;
  text += ' 您可输入问题让我分析，或点击左侧卦象中的六神、爻位查看干支与他爻作用等详情。';
  return text;
}

function App() {
  const [question, setQuestion] = useState('');
  const [dateTime, setDateTime] = useState(() => getNowBeijingString());
  const [coinGroups, setCoinGroups] = useState(defaultCoinGroups);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [streamingState, setStreamingState] = useState<StreamingState | null>(null);
  const [activeTipId, setActiveTipId] = useState<string | null>(null);
  const availableModels = getAvailableModelOptions();
  const [selectedModelId, setSelectedModelId] = useState<string>(() => getDefaultModelId());

  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.some((m) => m.id === selectedModelId)) {
      setSelectedModelId(getDefaultModelId());
    }
  }, [availableModels.length, selectedModelId]);

  const chatScrollBottomRef = useRef<HTMLDivElement | null>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const userAtBottomRef = useRef(true);
  const SCROLL_THRESHOLD = 80;

  useEffect(() => {
    const el = chatScrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      userAtBottomRef.current =
        el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  /** 仅当用户当前在底部时才自动滚到底部，否则保持用户滚动位置 */
  useEffect(() => {
    if (!userAtBottomRef.current) return;
    chatScrollBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [streamingState, chatMessages, analysisLoading]);

  const tooltipLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = (text: string) => {
    // 点击展示详情：直接设置内容，不再依赖悬停延时
    if (tooltipLeaveTimer.current) {
      clearTimeout(tooltipLeaveTimer.current);
      tooltipLeaveTimer.current = null;
    }
    setTooltip(text);
  };
  const hideTooltip = () => {
    // 点击外部或关闭按钮时直接关闭
    if (tooltipLeaveTimer.current) {
      clearTimeout(tooltipLeaveTimer.current);
      tooltipLeaveTimer.current = null;
    }
    setTooltip(null);
  };

  const toggleCoin = (row: number, col: number) => {
    setSubmitError(null);
    setCoinGroups((prev) => {
      const next = prev.map((g) => [...g]) as typeof prev;
      next[row][col] = next[row][col] === 0 ? 1 : 0;
      return next;
    });
  };

  const handleSubmit = () => {
    setSubmitError(null);
    if (tooltipLeaveTimer.current) clearTimeout(tooltipLeaveTimer.current);
    tooltipLeaveTimer.current = null;
    setTooltip(null);
    try {
      const state: DivinationState = { question, dateTime, coinGroups };
      const analysisResult = analyzeDivination(state);
      setResult(analysisResult);
      setChatMessages([{ role: 'assistant', content: getInitialAnalysisSummary(analysisResult) }]);
      setChatInput('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSubmitError('起卦失败：' + message);
      console.error('analyzeDivination error', err);
    }
  };

  /** 解卦：流式首轮 4 层分析（选用神 → 重要爻位 → 爻位与干支作用 → 故事与结论） */
  const runInterpretation = async () => {
    if (!result) return;
    userAtBottomRef.current = true;
    setAnalysisLoading(true);
    setStreamingState({ layers: [], streamingTag: null, streamingLabel: '', streamingContent: '' });
    const triggerMsg: ChatMessage = { role: 'user', content: '请根据占问与卦象解卦' };
    setChatMessages((prev) => [...prev, triggerMsg]);
    try {
      const systemPrompt = getSystemPrompt();
      const userMessage = buildFirstRoundUserMessage(question, result);
      const fullText = await streamAnalysisLLM(systemPrompt, userMessage, (state) =>
        setStreamingState(state), selectedModelId
      );
      setChatMessages((prev) => [...prev, { role: 'assistant', content: fullText }]);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `解卦失败：${errMsg}` },
      ]);
    } finally {
      setAnalysisLoading(false);
      setStreamingState(null);
    }
  };

  /** 追问：流式输出，Agent 在卦上对应并修正结论与建议 */
  const sendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !result) return;
    const hasInterpretation = !isFirstAnalysisRound(chatMessages);
    if (!hasInterpretation) return;
    userAtBottomRef.current = true;
    setAnalysisLoading(true);
    setStreamingState({ layers: [], streamingTag: null, streamingLabel: '', streamingContent: '' });
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    try {
      const systemPrompt = `${getSystemPrompt()}\n\n${getFollowUpSystemPrompt()}`;
      const userMessage = buildFollowUpUserMessage(question, result, chatMessages, trimmed);
      const fullText = await streamAnalysisLLM(systemPrompt, userMessage, (state) =>
        setStreamingState(state), selectedModelId
      );
      setChatMessages((prev) => [...prev, { role: 'assistant', content: fullText }]);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `追问回复失败：${errMsg}` },
      ]);
    } finally {
      setAnalysisLoading(false);
      setStreamingState(null);
    }
  };

  /** 同步为当前北京时间（起卦时间以北京为准） */
  const syncNowBeijing = () => setDateTime(getNowBeijingString());

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localLabel = `${formatInTimeZone(dateTime, tz, { dateStyle: 'medium', timeStyle: 'short' })} (${getLocalTimeZoneName(dateTime)})`;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 p-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-stone-800">六爻起卦</h1>
          <p className="text-sm text-stone-500 mt-1">输入问题与摇卦结果，查看卦象与世应六亲</p>
        </header>

        {!result && (
          <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-2">
              <h2 className="text-lg font-semibold text-stone-800">排卦</h2>
            </div>
            <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch lg:min-h-[32rem]">
              {/* 左栏：占问、起卦时间（与卦象结果页左栏同结构、等高） */}
              <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-stone-200 bg-stone-50 overflow-hidden">
                <div className="flex-1 min-h-0 p-4 space-y-4 overflow-auto">
                  <div className="text-sm text-stone-600 space-y-1.5 bg-slate-50 rounded-lg p-3">
                    <label className="block">
                      <span className="text-stone-500">占问</span>
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="请输入所问之事"
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-stone-500">起卦时间</span>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="datetime-local"
                          value={dateTime}
                          onChange={(e) => setDateTime(e.target.value)}
                          className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={syncNowBeijing}
                          className="shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          同步当前北京时间
                        </button>
                      </div>
                    </label>
                    <p className="text-xs text-stone-500 pt-0.5">
                      当地时间：{localLabel.replace(/\s+/g, ' ')}
                    </p>
                  </div>
                  <div className="text-sm text-stone-600 space-y-2">
                    <p className="font-semibold text-stone-700">占问</p>
                    <p>填写所问之事。</p>
                    <p className="font-semibold text-stone-700">起卦时间</p>
                    <p>填入指定北京时间，或点「同步当前北京时间」填入当前时刻。</p>
                    <p>起卦按北京时间计算干支与旬空。</p>
                    <p className="font-semibold text-stone-700">排卦</p>
                    <p>在右侧按从下往上顺序选择每爻的字/花，然后点击「起卦」。</p>
                    <p>六爻（从下往上：初爻→上爻）</p>
                    <p>每爻投 3 枚硬币，点击切换「字」与「花」。</p>
                    <p>三字=老阴(动)，三花=老阳(动)，两字一花=少阳，两花一字=少阴。</p>
                  </div>
                </div>
              </div>
              {/* 右栏：排卦（六爻 + 起卦，与卦象结果页右栏等高） */}
              <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-stone-200 bg-stone-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-stone-200 bg-stone-100 text-sm font-medium text-stone-600">
                  排卦
                </div>
                <div className="flex-1 min-h-0 p-4 overflow-auto">
                  <div className="space-y-3">
                    {([5, 4, 3, 2, 1, 0] as const).map((row) => (
                      <div key={row} className="flex items-center gap-2">
                        <span className="w-14 text-sm text-stone-500">{YAO_NAMES[row]}</span>
                        <div className="flex gap-1 flex-1">
                          {coinGroups[row].map((face, col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => toggleCoin(row, col)}
                              className={`w-12 h-12 rounded-lg border-2 font-medium transition-colors ${
                                face === 1
                                  ? 'bg-amber-500 border-amber-600 text-white'
                                  : 'bg-stone-100 border-stone-300 text-stone-600 hover:border-stone-400'
                              }`}
                            >
                              {face === 1 ? '花' : '字'}
                            </button>
                          ))}
                        </div>
                        <span className="w-12 text-right font-serif text-stone-600" aria-label="爻象">
                          {getLineSymbolFromCoinGroup(coinGroups[row])}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="mt-5 w-full rounded-lg bg-amber-600 text-white py-2.5 font-medium hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    起卦
                  </button>
                  {submitError && (
                    <p className="mt-3 text-sm text-red-600" role="alert">
                      {submitError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {result && (
          <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 relative">
            <div className="flex justify-between items-center border-b border-stone-200 pb-2">
              <h2 className="text-lg font-semibold text-stone-800">卦象结果</h2>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                再起一卦
              </button>
            </div>

            {/* 最左侧：解卦要点目录浮窗（hover 展开，竖向 handle 靠左边界） */}
            <div className="pointer-events-none fixed inset-y-28 left-0 z-30 hidden md:flex items-start">
              <div className="group pointer-events-auto relative">
                <div className="ml-0.5 rounded-r-lg bg-amber-600 px-1 py-2 text-[11px] font-medium text-white shadow cursor-default flex items-center justify-center [writing-mode:vertical-rl]">
                  解卦要点
                </div>
                <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150 mt-1 ml-0.5 rounded-r-lg border border-stone-200 bg-white shadow-lg w-56 max-h-[60vh] overflow-auto text-xs text-stone-700">
                  {LIUYAO_TIPS.map((tip) => (
                    <button
                      key={tip.id}
                      type="button"
                      onClick={() => setActiveTipId(tip.id)}
                      className={`block w-full text-left px-3 py-2 border-b border-stone-100 hover:bg-amber-50 ${
                        activeTipId === tip.id ? 'bg-amber-50 font-semibold text-amber-800' : ''
                      }`}
                    >
                      {tip.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch lg:min-h-[32rem]">
              {/* 左栏：卦象（高度固定），在上面叠加解卦要点内容浮层 */}
              <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-stone-200 bg-stone-50 overflow-hidden relative">
                <div className="px-3 py-2 border-b border-stone-200 bg-stone-100">
                  <span className="text-sm font-medium text-stone-700">卦象排盘</span>
                </div>

                {/* 左栏主体：始终是卦面内容 */}
                <div className="flex-1 min-h-0 p-4 space-y-4 overflow-auto">
                {/* 占问、起卦时间、干支（年月日时）、旬空 */}
                <div className="text-sm text-stone-600 space-y-1.5 bg-slate-50 rounded-lg p-3">
                  {question.trim() && (
                    <p>
                      <span className="text-stone-500">占问：</span>
                      <span className="text-stone-800">{question.trim()}</span>
                    </p>
                  )}
                  <p>
                    <span className="text-stone-500">起卦时间：</span>
                    {formatInTimeZone(dateTime, 'Asia/Shanghai', { dateStyle: 'long', timeStyle: 'short' })}（北京时间）
                  </p>
                  {(() => {
                    const full = getFullGanzhiBeijing(dateTime);
                    return (
                      <p>
                        <span className="text-stone-500">干支：</span>
                        <span className="text-stone-800 font-medium">
                          {full.yearGanZhi}　{full.monthGanZhi}　{full.dayGanZhi}　{full.hourGanZhi}
                        </span>
                        {'　　'}
                        <span className="text-red-600">（旬空：{full.riKong}）</span>
                      </p>
                    );
                  })()}
                </div>

                {/* 排盘表：六神 | 伏神 | 【本卦】横杠+文字 | 世/应/× | 【变卦】横杠+文字，从上爻到初爻 */}
                <div className="overflow-x-auto border border-stone-200 rounded-lg">
                  <table className="w-full text-sm border-collapse">
                    <colgroup>
                      <col className="w-16" />
                      <col className="w-24" />
                      <col className="min-w-[11rem]" />
                      <col className="min-w-[10rem]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50">
                        <th className="py-2 px-1 text-stone-600 font-medium">六神</th>
                        <th className="py-2 px-1 text-stone-600 font-medium">伏神</th>
                        <th className="py-2 px-2 text-stone-700 font-medium text-center">
                          【本 卦】
                          {result.mainHexagram.palaceName}宫 {result.mainHexagram.name}
                          {isLiuChong(result.mainHexagram.lines) && <span className="text-red-600">（六冲）</span>}
                        </th>
                        <th className="py-2 px-2 text-stone-700 font-medium text-center">
                          {result.changeHexagram ? (
                            <>
                              【变 卦】
                              {result.changeHexagram.palaceName}宫 {result.changeHexagram.name}
                              {isLiuChong(result.changeHexagram.lines) && (
                                <span className="text-red-600">（六冲）</span>
                              )}
                            </>
                          ) : (
                            '【变 卦】—'
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {([5, 4, 3, 2, 1, 0] as const).map((idx) => {
                        const main = result.mainHexagram.lines[idx];
                        const change = result.changeHexagram?.lines[idx];
                        return (
                          <tr
                            key={idx}
                            className={`border-b border-stone-100 ${
                              main.position === result.mainHexagram.shiPosition
                                ? 'bg-amber-50/70'
                                : main.position === result.mainHexagram.yingPosition
                                  ? 'bg-sky-50/50'
                                  : ''
                            }`}
                          >
                            <td
                              className="py-2 px-1 text-stone-600 align-middle cursor-pointer whitespace-nowrap text-center"
                              onClick={() => showTooltip(SIX_GOD_DESC[main.sixGod])}
                            >
                              {main.sixGodName}
                            </td>
                            <td className="py-2 px-1 text-stone-600 align-middle">
                              {main.fuShen ? (
                                <span className="inline-flex flex-col leading-tight text-xs font-medium">
                                  <span className="truncate">
                                    {main.fuShen.sixRelationName}
                                    {main.fuShen.stemName}
                                    {main.fuShen.branchName}
                                    {main.fuShen.fiveElement}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-stone-300 text-xs">—</span>
                              )}
                            </td>
                            <td
                              className="py-2 px-2 align-middle cursor-pointer"
                              onClick={() => showTooltip(getLineTooltip(result, idx))}
                            >
                              <span className="inline-flex items-center gap-2 min-w-0">
                                <YaoBar lineType={main.lineType} className="shrink-0" />
                                <span className="font-medium text-stone-800 whitespace-nowrap shrink-0">{lineLabel(main)}</span>
                                {main.position === result.mainHexagram.shiPosition && (
                                  <span className="text-amber-600 text-xs shrink-0">世</span>
                                )}
                                {main.position === result.mainHexagram.yingPosition && (
                                  <span className="text-sky-600 text-xs shrink-0">应</span>
                                )}
                                {main.isMoving && <span className="text-red-600 font-medium shrink-0">×</span>}
                              </span>
                            </td>
                            <td className="py-2 px-2 align-middle">
                              {change ? (
                                <span className="inline-flex items-center gap-2 min-w-0">
                                  <YaoBar lineType={change.lineType} className="shrink-0" />
                                  <span className="font-medium text-stone-800 whitespace-nowrap shrink-0">{lineLabel(change)}</span>
                                  {change.position === result.mainHexagram.shiPosition && (
                                    <span className="text-amber-600 text-xs shrink-0">世</span>
                                  )}
                                  {change.position === result.mainHexagram.yingPosition && (
                                    <span className="text-sky-600 text-xs shrink-0">应</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-stone-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </div>

                {/* 解卦要点内容浮层：叠加在左栏之上，不改变高度 */}
                {activeTipId && (
                  <div className="absolute inset-0 z-20 flex flex-col bg-stone-50/95 backdrop-blur-sm">
                    <div className="px-3 py-2 border-b border-stone-200 bg-stone-100 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-stone-700">解卦要点</span>
                      <button
                        type="button"
                        onClick={() => setActiveTipId(null)}
                        className="text-xs px-2 py-1 rounded border border-stone-300 bg-white text-stone-500 hover:bg-stone-100"
                      >
                        返回卦面
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 px-3 py-2 overflow-auto text-sm text-stone-700">
                      {(() => {
                        const tip = LIUYAO_TIPS.find((t) => t.id === activeTipId);
                        if (!tip) return null;
                        return (
                          <div className="space-y-3">
                            <h3 className="text-base font-semibold text-stone-800">{tip.title}</h3>
                            <div className="prose prose-sm max-w-none text-xs text-stone-800">
                              <ReactMarkdown
                                components={{
                                  h1: ({ node, ...props }) => (
                                    <h2 className="text-sm font-semibold text-stone-900" {...props} />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h3 className="text-sm font-semibold text-stone-900" {...props} />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p className="mb-1.5 leading-relaxed" {...props} />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul className="list-disc pl-4 mb-1.5 space-y-0.5" {...props} />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="leading-relaxed" {...props} />
                                  ),
                                  hr: () => (
                                    <hr className="my-2 border-dashed border-stone-300" />
                                  ),
                                  strong: ({ node, ...props }) => (
                                    <strong className="font-semibold text-stone-900" {...props} />
                                  ),
                                }}
                              >
                                {tip.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* 右栏：AI 对话 + 解卦 Tips；点击左侧爻位后在此栏显示详情 */}
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div className="flex-1 min-h-0 flex flex-col rounded-lg border border-stone-200 bg-stone-50 overflow-hidden">
                  {tooltip ? (
                    <>
                    <div className="px-3 py-2 border-b border-stone-200 bg-stone-100 text-sm font-medium text-stone-600 flex items-center justify-between gap-2">
                      <span>爻位详情（点击右上角关闭）</span>
                      <button
                        type="button"
                        onClick={hideTooltip}
                        className="text-xs px-2 py-1 rounded border border-stone-300 bg-white text-stone-500 hover:bg-stone-100"
                      >
                        关闭
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 p-3 overflow-auto">
                      <div className="p-2 text-sm text-stone-700 whitespace-pre-line">{tooltip}</div>
                    </div>
                    </>
                  ) : (
                    <>
                      <div className="px-3 py-2 border-b border-stone-200 bg-stone-100 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-stone-600">AI 分析</span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-sm text-stone-600">
                            <span className="shrink-0">模型</span>
                            <select
                              value={availableModels.length ? selectedModelId : ''}
                              onChange={(e) => setSelectedModelId(e.target.value)}
                              className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              {availableModels.length === 0 ? (
                                <option value="">未配置 API</option>
                              ) : (
                                availableModels.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.name}{opt.description ? `（${opt.description}）` : ''}
                                  </option>
                                ))
                              )}
                            </select>
                          </label>
                          <button
                            type="button"
                            onClick={() => void runInterpretation()}
                            disabled={
                              analysisLoading || !isFirstAnalysisRound(chatMessages) || availableModels.length === 0
                            }
                            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                          >
                            解卦
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <div
                          ref={chatScrollContainerRef}
                          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 space-y-3"
                        >
                          {chatMessages.map((msg, i) => (
                            <div
                              key={i}
                              className={
                                msg.role === 'user'
                                  ? 'flex justify-end'
                                  : 'flex justify-start'
                              }
                            >
                              <div
                                className={
                                  msg.role === 'user'
                                    ? 'max-w-[85%] rounded-lg bg-amber-100 px-3 py-2 text-sm text-stone-800'
                                    : 'max-w-[85%] rounded-lg bg-stone-200 px-3 py-2 text-sm text-stone-700'
                                }
                              >
                                {msg.role === 'assistant' ? (
                                  (() => {
                                    const layers = parseAnalysisLayers(msg.content);
                                    if (layers && layers.length > 0) {
                                      return (
                                        <div className="space-y-3">
                                          {layers.map((layer, j) => (
                                            <div key={j} className="border-l-2 border-amber-500 pl-2">
                                              <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 mb-1">
                                                {LAYER_DISPLAY_LABELS[layer.title]}
                                              </span>
                                              <div className="text-stone-700 whitespace-pre-line text-sm">
                                                {layer.content}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return <span className="whitespace-pre-line">{msg.content}</span>;
                                  })()
                                ) : (
                                  <span className="whitespace-pre-line">{msg.content}</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {streamingState && (
                            <div className="flex justify-start">
                              <div className="max-w-[85%] w-full rounded-lg bg-stone-200 px-3 py-2 text-sm text-stone-700 space-y-3">
                                {streamingState.layers.map((layer, j) => (
                                  <div key={j} className="border-l-2 border-amber-500 pl-2">
                                    <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 mb-1">
                                      {layer.displayLabel}
                                    </span>
                                    <div className="text-stone-700 whitespace-pre-line">
                                      {layer.content}
                                    </div>
                                  </div>
                                ))}
                                {(streamingState.streamingTag || streamingState.streamingContent) && (
                                  <div className="border-l-2 border-amber-500 pl-2">
                                    <span className="inline-block rounded bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 mb-1">
                                      {streamingState.streamingLabel || '…'}
                                    </span>
                                    <span className="text-stone-700 whitespace-pre-line">
                                      {streamingState.streamingContent}
                                      <span className="animate-pulse">▌</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {analysisLoading && !streamingState && (
                            <div className="flex justify-start">
                              <div className="max-w-[85%] rounded-lg bg-stone-200 px-3 py-2 text-sm text-stone-500">
                                分析中…
                              </div>
                            </div>
                          )}
                          <div ref={chatScrollBottomRef} className="h-0 shrink-0" aria-hidden />
                        </div>
                        <div className="p-3 border-t border-stone-200 flex flex-col gap-2 shrink-0">
                          <p className="text-xs text-stone-500">
                            {isFirstAnalysisRound(chatMessages)
                              ? '请先点击「解卦」获取分析，再在下方补充细节追问。'
                              : '可补充事件细节（时间、人物、前因后果等），对应卦象后将修正结论与建议。'}
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                              placeholder={
                                isFirstAnalysisRound(chatMessages)
                                  ? '请先点击解卦'
                                  : '补充细节，追问…'
                              }
                              disabled={isFirstAnalysisRound(chatMessages)}
                              className="flex-1 min-w-0 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-stone-100 disabled:text-stone-400"
                            />
                            <button
                              type="button"
                              onClick={() => void sendChat()}
                              disabled={
                                !chatInput.trim() ||
                                analysisLoading ||
                                isFirstAnalysisRound(chatMessages)
                              }
                              className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                            >
                              {analysisLoading ? '追问中…' : '追问'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;

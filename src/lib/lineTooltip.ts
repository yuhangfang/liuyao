import type { Branch } from '../types';
import type { AnalysisResult, LineInfo } from '../types';
import { BRANCH_NAMES, BRANCH_ELEMENTS, LIU_HE, LIU_CHONG, SAN_XING, getMuKu, isMuKuBranch } from '../data/branches';

const YAO_POS_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

/** 地支顺序：子丑寅卯辰巳午未申酉戌亥，用于化进化退 */
const BRANCH_ORDER: Branch[] = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'];

/** 五行生：生谁 */
const WUXING_SHENG: Record<string, string> = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' };
/** 五行克：克谁 */
const WUXING_KE: Record<string, string> = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };

/** 十二长生阶段名称 */
const CHANG_SHENG_STAGES = [
  '长生',
  '沐浴',
  '冠带',
  '临官',
  '帝旺',
  '衰',
  '病',
  '死',
  '墓',
  '绝',
  '胎',
  '养',
] as const;

type ChangShengStage = (typeof CHANG_SHENG_STAGES)[number];

/**
 * 各五行的十二长生顺序（按地支），
 * 以该五行为用神/基准时，在不同地支所属的长生位。
 *
 * 参考传统：水长生在申、木长生在亥、火长生在寅、金长生在巳。
 * 土在实占中分戊、己两套，这里简化随火行一例。
 */
const WUXING_CHANG_SHENG: Record<string, Branch[]> = {
  水: ['shen', 'you', 'xu', 'hai', 'zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei'],
  木: ['hai', 'zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu'],
  火: ['yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai', 'zi', 'chou'],
  金: ['si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai', 'zi', 'chou', 'yin', 'mao', 'chen'],
  土: ['yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai', 'zi', 'chou'],
};

function getChangShengStage(element: string, branch: Branch): ChangShengStage | null {
  const seq = WUXING_CHANG_SHENG[element];
  if (!seq) return null;
  const idx = seq.indexOf(branch);
  if (idx === -1) return null;
  return CHANG_SHENG_STAGES[idx] ?? null;
}

/**
 * 干支五行影响标注：
 * 「我生者休，克我者囚，我克者死，生我者相，同我者旺」
 * selfEl 为本爻五行，otherEl 为日/月/他爻五行
 */
function getGanZhiInfluenceLabel(selfEl: string, otherEl: string): string {
  if (selfEl === otherEl) return '旺';
  if (WUXING_SHENG[selfEl] === otherEl) return '休';
  if (WUXING_KE[otherEl] === selfEl) return '囚';
  if (WUXING_KE[selfEl] === otherEl) return '死';
  if (WUXING_SHENG[otherEl] === selfEl) return '相';
  return '平';
}

/** 干支作用：日建/月建标签 + 紧接其后的本爻解释（墓库冲合刑空） */
function dayMonthEffectsWithExplanations(
  main: LineInfo,
  dayBranch: Branch,
  monthBranch: Branch,
  riKongBranches: [Branch, Branch]
): string[] {
  const branch = main.branch;
  const bn = main.branchName;
  const el = main.fiveElement;
  const dayHe = LIU_HE.some(([a, b]) => (a === dayBranch && b === branch) || (a === branch && b === dayBranch));
  const monthHe = LIU_HE.some(([a, b]) => (a === monthBranch && b === branch) || (a === branch && b === monthBranch));
  const dayChong = LIU_CHONG.some(([a, b]) => (a === dayBranch && b === branch) || (a === branch && b === dayBranch));
  const monthChong = LIU_CHONG.some(([a, b]) => (a === monthBranch && b === branch) || (a === branch && b === monthBranch));
  const dayXing = SAN_XING.some((arr) => arr.includes(dayBranch) && arr.includes(branch));
  const monthXing = SAN_XING.some((arr) => arr.includes(monthBranch) && arr.includes(branch));
  const dayMu = getMuKu(branch) === dayBranch;
  const monthMu = getMuKu(branch) === monthBranch;
  const kong = riKongBranches.includes(branch);
  const ku = isMuKuBranch(branch);

  const daySheng = WUXING_SHENG[BRANCH_ELEMENTS[dayBranch]] === el;
  const dayKe = WUXING_KE[BRANCH_ELEMENTS[dayBranch]] === el;
  const benShengDay = WUXING_SHENG[el] === BRANCH_ELEMENTS[dayBranch];
  const benKeDay = WUXING_KE[el] === BRANCH_ELEMENTS[dayBranch];
  const monthSheng = WUXING_SHENG[BRANCH_ELEMENTS[monthBranch]] === el;
  const monthKe = WUXING_KE[BRANCH_ELEMENTS[monthBranch]] === el;
  const benShengMonth = WUXING_SHENG[el] === BRANCH_ELEMENTS[monthBranch];
  const benKeMonth = WUXING_KE[el] === BRANCH_ELEMENTS[monthBranch];

  const dayParts: string[] = [];
  const dayEl = BRANCH_ELEMENTS[dayBranch];
  const dayInfluence = getGanZhiInfluenceLabel(el, dayEl);
  let dayRelation = '';
  if (daySheng) dayRelation = '日生我';
  else if (dayKe) dayRelation = '日克我';
  else if (benShengDay) dayRelation = '我生日';
  else if (benKeDay) dayRelation = '我克日';
  else dayRelation = '与日同气';
  dayParts.push(`${dayInfluence}（${dayRelation}）`);
  const dayBr = BRANCH_NAMES[dayBranch];
  const monthBr = BRANCH_NAMES[monthBranch];
  if (kong) dayParts.push('空（暂时无力、事有迟滞）');
  if (ku) dayParts.push(`库（本爻${bn}为库，收藏归库、爻力内藏）`);
  if (dayHe) dayParts.push(`合（${bn}${dayBr}合，合住牵绊或成事）`);
  if (dayChong) dayParts.push(`冲（${bn}${dayBr}冲，冲散或冲动${!main.isMoving ? '；静爻逢日冲可为暗动' : ''}）`);
  if (dayXing) dayParts.push(`刑（${bn}${dayBr}刑，主妨害、刑伤）`);
  if (dayMu) dayParts.push(`入墓（${dayBr}为${el}墓，入墓受制、难发）`);

  const monthParts: string[] = [];
  const monthEl = BRANCH_ELEMENTS[monthBranch];
  const monthInfluence = getGanZhiInfluenceLabel(el, monthEl);
  let monthRelation = '';
  if (monthSheng) monthRelation = '月生我';
  else if (monthKe) monthRelation = '月克我';
  else if (benShengMonth) monthRelation = '我生月';
  else if (benKeMonth) monthRelation = '我克月';
  else monthRelation = '与月同气';
  monthParts.push(`${monthInfluence}（${monthRelation}）`);
  if (monthHe) monthParts.push(`合（${bn}${monthBr}合，合住牵绊或成事）`);
  if (monthChong) monthParts.push(`冲（${bn}${monthBr}冲，冲散或冲动）`);
  if (monthXing) monthParts.push(`刑（${bn}${monthBr}刑，主妨害、刑伤）`);
  if (monthMu) monthParts.push(`入墓（${monthBr}为${el}墓，入墓受制、难发）`);

  const out: string[] = [];
  out.push('日建：' + dayParts.join('，'));
  out.push('月建：' + monthParts.join('，'));
  return out;
}

/** 某爻的旺衰简要（日建/月建/旬空/墓库），供他爻作用中点名该爻旺衰用 */
function getWangShuaiSummary(
  line: LineInfo,
  dayBranch: Branch,
  monthBranch: Branch,
  riKong: [Branch, Branch]
): string {
  const el = line.fiveElement;
  const branch = line.branch;
  const dayEl = BRANCH_ELEMENTS[dayBranch];
  const monthEl = BRANCH_ELEMENTS[monthBranch];
  const kong = riKong.includes(branch);
  const ku = isMuKuBranch(branch);
  const dayMu = getMuKu(branch) === dayBranch;
  const monthMu = getMuKu(branch) === monthBranch;
  const parts: string[] = [];
  const dayInfluence = getGanZhiInfluenceLabel(el, dayEl);
  const monthInfluence = getGanZhiInfluenceLabel(el, monthEl);
  parts.push(`日${dayInfluence}`);
  parts.push(`月${monthInfluence}`);
  if (kong) parts.push('旬空');
  if (ku) parts.push('库');
  if (dayMu) parts.push('日墓');
  if (monthMu) parts.push('月墓');
  return parts.join('、');
}

function otherLinesEffects(
  main: LineInfo,
  lineIndex: number,
  allLines: LineInfo[],
  dayBranch: Branch,
  monthBranch: Branch,
  riKong: [Branch, Branch]
): string[] {
  const el = main.fiveElement;
  const br = main.branch;
  // 以本爻为「用神」视角：先确定对应的原神五行、忌神五行
  const yuanShenEl = Object.keys(WUXING_SHENG).find((k) => WUXING_SHENG[k] === el);
  const jiShenEl = Object.keys(WUXING_KE).find((k) => WUXING_KE[k] === el);
  /** 按爻位收集该爻对本爻的作用（合、冲、生克等），并附带该爻旺衰 */
  const byPosition: string[][] = [];
  for (let i = 0; i < allLines.length; i++) {
    if (i === lineIndex) continue;
    const other = allLines[i]!;
    const oEl = other.fiveElement;
    const oBr = other.branch;
    // 只关注与用神有关的「原神 / 忌神 / 仇神」
    let roleLabel: string | null = null;
    if (yuanShenEl && oEl === yuanShenEl) {
      roleLabel = '【原神】';
    } else if (jiShenEl && oEl === jiShenEl) {
      roleLabel = '【忌神】';
    } else if (
      yuanShenEl &&
      jiShenEl &&
      (WUXING_SHENG[oEl] === jiShenEl || WUXING_KE[oEl] === yuanShenEl)
    ) {
      // 生忌神 / 克原神 → 仇神
      roleLabel = '【仇神】';
    }
    if (!roleLabel) continue;

    const posName = YAO_POS_NAMES[i];
    const movingTag = other.isMoving ? '（动）' : '';
    const wangShuai = getWangShuaiSummary(other, dayBranch, monthBranch, riKong);
    const prefix = `${posName}${other.sixRelationName}${other.branchName}${movingTag}${roleLabel}【${wangShuai}】：`;
    const effects: string[] = [];
    if (LIU_HE.some(([a, b]) => (a === br && b === oBr) || (a === oBr && b === br))) effects.push('合');
    if (LIU_CHONG.some(([a, b]) => (a === br && b === oBr) || (a === oBr && b === br))) effects.push('冲');
    if (WUXING_SHENG[oEl] === el) effects.push('生用神');
    if (WUXING_KE[oEl] === el) effects.push('克用神');
    if (WUXING_SHENG[el] === oEl) effects.push('用神生此爻');
    if (WUXING_KE[el] === oEl) effects.push('用神克此爻');
    if (effects.length) byPosition[i] = [prefix + effects.join('、')];
  }
  // 从上爻到初爻顺序输出，初爻在最后一行
  const out: string[] = [];
  for (let i = 5; i >= 0; i--) {
    if (byPosition[i]) out.push(byPosition[i][0]!);
  }
  return out;
}

/** 动变作用：本爻与变爻旺衰空刑冲合、化进化退、回头生克 */
function movingAndChangeAnalysis(
  main: LineInfo,
  change: LineInfo | undefined,
  dayBranch: Branch,
  monthBranch: Branch,
  riKong: [Branch, Branch]
): string[] {
  if (!main.isMoving || !change) return [];

  const parts: string[] = [];
  const el = main.fiveElement;
  const changeEl = change.fiveElement;
  const changeBr = change.branch;

  parts.push(`变爻 ${change.sixRelationName}${change.stemName}${change.branchName}${change.fiveElement}`);

  // 变爻强弱与空冲合刑墓库：用与本爻相同的详细干支作用，供断卦时判断回头生克/化进化退力度
  const changeGanZhi = dayMonthEffectsWithExplanations(change, dayBranch, monthBranch, riKong);
  if (changeGanZhi.length) {
    parts.push(...changeGanZhi);
  }

  // 化进化退：须同五行，且地支顺推/逆推一位。寅→卯、申→酉、丑→辰、未→戌为化进；反之为化退。
  const mainBr = main.branch;
  const mainIdx = BRANCH_ORDER.indexOf(mainBr);
  const changeIdx = BRANCH_ORDER.indexOf(changeBr);
  const sameWuXing = el === changeEl;
  const shunTui = mainIdx >= 0 && changeIdx >= 0 && changeIdx === (mainIdx + 1) % 12;
  const niTui = mainIdx >= 0 && changeIdx >= 0 && changeIdx === (mainIdx - 1 + 12) % 12;
  const huaJin = sameWuXing && shunTui;
  const huaTui = sameWuXing && niTui;
  if (huaJin) parts.push('化进');
  else if (huaTui) parts.push('化退');

  // 回头生克：变爻对本爻的五行生克。回头生=变爻生本爻，回头克=变爻克本爻。
  const changeShengBen = WUXING_SHENG[changeEl] === el; // 变爻生本爻 → 回头生
  const changeKeBen = WUXING_KE[changeEl] === el;       // 变爻克本爻 → 回头克
  const benKeChange = WUXING_KE[el] === changeEl;       // 本爻克变爻
  const benShengChange = WUXING_SHENG[el] === changeEl; // 本爻生变爻
  if (changeShengBen) parts.push('回头生');
  else if (changeKeBen) parts.push('回头克');
  else if (benKeChange) parts.push('本爻克变爻');
  else if (benShengChange) parts.push('本爻生变爻');
  else if (!huaJin && !huaTui) parts.push('变爻与本爻无生克');

  return parts;
}

/** 生成某一爻的 hover 提示文案 */
export function getLineTooltip(result: AnalysisResult, lineIndex: number): string {
  const main = result.mainHexagram.lines[lineIndex];
  const change = result.changeHexagram?.lines[lineIndex];
  const { dayBranch, monthBranch, riKongBranches } = result;
  const parts: string[] = [];

  const posName = YAO_POS_NAMES[lineIndex];
  parts.push(`【${posName} ${main.sixRelationName}${main.stemName}${main.branchName}${main.fiveElement}】`);
  if (main.isDarkMoving) parts.push('暗动');
  if (riKongBranches.includes(main.branch)) parts.push('旬空');

  const ganZhi = dayMonthEffectsWithExplanations(main, dayBranch, monthBranch, riKongBranches);
  if (ganZhi.length) parts.push('', '干支作用：', ...ganZhi);

  const others = otherLinesEffects(main, lineIndex, result.mainHexagram.lines, dayBranch, monthBranch, riKongBranches);
  if (others.length) parts.push('', '他爻作用：', ...others);

  const movingChange = movingAndChangeAnalysis(main, change, dayBranch, monthBranch, riKongBranches);
  if (movingChange.length) parts.push('', '动变作用：', ...movingChange);

  const dayCs = getChangShengStage(main.fiveElement, dayBranch);
  const monthCs = getChangShengStage(main.fiveElement, monthBranch);
  const changeCs = main.isMoving && change ? getChangShengStage(main.fiveElement, change.branch) : null;
  if (dayCs || monthCs || changeCs) {
    const csLines: string[] = [];
    if (dayCs) csLines.push(`日辰处于「${dayCs}」位`);
    if (monthCs) csLines.push(`月建处于「${monthCs}」位`);
    if (changeCs) csLines.push(`变爻处于「${changeCs}」位`);
    parts.push('', '十二长生（以本爻五行为基准）：', ...csLines);
  }

  if (main.fuShen) {
    const fu = main.fuShen;
    const flyEl = main.fiveElement;
    const fuEl = BRANCH_ELEMENTS[fu.branch];
    const feiShengFu = WUXING_SHENG[flyEl] === fuEl;
    const feiKeFu = WUXING_KE[flyEl] === fuEl;
    const fuShengFei = WUXING_SHENG[fuEl] === flyEl;
    const fuKeFei = WUXING_KE[fuEl] === flyEl;
    let feiFu = '伏神' + fu.sixRelationName + fu.stemName + fu.branchName + BRANCH_ELEMENTS[fu.branch];
    if (feiKeFu) feiFu += '；飞克伏';
    else if (feiShengFu) feiFu += '；飞生伏';
    else if (fuKeFei) feiFu += '；伏克飞';
    else if (fuShengFei) feiFu += '；伏生飞';
    parts.push('', '伏神：', feiFu);
  }

  return parts.join('\n');
}

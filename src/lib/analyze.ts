import type {
  CoinGroup,
  LineResult,
  LineInfo,
  HexagramInfo,
  DivinationState,
  AnalysisResult,
  TrigramKey,
  Branch,
  SixRelation,
  YinYang,
} from '../types';
import {
  TRIGRAM_NAMES,
  TRIGRAM_LINES,
  TRIGRAM_ELEMENTS,
  NAJIA_BRANCHES,
  NAJIA_STEMS,
  STEM_NAMES,
  getPalaceAndHexIndex,
  SHI_POSITIONS,
  getYingPosition,
  getHexagramName,
} from '../data/trigrams';
import { BRANCH_NAMES, BRANCH_ELEMENTS, LIU_HE, LIU_CHONG, SAN_XING, SAN_HE, getMuKu, isMuKuBranch } from '../data/branches';
import { SIX_GOD_NAMES, getSixGodsForLines } from '../data/sixGods';
import { getDayGanzhiBeijing, getFullGanzhiBeijing } from './dateGanzhi';

const SIX_RELATION_NAMES: Record<SixRelation, string> = {
  parents: '父母',
  siblings: '兄弟',
  offspring: '子孙',
  wife_wealth: '妻财',
  official_ghost: '官鬼',
};

// 三爻阴阳 [下,中,上] -> 卦
const LINES_TO_TRIGRAM = new Map<string, TrigramKey>(
  (Object.entries(TRIGRAM_LINES) as [TrigramKey, [0 | 1, 0 | 1, 0 | 1]][]).map(([k, v]) => [
    `${v[0]},${v[1]},${v[2]}`,
    k,
  ])
);

function coinGroupToLineResult(group: CoinGroup): LineResult {
  const flowers = group[0] + group[1] + group[2]; // 花的个数 0~3
  if (flowers === 0) {
    return { lineType: 'lao_yin', yinYang: 'yin', isMoving: true, changeYinYang: 'yang' };
  }
  if (flowers === 1) {
    return { lineType: 'shao_yang', yinYang: 'yang', isMoving: false }; // 一花=一阳二阴=少阳
  }
  if (flowers === 2) {
    return { lineType: 'shao_yin', yinYang: 'yin', isMoving: false };   // 二花=二阳一阴=少阴
  }
  return { lineType: 'lao_yang', yinYang: 'yang', isMoving: true, changeYinYang: 'yin' };
}

function getTrigramFromThreeLines(lines: LineResult[]): TrigramKey {
  const key = lines.map((l) => (l.yinYang === 'yang' ? 1 : 0)).join(',');
  const t = LINES_TO_TRIGRAM.get(key);
  if (!t) throw new Error('Invalid trigram lines');
  return t;
}

/** 五行生克：宫克爻=妻财，爻克宫=官鬼，宫生爻=子孙，爻生宫=父母，同=兄弟 */
function getSixRelation(palaceElement: string, branchElement: string): SixRelation {
  const sheng = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' } as const;
  const ke = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' } as const;
  if (palaceElement === branchElement) return 'siblings';
  if (sheng[palaceElement as keyof typeof sheng] === branchElement) return 'offspring';
  if (sheng[branchElement as keyof typeof sheng] === palaceElement) return 'parents';
  if (ke[palaceElement as keyof typeof ke] === branchElement) return 'wife_wealth';
  if (ke[branchElement as keyof typeof ke] === palaceElement) return 'official_ghost';
  return 'siblings';
}

/** 日建与爻地支：合冲刑墓；爻为四库地支时标「库」 */
function getRelationLabels(dayBranch: Branch, lineBranch: Branch): string[] {
  const labels: string[] = [];
  if (isMuKuBranch(lineBranch)) labels.push('库');
  if (LIU_HE.some(([a, b]) => (a === dayBranch && b === lineBranch) || (a === lineBranch && b === dayBranch))) {
    labels.push('日合');
  }
  if (LIU_CHONG.some(([a, b]) => (a === dayBranch && b === lineBranch) || (a === lineBranch && b === dayBranch))) {
    labels.push('日冲');
  }
  if (SAN_XING.some((arr) => arr.includes(dayBranch) && arr.includes(lineBranch))) {
    labels.push('日刑');
  }
  const mu = getMuKu(lineBranch);
  if (mu === dayBranch) labels.push('日墓');
  return labels;
}

/** 静爻被日建冲为暗动 */
function isDarkMoving(dayBranch: Branch, lineBranch: Branch, isMoving: boolean): boolean {
  if (isMoving) return false;
  return LIU_CHONG.some(([a, b]) => (a === dayBranch && b === lineBranch) || (a === lineBranch && b === dayBranch));
}

export function analyzeDivination(state: DivinationState): AnalysisResult {
  const { dateTime, coinGroups } = state;
  const lineResults: LineResult[] = coinGroups.map(coinGroupToLineResult);

  const lower = getTrigramFromThreeLines(lineResults.slice(0, 3));
  const upper = getTrigramFromThreeLines(lineResults.slice(3, 6));

  const { palace, hexIndex } = getPalaceAndHexIndex(upper, lower);
  const shiPosition = SHI_POSITIONS[hexIndex];
  const yingPosition = getYingPosition(shiPosition);

  const dayGanzhi = getDayGanzhiBeijing(dateTime);
  const { branch: dayBranch, stemIndex } = dayGanzhi;
  const fullGanzhi = getFullGanzhiBeijing(dateTime);
  const { monthBranch, riKongBranches } = fullGanzhi;
  const sixGods = getSixGodsForLines(stemIndex);

  const innerBranches = NAJIA_BRANCHES[lower].inner;
  const outerBranches = NAJIA_BRANCHES[upper].outer;
  const allBranches: Branch[] = [...innerBranches, ...outerBranches];

  const palaceElement = TRIGRAM_ELEMENTS[palace];
  const relations: string[] = [];

  // 三合：日建与卦中两爻成三合局（三支齐全）时标注
  const branchSet = new Set(allBranches);
  for (const trio of SAN_HE) {
    if (!trio.includes(dayBranch)) continue;
    const inHex = trio.filter((b) => branchSet.has(b)).length;
    if (inHex >= 2) {
      const names = trio.map((b) => BRANCH_NAMES[b]).join('');
      relations.push(`三合局（${names}）`);
      break;
    }
  }

  // 预先计算每爻六亲与本宫八纯卦中的伏神位置（按传统：缺该六亲时，从本宫八纯卦「借」作伏神）
  const sixRelationsArray: SixRelation[] = allBranches.map((branch) => {
    const branchElement = BRANCH_ELEMENTS[branch];
    return getSixRelation(palaceElement, branchElement);
  });
  const relationPresent = new Set<SixRelation>(sixRelationsArray);
  const pureInner = NAJIA_BRANCHES[palace].inner;
  const pureOuter = NAJIA_BRANCHES[palace].outer;
  const pureBranches: Branch[] = [...pureInner, ...pureOuter];
  const fuShenByIndex: (LineInfo['fuShen'] | undefined)[] = pureBranches.map((branch, i) => {
    const el = BRANCH_ELEMENTS[branch];
    const rel = getSixRelation(palaceElement, el);
    // 若本卦中已出现该六亲，则不再单独标伏神
    if (relationPresent.has(rel)) return undefined;
    const stemIdx = i < 3 ? NAJIA_STEMS[palace].inner : NAJIA_STEMS[palace].outer;
    const stemName = STEM_NAMES[stemIdx];
    return {
      sixRelationName: SIX_RELATION_NAMES[rel],
      stemName,
      branchName: BRANCH_NAMES[branch],
      branch,
      fiveElement: el,
    };
  });

  const lines: LineInfo[] = lineResults.map((lr, i) => {
    const position = i + 1;
    const branch = allBranches[i];
    const stemIdx = i < 3 ? NAJIA_STEMS[lower].inner : NAJIA_STEMS[upper].outer;
    const stemName = STEM_NAMES[stemIdx];
    const branchElement = BRANCH_ELEMENTS[branch];
    const sixRelation = sixRelationsArray[i];
    const moving = lr.isMoving;
    const darkMoving = isDarkMoving(dayBranch, branch, moving);
    const labels = getRelationLabels(dayBranch, branch);
    if (labels.length) relations.push(`爻${position}(${BRANCH_NAMES[branch]}): ${labels.join('、')}`);

    return {
      position,
      stemName,
      branch,
      branchName: BRANCH_NAMES[branch],
      fiveElement: branchElement,
      sixRelation,
      sixRelationName: SIX_RELATION_NAMES[sixRelation],
      sixGod: sixGods[i],
      sixGodName: SIX_GOD_NAMES[sixGods[i]],
      isMoving: moving,
      isDarkMoving: darkMoving,
      lineType: lr.lineType,
      yinYang: lr.yinYang,
      labels,
      fuShen: fuShenByIndex[i],
    };
  });

  const mainHexagram: HexagramInfo = {
    name: getHexagramName(upper, lower),
    palace,
    palaceName: TRIGRAM_NAMES[palace],
    lines,
    shiPosition,
    yingPosition,
  };

  let changeHexagram: HexagramInfo | null = null;
  const hasMoving = lineResults.some((r) => r.isMoving);
  if (hasMoving) {
    const changeLower = getTrigramFromThreeLines(
      lineResults.slice(0, 3).map((r) => ({
        ...r,
        yinYang: (r.changeYinYang ?? r.yinYang) as YinYang,
      }))
    );
    const changeUpper = getTrigramFromThreeLines(
      lineResults.slice(3, 6).map((r) => ({
        ...r,
        yinYang: (r.changeYinYang ?? r.yinYang) as YinYang,
      }))
    );
    const changeInner = NAJIA_BRANCHES[changeLower].inner;
    const changeOuter = NAJIA_BRANCHES[changeUpper].outer;
    const changeBranches: Branch[] = [...changeInner, ...changeOuter];
    const changeLines: LineInfo[] = changeBranches.map((branch, i) => {
      const position = i + 1;
      const stemIdx = i < 3 ? NAJIA_STEMS[changeLower].inner : NAJIA_STEMS[changeUpper].outer;
      const stemName = STEM_NAMES[stemIdx];
      const mainLine = mainHexagram.lines[i];
      const branchElement = BRANCH_ELEMENTS[branch];
      const sixRelation = getSixRelation(palaceElement, branchElement);
      const changeYY = mainLine.isMoving ? (lineResults[i].changeYinYang ?? mainLine.yinYang) : mainLine.yinYang;
      const changeType: LineInfo['lineType'] = changeYY === 'yin' ? 'shao_yin' : 'shao_yang';
      return {
        position,
        stemName,
        branch,
        branchName: BRANCH_NAMES[branch],
        fiveElement: branchElement,
        sixRelation,
        sixRelationName: SIX_RELATION_NAMES[sixRelation],
        sixGod: sixGods[i],
        sixGodName: SIX_GOD_NAMES[sixGods[i]],
        isMoving: false,
        isDarkMoving: false,
        lineType: changeType,
        yinYang: changeYY,
        labels: [],
      };
    });
    changeHexagram = {
      name: getHexagramName(changeUpper, changeLower),
      palace,
      palaceName: TRIGRAM_NAMES[palace],
      lines: changeLines,
      shiPosition,
      yingPosition,
    };
  }

  const movingCount = lineResults.filter((r) => r.isMoving).length;
  const movingDesc =
    movingCount === 0
      ? '静卦'
      : `${movingCount}爻动`;
  const conclusion =
    `${mainHexagram.name}` +
    (changeHexagram ? ` 之 ${changeHexagram.name}` : '') +
    `，${movingDesc}。` +
    `世在${shiPosition}爻、应在${yingPosition}爻，日建${BRANCH_NAMES[dayBranch]}。` +
    '结合用神、动爻与日建生克合冲断吉凶。';

  return {
    mainHexagram,
    changeHexagram,
    dayBranch,
    dayBranchName: BRANCH_NAMES[dayBranch],
    monthBranch,
    riKongBranches,
    relations,
    conclusion,
  };
}

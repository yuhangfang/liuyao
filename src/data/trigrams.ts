import type { TrigramKey, Branch } from '../types';

// 八卦名称
export const TRIGRAM_NAMES: Record<TrigramKey, string> = {
  qian: '乾',
  dui: '兑',
  li: '离',
  zhen: '震',
  xun: '巽',
  kan: '坎',
  gen: '艮',
  kun: '坤',
};

// 八卦五行（卦宫）
export const TRIGRAM_ELEMENTS: Record<TrigramKey, string> = {
  qian: '金',
  dui: '金',
  li: '火',
  zhen: '木',
  xun: '木',
  kan: '水',
  gen: '土',
  kun: '土',
};

// 三爻卦的阴阳：1=阳 0=阴，从下往上（初爻、二爻、三爻）
// 震仰盂 初阳二阴三阴；艮覆碗 初阴二阴三阳；巽下断 初阴二阳三阳
export const TRIGRAM_LINES: Record<TrigramKey, [0 | 1, 0 | 1, 0 | 1]> = {
  qian: [1, 1, 1],
  dui: [1, 1, 0],
  li: [1, 0, 1],
  zhen: [1, 0, 0], // 震 一阳在两阴下
  xun: [0, 1, 1],  // 巽 一阴在两阳下
  kan: [0, 1, 0],
  gen: [0, 0, 1],  // 艮 一阳在两阴上
  kun: [0, 0, 0],
};

// 天干名（0=甲 … 9=癸），用于纳甲显示
export const STEM_NAMES = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 京房纳甲天干：乾内甲外壬、坤内乙外癸，其余卦内外同干（震庚、坎戊、艮丙、巽辛、离己、兑丁）
export const NAJIA_STEMS: Record<TrigramKey, { inner: number; outer: number }> = {
  qian: { inner: 0, outer: 8 }, // 甲、壬
  kun: { inner: 1, outer: 9 },  // 乙、癸
  zhen: { inner: 6, outer: 6 }, // 庚
  kan: { inner: 4, outer: 4 },  // 戊
  gen: { inner: 2, outer: 2 },   // 丙
  xun: { inner: 7, outer: 7 },   // 辛
  li: { inner: 5, outer: 5 },    // 己
  dui: { inner: 3, outer: 3 },    // 丁
};

// 京房纳甲：每个卦的内卦(下卦)和外卦(上卦)三爻的地支
// 阳卦顺行：子寅辰(内) 午申戌(外) — 乾震
// 坎：寅辰午 申戌子
// 艮：辰午申 戌子寅
// 阴卦逆行：未巳卯(内) 丑亥酉(外) — 坤
// 巽：丑亥酉 未巳卯
// 离：卯丑亥 酉未巳
// 兑：巳卯丑 亥酉未
export const NAJIA_BRANCHES: Record<TrigramKey, { inner: Branch[]; outer: Branch[] }> = {
  qian: { inner: ['zi', 'yin', 'chen'], outer: ['wu', 'shen', 'xu'] },
  zhen: { inner: ['zi', 'yin', 'chen'], outer: ['wu', 'shen', 'xu'] },
  kan: { inner: ['yin', 'chen', 'wu'], outer: ['shen', 'xu', 'zi'] },
  gen: { inner: ['chen', 'wu', 'shen'], outer: ['xu', 'zi', 'yin'] },
  kun: { inner: ['wei', 'si', 'mao'], outer: ['chou', 'hai', 'you'] },
  xun: { inner: ['chou', 'hai', 'you'], outer: ['wei', 'si', 'mao'] },
  li: { inner: ['mao', 'chou', 'hai'], outer: ['you', 'wei', 'si'] },
  dui: { inner: ['si', 'mao', 'chou'], outer: ['hai', 'you', 'wei'] },
};

// 八宫卦序：每宫8卦，用于定世应
// 乾宫：乾姤遁否观剥晋大有
const QIAN_PALACE: TrigramKey[] = ['qian', 'xun', 'gen', 'kun', 'zhen', 'kan', 'li', 'dui'];
const DUI_PALACE: TrigramKey[] = ['dui', 'kun', 'zhen', 'kan', 'li', 'gen', 'xun', 'qian'];
const LI_PALACE: TrigramKey[] = ['li', 'gen', 'xun', 'qian', 'dui', 'kun', 'zhen', 'kan'];
const ZHEN_PALACE: TrigramKey[] = ['zhen', 'kan', 'li', 'gen', 'xun', 'qian', 'dui', 'kun'];
const XUN_PALACE: TrigramKey[] = ['xun', 'qian', 'dui', 'kun', 'zhen', 'kan', 'li', 'gen'];
const KAN_PALACE: TrigramKey[] = ['kan', 'li', 'gen', 'xun', 'qian', 'dui', 'kun', 'zhen'];
const GEN_PALACE: TrigramKey[] = ['gen', 'xun', 'qian', 'dui', 'kun', 'zhen', 'kan', 'li'];
const KUN_PALACE: TrigramKey[] = ['kun', 'zhen', 'kan', 'li', 'gen', 'xun', 'qian', 'dui'];

export const EIGHT_PALACES: Record<TrigramKey, TrigramKey[]> = {
  qian: QIAN_PALACE,
  dui: DUI_PALACE,
  li: LI_PALACE,
  zhen: ZHEN_PALACE,
  xun: XUN_PALACE,
  kan: KAN_PALACE,
  gen: GEN_PALACE,
  kun: KUN_PALACE,
};

// 六十四卦 (上卦,下卦) -> 卦宫与宫序（京房八宫，用于定世应与六亲）
// 同一卦象只归入一宫；如 颐(gen,zhen) 归震宫归魂、蛊(gen,xun) 归巽宫归魂
export type PalaceHexIndex = { palace: TrigramKey; hexIndex: number };

const HEXAGRAM_PALACE_INDEX_ENTRIES: [string, PalaceHexIndex][] = [
  // 乾宫：乾姤遁否观剥晋大有
  ['qian,qian', { palace: 'qian', hexIndex: 0 }],
  ['qian,xun', { palace: 'qian', hexIndex: 1 }],
  ['qian,gen', { palace: 'qian', hexIndex: 2 }],
  ['qian,kun', { palace: 'qian', hexIndex: 3 }],
  ['xun,kun', { palace: 'qian', hexIndex: 4 }],
  ['gen,kun', { palace: 'qian', hexIndex: 5 }],
  ['li,kun', { palace: 'qian', hexIndex: 6 }],
  ['li,qian', { palace: 'qian', hexIndex: 7 }],
  // 兑宫
  ['dui,dui', { palace: 'dui', hexIndex: 0 }],
  ['dui,kan', { palace: 'dui', hexIndex: 1 }],
  ['dui,kun', { palace: 'dui', hexIndex: 2 }],
  ['dui,gen', { palace: 'dui', hexIndex: 3 }],
  ['kan,gen', { palace: 'dui', hexIndex: 4 }],
  ['kun,gen', { palace: 'dui', hexIndex: 5 }],
  ['zhen,gen', { palace: 'dui', hexIndex: 6 }],
  ['zhen,dui', { palace: 'dui', hexIndex: 7 }],
  // 离宫
  ['li,li', { palace: 'li', hexIndex: 0 }],
  ['li,gen', { palace: 'li', hexIndex: 1 }],
  ['li,xun', { palace: 'li', hexIndex: 2 }],
  ['li,kan', { palace: 'li', hexIndex: 3 }],
  ['gen,kan', { palace: 'li', hexIndex: 4 }],
  ['xun,kan', { palace: 'li', hexIndex: 5 }],
  ['qian,kan', { palace: 'li', hexIndex: 6 }],
  ['qian,li', { palace: 'li', hexIndex: 7 }],
  // 震宫：游魂大过、归魂颐
  ['zhen,zhen', { palace: 'zhen', hexIndex: 0 }],
  ['zhen,kun', { palace: 'zhen', hexIndex: 1 }],
  ['zhen,kan', { palace: 'zhen', hexIndex: 2 }],
  ['zhen,xun', { palace: 'zhen', hexIndex: 3 }],
  ['kun,xun', { palace: 'zhen', hexIndex: 4 }],
  ['kan,xun', { palace: 'zhen', hexIndex: 5 }],
  ['dui,xun', { palace: 'zhen', hexIndex: 6 }],
  ['gen,zhen', { palace: 'zhen', hexIndex: 7 }],
  // 巽宫：归魂蛊（颐已归震宫）
  ['xun,xun', { palace: 'xun', hexIndex: 0 }],
  ['xun,qian', { palace: 'xun', hexIndex: 1 }],
  ['xun,li', { palace: 'xun', hexIndex: 2 }],
  ['xun,zhen', { palace: 'xun', hexIndex: 3 }],
  ['qian,zhen', { palace: 'xun', hexIndex: 4 }],
  ['li,zhen', { palace: 'xun', hexIndex: 5 }],
  ['gen,xun', { palace: 'xun', hexIndex: 7 }],
  // 坎宫
  ['kan,kan', { palace: 'kan', hexIndex: 0 }],
  ['kan,dui', { palace: 'kan', hexIndex: 1 }],
  ['kan,zhen', { palace: 'kan', hexIndex: 2 }],
  ['kan,li', { palace: 'kan', hexIndex: 3 }],
  ['dui,li', { palace: 'kan', hexIndex: 4 }],
  ['zhen,li', { palace: 'kan', hexIndex: 5 }],
  ['kun,li', { palace: 'kan', hexIndex: 6 }],
  ['kun,kan', { palace: 'kan', hexIndex: 7 }],
  // 艮宫：四世睽、游魂中孚、归魂渐
  ['gen,gen', { palace: 'gen', hexIndex: 0 }],
  ['gen,li', { palace: 'gen', hexIndex: 1 }],
  ['gen,qian', { palace: 'gen', hexIndex: 2 }],
  ['gen,dui', { palace: 'gen', hexIndex: 3 }],
  ['li,dui', { palace: 'gen', hexIndex: 4 }],
  ['qian,dui', { palace: 'gen', hexIndex: 5 }],
  ['xun,dui', { palace: 'gen', hexIndex: 6 }],
  ['xun,gen', { palace: 'gen', hexIndex: 7 }],
  // 坤宫
  ['kun,kun', { palace: 'kun', hexIndex: 0 }],
  ['kun,zhen', { palace: 'kun', hexIndex: 1 }],
  ['kun,dui', { palace: 'kun', hexIndex: 2 }],
  ['kun,qian', { palace: 'kun', hexIndex: 3 }],
  ['zhen,qian', { palace: 'kun', hexIndex: 4 }],
  ['dui,qian', { palace: 'kun', hexIndex: 5 }],
  ['kan,qian', { palace: 'kun', hexIndex: 6 }],
  ['kan,kun', { palace: 'kun', hexIndex: 7 }],
];

const HEXAGRAM_PALACE_INDEX = Object.fromEntries(HEXAGRAM_PALACE_INDEX_ENTRIES) as Record<string, PalaceHexIndex>;

/** 由上下卦得卦宫与宫序（0~7），用于世应、六亲 */
export function getPalaceAndHexIndex(upper: TrigramKey, lower: TrigramKey): PalaceHexIndex {
  const key = `${upper},${lower}`;
  const entry = HEXAGRAM_PALACE_INDEX[key];
  if (entry) return entry;
  // 兼容：若未在表中（如巽宫6与震宫7同卦象颐），用旧法：宫=下卦，序=上卦在宫列中的位置
  const palaceList = EIGHT_PALACES[lower];
  const hexIndex = Math.max(0, Math.min(7, palaceList.indexOf(upper)));
  return { palace: lower, hexIndex };
}

// 世爻位置：按八宫卦序，第0卦为本宫卦(八纯)世在六爻，第1卦一世世在初爻...第5卦五世世在五爻，第6卦游魂世在四爻，第7卦归魂世在三爻
export const SHI_POSITIONS: number[] = [6, 1, 2, 3, 4, 5, 4, 3]; // 六世、一世…五世、游魂四爻、归魂三爻
// 应爻与世爻隔三位：初与四、二与五、三与六对应，即 世1应4、世2应5、世3应6、世4应1、世5应2、世6应3
export function getYingPosition(shiPos: number): number {
  const s = Math.floor(Number(shiPos));
  if (!Number.isFinite(s) || s < 1 || s > 6) return 1;
  return ((s - 1 + 3) % 6) + 1;
}

// 六十四卦：上卦+下卦 -> 卦名（常用名）
const HEXAGRAM_NAMES: Record<string, string> = {
  'qian,qian': '乾为天',
  'qian,dui': '天泽履',
  'qian,li': '天火同人',
  'qian,zhen': '天雷无妄',
  'qian,xun': '天风姤',
  'qian,kan': '天水讼',
  'qian,gen': '天山遁',
  'qian,kun': '天地否',
  'dui,qian': '泽天夬',
  'dui,dui': '兑为泽',
  'dui,li': '泽火革',
  'dui,zhen': '泽雷随',
  'dui,xun': '泽风大过',
  'dui,kan': '泽水困',
  'dui,gen': '泽山咸',
  'dui,kun': '泽地萃',
  'li,qian': '火天大有',
  'li,dui': '火泽睽',
  'li,li': '离为火',
  'li,zhen': '火雷噬嗑',
  'li,xun': '火风鼎',
  'li,kan': '火水未济',
  'li,gen': '火山旅',
  'li,kun': '火地晋',
  'zhen,qian': '雷天大壮',
  'zhen,dui': '雷泽归妹',
  'zhen,li': '雷火丰',
  'zhen,zhen': '震为雷',
  'zhen,xun': '雷风恒',
  'zhen,kan': '雷水解',
  'zhen,gen': '雷山小过',
  'zhen,kun': '雷地豫',
  'xun,qian': '风天小畜',
  'xun,dui': '风泽中孚',
  'xun,li': '风火家人',
  'xun,zhen': '风雷益',
  'xun,xun': '巽为风',
  'xun,kan': '风水涣',
  'xun,gen': '风山渐',
  'xun,kun': '风地观',
  'kan,qian': '水天需',
  'kan,dui': '水泽节',
  'kan,li': '水火既济',
  'kan,zhen': '水雷屯',
  'kan,xun': '水风井',
  'kan,kan': '坎为水',
  'kan,gen': '水山蹇',
  'kan,kun': '水地比',
  'gen,qian': '山天大畜',
  'gen,dui': '山泽损',
  'gen,li': '山火贲',
  'gen,zhen': '山雷颐',
  'gen,xun': '山风蛊',
  'gen,kan': '山水蒙',
  'gen,gen': '艮为山',
  'gen,kun': '山地剥',
  'kun,qian': '地天泰',
  'kun,dui': '地泽临',
  'kun,li': '地火明夷',
  'kun,zhen': '地雷复',
  'kun,xun': '地风升',
  'kun,kan': '地水师',
  'kun,gen': '地山谦',
  'kun,kun': '坤为地',
};

export function getHexagramName(upper: TrigramKey, lower: TrigramKey): string {
  return HEXAGRAM_NAMES[`${upper},${lower}`] ?? `${TRIGRAM_NAMES[upper]}${TRIGRAM_NAMES[lower]}卦`;
}

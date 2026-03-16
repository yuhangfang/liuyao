// 0=字, 1=花. 每组3枚硬币
export type CoinFace = 0 | 1;
export type CoinGroup = [CoinFace, CoinFace, CoinFace];

// 爻类型：由每组「花」的个数决定
export type LineType = 'lao_yin' | 'shao_yang' | 'shao_yin' | 'lao_yang';

// 阴阳
export type YinYang = 'yin' | 'yang';

// 八卦
export type TrigramKey = 'qian' | 'dui' | 'li' | 'zhen' | 'xun' | 'kan' | 'gen' | 'kun';

// 地支
export type Branch =
  | 'zi' | 'chou' | 'yin' | 'mao' | 'chen' | 'si' | 'wu' | 'wei'
  | 'shen' | 'you' | 'xu' | 'hai';

// 六亲
export type SixRelation = 'parents' | 'siblings' | 'offspring' | 'wife_wealth' | 'official_ghost';

// 六神
export type SixGod =
  | 'qinglong' | 'zhuque' | 'gouchen' | 'tengshe' | 'baihu' | 'xuanwu';

export interface LineResult {
  lineType: LineType;
  yinYang: YinYang;
  isMoving: boolean;
  /** 变爻后的阴阳（仅动爻有） */
  changeYinYang?: YinYang;
}

export interface LineInfo {
  position: number; // 1-6 初爻到上爻
  /** 纳甲天干名，如 癸 */
  stemName: string;
  branch: Branch;
  branchName: string;
  fiveElement: string;
  sixRelation: SixRelation;
  sixRelationName: string;
  sixGod: SixGod;
  sixGodName: string;
  isMoving: boolean;
  isDarkMoving: boolean;
  lineType: LineType;
  yinYang: YinYang;
  /** 生克、合冲刑、墓库等标注 */
  labels: string[];
  /** 伏神（本宫卦该爻位，用于 hover 提示） */
  fuShen?: {
    sixRelationName: string;
    stemName: string;
    branchName: string;
    branch: Branch;
    fiveElement: string;
  };
}

export interface HexagramInfo {
  name: string;
  palace: TrigramKey;
  palaceName: string;
  lines: LineInfo[];
  /** 世爻位置 1-6 */
  shiPosition: number;
  /** 应爻位置 1-6 */
  yingPosition: number;
}

export interface DivinationState {
  dateTime: string;
  question: string;
  coinGroups: [CoinGroup, CoinGroup, CoinGroup, CoinGroup, CoinGroup, CoinGroup];
}

export interface AnalysisResult {
  mainHexagram: HexagramInfo;
  changeHexagram: HexagramInfo | null;
  /** 日建地支（用于暗动等） */
  dayBranch: Branch;
  dayBranchName: string;
  /** 月建地支（用于爻作用提示） */
  monthBranch: Branch;
  /** 旬空两支（用于爻作用提示） */
  riKongBranches: [Branch, Branch];
  /** 合、冲、刑、墓等关系描述 */
  relations: string[];
  conclusion: string;
}

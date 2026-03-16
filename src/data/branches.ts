import type { Branch } from '../types';

export const BRANCH_NAMES: Record<Branch, string> = {
  zi: '子', chou: '丑', yin: '寅', mao: '卯', chen: '辰', si: '巳',
  wu: '午', wei: '未', shen: '申', you: '酉', xu: '戌', hai: '亥',
};

// 地支五行
export const BRANCH_ELEMENTS: Record<Branch, string> = {
  zi: '水', chou: '土', yin: '木', mao: '木', chen: '土', si: '火',
  wu: '火', wei: '土', shen: '金', you: '金', xu: '土', hai: '水',
};

// 六合
export const LIU_HE: [Branch, Branch][] = [
  ['zi', 'chou'], ['yin', 'hai'], ['mao', 'xu'], ['chen', 'you'],
  ['si', 'shen'], ['wu', 'wei'],
];

// 六冲
export const LIU_CHONG: [Branch, Branch][] = [
  ['zi', 'wu'], ['chou', 'wei'], ['yin', 'shen'], ['mao', 'you'],
  ['chen', 'xu'], ['si', 'hai'],
];

// 三刑（简化：无恩之刑、恃势之刑、无礼之刑）
export const SAN_XING: Branch[][] = [
  ['yin', 'si', 'shen'],
  ['chou', 'xu', 'wei'],
  ['zi', 'mao'],
];

// 三合局：申子辰水局、寅午戌火局、亥卯未木局、巳酉丑金局
export const SAN_HE: Branch[][] = [
  ['shen', 'zi', 'chen'],
  ['yin', 'wu', 'xu'],
  ['hai', 'mao', 'wei'],
  ['si', 'you', 'chou'],
];

// 墓库：辰戌丑未为四库，地支入墓关系（子水墓辰等）
export const MU_KU: Branch[] = ['chen', 'xu', 'chou', 'wei'];
export const MU_KU_NAMES: Partial<Record<Branch, string>> = {
  chen: '辰', xu: '戌', chou: '丑', wei: '未',
};

// 地支入墓（五行墓）
const SHUI_MU: Branch = 'chen';
const HUO_MU: Branch = 'xu';
const MU_MU: Branch = 'wei';
const JIN_MU: Branch = 'chou';

export function getMuKu(branch: Branch): Branch | null {
  const el = BRANCH_ELEMENTS[branch];
  if (el === '水') return SHUI_MU;
  if (el === '火') return HUO_MU;
  if (el === '木') return MU_MU;
  if (el === '金') return JIN_MU;
  return null; // 土无墓
}

export function isMuKuBranch(branch: Branch): boolean {
  return MU_KU.includes(branch);
}

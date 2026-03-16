import type { SixGod } from '../types';

export const SIX_GOD_NAMES: Record<SixGod, string> = {
  qinglong: '青龙',
  zhuque: '朱雀',
  gouchen: '勾陈',
  tengshe: '螣蛇',
  baihu: '白虎',
  xuanwu: '玄武',
};

/** 六神取象简释（hover 提示用） */
export const SIX_GOD_DESC: Record<SixGod, string> = {
  qinglong: '青龙：主喜庆、财喜、顺利、酒色。',
  zhuque: '朱雀：主口舌、文书、消息、是非。',
  gouchen: '勾陈：主田宅、勾连、迟滞、官讼。',
  tengshe: '螣蛇：主虚惊、怪异、反复、不安。',
  baihu: '白虎：主凶伤、血光、官非、急躁。',
  xuanwu: '玄武：主暗昧、盗贼、暧昧、阴私。',
};

const GOD_ORDER: SixGod[] = ['qinglong', 'zhuque', 'gouchen', 'tengshe', 'baihu', 'xuanwu'];

// 日干起六神：甲乙青龙，丙丁朱雀，戊勾陈，己螣蛇，庚辛白虎，壬癸玄武。从初爻起顺排。
export function getSixGodStartIndex(dayStemIndex: number): number {
  // 甲0乙1丙2丁3戊4己5庚6辛7壬8癸9
  const map = [0, 0, 1, 1, 2, 3, 4, 4, 5, 5];
  return map[dayStemIndex % 10];
}

export function getSixGodsForLines(dayStemIndex: number): SixGod[] {
  const start = getSixGodStartIndex(dayStemIndex);
  const result: SixGod[] = [];
  for (let i = 0; i < 6; i++) {
    result.push(GOD_ORDER[(start + i) % 6]);
  }
  return result;
}

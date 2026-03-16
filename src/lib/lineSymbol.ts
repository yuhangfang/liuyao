import type { CoinGroup, LineType } from '../types';

/** 爻象符号：少阳 —、少阴 - -、老阳 O、老阴 X */
export function getLineSymbolFromCoinGroup(group: CoinGroup): string {
  const flowers = group[0] + group[1] + group[2];
  if (flowers === 0) return 'X';
  if (flowers === 1) return '—';   // 一花=少阳
  if (flowers === 2) return '- -'; // 二花=少阴
  return 'O';
}

export function getLineSymbolFromLineType(lineType: LineType): string {
  switch (lineType) {
    case 'lao_yin': return 'X';
    case 'shao_yin': return '- -';
    case 'shao_yang': return '—';
    case 'lao_yang': return 'O';
  }
}

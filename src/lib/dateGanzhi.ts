import type { Branch } from '../types';

// 六十甲子序：0=甲子 1=乙丑 ... 59=癸亥
const STEM_NAMES = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCH_NAMES: Record<Branch, string> = {
  zi: '子', chou: '丑', yin: '寅', mao: '卯', chen: '辰', si: '巳',
  wu: '午', wei: '未', shen: '申', you: '酉', xu: '戌', hai: '亥',
};
const BRANCH_LIST: Branch[] = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'];

/** 起卦时间字符串（无时区）按北京时间解析；有时区则直接解析 */
function toDateBeijing(dateInput: string | Date): Date {
  if (typeof dateInput !== 'string') return dateInput;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(dateInput)) return new Date(dateInput + '+08:00');
  return new Date(dateInput);
}

/** 北京时间（东八区）下的年、月、日、时（0–23） */
export function getBeijingCalendar(dateInput: string | Date): { year: number; month: number; day: number; hour: number } {
  const d = toDateBeijing(dateInput);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value, 10);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') };
}

/** 公历某年是否为闰年 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 公历 (year, month, day) 在本年的第几天（1-based） */
function dayOfYear(year: number, month: number, day: number): number {
  const cumul = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const n = cumul[month - 1]! + day;
  return month > 2 && isLeapYear(year) ? n + 1 : n;
}

/**
 * 日干支：公历公式法（不依赖锚点）
 * 参考：用公历推算日柱干支的计算公式（1901–2000 加 15，2001–2100 不加；年尾 00 视为 100）
 * 干支总序数 = 5×(年尾二位数−1) + ⌊(年尾二位数−1)÷4⌋ + 日在本年天数 [+ 15]
 * 干支序数 = 总序数 mod 60，余数 0 为癸亥(60)；序数 1=甲子 … 60=癸亥 → index 0–59
 */
function dayGanzhiFromCalendar(year: number, month: number, day: number): { stemIndex: number; branch: Branch; branchName: string; stemName: string } {
  const yearLast2 = year % 100 || 100; // 00 视为 100
  const term = yearLast2 - 1;
  const dayNum = dayOfYear(year, month, day);
  let total = 5 * term + Math.floor(term / 4) + dayNum;
  if (year >= 1901 && year <= 2000) total += 15;
  let xu = total % 60;
  if (xu === 0) xu = 60;
  const index = xu - 1; // 0=甲子, 59=癸亥
  const stemIndex = index % 10;
  const branchIndex = index % 12;
  const branch = BRANCH_LIST[branchIndex];
  return {
    stemIndex,
    branch,
    branchName: BRANCH_NAMES[branch],
    stemName: STEM_NAMES[stemIndex],
  };
}

/** 从 ISO 日期字符串或 Date 得到日干支（按当地日期）。参考：2000-01-01 = 庚辰日 (六十甲子序 16) */
export function getDayGanzhi(dateInput: string | Date): { stemIndex: number; branch: Branch; branchName: string; stemName: string } {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return dayGanzhiFromCalendar(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** 按北京时间（东八区）取当日日期并算日干支，起卦用 */
export function getDayGanzhiBeijing(dateInput: string | Date): { stemIndex: number; branch: Branch; branchName: string; stemName: string } {
  const d = toDateBeijing(dateInput);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric' });
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10);
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10);
  return dayGanzhiFromCalendar(year, month, day);
}

/** 格式化为某时区的日期时间字符串（起卦时间按北京时间解析） */
export function formatInTimeZone(dateInput: string | Date, timeZone: string, options?: Intl.DateTimeFormatOptions): string {
  const d = toDateBeijing(dateInput);
  return d.toLocaleString('zh-CN', { timeZone, ...options });
}

/** 获取当前/指定时刻的本地时区简称（如 PST、CST）；字符串按北京时间解析 */
export function getLocalTimeZoneName(dateInput?: string | Date): string {
  const d = dateInput == null ? new Date() : toDateBeijing(dateInput);
  const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(d);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
}

/** 六十甲子序 0–59 */
function dayGanzhiIndex(stemIndex: number, branchIndex: number): number {
  return (6 * stemIndex - 5 * branchIndex + 60) % 60;
}

/** 旬空：甲子旬空戌亥、甲戌旬空申酉、甲申旬空午未、甲午旬空辰巳、甲辰旬空寅卯、甲寅旬空子丑 */
const XUN_KONG: [Branch, Branch][] = [
  ['xu', 'hai'],   // 甲子旬
  ['shen', 'you'], // 甲戌旬
  ['wu', 'wei'],   // 甲申旬
  ['chen', 'si'],  // 甲午旬
  ['yin', 'mao'],  // 甲辰旬
  ['zi', 'chou'],  // 甲寅旬
];

/** 完整四柱干支（按北京时间）+ 旬空 + 月建/旬空支（供爻作用分析用） */
export interface FullGanzhi {
  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;
  hourGanZhi: string;
  riKong: string; // 旬空，如 "午未"
  monthBranch: Branch; // 月建地支
  riKongBranches: [Branch, Branch]; // 旬空两支
}

/** 立春约在 2 月 4 日（个别年 2 月 3 或 5 日），立春前属上一年干支 */
function isBeforeLiChun(month: number, day: number): boolean {
  if (month < 2) return true;
  if (month > 2) return false;
  return day < 4;
}

/** 干支年：1900 年立春后为庚子（序 36），以立春为界 */
function getGanZhiYear(year: number, month: number, day: number): number {
  const y = isBeforeLiChun(month, day) ? year - 1 : year;
  return (y - 1900 + 36 + 600) % 60; // 庚子=36
}

/** 月支以节气为界：寅月立春(2/4)、卯月惊蛰(3/5)、…、丑月小寒(1/6)，返回地支序 0–11 */
function getMonthBranchIndex(month: number, day: number): number {
  if (month === 1 && day >= 6) return 1; // 丑 小寒后
  if (month === 1 && day < 6) return 0;  // 子 大雪后
  if (month === 2 && day < 4) return 1;  // 丑 立春前
  if (month === 2 && day >= 4) return 2; // 寅
  if (month === 3 && day < 5) return 2;
  if (month === 3 && day >= 5) return 3; // 卯
  if (month === 4 && day < 5) return 3;
  if (month === 4 && day >= 5) return 4; // 辰
  if (month === 5 && day < 5) return 4;
  if (month === 5 && day >= 5) return 5; // 巳
  if (month === 6 && day < 6) return 5;
  if (month === 6 && day >= 6) return 6; // 午
  if (month === 7 && day < 7) return 6;
  if (month === 7 && day >= 7) return 7; // 未
  if (month === 8 && day < 8) return 7;
  if (month === 8 && day >= 8) return 8; // 申
  if (month === 9 && day < 8) return 8;
  if (month === 9 && day >= 8) return 9; // 酉
  if (month === 10 && day < 8) return 9;
  if (month === 10 && day >= 8) return 10; // 戌
  if (month === 11 && day < 7) return 10;
  if (month === 11 && day >= 7) return 11; // 亥
  if (month === 12 && day < 7) return 11;
  return 0; // 子 12/7 大雪后
}

/** 五虎遁：寅月天干 甲己丙、乙庚戊、丙辛庚、丁壬壬、戊癸甲 */
const YIN_MONTH_STEM: number[] = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]; // 年干 0–9 -> 寅月干

/** 五鼠遁：子时天干 甲己甲、乙庚丙、丙辛戊、丁壬庚、戊癸壬 */
const ZI_HOUR_STEM: number[] = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]; // 日干 0–9 -> 子时干

/** 按北京时间计算 年月日时 干支 与 旬空（年以立春为界，月以节气为界，23 点子时算次日） */
export function getFullGanzhiBeijing(dateInput: string | Date): FullGanzhi {
  const d = toDateBeijing(dateInput);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value, 10);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');

  const useNextDay = hour === 23;
  let dayYear = year;
  let dayMonth = month;
  let dayDay = day;
  if (useNextDay) {
    const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    const nextParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(next);
    dayYear = parseInt(nextParts.find((p) => p.type === 'year')!.value, 10);
    dayMonth = parseInt(nextParts.find((p) => p.type === 'month')!.value, 10);
    dayDay = parseInt(nextParts.find((p) => p.type === 'day')!.value, 10);
  }

  const yearIdx = getGanZhiYear(year, month, day);
  const yearStem = yearIdx % 10;
  const yearBranch = yearIdx % 12;
  const yearGanZhi = `${STEM_NAMES[yearStem]}${BRANCH_NAMES[BRANCH_LIST[yearBranch]]}年`;

  const monthBranchIndex = getMonthBranchIndex(month, day);
  const monthStem = (YIN_MONTH_STEM[yearStem]! + monthBranchIndex - 2 + 10) % 10;
  const monthGanZhi = `${STEM_NAMES[monthStem]}${BRANCH_NAMES[BRANCH_LIST[monthBranchIndex]]}月`;

  const dayGz = dayGanzhiFromCalendar(dayYear, dayMonth, dayDay);
  const dayGanZhi = `${dayGz.stemName}${dayGz.branchName}日`;

  const hourBranchIndex = Math.floor(((hour + 1) % 24) / 2) % 12;
  const hourStem = (ZI_HOUR_STEM[dayGz.stemIndex]! + hourBranchIndex) % 10;
  const hourGanZhi = `${STEM_NAMES[hourStem]}${BRANCH_NAMES[BRANCH_LIST[hourBranchIndex]]}时`;

  const dayIdx = dayGanzhiIndex(dayGz.stemIndex, BRANCH_LIST.indexOf(dayGz.branch));
  const [k1, k2] = XUN_KONG[Math.floor(dayIdx / 10)]!;
  const riKong = `${BRANCH_NAMES[k1]}${BRANCH_NAMES[k2]}`;
  const monthBranch = BRANCH_LIST[monthBranchIndex]!;

  return { yearGanZhi, monthGanZhi, dayGanZhi, hourGanZhi, riKong, monthBranch, riKongBranches: [k1, k2] };
}

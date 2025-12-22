// 식당 휴무일 관리
const holidays2026 = [
  '2026-01-01', // 목
  '2026-01-02', // 금
  '2026-02-16',
  '2026-02-17',
  '2026-02-18', // 월, 화, 수
  '2026-03-01', // 일
  '2026-03-02', // 월
  '2026-05-01', // 금
  '2026-05-04', // 월
  '2026-05-05', // 화
  '2026-05-24', // 일
  '2026-05-25', // 월
  '2026-06-03', // 수
  '2026-07-27',
  '2026-07-28',
  '2026-07-29',
  '2026-07-30',
  '2026-07-31', // 월~금
  '2026-08-15', // 토
  '2026-08-17', // 월
  '2026-09-24',
  '2026-09-25',
  '2026-09-26', // 목, 금, 토
  '2026-10-03', // 토
  '2026-10-05', // 월
  '2026-10-09', // 금
  '2026-12-25', // 금
];

const holidays2025 = [
  '2025-12-25', // 크리스마스
  '2025-12-26', // 금
];

const allHolidays = [...holidays2025, ...holidays2026];

/**
 * 오늘이 식당 휴무일인지 확인
 */
export function isHolidayToday(): boolean {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
  return allHolidays.includes(dateString);
}

/**
 * 특정 날짜가 식당 휴무일인지 확인
 */
export function isHoliday(date: Date): boolean {
  const dateString = date.toISOString().split('T')[0];
  return allHolidays.includes(dateString);
}

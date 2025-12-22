/**
 * 날짜 관련 유틸리티 함수들
 */

/**
 * 주어진 날짜 문자열이 오늘인지 확인
 * @param dateString "MM/DD" 형식 (예: "12/22")
 * @returns 오늘이면 true
 */
export function isToday(dateString: string): boolean {
  const today = new Date();
  const [month, day] = dateString.split('/').map(Number);

  return today.getMonth() + 1 === month && today.getDate() === day;
}

/**
 * 주간메뉴 제목이 이번 주인지 확인
 * @param weekTitle "12/22~12/26 주간메뉴표" 형식
 * @returns 오늘이 범위에 포함되면 true
 */
export function isThisWeek(weekTitle: string): boolean {
  // "12/22~12/26 주간메뉴표"에서 "12/22~12/26" 추출
  const dateRange = weekTitle.split(' ')[0];
  if (!dateRange || !dateRange.includes('~')) {
    return false;
  }

  // 시작일과 종료일 추출
  const [startDateStr, endDateStr] = dateRange.split('~');
  const [startMonth, startDay] = startDateStr.split('/').map(Number);
  const [endMonth, endDay] = endDateStr.split('/').map(Number);

  // 올해 기준으로 Date 객체 생성
  const year = new Date().getFullYear();
  const startDate = new Date(year, startMonth - 1, startDay);
  const endDate = new Date(year, endMonth - 1, endDay);

  // 오늘 날짜 (시간 제거)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 오늘이 시작일~종료일 범위에 포함되는지 확인
  return today >= startDate && today <= endDate;
}

/**
 * 주어진 날짜가 속한 주의 월요일을 반환
 * @param date 기준 날짜
 * @returns 해당 주의 월요일
 */
export function getMondayOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 일요일이면 -6, 그 외는 월요일로 조정
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

/**
 * Date 객체를 "YYYY-MM-DD" 형식 문자열로 변환
 * @param date Date 객체
 * @returns "YYYY-MM-DD" 형식 문자열
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 현재 날짜를 "YYYY-MM-DD" 형식으로 반환
 * @returns 오늘 날짜 문자열
 */
export function getTodayString(): string {
  return formatDate(new Date());
}

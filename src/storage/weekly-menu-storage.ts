import fs from 'fs';
import path from 'path';

const URLS_FILE = path.join(process.cwd(), 'data', 'weekly-menu-urls.json');

export interface WeeklyMenuUrls {
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  uploadedAt: string; // 업로드 시각
  weekTitle?: string; // 주간메뉴 제목 (예: "12/22~12/26 주간메뉴표")
}

/**
 * 주간메뉴 URL 저장
 */
export function saveWeeklyMenuUrls(urls: WeeklyMenuUrls): void {
  try {
    const dataDir = path.dirname(URLS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(URLS_FILE, JSON.stringify(urls, null, 2), 'utf-8');
    console.log('✅ 주간메뉴 URL 저장 완료:', URLS_FILE);
  } catch (error) {
    console.error('❌ 주간메뉴 URL 저장 실패:', error);
  }
}

/**
 * 저장된 주간메뉴 URL 가져오기
 */
export function getWeeklyMenuUrls(): WeeklyMenuUrls | null {
  try {
    if (!fs.existsSync(URLS_FILE)) {
      return null;
    }
    const data = fs.readFileSync(URLS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ 주간메뉴 URL 불러오기 실패:', error);
    return null;
  }
}

/**
 * 오늘 요일의 URL 가져오기
 */
export function getTodayMenuUrl(): string | null {
  const urls = getWeeklyMenuUrls();
  if (!urls) return null;

  const today = new Date().getDay();
  if (today === 0 || today === 6) return null; // 주말

  const dayKeys: (keyof Pick<WeeklyMenuUrls, 'mon' | 'tue' | 'wed' | 'thu' | 'fri'>)[] = [
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
  ];
  const dayKey = dayKeys[today - 1];

  return urls[dayKey] || null;
}

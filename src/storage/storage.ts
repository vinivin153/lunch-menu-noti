import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'last-post.json');

export interface LastPost {
  lastWeeklyMenuTitle?: string; // 주간메뉴표 제목 (예: "12/22~12/26 주간메뉴표")
  lastDailyMenuTitle?: string; // 일일메뉴표 제목 (예: "👩‍🍳12/22(일)")
  lastCroppedSentDate?: string; // 크롭 이미지 마지막 전송일 (예: "2024-12-22")
  timestamp: string;
}

export function getLastPost(): LastPost | null {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return null;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('마지막 포스트 정보 불러오기 실패:', error);
    return null;
  }
}

export function saveLastPost(post: LastPost): void {
  try {
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(post, null, 2), 'utf-8');
    console.log('마지막 포스트 정보 저장 완료');
    if (post.lastWeeklyMenuTitle) {
      console.log('  - 주간메뉴표 제목:', post.lastWeeklyMenuTitle);
    }
    if (post.lastDailyMenuTitle) {
      console.log('  - 일일메뉴표 제목:', post.lastDailyMenuTitle);
    }
    if (post.lastCroppedSentDate) {
      console.log('  - 크롭 이미지 전송일:', post.lastCroppedSentDate);
    }
  } catch (error) {
    console.error('마지막 포스트 정보 저장 실패:', error);
  }
}

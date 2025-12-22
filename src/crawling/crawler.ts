import puppeteer from 'puppeteer';
import { cropAndSaveWeeklyMenu } from '../image/image-processor';
import { uploadAllDays } from '../image/image-uploader';
import { saveWeeklyMenuUrls } from '../storage/weekly-menu-storage';

export interface Post {
  title: string;
  description: string;
  images: string[];
  isPinned?: boolean; // 고정 포스트 여부
  croppedImagePaths?: Record<string, string>; // 요일별 crop된 이미지 경로
}
export interface NewMenus {
  weeklyMenu: Post | null;
  dailyMenu: Post | null;
}
const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_xhxmywn/posts';

/**
 * 새로운 주간메뉴표 가져오기
 * - 고정 포스트만 확인
 * - 저장된 것과 다르면 반환, 같으면 null
 */
async function getNewWeeklyMenu(page: any, savedWeeklyMenu?: string): Promise<Post | null> {
  const weeklyMenu = await page.evaluate((savedTitle: string | undefined) => {
    const wrapWebview = document.querySelector('.wrap_webview');
    if (!wrapWebview) return null;

    // 고정 포스트 카드 직접 찾기
    const areaCards = wrapWebview.querySelectorAll('.area_card');
    const pinnedCard = Array.from(areaCards).find(
      (card) =>
        !card.classList.contains('card_util') &&
        !card.classList.contains('card_profile') &&
        card.querySelector('.icon_pin')
    );

    if (!pinnedCard) return null;

    // 제목 추출
    const titleElement = pinnedCard.querySelector('.tit_card');
    const title = titleElement?.textContent?.trim() || '';

    // 저장된 것과 같으면 null 반환
    if (savedTitle && title === savedTitle) {
      return null;
    }

    // 설명 추출
    const descElement = pinnedCard.querySelector('.desc_card');
    const description = descElement?.innerHTML || '';

    // 이미지 URL 추출
    const images: string[] = [];
    const thumbElements = pinnedCard.querySelectorAll('.wrap_fit_thumb');

    thumbElements.forEach((thumb: any) => {
      const style = thumb.style.backgroundImage;
      const urlMatch = style.match(/url\(["']?(.+?)["']?\)/);
      if (urlMatch && urlMatch[1]) {
        images.push(urlMatch[1]);
      }
    });

    return {
      title,
      description,
      images,
      isPinned: true,
    };
  }, savedWeeklyMenu);

  return weeklyMenu;
}

/**
 * 새로운 일일메뉴 가져오기
 * - 제목에 "주간메뉴표"가 없어야 함
 * - 저장된 것을 만나면 null, 새로운 것이면 반환
 */
async function getNewDailyMenu(page: any, savedDailyMenu?: string): Promise<Post | null> {
  const dailyMenu = await page.evaluate((savedTitle: string | undefined) => {
    const wrapWebview = document.querySelector('.wrap_webview');
    if (!wrapWebview) return null;

    const areaCards = wrapWebview.querySelectorAll('.area_card');

    for (let i = 0; i < areaCards.length; i++) {
      const card = areaCards[i];

      // card_util, card_profile 제외
      if (card.classList.contains('card_util') || card.classList.contains('card_profile')) {
        continue;
      }

      // pin 포스트는 스킵
      const pinIcon = card.querySelector('.icon_pin');
      if (pinIcon) continue;

      // 제목 추출
      const titleElement = card.querySelector('.tit_card');
      const title = titleElement?.textContent?.trim() || '';

      // "주간메뉴표"가 제목에 있으면 스킵
      if (title.includes('주간메뉴표')) {
        continue;
      }

      // 저장된 것을 만나면 null 반환 (더 이상 새로운 것 없음)
      if (savedTitle && title === savedTitle) {
        return null;
      }

      // 새로운 일일메뉴 발견
      const descElement = card.querySelector('.desc_card');
      const description = descElement?.innerHTML || '';

      // 이미지 URL 추출
      const images: string[] = [];
      const thumbElements = card.querySelectorAll('.wrap_fit_thumb');

      thumbElements.forEach((thumb: any) => {
        const style = thumb.style.backgroundImage;
        const urlMatch = style.match(/url\(["']?(.+?)["']?\)/);
        if (urlMatch && urlMatch[1]) {
          images.push(urlMatch[1]);
        }
      });

      return {
        title,
        description,
        images,
        isPinned: false,
      };
    }

    return null;
  }, savedDailyMenu);

  return dailyMenu;
}

/**
 * 새로운 메뉴 포스트 가져오기
 * - 주간메뉴: 고정 포스트 하나만 체크
 * - 일일메뉴: "주간메뉴표"가 제목에 없는 것 중 새로운 것 하나만
 */
export async function getNewPosts(
  lastWeeklyMenu?: string,
  lastDailyMenu?: string
): Promise<NewMenus> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    console.log('카카오 채널 페이지 접속 중...');
    await page.goto(KAKAO_CHANNEL_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await page.waitForSelector('.wrap_webview', { timeout: 10000 });

    console.log('새 포스트 정보 추출 중...');

    // 1. 새로운 주간메뉴 확인
    const weeklyMenu = await getNewWeeklyMenu(page, lastWeeklyMenu);
    if (weeklyMenu) {
      console.log(`📌 새 주간메뉴 발견: ${weeklyMenu.title}`);

      // 주간메뉴 이미지 crop & 업로드
      if (weeklyMenu.images.length > 0) {
        try {
          console.log('\n🔪 주간메뉴 이미지 crop 시작...');
          const firstImage = weeklyMenu.images[0];
          const croppedPaths = await cropAndSaveWeeklyMenu(firstImage);
          weeklyMenu.croppedImagePaths = croppedPaths;
          console.log('✅ 주간메뉴 crop 완료');

          console.log('\n📤 주간메뉴 이미지 업로드 시작...');
          const uploadedUrls = await uploadAllDays(croppedPaths);

          saveWeeklyMenuUrls({
            mon: uploadedUrls.mon || '',
            tue: uploadedUrls.tue || '',
            wed: uploadedUrls.wed || '',
            thu: uploadedUrls.thu || '',
            fri: uploadedUrls.fri || '',
            uploadedAt: new Date().toISOString(),
            weekTitle: weeklyMenu.title,
          });

          console.log('✅ 주간메뉴 업로드 및 저장 완료\n');
        } catch (error) {
          console.error('❌ 주간메뉴 처리 실패:', error);
        }
      }
    } else {
      console.log('✅ 주간메뉴 변경 없음');
    }

    // 2. 새로운 일일메뉴 확인
    const dailyMenu = await getNewDailyMenu(page, lastDailyMenu);
    if (dailyMenu) {
      console.log(`🍴 새 일일메뉴 발견: ${dailyMenu.title}`);
    } else {
      console.log('✅ 일일메뉴 변경 없음');
    }

    return { weeklyMenu, dailyMenu };
  } catch (error) {
    console.error('크롤링 중 오류 발생:', error);
    return { weeklyMenu: null, dailyMenu: null };
  } finally {
    await browser.close();
  }
}

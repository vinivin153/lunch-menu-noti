import cron from 'node-cron';
import { getNewPosts, Post } from '../crawling/crawler';
import { getLastPost, saveLastPost } from '../storage/storage';
import { isHolidayToday } from '../utils/holidays';
import { isToday } from '../utils/date-utils';
import {
  sendCroppedImage,
  sendDailyMenu,
  sendWeeklyMenu,
} from '../notification/notification-manager';

export function startScheduler() {
  console.log('🚀 스케줄러 시작');
  console.log('📅 실행 주기: 월~금 오전 10:00, 10:30, 11:00, 11:30, 11:55 (KST)');
  console.log('');

  // 크론 표현식: 월~금 오전 10:00, 10:30, 11:00, 11:30, 11:55
  // '0,30 10-11 * * 1-5' = 월~금 10:00, 10:30, 11:00, 11:30
  // '55 11 * * 1-5' = 월~금 11:55
  const scheduleMain = '0,30 10-11 * * 1-5'; // 10:00, 10:30, 11:00, 11:30
  const scheduleLast = '55 11 * * 1-5'; // 11:55

  // 메인 스케줄: 10:00, 10:30, 11:00, 11:30
  cron.schedule(scheduleMain, async () => {
    console.log('\n⏰ 스케줄 실행:', new Date().toLocaleString('ko-KR'));

    if (isHolidayToday()) {
      console.log('🏖️  오늘은 식당 휴무일입니다');
      return;
    }

    await executeCheck(false);
  });

  // 11:55 스케줄
  cron.schedule(scheduleLast, async () => {
    console.log('\n⏰ 스케줄 실행:', new Date().toLocaleString('ko-KR'));

    if (isHolidayToday()) {
      console.log('🏖️  오늘은 식당 휴무일입니다');
      return;
    }

    await executeCheck(false);
  });

  // 시작 즉시 한 번 실행
  console.log('🔍 초기 체크 실행...');
  executeCheck(true); // 첫 체크
}

/**
 * 메뉴 체크 및 알림 전송
 * @param isFirstCheck 첫 실행 여부 (true면 알림 안 보내고 데이터만 저장)
 */
async function executeCheck(isFirstCheck: boolean) {
  try {
    // 1. 저장된 마지막 포스트 확인
    const lastPost = getLastPost();

    // 2. 새 포스트들 가져오기
    const { weeklyMenu, dailyMenu } = await getNewPosts(
      lastPost?.lastWeeklyMenuTitle,
      lastPost?.lastDailyMenuTitle
    );

    // 3. 새 포스트가 없는 경우
    if (!weeklyMenu && !dailyMenu) {
      console.log('✅ 새로운 포스트 없음');

      // 새 포스트가 없어도 크롭 이미지는 전송 시도
      if (!isFirstCheck) {
        console.log('\n📸 크롭 이미지 전송 확인...');
        await sendCroppedImage();
      }

      return;
    }

    // 4. 첫 실행이면 저장만 하고 종료
    if (isFirstCheck) {
      console.log('📋 첫 실행 감지 - 데이터만 저장하고 알림은 보내지 않습니다');

      saveLastPost({
        lastWeeklyMenuTitle: weeklyMenu?.title,
        lastDailyMenuTitle: dailyMenu?.title,
        timestamp: new Date().toISOString(),
      });

      console.log('✅ 초기 데이터 저장 완료');
      console.log(`   - 주간메뉴: ${weeklyMenu?.title || '없음'}`);
      console.log(`   - 일일메뉴: ${dailyMenu?.title || '없음'}`);
      return;
    }

    // 5. 알림 전송
    console.log('\n📤 알림 전송 시작...');

    // 5-1. 새 주간메뉴 전송
    if (weeklyMenu) {
      console.log('📌 주간메뉴 전송 확인...');
      await sendWeeklyMenu(weeklyMenu);
    }

    // 5-2. 오늘의 일일메뉴 전송
    if (dailyMenu) {
      if (isTodayMenu(dailyMenu.title)) {
        console.log('🍴 일일메뉴 전송 확인...');
        await sendDailyMenu(dailyMenu);
      } else {
        console.log('⏭️  오늘의 일일메뉴가 아닙니다 (다른 날짜의 메뉴)');
      }
    }

    // 5-3. 크롭 이미지 전송
    console.log('📸 크롭 이미지 전송 확인...');
    await sendCroppedImage();

    console.log('\n✅ 메뉴 체크 완료');
  } catch (error) {
    console.error('\n❌ 체크 중 오류 발생:', error);
  }
}

/**
 * 포스트 제목이 오늘 날짜인지 확인
 * @param title 포스트 제목 (예: "👩‍🍳12/22(일)")
 * @returns 오늘이면 true
 */
function isTodayMenu(title: string): boolean {
  // "👩‍🍳12/22(일)" 형식에서 "12/22" 추출
  const match = title.match(/(\d{1,2}\/\d{1,2})/);
  if (!match) {
    return false;
  }

  const dateString = match[1];
  return isToday(dateString);
}

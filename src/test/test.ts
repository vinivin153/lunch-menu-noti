import { getNewPosts } from '../crawling/crawler';
import { getLastPost, saveLastPost } from '../storage/storage';
import { getTodayCroppedImage } from '../image/image-processor';
import fs from 'fs';

async function test() {
  console.log('=== 이미지 Crop 테스트 시작 ===\n');

  // 1. 저장된 마지막 포스트 확인
  const lastPost = getLastPost();
  if (lastPost) {
    console.log('저장된 마지막 포스트:');
    if (lastPost.lastWeeklyMenuTitle) {
      console.log('  - 주간메뉴표:', lastPost.lastWeeklyMenuTitle);
    }
    if (lastPost.lastDailyMenuTitle) {
      console.log('  - 일일메뉴표:', lastPost.lastDailyMenuTitle);
    }
  } else {
    console.log('저장된 마지막 포스트: 없음');
  }
  console.log('');

  // 2. 새 포스트들 가져오기 (이 과정에서 자동으로 crop됨)
  console.log('🔍 카카오 채널 크롤링 중...\n');
  const { weeklyMenu, dailyMenu } = await getNewPosts(
    lastPost?.lastWeeklyMenuTitle,
    lastPost?.lastDailyMenuTitle
  );

  if (!weeklyMenu && !dailyMenu) {
    console.log('\n새로운 포스트가 없습니다.');
  } else {
    console.log('\n=== 새 포스트 발견! ===\n');

    // 3. 주간메뉴표 정보 출력
    if (weeklyMenu) {
      console.log('\n📌 새로운 주간메뉴표:');
      console.log(`\n  제목: ${weeklyMenu.title}`);
      console.log(`  이미지 개수: ${weeklyMenu.images.length}`);
      if (weeklyMenu.croppedImagePaths) {
        console.log('  Crop된 이미지:');
        Object.entries(weeklyMenu.croppedImagePaths).forEach(([day, path]) => {
          const exists = fs.existsSync(path);
          console.log(`    ${day}: ${path} ${exists ? '✅' : '❌'}`);
        });
      }
    }

    // 4. 일일메뉴 정보 출력
    if (dailyMenu) {
      console.log('\n🍴 새로운 일일메뉴:');
      console.log(`  - ${dailyMenu.title}`);
    }

    // 5. 새 포스트 정보 저장
    console.log('\n💾 새 포스트 정보 저장 중...');
    saveLastPost({
      lastWeeklyMenuTitle: weeklyMenu?.title || lastPost?.lastWeeklyMenuTitle,
      lastDailyMenuTitle: dailyMenu?.title || lastPost?.lastDailyMenuTitle,
      lastCroppedSentDate: lastPost?.lastCroppedSentDate,
      timestamp: new Date().toISOString(),
    });
  }

  // 6. 오늘 요일의 crop된 이미지 확인
  console.log('\n\n=== 오늘 요일 이미지 확인 ===');
  const todayImage = getTodayCroppedImage();
  if (todayImage) {
    const exists = fs.existsSync(todayImage);
    console.log(`오늘 이미지: ${todayImage}`);
    console.log(`파일 존재: ${exists ? '✅' : '❌'}`);
    if (exists) {
      const stats = fs.statSync(todayImage);
      console.log(`파일 크기: ${(stats.size / 1024).toFixed(2)} KB`);
    }
  } else {
    console.log('오늘 요일의 crop된 이미지가 없습니다.');
  }

  console.log('\n=== 테스트 완료 ===');
  console.log('※ 구글챗 전송은 하지 않았습니다');
}

test().catch(console.error);

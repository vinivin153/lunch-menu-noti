import fs from 'fs';

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

/**
 * 로컬 이미지 파일을 imgbb에 업로드하고 URL 반환
 * @param imagePath 로컬 이미지 파일 경로
 * @param delay 업로드 후 대기 시간 (ms)
 * @returns 업로드된 이미지 URL
 */
export async function uploadToImgbb(imagePath: string, delay: number = 0): Promise<string> {
  if (!IMGBB_API_KEY) {
    throw new Error('IMGBB_API_KEY 환경 변수가 설정되지 않았습니다');
  }

  try {
    // 파일을 Base64로 인코딩
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // imgbb API 호출
    const formData = new FormData();
    formData.append('image', base64Image);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`imgbb 업로드 실패: ${response.status}`);
    }

    const data = await response.json();
    const url = data.data.url;

    // 지연 시간이 있으면 대기
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return url;
  } catch (error) {
    console.error('❌ imgbb 업로드 실패:', error);
    throw error;
  }
}

/**
 * 5개 요일 이미지를 모두 업로드하고 URL 반환
 * @param imagePaths 요일별 이미지 경로 객체
 * @returns 요일별 업로드된 URL 객체
 */
export async function uploadAllDays(
  imagePaths: Record<string, string>
): Promise<Record<string, string>> {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const dayNames = ['월요일', '화요일', '수요일', '목요일', '금요일'];
  const urls: Record<string, string> = {};

  console.log('\n📤 5개 요일 이미지 업로드 시작...');

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const imagePath = imagePaths[day];

    if (!imagePath || !fs.existsSync(imagePath)) {
      console.error(`❌ ${dayNames[i]} 이미지 없음: ${imagePath}`);
      continue;
    }

    try {
      console.log(`  📤 ${dayNames[i]} 업로드 중...`);
      const url = await uploadToImgbb(imagePath, 500); // 500ms 대기
      urls[day] = url;
      console.log(`  ✅ ${dayNames[i]}: ${url}`);
    } catch (error) {
      console.error(`  ❌ ${dayNames[i]} 업로드 실패:`, error);
    }
  }

  console.log('\n🎉 모든 이미지 업로드 완료!\n');
  return urls;
}

/**
 * 오늘 요일의 crop된 이미지를 imgbb에 업로드
 * @param imagePath crop된 이미지 로컬 경로
 * @returns 업로드된 이미지 URL
 */
export async function uploadTodayMenu(imagePath: string): Promise<string> {
  console.log('📤 오늘 메뉴 이미지 업로드 중...');
  const url = await uploadToImgbb(imagePath);
  console.log('✅ 업로드 완료:', url);
  return url;
}

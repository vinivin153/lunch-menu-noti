import sharp from 'sharp';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CROPPED_DIR = path.join(process.cwd(), 'data', 'cropped');

/**
 * 이미지 URL에서 Buffer로 다운로드
 */
export async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (response) => {
        // 리다이렉트 처리
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            downloadImage(redirectUrl).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const chunks: Buffer[] = [];

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        response.on('error', reject);
      })
      .on('error', reject);
  });
}

/**
 * 주간메뉴 이미지를 5개 요일로 crop해서 저장
 * @param imageUrl 주간메뉴 이미지 URL
 * @returns 저장된 파일 경로들 { mon: '...', tue: '...', ... }
 */
export async function cropAndSaveWeeklyMenu(imageUrl: string): Promise<Record<string, string>> {
  try {
    console.log('📥 주간메뉴 이미지 다운로드 중...');
    const imageBuffer = await downloadImage(imageUrl);

    // 이미지 메타데이터 확인
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width!;
    const height = metadata.height!;

    console.log(`📐 이미지 크기: ${width}x${height}`);

    // cropped 디렉토리 생성
    if (!fs.existsSync(CROPPED_DIR)) {
      fs.mkdirSync(CROPPED_DIR, { recursive: true });
    }

    // 실제 메뉴 영역 좌표
    const menuStartX = 159;
    const menuStartY = 81;
    const menuWidth = 970;
    const menuHeight = 350;

    const columnWidth = 194;
    const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const dayNames = ['월요일', '화요일', '수요일', '목요일', '금요일'];
    const savedPaths: Record<string, string> = {};

    console.log('✂️  요일별로 이미지 crop 중...');
    console.log(`   메뉴 영역: x=${menuStartX}, y=${menuStartY}, w=${menuWidth}, h=${menuHeight}`);
    console.log(`   요일당 너비: ${columnWidth}px\n`);

    for (let i = 0; i < 5; i++) {
      const left = menuStartX + columnWidth * i;
      const dayKey = days[i];
      const outputPath = path.join(CROPPED_DIR, `weekly-${dayKey}.jpg`);

      // 마지막 요일은 이미지 경계를 넘지 않도록 실제 이미지 너비 기준으로 조정
      const actualWidth = Math.min(columnWidth, width - left);

      await sharp(imageBuffer)
        .extract({
          left: left,
          top: menuStartY,
          width: actualWidth,
          height: menuHeight,
        })
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      savedPaths[dayKey] = outputPath;
      console.log(`  ✅ ${dayNames[i]}: x=${left}, w=${actualWidth}`);
    }

    console.log('🎉 모든 요일 이미지 저장 완료!');
    return savedPaths;
  } catch (error) {
    console.error('❌ 주간메뉴 이미지 crop 실패:', error);
    throw error;
  }
}

/**
 * 오늘 요일에 해당하는 crop된 이미지 경로 가져오기
 * @returns 오늘 요일의 이미지 경로 (없으면 null)
 */
export function getTodayCroppedImage(): string | null {
  const today = new Date().getDay();

  // 주말 체크
  if (today === 0 || today === 6) {
    return null;
  }

  const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const dayKey = days[today - 1]; // 월요일=0, 화요일=1, ...
  const imagePath = path.join(CROPPED_DIR, `weekly-${dayKey}.jpg`);

  if (fs.existsSync(imagePath)) {
    return imagePath;
  }

  return null;
}

/**
 * 오늘 요일에 해당하는 메뉴 영역만 crop
 * @param imageUrl 주간메뉴 이미지 URL
 * @returns crop된 이미지 Buffer
 */
export async function cropTodayMenu(imageUrl: string): Promise<Buffer> {
  try {
    // 1. 이미지 다운로드
    console.log('이미지 다운로드 중...');
    const imageBuffer = await downloadImage(imageUrl);

    // 2. 이미지 메타데이터 확인
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width!;
    const height = metadata.height!;

    console.log(`이미지 크기: ${width}x${height}`);

    // 3. 오늘 요일 계산 (0=일요일, 1=월요일, ..., 5=금요일, 6=토요일)
    const today = new Date().getDay();

    // 월요일=0, 화요일=1, ..., 금요일=4로 변환
    // 일요일(0)과 토요일(6)은 처리하지 않음 (평일만)
    if (today === 0 || today === 6) {
      throw new Error('주말에는 메뉴를 crop할 수 없습니다');
    }

    const dayIndex = today - 1; // 월요일=0, 화요일=1, 수요일=2, 목요일=3, 금요일=4

    // 4. 5등분하여 해당 요일 영역 계산
    const columnWidth = Math.floor(width / 5);
    const left = columnWidth * dayIndex;

    console.log(
      `오늘은 ${['월', '화', '수', '목', '금'][dayIndex]}요일 - ${dayIndex}번째 영역 crop`
    );
    console.log(`Crop 영역: left=${left}, width=${columnWidth}, height=${height}`);

    // 5. Crop 실행
    const croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: left,
        top: 0,
        width: columnWidth,
        height: height,
      })
      .toBuffer();

    console.log('✅ 이미지 crop 완료');
    return croppedBuffer;
  } catch (error) {
    console.error('❌ 이미지 crop 실패:', error);
    throw error;
  }
}

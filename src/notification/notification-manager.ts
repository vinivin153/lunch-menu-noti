/**
 * 알림 전송 관리자
 * 중복 방지 로직과 함께 Google Chat 알림을 전송
 */

import { getLastPost, saveLastPost } from '../storage/storage';
import { getTodayMenuUrl } from '../storage/weekly-menu-storage';
import { sendToGoogleChat } from './google-chat';
import { isThisWeek, getTodayString } from '../utils/date-utils';
import type { Post } from '../crawling/crawler';

/**
 * 크롭된 이미지를 전송 (중복 방지)
 * - 이미 오늘 전송했으면 스킵
 * - 주간메뉴가 이번 주가 아니면 스킵
 */
export async function sendCroppedImage(): Promise<void> {
  const lastPost = getLastPost();
  const today = getTodayString();

  // 1. 이미 오늘 크롭 이미지를 보냈는지 확인
  if (lastPost?.lastCroppedSentDate === today) {
    console.log('이미 오늘 크롭 이미지를 전송했습니다. 스킵합니다.');
    return;
  }

  // 2. 주간메뉴가 이번 주인지 확인
  if (!lastPost?.lastWeeklyMenuTitle || !isThisWeek(lastPost.lastWeeklyMenuTitle)) {
    console.log('주간메뉴가 없거나 이번 주가 아닙니다. 크롭 이미지 전송 스킵합니다.');
    return;
  }

  // 3. 오늘의 크롭 이미지 URL 가져오기
  const croppedImageUrl = getTodayMenuUrl();
  if (!croppedImageUrl) {
    console.log('오늘의 크롭 이미지 URL이 없습니다. 전송 스킵합니다.');
    return;
  }

  // 4. Google Chat으로 전송
  const post: Post = {
    title: `오늘의 메뉴`,
    description: '',
    images: [croppedImageUrl],
    isPinned: false,
  };

  await sendToGoogleChat([post]);
  console.log('크롭 이미지 전송 완료');

  // 5. 전송일 업데이트
  saveLastPost({
    ...lastPost,
    lastCroppedSentDate: today,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 일일메뉴가 새로운지 확인하고 전송
 * @param dailyPost 일일메뉴 포스트
 * @returns 전송 여부
 */
export async function sendDailyMenu(dailyPost: Post | null): Promise<boolean> {
  if (!dailyPost) {
    return false;
  }

  const lastPost = getLastPost();

  // 이미 전송한 일일메뉴인지 확인
  if (lastPost?.lastDailyMenuTitle === dailyPost.title) {
    console.log('이미 전송한 일일메뉴입니다:', dailyPost.title);
    return false;
  }

  // Google Chat으로 전송
  await sendToGoogleChat([dailyPost]);
  console.log('일일메뉴 전송 완료:', dailyPost.title);

  // lastDailyMenuTitle 업데이트
  saveLastPost({
    lastWeeklyMenuTitle: lastPost?.lastWeeklyMenuTitle,
    lastDailyMenuTitle: dailyPost.title,
    lastCroppedSentDate: lastPost?.lastCroppedSentDate,
    timestamp: new Date().toISOString(),
  });

  return true;
}

/**
 * 주간메뉴가 새로운지 확인하고 전송
 * @param weeklyPost 주간메뉴 포스트
 * @returns 전송 여부
 */
export async function sendWeeklyMenu(weeklyPost: Post | null): Promise<boolean> {
  if (!weeklyPost) {
    return false;
  }

  const lastPost = getLastPost();

  // 이미 전송한 주간메뉴인지 확인
  if (lastPost?.lastWeeklyMenuTitle === weeklyPost.title) {
    console.log('이미 전송한 주간메뉴입니다:', weeklyPost.title);
    return false;
  }

  // Google Chat으로 전송
  await sendToGoogleChat([weeklyPost]);
  console.log('주간메뉴 전송 완료:', weeklyPost.title);

  // lastWeeklyMenuTitle 업데이트
  saveLastPost({
    lastWeeklyMenuTitle: weeklyPost.title,
    lastDailyMenuTitle: lastPost?.lastDailyMenuTitle,
    lastCroppedSentDate: lastPost?.lastCroppedSentDate,
    timestamp: new Date().toISOString(),
  });

  return true;
}

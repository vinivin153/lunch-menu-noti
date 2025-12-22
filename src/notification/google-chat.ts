import { Post } from '../crawling/crawler';

const WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL;

export async function sendToGoogleChat(posts: Post[]): Promise<void> {
  if (!WEBHOOK_URL) {
    console.error('❌ GOOGLE_CHAT_WEBHOOK_URL 환경 변수가 설정되지 않았습니다.');
    return;
  }

  if (posts.length === 0) {
    console.log('전송할 포스트가 없습니다.');
    return;
  }

  console.log(`\n구글 챗으로 ${posts.length}개 포스트 전송 중...`);

  for (const post of posts) {
    try {
      const message = createMessage(post);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ 전송 실패 (${post.title}):`, response.status, errorText);
      } else {
        const type = post.isPinned ? '📌 주간메뉴표' : '🍴 일일메뉴';
        console.log(`✅ 전송 완료: ${type} - ${post.title}`);
      }

      // 연속 전송시 약간의 딜레이 (Rate limit 방지)
      if (posts.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ 전송 중 오류 (${post.title}):`, error);
    }
  }

  console.log('\n구글 챗 전송 완료!');
}

function createMessage(post: Post) {
  // HTML 태그 제거 및 텍스트 정리
  const description = post.description
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

  // 위젯 배열 생성
  const widgets: any[] = [
    {
      textParagraph: {
        text: description,
      },
    },
  ];

  // 이미지가 있으면 추가
  if (post.images.length > 0) {
    console.log(`[${post.title}] 이미지 개수:`, post.images.length);
    post.images.forEach((imageUrl, index) => {
      // 💡 [수정됨] wsrv.nl 프록시를 사용하여 우회
      // 원본 URL을 인코딩하여 프록시 URL 뒤에 붙입니다.
      const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}`;

      console.log(`  이미지 ${index + 1} (Proxy):`, proxyUrl);

      widgets.push({
        image: {
          imageUrl: proxyUrl, // 원본 imageUrl 대신 proxyUrl 사용
          altText: post.title + ` 이미지 ${index + 1}`,
          onClick: {
            openLink: {
              url: imageUrl, // 클릭했을 때는 원본 카카오 링크로 이동하도록 유지
            },
          },
        },
      });
    });
  }

  // Google Chat Card v2 형식
  return {
    cardsV2: [
      {
        cardId: 'menu-card',
        card: {
          header: {
            title: post.title,
          },
          sections: [
            {
              widgets: widgets,
            },
          ],
        },
      },
    ],
  };
}

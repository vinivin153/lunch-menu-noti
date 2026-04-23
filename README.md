# JCC 점심 메뉴 크롤러

본우리집밥 카카오 채널의 메뉴 포스트를 자동으로 확인하고 구글 챗으로 알림을 보내는 서비스입니다.

## 배경

사내 점심 메뉴는 카카오톡 채널을 통해 공지되고 있으며, 메뉴 확인을 위해 프로필에 직접 접근해야 하는 불편함이 있었습니다. 또한 영양사가 당일 메뉴를 등록하지 않는 경우 주간 메뉴표를 다시 확인해야 하는 경우도 있었습니다.

이러한 불편함을 해소하기 위해 점심 메뉴 정보 접근성 개선을 목표로 서비스 만들었습니다. 사내 메신저로 사용 중인 Google Chat과 웹훅을 연동해 메뉴 정보를 자동으로 전달하는 구조를 구성했으며, 이를 통해 별도의 서비스 이동 없이 메신저 내에서 메뉴 확인이 가능하도록 했습니다.

## 프로젝트 구조

```
jcc-lunch-menu/
├── src/
│   ├── index.ts                           # 메인 진입점
│   ├── crawling/
│   │   └── crawler.ts                     # Puppeteer 크롤링 로직
│   ├── storage/
│   │   ├── storage.ts                     # 일반 포스트 저장/불러오기
│   │   └── weekly-menu-storage.ts         # 주간 메뉴 저장/불러오기
│   ├── notification/
│   │   ├── google-chat.ts                 # 구글 챗 웹훅 연동
│   │   └── notification-manager.ts        # 알림 관리 로직
│   ├── image/
│   │   ├── image-processor.ts             # 이미지 처리 (Sharp)
│   │   └── image-uploader.ts              # 이미지 업로드 (imgbb)
│   ├── scheduler/
│   │   └── scheduler.ts                   # 자동 실행 스케줄러
│   ├── utils/
│   │   ├── date-utils.ts                  # 날짜 유틸리티
│   │   └── holidays.ts                    # 한국 공휴일 처리
│   └── test/
│       └── test.ts                        # 테스트 스크립트
├── data/
│   ├── last-post.json                     # 마지막 확인한 포스트 정보
│   └── weekly-menus/                      # 주간 메뉴 이미지 저장
├── .env                                   # 환경 변수 (웹훅 URL, API 키)
├── Dockerfile                             # Docker 이미지 설정
├── docker-compose.yml                     # Docker Compose 설정
├── package.json
└── tsconfig.json
```

## 작동 방식

1. **스케줄 실행**: 월~금 오전 10:00, 10:30, 11:00, 11:30, 11:55 (KST)에 자동 실행
2. **공휴일 체크**: 한국 공휴일인 경우 자동으로 건너뛰기
3. **크롤링**: Puppeteer로 카카오 채널 페이지 접속
4. **데이터 추출**:
   - Pin 포스트(주간메뉴표)와 일반 포스트(일일메뉴) 분리 수집
   - 제목, 내용, 이미지 URL 추출
5. **이미지 처리**:
   - 주간메뉴 이미지를 요일별로 자동 crop (Sharp 사용)
   - imgbb API를 통해 이미지 업로드 및 영구 URL 생성
6. **비교**:
   - 주간메뉴표: 저장된 것과 다르면 새 포스트
   - 일일메뉴: 저장된 것과 다르고 오늘 날짜이면 전송
7. **알림**:
   - 새 주간메뉴 발견시 구글 챗으로 전송
   - 오늘의 일일메뉴 발견시 구글 챗으로 전송
   - 크롭된 오늘의 메뉴 이미지 전송 (하루에 한 번만)
8. **저장**: 마지막 확인한 포스트 정보 및 전송 이력을 로컬에 저장

## 주요 기능

✅ **카카오 채널 자동 크롤링**: Puppeteer를 이용한 메뉴 포스트 자동 수집

✅ **실시간 메뉴 알림**: 새 메뉴 업로드 시 구글 챗 웹훅을 통한 즉시 알림

✅ **주간 메뉴 자동 분할**: Sharp 이미지 처리로 주간 메뉴표를 요일별로 분할

✅ **이미지 영구 호스팅**: imgbb API를 통한 이미지 업로드 및 안정적인 URL 제공

✅ **자동 스케줄링**: node-cron을 이용한 평일 점심시간 자동 실행

✅ **공휴일 자동 인식**: 한국 공휴일 데이터 기반 휴무일 처리


## Docker 실행

### Docker Compose 사용 (권장)

```bash
docker compose up -d --build
```

> 소스코드를 수정한 뒤에는 `--build` 플래그로 이미지를 재빌드해야 반영됩니다.

### Docker 직접 실행

```bash
# 이미지 빌드
docker build -t jcc-lunch-menu .

# 컨테이너 실행
docker run -d \
  --name jcc-lunch-menu \
  -e GOOGLE_CHAT_WEBHOOK_URL=your_webhook_url \
  -e IMGBB_API_KEY=your_imgbb_api_key \
  -v $(pwd)/data:/app/data \
  jcc-lunch-menu
```

## 크롤링 대상

- URL: https://pf.kakao.com/_xhxmywn/posts
- 채널: 본우리집밥재능교육본사점

# 🏯 삼국지 AI — 군주 시뮬레이션

제갈량 AI 참모와 대화하며 국가를 경영하는 채팅형 전략 게임

## 실행 방법

### 1. Node.js 설치 (이미 있으면 생략)
https://nodejs.org 에서 LTS 버전 다운로드 후 설치

### 2. 프로젝트 폴더에서 패키지 설치
```bash
cd three-kingdoms-ai
npm install
```

### 3. API 키 설정
`.env.local` 파일을 열고 Anthropic API 키를 입력:
```
ANTHROPIC_API_KEY=sk-ant-여기에실제키입력
```

API 키는 https://console.anthropic.com 에서 발급받을 수 있습니다.

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 브라우저에서 접속
```
http://localhost:3000
```

## 모바일 테스트

### 같은 Wi-Fi 환경
1. PC에서 `npm run dev` 실행
2. PC의 IP 주소 확인 (예: 192.168.0.10)
3. 폰 브라우저에서 `http://192.168.0.10:3000` 접속

### Vercel 배포 (추천)
1. GitHub에 push
2. https://vercel.com 에서 Import
3. Environment Variables에 `ANTHROPIC_API_KEY` 추가
4. Deploy → 생성된 URL을 폰에서 접속

## 파일 구조
```
three-kingdoms-ai/
├── app/
│   ├── api/chat/route.js   ← Claude API 서버 사이드 호출
│   ├── globals.css          ← 전역 스타일
│   ├── layout.js            ← 레이아웃 (폰트 등)
│   └── page.js              ← 메인 게임 (UI + 로직 전부)
├── .env.local               ← API 키 (⚠️ git에 올리지 마세요)
├── next.config.js
├── package.json
└── README.md
```

## 기능
- ✅ 제갈량 AI 참모 채팅 (Claude API)
- ✅ 타이핑 애니메이션
- ✅ 게임 상태 관리 (금/식량/병력/민심)
- ✅ 턴 진행 + 계절 변화
- ✅ 선택지 → 결과 반영 루프
- ✅ 랜덤 이벤트 시스템
- ✅ 할일 큐

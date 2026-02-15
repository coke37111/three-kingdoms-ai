# 03. 아키텍처 개요

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 번들러 | **Turbopack** (`next dev --turbo`) |
| 언어 | TypeScript (strict) |
| 인증 | Firebase Auth (Google 로그인) |
| 저장소 | Firebase Firestore (클라우드) |
| AI 모델 | Claude Sonnet 4 / GPT-4o-mini |
| 스타일 | 인라인 스타일 + CSS 변수 (`globals.css`) |
| 폰트 | Noto Sans KR, Noto Serif KR (Google Fonts) |

> **참고**: webpack 대신 Turbopack 사용. webpack HMR의 서버 캐시 깨짐 문제(`MODULE_NOT_FOUND ./948.js`) 방지.

## 디렉토리 구조

```
three-kingdoms-ai/
├── app/                      # Next.js App Router
│   ├── page.tsx              # 진입점 (GameContainer 렌더)
│   ├── layout.tsx            # 루트 레이아웃 (폰트, 언어)
│   ├── globals.css           # CSS 변수, 애니메이션
│   └── api/
│       ├── chat/route.ts     # AI API 프록시 (서버)
│       ├── stt/route.ts      # Speech-to-Text API
│       └── tts/route.ts      # Text-to-Speech API
│
├── types/                    # 타입 정의
│   ├── game.ts               # 게임 상태, 세력, 외교, 전투 등
│   ├── chat.ts               # AI 응답, 메시지, 감정
│   └── council.ts            # ★ 참모 회의, 결재, 쓰레드, 브리핑
│
├── constants/                # 상수 데이터
│   ├── factions.ts           # 4개 세력 초기 데이터
│   ├── advisors.ts           # ★ 5인 참모 초기 상태 + 장비 정보
│   ├── worldMap.ts           # 20개 도시 맵 (인접, 지형, 방어)
│   ├── gameConstants.ts      # 계절, 식량 배율, 병량 소모
│   ├── events.ts             # 랜덤 이벤트 5종
│   └── initialState.ts       # (레거시) 단일 세력 초기값
│
├── lib/                      # 순수 로직
│   ├── game/                 # 게임 시스템
│   │   ├── combatSystem.ts   # 전투 해결
│   │   ├── diplomacySystem.ts# 외교 행동
│   │   ├── resourceCalculator.ts # 자원 계산
│   │   ├── stateManager.ts   # 상태 변경 적용
│   │   ├── eventSystem.ts    # 랜덤 이벤트
│   │   ├── victorySystem.ts  # 승패 판정
│   │   ├── situationDetector.ts # ★ 정세 감지 (긴급/평상시)
│   │   └── saveSystem.ts     # 저장/로드 (Firebase)
│   ├── api/
│   │   ├── llmClient.ts      # LLM 호출 클라이언트 (council 전용)
│   │   └── llmCache.ts       # 서버 측 응답 캐시 (영구 저장)
│   ├── prompts/
│   │   ├── councilPrompt.ts  # ★ 참모 회의 프롬프트 (메인)
│   │   ├── factionAIPrompt.ts# NPC 세력 행동 프롬프트
│   │   └── systemPrompt.ts   # (레거시) 제갈량 1:1 프롬프트
│   ├── firebase/
│   │   ├── config.ts         # Firebase 앱 싱글톤
│   │   ├── auth.ts           # Google 인증
│   │   └── firestore.ts      # Firestore CRUD
│   ├── voice/
│   │   ├── sttEngine.ts      # Speech-to-Text 엔진
│   │   ├── ttsEngine.ts      # Text-to-Speech 엔진
│   │   ├── emotionVoiceMap.ts # 감정별 음성 매핑
│   │   └── types.ts          # 음성 시스템 타입
│   └── utils/
│       └── textFormatter.tsx  # 숫자 컬러링 등
│
├── hooks/                    # React 커스텀 훅
│   ├── useWorldState.ts      # 다수 세력 상태 (현재 사용)
│   ├── useWorldTurn.ts       # 턴 진행, 자원 계산
│   ├── useChatHistory.ts     # 채팅/대화 히스토리
│   ├── useAuth.ts            # Firebase 인증 상태
│   ├── usePreferences.ts     # 사용자 설정 (LLM 제공자)
│   ├── useTypewriter.ts      # 타이핑 애니메이션
│   ├── useVoice.ts           # 음성 입력
│   ├── useGameState.ts       # (레거시) 단일 세력 상태
│   └── useTurnSystem.ts      # (레거시) 단일 세력 턴
│
├── components/game/          # UI 컴포넌트
│   ├── GameContainer.tsx     # ★ 메인 오케스트레이터
│   ├── CouncilChat.tsx       # ★ 참모 회의 채팅 (쓰레드/타이핑)
│   ├── BriefingPanel.tsx     # ★ 정세 브리핑 패널 (Phase 0)
│   ├── TitleScreen.tsx       # 타이틀 화면
│   ├── StatusBar.tsx         # 자원 표시 바
│   ├── ChatBubble.tsx        # 시스템 메시지 말풍선
│   ├── WorldStatus.tsx       # 천하 정세 모달
│   ├── DiplomacyPanel.tsx    # 외교 패널
│   ├── TurnNotification.tsx  # NPC 턴 요약
│   ├── BattleReport.tsx      # 전투 보고서
│   ├── GameEndScreen.tsx     # 승리/패배 화면
│   ├── TaskPanel.tsx         # 이벤트 태스크
│   ├── FactionBanner.tsx     # 세력 아이콘/이름
│   ├── UserBadge.tsx         # 사용자 배지
│   ├── LoginPanel.tsx        # 로그인 모달
│   ├── VoiceSettingsModal.tsx# 음성 설정 모달
│   └── SaveLoadPanel.tsx     # 저장/로드 모달
│
├── docs/                     # 현행 문서
└── plans/                    # 계획 문서
```

## 데이터 흐름 (참모 회의 시스템)

```
[게임 시작]
       ↓
  Phase 0: 도입 서사 (첫 턴) / 정세 브리핑 (이후 턴)
       ↓
  Phase 1: 참모 회의 — API 1회
       ├─ buildCouncilPrompt() → callCouncilLLM()
       ├─ 응답: CouncilResponse (회의 대사 + 자율 행동 + 결재 요청)
       ├─ auto_actions 즉시 적용 (applyPlayerChanges)
       └─ animateCouncilMessages() → 타이핑 인디케이터 + 순차 표시
       ↓
  Phase 2: 플레이어 입력 — 선택적 API 1회
       ├─ 결재 승인/거부 → buildCouncilResultPrompt()
       ├─ 자유 입력 (일반/쓰레드 답장) → buildCouncilResultPrompt()
       └─ 다음 턴 버튼 → Phase 3으로
       ↓
  Phase 3: NPC 턴 — API 1회
       ├─ processNPCTurns() → buildFactionAIPrompt()
       ├─ 행동 적용 + 알림 표시
       └─ advanceWorldTurn() → 자원/계절/조약 갱신
       ↓
  checkGameEnd() → 승패 판정
       ↓
  Phase 0으로 복귀 (다음 턴)
```

## 핵심 설계 원칙

1. **WorldState 중심**: 모든 게임 데이터는 `WorldState` 객체에 집중
2. **참모 자율 행동**: A/B/C 선택지 대신, 참모가 자율적으로 행동하고 보고
3. **결재 시스템**: 중대 사안만 플레이어에게 결재 요청 (routine/important/critical)
4. **쓰레드 대화**: 참모 발언 클릭 → 해당 주제로 쓰레드 대화
5. **순수 함수 분리**: `lib/game/` 내 함수들은 부작용 없는 순수 함수
6. **AI 프록시**: 클라이언트 → Next.js API Route → 외부 AI API (API 키 보호)
7. **NPC 배치 처리**: 3개 NPC 세력의 AI 결정을 한 번의 API 호출로 처리
8. **결정론적 폴백**: AI 호출 실패 시 안전한 기본 행동 (개발) 적용
9. **자동 저장**: 매 턴 Firebase에 자동 저장
10. **Stale Closure 방지**: `useRef`로 최신 값 유지 (React 18 batching 대응)
11. **인라인 스타일**: CSS 모듈 없이 `style={{}}` + CSS 변수 조합

## 레거시 코드

아래 파일들은 Phase B (단일 세력, A/B/C 선택지) 시절의 코드로, 현재 사용되지 않지만 호환성을 위해 유지:

- `hooks/useGameState.ts` — 단일 세력 상태 훅
- `hooks/useTurnSystem.ts` — 단일 세력 턴 시스템
- `constants/initialState.ts` — 단일 세력 초기값
- `lib/prompts/systemPrompt.ts`의 `buildSystemPrompt()` 함수 (현재는 `buildCouncilPrompt()` 사용)
- `components/game/ChoicePanel.tsx` — A/B/C 선택지 패널 (삭제됨, 결재 시스템으로 대체)

# 03. 아키텍처 개요

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript (strict) |
| 인증 | Firebase Auth (Google 로그인) |
| 저장소 | Firebase Firestore (클라우드) |
| AI 모델 | Claude Sonnet 4 / GPT-4o-mini |
| 스타일 | 인라인 스타일 + CSS 변수 (`globals.css`) |
| 폰트 | Noto Sans KR, Noto Serif KR (Google Fonts) |

## 디렉토리 구조

```
three-kingdoms-ai/
├── app/                      # Next.js App Router
│   ├── page.tsx              # 진입점 (GameContainer 렌더)
│   ├── layout.tsx            # 루트 레이아웃 (폰트, 언어)
│   ├── globals.css           # CSS 변수, 애니메이션
│   └── api/
│       └── chat/route.ts     # AI API 프록시 (서버)
│
├── types/                    # 타입 정의
│   ├── game.ts               # 게임 상태, 세력, 외교, 전투 등
│   └── chat.ts               # AI 응답, 메시지, NPC 행동
│
├── constants/                # 상수 데이터
│   ├── factions.ts           # 4개 세력 초기 데이터
│   ├── worldMap.ts           # 20개 도시 맵 (인접, 지형, 방어)
│   ├── gameConstants.ts      # 계절, 식량 배율
│   ├── events.ts             # 랜덤 이벤트 5종
│   └── initialState.ts       # 레거시 단일 세력 초기값
│
├── lib/                      # 순수 로직
│   ├── game/                 # 게임 시스템
│   │   ├── combatSystem.ts   # 전투 해결
│   │   ├── diplomacySystem.ts# 외교 행동
│   │   ├── resourceCalculator.ts # 자원 계산
│   │   ├── stateManager.ts   # 상태 변경 적용
│   │   ├── eventSystem.ts    # 랜덤 이벤트
│   │   ├── victorySystem.ts  # 승패 판정
│   │   └── saveSystem.ts     # 저장/로드 (Firebase)
│   ├── api/
│   │   ├── llmClient.ts      # LLM 호출 클라이언트
│   │   └── llmCache.ts       # 서버 측 응답 캐시
│   ├── prompts/
│   │   ├── systemPrompt.ts   # 제갈량 AI 프롬프트
│   │   └── factionAIPrompt.ts# NPC 세력 행동 프롬프트
│   ├── firebase/
│   │   ├── config.ts         # Firebase 앱 싱글톤
│   │   ├── auth.ts           # Google 인증
│   │   └── firestore.ts      # Firestore CRUD
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
│   ├── useGameState.ts       # (레거시) 단일 세력 상태
│   └── useTurnSystem.ts      # (레거시) 단일 세력 턴
│
├── components/game/          # UI 컴포넌트
│   ├── GameContainer.tsx     # ★ 메인 오케스트레이터
│   ├── TitleScreen.tsx       # 타이틀 화면
│   ├── StatusBar.tsx         # 자원 표시 바
│   ├── ChatBubble.tsx        # 채팅 말풍선
│   ├── ChoicePanel.tsx       # 선택지 패널
│   ├── WorldStatus.tsx       # 천하 정세 모달
│   ├── DiplomacyPanel.tsx    # 외교 패널
│   ├── TurnNotification.tsx  # NPC 턴 요약
│   ├── BattleReport.tsx      # 전투 보고서
│   ├── GameEndScreen.tsx     # 승리/패배 화면
│   ├── TaskPanel.tsx         # 이벤트 태스크
│   ├── FactionBanner.tsx     # 세력 아이콘/이름
│   ├── LoginPanel.tsx        # 로그인 패널
│   ├── UserBadge.tsx         # 사용자 배지
│   └── SaveLoadPanel.tsx     # 저장/로드 모달
│
└── docs/                     # 문서
```

## 데이터 흐름

```
[플레이어 입력/선택]
       ↓
  GameContainer (오케스트레이터)
       ↓
  callLLM() → /api/chat → Claude/GPT API
       ↓
  AI 응답 (JSON): dialogue + state_changes + choices
       ↓
  ┌─ applyPlayerChanges() → WorldState 업데이트
  ├─ addAdvisorMsg() → 타이핑 애니메이션 표시
  └─ setChoices() → 선택지 UI 표시
       ↓
  [플레이어 선택] → handleChoice()
       ↓
  ┌─ AI 결과 보고
  ├─ processNPCTurns() → NPC 3개 세력 행동
  ├─ advanceWorldTurn() → 자원/계절/조약 갱신
  └─ autoSave() → Firebase 자동 저장
       ↓
  checkGameEnd() → 승패 판정
       ↓
  새 턴 상황 보고 (AI) → 다시 처음으로
```

## 핵심 설계 원칙

1. **WorldState 중심**: 모든 게임 데이터는 `WorldState` 객체에 집중
2. **순수 함수 분리**: `lib/game/` 내 함수들은 부작용 없는 순수 함수
3. **AI 프록시**: 클라이언트 → Next.js API Route → 외부 AI API (API 키 보호)
4. **NPC 배치 처리**: 3개 NPC 세력의 AI 결정을 한 번의 API 호출로 처리
5. **결정론적 폴백**: AI 호출 실패 시 안전한 기본 행동 (개발) 적용
6. **자동 저장**: 선택, 턴 진행, 외교 행동 후 자동으로 Firebase에 저장
7. **Stale Closure 방지**: `useRef`로 최신 값 유지 (React 18 batching 대응)
8. **인라인 스타일**: CSS 모듈 없이 `style={{}}` + CSS 변수 조합

## 레거시 코드

아래 파일들은 Phase B (단일 세력) 시절의 코드로, 현재 사용되지 않지만 호환성을 위해 유지:

- `hooks/useGameState.ts` — 단일 세력 상태 훅
- `hooks/useTurnSystem.ts` — 단일 세력 턴 시스템
- `constants/initialState.ts` — 단일 세력 초기값
- `lib/prompts/systemPrompt.ts`의 `buildSystemPrompt()` 함수 (현재는 `buildWorldSystemPrompt()` 사용)

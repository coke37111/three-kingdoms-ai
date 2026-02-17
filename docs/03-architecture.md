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

> **참고**: webpack 대신 Turbopack 사용. webpack HMR의 서버 캐시 깨짐 문제 방지.

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
│   ├── game.ts               # 포인트, 성채, 세력, 전투, 외교
│   ├── chat.ts               # AI 응답, 메시지, 감정
│   └── council.ts            # 참모 회의, 쓰레드, Phase 시스템
│
├── constants/                # 상수 데이터
│   ├── factions.ts           # 3개 세력 초기 데이터 (유비/조조/손권)
│   ├── advisors.ts           # 4인 참모 초기 상태
│   ├── castles.ts            # ~34개 성채 (삼각 라인 배치)
│   ├── skills.ts             # 스킬 트리 (13노드, 4카테고리)
│   └── gameConstants.ts      # 턴 제한, AP 이월률, 전투/시설 상수
│
├── lib/                      # 순수 로직
│   ├── game/                 # 게임 시스템
│   │   ├── pointCalculator.ts # 매턴 포인트 충전, 부상 회복
│   │   ├── combatSystem.ts   # MP 기반 전투 해결
│   │   ├── diplomacySystem.ts# -10~+10 점수 기반 외교
│   │   ├── stateManager.ts   # PointDeltas 기반 상태 변경
│   │   ├── victorySystem.ts  # 본성 함락 기반 승패 판정
│   │   └── saveSystem.ts     # 저장/로드 (Firebase)
│   ├── api/
│   │   ├── llmClient.ts      # callCouncilLLM() + callReactionLLM()
│   │   └── llmCache.ts       # 서버 측 응답 캐시 (영구 저장)
│   ├── prompts/
│   │   ├── councilPrompt.ts  # Phase 1+3, Phase 2, Phase 4 프롬프트
│   │   └── factionAIPrompt.ts# NPC 세력 행동 프롬프트
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
│   ├── useWorldState.ts      # WorldState 관리 (PointDeltas 기반)
│   ├── useWorldTurn.ts       # 턴 진행, 포인트 충전, 부상 회복
│   ├── useChatHistory.ts     # 채팅/대화 히스토리
│   ├── useAuth.ts            # Firebase 인증 상태
│   ├── usePreferences.ts     # 사용자 설정 (LLM 제공자)
│   ├── useTypewriter.ts      # 타이핑 애니메이션
│   └── useVoice.ts           # 음성 입력
│
├── components/game/          # UI 컴포넌트
│   ├── GameContainer.tsx     # ★ 메인 오케스트레이터 (5-Phase)
│   ├── CouncilChat.tsx       # ★ 참모 회의 채팅 (쓰레드/타이핑/Phase 배지)
│   ├── WorldStatus.tsx       # 천하 정세 모달 (포인트/성채/전선)
│   ├── TitleScreen.tsx       # 타이틀 화면
│   ├── ChatBubble.tsx        # 시스템 메시지 말풍선
│   ├── TurnNotification.tsx  # NPC 턴 요약
│   ├── BattleReport.tsx      # 전투 보고서 (부상병 포함)
│   ├── GameEndScreen.tsx     # 승리/패배 화면
│   ├── FactionBanner.tsx     # 세력 아이콘/이름
│   ├── AdvisorBar.tsx        # 참모 충성도/열정 표시
│   ├── UserBadge.tsx         # 사용자 배지
│   ├── LoginPanel.tsx        # 로그인 모달
│   ├── VoiceSettingsModal.tsx# 음성 설정 모달
│   └── SaveLoadPanel.tsx     # 저장/로드 모달
│
├── docs/                     # 현행 문서
└── plans/                    # 계획 문서
```

## 데이터 흐름 (5-Phase 회의 시스템)

```
[게임 시작]
       ↓
  Phase 1: 상태 보고 — API 1회 (Phase 3과 합산)
       ├─ buildPhase1And3Prompt() → callCouncilLLM()
       ├─ 응답: CouncilResponse (회의 대사 + status_reports + plan_reports)
       ├─ Phase 1 메시지 애니메이션 + status_reports 표시
       └─ state_changes 적용 (applyPlayerChanges)
       ↓
  Phase 2: 군주 토론 — AP 1 소비/발언, API 0~N회
       ├─ buildPhase2Prompt() → callReactionLLM()
       ├─ 자유 입력 / 쓰레드 답장 (replyTo → 해당 참모 우선 응답)
       └─ "다음" 버튼 → Phase 3
       ↓
  Phase 3: 계획 보고 — API 0회 (Phase 1과 함께 생성됨)
       ├─ Phase 3 메시지 애니메이션 + plan_reports 표시
       └─ 기대 포인트값 UI 표시
       ↓
  Phase 4: 군주 피드백 — AP 1 소비/발언, API 0~N회
       ├─ buildPhase4Prompt() → callReactionLLM()
       ├─ boost 가능, AP 0이면 스킵
       └─ "실행" 버튼 → Phase 5
       ↓
  Phase 5: 턴 실행 — API 1회
       ├─ 계획 실행 + NPC턴 (buildFactionAIPrompt → 배치 처리)
       ├─ advanceWorldTurn() → 포인트 충전, 부상 회복
       ├─ checkGameEnd() → 승패 판정
       └─ autoSave() → Phase 1 복귀
```

## 핵심 설계 원칙

1. **WorldState 중심**: 모든 게임 데이터는 `WorldState` 객체에 집중
2. **5-Phase 회의**: 상태보고→토론→계획→피드백→실행 사이클
3. **포인트 시스템**: AP(행동)/SP(전략)/MP(군사)/IP(내정)/DP(외교) 5종
4. **성채 체인**: 삼각 라인 배치 (~34개 성채), 본성 함락이 승패 조건
5. **쓰레드 대화**: 참모 발언 클릭 → 해당 주제로 쓰레드 대화
6. **순수 함수 분리**: `lib/game/` 내 함수들은 부작용 없는 순수 함수
7. **AI 프록시**: 클라이언트 → Next.js API Route → 외부 AI API (API 키 보호)
8. **NPC 배치 처리**: 2개 NPC 세력의 AI 결정을 한 번의 API 호출로 처리
9. **결정론적 폴백**: AI 호출 실패 시 안전한 기본 행동 (개발) 적용
10. **자동 저장**: 매 턴 Firebase에 자동 저장
11. **인라인 스타일**: CSS 모듈 없이 `style={{}}` + CSS 변수 조합

# 01. 리팩토링 상세 계획

## 목표

현재 `app/page.js` 845줄 단일 파일 JavaScript 프로젝트를 TypeScript 모듈형 아키텍처로 전환한다.
동작 변경 없이 구조만 개선한다 (behavior-preserving refactoring).

## 실행 단계

### B.1: TypeScript 셋업
- `tsconfig.json` 생성 (strict: true, paths alias `@/*`)
- TypeScript + React/Node 타입 패키지 설치

### B.2: 타입 정의 (`types/`)
- `types/game.ts`: GameState, City, General, Season, GameTask, GameEvent, StateChanges 등
- `types/chat.ts`: Emotion, Choice, AIResponse, ChatMessage, ConversationMessage

### B.3: 상수 추출 (`constants/`)
- `constants/initialState.ts`: INITIAL_STATE
- `constants/gameConstants.ts`: SEASONS, SEASON_ICON, 계절별 배수
- `constants/events.ts`: RANDOM_EVENTS 배열

### B.4: 라이브러리 함수 추출 (`lib/`)
- `lib/game/resourceCalculator.ts`: calcResources() 순수 함수
- `lib/game/stateManager.ts`: applyStateChanges() 순수 함수 변환
- `lib/game/eventSystem.ts`: checkEvents() 로직
- `lib/api/llmClient.ts`: callLLM() fetch + JSON 파싱
- `lib/prompts/systemPrompt.ts`: buildSystemPrompt()

### B.5: 커스텀 훅 추출 (`hooks/`)
- `hooks/useGameState.ts`: gameState, deltas, gameStateRef, applyChanges
- `hooks/useChatHistory.ts`: messages, convHistory, streamingText
- `hooks/useTurnSystem.ts`: advanceTurn, checkAndTriggerEvents
- `hooks/useTypewriter.ts`: typeText 애니메이션

### B.6: UI 컴포넌트 분리 (`components/game/`)
- TitleScreen.tsx, StatusBar.tsx, ChatBubble.tsx
- ChoicePanel.tsx, TaskPanel.tsx, GameContainer.tsx

### B.7: 엔트리포인트 전환
- app/page.tsx, app/layout.tsx, app/api/chat/route.ts

### B.8: 정리
- pendingTasks/tasks 이중 시스템 통합
- barrel export 생성
- `npm run build` 검증

## 의존성 순서

```
B.1 → B.2 → B.3 → B.4 → B.5 → B.6 → B.7 → B.8
```

## 검증

- `npm run build` 성공
- 기존 게임 플로우 수동 테스트 (타이틀 → 시작 → 선택 → 턴 진행 → 이벤트)

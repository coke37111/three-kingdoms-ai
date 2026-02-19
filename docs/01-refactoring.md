# 01. TypeScript 모듈형 리팩토링 (완료)

> 역사적 기록. `app/page.js` 845줄 단일 파일 JS → TypeScript 모듈형 아키텍처 전환.

## 완료된 작업

### TypeScript 셋업
- `tsconfig.json` (strict: true, paths alias `@/*`)
- TypeScript + React/Node 타입 패키지

### 타입 정의 (`types/`)
- `types/game.ts` — 게임 상태 타입
- `types/chat.ts` — 채팅/AI 응답 타입

### 상수 추출 (`constants/`)
- `constants/gameConstants.ts`
- `constants/factions.ts`, `constants/advisors.ts`, `constants/castles.ts`, `constants/skills.ts`

### 라이브러리 함수 (`lib/`)
- `lib/game/pointCalculator.ts` — 포인트 계산
- `lib/game/stateManager.ts` — 상태 변경
- `lib/game/combatSystem.ts` — 전투
- `lib/api/llmClient.ts` — LLM API 호출
- `lib/prompts/councilPrompt.ts` — 프롬프트 빌더

### 커스텀 훅 (`hooks/`)
- `hooks/useWorldState.ts`
- `hooks/useChatHistory.ts`
- `hooks/useWorldTurn.ts`
- `hooks/useTypewriter.ts`

### UI 컴포넌트 (`components/game/`)
- `GameContainer.tsx`, `CouncilChat.tsx`, `WorldStatus.tsx` 등

> 현행 아키텍처 상세는 [`docs/03-architecture.md`](./03-architecture.md) 참조.

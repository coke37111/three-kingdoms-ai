# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 언어 규칙

- 사용자와의 모든 대화는 **한국어**로 진행한다.
- 코드 주석, 커밋 메시지, PR 설명 등도 한국어를 사용한다.
- 변수명/함수명 등 코드 식별자는 영어를 유지한다.

## Project Overview

A multi-faction Three Kingdoms (삼국지) strategy game where the player acts as ruler Liu Bei (유비) and manages an autonomous council of 5 AI advisors powered by the Anthropic Claude API. Features advisor autonomous actions, approval system, threaded conversations, situation briefings, 4 factions with AI-driven NPC rulers, combat, diplomacy, save/load, and victory/defeat conditions. The game is in Korean.

## Commands

```bash
npm run dev          # Start dev server (Turbopack) at localhost:3000
npm run dev:webpack  # Start dev server (webpack fallback)
npm run build        # Production build
npm run start        # Start production server
```

No test framework or linter is configured.

## Architecture

This is a Next.js 14 App Router project using **TypeScript** with **Turbopack** bundler:

### Entry Points (`app/`)
- **`app/page.tsx`** — Thin wrapper that renders `GameContainer`
- **`app/layout.tsx`** — Root layout with Korean lang, Google Fonts
- **`app/api/chat/route.ts`** — Server-side API proxy to Anthropic Messages API (`claude-sonnet-4-20250514`)
- **`app/api/stt/route.ts`** — Speech-to-Text API 엔드포인트
- **`app/api/tts/route.ts`** — Text-to-Speech API 엔드포인트
- **`app/api/debug-env/route.ts`** — 디버그 환경 변수 확인
- **`app/globals.css`** — CSS custom properties (dark theme with gold accents), `typingDot` animation

### Types (`types/`)
- **`types/game.ts`** — `GameState`, `City`, `General`, `Season`, `Faction`, `WorldState`, `BattleResult`, `SaveData`, `DiplomaticRelation`, `GameEndResult`, `StateChanges`, etc.
- **`types/chat.ts`** — `Emotion`, `ChatMessage`, `ConversationMessage`, `FactionAIResponse`
- **`types/council.ts`** — `AdvisorState`, `AdvisorRole`, `CouncilMessage`, `CouncilResponse`, `AdvisorAction`, `ApprovalRequest`, `ThreadMessage`, `SituationBriefing`, `EmotionalDirective`, `AdvisorStatsDelta`

### Constants (`constants/`)
- **`constants/factions.ts`** — `INITIAL_FACTIONS` (4 factions: 유비/조조/손권/원소), `INITIAL_RELATIONS`, `FACTION_NAMES`
- **`constants/advisors.ts`** — `INITIAL_ADVISORS` (5인 참모), `ZHANGFEI_INFO` (장비 특수 캐릭터)
- **`constants/gameConstants.ts`** — `SEASONS`, `SEASON_ICON`, `SEASON_FOOD_MULTIPLIER`, `TROOP_FOOD_COST_PER_UNIT`
- **`constants/worldMap.ts`** — `WORLD_MAP` (20 cities with adjacency, terrain, defense bonuses)
- **`constants/events.ts`** — `RANDOM_EVENTS` array
- **`constants/initialState.ts`** — (레거시) `INITIAL_STATE` single-faction

### Library Functions (`lib/`)
- **`lib/game/combatSystem.ts`** — `resolveBattle()`, `generateBattleNarrative()`
- **`lib/game/diplomacySystem.ts`** — `executeDiplomaticAction()`, `updateRelation()`, `advanceTreaties()`
- **`lib/game/resourceCalculator.ts`** — Pure function `calcResources()`
- **`lib/game/stateManager.ts`** — Pure function `applyStateChanges()`
- **`lib/game/eventSystem.ts`** — `checkEvents()`
- **`lib/game/victorySystem.ts`** — `checkGameEnd()`
- **`lib/game/situationDetector.ts`** — `detectSituation()` — Phase 0 정세 감지 (긴급/평상시)
- **`lib/game/saveSystem.ts`** — `autoSave()`, `loadAutoSave()`, `hasAutoSave()` — Firebase Firestore 기반
- **`lib/api/llmClient.ts`** — `callCouncilLLM()` — council-specific LLM fetch wrapper
- **`lib/api/llmCache.ts`** — 서버 측 LLM 응답 캐시 (SHA-256 키, 60분 TTL, 2000항목, 디스크 영구 저장)
- **`lib/prompts/councilPrompt.ts`** — `buildCouncilPrompt()`, `buildCouncilResultPrompt()` — 참모 회의 프롬프트 (메인)
- **`lib/prompts/factionAIPrompt.ts`** — `buildFactionAIPrompt()`, `parseNPCResponse()` — NPC 배치 프롬프트
- **`lib/prompts/systemPrompt.ts`** — (레거시) `buildSystemPrompt()`, `buildWorldSystemPrompt()`
- **`lib/firebase/config.ts`** — Firebase 앱 싱글톤 초기화
- **`lib/firebase/auth.ts`** — Google 인증 헬퍼
- **`lib/firebase/firestore.ts`** — Firestore CRUD 함수
- **`lib/voice/sttEngine.ts`** — Speech-to-Text 엔진
- **`lib/voice/ttsEngine.ts`** — Text-to-Speech 엔진
- **`lib/voice/emotionVoiceMap.ts`** — 감정별 음성 매핑
- **`lib/voice/types.ts`** — 음성 시스템 타입 정의
- **`lib/utils/textFormatter.tsx`** — 숫자 컬러링 등 텍스트 유틸리티

### Custom Hooks (`hooks/`)
- **`hooks/useWorldState.ts`** — Multi-faction WorldState, player/NPC faction accessors, state changes
- **`hooks/useWorldTurn.ts`** — World turn advancement (all factions resource calc), event checking, treaty aging
- **`hooks/useChatHistory.ts`** — Messages, conversation history
- **`hooks/useAuth.ts`** — Firebase Auth (Google login)
- **`hooks/usePreferences.ts`** — User preferences (LLM provider)
- **`hooks/useTypewriter.ts`** — Character-by-character typing animation
- **`hooks/useVoice.ts`** — Voice input (STT)
- **`hooks/useGameState.ts`** — (레거시) single-faction state
- **`hooks/useTurnSystem.ts`** — (레거시) single-faction turn system

### UI Components (`components/game/`)
- **`GameContainer.tsx`** — ★ Main orchestrator (참모 회의, 도입 서사, NPC turns, diplomacy, save/load, game end)
- **`CouncilChat.tsx`** — ★ Council meeting chat (messages, threads, typing indicator, auto actions, approvals)
- **`BriefingPanel.tsx`** — ★ Phase 0 situation briefing (urgent events, emotional directives)
- **`TitleScreen.tsx`** — Start screen with new game / continue / load buttons
- **`StatusBar.tsx`** — Resource display with delta animations
- **`ChatBubble.tsx`** — System message bubbles
- **`TaskPanel.tsx`** — Event-driven task list
- **`WorldStatus.tsx`** — Full-screen faction overview modal
- **`FactionBanner.tsx`** — Faction icon/name display
- **`TurnNotification.tsx`** — NPC turn action summaries
- **`BattleReport.tsx`** — Battle result display
- **`DiplomacyPanel.tsx`** — Diplomatic actions per faction
- **`SaveLoadPanel.tsx`** — 5-slot save/load modal
- **`GameEndScreen.tsx`** — Victory/defeat screen with stats
- **`UserBadge.tsx`** — 로그인 사용자 배지 표시
- **`LoginPanel.tsx`** — Firebase/Google 로그인 모달
- **`VoiceSettingsModal.tsx`** — 음성 입출력 설정 모달

### Game Loop — 4-Phase System

```
Phase 0: 정세 브리핑
  - 첫 턴: 제갈량 도입 서사 (고정 메시지, API 미사용, speedDecay 0.8)
  - 긴급 상황: BriefingPanel → 감정 방향 선택
  - 평상시: 자동 스킵 → Phase 1 직행

Phase 1: 참모 회의 (API 1회)
  - buildCouncilPrompt() → callCouncilLLM()
  - CouncilResponse: council_messages + auto_actions + approval_requests
  - 자율 행동의 state_changes 즉시 적용
  - animateCouncilMessages(): 타이핑 인디케이터 + 순차 표시

Phase 2: 플레이어 입력 (선택적 API 0~1회)
  - 결재 승인/거부 → buildCouncilResultPrompt()
  - 자유 입력 / 쓰레드 답장 (replyTo → 해당 참모 우선 응답)
  - "다음 턴" → Phase 3

Phase 3: NPC 턴 + 턴 전진 (API 1회)
  - processNPCTurns() → buildFactionAIPrompt()
  - advanceWorldTurn() → 자원/계절/조약 갱신
  - checkGameEnd() → 승패 판정 → Phase 0 복귀
```

### 인증과 저장
- 인증(Google 로그인)과 저장은 동일 개념 — 로그인 = 해당 계정의 저장 데이터로 플레이
- 첫 방문: Google 로그인 → "출사표를 올리다" (새 게임)
- 재방문(autosave 존재): "이어하기" + "새로 시작하기" 선택
- 모든 저장은 Firebase Firestore에 uid 기반으로 저장

### Key Patterns

- **참모 회의 시스템**: 5인 참모(제갈량/관우/미축/간옹/조운)가 자율 행동 + 결재 요청, A/B/C 선택지 없음
- **쓰레드 대화**: 참모 발언 클릭 → 해당 주제로 쓰레드 대화, replyTo로 지정 참모 우선 응답
- **타이핑 인디케이터**: 메시지 표시 전 "..." 애니메이션, 글자수 × 50ms, 참모 간 0.5~2초 딜레이
- **WorldState architecture**: `WorldState` contains `Faction[]` (player + 3 NPCs), `DiplomaticRelation[]`, turn order
- **AI communication**: `buildCouncilPrompt()` sends full world context to council AI; `buildFactionAIPrompt()` batches NPC decisions into one API call
- **NPC fallback**: If NPC AI call fails, deterministic actions (development) are applied
- **Conversation history**: Trimmed to last 20 messages
- **All styling is inline** using `style={{}}` objects
- **CSS variables** in `globals.css` `:root` are the source of truth
- **Path aliases**: `@/*` maps to project root via `tsconfig.json`
- **SSR safety**: Firebase Firestore 기반 저장 (localStorage 미사용)
- **Turbopack**: `next dev --turbo` 사용 (webpack HMR 캐시 깨짐 방지)

## 문서 규칙

- **`plans/`** — 기능 구현 전 작성하는 **계획 문서** (설계, 의존성, 실행 단계)
- **`docs/`** — 구현 완료 후 현재 상태를 반영하는 **현행 문서** (아키텍처, 시스템, 데이터 모델)
- 새 기능 추가 시: `plans/`에 계획 작성 → 구현 → `docs/`에 현행 반영

### plans/
- **`plans/01-refactoring.md`** — TypeScript 전환 + 모듈 분리 (완료)
- **`plans/02-gameplay-expansion.md`** — 다수 군주/전투/외교/세이브/승리 조건 확장 (완료)
- **`plans/03-renewal.md`** — 참모 회의 시스템 전환 (구현 완료, 계획 문서 미작성)

### docs/
- **`docs/03-architecture.md`** — 기술 스택 (Turbopack), 디렉토리 구조, Phase 0~3 데이터 흐름, 설계 원칙
- **`docs/04-game-systems.md`** — 4단계 Phase 턴 시스템, 참모 회의, 자율 행동, 결재, 쓰레드, 정세 브리핑, 도입 서사
- **`docs/05-ai-system.md`** — 참모 회의 AI (Phase 1), 참모 반응 AI (Phase 2), NPC AI (Phase 3), 캐시, 파싱
- **`docs/06-auth-and-save.md`** — Firebase 인증, Firestore 저장, 사용자 설정
- **`docs/07-ui-components.md`** — CSS 변수, CouncilChat, BriefingPanel, 컴포넌트 구조, 스타일 규칙
- **`docs/08-data-model.md`** — game.ts + chat.ts + council.ts 타입, 참모/세력/외교 상수 데이터
- **`docs/09-differentiation.md`** — 차별점 및 혁신 요소, AI 네이티브 게임 특성, 기존 게임 비교

## Environment

Requires `.env.local` with `ANTHROPIC_API_KEY=sk-ant-...` (not committed to git).

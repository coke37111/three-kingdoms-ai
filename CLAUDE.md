# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 언어 규칙

- 사용자와의 모든 대화는 **한국어**로 진행한다.
- 코드 주석, 커밋 메시지, PR 설명 등도 한국어를 사용한다.
- 변수명/함수명 등 코드 식별자는 영어를 유지한다.

## Project Overview

A multi-faction Three Kingdoms (삼국지) strategy game where the player acts as ruler Liu Bei (유비) and interacts with AI advisor Zhuge Liang (제갈량) powered by the Anthropic Claude API. Features 4 factions with AI-driven NPC rulers, combat, diplomacy, save/load, and victory/defeat conditions. The game is in Korean.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run start    # Start production server
```

No test framework or linter is configured.

## Architecture

This is a Next.js 14 App Router project using **TypeScript** with a modular architecture:

### Entry Points (`app/`)
- **`app/page.tsx`** — Thin wrapper that renders `GameContainer`
- **`app/layout.tsx`** — Root layout with Korean lang, Google Fonts
- **`app/api/chat/route.ts`** — Server-side API proxy to Anthropic Messages API (`claude-sonnet-4-20250514`)
- **`app/globals.css`** — CSS custom properties (dark theme with gold accents)

### Types (`types/`)
- **`types/game.ts`** — `GameState`, `City`, `General`, `Season`, `Faction`, `WorldState`, `BattleResult`, `SaveData`, `DiplomaticRelation`, `GameEndResult`, etc.
- **`types/chat.ts`** — `Emotion`, `Choice`, `AIResponse`, `ChatMessage`, `ConversationMessage`, `FactionAIResponse`

### Constants (`constants/`)
- **`constants/initialState.ts`** — `INITIAL_STATE` (single-faction legacy)
- **`constants/gameConstants.ts`** — `SEASONS`, `SEASON_ICON`, `SEASON_FOOD_MULTIPLIER`
- **`constants/events.ts`** — `RANDOM_EVENTS` array
- **`constants/factions.ts`** — `INITIAL_FACTIONS` (4 factions: 유비/조조/손권/원소), `INITIAL_RELATIONS`, `FACTION_NAMES`
- **`constants/worldMap.ts`** — `WORLD_MAP` (20 cities with adjacency, terrain, defense bonuses)

### Library Functions (`lib/`)
- **`lib/game/resourceCalculator.ts`** — Pure function `calcResources()`
- **`lib/game/stateManager.ts`** — Pure function `applyStateChanges()`
- **`lib/game/eventSystem.ts`** — `checkEvents()`
- **`lib/game/combatSystem.ts`** — `resolveBattle()`, `generateBattleNarrative()` — battle power calculation using general stats + terrain
- **`lib/game/diplomacySystem.ts`** — `executeDiplomaticAction()`, `updateRelation()`, `advanceTreaties()` — 6 diplomatic actions, relation scoring
- **`lib/game/saveSystem.ts`** — `saveGame()`, `loadGame()`, `autoSave()`, `listSaveSlots()` — localStorage-based, 5 slots + autosave
- **`lib/game/victorySystem.ts`** — `checkGameEnd()` — victory (천하통일/천명) and defeat (멸망/파산) conditions
- **`lib/api/llmClient.ts`** — `callLLM()` fetch wrapper
- **`lib/prompts/systemPrompt.ts`** — `buildSystemPrompt()`, `buildWorldSystemPrompt()` (includes faction/diplomacy context)
- **`lib/prompts/factionAIPrompt.ts`** — `buildFactionAIPrompt()`, `parseNPCResponse()` — batched NPC decision prompt

### Custom Hooks (`hooks/`)
- **`hooks/useWorldState.ts`** — Multi-faction WorldState, player/NPC faction accessors, state changes
- **`hooks/useWorldTurn.ts`** — World turn advancement (all factions resource calc), event checking, treaty aging
- **`hooks/useGameState.ts`** — Legacy single-faction state (kept for compatibility)
- **`hooks/useChatHistory.ts`** — Messages, conversation history, streaming text
- **`hooks/useTurnSystem.ts`** — Legacy single-faction turn system
- **`hooks/useTypewriter.ts`** — Character-by-character typing animation

### UI Components (`components/game/`)
- **`GameContainer.tsx`** — Main orchestrator (WorldState, NPC turns, diplomacy, save/load, game end)
- **`TitleScreen.tsx`** — Start screen with new game / continue / load buttons
- **`StatusBar.tsx`** — Resource display with delta animations
- **`ChatBubble.tsx`** — Chat messages (user/assistant/system)
- **`ChoicePanel.tsx`** — Strategic choice buttons with risk indicators
- **`TaskPanel.tsx`** — Event-driven task list
- **`WorldStatus.tsx`** — Full-screen faction overview modal (resources, cities, relations)
- **`FactionBanner.tsx`** — Faction icon/name display
- **`TurnNotification.tsx`** — NPC turn action summaries
- **`BattleReport.tsx`** — Battle result display (casualties, captures, conquests)
- **`DiplomacyPanel.tsx`** — Diplomatic actions per faction (alliance, trade, war declaration, etc.)
- **`SaveLoadPanel.tsx`** — 5-slot save/load modal with delete
- **`GameEndScreen.tsx`** — Victory/defeat screen with stats

### Game Loop

1. Player starts game (or loads save) → initial situation report with choices from AI
2. Player selects a choice (or sends free text) → AI responds with `state_changes` JSON
3. `applyStateChanges()` updates player faction state
4. NPC factions act (batched AI call or deterministic fallback) → notifications shown
5. Turn advances → all factions get seasonal resources → treaties age → random events check
6. Victory/defeat conditions checked → new AI report with choices

### 인증과 저장
- 인증(Google 로그인)과 저장은 동일 개념 — 로그인 = 해당 계정의 저장 데이터로 플레이
- 첫 방문: Google 로그인 → "출사표를 올리다" (새 게임)
- 재방문(autosave 존재): "이어하기" + "새로 시작하기" 선택
- 모든 저장은 Firebase Firestore에 uid 기반으로 저장

### Key Patterns

- **WorldState architecture**: `WorldState` contains `Faction[]` (player + 3 NPCs), `DiplomaticRelation[]`, turn order
- **AI communication**: `buildWorldSystemPrompt()` sends full world context to advisor AI; `buildFactionAIPrompt()` batches NPC decisions into one API call
- **NPC fallback**: If NPC AI call fails, deterministic actions (development) are applied
- **Conversation history**: Trimmed to last 20 messages
- **Typing animation**: `typeText()` renders AI responses character-by-character
- **All styling is inline** using `style={{}}` objects
- **CSS variables** in `globals.css` `:root` are the source of truth
- **Path aliases**: `@/*` maps to project root via `tsconfig.json`
- **SSR safety**: `saveSystem.ts` guards all `localStorage` access with `typeof window !== "undefined"`

## 문서 규칙

- **`plans/`** — 기능 구현 전 작성하는 **계획 문서** (설계, 의존성, 실행 단계)
- **`docs/`** — 구현 완료 후 현재 상태를 반영하는 **현행 문서** (아키텍처, 시스템, 데이터 모델)
- 새 기능 추가 시: `plans/`에 계획 작성 → 구현 → `docs/`에 현행 반영

### plans/
- **`plans/01-refactoring.md`** — TypeScript 전환 + 모듈 분리 (완료)
- **`plans/02-gameplay-expansion.md`** — 다수 군주/전투/외교/세이브/승리 조건 확장 (완료)

### docs/
- **`docs/03-architecture.md`** — 기술 스택, 디렉토리 구조, 데이터 흐름, 설계 원칙
- **`docs/04-game-systems.md`** — 턴, 자원, 전투, 외교, 이벤트, 승패 시스템
- **`docs/05-ai-system.md`** — AI 모델, 프롬프트, 캐시, JSON 파싱
- **`docs/06-auth-and-save.md`** — Firebase 인증, Firestore 저장, 사용자 설정
- **`docs/07-ui-components.md`** — CSS 변수, 컴포넌트 구조, 스타일 규칙
- **`docs/08-data-model.md`** — 타입, 인터페이스, 상수 데이터
- **`docs/09-differentiation.md`** — 차별점 및 혁신 요소, AI 네이티브 게임 특성, 기존 게임 비교

## Environment

Requires `.env.local` with `ANTHROPIC_API_KEY=sk-ant-...` (not committed to git).

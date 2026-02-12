# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Plans

- **`plans/01-refactoring.md`** — TypeScript 전환 + 모듈 분리 리팩토링 계획 (완료)
- **`plans/02-gameplay-expansion.md`** — 다수 군주/전투/외교/세이브/승리 조건 확장 계획 (완료)

## Environment

Requires `.env.local` with `ANTHROPIC_API_KEY=sk-ant-...` (not committed to git).

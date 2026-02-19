# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 언어 규칙

- 사용자와의 모든 대화는 **한국어**로 진행한다.
- 코드 주석, 커밋 메시지, PR 설명 등도 한국어를 사용한다.
- 변수명/함수명 등 코드 식별자는 영어를 유지한다.

## Project Overview

삼국지(三國志) 전략 게임. 유비(플레이어)가 4인 AI 참모 회의를 통해 전략을 수립하고, 포인트 시스템(AP/SP/MP/IP/DP) 기반으로 3세력(유비/조조/손권) 간 성채 쟁탈전을 벌이는 대화 중심 전략 게임. Korean UI.

## Commands

```bash
npm run dev          # Start dev server (Turbopack) at localhost:3000
npm run dev:webpack  # Start dev server (webpack fallback)
npm run build        # Production build
npm run start        # Start production server
```

No test framework or linter is configured.

## Architecture

Next.js 14 App Router, **TypeScript**, **Turbopack** bundler.

### Entry Points (`app/`)
- **`app/page.tsx`** — Thin wrapper → `GameContainer`
- **`app/layout.tsx`** — Root layout (Korean, Google Fonts)
- **`app/api/chat/route.ts`** — LLM API proxy (Anthropic/OpenAI)
- **`app/api/stt/route.ts`** — Speech-to-Text
- **`app/api/tts/route.ts`** — Text-to-Speech
- **`app/globals.css`** — CSS custom properties (dark theme, gold accents)

### Types (`types/`)
- **`types/game.ts`** — `FactionPoints`, `PointDeltas`, `Castle`, `Facilities`, `RulerLevel`, `SkillNode`, `WoundedPool`, `Faction`, `WorldState`, `BattleResult`, `StateChanges`, `SaveData`, `GameEndResult`
- **`types/chat.ts`** — `Emotion`, `ChatMessage`, `ConversationMessage`, `LLMProvider`
- **`types/council.ts`** — `AdvisorState`, `AdvisorRole`(전략/군사/외교/내정), `MeetingPhase`(1~5), `CouncilMessage`, `StatusReport`, `PlanReport`, `CouncilResponse`, `CouncilReactionResponse`, `ThreadMessage`, `AdvisorStatsDelta`

### Constants (`constants/`)
- **`constants/factions.ts`** — `INITIAL_FACTIONS` (3세력: 유비/조조/손권), `INITIAL_RELATIONS`, `FACTION_NAMES`
- **`constants/advisors.ts`** — `INITIAL_ADVISORS` (4인: 제갈량/관우/방통/미축)
- **`constants/castles.ts`** — `INITIAL_CASTLES` (35개 성채), `CAPITAL_CASTLES`, `getCastle()`
- **`constants/skills.ts`** — `SKILL_TREE` (13노드: AP/MP/IP/DP 카테고리)
- **`constants/gameConstants.ts`** — `TURN_LIMIT`(120), `AP_CARRYOVER_RATE`, `WOUND_RECOVERY_TURNS`, `DEPLOYMENT_PER_LEVEL`, 포인트/전투/시설 상수

### Library Functions (`lib/`)
- **`lib/game/pointCalculator.ts`** — `calcPointsForTurn()`, `calculateMP()`, `createWoundedPool()` — 매턴 포인트 충전/부상 회복
- **`lib/game/combatSystem.ts`** — `resolveBattle()` — MP 기반 전투, 야전/공성/수성, 부상병 시스템
- **`lib/game/stateManager.ts`** — `applyStateChanges()` — PointDeltas/성채/시설/스킬/레벨업 적용
- **`lib/game/diplomacySystem.ts`** — `executeDiplomaticAction()`, `scoreToLabel()`, `getRelationBetween()` — -10~+10 점수 기반
- **`lib/game/victorySystem.ts`** — `checkGameEnd()` — 본성 함락 기반 승패
- **`lib/game/saveSystem.ts`** — Firebase Firestore 기반 저장/로드 (SAVE_VERSION 2)
- **`lib/api/llmClient.ts`** — `callCouncilLLM()` (Phase 1+3), `callReactionLLM()` (Phase 2/4)
- **`lib/api/llmCache.ts`** — 서버 측 LLM 응답 캐시 (SHA-256, 60분 TTL, 2000항목)
- **`lib/prompts/councilPrompt.ts`** — `buildPhase1And3Prompt()`, `buildPhase2Prompt()`
- **`lib/prompts/factionAIPrompt.ts`** — `buildFactionAIPrompt()`, `parseNPCResponse()` — 포인트 기반 NPC AI
- **`lib/firebase/`** — Firebase config, auth, firestore
- **`lib/voice/`** — STT/TTS 엔진, 감정 음성 매핑

### Custom Hooks (`hooks/`)
- **`hooks/useWorldState.ts`** — WorldState 관리, `applyPlayerChanges()`, `applyNPCChanges()`
- **`hooks/useWorldTurn.ts`** — `advanceWorldTurn()` — 전 세력 포인트 충전, 부상 회복
- **`hooks/useChatHistory.ts`** — 메시지/대화 이력
- **`hooks/useAuth.ts`** — Firebase Auth (Google)
- **`hooks/usePreferences.ts`** — LLM 제공자 설정
- **`hooks/useTypewriter.ts`** — 타이핑 애니메이션
- **`hooks/useVoice.ts`** — 음성 입력 (STT)

### UI Components (`components/game/`)
- **`GameContainer.tsx`** — ★ 3-Phase 게임 루프 오케스트레이터
- **`CouncilChat.tsx`** — ★ 참모 회의 채팅 (메시지, 쓰레드, Phase 배지, 타이핑)
- **`WorldStatus.tsx`** — 천하 정세 모달 (포인트, 성채, 전선 현황)
- **`TitleScreen.tsx`** — 시작 화면
- **`ChatBubble.tsx`** — 시스템 메시지
- **`TurnNotification.tsx`** — NPC 턴 결과 알림
- **`BattleReport.tsx`** — 전투 결과 (부상병 포함)
- **`GameEndScreen.tsx`** — 승리/패배 화면
- **`SaveLoadPanel.tsx`** — 5슬롯 저장/로드
- **`UserBadge.tsx`** — 로그인 배지
- **`LoginPanel.tsx`** — Firebase/Google 로그인
- **`FactionBanner.tsx`** — 세력 배너
- **`AdvisorBar.tsx`** — 참모 충성도/열정 표시
- **`VoiceSettingsModal.tsx`** — 음성 설정

### Game Loop — 3-Phase Meeting System

```
Phase 1: 보고 (자동, API 1회)
  → buildPhase1And3Prompt() → callCouncilLLM()
  → Phase 1(상태보고) 메시지 + 구분선 + Phase 3(계획보고) 메시지 이어서 표시
  → state_changes 적용

Phase 2: 토론 (AP 1 소비/발언, API 0~N회)
  → buildPhase2Prompt() → callReactionLLM()
  → 질문, 지시, 피드백, boost 통합
  → replyTo 쓰레드 유지, AP 0이면 스킵
  → "실행" 버튼 → Phase 3

Phase 3: 실행 (자동)
  → 계획 실행, NPC턴, 포인트 충전, 승패 판정
  → Phase 1 복귀
```

### 포인트 시스템 (5종)
- **AP** (행동 포인트): 발언 시 소비, 매턴 이월(50%) + 충전
- **SP** (전략 포인트): 스킬 트리 해금용, 매턴 소량 자동 충전
- **MP** (군사 포인트): troops × training × morale, 전투력 결정
- **IP** (내정 포인트): 시설 레벨 기반 충전, 시설/모병/훈련에 소비
- **DP** (외교 포인트): 외교 행동에 소비

### 성채 시스템
- 35개 성채, 삼각 라인 배치 (유비↔조조, 유비↔손권, 손권↔조조)
- 등급: 본성(방어 3.0), 요새(2.0~2.5), 일반(1.5)
- 본성 함락 = 승리/패배 조건

### Key Patterns

- **4인 참모**: 제갈량(전략), 관우(군사), 방통(외교), 미축(내정)
- **쓰레드 대화**: 참모 발언 클릭 → replyTo로 해당 참모 우선 응답
- **타이핑 인디케이터**: "..." 애니메이션, 글자수 × 30ms
- **WorldState**: `Faction[]` (player + 2 NPCs), `Castle[]`, `DiplomaticRelation[]`
- **StateChanges**: `point_deltas`, `castle_updates`, `facility_upgrades`, `skill_unlocks`, `xp_gain`
- **NPC fallback**: AI 호출 실패 시 결정론적 행동 (개발)
- **인라인 스타일**: `style={{}}` 사용, CSS 변수 기반
- **SSR safety**: 게임 데이터는 Firebase Firestore 기반. 보조 데이터(토큰 사용량, 게임 활성 상태)만 localStorage/sessionStorage 사용 (SSR 가드 적용)

## 문서 규칙

- **`plans/`** — 기능 구현 전 **계획 문서**
- **`docs/`** — 구현 완료 후 **현행 문서**

## Environment

Requires `.env.local` with `ANTHROPIC_API_KEY=sk-ant-...` (not committed to git).

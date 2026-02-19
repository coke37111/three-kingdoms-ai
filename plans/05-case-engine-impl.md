# 05. 케이스 엔진 구현 (Phase 1/3 분리)

## 현재 상태

케이스 데이터는 완성되어 있음. **엔진 로직만 누락.**

```
lib/council/
  ✅ types.ts       — GameSituation 타입, CaseDefinition, Phase3CaseDefinition, TurnContext
  ✅ phase1Cases.ts — Phase 1 케이스 ~175개 (ALL_PHASE1_CASES export)
  ✅ phase3Cases.ts — Phase 3 케이스 ~150개 (ALL_PHASE3_CASES, PHASE2_KEYWORD_MAPPINGS export)
  ❌ engine.ts      — analyzeGameSituation() + 케이스 매칭 엔진 (미구현)
```

`GameContainer.tsx`의 `doPhase1And3()`는 항상 LLM API를 호출함. 케이스 엔진 미연동.

## 목표

1. `lib/council/engine.ts` 구현 — `analyzeGameSituation()` + `runPhase1FromCases()` + `runPhase3FromCases()`
2. `GameContainer.tsx` 수정 — Phase 1/3을 케이스 우선, LLM 폴백 구조로 전환

---

## A. `lib/council/engine.ts` 구현

### A.1 `analyzeGameSituation(world, advisors, turnCtx)`

WorldState → GameSituation 변환 함수. `types.ts`의 `GameSituation` 인터페이스를 그대로 채운다.

```typescript
import type { WorldState } from "@/types/game";
import type { AdvisorState } from "@/types/council";
import type { GameSituation, TurnContext } from "./types";
import { scoreToLabel, getRelationBetween } from "@/lib/game/diplomacySystem";
import { getFacilityUpgradeCost } from "@/constants/gameConstants";
import { SKILL_TREE } from "@/constants/skills";

export function analyzeGameSituation(
  world: WorldState,
  advisors: AdvisorState[],
  turnCtx?: TurnContext,
): GameSituation
```

**채워야 할 필드별 계산식:**

| 필드 | 계산 |
|------|------|
| `turn` | `world.currentTurn` |
| `gamePhase` | turn ≤ 30 → "early", ≤ 80 → "mid", else "late" |
| `military.troops` | `player.points.mp_troops` |
| `military.training` | `player.points.mp_training` |
| `military.morale` | `player.points.mp_morale` |
| `military.mp` | `player.points.mp` |
| `military.deploymentCap` | `player.rulerLevel.deploymentCap` |
| `military.troopsCritical` | `troops < 10000` |
| `military.troopShortage` | `troops < 20000` |
| `military.troopsAdequate` | `troops >= 20000 && troops <= 50000` |
| `military.troopsAbundant` | `troops > 50000` |
| `military.troopsAtCap` | `troops >= deploymentCap` |
| `military.lowTraining` | `training < 0.5` |
| `military.midTraining` | `training >= 0.5 && training <= 0.7` |
| `military.highTraining` | `training > 0.7` |
| `military.maxTraining` | `training > 0.9` |
| `military.lowMorale` | `morale < 0.8` |
| `military.highMorale` | `morale > 1.1` |
| `military.woundedRecovering` | `player.woundedPool.reduce((s,w) => s + w.amount, 0)` |
| `military.woundedTurnsLeft` | `Math.max(...player.woundedPool.map(w => w.recoveryTurns), 0)` |
| `economy.ip` | `player.points.ip` |
| `economy.ipCap` | `player.points.ip_cap` |
| `economy.ipRegen` | `player.points.ip_regen` |
| `economy.ipCritical` | `ip < 5` |
| `economy.ipLow` | `ip < 15` |
| `economy.ipAdequate` | `ip >= 15 && ip <= 50` |
| `economy.ipRich` | `ip > 50` |
| `economy.ipAtCap` | `ip >= ipCap` |
| `economy.ipNearCap` | `ip >= ipCap * 0.9` |
| `economy.marketLv` | `player.facilities.market` |
| `economy.farmLv` | `player.facilities.farm` |
| `economy.bankLv` | `player.facilities.bank` |
| `economy.noFacilities` | `market === 0 && farm === 0 && bank === 0` |
| `economy.canUpgrade` | `ip >= getFacilityUpgradeCost(Math.min(market, farm, bank))` |
| `economy.marketUpgradeCost` | `getFacilityUpgradeCost(market)` |
| `economy.farmUpgradeCost` | `getFacilityUpgradeCost(farm)` |
| `economy.bankUpgradeCost` | `getFacilityUpgradeCost(bank)` |
| `economy.facilityImbalance` | `Math.abs(market - farm) >= 3` |
| `economy.highIncome` | `ipRegen >= 20` |
| `economy.lowIncome` | `ipRegen <= 5` |
| `diplomacy.dp` | `player.points.dp` |
| `diplomacy.dpNone` | `dp === 0` |
| `diplomacy.dpLow` | `dp < 2` |
| `diplomacy.dpAdequate` | `dp >= 2 && dp <= 4` |
| `diplomacy.dpRich` | `dp >= 5` |
| `diplomacy.relations` | world.relations 필터 후 매핑 (아래 참고) |
| `diplomacy.allHostile` | 모든 relation.score < -3 |
| `diplomacy.anyAllied` | 어떤 relation.score >= 7 |
| `diplomacy.anyFriendly` | 어떤 relation.score > 3 |
| `diplomacy.enemiesFriendly` | NPC 세력끼리의 관계 score > 3 (이간 기회) |
| `strategic.overallStrength` | 아래 기준 참고 |
| `strategic.biggestThreat` | 최대 mp를 가진 적 세력 |
| `strategic.weakestEnemy` | 최소 mp를 가진 적 세력 |
| `strategic.castleCount` | `player.castles.length` |
| `strategic.totalCastles` | `world.castles.length` |
| `strategic.enemyCastles` | `Record<factionId, castleCount>` |
| `strategic.adjacentEnemyCastles` | 우리 성채에 인접한 적 성채 목록 |
| `strategic.adjacentOurCastles` | 적 성채에 인접한 우리 성채 목록 |
| `strategic.recentBattle` | `turnCtx?.lastTurnBattle ?? false` |
| `strategic.recentBattleWon` | `turnCtx?.lastTurnBattleWon ?? false` |
| `strategic.recentBattleLost` | `turnCtx?.lastTurnBattleLost ?? false` |
| `strategic.recentCastleGained` | `turnCtx?.lastTurnCastleGained ?? false` |
| `strategic.recentCastleLost` | `turnCtx?.lastTurnCastleLost ?? false` |
| `strategic.recentInvasion` | `turnCtx?.lastTurnInvasion ?? false` |
| `strategic.recentEvent` | `turnCtx?.lastTurnEvents.length > 0` |
| `strategic.recentEventTypes` | `turnCtx?.lastTurnEvents ?? []` |
| `strategic.consecutiveWins` | `turnCtx?.consecutiveWins ?? 0` |
| `strategic.consecutiveLosses` | `turnCtx?.consecutiveLosses ?? 0` |
| `strategic.enemyNearCapital` | 우리 본성의 adjacentCastles 중 적 소유 존재 |
| `strategic.nearEnemyCapital` | 적 본성의 adjacentCastles 중 우리 소유 존재 |
| `strategic.leveledUp` | `turnCtx?.lastLevelUp ?? false` |
| `strategic.skillUnlocked` | `turnCtx?.lastSkillUnlock ?? false` |
| `strategic.spCanUnlock` | `player.points.sp >= Math.min(...SKILL_TREE.map(s => s.cost))` |
| `strategic.rulerLevel` | `player.rulerLevel.level` |
| `strategic.sp` | `player.points.sp` |
| `advisorMood` | advisors 배열을 순회하여 Record 구성 |

**overallStrength 기준:**
```typescript
const playerMP = player.points.mp;
const maxEnemyMP = Math.max(...npcFactions.map(f => f.points.mp));
const ratio = playerMP / Math.max(1, maxEnemyMP);
// dominant > 1.5, advantage > 1.2, balanced > 0.8, disadvantage > 0.5, critical <= 0.5
```

**diplomacy.relations 구성:**
```typescript
world.relations
  .filter(r => r.factionA === "liu_bei" || r.factionB === "liu_bei")
  .map(r => {
    const otherId = r.factionA === "liu_bei" ? r.factionB : r.factionA;
    const other = world.factions.find(f => f.id === otherId)!;
    return {
      target: other.rulerName,
      targetId: otherId,
      score: r.score,
      label: scoreToLabel(r.score),
      isHostile: r.score < -3,
      isUnfriendly: r.score >= -3 && r.score < 0,
      isNeutral: r.score >= 0 && r.score <= 3,
      isFriendly: r.score > 3,
      isAllied: r.score >= 7,
    };
  })
```

**enemiesFriendly (이간 기회):**
```typescript
// NPC 세력 간 관계 확인
const npcIds = npcFactions.map(f => f.id);
world.relations.some(r =>
  npcIds.includes(r.factionA) && npcIds.includes(r.factionB) && r.score > 3
)
```

---

### A.2 `runPhase1FromCases(situation, turn)` → `Phase1Result | null`

```typescript
import { ALL_PHASE1_CASES } from "./phase1Cases";
import type { GameSituation, Phase1Result } from "./types";

const ADVISOR_ORDER = ["제갈량", "관우", "미축", "방통"] as const;
const REPORT_PRIORITY_THRESHOLD = 15; // 이 이상만 발언 (제갈량 제외)

export function runPhase1FromCases(
  situation: GameSituation,
  turn: number,
): Phase1Result | null {
  const selected: { advisor: string; caseItem: CaseDefinition }[] = [];

  for (const advisor of ADVISOR_ORDER) {
    const matched = ALL_PHASE1_CASES
      .filter(c => c.advisor === advisor && c.condition(situation))
      .sort((a, b) => b.priority - a.priority);

    if (matched.length > 0) {
      selected.push({ advisor, caseItem: matched[0] });
    }
  }

  // 제갈량은 필수. 나머지는 threshold 이상만, 최대 2명
  const zhuge = selected.find(s => s.advisor === "제갈량");
  const others = selected
    .filter(s => s.advisor !== "제갈량" && s.caseItem.priority > REPORT_PRIORITY_THRESHOLD)
    .slice(0, 2);

  const speakers = zhuge ? [zhuge, ...others] : others;
  if (speakers.length === 0) return null; // 폴백 필요

  const messages: CouncilMessage[] = speakers.map(s => {
    const v = pickVariation(s.caseItem.variations, turn, situation.advisorMood[s.advisor]?.isPassive ?? false);
    return {
      speaker: s.advisor,
      dialogue: typeof v.dialogue === "function" ? v.dialogue(situation) : v.dialogue,
      emotion: v.emotion,
      phase: 1 as const,
    };
  });

  const statusReports: StatusReport[] = speakers
    .map(s => s.caseItem.statusReport?.(situation))
    .filter((r): r is StatusReport => r != null);

  return { messages, statusReports, stateChanges: null, advisorUpdates: [], source: "case" };
}
```

**pickVariation 헬퍼:**
```typescript
function pickVariation(
  variations: CaseVariation[],
  turn: number,
  isPassive: boolean,
): CaseVariation {
  if (isPassive) {
    const passive = variations.filter(v => v.passiveDialogue);
    if (passive.length > 0) return passive[turn % passive.length];
  }
  return variations[turn % variations.length];
}
```

---

### A.3 `runPhase3FromCases(situation, turn, phase2Keywords)` → `Phase3Result | null`

```typescript
import { ALL_PHASE3_CASES, PHASE2_KEYWORD_MAPPINGS } from "./phase3Cases";

export function runPhase3FromCases(
  situation: GameSituation,
  turn: number,
  phase2Keywords: string[], // Phase 2 키워드 분석 결과
): Phase3Result | null {
  let casesToUse = ALL_PHASE3_CASES;

  // Phase 2 키워드 기반 우선순위 부스트
  const boostedAdvisors = new Set<string>();
  for (const keyword of phase2Keywords) {
    const mapping = PHASE2_KEYWORD_MAPPINGS.find(m => m.id === keyword);
    if (mapping) boostedAdvisors.add(mapping.advisorOverride);
  }

  const selected: { advisor: string; caseItem: Phase3CaseDefinition }[] = [];
  for (const advisor of ADVISOR_ORDER) {
    const matched = casesToUse
      .filter(c => c.advisor === advisor && c.condition(situation))
      .sort((a, b) => {
        // 키워드 매칭된 참모는 우선순위 +30
        const boostA = boostedAdvisors.has(a.advisor) ? 30 : 0;
        const boostB = boostedAdvisors.has(b.advisor) ? 30 : 0;
        return (b.priority + boostB) - (a.priority + boostA);
      });

    if (matched.length > 0) {
      selected.push({ advisor, caseItem: matched[0] });
    }
  }

  if (selected.length === 0) return null;

  const messages: CouncilMessage[] = selected.map(s => {
    const v = pickVariation(s.caseItem.variations, turn, situation.advisorMood[s.advisor]?.isPassive ?? false);
    return {
      speaker: s.advisor,
      dialogue: typeof v.dialogue === "function" ? v.dialogue(situation) : v.dialogue,
      emotion: v.emotion,
      phase: 3 as const,
    };
  });

  const planReports: PlanReport[] = selected.map(s => s.caseItem.planReport(situation));

  return { messages, planReports, advisorUpdates: [], source: "case" };
}
```

---

### A.4 폴백 조건 (`shouldFallbackToAPI`)

다음 조건 중 하나라도 해당하면 LLM API 폴백:

```typescript
export function shouldFallbackToLLM(
  situation: GameSituation,
  consecutiveCaseTurns: number,
): boolean {
  if (situation.strategic.recentBattle) return true;       // 전투 직후
  if (situation.strategic.recentCastleLost) return true;  // 성채 상실
  if (situation.strategic.recentCastleGained) return true; // 성채 획득
  if (situation.strategic.recentInvasion) return true;    // 침공 방어
  if (situation.strategic.leveledUp) return true;         // 레벨업
  if (consecutiveCaseTurns >= 3) return true;             // 연속 케이스 3턴 제한
  // 참모 불충 위기
  if (Object.values(situation.advisorMood).some(a => a.isDisloyal)) return true;
  return false;
}
```

---

## B. GameContainer.tsx 수정

### B.1 현재 흐름 → 변경 흐름

```
[현재]
runMeetingPhase1And3()
  → buildPhase1And3Prompt() + callCouncilLLM()
  → Phase 1 메시지 표시 + Phase 3 메시지 저장 (pendingRef)

[변경]
runMeetingPhase1And3()
  → analyzeGameSituation() → situation
  → shouldFallbackToLLM()?
      NO  → runPhase1FromCases() → Phase 1 케이스 응답
      YES → buildPhase1And3Prompt() + callCouncilLLM() (기존 경로)
```

### B.2 `TurnContext` ref 추가

`GameContainer.tsx`에 `turnCtxRef` 추가 (이미 `lib/council/types.ts`의 `TurnContext` + `createInitialTurnContext()` 있음):

```typescript
import { createInitialTurnContext } from "@/lib/council/types";

const turnCtxRef = useRef(createInitialTurnContext());
```

Phase 5 실행 후 turnCtxRef 업데이트:
```typescript
// handleExecuteTurn() 내, Phase 5 완료 후
turnCtxRef.current = {
  ...turnCtxRef.current,
  lastTurnBattle: !!battleResult,
  lastTurnBattleWon: battleResult?.winner === "liu_bei",
  lastTurnBattleLost: battleResult?.loser === "liu_bei",
  lastTurnInvasion: hadInvasion,
  lastTurnCastleGained: gained.length > 0,
  lastTurnCastleLost: lost.length > 0,
  lastTurnEvents: events.map(e => e.type),
  consecutiveCaseTurns: usedCase ? turnCtxRef.current.consecutiveCaseTurns + 1 : 0,
  consecutiveWins: ...,
  consecutiveLosses: ...,
  phase2Messages: [],
  lastLevelUp: ...,
  lastSkillUnlock: ...,
};
```

### B.3 `runMeetingPhase1And3()` 수정

```typescript
const runMeetingPhase1And3 = useCallback(async (context: string) => {
  const situation = analyzeGameSituation(
    worldStateRef.current,
    advisorsRef.current,
    turnCtxRef.current,
  );

  const consecutive = turnCtxRef.current.consecutiveCaseTurns;

  if (!shouldFallbackToLLM(situation, consecutive)) {
    // 케이스 엔진 경로
    const phase1 = runPhase1FromCases(situation, worldStateRef.current.currentTurn);
    const phase3 = runPhase3FromCases(situation, worldStateRef.current.currentTurn, []);

    if (phase1 && phase3) {
      // Phase 1 표시
      setStatusReports(phase1.statusReports);
      await animateCouncilMessages(phase1.messages, true, { ... });

      // Phase 3 메시지 저장 (기존 pendingRef 방식 유지)
      pendingCasePlanReportsRef.current = phase3.planReports;
      setPendingPhase3(phase3);
      return; // API 호출 없이 완료
    }
  }

  // LLM 폴백 (기존 경로)
  const { council, advisorUpdates, elapsedMs } = await doPhase1And3(context);
  // ... 기존 처리 ...
}, [...]);
```

### B.4 Phase 3 케이스 표시 (handleAdvancePhase)

"다음" 버튼 클릭 시 저장된 Phase 3 케이스 메시지 표시:

```typescript
// meetingPhase === 2 → 3 전환 시
if (pendingPhase3?.source === "case") {
  // Phase 2 키워드 기반 Phase 3 재생성 시도
  const keywords = extractKeywords(phase2MessagesRef.current);
  const situation = analyzeGameSituation(worldStateRef.current, advisorsRef.current, turnCtxRef.current);
  const refreshed = runPhase3FromCases(situation, turn, keywords);
  if (refreshed) {
    setPlanReports(refreshed.planReports);
    await animateCouncilMessages(refreshed.messages, false, { firstImmediate: true });
    pendingCasePlanReportsRef.current = refreshed.planReports;
    return;
  }
}
// 저장된 케이스 그대로 표시
await animateCouncilMessages(pendingPhase3.messages, false, { firstImmediate: true });
```

---

## C. 구현 순서

| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | `analyzeGameSituation()` 구현 | `lib/council/engine.ts` |
| 2 | `shouldFallbackToLLM()` 구현 | `lib/council/engine.ts` |
| 3 | `runPhase1FromCases()` 구현 | `lib/council/engine.ts` |
| 4 | `runPhase3FromCases()` 구현 | `lib/council/engine.ts` |
| 5 | `turnCtxRef` 추가 + Phase 5 업데이트 | `GameContainer.tsx` |
| 6 | `runMeetingPhase1And3()` 수정 | `GameContainer.tsx` |
| 7 | Phase 3 케이스 표시 로직 추가 | `GameContainer.tsx` |
| 8 | 빌드 확인 | — |

---

## D. 참고: 현재 plans/04 와의 관계

`plans/04-phase-separation-case-engine.md`는 Phase 1/3 완전 분리(API도 분리)를 목표로 하는 장기 계획.

이 문서(plans/05)는 **최소 변경으로 케이스 엔진을 연동**하는 단기 구현:
- Phase 1/3 API 통합 구조는 유지 (LLM 폴백 시 기존 경로 사용)
- 케이스 엔진만 추가하여 케이스 우선 / LLM 폴백 구조로 전환
- plans/04의 Phase 완전 분리는 이후 별도 작업

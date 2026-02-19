/**
 * 케이스 기반 즉각 응답 엔진
 *
 * Phase 1/3을 API 없이 처리하는 케이스 엔진.
 * 전투·성채 변동 등 중요 상황은 LLM으로 폴백.
 */

import type { WorldState } from "@/types/game";
import type { AdvisorState } from "@/types/council";
import type {
  GameSituation,
  TurnContext,
  CaseDefinition,
  CaseVariation,
  Phase3CaseDefinition,
  Phase1Result,
  Phase3Result,
} from "./types";
import { scoreToLabel } from "@/lib/game/diplomacySystem";
import { getFacilityUpgradeCost, getFacilityBuildCost } from "@/constants/gameConstants";
import { SKILL_TREE } from "@/constants/skills";
import { CAPITAL_CASTLES } from "@/constants/castles";
import { ALL_PHASE1_CASES } from "./phase1Cases";
import { ALL_PHASE3_CASES, PHASE2_KEYWORD_MAPPINGS } from "./phase3Cases";

// ===================== 상황 분석 =====================

const ADVISOR_ORDER = ["제갈량", "관우", "미축", "방통"] as const;

export function analyzeGameSituation(
  world: WorldState,
  advisors: AdvisorState[],
  turnCtx?: TurnContext,
): GameSituation {
  const player = world.factions.find(f => f.isPlayer)!;
  const npcFactions = world.factions.filter(f => !f.isPlayer);

  const turn = world.currentTurn;
  const gamePhase: "early" | "mid" | "late" =
    turn <= 30 ? "early" : turn <= 80 ? "mid" : "late";

  // ── 군사 ──
  const troops = player.points.mp_troops;
  const training = player.points.mp_training;
  const morale = player.points.mp_morale;
  const mp = player.points.mp;
  const deploymentCap = player.rulerLevel.deploymentCap;
  const woundedTotal = player.woundedPool.reduce((s, w) => s + w.amount, 0);
  const woundedTurnsLeft = player.woundedPool.length > 0
    ? Math.max(...player.woundedPool.map(w => w.recoveryTurns))
    : 0;

  const military: GameSituation["military"] = {
    troops,
    training,
    morale,
    mp,
    deploymentCap,
    troopsCritical: troops < 10000,
    troopShortage: troops < 20000,
    troopsAdequate: troops >= 20000 && troops <= 50000,
    troopsAbundant: troops > 50000,
    troopsAtCap: troops >= deploymentCap,
    lowTraining: training < 0.5,
    midTraining: training >= 0.5 && training <= 0.7,
    highTraining: training > 0.7,
    maxTraining: training > 0.9,
    lowMorale: morale < 0.8,
    highMorale: morale > 1.1,
    woundedRecovering: woundedTotal,
    woundedTurnsLeft,
  };

  // ── 경제 ──
  const ip = player.points.ip;
  const ipCap = player.points.ip_cap;
  const ipRegen = player.points.ip_regen;
  const marketCount = player.facilities.market.count;
  const marketLv = player.facilities.market.level;
  const farmCount = player.facilities.farm.count;
  const farmLv = player.facilities.farm.level;
  const bank = player.facilities.bank;
  const castleCountVal = world.castles.filter(c => c.owner === player.id).length;

  const marketBuildCost = getFacilityBuildCost(marketCount);
  const farmBuildCost = getFacilityBuildCost(farmCount);
  const marketUpgCost = getFacilityUpgradeCost(marketLv);
  const farmUpgCost = getFacilityUpgradeCost(farmLv);
  const bankUpgCost = getFacilityUpgradeCost(bank);

  const economy: GameSituation["economy"] = {
    ip,
    ipCap,
    ipRegen,
    ipCritical: ip < 5,
    ipLow: ip < 15,
    ipAdequate: ip >= 15 && ip <= 50,
    ipRich: ip > 50,
    ipAtCap: ip >= ipCap,
    ipNearCap: ip >= ipCap * 0.9,
    marketCount,
    marketLv,
    farmCount,
    farmLv,
    bankLv: bank,
    castleCount: castleCountVal,
    noFacilities: marketCount === 0 && farmCount === 0 && bank === 0,
    canBuildMarket: marketCount < castleCountVal && ip >= marketBuildCost,
    canBuildFarm: farmCount < castleCountVal && ip >= farmBuildCost,
    canUpgradeMarket: marketCount > 0 && ip >= marketUpgCost,
    canUpgradeFarm: farmCount > 0 && ip >= farmUpgCost,
    canUpgradeBank: ip >= bankUpgCost,
    marketBuildCost,
    farmBuildCost,
    marketUpgradeCost: marketUpgCost,
    farmUpgradeCost: farmUpgCost,
    bankUpgradeCost: bankUpgCost,
    facilityImbalance: Math.abs(marketCount - farmCount) >= 3,
    highIncome: ipRegen >= 20,
    lowIncome: ipRegen <= 5,
  };

  // ── 외교 ──
  const dp = player.points.dp;
  const playerRelations = world.relations
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
    });

  const npcIds = npcFactions.map(f => f.id);
  const enemiesFriendly = world.relations.some(
    r => npcIds.includes(r.factionA) && npcIds.includes(r.factionB) && r.score > 3,
  );

  const diplomacy: GameSituation["diplomacy"] = {
    dp,
    dpNone: dp === 0,
    dpLow: dp < 2,
    dpAdequate: dp >= 2 && dp <= 4,
    dpRich: dp >= 5,
    relations: playerRelations,
    allHostile: playerRelations.every(r => r.isHostile),
    anyAllied: playerRelations.some(r => r.isAllied),
    anyFriendly: playerRelations.some(r => r.isFriendly),
    enemiesFriendly,
  };

  // ── 전략 ──
  const playerMP = player.points.mp;
  const sortedByMP = [...npcFactions].sort((a, b) => b.points.mp - a.points.mp);
  const maxEnemyMP = sortedByMP.length > 0 ? sortedByMP[0].points.mp : 1;
  const minEnemyMP = sortedByMP.length > 0 ? sortedByMP[sortedByMP.length - 1].points.mp : 1;
  const ratio = playerMP / Math.max(1, maxEnemyMP);

  const overallStrength: GameSituation["strategic"]["overallStrength"] =
    ratio > 1.5 ? "dominant"
    : ratio > 1.2 ? "advantage"
    : ratio > 0.8 ? "balanced"
    : ratio > 0.5 ? "disadvantage"
    : "critical";

  const biggestThreat = sortedByMP.length > 0 ? {
    name: sortedByMP[0].rulerName,
    id: sortedByMP[0].id,
    mp: sortedByMP[0].points.mp,
    castles: sortedByMP[0].castles.length,
  } : null;

  const weakestEnemy = sortedByMP.length > 0 ? {
    name: sortedByMP[sortedByMP.length - 1].rulerName,
    id: sortedByMP[sortedByMP.length - 1].id,
    mp: minEnemyMP,
    castles: sortedByMP[sortedByMP.length - 1].castles.length,
  } : null;

  const playerCastles = world.castles.filter(c => c.owner === "liu_bei");
  const playerCastleNames = new Set(playerCastles.map(c => c.name));

  // 우리 성채에 인접한 적 성채
  const adjacentEnemyCastles: string[] = [];
  for (const castle of playerCastles) {
    for (const adj of castle.adjacentCastles) {
      const adjCastle = world.castles.find(c => c.name === adj);
      if (adjCastle && adjCastle.owner !== "liu_bei" && !adjacentEnemyCastles.includes(adj)) {
        adjacentEnemyCastles.push(adj);
      }
    }
  }

  // 적 성채에 인접한 우리 성채
  const adjacentOurCastles: string[] = [];
  for (const castle of world.castles.filter(c => c.owner !== "liu_bei")) {
    for (const adj of castle.adjacentCastles) {
      if (playerCastleNames.has(adj) && !adjacentOurCastles.includes(adj)) {
        adjacentOurCastles.push(adj);
      }
    }
  }

  // 적이 우리 본성 인근에 있는가
  const playerCapital = world.castles.find(c => c.name === CAPITAL_CASTLES["liu_bei"]);
  const enemyNearCapital = playerCapital
    ? playerCapital.adjacentCastles.some(adj => {
        const adjC = world.castles.find(c => c.name === adj);
        return adjC && adjC.owner !== "liu_bei";
      })
    : false;

  // 우리가 적 본성 인근에 있는가
  const nearEnemyCapital = npcFactions.some(npc => {
    const enemyCapitalName = CAPITAL_CASTLES[npc.id];
    const enemyCapCastle = world.castles.find(c => c.name === enemyCapitalName);
    return enemyCapCastle
      ? enemyCapCastle.adjacentCastles.some(adj => playerCastleNames.has(adj))
      : false;
  });

  const enemyCastles: Record<string, number> = {};
  for (const npc of npcFactions) {
    enemyCastles[npc.id] = npc.castles.length;
  }

  const minSkillCost = SKILL_TREE.length > 0
    ? Math.min(...SKILL_TREE.map(s => s.cost))
    : 999;

  const strategic: GameSituation["strategic"] = {
    overallStrength,
    biggestThreat,
    weakestEnemy,
    castleCount: player.castles.length,
    totalCastles: world.castles.length,
    enemyCastles,
    adjacentEnemyCastles,
    adjacentOurCastles,
    recentBattle: turnCtx?.lastTurnBattle ?? false,
    recentBattleWon: turnCtx?.lastTurnBattleWon ?? false,
    recentBattleLost: turnCtx?.lastTurnBattleLost ?? false,
    recentCastleGained: turnCtx?.lastTurnCastleGained ?? false,
    recentCastleLost: turnCtx?.lastTurnCastleLost ?? false,
    recentInvasion: turnCtx?.lastTurnInvasion ?? false,
    recentEvent: (turnCtx?.lastTurnEvents.length ?? 0) > 0,
    recentEventTypes: turnCtx?.lastTurnEvents ?? [],
    consecutiveWins: turnCtx?.consecutiveWins ?? 0,
    consecutiveLosses: turnCtx?.consecutiveLosses ?? 0,
    enemyNearCapital,
    nearEnemyCapital,
    leveledUp: turnCtx?.lastLevelUp ?? false,
    skillUnlocked: turnCtx?.lastSkillUnlock ?? false,
    spCanUnlock: player.points.sp >= minSkillCost,
    rulerLevel: player.rulerLevel.level,
    sp: player.points.sp,
  };

  // ── 참모 상태 ──
  const advisorMood: GameSituation["advisorMood"] = {};
  for (const adv of advisors) {
    advisorMood[adv.name] = {
      loyalty: adv.loyalty,
      enthusiasm: adv.enthusiasm,
      isPassive: adv.enthusiasm < 40,
      isDisloyal: adv.loyalty < 30,
      isEnthusiastic: adv.enthusiasm >= 80,
      isLoyal: adv.loyalty >= 80,
    };
  }

  return { turn, gamePhase, military, economy, diplomacy, strategic, advisorMood };
}

// ===================== LLM 폴백 판정 =====================

export function shouldFallbackToLLM(
  situation: GameSituation,
  consecutiveCaseTurns: number,
): boolean {
  if (situation.strategic.recentBattle) return true;
  if (situation.strategic.recentCastleLost) return true;
  if (situation.strategic.recentCastleGained) return true;
  if (situation.strategic.recentInvasion) return true;
  if (situation.strategic.leveledUp) return true;
  if (consecutiveCaseTurns >= 3) return true;
  if (Object.values(situation.advisorMood).some(a => a.isDisloyal)) return true;
  return false;
}

// ===================== 대사 변형 선택 =====================

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

function resolveDialogue(
  variation: CaseVariation,
  situation: GameSituation,
): string {
  const d = variation.dialogue;
  return typeof d === "function" ? d(situation) : d;
}

// ===================== Phase 1 케이스 엔진 =====================

const REPORT_PRIORITY_THRESHOLD = 15;

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

  // 제갈량은 필수, 나머지는 threshold 이상만 (최대 2명)
  const zhuge = selected.find(s => s.advisor === "제갈량");
  const others = selected
    .filter(s => s.advisor !== "제갈량" && s.caseItem.priority > REPORT_PRIORITY_THRESHOLD)
    .slice(0, 2);

  const speakers = zhuge ? [zhuge, ...others] : others;
  if (speakers.length === 0) return null;

  const messages = speakers.map(s => {
    const variation = pickVariation(
      s.caseItem.variations,
      turn,
      situation.advisorMood[s.advisor]?.isPassive ?? false,
    );
    return {
      speaker: s.advisor,
      dialogue: resolveDialogue(variation, situation),
      emotion: variation.emotion,
      phase: 1 as const,
    };
  });

  const statusReports = speakers
    .map(s => s.caseItem.statusReport?.(situation) ?? null)
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return { messages, statusReports, stateChanges: null, advisorUpdates: [], source: "case" };
}

// ===================== Phase 3 케이스 엔진 =====================

export function runPhase3FromCases(
  situation: GameSituation,
  turn: number,
  phase2Keywords: string[],
): Phase3Result | null {
  const boostedAdvisors = new Set<string>();
  for (const keyword of phase2Keywords) {
    const mapping = PHASE2_KEYWORD_MAPPINGS.find(m => m.id === keyword);
    if (mapping) boostedAdvisors.add(mapping.advisorOverride);
  }

  const selected: { advisor: string; caseItem: Phase3CaseDefinition }[] = [];

  for (const advisor of ADVISOR_ORDER) {
    const matched = ALL_PHASE3_CASES
      .filter(c => c.advisor === advisor && c.condition(situation))
      .sort((a, b) => {
        const boostA = boostedAdvisors.has(a.advisor) ? 30 : 0;
        const boostB = boostedAdvisors.has(b.advisor) ? 30 : 0;
        return (b.priority + boostB) - (a.priority + boostA);
      });

    if (matched.length > 0) {
      selected.push({ advisor, caseItem: matched[0] });
    }
  }

  if (selected.length === 0) return null;

  const messages = selected.map(s => {
    const variation = pickVariation(
      s.caseItem.variations,
      turn,
      situation.advisorMood[s.advisor]?.isPassive ?? false,
    );
    return {
      speaker: s.advisor,
      dialogue: resolveDialogue(variation, situation),
      emotion: variation.emotion,
      phase: 3 as const,
    };
  });

  const planReports = selected.map(s => s.caseItem.planReport(situation));

  return { messages, planReports, advisorUpdates: [], source: "case" };
}

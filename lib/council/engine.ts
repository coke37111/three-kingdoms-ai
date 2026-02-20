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
import type { CouncilMessage } from "@/types/council";
import { scoreToLabel } from "@/lib/game/diplomacySystem";
import { getFacilityUpgradeCost, getFacilityBuildCost } from "@/constants/gameConstants";
import { SKILL_TREE } from "@/constants/skills";
import { CAPITAL_CASTLES } from "@/constants/castles";
import { ALL_PHASE1_CASES } from "./phase1Cases";
import { ALL_PHASE3_CASES } from "./phase3Cases";
import { ALL_AGENDA_CASES } from "./agendaCases";
import type { AgendaCase, AgendaLine } from "./types";

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

const ADDITIONAL_REPORT_PRIORITY_THRESHOLD = 15;

/** AgendaLine 목록에서 턴 기반으로 하나 선택 */
function pickAgendaLine(lines: AgendaLine[], turn: number): AgendaLine {
  if (lines.length === 0) return { dialogue: "...", emotion: "calm" };
  return lines[turn % lines.length];
}

/** AgendaLine을 CouncilMessage 형식으로 변환 */
function agendaLineToMessage(
  line: AgendaLine,
  speaker: string,
  situation: GameSituation,
): CouncilMessage {
  const dialogue = typeof line.dialogue === "function"
    ? line.dialogue(situation)
    : line.dialogue;
  return {
    speaker,
    dialogue,
    emotion: line.emotion,
    phase: 1 as const,
  };
}

/** 최우선 AgendaCase 선택 */
function findBestAgendaCase(situation: GameSituation): AgendaCase | null {
  const matched = ALL_AGENDA_CASES
    .filter(c => c.condition(situation))
    .sort((a, b) => b.priority - a.priority);
  return matched.length > 0 ? matched[0] : null;
}

/** 추가 보고 — 제갈량 제외, priority > threshold, 최대 2명 */
function pickAdditionalReports(
  situation: GameSituation,
  turn: number,
  agendaId: string,
) {
  // 안건 카테고리 키워드 (해당 카테고리 케이스는 추가 보고 제외)
  const agendaMilitaryIds = new Set(["after_battle_lost", "after_battle_won", "capital_under_threat", "troops_critical", "troops_shortage", "low_training", "attack_opportunity", "near_enemy_capital"]);
  const agendaEconomyIds = new Set(["no_facilities", "ip_overflow", "income_critical", "income_low"]);
  const agendaDiplomacyIds = new Set(["diplomatic_isolation", "enemies_allied"]);

  const isMilitaryAgenda = agendaMilitaryIds.has(agendaId);
  const isEconomyAgenda = agendaEconomyIds.has(agendaId);
  const isDiplomacyAgenda = agendaDiplomacyIds.has(agendaId);

  const candidateCases = ALL_PHASE1_CASES
    .filter(c => {
      if (c.advisor === "제갈량") return false;
      if (c.priority <= ADDITIONAL_REPORT_PRIORITY_THRESHOLD) return false;
      if (!c.condition(situation)) return false;
      // 안건과 같은 카테고리 제외
      if (isMilitaryAgenda && c.advisor === "관우") return false;
      if (isEconomyAgenda && c.advisor === "미축") return false;
      if (isDiplomacyAgenda && c.advisor === "방통") return false;
      return true;
    })
    .sort((a, b) => b.priority - a.priority);

  // 참모별 최고 priority 1개씩
  const byAdvisor: Record<string, typeof candidateCases[0]> = {};
  for (const c of candidateCases) {
    if (!byAdvisor[c.advisor]) byAdvisor[c.advisor] = c;
  }

  return Object.values(byAdvisor).slice(0, 2).map(c => {
    const variation = pickVariation(
      c.variations,
      turn,
      situation.advisorMood[c.advisor]?.isPassive ?? false,
    );
    return {
      speaker: c.advisor,
      dialogue: resolveDialogue(variation, situation),
      emotion: variation.emotion,
      phase: 1 as const,
    };
  });
}

export function runPhase1FromCases(
  situation: GameSituation,
  turn: number,
): Phase1Result | null {
  // 1. 안건 케이스 선택
  const agendaCase = findBestAgendaCase(situation);
  if (!agendaCase) return null;

  // 2. 안건 메시지 조립 (제갈량 → 관우 → 미축 → 방통)
  const messages: CouncilMessage[] = [
    agendaLineToMessage(pickAgendaLine(agendaCase.opening, turn), "제갈량", situation),
    agendaLineToMessage(pickAgendaLine(agendaCase.responses["관우"], turn), "관우", situation),
    agendaLineToMessage(pickAgendaLine(agendaCase.responses["미축"], turn), "미축", situation),
    agendaLineToMessage(pickAgendaLine(agendaCase.responses["방통"], turn), "방통", situation),
  ];

  // 3. 멘션 응답 (mentionResponses가 있는 경우)
  if (agendaCase.mentionResponses) {
    for (const mention of agendaCase.mentionResponses) {
      const line = pickAgendaLine(mention.variations, turn);
      const dialogue = typeof line.dialogue === "function"
        ? line.dialogue(situation)
        : line.dialogue;
      messages.push({
        speaker: mention.to,
        dialogue,
        emotion: line.emotion,
        phase: 1 as const,
        replyTo: mention.from,
      });
    }
  }

  // 4. 추가 보고 (기존 CaseDefinition, 최대 2명)
  const additional = pickAdditionalReports(situation, turn, agendaCase.id);
  messages.push(...additional);

  // 5. 제갈량 마무리 (모든 보고 이후)
  messages.push({
    speaker: "제갈량",
    dialogue: "이상입니다. 주공, 추가로 하문하실 것이 있으시면 말씀해 주시옵소서.",
    emotion: "calm" as const,
    phase: 1 as const,
  });

  return { messages, statusReports: [], stateChanges: null, advisorUpdates: [], source: "case" };
}

// ===================== Phase 3 케이스 엔진 =====================

export function runPhase3FromCases(
  situation: GameSituation,
  turn: number,
): Phase3Result | null {
  const selected: { advisor: string; caseItem: Phase3CaseDefinition }[] = [];

  for (const advisor of ADVISOR_ORDER) {
    const matched = ALL_PHASE3_CASES
      .filter(c => c.advisor === advisor && c.condition(situation))
      .sort((a, b) => b.priority - a.priority);

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

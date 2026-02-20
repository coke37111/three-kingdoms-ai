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
  StrategicJudgment,
  StrategicFactor,
  StrategicDirective,
  DirectiveAgendaCase,
  AgendaCase,
  AgendaLine,
} from "./types";
import type { CouncilMessage } from "@/types/council";
import { scoreToLabel } from "@/lib/game/diplomacySystem";
import { getFacilityUpgradeCost, getFacilityBuildCost } from "@/constants/gameConstants";
import { SKILL_TREE } from "@/constants/skills";
import { CAPITAL_CASTLES } from "@/constants/castles";
import { ALL_PHASE1_CASES } from "./phase1Cases";
import { ALL_PHASE3_CASES } from "./phase3Cases";
import { ALL_AGENDA_CASES } from "./agendaCases";
import { ALL_DIRECTIVE_AGENDAS } from "./directiveAgendas";

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

// ===================== 전략 판단 엔진 (2-레이어) =====================

/** resourceHint를 directive에서 자동 도출 */
function deriveResourceHint(directive: StrategicDirective): StrategicJudgment["resourceHint"] {
  switch (directive) {
    case "total_war":
    case "offensive":
      return { military: "expand", economy: "conserve", diplomacy: "passive" };
    case "defensive_crisis":
      return { military: "expand", economy: "conserve", diplomacy: "defensive" };
    case "rebuild":
      return { military: "expand", economy: "invest", diplomacy: "defensive" };
    case "economic_priority":
    case "growth":
      return { military: "maintain", economy: "invest", diplomacy: "passive" };
    case "diplomatic_crisis":
    case "diplomatic_maneuver":
      return { military: "maintain", economy: "maintain", diplomacy: "active" };
    case "steady_advance":
    default:
      return { military: "maintain", economy: "invest", diplomacy: "passive" };
  }
}

/** 전략 판단 — GameSituation에서 directive를 도출하는 순수 함수 */
export function deriveStrategicJudgment(s: GameSituation): StrategicJudgment {
  const factors: StrategicFactor[] = [];
  let directive: StrategicDirective = "steady_advance";
  let urgency: 0 | 1 | 2 | 3 = 0;
  let secondary: StrategicDirective | undefined;

  // 우선순위 체이닝 (높은 것부터)

  // 1. 본성 위협 → defensive_crisis
  if (s.strategic.enemyNearCapital) {
    directive = "defensive_crisis";
    urgency = 3;
    factors.push({ domain: "military", description: "적이 본성 인접", severity: "critical" });
  }
  // 2. 패전 + 병력 위급 → rebuild
  else if (s.strategic.recentBattleLost && s.military.troopsCritical) {
    directive = "rebuild";
    urgency = 2;
    factors.push({ domain: "military", description: "패전 후 병력 위급", severity: "critical" });
  }
  // 3. 패전 → rebuild
  else if (s.strategic.recentBattleLost) {
    directive = "rebuild";
    urgency = 2;
    factors.push({ domain: "military", description: "직전 전투 패배", severity: "warning" });
  }
  // 4. 적 본성 인접 + 병력 풍부 → total_war
  else if (s.strategic.nearEnemyCapital && s.military.troopsAbundant) {
    directive = "total_war";
    urgency = 2;
    factors.push({ domain: "strategic", description: "적 본성 인접, 병력 풍부", severity: "info" });
  }
  // 5. 승전 → offensive
  else if (s.strategic.recentBattleWon) {
    directive = "offensive";
    urgency = 1;
    factors.push({ domain: "military", description: "직전 전투 승리", severity: "info" });
  }
  // 6. 병력 위급 (전투 없이) → rebuild
  else if (s.military.troopsCritical) {
    directive = "rebuild";
    urgency = 2;
    factors.push({ domain: "military", description: "병력 만 명 미만", severity: "critical" });
  }
  // 7. 시설 전무 / 수입 극저 → economic_priority
  else if (s.economy.noFacilities || s.economy.lowIncome) {
    directive = "economic_priority";
    urgency = 1;
    factors.push({ domain: "economy", description: s.economy.noFacilities ? "시설 전무" : "수입 극저", severity: "warning" });
  }
  // 8. 양측 모두 적대 → diplomatic_crisis
  else if (s.diplomacy.allHostile) {
    directive = "diplomatic_crisis";
    urgency = 1;
    factors.push({ domain: "diplomacy", description: "양면 적대", severity: "warning" });
  }
  // 9. 적끼리 우호 → diplomatic_maneuver
  else if (s.diplomacy.enemiesFriendly) {
    directive = "diplomatic_maneuver";
    urgency = 1;
    factors.push({ domain: "diplomacy", description: "적끼리 우호 관계", severity: "warning" });
  }
  // 10. 공세 기회 (MP > 약적 × 1.5)
  else if (s.strategic.weakestEnemy && s.military.mp > s.strategic.weakestEnemy.mp * 1.5) {
    directive = "offensive";
    urgency = 1;
    factors.push({ domain: "military", description: "군사력 우세", severity: "info" });
  }
  // 11. 병력 부족 / 훈련 저조 / IP 부족 → growth
  else if (s.military.troopShortage || s.military.lowTraining || s.economy.ipLow) {
    directive = "growth";
    urgency = 0;
    if (s.military.troopShortage) factors.push({ domain: "military", description: "병력 부족", severity: "warning" });
    if (s.military.lowTraining) factors.push({ domain: "military", description: "훈련도 저조", severity: "warning" });
    if (s.economy.ipLow) factors.push({ domain: "economy", description: "내정력 부족", severity: "warning" });
  }
  // 12. 초반 → growth
  else if (s.turn <= 10) {
    directive = "growth";
    urgency = 0;
    factors.push({ domain: "strategic", description: "초반 기반 다지기", severity: "info" });
  }

  // secondary 결정 — 주 directive와 다른 도메인의 주요 이슈
  if (directive !== "diplomatic_crisis" && directive !== "diplomatic_maneuver" && s.diplomacy.allHostile) {
    secondary = "diplomatic_crisis";
  } else if (directive !== "economic_priority" && (s.economy.noFacilities || s.economy.lowIncome)) {
    secondary = "economic_priority";
  } else if (directive !== "rebuild" && directive !== "defensive_crisis" && s.military.troopsCritical) {
    secondary = "rebuild";
  }

  // 추가 상황 factor 수집
  if (s.economy.ipNearCap) {
    factors.push({ domain: "economy", description: "내정력 상한 근접", severity: "warning" });
  }
  if (s.military.woundedRecovering > 0) {
    factors.push({ domain: "military", description: `부상병 ${s.military.woundedRecovering.toLocaleString()}명 회복 중`, severity: "info" });
  }
  if (s.strategic.spCanUnlock) {
    factors.push({ domain: "strategic", description: "스킬 해금 가능", severity: "info" });
  }

  return {
    directive,
    urgency,
    secondary,
    factors,
    resourceHint: deriveResourceHint(directive),
  };
}

/** directive에 따른 참모 발언 순서 결정 */
export function determineDomainOrder(
  j: StrategicJudgment,
): ["관우" | "미축" | "방통", "관우" | "미축" | "방통", "관우" | "미축" | "방통"] {
  switch (j.directive) {
    case "offensive":
    case "total_war":
    case "defensive_crisis":
    case "rebuild":
      return ["관우", "미축", "방통"];
    case "economic_priority":
    case "growth":
      return ["미축", "관우", "방통"];
    case "diplomatic_crisis":
    case "diplomatic_maneuver":
      return ["방통", "관우", "미축"];
    case "steady_advance":
    default:
      return ["관우", "미축", "방통"];
  }
}

/** 선도 참모 회전 — 턴마다 다른 참모가 선도 */
function rotateDomainOrder(
  baseOrder: string[],
  turn: number,
): string[] {
  const offset = turn % baseOrder.length;
  return [...baseOrder.slice(offset), ...baseOrder.slice(0, offset)];
}

/** DirectiveAgendaCase를 directive로 검색 */
function findDirectiveAgenda(
  j: StrategicJudgment,
): DirectiveAgendaCase | null {
  return ALL_DIRECTIVE_AGENDAS.find(a => a.directive === j.directive) ?? null;
}

/** subCondition 배열에서 첫 매칭 + 턴 기반 variation 선택 */
function pickSubConditionMatch(
  entries: Array<{ subCondition: (s: GameSituation) => boolean; variations: AgendaLine[] }>,
  situation: GameSituation,
  turn: number,
): AgendaLine {
  const matched = entries.find(e => e.subCondition(situation));
  const lines = matched?.variations ?? entries[entries.length - 1].variations;
  if (lines.length === 0) return { dialogue: "...", emotion: "calm" };
  return lines[turn % lines.length];
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
  // 1. 전략 판단
  const judgment = deriveStrategicJudgment(situation);

  // 2. directive에 해당하는 DirectiveAgendaCase 검색
  const directiveCase = findDirectiveAgenda(judgment);

  // DirectiveAgendaCase가 있으면 2-레이어 시스템 사용 (선도-댓글 구조)
  if (directiveCase) {
    const messages: CouncilMessage[] = [];

    // 2-1. 제갈량 전략 선언 (broadcast)
    const broadcastLine = pickSubConditionMatch(
      directiveCase.strategicDeclaration, situation, turn,
    );
    const broadcastMsg = agendaLineToMessage(broadcastLine, "제갈량", situation);
    broadcastMsg.messageMode = "broadcast";
    messages.push(broadcastMsg);

    // 2-2. 선도 참모 결정 (회전)
    const baseOrder = determineDomainOrder(judgment);
    const rotatedOrder = rotateDomainOrder(baseOrder, turn);
    const [lead, ...followers] = rotatedOrder;

    // 2-3. 선도 참모 독립 발언
    const leadEntries = directiveCase.domainResponses[lead as "관우" | "미축" | "방통"];
    if (leadEntries?.length) {
      const line = pickSubConditionMatch(leadEntries, situation, turn);
      const msg = agendaLineToMessage(line, lead, situation);
      msg.messageMode = "interactive";
      messages.push(msg);
    }

    // 2-4. 나머지 참모는 선도 참모에 대한 댓글로 발언
    for (const follower of followers) {
      let msg: CouncilMessage | null = null;

      // 우선순위 1: mentionResponses (lead → follower)
      if (directiveCase.mentionResponses) {
        const mention = directiveCase.mentionResponses.find(
          m => m.from === lead && m.to === follower
            && (!m.subCondition || m.subCondition(situation)),
        );
        if (mention) {
          const line = pickAgendaLine(mention.variations, turn);
          const dialogue = typeof line.dialogue === "function"
            ? line.dialogue(situation) : line.dialogue;
          msg = {
            speaker: follower,
            dialogue,
            emotion: line.emotion,
            phase: 1 as const,
            replyTo: lead,
            messageMode: "interactive",
          };
        }
      }

      // 우선순위 2: threadReplies[lead][follower]
      if (!msg && directiveCase.threadReplies?.[lead]?.[follower]) {
        const entries = directiveCase.threadReplies[lead][follower];
        const matched = entries.find(e => !e.subCondition || e.subCondition(situation));
        const lines = matched?.variations ?? entries[entries.length - 1].variations;
        const line = lines.length > 0 ? lines[turn % lines.length] : { dialogue: "...", emotion: "calm" as const };
        const dialogue = typeof line.dialogue === "function"
          ? line.dialogue(situation) : line.dialogue;
        msg = {
          speaker: follower,
          dialogue,
          emotion: line.emotion,
          phase: 1 as const,
          replyTo: lead,
          messageMode: "interactive",
        };
      }

      // 우선순위 3: domainResponses 폴백 (replyTo 붙여서)
      if (!msg) {
        const entries = directiveCase.domainResponses[follower as "관우" | "미축" | "방통"];
        if (entries?.length) {
          const line = pickSubConditionMatch(entries, situation, turn);
          msg = agendaLineToMessage(line, follower, situation);
          msg.replyTo = lead;
          msg.messageMode = "interactive";
        }
      }

      if (msg) {
        messages.push(msg);
      }
    }

    // 2-5. 제갈량 마무리 (모든 참모가 이미 발언했으므로 추가 보고 생략)
    messages.push({
      speaker: "제갈량",
      dialogue: "이상입니다. 주공, 추가로 하문하실 것이 있으시면 말씀해 주시옵소서.",
      emotion: "calm" as const,
      phase: 1 as const,
    });

    return { messages, statusReports: [], stateChanges: null, advisorUpdates: [], source: "case", judgment };
  }

  // 폴백: 기존 AgendaCase 시스템
  const agendaCase = findBestAgendaCase(situation);
  if (!agendaCase) return null;

  const messages: CouncilMessage[] = [
    agendaLineToMessage(pickAgendaLine(agendaCase.opening, turn), "제갈량", situation),
    agendaLineToMessage(pickAgendaLine(agendaCase.responses["관우"], turn), "관우", situation),
    agendaLineToMessage(pickAgendaLine(agendaCase.responses["미축"], turn), "미축", situation),
    agendaLineToMessage(pickAgendaLine(agendaCase.responses["방통"], turn), "방통", situation),
  ];

  if (agendaCase.mentionResponses) {
    for (const mention of agendaCase.mentionResponses) {
      const line = pickAgendaLine(mention.variations, turn);
      const dialogue = typeof line.dialogue === "function"
        ? line.dialogue(situation) : line.dialogue;
      messages.push({
        speaker: mention.to,
        dialogue,
        emotion: line.emotion,
        phase: 1 as const,
        replyTo: mention.from,
      });
    }
  }

  const additional = pickAdditionalReports(situation, turn, agendaCase.id);
  messages.push(...additional);

  messages.push({
    speaker: "제갈량",
    dialogue: "이상입니다. 주공, 추가로 하문하실 것이 있으시면 말씀해 주시옵소서.",
    emotion: "calm" as const,
    phase: 1 as const,
  });

  return { messages, statusReports: [], stateChanges: null, advisorUpdates: [], source: "case", judgment };
}

// ===================== Phase 3 케이스 엔진 =====================

export function runPhase3FromCases(
  situation: GameSituation,
  turn: number,
  judgment?: StrategicJudgment,
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

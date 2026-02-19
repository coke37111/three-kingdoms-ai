/**
 * NPC AI 판단 구조 — 4-레이어 Utility AI (Plan 06)
 *
 * 레이어 구조:
 *   Goal Layer     → 천하통일 (고정)
 *   Strategy Layer → 현재 포지션 판단 (LLM 주기적 갱신 예정)
 *   Domestic Layer → 내정/준비 상태 판단 (결정론적 Utility AI)
 *   Combat Layer   → 전투 판단 (결정론적 Utility AI)
 *   Diplomacy Layer → 외교 판단 (결정론적 Utility AI)
 */

import type { Faction, WorldState, FactionId } from "@/types/game";
import type { NPCActionType, NPCTurnResult } from "@/lib/prompts/factionAIPrompt";
import {
  RECRUIT_TROOPS_PER_IP,
  TRAIN_IP_COST,
  getFacilityUpgradeCost,
  getFacilityBuildCost,
} from "@/constants/gameConstants";

// ===================== 공통 팩터 =====================

interface CommonFactors {
  /** (1등 군사력 - 내 군사력) / 1등 군사력. 클수록 위기 */
  pressureFromTop: number;
  /** 보유 성 수 / 전체 성 수. 작을수록 절박 */
  survivalMargin: number;
  /** 최고 동맹 관계도 / 10 (0~1) */
  allianceStability: number;
}

function calcCommonFactors(faction: Faction, world: WorldState): CommonFactors {
  const allMPs = world.factions.map(f => f.points.mp);
  const topMP = Math.max(...allMPs);
  const myMP = faction.points.mp;

  const pressureFromTop = topMP > 0 ? Math.max(0, (topMP - myMP) / topMP) : 0;
  const survivalMargin = world.castles.length > 0
    ? faction.castles.length / world.castles.length
    : 0;

  const myRelations = world.relations.filter(
    r => r.factionA === faction.id || r.factionB === faction.id,
  );
  const bestScore = myRelations.length > 0
    ? Math.max(0, ...myRelations.map(r => r.score))
    : 0;
  const allianceStability = bestScore / 10;

  return { pressureFromTop, survivalMargin, allianceStability };
}

// ===================== Strategy Layer =====================

interface StrategyContext {
  /** 최강 적 위협도 (0~1, S커브) */
  topThreat: number;
  /** 동맹 필요도: 압박감 × (1 - 동맹 안정도) */
  allianceNeed: number;
  /** 공세 가능도: 내 MP / 최약 적 MP */
  offensiveReady: number;
  /** 현재 전략 방향 */
  stance: "aggressive" | "defensive" | "diplomatic" | "consolidate";
}

function sigmoid(x: number, center = 0, steepness = 3): number {
  return 1 / (1 + Math.exp(-steepness * (x - center)));
}

function calcStrategyContext(
  faction: Faction,
  world: WorldState,
  common: CommonFactors,
): StrategyContext {
  const enemies = world.factions.filter(f => f.id !== faction.id);
  const sortedByMP = [...enemies].sort((a, b) => b.points.mp - a.points.mp);

  const topEnemyMP = sortedByMP[0]?.points.mp ?? 0;
  const secondEnemyMP = sortedByMP[1]?.points.mp ?? 0;
  const topThreatRaw = topEnemyMP / Math.max(1, secondEnemyMP + faction.points.mp);
  const topThreat = sigmoid(topThreatRaw, 1, 3);

  const allianceNeed = common.pressureFromTop * (1 - common.allianceStability);

  const weakestEnemyMP = sortedByMP[sortedByMP.length - 1]?.points.mp ?? 1;
  const offensiveReady = Math.min(3, faction.points.mp / Math.max(1, weakestEnemyMP));

  // 스탠스 결정
  let stance: StrategyContext["stance"];
  if (topThreat > 0.7) {
    stance = "diplomatic";
  } else if (offensiveReady > 1.3 && allianceNeed < 0.4) {
    stance = "aggressive";
  } else if (common.pressureFromTop > 0.5) {
    stance = "defensive";
  } else {
    stance = "consolidate";
  }

  // 성격에 따른 보정
  const aggression = faction.personality.aggression / 100;
  const diplomacyPref = faction.personality.diplomacy / 100;
  if (aggression > 0.7 && stance === "consolidate") stance = "aggressive";
  if (diplomacyPref > 0.7 && stance === "aggressive") stance = "diplomatic";

  return { topThreat, allianceNeed, offensiveReady, stance };
}

// ===================== Domestic Layer =====================

type DomesticPriority = "bank" | "market" | "farm" | "recruit" | "train" | "hold";

interface DomesticContext {
  ipMargin: number;
  combatReadiness: number;
  facilityEfficiency: number;
  wasteRate: number;
  priority: DomesticPriority;
}

function calcDomesticContext(
  faction: Faction,
  world: WorldState,
  strategy: StrategyContext,
): DomesticContext {
  const ip = faction.points.ip;
  const ipCap = faction.points.ip_cap;
  const ipRegen = faction.points.ip_regen;

  const ipMargin = ipCap > 0 ? ip / ipCap : 0;

  const enemies = world.factions.filter(f => f.id !== faction.id);
  const minEnemyMP = Math.min(...enemies.map(f => f.points.mp), 1);
  const combatReadiness = Math.min(2, faction.points.mp / Math.max(1, minEnemyMP));

  // 시설 효율: 현재 ipRegen / 다음 단계 예상 최대 regen 비교
  const upgradeBoost = 3 + 2; // market +3, farm +2 각 1레벨
  const potentialRegen = ipRegen + upgradeBoost;
  const facilityEfficiency = Math.min(1, ipRegen / Math.max(1, potentialRegen));

  // 낭비율: ipRegen 중 저장되지 못하는 비율
  const remainingCap = ipCap - ip;
  const overflow = Math.max(0, ipRegen - remainingCap);
  const wasteRate = ipRegen > 0 ? overflow / ipRegen : 0;

  // 업그레이드 비용 계산
  const castleCountForFaction = world.castles.filter(c => c.owner === faction.id).length;
  const marketCount = faction.facilities.market.count;
  const farmCount = faction.facilities.farm.count;
  // 성채 슬롯이 남아 있으면 건설(비용 높음), 꽉 찼으면 레벨업(비용 낮음)
  const marketCost = marketCount < castleCountForFaction
    ? getFacilityBuildCost(marketCount)
    : getFacilityUpgradeCost(faction.facilities.market.level);
  const farmCost = farmCount < castleCountForFaction
    ? getFacilityBuildCost(farmCount)
    : getFacilityUpgradeCost(faction.facilities.farm.level);
  const bankCost = getFacilityUpgradeCost(faction.facilities.bank);

  // 우선순위 결정
  let priority: DomesticPriority;

  if (wasteRate > 0.3 && ip >= bankCost) {
    priority = "bank";
  } else if (ipMargin < 0.3 && facilityEfficiency < 0.7) {
    // 생산성 향상 필요
    if (ip >= marketCost && ip >= farmCost) {
      priority = marketCost <= farmCost ? "market" : "farm";
    } else if (ip >= marketCost) {
      priority = "market";
    } else if (ip >= farmCost) {
      priority = "farm";
    } else {
      priority = "hold";
    }
  } else if (combatReadiness < 0.7) {
    // 전투 준비 부족
    const recruitable = Math.floor(ip * 0.5) * RECRUIT_TROOPS_PER_IP;
    const trainable = ip >= TRAIN_IP_COST;
    if (faction.points.mp_troops < 30000 && recruitable > 0) {
      priority = "recruit";
    } else if (trainable && faction.points.mp_training < 0.8) {
      priority = "train";
    } else {
      priority = "hold";
    }
  } else {
    // 여유 있으면 내정 발전
    const devPref = faction.personality.development / 100;
    if (devPref > 0.6 && ip >= Math.min(marketCost, farmCost)) {
      priority = ip >= marketCost && (marketCost <= farmCost || ip < farmCost)
        ? "market"
        : "farm";
    } else if (combatReadiness < 1.2 && ip >= Math.ceil(TRAIN_IP_COST * 0.9)) {
      priority = "train";
    } else {
      priority = "hold";
    }
  }

  return { ipMargin, combatReadiness, facilityEfficiency, wasteRate, priority };
}

// ===================== Combat Layer =====================

interface CombatContext {
  attackTarget: string | null;
  attackValue: number;
  winProbability: number;
  safetyMargin: number;
  action: "attack" | "wait";
}

function calcCombatContext(
  faction: Faction,
  world: WorldState,
  domestic: DomesticContext,
  strategy: StrategyContext,
): CombatContext {
  const noAttack: CombatContext = {
    attackTarget: null, attackValue: 0, winProbability: 0, safetyMargin: 0, action: "wait",
  };

  // 외교 모드이거나 전투 준비 부족이면 공격 안 함
  if (strategy.stance === "diplomatic" || domestic.combatReadiness < 0.7) return noAttack;

  // 인접한 적 성채 수집
  const myCastles = world.castles.filter(c => c.owner === faction.id);
  const adjacentTargets: typeof world.castles = [];
  for (const castle of myCastles) {
    for (const adjName of castle.adjacentCastles) {
      const adj = world.castles.find(c => c.name === adjName && c.owner !== faction.id);
      if (adj && !adjacentTargets.find(c => c.name === adj.name)) {
        adjacentTargets.push(adj);
      }
    }
  }

  if (adjacentTargets.length === 0) return noAttack;

  const gradeWeight: Record<string, number> = { "본성": 4, "요새": 2.5, "일반": 1 };

  let bestTarget: (typeof world.castles)[0] | null = null;
  let bestScore = -Infinity;
  let bestWinProb = 0;

  for (const target of adjacentTargets) {
    const targetFaction = world.factions.find(f => f.id === target.owner);
    if (!targetFaction) continue;

    // 승산: 내 MP / (적 MP × 방어 배율)
    const winProb = faction.points.mp / Math.max(1, targetFaction.points.mp * target.defenseMultiplier);

    const grade = gradeWeight[target.grade] ?? 1;
    const isCapitalBonus = target.grade === "본성" ? 2 : 1;
    const attackValue = (grade * isCapitalBonus) / target.defenseMultiplier;

    const score = attackValue * Math.min(2, winProb);
    if (score > bestScore) {
      bestScore = score;
      bestTarget = target;
      bestWinProb = winProb;
    }
  }

  if (!bestTarget || bestWinProb < 1.2) {
    return { ...noAttack, attackValue: bestScore, winProbability: bestWinProb };
  }

  // 안전 여유: 공격 후 예상 잔여 병력이 최소 필요량보다 많아야 함
  // 예상 손실: 대략 30% (패배해도 살아남아야 함)
  const estimatedLoss = faction.points.mp_troops * 0.3;
  const remainingAfterBattle = faction.points.mp_troops - estimatedLoss;
  const minSafeTroops = 10000; // 최소 1만 보유
  const safetyMargin = remainingAfterBattle / Math.max(1, minSafeTroops);

  const action = bestWinProb > 1.2 && safetyMargin > 1.0 ? "attack" as const : "wait" as const;

  return {
    attackTarget: bestTarget.name,
    attackValue: bestScore,
    winProbability: bestWinProb,
    safetyMargin,
    action,
  };
}

// ===================== Diplomacy Layer =====================

interface DiplomacyContext {
  action: "improve" | "discord" | "hold";
  target: FactionId | null;
}

function calcDiplomacyContext(
  faction: Faction,
  world: WorldState,
  strategy: StrategyContext,
): DiplomacyContext {
  const dp = faction.points.dp;

  if (dp < 2) return { action: "hold", target: null };

  const enemies = world.factions.filter(f => f.id !== faction.id);

  if (strategy.stance === "diplomatic") {
    // 가장 강한 적과 관계 개선 시도
    const bestTarget = enemies
      .map(e => {
        const rel = world.relations.find(
          r => (r.factionA === faction.id && r.factionB === e.id) ||
               (r.factionB === faction.id && r.factionA === e.id),
        );
        return { faction: e, score: rel?.score ?? 0 };
      })
      .filter(e => e.score < 7) // 이미 동맹이면 제외
      .sort((a, b) => b.faction.points.mp - a.faction.points.mp)[0];

    if (bestTarget) {
      return { action: "improve", target: bestTarget.faction.id };
    }
  }

  // 적끼리 동맹이 형성되어 있으면 이간 시도
  if (dp >= 3) {
    const npcRelations = world.relations.filter(
      r => r.factionA !== faction.id && r.factionB !== faction.id && r.score > 3,
    );
    if (npcRelations.length > 0) {
      // 가장 강한 적 세력을 이간 대상으로
      const strongestEnemy = enemies.sort((a, b) => b.points.mp - a.points.mp)[0];
      if (strongestEnemy) {
        return { action: "discord", target: strongestEnemy.id };
      }
    }
  }

  return { action: "hold", target: null };
}

// ===================== Utility AI 행동 결정 =====================

/**
 * NPC 세력 하나의 이번 턴 행동을 Utility AI로 결정한다.
 * 반환값은 기존 parseNPCResponse 결과와 동일한 NPCTurnResult 형식.
 */
export function calcNPCAction(faction: Faction, world: WorldState): NPCTurnResult {
  const common = calcCommonFactors(faction, world);
  const strategy = calcStrategyContext(faction, world, common);
  const domestic = calcDomesticContext(faction, world, strategy);
  const combat = calcCombatContext(faction, world, domestic, strategy);
  const diplomacy = calcDiplomacyContext(faction, world, strategy);

  // 레이어 간 연동: 전투 준비 부족 시 공격 팩터 억제
  const effectiveCombat = domestic.combatReadiness < 0.7
    ? { ...combat, action: "wait" as const }
    : combat;

  // 행동 결정 (우선순위 순)
  let action: NPCActionType = "대기";
  let target: string | undefined;
  let summary: string;

  // 1. 전투 (공세 스탠스 + 승산 있음)
  if (strategy.stance === "aggressive" && effectiveCombat.action === "attack" && effectiveCombat.attackTarget) {
    action = "공격";
    target = effectiveCombat.attackTarget;
    const targetCastle = world.castles.find(c => c.name === effectiveCombat.attackTarget);
    const targetFaction = world.factions.find(f => f.id === targetCastle?.owner);
    summary = `${targetFaction?.rulerName ?? "적"}의 ${effectiveCombat.attackTarget}을 공격합니다 (승산 ${Math.round(effectiveCombat.winProbability * 100)}%)`;
  }
  // 2. 내정 (Domestic Layer)
  else if (domestic.priority === "bank") {
    action = "개발";
    target = "bank";
    summary = `은행을 건설하여 내정 수용 한계를 늘립니다`;
  } else if (domestic.priority === "market") {
    action = "개발";
    target = "market";
    summary = `시장을 건설하여 내정 충전을 늘립니다`;
  } else if (domestic.priority === "farm") {
    action = "개발";
    target = "farm";
    summary = `논을 개발하여 내정 생산을 늘립니다`;
  } else if (domestic.priority === "recruit") {
    action = "모병";
    summary = `병력을 보충하여 전투 준비 태세를 갖춥니다`;
  } else if (domestic.priority === "train") {
    action = "훈련";
    summary = `군사 훈련을 통해 병력 정예화에 집중합니다`;
  }
  // 3. 외교
  else if (diplomacy.action === "improve" && diplomacy.target) {
    action = "외교";
    target = diplomacy.target;
    const targetFaction = world.factions.find(f => f.id === diplomacy.target);
    summary = `${targetFaction?.rulerName ?? ""}과 외교 관계를 개선합니다`;
  }
  // 4. 방어적 전투 시도 (수비 스탠스 + 승산 있음)
  else if (strategy.stance === "defensive" && effectiveCombat.action === "attack" && effectiveCombat.attackTarget) {
    action = "공격";
    target = effectiveCombat.attackTarget;
    const targetCastle = world.castles.find(c => c.name === effectiveCombat.attackTarget);
    const targetFaction = world.factions.find(f => f.id === targetCastle?.owner);
    summary = `선제 방어 차원에서 ${targetFaction?.rulerName ?? "적"}의 ${effectiveCombat.attackTarget}을 공격합니다`;
  }
  // 5. 대기
  else {
    action = "대기";
    summary = `내실을 다지며 다음 기회를 기다립니다`;
  }

  // 성격에 따른 행동 다양성 (간단한 보정)
  const aggressionMod = faction.personality.aggression / 100;
  if (action === "대기" && aggressionMod > 0.7 && effectiveCombat.attackTarget) {
    action = "공격";
    target = effectiveCombat.attackTarget;
    summary = `기회를 포착하여 ${effectiveCombat.attackTarget}을 공격합니다`;
  }

  return {
    factionId: faction.id,
    actions: [{ action, target }],
    summary,
  };
}

/**
 * 모든 NPC 세력의 행동을 Utility AI로 일괄 결정한다.
 */
export function calcAllNPCActions(world: WorldState): NPCTurnResult[] {
  const npcFactions = world.factions.filter(f => !f.isPlayer);
  return npcFactions.map(faction => calcNPCAction(faction, world));
}

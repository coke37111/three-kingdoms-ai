/**
 * 상황 정규화 모듈
 *
 * 게임 상태(GameSituation + WorldState)를 0~1 정규화 값으로 변환하여
 * 톤(어조) 결정과 대사 변수 주입에 활용한다.
 */

import type { WorldState } from "@/types/game";
import type { Emotion } from "@/types/chat";
import type { GameSituation, NormalizedSituation, NormalizationDetails, ToneLevel, ToneMap } from "./types";
import { scoreToLabel } from "@/lib/game/diplomacySystem";
import { IP_REGEN_PER_MARKET_LEVEL, IP_REGEN_PER_FARM_LEVEL } from "@/constants/gameConstants";

// ===================== 군사 정규화 =====================

function normalizeMilitary(
  situation: GameSituation,
  world: WorldState,
): {
  value: number;
  primaryThreat: NormalizationDetails["primaryThreat"];
  mpRatio: number;
} {
  const player = world.factions.find(f => f.isPlayer)!;
  const playerCastles = world.castles.filter(c => c.owner === player.id);

  // 인접 적 성채를 세력별로 그룹화
  const adjacentEnemyFactions = new Map<string, string[]>();
  for (const castle of playerCastles) {
    for (const adjName of castle.adjacentCastles) {
      const adjCastle = world.castles.find(c => c.name === adjName);
      if (adjCastle && adjCastle.owner !== player.id) {
        const existing = adjacentEnemyFactions.get(adjCastle.owner) ?? [];
        if (!existing.includes(adjName)) existing.push(adjName);
        adjacentEnemyFactions.set(adjCastle.owner, existing);
      }
    }
  }

  // 인접 적 없으면 안전
  if (adjacentEnemyFactions.size === 0) {
    return { value: 1.0, primaryThreat: null, mpRatio: Infinity };
  }

  // 각 인접 적의 위협 점수 계산
  // 위협 = (1 - (관계+10)/20) × 적 MP → 관계 -10: 가중치 1.0, +10: 가중치 0.0
  let maxThreatScore = 0;
  let primaryThreat: NormalizationDetails["primaryThreat"] = null;

  for (const [factionId, adjCastles] of adjacentEnemyFactions) {
    const faction = world.factions.find(f => f.id === factionId);
    if (!faction) continue;

    const relation = world.relations.find(
      r => (r.factionA === player.id && r.factionB === factionId) ||
           (r.factionB === player.id && r.factionA === factionId),
    );
    const score = relation?.score ?? 0;
    const hostilityWeight = 1 - (score + 10) / 20;
    const threatScore = hostilityWeight * faction.points.mp;

    if (threatScore > maxThreatScore) {
      maxThreatScore = threatScore;
      primaryThreat = {
        factionId,
        rulerName: faction.rulerName,
        mp: faction.points.mp,
        relationScore: score,
        relationLabel: scoreToLabel(score),
        adjacentCastles: adjCastles,
      };
    }
  }

  const playerMP = player.points.mp;
  const threatMP = primaryThreat?.mp ?? 1;
  const ratio = playerMP / Math.max(1, threatMP);
  // ratio 0.0 → 0.0, ratio 1.0 → 0.5, ratio 2.0+ → 1.0
  const value = Math.min(1, Math.max(0, ratio / 2));

  return { value, primaryThreat, mpRatio: ratio };
}

// ===================== 내정 정규화 =====================

function normalizeEconomy(situation: GameSituation): number {
  const { castleCount, ipRegen } = situation.economy;
  if (castleCount === 0) return 0;

  // 이론상 최대 IP 수입: 기본 5 + 성채당 (시장Lv5×3 + 논Lv5×2)
  const MAX_REGEN_PER_CASTLE = IP_REGEN_PER_MARKET_LEVEL * 5 + IP_REGEN_PER_FARM_LEVEL * 5;
  const baseRegen = 5;
  const maxPossibleRegen = baseRegen + castleCount * MAX_REGEN_PER_CASTLE;

  return Math.min(1, Math.max(0, ipRegen / maxPossibleRegen));
}

function calcMaxPossibleIpRegen(situation: GameSituation): number {
  const { castleCount } = situation.economy;
  const MAX_REGEN_PER_CASTLE = IP_REGEN_PER_MARKET_LEVEL * 5 + IP_REGEN_PER_FARM_LEVEL * 5;
  return 5 + castleCount * MAX_REGEN_PER_CASTLE;
}

// ===================== 외교 정규화 =====================

function normalizeDiplomacy(
  primaryThreat: NormalizationDetails["primaryThreat"],
): number {
  if (!primaryThreat) return 1.0;
  // -10 → 0.0, 0 → 0.5, +10 → 1.0
  return (primaryThreat.relationScore + 10) / 20;
}

// ===================== 공개 함수 =====================

export function normalizeSituation(
  situation: GameSituation,
  world: WorldState,
): NormalizedSituation {
  const player = world.factions.find(f => f.isPlayer)!;

  const { value: military, primaryThreat, mpRatio } = normalizeMilitary(situation, world);
  const economy = normalizeEconomy(situation);
  const diplomacy = normalizeDiplomacy(primaryThreat);
  const overall = Math.min(military, economy, diplomacy);

  const threatRelationScore = primaryThreat?.relationScore ?? 0;

  const details: NormalizationDetails = {
    primaryThreat,
    playerMP: player.points.mp,
    playerTroops: player.points.mp_troops,
    playerTraining: player.points.mp_training,
    mpRatio,
    ip: player.points.ip,
    ipRegen: player.points.ip_regen,
    ipCap: player.points.ip_cap,
    maxPossibleIpRegen: calcMaxPossibleIpRegen(situation),
    marketCount: situation.economy.marketCount,
    farmCount: situation.economy.farmCount,
    castleCount: situation.economy.castleCount,
    threatRelationScore,
    dp: player.points.dp,
  };

  return { military, economy, diplomacy, overall, details };
}

export function toToneLevel(value: number): ToneLevel {
  if (value >= 0.85) return "comfortable";
  if (value >= 0.65) return "stable";
  if (value >= 0.45) return "adequate";
  if (value >= 0.30) return "uneasy";
  if (value >= 0.15) return "crisis";
  return "critical";
}

export function deriveToneMap(normalized: NormalizedSituation): ToneMap {
  return {
    military: toToneLevel(normalized.military),
    economy: toToneLevel(normalized.economy),
    diplomacy: toToneLevel(normalized.diplomacy),
    overall: toToneLevel(normalized.overall),
  };
}

export function toneToEmotion(tone: ToneLevel): Emotion {
  switch (tone) {
    case "comfortable": return "calm";
    case "stable":      return "calm";
    case "adequate":    return "thoughtful";
    case "uneasy":      return "worried";
    case "crisis":      return "worried";
    case "critical":    return "angry";
  }
}

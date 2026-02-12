import type { WorldState, FactionId, GameEndResult, VictoryType, DefeatType } from "@/types/game";

function getTotalCityCount(world: WorldState): number {
  return world.factions.reduce((sum, f) => sum + f.cities.length, 0);
}

function checkVictory(world: WorldState, playerId: FactionId): { type: VictoryType; met: boolean } | null {
  const player = world.factions.find((f) => f.id === playerId);
  if (!player) return null;

  const totalCities = getTotalCityCount(world);
  const playerCities = player.cities.length;

  // 천하통일: 모든 도시 보유
  if (playerCities === totalCities && totalCities > 0) {
    return { type: "천하통일", met: true };
  }

  // 천명: 70% 이상 도시 + 민심 90 이상
  if (totalCities > 0 && playerCities / totalCities >= 0.7 && player.popularity >= 90) {
    return { type: "천명", met: true };
  }

  return null;
}

function checkDefeat(world: WorldState, playerId: FactionId): { type: DefeatType; met: boolean } | null {
  const player = world.factions.find((f) => f.id === playerId);
  if (!player) return { type: "멸망", met: true };

  // 멸망: 도시 0개
  if (player.cities.length === 0) {
    return { type: "멸망", met: true };
  }

  // 파산: 금, 식량, 병력 모두 0
  if (player.gold <= 0 && player.food <= 0 && player.totalTroops <= 0) {
    return { type: "파산", met: true };
  }

  return null;
}

export function checkGameEnd(
  world: WorldState,
  playerId: FactionId = "liu_bei",
): GameEndResult | null {
  // 패배 먼저 체크
  const defeat = checkDefeat(world, playerId);
  if (defeat?.met) {
    return {
      type: "defeat",
      reason: defeat.type,
      turn: world.currentTurn,
      stats: gatherStats(world, playerId),
    };
  }

  // 승리 체크
  const victory = checkVictory(world, playerId);
  if (victory?.met) {
    return {
      type: "victory",
      reason: victory.type,
      turn: world.currentTurn,
      stats: gatherStats(world, playerId),
    };
  }

  return null;
}

function gatherStats(world: WorldState, playerId: FactionId): GameEndResult["stats"] {
  const player = world.factions.find((f) => f.id === playerId);
  return {
    totalTurns: world.currentTurn,
    citiesOwned: player?.cities.length ?? 0,
    generalsRecruited: player?.generals.length ?? 0,
    battlesWon: 0,
    battlesLost: 0,
  };
}

import type { WorldState, FactionId, GameEndResult } from "@/types/game";
import { CAPITAL_CASTLES } from "@/constants/castles";

/** 승리 조건: 다른 세력의 본성을 모두 함락 */
function checkVictory(world: WorldState, playerId: FactionId): boolean {
  const enemyCapitals = Object.entries(CAPITAL_CASTLES)
    .filter(([fid]) => fid !== playerId)
    .map(([, name]) => name);

  return enemyCapitals.every(capitalName => {
    const castle = world.castles.find(c => c.name === capitalName);
    return castle && castle.owner === playerId;
  });
}

/** 패배 조건: 자기 본성이 함락 */
function checkDefeat(world: WorldState, playerId: FactionId): boolean {
  const capitalName = CAPITAL_CASTLES[playerId];
  if (!capitalName) return true;

  const castle = world.castles.find(c => c.name === capitalName);
  return !castle || castle.owner !== playerId;
}

export function checkGameEnd(
  world: WorldState,
  playerId: FactionId = "liu_bei",
): GameEndResult | null {
  const player = world.factions.find(f => f.id === playerId);
  if (!player) {
    return {
      type: "defeat",
      reason: "멸망",
      turn: world.currentTurn,
      stats: { totalTurns: world.currentTurn, castlesOwned: 0, battlesWon: 0, battlesLost: 0 },
    };
  }

  // 패배 체크
  if (checkDefeat(world, playerId)) {
    return {
      type: "defeat",
      reason: "멸망",
      turn: world.currentTurn,
      stats: gatherStats(world, playerId),
    };
  }

  // 승리 체크
  if (checkVictory(world, playerId)) {
    return {
      type: "victory",
      reason: "천하통일",
      turn: world.currentTurn,
      stats: gatherStats(world, playerId),
    };
  }

  return null;
}

function gatherStats(world: WorldState, playerId: FactionId): GameEndResult["stats"] {
  const player = world.factions.find(f => f.id === playerId);
  return {
    totalTurns: world.currentTurn,
    castlesOwned: player?.castles.length ?? 0,
    battlesWon: 0,
    battlesLost: 0,
  };
}

import type { General, BattleResult, BattleType, FactionId, City } from "@/types/game";
import { getTerrainDefenseBonus } from "@/constants/worldMap";

interface CombatForce {
  factionId: FactionId;
  generals: General[];
  troops: number;
  isDefender: boolean;
  cityName?: string;
}

function calculateBattlePower(force: CombatForce, battleType: BattleType): number {
  const leadGeneral = force.generals.reduce((best, g) =>
    g.warfare > best.warfare ? g : best
  , force.generals[0]);

  if (!leadGeneral) return force.troops * 0.5;

  // 기본 장수 능력 반영
  let generalPower: number;
  switch (battleType) {
    case "야전":
      generalPower = leadGeneral.warfare * 0.6 + leadGeneral.leadership * 0.3 + leadGeneral.intelligence * 0.1;
      break;
    case "공성전":
      generalPower = leadGeneral.intelligence * 0.4 + leadGeneral.warfare * 0.3 + leadGeneral.leadership * 0.3;
      break;
    case "매복":
      generalPower = leadGeneral.intelligence * 0.6 + leadGeneral.warfare * 0.2 + leadGeneral.leadership * 0.2;
      break;
  }

  // 추가 장수 보너스 (부장)
  const subGeneralBonus = force.generals.slice(1).reduce((sum, g) =>
    sum + (g.leadership * 0.1 + g.warfare * 0.05), 0
  );

  // 병력 전투력 = 병력수 × (장수 능력 보정)
  const troopEfficiency = (generalPower + subGeneralBonus) / 100;
  let power = force.troops * (0.3 + troopEfficiency * 0.7);

  // 지형 방어 보너스
  if (force.isDefender && force.cityName) {
    const terrainBonus = getTerrainDefenseBonus(force.cityName);
    power *= (1 + terrainBonus / 100);
  }

  // 공성전에서 수비 측 추가 보너스
  if (battleType === "공성전" && force.isDefender) {
    power *= 1.3;
  }

  // 랜덤 요소 (±15%)
  const randomFactor = 0.85 + Math.random() * 0.3;
  return Math.floor(power * randomFactor);
}

function calculateCasualties(
  loserTroops: number,
  winnerTroops: number,
  powerRatio: number,
): { winnerLoss: number; loserLoss: number } {
  const baseLossRate = 0.1 + Math.random() * 0.15;
  const loserLossRate = Math.min(0.6, baseLossRate + (1 - powerRatio) * 0.3);
  const winnerLossRate = Math.max(0.03, baseLossRate * powerRatio * 0.5);

  return {
    winnerLoss: Math.floor(winnerTroops * winnerLossRate),
    loserLoss: Math.floor(loserTroops * loserLossRate),
  };
}

function checkGeneralCapture(generals: General[]): string[] {
  return generals.filter(() => Math.random() < 0.15).map((g) => g.generalName);
}

export function resolveBattle(
  attacker: CombatForce,
  defender: CombatForce,
  battleType: BattleType,
  targetCity: City,
): BattleResult {
  const attackerPower = calculateBattlePower(attacker, battleType);
  const defenderPower = calculateBattlePower(defender, battleType);

  const totalPower = attackerPower + defenderPower;
  const attackerRatio = attackerPower / totalPower;

  const attackerWins = attackerRatio > 0.5;
  const powerRatio = attackerWins
    ? defenderPower / attackerPower
    : attackerPower / defenderPower;

  const casualties = calculateCasualties(
    attackerWins ? defender.troops : attacker.troops,
    attackerWins ? attacker.troops : defender.troops,
    powerRatio,
  );

  const capturedGenerals = checkGeneralCapture(
    attackerWins ? defender.generals : attacker.generals,
  );

  // 공성전 승리 시에만 도시 정복
  const cityConquered = attackerWins && battleType === "공성전"
    ? targetCity.cityName
    : attackerWins && battleType === "야전" && Math.random() < 0.4
      ? targetCity.cityName
      : null;

  return {
    winner: attackerWins ? attacker.factionId : defender.factionId,
    loser: attackerWins ? defender.factionId : attacker.factionId,
    battleType,
    attackerLosses: attackerWins ? casualties.winnerLoss : casualties.loserLoss,
    defenderLosses: attackerWins ? casualties.loserLoss : casualties.winnerLoss,
    capturedGenerals,
    cityConquered,
    narrative: "",
  };
}

export function generateBattleNarrative(result: BattleResult, attackerName: string, defenderName: string): string {
  const typeStr = result.battleType === "야전" ? "야전" : result.battleType === "공성전" ? "공성전" : "매복전";
  const winnerIsAttacker = result.winner !== result.loser;

  let narrative = `⚔️ ${attackerName} vs ${defenderName} — ${typeStr}\n`;
  narrative += `결과: ${result.winner === result.loser ? "무승부" : `${result.winner === attackerName ? attackerName : defenderName} 승리`}\n`;
  narrative += `피해: 공격측 -${result.attackerLosses.toLocaleString()}명, 수비측 -${result.defenderLosses.toLocaleString()}명`;

  if (result.capturedGenerals.length > 0) {
    narrative += `\n포로: ${result.capturedGenerals.join(", ")}`;
  }
  if (result.cityConquered) {
    narrative += `\n🏯 ${result.cityConquered} 함락!`;
  }

  return narrative;
}

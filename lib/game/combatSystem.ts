import type { BattleResult, BattleType, FactionId, Castle, Faction, RetreatInfo } from "@/types/game";
import {
  BASE_CASUALTY_RATE,
  MAX_CASUALTY_RATE,
  WOUNDED_CONVERSION_RATE,
  SIEGE_FACILITY_DAMAGE_RATE,
  MAX_SIEGE_FACILITY_DAMAGE,
  RETREAT_TROOP_LOSS_RATE,
  RETREAT_MORALE_PENALTY,
  WALL_DEFENSE_PER_LEVEL,
} from "@/constants/gameConstants";
import { SKILL_TREE } from "@/constants/skills";

interface CombatForce {
  factionId: FactionId;
  mp: number;                 // 투입 MP
  troops: number;             // 투입 병력
  defenseMultiplier: number;  // 방어 배율
  skills: string[];           // 해금 스킬 id
}

/** 전투 유형에 따른 기본 방어 배율 */
function getDefenseMultiplier(
  battleType: BattleType,
  castle: Castle | null,
  isDefender: boolean,
): number {
  if (battleType === "야전") return 1.0;
  if (battleType === "공성" && !isDefender) return 1.0;
  // 수성: 성채 방어 배율 + 성벽 레벨 보너스 적용
  if (isDefender && castle) {
    const wallBonus = ((castle.wallLevel ?? 1) - 1) * WALL_DEFENSE_PER_LEVEL;
    return castle.defenseMultiplier + wallBonus;
  }
  return 1.0;
}

/** 스킬 보너스 계산 */
function getSkillBonus(skills: string[], type: "siege_buff" | "defense_buff"): number {
  let bonus = 0;
  for (const sid of skills) {
    const def = SKILL_TREE.find(s => s.id === sid);
    if (def?.effect.type === type) bonus += def.effect.value;
  }
  return bonus;
}

/**
 * 전투 해결
 * 공식: (나의 MP × 나의 방어력) - (적의 MP × 적의 방어력)
 */
export function resolveBattle(
  attackerFaction: Faction,
  defenderFaction: Faction,
  battleType: BattleType,
  targetCastle: Castle | null,
  attackerTroops: number,
  defenderTroops: number,
): BattleResult {
  // 배치 상한 적용
  attackerTroops = Math.min(attackerTroops, attackerFaction.rulerLevel.deploymentCap);
  defenderTroops = Math.min(defenderTroops, defenderFaction.rulerLevel.deploymentCap);

  // 방어 배율 계산
  let attackerDef = getDefenseMultiplier(battleType, targetCastle, false);
  let defenderDef = getDefenseMultiplier(battleType, targetCastle, true);

  // 스킬 보너스 적용
  if (battleType === "공성") {
    attackerDef += getSkillBonus(attackerFaction.skills, "siege_buff");
  }
  if (battleType === "수성") {
    defenderDef += getSkillBonus(defenderFaction.skills, "defense_buff");
  }

  // MP 산출 (투입 병력 기준)
  const attackerMP = Math.floor(
    attackerTroops * attackerFaction.points.mp_training * attackerFaction.points.mp_morale,
  );
  const defenderMP = Math.floor(
    defenderTroops * defenderFaction.points.mp_training * defenderFaction.points.mp_morale,
  );

  // 전투 결과
  const attackerPower = attackerMP * attackerDef;
  const defenderPower = defenderMP * defenderDef;
  const result = attackerPower - defenderPower;

  // 랜덤 변동 (±10%)
  const randomFactor = 0.9 + Math.random() * 0.2;
  const adjustedResult = result * randomFactor;

  const attackerWins = adjustedResult > 0;

  // 손실 계산
  const powerRatio = attackerWins
    ? defenderPower / Math.max(1, attackerPower)
    : attackerPower / Math.max(1, defenderPower);

  const baseCasualtyRate = BASE_CASUALTY_RATE + (1 - powerRatio) * 0.15;
  const casualtyRate = Math.min(MAX_CASUALTY_RATE, baseCasualtyRate);

  const winnerTroops = attackerWins ? attackerTroops : defenderTroops;
  const loserTroops = attackerWins ? defenderTroops : attackerTroops;

  const loserDead = Math.floor(loserTroops * casualtyRate);
  const winnerDead = Math.floor(winnerTroops * casualtyRate * powerRatio * 0.5);

  // 부상병 전환 (사망자의 70%)
  const loserWounded = Math.floor(loserDead * WOUNDED_CONVERSION_RATE);
  const winnerWounded = Math.floor(winnerDead * WOUNDED_CONVERSION_RATE);

  const attackerLosses = attackerWins ? winnerDead : loserDead;
  const defenderLosses = attackerWins ? loserDead : winnerDead;
  const attackerWoundedCount = attackerWins ? winnerWounded : loserWounded;
  const defenderWoundedCount = attackerWins ? loserWounded : winnerWounded;

  // 성채 점령: 공성 승리 시만 (수성은 방어측 성채이므로 공격자가 점령 불가)
  const castleConquered =
    attackerWins && targetCastle && battleType === "공성"
      ? targetCastle.name
      : null;

  // 시설 피해 계산 (공성/수성 전투 시)
  let facilityDamage: BattleResult["facilityDamage"];
  if (targetCastle && (battleType === "공성" || battleType === "수성")) {
    const rawDamage = (attackerTroops + defenderTroops) * SIEGE_FACILITY_DAMAGE_RATE;
    facilityDamage = {
      farm_damage: Math.min(MAX_SIEGE_FACILITY_DAMAGE, Math.floor(rawDamage)),
      market_damage: Math.min(MAX_SIEGE_FACILITY_DAMAGE, Math.floor(rawDamage * 0.8)),
    };
  }

  return {
    winner: attackerWins ? attackerFaction.id : defenderFaction.id,
    loser: attackerWins ? defenderFaction.id : attackerFaction.id,
    battleType,
    attackerLosses,
    defenderLosses,
    attackerWounded: attackerWoundedCount,
    defenderWounded: defenderWoundedCount,
    castleConquered,
    narrative: "",
    facilityDamage,
  };
}

/**
 * 도주 판정
 * 전투 패배 + 성채 함락 시 잔여 병력의 도주 처리
 */
export function resolveRetreat(
  loserFaction: Faction,
  fromCastleName: string,
  allCastles: Castle[],
): RetreatInfo | null {
  const fromCastle = allCastles.find(c => c.name === fromCastleName);
  if (!fromCastle) return null;

  // 본성 함락 시 도주 불가
  if (fromCastle.grade === "본성") return null;

  // 다른 자기 성채 찾기
  const ownCastles = allCastles.filter(c => c.owner === loserFaction.id && c.name !== fromCastleName);
  if (ownCastles.length === 0) return null;

  // 인접 자기 성채 우선, 없으면 아무 자기 성채
  const adjacentOwn = ownCastles.filter(c => fromCastle.adjacentCastles.includes(c.name));
  const toCastle = adjacentOwn.length > 0 ? adjacentOwn[0] : ownCastles[0];

  // 추가 병력 손실
  const remainingTroops = loserFaction.points.mp_troops;
  const troopsLost = Math.floor(remainingTroops * RETREAT_TROOP_LOSS_RATE);

  return {
    retreatingFaction: loserFaction.id,
    fromCastle: fromCastleName,
    toCastle: toCastle.name,
    troopsLost,
    moralePenalty: RETREAT_MORALE_PENALTY,
  };
}

/** 전투 서사 생성 */
export function generateBattleNarrative(
  result: BattleResult,
  attackerName: string,
  defenderName: string,
  attackerFactionId?: FactionId,
): string {
  const typeStr = result.battleType === "야전" ? "야전" : result.battleType === "공성" ? "공성전" : "수성전";

  // winner FactionId 기반 승자 이름 결정
  const winnerName = (attackerFactionId && result.winner === attackerFactionId) ? attackerName : defenderName;

  let narrative = `⚔️ ${attackerName} vs ${defenderName} — ${typeStr}\n`;
  narrative += `결과: ${winnerName} 승리\n`;
  narrative += `피해: 공격측 -${result.attackerLosses.toLocaleString()}명 (부상 ${result.attackerWounded.toLocaleString()}), `;
  narrative += `수비측 -${result.defenderLosses.toLocaleString()}명 (부상 ${result.defenderWounded.toLocaleString()})`;

  if (result.castleConquered) {
    narrative += `\n🏯 ${result.castleConquered} 함락!`;
  }

  return narrative;
}

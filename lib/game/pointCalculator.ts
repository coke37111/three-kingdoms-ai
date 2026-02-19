import type { Faction, FactionPoints, WoundedPool } from "@/types/game";
import {
  AP_CARRYOVER_RATE,
  IP_REGEN_PER_MARKET_LEVEL,
  IP_REGEN_PER_FARM_LEVEL,
  IP_CAP_PER_BANK_LEVEL,
  BASE_IP_CAP,
  WOUND_RECOVERY_TURNS,
  DP_REGEN_PER_TURN,
  TROOP_MAINTENANCE_DIVISOR,
  TROOP_STARVATION_RATE,
} from "@/constants/gameConstants";
import { SKILL_TREE } from "@/constants/skills";

/** 매턴 포인트 충전 처리 */
export function calcPointsForTurn(faction: Faction): {
  nextPoints: FactionPoints;
  nextWoundedPool: WoundedPool[];
  recoveredTroops: number;
  maintenanceCost: number;
  starvationLoss: number;
} {
  const p = { ...faction.points };
  const skills = faction.skills;

  // ── AP 이월 + 충전 ──
  const carryover = Math.floor(p.ap * AP_CARRYOVER_RATE);
  let regenBonus = 0;
  for (const sid of skills) {
    const def = SKILL_TREE.find(s => s.id === sid);
    if (def?.effect.type === "ap_regen") regenBonus += def.effect.value;
  }
  p.ap = Math.min(p.ap_max, carryover + p.ap_regen + regenBonus);

  // ── IP 충전 (시설 기반: 시장×3 + 논×2) ──
  const ipRegenBase =
    faction.facilities.market.count * faction.facilities.market.level * IP_REGEN_PER_MARKET_LEVEL +
    faction.facilities.farm.count * faction.facilities.farm.level * IP_REGEN_PER_FARM_LEVEL;
  let ipBonus = 0;
  for (const sid of skills) {
    const def = SKILL_TREE.find(s => s.id === sid);
    if (def?.effect.type === "ip_bonus") ipBonus += def.effect.value;
  }
  const ipCap = BASE_IP_CAP + faction.facilities.bank * IP_CAP_PER_BANK_LEVEL;
  p.ip_regen = ipRegenBase + ipBonus;
  p.ip_cap = ipCap;
  p.ip = Math.min(ipCap, p.ip + p.ip_regen);

  // ── 병사 유지비 (병력 5,000명당 IP 1 소모) ──
  const maintenanceCost = Math.floor(p.mp_troops / TROOP_MAINTENANCE_DIVISOR);
  let starvationLoss = 0;
  if (p.ip >= maintenanceCost) {
    p.ip -= maintenanceCost;
  } else {
    starvationLoss = Math.floor(p.mp_troops * TROOP_STARVATION_RATE);
    p.mp_troops = Math.max(0, p.mp_troops - starvationLoss);
    p.ip = 0;
  }

  // ── SP 소량 자동 충전 ──
  p.sp += 1;

  // ── DP 소량 자동 충전 (dp_bonus 스킬로 효율 증가) ──
  let dpBonus = 0;
  for (const sid of skills) {
    const def = SKILL_TREE.find(s => s.id === sid);
    if (def?.effect.type === "dp_bonus") dpBonus += def.effect.value;
  }
  p.dp += DP_REGEN_PER_TURN * (1 + dpBonus);

  // ── 훈련도 자동 증가 (스킬) ──
  for (const sid of skills) {
    const def = SKILL_TREE.find(s => s.id === sid);
    if (def?.effect.type === "mp_auto") {
      p.mp_training = Math.min(1.0, p.mp_training + def.effect.value);
    }
  }

  // ── MP 산출 (병력 × 훈련도 × 사기) ──
  p.mp = Math.floor(p.mp_troops * p.mp_training * p.mp_morale);

  // ── 부상병 회복 ──
  let recoveredTroops = 0;
  const nextPool: WoundedPool[] = [];
  for (const w of faction.woundedPool) {
    const perTurn = Math.ceil(w.amount / w.recoveryTurns);
    recoveredTroops += perTurn;
    const remaining = w.amount - perTurn;
    if (remaining > 0 && w.recoveryTurns > 1) {
      nextPool.push({ amount: remaining, recoveryTurns: w.recoveryTurns - 1 });
    }
  }
  p.mp_troops += recoveredTroops;

  // ── MP 재산출 (부상 복귀 반영) ──
  p.mp = Math.floor(p.mp_troops * p.mp_training * p.mp_morale);

  return { nextPoints: p, nextWoundedPool: nextPool, recoveredTroops, maintenanceCost, starvationLoss };
}

/** MP 산출값 계산 (순수 함수) */
export function calculateMP(troops: number, training: number, morale: number): number {
  return Math.floor(troops * training * morale);
}

/** 새 부상병 풀 생성 */
export function createWoundedPool(amount: number): WoundedPool {
  return { amount, recoveryTurns: WOUND_RECOVERY_TURNS };
}

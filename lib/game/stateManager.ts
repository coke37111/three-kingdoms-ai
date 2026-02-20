import type { Faction, FactionPoints, StateChanges, PointDeltas, Castle, Facilities, FacilityBuilding } from "@/types/game";
import { DEPLOYMENT_PER_LEVEL, BASE_XP_TO_LEVEL, XP_PER_LEVEL_SCALING, WALL_MAX_LEVEL } from "@/constants/gameConstants";

export interface ApplyResult {
  nextFaction: Faction;
  resultMessage: string | null;
}

/** PointDeltas를 FactionPoints에 적용 */
function applyPointDeltas(points: FactionPoints, deltas: PointDeltas): FactionPoints {
  const p = { ...points };

  if (deltas.ap_delta != null) p.ap = Math.max(0, p.ap + deltas.ap_delta);
  if (deltas.sp_delta != null) p.sp = Math.max(0, p.sp + deltas.sp_delta);
  if (deltas.ip_delta != null) p.ip = Math.max(0, Math.min(p.ip_cap, p.ip + deltas.ip_delta));
  if (deltas.dp_delta != null) p.dp = Math.max(0, p.dp + deltas.dp_delta);

  if (deltas.mp_troops_delta != null) {
    p.mp_troops = Math.max(0, p.mp_troops + deltas.mp_troops_delta);
  }
  if (deltas.mp_training_delta != null) {
    p.mp_training = Math.max(0, Math.min(1.0, p.mp_training + deltas.mp_training_delta));
  }
  if (deltas.mp_morale_delta != null) {
    p.mp_morale = Math.max(0.8, Math.min(1.2, p.mp_morale + deltas.mp_morale_delta));
  }

  // MP 재산출
  p.mp = Math.floor(p.mp_troops * p.mp_training * p.mp_morale);

  return p;
}

/** 시설 업그레이드 적용 */
function applyFacilityUpgrades(
  facilities: Facilities,
  upgrades: { type: "market" | "farm" | "bank"; count_delta?: number; level_delta?: number }[],
  castleCount: number,
): Facilities {
  const f: Facilities = {
    market: { ...facilities.market },
    farm: { ...facilities.farm },
    bank: facilities.bank,
  };
  for (const u of upgrades) {
    if (u.type === "bank") {
      if (u.level_delta) f.bank = Math.max(0, f.bank + u.level_delta);
    } else {
      const b = f[u.type] as FacilityBuilding;
      if (u.count_delta) {
        b.count = Math.max(0, b.count + u.count_delta);
        // 보유 성채 수를 초과할 수 없음
        if (castleCount > 0) b.count = Math.min(b.count, castleCount);
      }
      if (u.level_delta) {
        b.level = Math.max(1, b.level + u.level_delta);
      }
    }
  }
  return f;
}

/** StateChanges를 세력에 적용 */
export function applyStateChanges(
  faction: Faction,
  changes: StateChanges,
  castles: Castle[],
): { nextFaction: Faction; nextCastles: Castle[]; resultMessage: string | null } {
  let nextFaction = { ...faction };
  let nextCastles = [...castles];

  // 포인트 변동 적용
  if (changes.point_deltas) {
    nextFaction.points = applyPointDeltas(nextFaction.points, changes.point_deltas);
  }

  // 시설 업그레이드 (시장·논은 성채 수 상한)
  if (changes.facility_upgrades) {
    const castleCount = nextCastles.filter(c => c.owner === faction.id).length;
    nextFaction.facilities = applyFacilityUpgrades(nextFaction.facilities, changes.facility_upgrades, castleCount);
  }

  // 스킬 해금
  if (changes.skill_unlocks) {
    nextFaction.skills = [...new Set([...nextFaction.skills, ...changes.skill_unlocks])];
  }

  // 경험치 획득 + 레벨업
  if (changes.xp_gain) {
    const rl = { ...nextFaction.rulerLevel };
    rl.xp += changes.xp_gain;
    while (rl.xp >= rl.xpToNext) {
      rl.xp -= rl.xpToNext;
      rl.level += 1;
      rl.deploymentCap = rl.level * DEPLOYMENT_PER_LEVEL;
      rl.xpToNext = BASE_XP_TO_LEVEL + (rl.level - 1) * XP_PER_LEVEL_SCALING;
    }
    nextFaction.rulerLevel = rl;
  }

  // 성채 업데이트
  if (changes.castle_updates) {
    for (const cu of changes.castle_updates) {
      nextCastles = nextCastles.map(c => {
        if (c.name !== cu.castle) return c;
        const updated = { ...c };
        if (cu.garrison_delta != null) {
          updated.garrison = Math.max(0, updated.garrison + cu.garrison_delta);
        }
        if (cu.new_owner) {
          updated.owner = cu.new_owner;
        }
        return updated;
      });
    }
  }

  // 성채 점령 처리
  if (changes.conquered_castles) {
    for (const castleName of changes.conquered_castles) {
      // 기존 주인에게서 제거, 새 주인에게 추가
      nextCastles = nextCastles.map(c =>
        c.name === castleName ? { ...c, owner: faction.id } : c,
      );
      if (!nextFaction.castles.includes(castleName)) {
        nextFaction.castles = [...nextFaction.castles, castleName];
      }
    }
  }

  // 성벽 업그레이드 (점령 이후 처리 — 같은 턴 정복 성채도 업그레이드 가능)
  if (changes.wall_upgrades) {
    nextCastles = nextCastles.map(c => {
      if (c.owner !== faction.id) return c;
      const upd = changes.wall_upgrades!.find(w => w.castle === c.name);
      if (!upd) return c;
      const newLevel = Math.max(1, Math.min(WALL_MAX_LEVEL, (c.wallLevel ?? 1) + upd.level_delta));
      return { ...c, wallLevel: newLevel };
    });
  }

  // 소유 성채 목록 동기화
  nextFaction.castles = nextCastles
    .filter(c => c.owner === faction.id)
    .map(c => c.name);

  return {
    nextFaction,
    nextCastles,
    resultMessage: changes.result_message || null,
  };
}

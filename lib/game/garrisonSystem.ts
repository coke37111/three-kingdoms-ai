import type { Castle, Faction, FactionId, CastleUpdate } from "@/types/game";
import { GARRISON_CAPITAL_RATIO, GARRISON_FRONTLINE_RATIO } from "@/constants/gameConstants";
import { CAPITAL_CASTLES } from "@/constants/castles";

/** 적 소유 인접 성채가 하나라도 있으면 전선 성채 */
export function isFrontlineCastle(
  castle: Castle,
  allCastles: Castle[],
  factionId: FactionId,
): boolean {
  return castle.adjacentCastles.some(adjName => {
    const adj = allCastles.find(c => c.name === adjName);
    return adj != null && adj.owner !== factionId;
  });
}

/** 배분 우선순위 점수 (높을수록 우선) */
function garrisonPriority(
  castle: Castle,
  allCastles: Castle[],
  factionId: FactionId,
): number {
  let score = 0;
  if (castle.name === CAPITAL_CASTLES[factionId]) score += 100;
  if (isFrontlineCastle(castle, allCastles, factionId)) score += 50;
  if (castle.grade === "요새") score += 20;
  if (castle.grade === "본성") score += 10;
  return score;
}

/**
 * mp_troops를 성채별로 배분 → Map<성채명, 배분병력>
 *
 * 1. 본성에 totalTroops × 0.25 예약 (maxGarrison 상한)
 * 2. 전선 성채에 totalTroops × 0.55 → 우선순위 점수 기반 가중 분배
 * 3. 후방 성채에 나머지 균등 분배
 * 4. 모든 성채 maxGarrison 초과 방지, 초과분 재분배
 */
export function distributeGarrison(
  ownedCastles: Castle[],
  totalTroops: number,
  allCastles: Castle[],
  factionId: FactionId,
): Map<string, number> {
  const result = new Map<string, number>();
  if (ownedCastles.length === 0 || totalTroops <= 0) return result;

  // 초기값 0
  for (const c of ownedCastles) result.set(c.name, 0);

  const capitalName = CAPITAL_CASTLES[factionId];
  const capital = ownedCastles.find(c => c.name === capitalName);
  const frontline = ownedCastles.filter(c => c.name !== capitalName && isFrontlineCastle(c, allCastles, factionId));
  const rear = ownedCastles.filter(c => c.name !== capitalName && !isFrontlineCastle(c, allCastles, factionId));

  let remaining = totalTroops;

  // 1) 본성 예약
  if (capital) {
    const capitalAlloc = Math.min(
      Math.floor(totalTroops * GARRISON_CAPITAL_RATIO),
      capital.maxGarrison,
    );
    result.set(capital.name, capitalAlloc);
    remaining -= capitalAlloc;
  }

  // 2) 전선 배분 (우선순위 가중)
  if (frontline.length > 0 && remaining > 0) {
    const frontlinePool = Math.min(remaining, Math.floor(totalTroops * GARRISON_FRONTLINE_RATIO));
    const priorities = frontline.map(c => ({
      castle: c,
      score: garrisonPriority(c, allCastles, factionId),
    }));
    const totalScore = priorities.reduce((s, p) => s + p.score, 0) || 1;

    let allocated = 0;
    for (const p of priorities) {
      const share = Math.min(
        Math.floor(frontlinePool * (p.score / totalScore)),
        p.castle.maxGarrison,
      );
      result.set(p.castle.name, share);
      allocated += share;
    }
    remaining -= allocated;
  }

  // 3) 후방 균등 분배
  if (rear.length > 0 && remaining > 0) {
    const perCastle = Math.floor(remaining / rear.length);
    let allocated = 0;
    for (const c of rear) {
      const share = Math.min(perCastle, c.maxGarrison);
      result.set(c.name, share);
      allocated += share;
    }
    remaining -= allocated;
  }

  // 4) 초과분 재분배: 남은 병력을 빈 용량이 있는 성채에 분배
  if (remaining > 0) {
    for (const c of ownedCastles) {
      if (remaining <= 0) break;
      const current = result.get(c.name) || 0;
      const capacity = c.maxGarrison - current;
      if (capacity > 0) {
        const add = Math.min(remaining, capacity);
        result.set(c.name, current + add);
        remaining -= add;
      }
    }
  }

  return result;
}

/** 현재 garrison과 배분 결과의 차이를 CastleUpdate[]로 반환 */
export function syncGarrisonToState(
  faction: Faction,
  allCastles: Castle[],
): CastleUpdate[] {
  const ownedCastles = allCastles.filter(c => c.owner === faction.id);
  const distribution = distributeGarrison(
    ownedCastles,
    faction.points.mp_troops,
    allCastles,
    faction.id,
  );

  const updates: CastleUpdate[] = [];
  for (const castle of ownedCastles) {
    const target = distribution.get(castle.name) ?? 0;
    const delta = target - castle.garrison;
    if (delta !== 0) {
      updates.push({ castle: castle.name, garrison_delta: delta });
    }
  }
  return updates;
}

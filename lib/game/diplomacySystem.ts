import type { DiplomaticRelation, FactionId, Faction } from "@/types/game";

export type DiplomaticAction = "관계_개선" | "관계_악화" | "지원_요청" | "무역";

export interface DiplomacyResult {
  success: boolean;
  message: string;
  scoreChange: number;
  dpCost: number;
  ipGain?: number;  // 무역 시 IP 획득
}

/** 관계 조회 */
export function getRelationBetween(
  relations: DiplomaticRelation[],
  a: FactionId,
  b: FactionId,
): DiplomaticRelation {
  const existing = relations.find(
    r => (r.factionA === a && r.factionB === b) || (r.factionA === b && r.factionB === a),
  );
  if (existing) return existing;
  return { factionA: a, factionB: b, score: 0 };
}

/** 관계 점수 → 텍스트 */
export function scoreToLabel(score: number): string {
  if (score >= 7) return "동맹";
  if (score >= 3) return "우호";
  if (score >= -3) return "중립";
  if (score >= -7) return "적대";
  return "전쟁";
}

/** 외교 행동 실행 */
export function executeDiplomaticAction(
  action: DiplomaticAction,
  initiator: Faction,
  target: Faction,
  relation: DiplomaticRelation,
): DiplomacyResult {
  const dpAvailable = initiator.points.dp;

  switch (action) {
    case "관계_개선": {
      if (dpAvailable < 2) {
        return { success: false, message: "외교력이 부족합니다.", scoreChange: 0, dpCost: 0 };
      }
      const change = 1 + (Math.random() < 0.3 ? 1 : 0);
      return {
        success: true,
        message: `${target.rulerName}과(와)의 관계가 개선되었습니다. (+${change})`,
        scoreChange: change,
        dpCost: 2,
      };
    }

    case "관계_악화": {
      if (dpAvailable < 2) {
        return { success: false, message: "외교력이 부족합니다.", scoreChange: 0, dpCost: 0 };
      }
      return {
        success: true,
        message: `${target.rulerName}에 대한 이간계를 펼쳤습니다. (-2)`,
        scoreChange: -2,
        dpCost: 2,
      };
    }

    case "지원_요청": {
      if (dpAvailable < 3) {
        return { success: false, message: "외교력이 부족합니다.", scoreChange: 0, dpCost: 0 };
      }
      const success = relation.score >= 3 && Math.random() < 0.6;
      return {
        success,
        message: success
          ? `${target.rulerName}이(가) 원군을 보냈습니다!`
          : `${target.rulerName}이(가) 요청을 거절했습니다.`,
        scoreChange: success ? 0 : -1,
        dpCost: 3,
      };
    }

    case "무역": {
      if (dpAvailable < 1) {
        return { success: false, message: "외교력이 부족합니다.", scoreChange: 0, dpCost: 0 };
      }
      if (relation.score < -3) {
        return { success: false, message: `${target.rulerName}이(가) 무역을 거부했습니다.`, scoreChange: 0, dpCost: 0 };
      }
      const ipGain = 10 + Math.floor(Math.random() * 10);
      return {
        success: true,
        message: `${target.rulerName}과(와) 무역으로 내정력 ${ipGain}를 획득했습니다.`,
        scoreChange: 1,
        dpCost: 1,
        ipGain,
      };
    }
  }
}

/** 관계 점수 업데이트 */
export function updateRelationScore(
  relations: DiplomaticRelation[],
  a: FactionId,
  b: FactionId,
  change: number,
): DiplomaticRelation[] {
  return relations.map(r => {
    if ((r.factionA === a && r.factionB === b) || (r.factionA === b && r.factionB === a)) {
      return { ...r, score: Math.max(-10, Math.min(10, r.score + change)) };
    }
    return r;
  });
}

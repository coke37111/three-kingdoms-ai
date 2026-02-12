import type { DiplomaticRelation, FactionId, RelationType, Faction, Treaty } from "@/types/game";

export type DiplomaticAction =
  | "동맹_제안"
  | "교역_제안"
  | "불가침_조약"
  | "선전포고"
  | "공물_요구"
  | "관계_개선";

export interface DiplomacyResult {
  success: boolean;
  message: string;
  relationChange: number;
  newRelationType?: RelationType;
  newTreaty?: Treaty;
}

function getRelation(relations: DiplomaticRelation[], a: FactionId, b: FactionId): DiplomaticRelation | undefined {
  return relations.find(
    (r) => (r.factionA === a && r.factionB === b) || (r.factionA === b && r.factionB === a),
  );
}

function scoreToRelationType(score: number): RelationType {
  if (score >= 60) return "동맹";
  if (score >= 20) return "우호";
  if (score >= -20) return "중립";
  if (score >= -60) return "적대";
  return "전쟁";
}

export function getRelationBetween(
  relations: DiplomaticRelation[],
  a: FactionId,
  b: FactionId,
): DiplomaticRelation {
  const existing = getRelation(relations, a, b);
  if (existing) return existing;
  return { factionA: a, factionB: b, type: "중립", score: 0, treaties: [] };
}

export function executeDiplomaticAction(
  action: DiplomaticAction,
  initiator: Faction,
  target: Faction,
  relation: DiplomaticRelation,
): DiplomacyResult {
  const currentScore = relation.score;

  switch (action) {
    case "동맹_제안": {
      if (currentScore < 30) {
        return { success: false, message: `${target.rulerName}이(가) 동맹을 거절했습니다. 관계가 충분하지 않습니다.`, relationChange: -5 };
      }
      const acceptChance = Math.min(0.9, (currentScore + target.personality.diplomacy) / 200);
      if (Math.random() < acceptChance) {
        return {
          success: true,
          message: `${target.rulerName}이(가) 동맹을 수락했습니다!`,
          relationChange: 20,
          newRelationType: "동맹",
          newTreaty: { type: "군사동맹", turnsRemaining: 10 },
        };
      }
      return { success: false, message: `${target.rulerName}이(가) 동맹을 정중히 거절했습니다.`, relationChange: -3 };
    }

    case "교역_제안": {
      if (currentScore < -30) {
        return { success: false, message: `${target.rulerName}이(가) 교역을 거부했습니다.`, relationChange: 0 };
      }
      const acceptChance = Math.min(0.85, (currentScore + 50 + target.personality.diplomacy) / 200);
      if (Math.random() < acceptChance) {
        return {
          success: true,
          message: `${target.rulerName}과(와) 교역 협정을 맺었습니다.`,
          relationChange: 10,
          newTreaty: { type: "교역", turnsRemaining: 5 },
        };
      }
      return { success: false, message: `${target.rulerName}이(가) 교역을 거절했습니다.`, relationChange: -2 };
    }

    case "불가침_조약": {
      if (currentScore < -10) {
        return { success: false, message: `${target.rulerName}이(가) 불가침 조약을 거부했습니다.`, relationChange: 0 };
      }
      const acceptChance = Math.min(0.8, (currentScore + 40 + target.personality.diplomacy) / 200);
      if (Math.random() < acceptChance) {
        return {
          success: true,
          message: `${target.rulerName}과(와) 불가침 조약을 체결했습니다.`,
          relationChange: 15,
          newTreaty: { type: "불가침", turnsRemaining: 8 },
        };
      }
      return { success: false, message: `${target.rulerName}이(가) 불가침 조약을 거절했습니다.`, relationChange: -3 };
    }

    case "선전포고": {
      return {
        success: true,
        message: `${initiator.rulerName}이(가) ${target.rulerName}에게 선전포고했습니다!`,
        relationChange: -50,
        newRelationType: "전쟁",
      };
    }

    case "공물_요구": {
      if (currentScore > 20 || initiator.totalTroops < target.totalTroops * 0.5) {
        return { success: false, message: `${target.rulerName}이(가) 공물 요구를 무시했습니다.`, relationChange: -15 };
      }
      const fearFactor = (initiator.totalTroops / target.totalTroops) * 100;
      const acceptChance = Math.min(0.6, (fearFactor - 50) / 100 * (1 - target.personality.riskTolerance / 100));
      if (Math.random() < acceptChance) {
        return {
          success: true,
          message: `${target.rulerName}이(가) 공물을 바쳤습니다.`,
          relationChange: -20,
          newTreaty: { type: "공물", turnsRemaining: 3 },
        };
      }
      return { success: false, message: `${target.rulerName}이(가) 공물 요구를 거부했습니다!`, relationChange: -25 };
    }

    case "관계_개선": {
      const improvement = 5 + Math.floor(Math.random() * 10);
      return {
        success: true,
        message: `${target.rulerName}과(와)의 관계가 개선되었습니다.`,
        relationChange: improvement,
      };
    }
  }
}

export function updateRelation(
  relations: DiplomaticRelation[],
  a: FactionId,
  b: FactionId,
  result: DiplomacyResult,
): DiplomaticRelation[] {
  return relations.map((r) => {
    if ((r.factionA === a && r.factionB === b) || (r.factionA === b && r.factionB === a)) {
      const newScore = Math.max(-100, Math.min(100, r.score + result.relationChange));
      const newType = result.newRelationType || scoreToRelationType(newScore);
      const newTreaties = result.newTreaty
        ? [...r.treaties, result.newTreaty]
        : r.treaties;
      return { ...r, score: newScore, type: newType, treaties: newTreaties };
    }
    return r;
  });
}

export function advanceTreaties(relations: DiplomaticRelation[]): DiplomaticRelation[] {
  return relations.map((r) => ({
    ...r,
    treaties: r.treaties
      .map((t) => ({ ...t, turnsRemaining: t.turnsRemaining - 1 }))
      .filter((t) => t.turnsRemaining > 0),
  }));
}

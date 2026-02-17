import type {
  InvasionResponseType,
  PendingInvasion,
  InvasionResult,
  WorldState,
  FactionId,
} from "@/types/game";
import {
  SPECIAL_STRATEGY_SP_COST,
  SPECIAL_STRATEGY_SUCCESS_RATE,
  SUPPORT_REQUEST_DP_COST,
  SUPPORT_REQUEST_BASE_RATE,
  SUPPORT_REQUEST_RELATION_BONUS,
  TRIBUTE_IP_COST_MULTIPLIER,
  TRIBUTE_MIN_IP_COST,
} from "@/constants/gameConstants";
import { getRelationBetween } from "@/lib/game/diplomacySystem";

export interface ResponseOption {
  type: InvasionResponseType;
  label: string;
  description: string;
  cost: string;
  costValue: number;
  successRate: number;
  available: boolean;
  unavailableReason?: string;
}

/** 침공 대응 선택지 생성 */
export function getResponseOptions(
  world: WorldState,
  invasion: PendingInvasion,
): ResponseOption[] {
  const player = world.factions.find(f => f.isPlayer)!;
  const targetCastle = world.castles.find(c => c.name === invasion.targetCastle)!;
  const defTroops = Math.min(player.points.mp_troops, targetCastle.garrison);

  // 조공 비용 계산
  const tributeCost = Math.max(TRIBUTE_MIN_IP_COST, Math.floor(invasion.attackerTroops * TRIBUTE_IP_COST_MULTIPLIER));

  // 지원 요청 성공률 (제3 세력 중 가장 높은 관계 기준)
  const otherFactions = world.factions.filter(f => !f.isPlayer && f.id !== invasion.attackerFactionId);
  let bestRelationScore = -10;
  for (const f of otherFactions) {
    const rel = getRelationBetween(world.relations, "liu_bei", f.id);
    if (rel.score > bestRelationScore) bestRelationScore = rel.score;
  }
  const supportRate = Math.min(0.9, SUPPORT_REQUEST_BASE_RATE + bestRelationScore * SUPPORT_REQUEST_RELATION_BONUS);

  return [
    {
      type: "특수_전략",
      label: "특수 전략",
      description: "제갈량의 묘책으로 적을 퇴각시킨다.",
      cost: `전략포인트 ${SPECIAL_STRATEGY_SP_COST}`,
      costValue: SPECIAL_STRATEGY_SP_COST,
      successRate: SPECIAL_STRATEGY_SUCCESS_RATE,
      available: player.points.sp >= SPECIAL_STRATEGY_SP_COST,
      unavailableReason: player.points.sp < SPECIAL_STRATEGY_SP_COST ? "전략포인트 부족" : undefined,
    },
    {
      type: "전투",
      label: "전투",
      description: `수성전으로 방어한다. (주둔 ${defTroops.toLocaleString()}명)`,
      cost: "군사포인트 (전투)",
      costValue: 0,
      successRate: -1, // 전투 결과에 따름
      available: defTroops > 0,
      unavailableReason: defTroops <= 0 ? "주둔 병력 없음" : undefined,
    },
    {
      type: "지원_요청",
      label: "지원 요청",
      description: "우호 세력에 원군을 요청한다.",
      cost: `외교포인트 ${SUPPORT_REQUEST_DP_COST}`,
      costValue: SUPPORT_REQUEST_DP_COST,
      successRate: Math.max(0, supportRate),
      available: player.points.dp >= SUPPORT_REQUEST_DP_COST && otherFactions.length > 0,
      unavailableReason: player.points.dp < SUPPORT_REQUEST_DP_COST ? "외교포인트 부족" : otherFactions.length === 0 ? "요청할 세력 없음" : undefined,
    },
    {
      type: "조공",
      label: "조공",
      description: `재물을 바쳐 퇴각시킨다. (내정포인트 ${tributeCost})`,
      cost: `내정포인트 ${tributeCost}`,
      costValue: tributeCost,
      successRate: 1.0,
      available: player.points.ip >= tributeCost,
      unavailableReason: player.points.ip < tributeCost ? "내정포인트 부족" : undefined,
    },
  ];
}

/** 침공 대응 실행 (전투 제외) */
export function executeInvasionResponse(
  responseType: InvasionResponseType,
  world: WorldState,
  invasion: PendingInvasion,
): InvasionResult {
  const player = world.factions.find(f => f.isPlayer)!;

  switch (responseType) {
    case "특수_전략": {
      const success = Math.random() < SPECIAL_STRATEGY_SUCCESS_RATE;
      return {
        responseType,
        success,
        message: success
          ? "제갈량의 묘책이 성공하여 적군이 퇴각했습니다!"
          : "전략이 실패했습니다... 전투가 시작됩니다!",
      };
    }
    case "지원_요청": {
      const otherFactions = world.factions.filter(f => !f.isPlayer && f.id !== invasion.attackerFactionId);
      let bestRelationScore = -10;
      for (const f of otherFactions) {
        const rel = getRelationBetween(world.relations, "liu_bei", f.id);
        if (rel.score > bestRelationScore) bestRelationScore = rel.score;
      }
      const rate = Math.min(0.9, SUPPORT_REQUEST_BASE_RATE + bestRelationScore * SUPPORT_REQUEST_RELATION_BONUS);
      const success = Math.random() < Math.max(0, rate);
      return {
        responseType,
        success,
        message: success
          ? "우호 세력이 원군을 보내 적을 퇴각시켰습니다!"
          : "지원 요청이 거절되었습니다... 전투가 시작됩니다!",
      };
    }
    case "조공": {
      return {
        responseType,
        success: true,
        message: "조공을 바쳐 적군이 퇴각했습니다.",
      };
    }
    case "전투": {
      // 전투는 외부에서 처리
      return {
        responseType,
        success: false,
        message: "전투가 시작됩니다!",
      };
    }
  }
}

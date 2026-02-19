import type { WorldState, Faction, FactionId } from "@/types/game";
import { FACTION_NAMES } from "@/constants/factions";
import { scoreToLabel } from "@/lib/game/diplomacySystem";
import { isFrontlineCastle } from "@/lib/game/garrisonSystem";

function getRelationSummary(world: WorldState, factionId: FactionId): string {
  return world.relations
    .filter(r => r.factionA === factionId || r.factionB === factionId)
    .map(r => {
      const other = r.factionA === factionId ? r.factionB : r.factionA;
      return `- ${FACTION_NAMES[other]}: ${scoreToLabel(r.score)} (점수: ${r.score})`;
    })
    .join("\n");
}

function getFactionSummary(f: Faction): string {
  return `${f.rulerName}: 군사포인트 ${f.points.mp.toLocaleString()}, 성채 ${f.castles.length}개, 내정포인트 ${f.points.ip}, 외교포인트 ${f.points.dp}, 전략포인트 ${f.points.sp}`;
}

export function buildFactionAIPrompt(world: WorldState, npcFactions: Faction[]): string {
  const worldSummary = world.factions.map(getFactionSummary).join("\n");

  const factionInstructions = npcFactions.map(f => {
    const relSummary = getRelationSummary(world, f.id);

    // 전선 성채 garrison 정보
    const frontlineCastles = world.castles
      .filter(c => c.owner === f.id && isFrontlineCastle(c, world.castles, f.id))
      .sort((a, b) => b.garrison - a.garrison)
      .slice(0, 5);
    const frontlineInfo = frontlineCastles.length > 0
      ? `\n전선 주둔: ${frontlineCastles.map(c => `${c.name}(${Math.round(c.garrison / 1000)}천)`).join(" ")}`
      : "";

    return `### ${f.rulerName} (${f.id})
성격: 공격성 ${f.personality.aggression}, 외교 ${f.personality.diplomacy}, 개발 ${f.personality.development}, 모험 ${f.personality.riskTolerance}
포인트: 군사포인트 ${f.points.mp.toLocaleString()} (병력 ${f.points.mp_troops.toLocaleString()}, 훈련 ${(f.points.mp_training * 100).toFixed(0)}%), 내정포인트 ${f.points.ip}/${f.points.ip_cap}, 외교포인트 ${f.points.dp}, 전략포인트 ${f.points.sp}
성채: ${f.castles.join(", ")} (${f.castles.length}개)${frontlineInfo}
시설: 시장 Lv${f.facilities.market}, 논 Lv${f.facilities.farm}, 은행 Lv${f.facilities.bank}
배치 상한: ${f.rulerLevel.deploymentCap.toLocaleString()}
외교:
${relSummary}`;
  }).join("\n\n");

  return `너는 삼국지 시대의 전략 게임 심판이다.
각 NPC 군주의 성격과 상황을 고려하여, 이번 턴에 각 군주가 취할 행동을 결정하라.

=== 현재 월드 상태 (${world.currentTurn}턴) ===
${worldSummary}

=== NPC 군주 상세 ===
${factionInstructions}

=== 행동 유형 ===
- 개발: 내정포인트 소비하여 시설 건설/업그레이드
- 모병: 내정포인트 소비하여 병력 증강
- 훈련: 내정포인트 소비하여 훈련도 상승
- 공격: 군사포인트 투입하여 인접 성채 공격
- 외교: 외교포인트 소비하여 관계 변동
- 방어: 성채 주둔 병력 배치
- 스킬: 전략포인트 소비하여 스킬 해금

=== 응답 규칙 ===
1. 반드시 아래 JSON 형식으로만 응답.
2. 각 군주당 1~2개의 행동. 보유 포인트 범위 내에서만.
3. 행동은 현실적이고 성격에 부합해야 한다.
4. summary에 플레이어에게 보여줄 요약을 한국어로 작성.

=== 응답 JSON 형식 ===
{
  "factions": [
    {
      "factionId": "세력ID",
      "actions": [
        {
          "action": "개발|모병|훈련|공격|외교|방어|스킬",
          "target": "대상 (해당시)",
          "details": "구체적 행동 설명",
          "reasoning": "행동 근거"
        }
      ],
      "summary": "이번 턴 행동 요약"
    }
  ]
}`;
}

export type NPCActionType = "개발" | "모병" | "훈련" | "공격" | "외교" | "방어" | "스킬" | "대기";

export interface NPCTurnResult {
  factionId: FactionId;
  actions: {
    action: NPCActionType;
    target?: string;
    details?: string;
    reasoning?: string;
  }[];
  summary: string;
}

const VALID_NPC_ACTIONS = new Set<NPCActionType>(["개발", "모병", "훈련", "공격", "외교", "방어", "스킬", "대기"]);

export function parseNPCResponse(raw: string): NPCTurnResult[] {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : raw);
    const factions: NPCTurnResult[] = parsed.factions || [];
    for (const f of factions) {
      f.actions = f.actions.map(a => ({
        ...a,
        action: VALID_NPC_ACTIONS.has(a.action as NPCActionType) ? a.action : "대기" as NPCActionType,
      }));
    }
    return factions;
  } catch {
    return [];
  }
}

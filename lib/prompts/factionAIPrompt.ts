import type { WorldState, Faction, FactionId } from "@/types/game";
import { FACTION_NAMES } from "@/constants/factions";

function getRelationSummary(world: WorldState, factionId: FactionId): string {
  const lines: string[] = [];
  for (const rel of world.relations) {
    if (rel.factionA === factionId || rel.factionB === factionId) {
      const other = rel.factionA === factionId ? rel.factionB : rel.factionA;
      lines.push(`- ${FACTION_NAMES[other]}: ${rel.type} (점수: ${rel.score})`);
    }
  }
  return lines.join("\n");
}

function getFactionSummary(f: Faction): string {
  return `${f.rulerName}: 금 ${f.gold}, 식량 ${f.food}, 병력 ${f.totalTroops}, 도시 ${f.cities.length}개, 민심 ${f.popularity}`;
}

export function buildFactionAIPrompt(world: WorldState, npcFactions: Faction[]): string {
  const worldSummary = world.factions.map(getFactionSummary).join("\n");

  const factionInstructions = npcFactions.map((f) => {
    const relSummary = getRelationSummary(world, f.id);
    const cityNames = f.cities.map((c) => c.cityName).join(", ");
    const generalNames = f.generals.map((g) => `${g.generalName}(무력${g.warfare}/지력${g.intelligence})`).join(", ");

    return `### ${f.rulerName} (${f.id})
성격: 공격성 ${f.personality.aggression}, 외교 ${f.personality.diplomacy}, 개발 ${f.personality.development}, 모험 ${f.personality.riskTolerance}
도시: ${cityNames}
장수: ${generalNames}
자원: 금 ${f.gold}, 식량 ${f.food}, 병력 ${f.totalTroops}
외교:
${relSummary}`;
  }).join("\n\n");

  return `너는 삼국지 시대의 전략 게임 심판이다.
각 NPC 군주의 성격과 상황을 고려하여, 이번 턴에 각 군주가 취할 행동을 결정하라.

=== 현재 월드 상태 (${world.currentTurn}턴, ${world.currentMonth}월, ${world.currentSeason}) ===
${worldSummary}

=== NPC 군주 상세 ===
${factionInstructions}

=== 응답 규칙 ===
1. 반드시 아래 JSON 형식으로만 응답할 것.
2. 각 군주당 1~2개의 행동을 결정할 것.
3. 행동은 현실적이고 성격에 부합해야 한다.
4. 전쟁 중인 적과는 공격/방어 행동이 우선이다.
5. summary에 플레이어에게 보여줄 요약을 한국어로 작성할 것.

=== 응답 JSON 형식 ===
{
  "factions": [
    {
      "factionId": "세력ID",
      "actions": [
        {
          "action": "개발|모병|공격|외교|방어|대기",
          "target": "대상 도시/세력명 (해당시)",
          "details": "구체적 행동 설명",
          "reasoning": "행동 근거"
        }
      ],
      "summary": "이번 턴 행동 요약 (한국어)"
    }
  ]
}`;
}

export type NPCActionType = "개발" | "모병" | "공격" | "외교" | "방어" | "대기";

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

const VALID_NPC_ACTIONS = new Set<NPCActionType>(["개발", "모병", "공격", "외교", "방어", "대기"]);

export function parseNPCResponse(raw: string): NPCTurnResult[] {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : raw);
    const factions: NPCTurnResult[] = parsed.factions || [];
    // LLM 응답의 action 값을 유효한 타입으로 검증
    for (const f of factions) {
      f.actions = f.actions.map((a) => ({
        ...a,
        action: VALID_NPC_ACTIONS.has(a.action as NPCActionType) ? a.action : "대기" as NPCActionType,
      }));
    }
    return factions;
  } catch {
    return [];
  }
}

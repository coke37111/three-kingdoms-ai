import type { WorldState, FactionId } from "@/types/game";
import type { AdvisorState } from "@/types/council";
import { FACTION_NAMES } from "@/constants/factions";
import { ZHANGFEI_INFO } from "@/constants/advisors";

function getRelationSummary(world: WorldState, playerId: FactionId): string {
  const lines: string[] = [];
  for (const rel of world.relations) {
    if (rel.factionA === playerId || rel.factionB === playerId) {
      const other = rel.factionA === playerId ? rel.factionB : rel.factionA;
      const otherFaction = world.factions.find((f) => f.id === other);
      if (otherFaction) {
        lines.push(`- ${otherFaction.rulerName}: ${rel.type} (관계점수: ${rel.score}, 병력: ${otherFaction.totalTroops.toLocaleString()}, 도시: ${otherFaction.cities.length})`);
      }
    }
  }
  return lines.join("\n");
}

function getEnthusiasmLabel(enthusiasm: number): string {
  if (enthusiasm >= 70) return "적극적";
  if (enthusiasm >= 40) return "보통";
  if (enthusiasm >= 20) return "소극적";
  return "침묵";
}

function getLoyaltyLabel(loyalty: number): string {
  if (loyalty >= 70) return "충성";
  if (loyalty >= 40) return "불만";
  if (loyalty >= 20) return "반감";
  return "이탈 위험";
}

export function buildCouncilPrompt(
  world: WorldState,
  advisors: AdvisorState[],
  context: string,
): string {
  const player = world.factions.find((f) => f.isPlayer)!;
  const relationSummary = getRelationSummary(world, player.id);

  const otherFactionsSummary = world.factions
    .filter((f) => !f.isPlayer)
    .map((f) => `${f.rulerName}: 금${f.gold.toLocaleString()}, 식량${f.food.toLocaleString()}, 병력${f.totalTroops.toLocaleString()}, 도시${f.cities.length}(${f.cities.map(c => c.cityName).join(",")})`)
    .join("\n");

  const playerState = {
    rulerName: player.rulerName,
    gold: player.gold,
    food: player.food,
    totalTroops: player.totalTroops,
    popularity: player.popularity,
    currentTurn: world.currentTurn,
    currentMonth: world.currentMonth,
    currentSeason: world.currentSeason,
    cities: player.cities,
    generals: player.generals.map((g) => ({
      generalName: g.generalName,
      warfare: g.warfare,
      intelligence: g.intelligence,
      leadership: g.leadership,
      politics: g.politics,
      loyalty: g.loyalty,
      currentTask: g.currentTask,
      location: g.location,
    })),
    recentEvents: player.recentEvents,
  };

  const advisorProfiles = advisors.map((a) => {
    const enthLabel = getEnthusiasmLabel(a.enthusiasm);
    const loyLabel = getLoyaltyLabel(a.loyalty);
    return `- ${a.icon} ${a.name} (${a.role}): 충성도${a.loyalty}(${loyLabel}), 열정${a.enthusiasm}(${enthLabel})
  성격: ${a.personality}
  → 열정이 ${enthLabel}이므로 ${a.enthusiasm >= 70 ? "상세하고 적극적인 의견을 냄" : a.enthusiasm >= 40 ? "보통 수준의 참여" : a.enthusiasm >= 20 ? "짧고 소극적인 의견만 냄" : "거의 침묵하거나 불참할 수 있음"}
  → 충성도가 ${loyLabel}이므로 ${a.loyalty >= 70 ? "주공에게 충성스럽게 조언" : a.loyalty >= 40 ? "간간이 불만을 표출하거나 비꼬는 발언" : a.loyalty >= 20 ? "공개적 불만, 다른 참모와 갈등 조장 가능" : "매우 불만족, 이탈을 암시하는 발언 가능"}`;
  }).join("\n");

  return `너는 삼국지 시대 유비 진영의 **자율 참모 회의**를 시뮬레이션하는 AI다.
각 참모가 **자기 역할에 맞는 기본 업무를 자율 수행**하고, 그 결과를 보고하며, 중요한 토론을 진행한다.

=== 참모진 ===
${advisorProfiles}

※ ${ZHANGFEI_INFO.name}(${ZHANGFEI_INFO.icon})은 정식 참모가 아니지만, 성격상 가끔 회의에 끼어들어 직설적이고 단순한 발언을 할 수 있다.
  성격: ${ZHANGFEI_INFO.personality}
  (매 회의마다 반드시 등장할 필요 없음. 상황에 따라 자연스럽게.)

=== 참모별 자율 행동 범위 ===
- 미축(내정): 자동 = 세금 징수, 상업/농업 관리, 소규모 투자. 결재 필요 = 대규모 투자(금5000+), 세율 변경
- 관우(군사): 자동 = 병사 훈련, 순찰, 방벽 정비. 결재 필요 = 대규모 모병, 출격, 공격 작전
- 간옹(외교): 자동 = 정보 수집, 외교 서신 교환. 결재 필요 = 동맹 체결, 교역 조약, 전쟁 선포
- 조운(첩보): 자동 = 정찰, 국경 감시, 민심 파악. 결재 필요 = 적진 첩보 작전, 장수 포섭
- 제갈량(총괄): 회의 사회, 전략 방향 조율, 결재 사안 정리

=== 우리(${player.rulerName}) 국가 상황 ===
${JSON.stringify(playerState, null, 2)}

=== 천하 정세 ===
${otherFactionsSummary}

=== 외교 관계 ===
${relationSummary}

=== 회의 상황 ===
${context}

=== 회의 진행 규칙 ===
1. 제갈량이 먼저 회의를 시작한다 (사회자, 1마디).
2. 이번 턴에 중요한 보고가 있는 참모 **1~2명만** 발언한다. 나머지는 침묵.
3. 보고 중 의견 충돌이 있으면 짧게 한마디 반박이 발생할 수 있다.
4. 중대 사안이 있으면 제갈량이 정리하여 주공에게 결재를 요청한다.
5. auto_actions에 각 참모의 자율 행동 결과를 기술한다 (발언하지 않은 참모도 포함).
6. 결재가 필요한 중대 사안은 approval_requests에 0~2개 포함한다.

**핵심 규칙**: 발언자를 **최소화**할 것!
- 한 회의에 발언하는 참모는 **제갈량 + 1~2명**뿐이다. 절대 4명 이상 말하지 않는다.
- 해당 업무 담당이 직접 보고: 군사→관우, 내정→미축, 외교→간옹, 정보→조운.
- 보고할 것이 없는 참모는 발언하지 않는다.

=== 대화 스타일 ===
- 각 참모의 개성 있는 말투를 반영. (관우: 호탕, 미축: 신중, 간옹: 실리적, 조운: 침착)
- 자연스럽고 짧은 대화체.
- council_messages는 **3~5개**. (제갈량 1~2개 + 보고 참모 1~2명 각 1개)
- 각 dialogue는 50자 이내로 간결하게.

=== auto_actions 규칙 ===
- 각 참모가 수행한 자율 행동을 기술.
- **result에는 반드시 "왜, 어떻게, 그 결과"를 구체적으로** 기술. 예: "장터 세금 징수 — 금 300 확보" ← 부족. "신야 장터에서 춘계 세금을 징수하여 금 300 확보" ← 좋음.
- state_changes에는 해당 행동의 수치 변화를 기술. 사소한 자동 업무는 state_changes: null.
- 실제 수치 변화가 있는 행동(세금 징수, 훈련 등)만 state_changes를 포함.
- ⚠️ 예시 JSON의 수치/내용을 그대로 복사하지 말 것. 현재 국가 상황에 맞게 생성하라.

=== approval_requests 규칙 ===
- 0~2개. 비용이 크거나 위험한 안건만 결재 요청.
- 없으면 빈 배열 [].
- id는 "req_1", "req_2" 형식.
- cost에는 승인 시 **순 변화량**을 state_changes 형식으로 기술:
  - 소모되는 자원은 음수 (예: gold_delta: -5000)
  - 얻는 자원은 양수 (예: troops_delta: 10000)
  - 예시) 모병: { gold_delta: -3000, food_delta: -2000, troops_delta: 10000 }
  - 예시) 출격: { troops_delta: -15000, food_delta: -5000 }
- urgency: "routine" = 일상적, "important" = 중요, "critical" = 긴급

=== 응답 규칙 ===
1. 반드시 아래 JSON 형식으로만 응답할 것. JSON 외의 텍스트를 절대 포함하지 마라.
2. state_changes는 auto_actions 내 개별 행동의 합산을 최상위에도 포함.
3. advisor_updates에 각 참모의 열정/충성도 변동을 포함 (±1~5).
4. ⚠️ 도시를 점령/함락한 경우, state_changes에 "conquered_cities": ["도시명"]을 포함할 것.

=== 응답 JSON 형식 ===
{
  "council_messages": [
    { "speaker": "제갈량", "dialogue": "주공, 이번 달 주요 보고가 있습니다.", "emotion": "calm" },
    { "speaker": "조운", "dialogue": "조조군이 허창에 병력을 집결 중입니다.", "emotion": "worried" },
    { "speaker": "관우", "dialogue": "선제 출격이 좋겠소! 적이 준비되기 전에!", "emotion": "excited" },
    { "speaker": "제갈량", "dialogue": "관우 장군의 의견을 주공께 여쭙겠습니다.", "emotion": "thoughtful" }
  ],
  "auto_actions": [
    { "advisor": "미축", "role": "내정", "action": "신야 장터 세금 징수", "result": "봄철 장터가 활발하여 세수가 양호함. 금 300 확보", "state_changes": { "gold_delta": 300 } },
    { "advisor": "관우", "role": "군사", "action": "신야 수비병 정기 훈련", "result": "보병 3천을 대상으로 진법 훈련 실시. 전투력 소폭 향상", "state_changes": null },
    { "advisor": "조운", "role": "첩보", "action": "허창 방면 국경 정찰", "result": "정찰병 보고: 조조군이 허창에 약 5만 병력을 집결시키는 중", "state_changes": null }
  ],
  "approval_requests": [
    {
      "id": "req_1",
      "advisor": "관우",
      "subject": "진류 방면 선제 출격",
      "description": "조조군이 집결하기 전에 진류를 선제 공격합니다",
      "cost": { "troops_delta": -15000, "food_delta": -5000 },
      "benefit": "진류 확보 가능, 조조 세력 약화",
      "urgency": "important"
    }
  ],
  "state_changes": { "gold_delta": 300 },
  "advisor_updates": [
    { "name": "관우", "enthusiasm_delta": 3, "loyalty_delta": 0 },
    { "name": "미축", "enthusiasm_delta": 1, "loyalty_delta": 0 },
    { "name": "간옹", "enthusiasm_delta": 0, "loyalty_delta": 0 },
    { "name": "조운", "enthusiasm_delta": 2, "loyalty_delta": 0 }
  ]
}`;
}

export function buildCouncilResultPrompt(
  world: WorldState,
  advisors: AdvisorState[],
  action: { type: "approval"; id: string; decision: "승인" | "거부"; subject: string; advisor: string }
       | { type: "freetext"; message: string; replyTo?: string },
): string {
  const player = world.factions.find((f) => f.isPlayer)!;

  const advisorSummary = advisors.map((a) =>
    `${a.name}(${a.role}, 충성${a.loyalty}, 열정${a.enthusiasm})`
  ).join(", ");

  // 답장 대상이 있으면 해당 참모가 먼저 응답하도록 지시
  const replyTo = action.type === "freetext" ? action.replyTo : undefined;

  let context: string;
  if (action.type === "approval") {
    context = action.decision === "승인"
      ? `플레이어(유비)가 ${action.advisor}의 "${action.subject}" 결재를 **승인**했다. 해당 행동의 결과를 반영하라.`
      : `플레이어(유비)가 ${action.advisor}의 "${action.subject}" 결재를 **거부**했다. ${action.advisor}은 실망하고, 다른 참모들이 반응한다.`;
  } else if (replyTo) {
    context = `플레이어(유비)가 **${replyTo}**에게 직접 말했다: "${action.message}"\n\n⚠️ 유비가 ${replyTo}에게 직접 질문/지시한 것이다. 반드시 council_messages의 첫 번째 발언자가 ${replyTo}여야 한다. 제갈량이 먼저 말하면 안 된다.`;
  } else {
    context = `플레이어(유비)가 자유 지시를 내렸다: "${action.message}"`;
  }

  const speakerOrderRule = replyTo
    ? `2. ⚠️ **유비가 ${replyTo}에게 직접 말한 것이다. council_messages[0].speaker는 반드시 "${replyTo}"**이어야 한다. 제갈량이 중간에서 전달하거나 먼저 답하면 안 된다. ${replyTo}이 직접 답변하고, 다른 참모는 0~1명만 짧게 첨언.`
    : "2. 자유 지시인 경우: 주로 **제갈량**이 답변한다. 관련 참모가 1~2명 짧게 반응.";

  return `너는 삼국지 시대 유비 진영의 참모 회의 결과를 처리하는 AI다.

참모진: ${advisorSummary}

현재 상태:
- 금: ${player.gold}, 식량: ${player.food}, 병력: ${player.totalTroops}, 인망: ${player.popularity}
- 도시: ${player.cities.map(c => c.cityName).join(", ")}

${context}

=== 응답 규칙 ===
1. 반드시 아래 JSON 형식으로만 응답할 것.
${speakerOrderRule}
3. 결재 승인인 경우: 해당 참모가 기뻐하고 실행 결과를 보고.
4. 결재 거부인 경우: 해당 참모가 실망, 제갈량이 정리.
5. state_changes를 반드시 포함하여 수치 변화를 반영하라.
   - 결재 승인: 해당 행동의 비용+결과 반영
   - 결재 거부: state_changes는 null 또는 소폭 변동만
   - 자유 지시: 지시에 따른 수치 변화 반영
   - ⚠️ **도시 점령/함락 시**: state_changes에 "conquered_cities": ["도시명"] 을 반드시 포함!
     예: 출격 승인 후 진류 점령 → "conquered_cities": ["진류"]
     점령하지 못하면 빈 배열이거나 생략.
6. council_messages는 1~3개 (결과 반응). 모든 참모가 반응할 필요 없다.
7. 각 dialogue는 50자 이내.
8. auto_actions와 approval_requests는 빈 배열 []로 설정.
9. advisor_updates에 각 참모의 열정/충성도 변동을 포함:
   - 결재 승인된 참모: enthusiasm_delta: +8, loyalty_delta: +2
   - 결재 거부된 참모: enthusiasm_delta: -5, loyalty_delta: -3
   - 자유 지시에서 칭찬받은 참모: enthusiasm_delta: +5, loyalty_delta: +3
   - 자유 지시에서 비판받은 참모: enthusiasm_delta: -5, loyalty_delta: -8

=== 응답 JSON 형식 ===
{
  "council_messages": [
    { "speaker": "관우", "dialogue": "좋소! 출격 준비를 하겠소!", "emotion": "excited" }
  ],
  "auto_actions": [],
  "approval_requests": [],
  "state_changes": {
    "gold_delta": 0,
    "food_delta": -5000,
    "troops_delta": -15000,
    "popularity_delta": 2,
    "city_updates": [],
    "general_updates": [],
    "new_events": ["진류 방면 출격 개시"],
    "result_message": "관우가 선봉에 나섭니다",
    "conquered_cities": ["진류"]
  },
  "advisor_updates": [
    { "name": "관우", "enthusiasm_delta": 8, "loyalty_delta": 2 },
    { "name": "미축", "enthusiasm_delta": -2 },
    { "name": "간옹", "enthusiasm_delta": 0 },
    { "name": "조운", "enthusiasm_delta": 0 }
  ]
}`;
}

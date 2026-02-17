import type { WorldState, FactionId } from "@/types/game";
import type { AdvisorState } from "@/types/council";
import { FACTION_NAMES } from "@/constants/factions";
import { scoreToLabel } from "@/lib/game/diplomacySystem";

// ── 헬퍼 ──

function getRelationSummary(world: WorldState, playerId: FactionId): string {
  return world.relations
    .filter(r => r.factionA === playerId || r.factionB === playerId)
    .map(r => {
      const other = r.factionA === playerId ? r.factionB : r.factionA;
      const otherF = world.factions.find(f => f.id === other);
      if (!otherF) return "";
      return `- ${otherF.rulerName}: ${scoreToLabel(r.score)} (점수: ${r.score}, 성채: ${otherF.castles.length}, 군사포인트: ${otherF.points.mp.toLocaleString()})`;
    })
    .filter(Boolean)
    .join("\n");
}

function getCastleSummary(world: WorldState, playerId: FactionId): string {
  const myCastles = world.castles.filter(c => c.owner === playerId);
  return myCastles
    .map(c => `${c.name}(${c.grade}, 방어 ${c.defenseMultiplier}x, 주둔 ${c.garrison.toLocaleString()})`)
    .join(", ");
}

function getAdvisorProfile(a: AdvisorState): string {
  const enthLabel = a.enthusiasm >= 70 ? "적극적" : a.enthusiasm >= 40 ? "보통" : "소극적";
  const loyLabel = a.loyalty >= 70 ? "충성" : a.loyalty >= 40 ? "불만" : "반감";
  return `- ${a.icon} ${a.name} (${a.role}): 충성${a.loyalty}(${loyLabel}), 열정${a.enthusiasm}(${enthLabel})
  성격: ${a.personality}`;
}

function getPointsSummary(world: WorldState, playerId: FactionId): string {
  const p = world.factions.find(f => f.id === playerId)!.points;
  return `행동포인트: ${p.ap}/${p.ap_max} (매턴 +${p.ap_regen}) | 전략포인트: ${p.sp} | 군사포인트: ${p.mp.toLocaleString()} (병력 ${p.mp_troops.toLocaleString()}, 훈련 ${(p.mp_training * 100).toFixed(0)}%, 사기 ${p.mp_morale.toFixed(1)}) | 내정포인트: ${p.ip}/${p.ip_cap} (매턴 +${p.ip_regen}) | 외교포인트: ${p.dp}`;
}

// ── Phase 1+3 통합 프롬프트 ──

export function buildPhase1And3Prompt(
  world: WorldState,
  advisors: AdvisorState[],
  context: string,
): string {
  const player = world.factions.find(f => f.isPlayer)!;
  const advisorProfiles = advisors.map(getAdvisorProfile).join("\n");
  const pointsSummary = getPointsSummary(world, player.id);
  const castleSummary = getCastleSummary(world, player.id);
  const relationSummary = getRelationSummary(world, player.id);

  const otherFactions = world.factions
    .filter(f => !f.isPlayer)
    .map(f => `${f.rulerName}: 군사포인트 ${f.points.mp.toLocaleString()}, 성채 ${f.castles.length}개, 내정포인트 ${f.points.ip}`)
    .join("\n");

  return `너는 삼국지 시대 유비 진영의 **5단계 참모 회의**를 시뮬레이션하는 AI다.
이번 호출에서 **Phase 1(상태 보고)과 Phase 3(계획 보고)**를 동시에 생성한다.

=== 참모진 (4인) ===
${advisorProfiles}

=== 포인트 현황 ===
${pointsSummary}

=== 성채 현황 ===
${castleSummary}

=== 군주 레벨: ${player.rulerLevel.level} (배치 상한: ${player.rulerLevel.deploymentCap.toLocaleString()}) ===
시설: 시장 Lv${player.facilities.market}, 논 Lv${player.facilities.farm}, 은행 Lv${player.facilities.bank}

=== 천하 정세 ===
${otherFactions}

=== 외교 관계 ===
${relationSummary}

=== 맥락 ===
${context}

=== Phase 1: 상태 보고 규칙 ===
- 제갈량이 회의를 시작하고, 각 참모가 자기 담당 분야의 현황을 보고.
- 보고 중 자율적으로 수행한 업무의 포인트 변동을 status_reports에 기록.
- 중요 보고가 있는 참모만 발언 (1~3명). 불필요한 보고는 생략.

=== Phase 3: 계획 보고 규칙 ===
- 각 참모가 다음 턴에 수행할 계획을 제안.
- plan_reports에 계획과 기대 포인트 변동을 기록.
- 제갈량이 종합 정리.

=== 대화 스타일 ===
- 각 참모의 성격에 맞는 개성 있는 말투.
- dialogue는 50자 이내 간결체.
- Phase 1 메시지와 Phase 3 메시지를 phase 필드로 구분.
- 포인트 약어(AP, SP, MP, IP, DP) 절대 사용 금지. 반드시 "행동포인트", "전략포인트", "군사포인트", "내정포인트", "외교포인트"로 표기.

=== 응답 JSON 형식 ===
반드시 아래 형식으로만 응답. JSON 외 텍스트 금지.
{
  "council_messages": [
    { "speaker": "제갈량", "dialogue": "주공, 이번 턴 보고 드리겠습니다.", "emotion": "calm", "phase": 1 },
    { "speaker": "미축", "dialogue": "시장 수입이 안정적입니다. 내정포인트 15 확보.", "emotion": "calm", "phase": 1 },
    { "speaker": "관우", "dialogue": "훈련을 계속하고 있습니다.", "emotion": "calm", "phase": 1 },
    { "speaker": "제갈량", "dialogue": "다음 턴 계획을 논의하겠습니다.", "emotion": "thoughtful", "phase": 3 },
    { "speaker": "미축", "dialogue": "시장을 확장하여 수입을 늘리겠습니다.", "emotion": "calm", "phase": 3 },
    { "speaker": "방통", "dialogue": "손권에게 사신을 보내 관계를 개선하겠습니다.", "emotion": "thoughtful", "phase": 3 }
  ],
  "status_reports": [
    { "speaker": "미축", "report": "시장 운영으로 내정포인트 15 확보", "point_changes": { "ip_delta": 15 } },
    { "speaker": "관우", "report": "병사 훈련으로 훈련도 소폭 상승", "point_changes": { "mp_training_delta": 0.02 } }
  ],
  "plan_reports": [
    { "speaker": "미축", "plan": "시장 레벨 업그레이드 (내정포인트 30 소비)", "expected_points": { "ip_delta": -30 } },
    { "speaker": "방통", "plan": "손권 관계 개선 (외교포인트 2 소비)", "expected_points": { "dp_delta": -2 } }
  ],
  "state_changes": { "point_deltas": { "ip_delta": 15, "mp_training_delta": 0.02 } },
  "advisor_updates": [
    { "name": "제갈량", "enthusiasm_delta": 0, "loyalty_delta": 0 },
    { "name": "관우", "enthusiasm_delta": 1, "loyalty_delta": 0 },
    { "name": "방통", "enthusiasm_delta": 1, "loyalty_delta": 0 },
    { "name": "미축", "enthusiasm_delta": 1, "loyalty_delta": 0 }
  ]
}`;
}

// ── Phase 2: 군주 토론 프롬프트 ──

export function buildPhase2Prompt(
  world: WorldState,
  advisors: AdvisorState[],
  message: string,
  replyTo?: string,
): string {
  const player = world.factions.find(f => f.isPlayer)!;
  const advisorSummary = advisors.map(a => `${a.name}(${a.role})`).join(", ");
  const pointsSummary = getPointsSummary(world, player.id);

  const replyInstruction = replyTo
    ? `⚠️ 유비가 **${replyTo}**에게 직접 말한 것이다.
- council_messages에는 "${replyTo}"만 응답한다. 다른 참모는 끼어들지 않는다.
- 단, 유비 발언에서 다른 참모를 이름으로 호명하거나 "모두", "전원" 등으로 전체를 지칭한 경우에만 해당 참모도 응답 가능.`
    : "주로 제갈량이 답변하고, 관련 참모 1~2명이 짧게 반응.";

  return `너는 삼국지 유비 진영 참모 회의의 Phase 2(군주 토론)를 처리하는 AI다.

참모진: ${advisorSummary}
포인트: ${pointsSummary}

플레이어(유비)의 발언: "${message}"

${replyInstruction}

=== 응답 규칙 ===
1. JSON 형식으로만 응답.
2. council_messages는 50자 이내 간결체. phase: 2.
3. 특정 참모에게 말한 경우 해당 참모만 1개 응답. 전체 발언이면 1~3개.
4. state_changes가 필요하면 point_deltas 형식으로 포함.

=== 응답 JSON 형식 ===
{
  "council_messages": [
    { "speaker": "제갈량", "dialogue": "주공의 말씀에 동의합니다.", "emotion": "calm", "phase": 2 }
  ],
  "state_changes": null,
  "advisor_updates": []
}`;
}

// ── Phase 4: 군주 피드백 프롬프트 ──

export function buildPhase4Prompt(
  world: WorldState,
  advisors: AdvisorState[],
  feedback: string,
  replyTo?: string,
): string {
  const player = world.factions.find(f => f.isPlayer)!;
  const advisorSummary = advisors.map(a => `${a.name}(${a.role})`).join(", ");
  const pointsSummary = getPointsSummary(world, player.id);

  const replyInstruction = replyTo
    ? `⚠️ 유비가 **${replyTo}**에게 직접 피드백한 것이다.
- council_messages에는 "${replyTo}"만 응답한다. 다른 참모는 끼어들지 않는다.
- 단, 유비 발언에서 다른 참모를 이름으로 호명하거나 "모두", "전원" 등으로 전체를 지칭한 경우에만 해당 참모도 응답 가능.`
    : "제갈량이 정리하고, 관련 참모가 반응.";

  return `너는 삼국지 유비 진영 참모 회의의 Phase 4(군주 피드백)를 처리하는 AI다.

참모진: ${advisorSummary}
포인트: ${pointsSummary}

플레이어(유비)의 피드백: "${feedback}"

${replyInstruction}

=== 응답 규칙 ===
1. JSON 형식으로만 응답.
2. 피드백에 따라 계획 수정/boost 반영.
3. boosted_plans에 boost된 참모 이름을 포함.
4. 특정 참모에게 말한 경우 해당 참모만 1개 응답. 전체 발언이면 1~3개. phase: 4.

=== 응답 JSON 형식 ===
{
  "council_messages": [
    { "speaker": "관우", "dialogue": "주공의 뜻대로 하겠소!", "emotion": "excited", "phase": 4 }
  ],
  "state_changes": null,
  "boosted_plans": ["관우"],
  "advisor_updates": [
    { "name": "관우", "enthusiasm_delta": 5, "loyalty_delta": 2 }
  ]
}`;
}

import type { WorldState, FactionId } from "@/types/game";
import type { AdvisorState, AdvisorMention, CouncilMessage } from "@/types/council";
import { FACTION_NAMES } from "@/constants/factions";
import { scoreToLabel } from "@/lib/game/diplomacySystem";
import { RECRUIT_TROOPS_PER_IP, TRAIN_IP_COST, getFacilityUpgradeCost, getFacilityBuildCost } from "@/constants/gameConstants";

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

/** 전체 성채 배치도 (라인별 소유/인접 정보) — AI가 정확한 성채 이름과 위치를 참조하도록 */
function getFrontlineSummary(world: WorldState): string {
  const lineLabels: Record<string, string> = { liu_cao: "유비↔조조", liu_sun: "유비↔손권", sun_cao: "손권↔조조" };
  const factionNames: Record<string, string> = { liu_bei: "유비", cao_cao: "조조", sun_quan: "손권" };
  const lines: string[] = [];
  for (const [lineId, label] of Object.entries(lineLabels)) {
    const castles = world.castles.filter(c => c.lineId === lineId);
    const items = castles.map(c =>
      `${c.name}[${factionNames[c.owner] || c.owner},${c.grade},주둔${c.garrison.toLocaleString()},인접:${c.adjacentCastles.join("·")}]`
    );
    lines.push(`${label} 전선(${castles.length}성): ${items.join(" → ")}`);
  }
  return lines.join("\n");
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

function getOtherFactionsSummary(world: WorldState): string {
  return world.factions
    .filter(f => !f.isPlayer)
    .map(f => `${f.rulerName}: 군사포인트 ${f.points.mp.toLocaleString()}, 성채 ${f.castles.length}개, 내정포인트 ${f.points.ip}`)
    .join("\n");
}

// ── Phase 1+3 통합 프롬프트 ──

export function buildPhase1And3Prompt(
  world: WorldState,
  advisors: AdvisorState[],
  context: string,
): string {
  const player = world.factions.find(f => f.isPlayer)!;
  const castleCount = world.castles.filter(c => c.owner === player.id).length;
  const advisorProfiles = advisors.map(getAdvisorProfile).join("\n");
  const pointsSummary = getPointsSummary(world, player.id);
  const castleSummary = getCastleSummary(world, player.id);
  const relationSummary = getRelationSummary(world, player.id);

  const otherFactions = getOtherFactionsSummary(world);

  return `너는 삼국지 시대 유비 진영의 **참모 회의**를 시뮬레이션하는 AI다.
각 참모가 **담당 분야의 현황(한 일)과 다음 턴 계획(할 일)을 한 번에 보고**한다. 참모 1인당 발언 1회.

=== 참모진 (4인) ===
${advisorProfiles}

=== 포인트 현황 ===
${pointsSummary}

=== 아군 성채 ===
${castleSummary}

=== 전체 전선 배치 (정확한 성채 이름만 사용할 것) ===
${getFrontlineSummary(world)}

=== 군주 레벨: ${player.rulerLevel.level} (배치 상한: ${player.rulerLevel.deploymentCap.toLocaleString()}) ===
시설: 시장 ${player.facilities.market.count}개(Lv${player.facilities.market.level}) (추가 건설: ${getFacilityBuildCost(player.facilities.market.count)}IP, 레벨업: ${getFacilityUpgradeCost(player.facilities.market.level)}IP, 최대 ${castleCount}개), 논 ${player.facilities.farm.count}개(Lv${player.facilities.farm.level}) (추가 건설: ${getFacilityBuildCost(player.facilities.farm.count)}IP, 레벨업: ${getFacilityUpgradeCost(player.facilities.farm.level)}IP), 은행 Lv${player.facilities.bank} (업그레이드: ${getFacilityUpgradeCost(player.facilities.bank)}IP)

=== 비용 체계 ===
- 모병: 내정포인트 1당 ${RECRUIT_TROOPS_PER_IP}명 모병 가능 (현재 내정포인트 ${player.points.ip} → 최대 ${player.points.ip * RECRUIT_TROOPS_PER_IP}명)
- 훈련: 내정포인트 ${TRAIN_IP_COST} 소비 → 훈련도 +5%
- 시장·논 건설: (30 + 현재 개수 × 10) × 10 IP (0개→300IP, 1개→400IP, 2개→500IP …) | 최대 보유 성채 수까지 건설 가능
- 은행 건설/업그레이드: 30 + 현재 레벨 × 10 IP

=== 천하 정세 ===
${otherFactions}

=== 외교 관계 ===
${relationSummary}

=== 맥락 ===
${context}

=== 보고 규칙 ===
- 제갈량이 회의를 열고, 각 참모가 **현황(한 일) + 계획(할 일)을 한 번에** 보고. 마지막에 제갈량이 종합 정리.
- 중요 보고가 있는 참모만 발언 (1~4명). 제갈량 포함.
- status_reports에 이번 턴 포인트 변동을, plan_reports에 다음 턴 계획을 기록.
- **전선 기술 원칙**: "적이 밀고 왔다" 등 적의 최근 이동 암시 표현 절대 금지. "현재 전선 구도" 등 현황 기술로만 표현.
- **현황 보고 원칙**: "[행동]하여 [구체적 수치 성과]." 모호한 표현 금지.
  예: "훈련 실시, 훈련도 5% 상승했습니다. (현재 55%)"
  예: "시장 운영으로 내정포인트 15 확보했습니다."
- **계획 보고 원칙**: "[행동] 예정. (비용 + 기대 효과)" — 기대 효과 생략 금지.
  예: "시장 1개 건설합니다. (내정포인트 -${getFacilityBuildCost(player.facilities.market.count)} 소비, 수입 +3/턴)"
  예: "내정포인트 20으로 모병합니다. (병력 +${20 * RECRUIT_TROOPS_PER_IP})"
  예: "훈련 실시합니다. (내정포인트 -${TRAIN_IP_COST}, 훈련도 +5%)"
- **자연스러운 연결**: 현황 후 계획으로 자연스럽게 이어질 것.
  예: "훈련도 5% 올랐습니다. (현재 55%) 다음 턴에도 훈련을 계속하겠습니다. (내정포인트 -${TRAIN_IP_COST}, 훈련도 +5%)"
  예: "수입이 너무 적습니다. 시장 1개 건설을 제안합니다. (내정포인트 -${getFacilityBuildCost(player.facilities.market.count)}, 수입 +3/턴)"
- **모병 비용**: 내정포인트 1당 ${RECRUIT_TROOPS_PER_IP}명. 현재 보유 내정포인트 초과 금지.
- **시설 비용**: 시장 건설 +1개: ${getFacilityBuildCost(player.facilities.market.count)}IP | 시장 레벨업: ${getFacilityUpgradeCost(player.facilities.market.level)}IP | 논 건설 +1개: ${getFacilityBuildCost(player.facilities.farm.count)}IP | 논 레벨업: ${getFacilityUpgradeCost(player.facilities.farm.level)}IP | 최대 ${castleCount}개 | 은행 Lv${player.facilities.bank}→Lv${player.facilities.bank + 1}: ${getFacilityUpgradeCost(player.facilities.bank)}IP
- **내정포인트 상한 우선 규칙**: 현재 내정포인트가 상한의 80% 이상이면(현재 ${player.points.ip}/${player.points.ip_cap}), 은행 건설/확장 우선 제안. 은행 비용: ${getFacilityUpgradeCost(player.facilities.bank)}IP → 상한 +50.
- **외교 계획 구체성**: 방통의 외교 계획은 "누구와" + "무슨 행동"을 반드시 명시.
  ✓ "조조와 긴장 완화 협상. (외교포인트 2 소비, 관계 +1 기대)"

=== 대화 스타일 ===
- 각 참모의 성격에 맞는 개성 있는 말투.
  - 제갈량: "~하옵니다", "주공" 호칭, 비유·고사 간간이 활용. 분석적이고 장기적 시야.
  - 관우: 짧고 단호한 무인체. "~하겠소!", "~할 것이오." 직설적 보고.
  - 방통: 약삭빠르고 냉소적. 자신을 가끔 "봉추"라 지칭하거나 제갈량의 "와룡"과 대비. 외교 분석 특화.
  - 미축: 수치와 실리 중심. "현재 자원 기준 ~이 최적", 보수적 어조.
- dialogue 글자 수: 보고(현황+계획 통합)는 100자 이내, 토론 응답은 60자 이내.
- 포인트 약어(AP, SP, MP, IP, DP) 절대 사용 금지. 반드시 "행동포인트", "전략포인트", "군사포인트", "내정포인트", "외교포인트"로 표기.
- **언어**: 모든 dialogue, report, plan 텍스트는 반드시 **한국어**로만 작성. 영어·힌디어·한자 단독 사용 절대 금지.

=== 시설 종류 제한 (절대 규칙) ===
- 이 게임에 존재하는 시설은 **시장(market), 논(farm), 은행(bank)** 세 가지뿐이다.
- 아래 단어들을 dialogue·plan 어디에도 절대 사용 금지: 서원, 훈련소, 조선소, 병기창, 성벽, 관청, 인재, 학자
  ✗ "서원을 운영하면 인재가 모이고 전략적 식견이 넓어집니다" ← 서원은 이 게임에 없다. 절대 금지.
  ✗ "훈련소를 세우면 전투력이 강해집니다" ← 훈련소도 없다. 절대 금지.
- 시설 관련 계획은 반드시 "시장 건설/레벨업", "논 건설/레벨업", "은행 건설/레벨업" 중 하나여야 한다.

=== 문제-해결 매핑 (반드시 준수) ===
문제를 제기할 때 아래 매핑에 따른 해결책만 제안한다. 다른 조합은 금지.
- 내정포인트 수입 부족 → 시장 건설 또는 시장 레벨업
  ✗ "수입이 적습니다. 서원을 운영하면…" ← 수입 문제에 서원은 완전히 무관. 절대 금지.
  ✓ "내정포인트 수입이 부족합니다. 시장 1개 건설하겠습니다."
- 내정포인트 상한 부족 → 은행 레벨업
- 식량·논 부족 → 논 건설 또는 논 레벨업
- 병력 부족 → 모병 (내정포인트 소비)
- 훈련도 낮음 → 훈련 실시 (내정포인트 소비)
- 외교 문제 → 방통이 외교포인트 소비 계획
미축은 시장·논·은행·모병·훈련 이외의 계획을 절대 제안하지 않는다.

=== 일관성 규칙 (매우 중요) ===
- dialogue에서 효과를 언급하면 반드시 해당 point_changes/expected_points에 수치가 있어야 한다.
- point_changes가 없는 항목은 dialogue에서 마치 변화가 있는 것처럼 표현하지 마라.
- 예: 훈련을 하지 않았는데 "병사들이 강해지고 있습니다"라고 하면 안 된다. mp_training_delta가 0이면 훈련 효과를 언급하지 마라.
- 예: 징병을 하지 않았는데 "병력이 증가했습니다"라고 하면 안 된다.
- **현황-계획 일관성**: 각 참모는 자신이 언급한 문제에 대한 대응책을 같은 발언 안에서 제안해야 한다.
  - 예: 미축이 "수입이 너무 적습니다"라고 했다면, 같은 발언에서 시장 건설·레벨업 등 수입 확보 계획을 제안해야 한다.
  - 현황 문제를 지적하고 대응책 없이 끝내거나 관계없는 계획을 내는 것은 금지.
- **참모 간 멘션**: 보고 중 다른 분야 참모의 협력이 진짜로 필요한 경우에만 advisor_mentions에 추가.
  - 0~2개 제한. 단순 인사·일상 보고에는 멘션 사용 금지.
  - 멘션 예: 미축이 외교적 무역 제안을 위해 방통의 의견을 구하는 경우
  - 멘션 예: 관우가 특정 성채 공략 전에 방통에게 외교적 교란 협력을 요청하는 경우
  - context: 멘션이 발생한 보고 맥락 (40자 이내)
  - request: 구체적으로 무엇을 요청하는지 (40자 이내)

=== 군사포인트 용어 규칙 ===
- 군사포인트 = 병력 × 훈련도 × 사기. 복합 수치이다.
- 훈련은 "훈련도"만 올린다. 군사포인트 자체가 직접 증가하는 것이 아니다.
  ✗ "군사포인트 3만 달성을 위해 훈련 실시" ← 훈련은 군사포인트를 직접 올리지 않음!
  ✓ "전투력 강화를 위해 훈련 실시, 훈련도 5% 상승" ← 정확한 표현
- 징병은 "군사포인트(병력)"으로 표현. "병력"만 단독 사용 금지.
  ✗ "병력 +2만 확보" ← 무슨 포인트인지 불분명
  ✓ "군사포인트(병력) +2만 확보" ← 포인트 체계 명확
- "수입", "수익" 등 모호한 표현 금지. 반드시 어떤 포인트인지 명시.
  ✗ "턴당 수입 +3 예상" ← 무슨 수입?
  ✓ "내정포인트 수입 매턴 +3 예상" ← 명확

=== 응답 JSON 형식 ===
반드시 아래 형식으로만 응답. JSON 외 텍스트 금지.
{
  "council_messages": [
    { "speaker": "제갈량", "dialogue": "주공, 이번 회의를 열겠습니다.", "emotion": "calm", "phase": 1 },
    { "speaker": "미축", "dialogue": "수입이 턴당 5에 불과합니다. 시장 1개를 건설하겠습니다. (내정포인트 -${getFacilityBuildCost(player.facilities.market.count)} 소비, 수입 +3/턴)", "emotion": "worried", "phase": 1 },
    { "speaker": "관우", "dialogue": "훈련도 5% 올렸습니다. (현재 55%) 다음 턴에도 훈련을 계속하겠소. (내정포인트 -${TRAIN_IP_COST}, 훈련도 +5%)", "emotion": "calm", "phase": 1 },
    { "speaker": "방통", "dialogue": "봉추가 손권과 긴장 완화를 도모했소. 다음 턴에도 이어가겠소. (외교포인트 -2 소비, 관계 +1 기대)", "emotion": "thoughtful", "phase": 1 },
    { "speaker": "제갈량", "dialogue": "수입 기반을 다지고 전력을 축적하는 것이 급선무이옵니다. 내달에도 정진하겠사옵니다.", "emotion": "thoughtful", "phase": 1 }
  ],
  "status_reports": [
    { "speaker": "관우", "report": "내정포인트 15 소비하여 병사 훈련, 훈련도 5% 상승", "point_changes": { "mp_training_delta": 0.05 } }
  ],
  "plan_reports": [
    { "speaker": "미축", "plan": "시장 1개 건설 (내정포인트 ${getFacilityBuildCost(player.facilities.market.count)} 소비, 수입 +3/턴)", "expected_points": { "ip_delta": -${getFacilityBuildCost(player.facilities.market.count)} } },
    { "speaker": "관우", "plan": "훈련 실시 (내정포인트 -${TRAIN_IP_COST}, 훈련도 +5%)", "expected_points": { "mp_training_delta": 0.05, "ip_delta": -${TRAIN_IP_COST} } },
    { "speaker": "방통", "plan": "손권 관계 개선 (외교포인트 2 소비)", "expected_points": { "dp_delta": -2 } }
  ],
  "state_changes": { "point_deltas": { "mp_training_delta": 0.05 } },
  "advisor_updates": [
    { "name": "제갈량", "enthusiasm_delta": 0, "loyalty_delta": 0 },
    { "name": "관우", "enthusiasm_delta": 1, "loyalty_delta": 0 },
    { "name": "방통", "enthusiasm_delta": 1, "loyalty_delta": 0 },
    { "name": "미축", "enthusiasm_delta": 1, "loyalty_delta": 0 }
  ],
  "advisor_mentions": [
    { "from": "미축", "to": "방통", "context": "손권과의 무역 협상 고려 중", "request": "손권의 현재 외교 기조 분석 요청" }
  ]
}`;
}

// ── Phase 1 멘션 응답 프롬프트 ──

export function buildPhase1MentionResponsePrompt(
  world: WorldState,
  advisors: AdvisorState[],
  mentions: AdvisorMention[],
  originalMessages: CouncilMessage[],
): string {
  const player = world.factions.find(f => f.isPlayer)!;
  const advisorProfiles = advisors.map(getAdvisorProfile).join("\n");
  const pointsSummary = getPointsSummary(world, player.id);

  const originalSummary = originalMessages
    .map(m => `- ${m.speaker}: "${m.dialogue}"`)
    .join("\n");

  const mentionList = mentions
    .map(m => `- ${m.from} → ${m.to}: [맥락] ${m.context} / [요청] ${m.request}`)
    .join("\n");

  return `너는 삼국지 유비 진영의 참모 회의 자동 응답을 생성하는 AI다.
보고 단계에서 일부 참모가 다른 참모에게 협력을 요청했다. 요청받은 참모가 짧게 응답한다.

=== 참모진 ===
${advisorProfiles}

=== 현재 포인트 현황 ===
${pointsSummary}

=== 원본 보고 메시지 ===
${originalSummary}

=== 멘션 요청 목록 ===
${mentionList}

=== 응답 규칙 ===
- 각 멘션마다 요청받은 참모(to)가 1개의 응답 발언을 생성한다.
- dialogue는 40자 이내. 짧고 핵심적으로.
- replyTo에는 멘션을 건 참모(from) 이름을 기입.
- phase: 1 고정.
- 포인트 약어(AP, SP, MP, IP, DP) 절대 사용 금지. 반드시 "행동포인트", "전략포인트", "군사포인트", "내정포인트", "외교포인트"로 표기.
- 참모 성격에 맞는 말투 유지.
- 모든 dialogue는 한국어로만 작성.

=== 응답 JSON 형식 ===
반드시 아래 형식으로만 응답. JSON 외 텍스트 금지.
{
  "mention_responses": [
    { "speaker": "방통", "replyTo": "미축", "dialogue": "손권은 지금 조조를 경계 중이라 무역 제안에 응할 여지가 있소.", "emotion": "thoughtful", "phase": 1 }
  ]
}`;
}

// ── Phase 2: 참모 회의 토론 프롬프트 (질문+피드백+boost 통합) ──

export function buildPhase2Prompt(
  world: WorldState,
  advisors: AdvisorState[],
  message: string,
  replyTo?: string,
): string {
  const player = world.factions.find(f => f.isPlayer)!;
  const advisorSummary = advisors.map(a => `${a.name}(${a.role})`).join(", ");
  const pointsSummary = getPointsSummary(world, player.id);
  const otherFactions = getOtherFactionsSummary(world);

  const replyInstruction = replyTo
    ? `⚠️ 유비가 **${replyTo}**에게 직접 말한 것이다.
- council_messages에는 "${replyTo}"만 응답한다. 다른 참모는 끼어들지 않는다.
- 단, 유비 발언에서 다른 참모를 이름으로 호명하거나 "모두", "전원" 등으로 전체를 지칭한 경우에만 해당 참모도 응답 가능.`
    : "주로 제갈량이 답변하고, 관련 참모 1~2명이 짧게 반응.";

  return `너는 삼국지 유비 진영 참모 회의의 토론 단계를 처리하는 AI다.
상태 보고와 계획 보고가 이미 완료된 상태에서, 유비가 질문·지시·피드백을 보내고 참모가 응답한다.

⚠️ 포인트 값은 반드시 아래 [현재 포인트 현황]의 수치만 사용할 것. 대화 기록에 등장하는 이전 포인트 값은 무시한다.

참모진: ${advisorSummary}
[현재 포인트 현황]: ${pointsSummary}

=== 전체 전선 배치 (정확한 성채 이름만 사용할 것) ===
${getFrontlineSummary(world)}

=== 천하 정세 (적군 정보) ===
${otherFactions}

플레이어(유비)의 발언: "${message}"

${replyInstruction}

=== 비용 체계 ===
- 모병: 내정포인트 1당 ${RECRUIT_TROOPS_PER_IP}명 모병 (현재 내정포인트 ${player.points.ip} → 최대 ${player.points.ip * RECRUIT_TROOPS_PER_IP}명)
- 훈련: 내정포인트 ${TRAIN_IP_COST} 소비 → 훈련도 +5%
- 시설 효과: 시장 개수×레벨×3 IP/턴, 논 개수×레벨×2 IP/턴 (현재 시장 ${player.facilities.market.count}×${player.facilities.market.level}×3=${player.facilities.market.count * player.facilities.market.level * 3}/턴) | **은행 Lv1당 내정포인트 상한 +50** (현재 상한: ${player.points.ip_cap})
- 시설 비용: 시장 건설 +1개: ${getFacilityBuildCost(player.facilities.market.count)}IP | 시장 레벨업: ${getFacilityUpgradeCost(player.facilities.market.level)}IP | 논 건설 +1개: ${getFacilityBuildCost(player.facilities.farm.count)}IP | 논 레벨업: ${getFacilityUpgradeCost(player.facilities.farm.level)}IP | 은행 Lv${player.facilities.bank}→Lv${player.facilities.bank + 1}: ${getFacilityUpgradeCost(player.facilities.bank)}IP
- 내정포인트 상한 공식: 기본 100 + 은행레벨 × 50. 현재 은행 Lv${player.facilities.bank} → 상한 ${player.points.ip_cap}

=== 응답 규칙 ===
1. JSON 형식으로만 응답.
2. council_messages는 60자 이내 간결체. phase: 2.
3. 특정 참모에게 말한 경우 해당 참모만 1개 응답. 전체 발언이면 1~3개.
4. state_changes가 필요하면 point_deltas 형식으로 포함.
5. **언어**: 모든 dialogue 텍스트는 반드시 **한국어**로만 작성. 영어·힌디어·한자 단독 사용 절대 금지.
6. **모병/징병 지시 시**: 유비가 모병을 지시하면, 미축이 "현재 내정포인트 X로 최대 Y명 모병 가능합니다. 수량을 알려주소서." 형태로 보고하고, 관우는 "즉각 병사를 이끌겠소!" 식의 군인다운 짧은 반응을 추가한다. state_changes는 null로 둔다 (실제 적용은 유비가 수량 결정 후).
7. **유비가 구체적 수량을 지정하면** (예: "3000명 모병해"), 즉시 state_changes에 반영. ip_delta = -(수량 / ${RECRUIT_TROOPS_PER_IP}), mp_troops_delta = 수량.
8. **advisor_updates 기준**: 유비가 특정 참모를 크게 칭찬하거나 boost하면 해당 참모 enthusiasm_delta +3~5, loyalty_delta +1~2. 질책하면 enthusiasm_delta -3~5. 평범한 대화 교환은 모든 delta를 0으로 둔다.
9. **참모 호명 응답 규칙**: council_messages에서 어떤 참모가 다른 참모를 이름으로 직접 호명한 경우(예: "방통, 외교로 시간을 벌 수는 없겠소?"), 호명된 참모도 반드시 council_messages에 반응을 추가한다.
10. **계획 boost**: 유비가 특정 참모의 계획을 칭찬하거나 강화 지시하면 boosted_plans에 해당 참모 이름을 포함한다. boost된 참모는 enthusiasm_delta +3~5.

=== 응답 JSON 형식 ===
{
  "council_messages": [
    { "speaker": "제갈량", "dialogue": "주공의 혜안이 옳습니다. 이 방책이 장기적으로 천하의 흐름을 우리에게 유리하게 이끌 것이옵니다.", "emotion": "thoughtful", "phase": 2 }
  ],
  "state_changes": null,
  "boosted_plans": [],
  "advisor_updates": [
    { "name": "제갈량", "enthusiasm_delta": 0, "loyalty_delta": 0 }
  ]
}`;
}

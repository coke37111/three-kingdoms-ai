/**
 * 새 회의 흐름 엔진
 *
 * 정규화(0~1) + 톤 기반으로 회의 메시지를 생성한다.
 * 회의 순서: 시스템요약 → 제갈량선언 → 도메인별제안 → 제갈량마무리
 *
 * testMode=true 시 제갈량이 모든 도메인 발언 (다른 참모 비활성화).
 */

import type { WorldState } from "@/types/game";
import type { AdvisorState, CouncilMessage, PlanReport } from "@/types/council";
import type { GameSituation, MeetingFlowResult, ToneLevel, ToneMap, NormalizedSituation } from "./types";
import { normalizeSituation, deriveToneMap, toneToEmotion } from "./situationNormalizer";
import { ZHUGE_TEMPLATES, GUAN_YU_TEMPLATES, MI_ZHU_TEMPLATES, PANG_TONG_TEMPLATES, buildDialogueVariables, pickDialogue } from "./dialogueTemplates";
import type { DialogueCategory } from "./types";
import { RECRUIT_TROOPS_PER_IP } from "@/constants/gameConstants";

// ===================== 도메인 우선순위 =====================

const TONE_URGENCY: Record<ToneLevel, number> = {
  critical: 0,
  crisis: 1,
  uneasy: 2,
  adequate: 3,
  stable: 4,
  comfortable: 5,
};

function rankDomainsByUrgency(toneMap: ToneMap): Array<"military" | "economy" | "diplomacy"> {
  const domains: Array<"military" | "economy" | "diplomacy"> = ["military", "economy", "diplomacy"];
  return [...domains].sort((a, b) => TONE_URGENCY[toneMap[a]] - TONE_URGENCY[toneMap[b]]);
}

// ===================== 지난 턴 성과 요약 =====================

function buildTurnResultSummary(situation: GameSituation): string | null {
  const parts: string[] = [];

  if (situation.strategic.recentBattleWon) parts.push("지난 턴 전투에서 승리하였습니다.");
  if (situation.strategic.recentBattleLost) parts.push("지난 턴 전투에서 패배하였습니다.");
  if (situation.strategic.recentCastleGained) parts.push("새로운 성채를 획득하였습니다.");
  if (situation.strategic.recentCastleLost) parts.push("성채를 빼앗겼습니다.");
  if (situation.strategic.leveledUp) parts.push("군주 레벨이 상승하였습니다!");

  for (const evt of situation.strategic.recentEventTypes) {
    parts.push(`[이벤트] ${evt}`);
  }

  if (parts.length === 0) return null;
  return parts.join(" ");
}

// ===================== 원조 가능 세력 계산 =====================

function getAidEligibleFactions(world: WorldState): Array<{
  factionId: string;
  rulerName: string;
  relationScore: number;
  aidIP: number;
}> {
  const player = world.factions.find(f => f.isPlayer)!;
  return world.factions
    .filter(f => !f.isPlayer)
    .map(f => {
      const rel = world.relations.find(r =>
        (r.factionA === player.id && r.factionB === f.id) ||
        (r.factionB === player.id && r.factionA === f.id),
      );
      const score = rel?.score ?? 0;
      return { factionId: f.id, rulerName: f.rulerName, relationScore: score, aidIP: Math.round(5 + score * 2) };
    })
    .filter(f => f.relationScore >= 2)
    .sort((a, b) => b.relationScore - a.relationScore);
}

// ===================== 톤 기반 planReports 생성 =====================

function derivePlanReports(
  situation: GameSituation,
  toneMap: ToneMap,
  normalized: NormalizedSituation,
  world: WorldState,
): PlanReport[] {
  const reports: PlanReport[] = [];

  // 군사 계획
  if (toneMap.military === "critical" || toneMap.military === "crisis") {
    const ipToSpend = Math.min(100, Math.floor(situation.economy.ip * 0.8));
    const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
    if (ipToSpend > 0) {
      reports.push({
        speaker: "관우",
        plan: `긴급 모병: 내정력 ${ipToSpend} 투입 → 병력 ${troops.toLocaleString()}명`,
        expected_points: { ip_delta: -ipToSpend, mp_troops_delta: troops },
      });
    }
  } else if (toneMap.military === "uneasy" || toneMap.military === "adequate") {
    reports.push({
      speaker: "관우",
      plan: "훈련 실시: 훈련도 +10%",
      expected_points: { ip_delta: -15, mp_training_delta: 0.1 },
    });
  }

  // 내정 계획
  if (toneMap.economy === "critical" || toneMap.economy === "crisis") {
    if (situation.economy.canBuildMarket) {
      reports.push({
        speaker: "미축",
        plan: `시장 건설 (비용: 내정력 ${situation.economy.marketBuildCost})`,
        expected_points: { ip_delta: -situation.economy.marketBuildCost },
        facility_upgrades: [{ type: "market", count_delta: 1 }],
      });
    } else if (situation.economy.canBuildFarm) {
      reports.push({
        speaker: "미축",
        plan: `논 건설 (비용: 내정력 ${situation.economy.farmBuildCost})`,
        expected_points: { ip_delta: -situation.economy.farmBuildCost },
        facility_upgrades: [{ type: "farm", count_delta: 1 }],
      });
    }
  } else if (toneMap.economy === "uneasy" || toneMap.economy === "adequate") {
    if (situation.economy.canUpgradeMarket) {
      reports.push({
        speaker: "미축",
        plan: `시장 업그레이드 (비용: 내정력 ${situation.economy.marketUpgradeCost})`,
        expected_points: { ip_delta: -situation.economy.marketUpgradeCost },
        facility_upgrades: [{ type: "market", level_delta: 1 }],
      });
    } else if (situation.economy.canBuildMarket) {
      reports.push({
        speaker: "미축",
        plan: `시장 건설 (비용: 내정력 ${situation.economy.marketBuildCost})`,
        expected_points: { ip_delta: -situation.economy.marketBuildCost },
        facility_upgrades: [{ type: "market", count_delta: 1 }],
      });
    }
  }

  // 외교 계획
  if (toneMap.diplomacy === "crisis" || toneMap.diplomacy === "critical") {
    if (situation.diplomacy.dp >= 2) {
      reports.push({
        speaker: "방통",
        plan: `${normalized.details.primaryThreat?.rulerName ?? "적"}과 외교 관계 개선 (외교력 2 소비)`,
        expected_points: { dp_delta: -2 },
      });
    }
  }

  // 경제 위기 시 방통의 원조 요청 계획
  if (toneMap.economy === "critical" || toneMap.economy === "crisis") {
    if (situation.diplomacy.dp >= 2) {
      const aidFactions = getAidEligibleFactions(world);
      if (aidFactions.length > 0) {
        const top = aidFactions[0];
        reports.push({
          speaker: "방통",
          plan: `${top.rulerName}에게 원조 요청 (외교력 2 소비 → 내정력 +${top.aidIP} 획득)`,
          expected_points: { dp_delta: -2, ip_delta: top.aidIP },
        });
      }
    }
  }

  return reports;
}

// ===================== 주 함수 =====================

export function runMeetingFlow(
  situation: GameSituation,
  world: WorldState,
  advisors: AdvisorState[],
  turn: number,
  options?: { testMode?: boolean },
): MeetingFlowResult {
  const normalized = normalizeSituation(situation, world);
  const toneMap = deriveToneMap(normalized);
  const variables = buildDialogueVariables(situation, normalized);

  const messages: CouncilMessage[] = [];

  // 1. [시스템] 지난 턴 성과 요약 (2턴 이후)
  if (turn > 1) {
    const summary = buildTurnResultSummary(situation);
    if (summary) {
      messages.push({
        speaker: "__system__",
        dialogue: summary,
        emotion: "calm",
        phase: 1,
      });
    }
  }

  // 2. [진행] 제갈량 — 상황 공유 + 전략 목표 (broadcast)
  const overview = pickDialogue(ZHUGE_TEMPLATES, "strategic_overview", toneMap.overall, turn, variables);
  const goal = pickDialogue(ZHUGE_TEMPLATES, "meeting_goal", toneMap.overall, turn, variables);
  messages.push({
    speaker: "제갈량",
    dialogue: `${overview.text} ${goal.text}`,
    emotion: overview.emotion,
    phase: 1,
    messageMode: "broadcast",
  });

  // 3. [제안] 도메인별 상황 + 타계책 (위급한 순서)
  // 테스트 모드: 제갈량이 전담 / 일반 모드: 도메인 담당 참모 발언
  const DOMAIN_ADVISOR = {
    military: { speaker: "관우", templates: GUAN_YU_TEMPLATES },
    economy:  { speaker: "미축", templates: MI_ZHU_TEMPLATES },
    diplomacy: { speaker: "방통", templates: PANG_TONG_TEMPLATES },
  } as const;

  const domainPriority = rankDomainsByUrgency(toneMap);
  const testMode = options?.testMode ?? false;

  // 군사 → 내정 IP 요청 상태 추적
  let ipRequestPending = false;

  for (const domain of domainPriority) {
    const domainTone = toneMap[domain];
    const statusCat = `${domain}_status` as DialogueCategory;
    const counterCat = `countermeasure_${domain}` as DialogueCategory;

    const { speaker, templates } = testMode
      ? { speaker: "제갈량", templates: ZHUGE_TEMPLATES }
      : DOMAIN_ADVISOR[domain];

    // 경제 발언 시작 전: 관우의 IP 요청이 있었다면 먼저 응답
    if (!testMode && domain === "economy" && ipRequestPending) {
      const reply = pickDialogue(MI_ZHU_TEMPLATES, "reply_ip_to_military", toneMap.economy, turn, variables);
      messages.push({
        speaker: "미축",
        dialogue: reply.text,
        emotion: reply.emotion,
        phase: 1,
        replyTo: "관우",
        messageMode: "interactive",
      });
      ipRequestPending = false;
    }

    // 외교 도메인: 경제 위기 + 원조 가능 시 원조 제안만 표시 (regular 스킵)
    if (!testMode && domain === "diplomacy" &&
        (toneMap.economy === "crisis" || toneMap.economy === "critical")) {
      const aidFactions = getAidEligibleFactions(world);
      if (aidFactions.length > 0 && situation.diplomacy.dp >= 2) {
        const top = aidFactions[0];
        messages.push({
          speaker: "방통",
          dialogue: `주공, 내정이 위태로우나 외교로 돌파구가 있사옵니다. ${top.rulerName}과의 관계(+${top.relationScore})를 활용해 원조를 요청하면 내정력 ${top.aidIP}를 확보할 수 있습니다. 외교력 2면 충분하옵니다.`,
          emotion: "thoughtful",
          phase: 1,
          messageMode: "interactive",
        });
        continue;
      }
    }

    const status = pickDialogue(templates, statusCat, domainTone, turn, variables);
    const counter = pickDialogue(templates, counterCat, domainTone, turn, variables);

    messages.push({
      speaker,
      dialogue: `${status.text} ${counter.text}`,
      emotion: toneToEmotion(domainTone),
      phase: 1,
      messageMode: "interactive",
    });

    // 군사 발언 후: 타계책에 IP가 필요한 경우 미축에게 요청
    if (!testMode && domain === "military" &&
        (domainTone === "uneasy" || domainTone === "crisis" || domainTone === "critical")) {
      const request = pickDialogue(GUAN_YU_TEMPLATES, "request_ip_support", domainTone, turn, variables);
      messages.push({
        speaker: "관우",
        dialogue: request.text,
        emotion: request.emotion,
        phase: 1,
        messageMode: "interactive",
      });
      ipRequestPending = true;
    }
  }

  // 경제가 군사보다 먼저 처리된 경우(경제 위기 더 긴급) — 관우 요청 후 지연 응답
  if (!testMode && ipRequestPending) {
    const reply = pickDialogue(MI_ZHU_TEMPLATES, "reply_ip_to_military", toneMap.economy, turn, variables);
    messages.push({
      speaker: "미축",
      dialogue: reply.text,
      emotion: reply.emotion,
      phase: 1,
      replyTo: "관우",
      messageMode: "interactive",
    });
  }

  // 4. [종료] 마무리
  const close = pickDialogue(ZHUGE_TEMPLATES, "meeting_close", toneMap.overall, turn, variables);
  messages.push({
    speaker: "제갈량",
    dialogue: close.text,
    emotion: close.emotion,
    phase: 1,
  });

  // 5. planReports 생성
  const planReports = derivePlanReports(situation, toneMap, normalized, world);

  return {
    messages,
    planReports,
    statusReports: [],
    advisorUpdates: [],
    source: "flow",
    normalized,
    toneMap,
  };
}

import type { Emotion } from "./chat";
import type { StateChanges, PointDeltas } from "./game";

// ===================== 참모 역할/상태 =====================

export type AdvisorRole = "전략" | "군사" | "외교" | "내정";

export type MeetingPhase = 1 | 2 | 3;

export interface AdvisorState {
  name: string;
  role: AdvisorRole;
  loyalty: number;      // 0~100 충성도
  enthusiasm: number;   // 0~100 열정
  icon: string;
  color: string;
  personality: string;  // AI 프롬프트에 사용할 성격 키워드
}

// ===================== 회의 메시지 =====================

export interface CouncilMessage {
  speaker: string;
  dialogue: string;
  emotion: Emotion;
  phase?: 1 | 2 | 3 | 4;  // 메시지 유형 표시용 (1=상태보고, 2=토론, 3=계획, 4=레거시 피드백)
  replyTo?: string;  // 멘션 응답 시 원본 발언자
  /** 대화 유형: broadcast(전략선언), interactive(도메인대응), report(추가보고) */
  messageMode?: "broadcast" | "interactive" | "report";
}

// ===================== 참모 간 멘션 =====================

export interface AdvisorMention {
  from: string;     // 멘션 거는 참모 (예: "미축")
  to: string;       // 멘션 대상 참모 (예: "방통")
  context: string;  // 발언 맥락
  request: string;  // 구체적 요청 내용
}

// ===================== Phase 1: 상태 보고 =====================

export interface StatusReport {
  speaker: string;
  report: string;           // 보고 내용
  point_changes?: PointDeltas;  // 보고에 따른 포인트 변동
}

// ===================== Phase 3: 계획 보고 =====================

export interface PlanReport {
  speaker: string;
  plan: string;             // 계획 설명
  expected_points?: PointDeltas;  // 기대 포인트 변동
  facility_upgrades?: { type: "market" | "farm" | "bank"; count_delta?: number; level_delta?: number }[];  // 시설 변동
  extra_note?: string;      // 추가 표시 메모 (e.g. "(군사력 +200)")
}

// ===================== Phase 1+3 통합 응답 =====================

export interface CouncilResponse {
  council_messages: CouncilMessage[];
  status_reports: StatusReport[];
  plan_reports: PlanReport[];
  state_changes: StateChanges | null;
  advisor_mentions?: AdvisorMention[];
}

// ===================== Phase 2/4 반응 응답 =====================

export interface CouncilReactionResponse {
  council_messages: CouncilMessage[];
  state_changes: StateChanges | null;
  boosted_plans?: string[];  // boost된 계획 참모 이름
}

// ===================== 쓰레드 메시지 =====================

export interface ThreadMessage {
  type: "user" | "advisor";
  speaker: string;
  text: string;
  emotion?: Emotion;
  stat_delta?: { enthusiasm_delta?: number; loyalty_delta?: number };
}

// ===================== 충성도/열정 변동 =====================

export interface AdvisorStatsDelta {
  name: string;
  enthusiasm_delta?: number;
  loyalty_delta?: number;
}

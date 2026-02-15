import type { Emotion } from "./chat";
import type { StateChanges } from "./game";

// ===================== 참모 역할/상태 =====================

export type AdvisorRole = "총괄" | "군사" | "내정" | "외교" | "첩보";

export interface AdvisorState {
  name: string;
  role: AdvisorRole;
  loyalty: number;      // 0~100 충성도
  enthusiasm: number;   // 0~100 열정
  icon: string;
  color: string;
  personality: string;  // AI 프롬프트에 사용할 성격 키워드
}

// ===================== 참모 회의 응답 =====================

export interface CouncilMessage {
  speaker: string;
  dialogue: string;
  emotion: Emotion;
}

/** 참모 자율 행동 보고 */
export interface AdvisorAction {
  advisor: string;
  role: AdvisorRole;
  action: string;           // "세금 징수", "병사 훈련" 등
  result: string;           // "금 320 확보" 등
  state_changes: StateChanges | null;
}

/** 결재 요청 */
export interface ApprovalRequest {
  id: string;
  advisor: string;
  subject: string;          // "대규모 모병 계획"
  description: string;
  cost: StateChanges | null;
  benefit: string;
  urgency: "routine" | "important" | "critical";
}

export interface CouncilResponse {
  council_messages: CouncilMessage[];
  auto_actions: AdvisorAction[];        // 자율 행동 보고
  approval_requests: ApprovalRequest[]; // 결재 요청 (0~2개)
  state_changes: StateChanges | null;   // auto_actions 합산
}

// ===================== 쓰레드 메시지 =====================

export interface ThreadMessage {
  type: "user" | "advisor";
  speaker: string;
  text: string;
  emotion?: Emotion;
}

// ===================== 충성도/열정 변동 =====================

export interface AdvisorStatsDelta {
  name: string;
  enthusiasm_delta?: number;
  loyalty_delta?: number;
}

// ===================== Phase 0: 정세 브리핑 =====================

/** 긴급 상황 유형 */
export type UrgentEventType = "invasion" | "famine" | "betrayal" | "city_lost" | "general_defect";

/** 감정 방향 선택지 */
export interface EmotionalDirective {
  id: string;
  icon: string;
  text: string;          // 유비의 대사
  tone: "aggressive" | "cooperative" | "delegating" | "anxious";
  effect: string;        // UI 힌트 (예: "공격적 방향 — 관우 적극, 미축 걱정")
}

/** 정세 브리핑 데이터 */
export interface SituationBriefing {
  isUrgent: boolean;
  briefingText: string;           // 제갈량의 브리핑 대사
  urgentType?: UrgentEventType;
  directives?: EmotionalDirective[];  // isUrgent=true일 때만
}

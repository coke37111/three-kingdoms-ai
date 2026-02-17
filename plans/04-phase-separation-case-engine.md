# 04. Phase 1/3 분리 + 케이스 기반 즉각 응답 시스템

## 목표

1. Phase 1(상태 보고)과 Phase 3(계획 보고)을 분리하여, Phase 2 토론 결과가 Phase 3 계획에 반영되도록 한다.
2. 사전 정의된 케이스 엔진을 도입하여 Phase 1/3에서 API 없이 즉각 응답하고, 적절한 케이스가 없을 때만 폴백으로 API를 호출한다.

## 현재 문제

```
[현재] Phase 1+3 통합 API 1회 호출
  → Phase 2에서 플레이어가 뭘 말하든
  → Phase 3 계획은 이미 생성된 상태 (반영 불가)
  → 매턴 API 호출 필수 (지연 + 비용)
```

## 변경 후 흐름

```
Phase 1: 케이스 엔진 → 즉각 응답 (~0ms)
           └ 폴백 조건 해당 시에만 API 호출
Phase 2: 토론 (기존 API 유지)
Phase 3: Phase 2 토론 결과 + 현재 상태 기반
           ├ 케이스 매칭 → 즉각 응답
           └ 매칭 실패 → API 호출 (Phase 2 맥락 포함)
Phase 4: 피드백 (기존 API 유지)
Phase 5: 실행 (기존 유지)
```

---

## A단계: Phase 1/3 분리 (구조 변경)

### A.1: 프롬프트 분리

**파일:** `lib/prompts/councilPrompt.ts`

- `buildPhase1And3Prompt()` → 폐기
- `buildPhase1Prompt(world, advisors, context)` 신설 — 상태 보고만 생성
- `buildPhase3Prompt(world, advisors, phase2Summary)` 신설 — Phase 2 토론 요약을 받아 계획 생성

```typescript
// Phase 3 프롬프트에 Phase 2 토론 맥락 포함
export function buildPhase3Prompt(
  world: WorldState,
  advisors: AdvisorState[],
  phase2Summary: string,  // Phase 2에서 플레이어가 한 발언 요약
): string { ... }
```

### A.2: LLM 클라이언트 분리

**파일:** `lib/api/llmClient.ts`

- `callCouncilLLM()` → `callPhase1LLM()` + `callPhase3LLM()` 으로 분리
- 각각 독립적으로 케이스 엔진 결과 또는 API 결과를 반환
- 반환 타입도 Phase별로 분리:

```typescript
export interface Phase1Result {
  messages: CouncilMessage[];       // phase: 1 메시지들
  statusReports: StatusReport[];
  stateChanges: StateChanges | null;
  advisorUpdates: AdvisorStatsDelta[];
  source: "case" | "api";          // 케이스 vs API 출처 추적
}

export interface Phase3Result {
  messages: CouncilMessage[];       // phase: 3 메시지들
  planReports: PlanReport[];
  advisorUpdates: AdvisorStatsDelta[];
  source: "case" | "api";
}
```

### A.3: GameContainer 흐름 변경

**파일:** `components/game/GameContainer.tsx`

현재 `runMeetingPhase1And3()` 를 분리:

```
[현재]
runMeetingPhase1And3()
  → API 1회 → Phase 1 메시지 표시 → Phase 3 메시지 저장(pendingRef)
  → Phase 2 대기 → "다음" 버튼 → 저장된 Phase 3 표시

[변경]
runPhase1(context)
  → 케이스 엔진 or API → Phase 1 메시지 표시
  → Phase 2 대기
handleAdvancePhase()
  → Phase 2 발언 수집
  → runPhase3(phase2Summary)
    → 케이스 엔진 or API → Phase 3 메시지 표시
  → Phase 4 대기
```

**핵심 변경점:**
- `pendingPhase3MsgsRef` 제거 — Phase 3은 더 이상 미리 생성하지 않음
- `handleAdvancePhase()`에서 Phase 3을 실시간 생성
- Phase 2에서 플레이어가 한 발언들을 수집하여 `phase2Summary`로 전달

```typescript
// Phase 2 발언 수집 (sendMessage에서 추가)
const phase2MessagesRef = useRef<string[]>([]);

// Phase 2 → Phase 3 전환 시
const phase2Summary = phase2MessagesRef.current.length > 0
  ? phase2MessagesRef.current.join(" / ")
  : "군주가 별도 지시 없이 진행을 명했다";
```

### A.4: 타입 변경

**파일:** `types/council.ts`

- `CouncilResponse` 인터페이스를 Phase 1 전용 / Phase 3 전용으로 분리

```typescript
export interface Phase1Response {
  council_messages: CouncilMessage[];
  status_reports: StatusReport[];
  state_changes: StateChanges | null;
}

export interface Phase3Response {
  council_messages: CouncilMessage[];
  plan_reports: PlanReport[];
}

// 기존 CouncilResponse는 하위 호환 유지 후 점진 제거
```

---

## B단계: 케이스 기반 즉각 응답 엔진

### B.1: 상황 진단 시스템

**신규 파일:** `lib/council/situationAnalyzer.ts`

게임 상태를 분석하여 구조화된 "상황 객체"를 생성.

```typescript
export interface GameSituation {
  turn: number;

  // 군사
  military: {
    troops: number;
    training: number;
    morale: number;
    mp: number;
    troopShortage: boolean;     // troops < 20000
    lowTraining: boolean;       // training < 0.5
    lowMorale: boolean;         // morale < 0.8
    woundedRecovering: number;  // 회복 중 부상병 수
    woundedTurnsLeft: number;   // 최대 남은 복구 턴
  };

  // 경제
  economy: {
    ip: number;
    ipCap: number;
    ipRegen: number;
    ipNearCap: boolean;   // ip >= ipCap * 0.9
    ipCritical: boolean;  // ip < 15
    marketLv: number;
    farmLv: number;
    bankLv: number;
    canUpgradeFacility: boolean;  // ip >= FACILITY_BUILD_COST
  };

  // 외교
  diplomacy: {
    dp: number;
    dpShortage: boolean;  // dp < 2
    relations: Array<{
      target: string;       // "조조" | "손권"
      targetId: FactionId;
      score: number;
      label: string;        // "적대" | "중립" | "우호" | "동맹"
    }>;
    allHostile: boolean;   // 양쪽 모두 score < -3
    hasAlly: boolean;      // 한쪽이라도 score >= 7
  };

  // 전략 (종합)
  strategic: {
    overallStrength: "우세" | "균형" | "열세";
    biggestThreat: { name: string; mp: number } | null;
    castleCount: number;
    enemyCastleCounts: Record<string, number>;
    recentBattle: boolean;        // 직전 턴에 전투 발생
    recentInvasion: boolean;      // 직전 턴에 침공 방어
    recentCastleChange: boolean;  // 직전 턴에 성채 변동
    recentEvent: boolean;         // 직전 턴에 이벤트 발생
  };

  // 참모 상태
  advisorMood: Record<string, {
    loyalty: number;
    enthusiasm: number;
    isPassive: boolean;  // enthusiasm < 40
    isDisloyal: boolean; // loyalty < 30
  }>;
}

export function analyzeGameSituation(
  world: WorldState,
  advisors: AdvisorState[],
  turnContext?: TurnContext,  // 직전 턴 전투/이벤트 기록
): GameSituation { ... }
```

### B.2: Phase 1 케이스 정의

**신규 파일:** `lib/council/phase1Cases.ts`

각 참모별 케이스를 조건 + 대사 변형으로 정의.

```typescript
export interface CaseDefinition {
  id: string;
  advisor: string;         // "제갈량" | "관우" | "미축" | "방통"
  priority: number;        // 0~100 (높을수록 우선)
  condition: (sit: GameSituation) => boolean;
  variations: CaseVariation[];
  statusReport?: (sit: GameSituation) => StatusReport | null;
  stateChanges?: (sit: GameSituation) => PointDeltas | null;
}

export interface CaseVariation {
  dialogue: string | ((sit: GameSituation) => string);  // 동적 대사 지원
  emotion: Emotion;
  passiveDialogue?: string;  // enthusiasm < 40일 때 대체 대사
}
```

#### 제갈량 케이스 (전략/개회 — 항상 1개 발언)

```typescript
const ZHUGE_CASES: CaseDefinition[] = [
  {
    id: "zhuge_opening_default",
    advisor: "제갈량",
    priority: 10,
    condition: () => true,  // 항상 매칭 (기본 개회)
    variations: [
      { dialogue: "주공, 이번 턴 보고를 시작하겠습니다.", emotion: "calm" },
      { dialogue: "주공, 참모들의 보고를 들으시옵소서.", emotion: "calm" },
      { dialogue: "그러면 금번 회의를 시작하겠사옵니다.", emotion: "calm" },
    ],
  },
  {
    id: "zhuge_advantage",
    advisor: "제갈량",
    priority: 30,
    condition: (s) => s.strategic.overallStrength === "우세",
    variations: [
      { dialogue: "주공, 천하의 형세가 유리하게 돌아가고 있사옵니다.", emotion: "excited" },
      { dialogue: "대세가 우리에게 기울고 있습니다. 이 기회를 놓쳐선 안 됩니다.", emotion: "excited" },
    ],
  },
  {
    id: "zhuge_disadvantage",
    advisor: "제갈량",
    priority: 40,
    condition: (s) => s.strategic.overallStrength === "열세",
    variations: [
      { dialogue: "주공, 현 상황이 녹록하지 않사옵니다. 신중해야 합니다.", emotion: "worried" },
      { dialogue: "적의 기세가 대단합니다. 지금은 힘을 기를 때입니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_post_battle",
    advisor: "제갈량",
    priority: 60,
    condition: (s) => s.strategic.recentBattle,
    variations: [
      { dialogue: "지난 전투의 여파를 살피고 대책을 논의합시다.", emotion: "thoughtful" },
      { dialogue: "전란의 먼지가 채 가시지 않았습니다. 보고를 들어봅시다.", emotion: "worried" },
    ],
  },
  {
    id: "zhuge_milestone",
    advisor: "제갈량",
    priority: 50,
    condition: (s) => s.turn > 0 && s.turn % 30 === 0,
    variations: [
      {
        dialogue: (s) => `벌써 ${s.turn}턴이 지났사옵니다. 천하대세를 돌아봅시다.`,
        emotion: "thoughtful",
      },
    ],
  },
];
```

#### 관우 케이스 (군사)

```typescript
const GUAN_CASES: CaseDefinition[] = [
  {
    id: "guan_troop_shortage",
    advisor: "관우",
    priority: 70,
    condition: (s) => s.military.troopShortage,
    variations: [
      { dialogue: "병력이 태부족이오. 모병이 시급합니다.", emotion: "angry" },
      { dialogue: "이 병력으로는 싸움이 되지 않소!", emotion: "angry" },
      {
        dialogue: (s) => `병력이 ${Math.round(s.military.troops / 10000)}만에 불과하오. 모병을 서둘러야 하오.`,
        emotion: "worried",
      },
    ],
    statusReport: (s) => ({
      speaker: "관우",
      report: `현재 병력 ${s.military.troops.toLocaleString()}명, 모병이 시급함`,
    }),
  },
  {
    id: "guan_low_training",
    advisor: "관우",
    priority: 55,
    condition: (s) => s.military.lowTraining && !s.military.troopShortage,
    variations: [
      { dialogue: "병사들의 훈련이 부족하오. 훈련을 강화해야 합니다.", emotion: "worried" },
      {
        dialogue: (s) => `훈련도가 ${(s.military.training * 100).toFixed(0)}%에 불과하오. 이래서야 전투가 되겠소?`,
        emotion: "angry",
      },
    ],
    statusReport: (s) => ({
      speaker: "관우",
      report: `훈련도 ${(s.military.training * 100).toFixed(0)}%, 훈련 필요`,
    }),
  },
  {
    id: "guan_low_morale",
    advisor: "관우",
    priority: 60,
    condition: (s) => s.military.lowMorale,
    variations: [
      { dialogue: "사기가 떨어졌소. 병사들에게 활기를 불어넣어야 하오.", emotion: "angry" },
      { dialogue: "병사들의 눈빛이 죽어 있소. 사기 진작이 급선무요.", emotion: "worried" },
    ],
  },
  {
    id: "guan_wounded_recovery",
    advisor: "관우",
    priority: 45,
    condition: (s) => s.military.woundedRecovering > 0,
    variations: [
      {
        dialogue: (s) => `부상병 ${s.military.woundedRecovering.toLocaleString()}명이 치료 중이오. ${s.military.woundedTurnsLeft}턴 후 복귀 예정.`,
        emotion: "calm",
      },
    ],
  },
  {
    id: "guan_enemy_strong",
    advisor: "관우",
    priority: 50,
    condition: (s) => s.strategic.biggestThreat !== null &&
      s.strategic.biggestThreat.mp > s.military.mp * 1.5,
    variations: [
      {
        dialogue: (s) => `${s.strategic.biggestThreat!.name}의 군세가 우리의 배를 넘소. 방비를 서둘러야 하오.`,
        emotion: "worried",
      },
      {
        dialogue: (s) => `${s.strategic.biggestThreat!.name} 군의 기세가 대단하오. 경계를 늦추지 마시오.`,
        emotion: "worried",
      },
    ],
  },
  {
    id: "guan_stable",
    advisor: "관우",
    priority: 5,  // 낮은 우선순위 — 다른 이슈 없을 때만
    condition: (s) => !s.military.troopShortage && !s.military.lowTraining && !s.military.lowMorale,
    variations: [
      { dialogue: "군사적으로 안정적이오. 병사들이 잘 따르고 있소.", emotion: "calm" },
      { dialogue: "훈련이 순조롭소. 병사들의 기강이 바로 서 있소.", emotion: "calm" },
    ],
  },
];
```

#### 미축 케이스 (내정)

```typescript
const MI_CASES: CaseDefinition[] = [
  {
    id: "mi_ip_report",
    advisor: "미축",
    priority: 20,
    condition: () => true,  // 항상 수입 보고
    variations: [
      {
        dialogue: (s) => `이번 턴 내정포인트 ${s.economy.ipRegen} 확보하였습니다.`,
        emotion: "calm",
      },
    ],
    statusReport: (s) => ({
      speaker: "미축",
      report: `시설 운영으로 내정포인트 ${s.economy.ipRegen} 확보`,
      point_changes: { ip_delta: 0 }, // 실제 충전은 advanceWorldTurn에서 처리
    }),
  },
  {
    id: "mi_ip_near_cap",
    advisor: "미축",
    priority: 50,
    condition: (s) => s.economy.ipNearCap,
    variations: [
      { dialogue: "내정포인트가 상한에 가깝습니다. 은행 확장을 건의합니다.", emotion: "thoughtful" },
      {
        dialogue: (s) => `내정포인트가 ${s.economy.ip}/${s.economy.ipCap}이옵니다. 저장 한계에 다다르고 있습니다.`,
        emotion: "worried",
      },
    ],
  },
  {
    id: "mi_ip_critical",
    advisor: "미축",
    priority: 65,
    condition: (s) => s.economy.ipCritical,
    variations: [
      { dialogue: "재정이 궁핍합니다. 지출을 줄여야 합니다.", emotion: "worried" },
      { dialogue: "주공, 곳간이 바닥을 보이고 있사옵니다.", emotion: "worried" },
    ],
  },
  {
    id: "mi_no_facilities",
    advisor: "미축",
    priority: 55,
    condition: (s) => s.economy.marketLv === 0 && s.economy.farmLv === 0,
    variations: [
      { dialogue: "아직 시설이 미비합니다. 시장부터 건설해야 합니다.", emotion: "worried" },
    ],
  },
  {
    id: "mi_upgrade_suggestion",
    advisor: "미축",
    priority: 35,
    condition: (s) => s.economy.canUpgradeFacility && s.economy.marketLv >= 3 && s.economy.farmLv < 2,
    variations: [
      { dialogue: "시장이 안정되었으니 논을 확장하여 수입을 다각화합시다.", emotion: "thoughtful" },
    ],
  },
];
```

#### 방통 케이스 (외교)

```typescript
const PANG_CASES: CaseDefinition[] = [
  {
    id: "pang_all_hostile",
    advisor: "방통",
    priority: 70,
    condition: (s) => s.diplomacy.allHostile,
    variations: [
      { dialogue: "사면초가입니다. 한쪽과는 화해를 모색해야 합니다.", emotion: "worried" },
      { dialogue: "양쪽 모두 적대적이니 고립되기 전에 손을 써야 합니다.", emotion: "worried" },
    ],
  },
  {
    id: "pang_dp_shortage",
    advisor: "방통",
    priority: 45,
    condition: (s) => s.diplomacy.dpShortage && !s.diplomacy.allHostile,
    variations: [
      { dialogue: "외교 자원이 바닥입니다. 당분간 외교 행동이 어렵습니다.", emotion: "worried" },
    ],
  },
  {
    id: "pang_opportunity",
    advisor: "방통",
    priority: 40,
    condition: (s) => s.diplomacy.dp >= 5 &&
      s.diplomacy.relations.some(r => r.score < -3),
    variations: [
      { dialogue: "외교포인트가 넉넉하니 관계 개선을 시도합시다.", emotion: "thoughtful" },
      {
        dialogue: (s) => {
          const hostile = s.diplomacy.relations.find(r => r.score < -3);
          return `${hostile?.target}과의 관계가 험악하오. 외교적 접근을 시도합시다.`;
        },
        emotion: "thoughtful",
      },
    ],
  },
  {
    id: "pang_good_ally",
    advisor: "방통",
    priority: 35,
    condition: (s) => s.diplomacy.relations.some(r => r.score > 5),
    variations: [
      {
        dialogue: (s) => {
          const friend = s.diplomacy.relations.find(r => r.score > 5);
          return `${friend?.target}과의 관계가 좋으니 활용할 때입니다.`;
        },
        emotion: "excited",
      },
    ],
  },
  {
    id: "pang_stable",
    advisor: "방통",
    priority: 5,
    condition: (s) => !s.diplomacy.allHostile && !s.diplomacy.dpShortage,
    variations: [
      { dialogue: "외교적으로 특별한 변동은 없습니다.", emotion: "calm" },
    ],
  },
];
```

### B.3: 케이스 매칭 엔진

**신규 파일:** `lib/council/caseEngine.ts`

```typescript
import type { GameSituation } from "./situationAnalyzer";
import type { Phase1Result, Phase3Result } from "./types";
import { ZHUGE_CASES, GUAN_CASES, MI_CASES, PANG_CASES } from "./phase1Cases";

const ALL_PHASE1_CASES = [...ZHUGE_CASES, ...GUAN_CASES, ...MI_CASES, ...PANG_CASES];

export interface CaseEngineConfig {
  maxConsecutiveCaseTurns: number;  // 연속 케이스 사용 제한 (기본 3)
}

export function generatePhase1FromCases(
  situation: GameSituation,
  config?: CaseEngineConfig,
): Phase1Result | null {
  // 1. 폴백 조건 체크 — 해당하면 null 반환 → 호출측에서 API 폴백
  if (shouldFallbackToAPI(situation, config)) return null;

  // 2. 각 참모별 최고 우선순위 케이스 선택
  const advisorOrder = ["제갈량", "관우", "미축", "방통"];
  const selected: MatchedCase[] = [];

  for (const advisor of advisorOrder) {
    const cases = ALL_PHASE1_CASES
      .filter(c => c.advisor === advisor && c.condition(situation))
      .sort((a, b) => b.priority - a.priority);

    if (cases.length > 0) {
      selected.push({ case: cases[0], advisor });
    }
  }

  // 3. 발언자 수 조절 (제갈량 필수 + 이슈 있는 참모 1~2명)
  const zhuge = selected.find(s => s.advisor === "제갈량");
  const others = selected
    .filter(s => s.advisor !== "제갈량" && s.case.priority > REPORT_THRESHOLD)
    .slice(0, 2);

  const speakers = zhuge ? [zhuge, ...others] : others;
  if (speakers.length === 0) return null; // 매칭 실패 → API 폴백

  // 4. 대사 변형 선택 (턴 기반 결정론적)
  const messages = speakers.map(s => buildMessage(s, situation));
  const statusReports = speakers
    .map(s => s.case.statusReport?.(situation))
    .filter(Boolean);

  return { messages, statusReports, stateChanges: null, advisorUpdates: [], source: "case" };
}
```

**발언자 수 규칙:**
- 제갈량: 항상 1개 (개회)
- 나머지: priority > REPORT_THRESHOLD(15)인 참모만 발언 (최대 2명)
- 보고할 것 없는 참모는 생략 → "중요 보고가 있는 참모만 1~3명" 원칙 유지

**대사 변형 선택:**
```typescript
function pickVariation(variations: CaseVariation[], turn: number, isPassive: boolean): CaseVariation {
  // 소극적 참모는 passiveDialogue 우선 사용
  const pool = isPassive
    ? variations.filter(v => v.passiveDialogue).length > 0
      ? variations
      : variations
    : variations;

  // 턴 번호 기반 결정론적 선택 (같은 턴 = 같은 결과, 재현 가능)
  return pool[turn % pool.length];
}
```

### B.4: 폴백 조건 정의

**`shouldFallbackToAPI()` — 케이스로 처리 불가한 상황**

```typescript
function shouldFallbackToAPI(
  situation: GameSituation,
  config?: CaseEngineConfig,
): boolean {
  // 1. 직전 턴에 전투 발생 → 맥락적 반응 필요
  if (situation.strategic.recentBattle) return true;

  // 2. 직전 턴에 침공 방어 → 위기 분석 필요
  if (situation.strategic.recentInvasion) return true;

  // 3. 직전 턴에 성채 변동 → 정세 변화 분석
  if (situation.strategic.recentCastleChange) return true;

  // 4. 직전 턴에 이벤트 발생 → 예측 불가 반응
  if (situation.strategic.recentEvent) return true;

  // 5. 연속 N턴 케이스 사용 → 단조로움 방지
  const maxConsec = config?.maxConsecutiveCaseTurns ?? 3;
  if (consecutiveCaseTurns >= maxConsec) return true;

  // 6. 참모 충성도 위기 → AI가 갈등 연출
  if (Object.values(situation.advisorMood).some(a => a.isDisloyal)) return true;

  return false;
}
```

### B.5: 턴 컨텍스트 추적

**신규 파일 또는 기존 hook 확장:** `lib/council/turnContext.ts`

Phase 1 케이스 엔진이 "직전 턴에 무슨 일이 있었는지" 알 수 있도록 컨텍스트 추적.

```typescript
export interface TurnContext {
  lastTurnBattle: boolean;
  lastTurnInvasion: boolean;
  lastTurnCastleChange: boolean;
  lastTurnEvents: string[];
  consecutiveCaseTurns: number;  // 연속으로 케이스 엔진이 처리한 턴 수
  phase2Messages: string[];      // 직전 Phase 2에서 플레이어 발언 목록
}
```

이 컨텍스트는 `GameContainer`에서 `useRef`로 유지하며, Phase 5 실행 시 업데이트.

---

## C단계: Phase 3 케이스 정의

### C.1: Phase 3 케이스 — 토론 없을 때

**신규 파일:** `lib/council/phase3Cases.ts`

Phase 2에서 플레이어가 발언 없이 "다음"을 눌렀을 때, 현재 상태 기반 기본 계획.

```typescript
const PHASE3_DEFAULT_CASES: Phase3CaseDefinition[] = [
  // 관우: 군사 계획
  {
    id: "p3_guan_recruit",
    advisor: "관우",
    priority: 60,
    condition: (s) => s.military.troopShortage && s.economy.ip >= RECRUIT_IP_COST,
    planReport: (s) => ({
      speaker: "관우",
      plan: `모병 실시 (내정포인트 ${RECRUIT_IP_COST} 소비)`,
      expected_points: { ip_delta: -RECRUIT_IP_COST, mp_troops_delta: 20000 },
    }),
    variations: [
      { dialogue: "모병을 실시하겠소!", emotion: "excited" },
    ],
  },
  {
    id: "p3_guan_train",
    advisor: "관우",
    priority: 50,
    condition: (s) => s.military.lowTraining && s.economy.ip >= TRAIN_IP_COST,
    planReport: (s) => ({
      speaker: "관우",
      plan: `훈련 강화 (내정포인트 ${TRAIN_IP_COST} 소비)`,
      expected_points: { ip_delta: -TRAIN_IP_COST, mp_training_delta: 0.05 },
    }),
    variations: [
      { dialogue: "병사 훈련에 매진하겠소.", emotion: "calm" },
    ],
  },

  // 미축: 내정 계획
  {
    id: "p3_mi_build_market",
    advisor: "미축",
    priority: 45,
    condition: (s) => s.economy.canUpgradeFacility && s.economy.marketLv < 5,
    planReport: () => ({
      speaker: "미축",
      plan: `시장 확장 (내정포인트 ${FACILITY_BUILD_COST} 소비)`,
      expected_points: { ip_delta: -FACILITY_BUILD_COST },
    }),
    variations: [
      { dialogue: "시장을 확장하여 수입을 늘리겠습니다.", emotion: "calm" },
    ],
  },

  // 방통: 외교 계획
  {
    id: "p3_pang_improve",
    advisor: "방통",
    priority: 40,
    condition: (s) => s.diplomacy.dp >= 2 && s.diplomacy.relations.some(r => r.score < 0),
    planReport: (s) => {
      const target = s.diplomacy.relations.find(r => r.score < 0);
      return {
        speaker: "방통",
        plan: `${target?.target}과 관계 개선 (외교포인트 2 소비)`,
        expected_points: { dp_delta: -2 },
      };
    },
    variations: [
      {
        dialogue: (s) => {
          const target = s.diplomacy.relations.find(r => r.score < 0);
          return `${target?.target}에게 사신을 보내 관계를 개선하겠습니다.`;
        },
        emotion: "thoughtful",
      },
    ],
  },

  // 제갈량: 종합 정리 (항상 마지막)
  {
    id: "p3_zhuge_summary",
    advisor: "제갈량",
    priority: 100,  // 항상 마지막에 배치
    condition: () => true,
    variations: [
      { dialogue: "이상의 계획을 종합하면, 이번 턴은 내실을 다지는 데 집중합시다.", emotion: "calm" },
      { dialogue: "각 참모의 계획을 정리하였습니다. 주공의 재가를 기다리겠습니다.", emotion: "calm" },
    ],
  },
];
```

### C.2: Phase 3 — 토론 반영 (키워드 매칭)

Phase 2에서 플레이어가 발언한 내용을 키워드 분석하여 계획에 반영.

```typescript
const KEYWORD_TO_PLAN_MAPPING = {
  // 공격/출격 관련
  attack: {
    keywords: ["공격", "출격", "침공", "점령", "진격"],
    advisorOverride: "관우",
    planTemplate: (target?: string) => ({
      speaker: "관우",
      plan: target ? `${target} 공격 준비` : "공격 준비 강화",
    }),
  },
  // 방어 관련
  defense: {
    keywords: ["방어", "수비", "지키", "방비"],
    advisorOverride: "관우",
    planTemplate: () => ({
      speaker: "관우",
      plan: "전선 방어 강화",
    }),
  },
  // 시설/건설 관련
  build: {
    keywords: ["시설", "건설", "시장", "논", "은행", "확장"],
    advisorOverride: "미축",
  },
  // 외교 관련
  diplomacy: {
    keywords: ["외교", "동맹", "화친", "사신", "이간"],
    advisorOverride: "방통",
  },
  // 모병/훈련
  military_prep: {
    keywords: ["모병", "훈련", "징병", "병력"],
    advisorOverride: "관우",
  },
};

function analyzePhase2Keywords(messages: string[]): string[] {
  const combined = messages.join(" ");
  const matched: string[] = [];
  for (const [key, mapping] of Object.entries(KEYWORD_TO_PLAN_MAPPING)) {
    if (mapping.keywords.some(kw => combined.includes(kw))) {
      matched.push(key);
    }
  }
  return matched;
}
```

**Phase 3 생성 흐름:**
```
phase2Messages가 비어있음?
  ├─ Yes → 기본 케이스(C.1)로 생성
  └─ No → 키워드 분석
         ├─ 키워드 매칭 성공 → 매칭된 계획 + 기본 계획 조합
         └─ 키워드 매칭 실패 → API 폴백 (Phase 2 대화를 맥락으로 전달)
```

---

## D단계: GameContainer 통합

### D.1: 주요 변경 함수

```typescript
// [삭제] doPhase1And3()
// [삭제] runMeetingPhase1And3()

// [신규] doPhase1()
const doPhase1 = useCallback(async (context: string, turnCtx: TurnContext) => {
  const situation = analyzeGameSituation(worldStateRef.current, advisorsRef.current, turnCtx);

  // 1. 케이스 엔진 시도
  const caseResult = generatePhase1FromCases(situation);
  if (caseResult) {
    turnCtxRef.current.consecutiveCaseTurns++;
    return caseResult;
  }

  // 2. 폴백: API 호출
  turnCtxRef.current.consecutiveCaseTurns = 0;
  const systemPrompt = buildPhase1Prompt(worldStateRef.current, advisorsRef.current, context);
  // ... 기존 callCouncilLLM 호출 로직 ...
}, [...]);

// [신규] doPhase3()
const doPhase3 = useCallback(async (phase2Summary: string, turnCtx: TurnContext) => {
  const situation = analyzeGameSituation(worldStateRef.current, advisorsRef.current, turnCtx);

  // 1. Phase 2 발언이 없으면 기본 케이스
  if (phase2Summary === "" || phase2Summary === "군주가 별도 지시 없이 진행을 명했다") {
    const caseResult = generatePhase3FromCases(situation);
    if (caseResult) return caseResult;
  }

  // 2. 키워드 매칭 시도
  const keywords = analyzePhase2Keywords(phase2MessagesRef.current);
  if (keywords.length > 0) {
    const caseResult = generatePhase3FromKeywords(situation, keywords);
    if (caseResult) return caseResult;
  }

  // 3. 폴백: API 호출 (Phase 2 맥락 포함)
  const systemPrompt = buildPhase3Prompt(worldStateRef.current, advisorsRef.current, phase2Summary);
  // ... API 호출 ...
}, [...]);
```

### D.2: Phase 전환 흐름 변경

```typescript
// [변경] handleAdvancePhase
const handleAdvancePhase = useCallback(async () => {
  if (meetingPhase === 2) {
    setMeetingPhase(3);
    setIsLoading(true);

    // Phase 2 발언 수집
    const summary = phase2MessagesRef.current.length > 0
      ? phase2MessagesRef.current.join(" / ")
      : "";

    // Phase 3 실시간 생성 (케이스 or API)
    const phase3Result = await doPhase3(summary, turnCtxRef.current);
    setPlanReports(phase3Result.planReports);
    await animateCouncilMessages(phase3Result.messages, false);

    setMeetingPhase(4);
    // ... AP 확인 후 Phase 4 또는 Phase 5 ...
  }
}, [...]);
```

### D.3: Phase 2 발언 수집

```typescript
// sendMessage 내부에 추가
if (meetingPhase === 2) {
  phase2MessagesRef.current.push(text);
  // ... 기존 doPhase2Reply 로직 ...
}
```

---

## E단계: 파일 구조

```
lib/council/              (신규 디렉토리)
  ├─ situationAnalyzer.ts  — 게임 상태 → GameSituation 분석
  ├─ caseEngine.ts         — 케이스 매칭 엔진 (Phase 1/3 공용)
  ├─ phase1Cases.ts        — Phase 1 케이스 정의 (참모별)
  ├─ phase3Cases.ts        — Phase 3 케이스 정의 + 키워드 매핑
  └─ turnContext.ts        — 턴 컨텍스트 타입 및 유틸

lib/prompts/
  ├─ councilPrompt.ts      — buildPhase1Prompt(), buildPhase3Prompt() (분리)
  └─ (기존 buildPhase2Prompt, buildPhase4Prompt 유지)

lib/api/
  └─ llmClient.ts          — callPhase1LLM(), callPhase3LLM() (분리)

types/
  └─ council.ts            — Phase1Response, Phase3Response 추가
```

---

## 구현 순서

| 순서 | 작업 | 파일 | 비고 |
|------|------|------|------|
| 1 | `GameSituation` 타입 + `analyzeGameSituation()` | `lib/council/situationAnalyzer.ts` | 모든 케이스의 기반 |
| 2 | `TurnContext` 타입 | `lib/council/turnContext.ts` | 폴백 판단용 |
| 3 | Phase 1 케이스 정의 (4참모) | `lib/council/phase1Cases.ts` | 케이스 내용 |
| 4 | 케이스 매칭 엔진 + 폴백 로직 | `lib/council/caseEngine.ts` | 핵심 엔진 |
| 5 | Phase 3 케이스 + 키워드 매핑 | `lib/council/phase3Cases.ts` | Phase 3 분리 |
| 6 | 프롬프트 분리 | `lib/prompts/councilPrompt.ts` | API 폴백용 |
| 7 | LLM 클라이언트 분리 | `lib/api/llmClient.ts` | 호출 구조 |
| 8 | 타입 추가 | `types/council.ts` | 인터페이스 |
| 9 | GameContainer 통합 | `components/game/GameContainer.tsx` | 흐름 변경 |
| 10 | 테스트/검증 | — | dev 서버에서 확인 |

---

## 확장 가능성

- 케이스 정의를 JSON 파일로 분리하면 비개발자도 대사 추가/수정 가능
- 충성도/열정에 따른 대사 변형을 확장하면 참모 개성 강화
- Phase 2/4에도 단순 반응 케이스(동의/칭찬/거부) 추가 가능
- 연속 케이스 사용 카운터로 API 호출 빈도를 세밀하게 조절

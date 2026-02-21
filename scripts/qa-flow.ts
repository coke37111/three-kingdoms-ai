/**
 * scripts/qa-flow.ts
 *
 * 회의 흐름 QA 도구
 *
 * runMeetingFlow()를 7개 시나리오로 실행하고 대화 원칙 위반을 검증한다.
 * 게임 서버 없이 `npm run qa` 한 줄로 실행.
 *
 * 검증 원칙:
 *   원칙 1 — 구체적 수치 (수치 없는 변화 표현 금지)
 *   원칙 2 — 한국어 포인트 명칭 (AP/SP/MP/IP/DP 약어 금지)
 *   원칙 3-a — 비정상 수치 (0명, 0 확보 등)
 *   원칙 3-b — 방통 언급 일관성 (미축이 방통 언급 시 방통 메시지 필수)
 */

import { INITIAL_FACTIONS, INITIAL_RELATIONS } from "@/constants/factions";
import { INITIAL_CASTLES } from "@/constants/castles";
import { INITIAL_ADVISORS } from "@/constants/advisors";
import { analyzeGameSituation } from "@/lib/council/engine";
import { runMeetingFlow } from "@/lib/council/meetingFlow";
import type { WorldState, Faction, DiplomaticRelation } from "@/types/game";
import type { CouncilMessage } from "@/types/council";
import type { MeetingFlowResult } from "@/lib/council/types";

// ===================== 유틸리티 =====================

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function calcMP(troops: number, training: number, morale: number): number {
  return Math.floor(troops * training * morale);
}

function setRelation(
  relations: DiplomaticRelation[],
  fA: string,
  fB: string,
  score: number,
): void {
  const existing = relations.find(
    r => (r.factionA === fA && r.factionB === fB) ||
         (r.factionB === fA && r.factionA === fB),
  );
  if (existing) {
    existing.score = score;
  } else {
    relations.push({ factionA: fA, factionB: fB, score });
  }
}

// ===================== 월드 빌더 =====================

interface WorldOverrides {
  turn?: number;
  playerPoints?: Partial<Faction["points"]>;
  relationOverrides?: Array<{ fA: string; fB: string; score: number }>;
}

function buildWorld(overrides: WorldOverrides = {}): WorldState {
  const factions = deepClone(INITIAL_FACTIONS);
  const castles = deepClone(INITIAL_CASTLES);
  const relations = deepClone(INITIAL_RELATIONS);

  // 모든 세력의 MP 계산 (INITIAL_FACTIONS는 mp=0으로 초기화됨)
  for (const f of factions) {
    f.points.mp = calcMP(f.points.mp_troops, f.points.mp_training, f.points.mp_morale);
  }

  // 플레이어 포인트 덮어쓰기
  const player = factions.find(f => f.isPlayer)!;
  if (overrides.playerPoints) {
    Object.assign(player.points, overrides.playerPoints);
    // mp 재계산 (troops/training/morale이 바뀐 경우)
    player.points.mp = calcMP(
      player.points.mp_troops,
      player.points.mp_training,
      player.points.mp_morale,
    );
  }

  // 외교 관계 덮어쓰기
  for (const rel of (overrides.relationOverrides ?? [])) {
    setRelation(relations, rel.fA, rel.fB, rel.score);
  }

  return {
    currentTurn: overrides.turn ?? 5,
    maxTurns: 120,
    factions,
    castles,
    relations,
    turnOrder: factions.filter(f => !f.isPlayer).reduce<string[]>(
      (acc, f) => [...acc, f.id],
      ["liu_bei"],
    ),
  };
}

// ===================== 시나리오 정의 (7개) =====================

interface Scenario {
  id: string;
  label: string;
  world: WorldState;
}

const scenarios: Scenario[] = [
  // 1. 안정 기준선
  {
    id: "stable",
    label: "안정 기준선",
    world: buildWorld({
      turn: 5,
      playerPoints: { mp_troops: 50000, ip: 30, dp: 5 },
      relationOverrides: [{ fA: "liu_bei", fB: "sun_quan", score: 5 }],
    }),
  },

  // 2. 군사위기 (병력 극소, 내정 바닥)
  {
    id: "military_crisis",
    label: "군사위기",
    world: buildWorld({
      turn: 10,
      playerPoints: { mp_troops: 5000, ip: 0, dp: 3 },
    }),
  },

  // 3. 내정위기 + 원조 가능 (손권 우호, DP 충분)
  {
    id: "economy_crisis_with_aid",
    label: "내정위기 + 원조 가능",
    world: buildWorld({
      turn: 8,
      playerPoints: { ip: 0, dp: 3, mp_troops: 30000 },
      relationOverrides: [{ fA: "liu_bei", fB: "sun_quan", score: 5 }],
    }),
  },

  // 4. 내정위기 + 원조 불가 (손권 적대, 원조 경로 없음)
  {
    id: "economy_crisis_no_aid",
    label: "내정위기 + 원조 불가",
    world: buildWorld({
      turn: 8,
      playerPoints: { ip: 0, dp: 3, mp_troops: 30000 },
      relationOverrides: [{ fA: "liu_bei", fB: "sun_quan", score: -5 }],
    }),
  },

  // 5. 외교위기 (조조/손권 모두 적대)
  {
    id: "diplomatic_crisis",
    label: "외교위기",
    world: buildWorld({
      turn: 15,
      playerPoints: { ip: 30, dp: 5, mp_troops: 40000 },
      relationOverrides: [
        { fA: "liu_bei", fB: "cao_cao", score: -8 },
        { fA: "liu_bei", fB: "sun_quan", score: -8 },
      ],
    }),
  },

  // 6. 복합위기 (군사·내정·외교 동시 위기)
  {
    id: "multi_crisis",
    label: "복합위기",
    world: buildWorld({
      turn: 20,
      playerPoints: { mp_troops: 3000, ip: 0, dp: 1 },
      relationOverrides: [
        { fA: "liu_bei", fB: "cao_cao", score: -8 },
        { fA: "liu_bei", fB: "sun_quan", score: -8 },
      ],
    }),
  },

  // 7. 초반 (1턴, INITIAL 상태 그대로)
  {
    id: "early_game",
    label: "초반 (1턴)",
    world: buildWorld({ turn: 1 }),
  },
];

// ===================== 검증 규칙 =====================

interface Violation {
  principle: string;
  index: number;
  speaker: string;
  excerpt: string;
  detail: string;
}

// 원칙 2: 포인트 약어 (영문 대문자 단어 경계)
const ABBREV_PATTERN = /\bAP\b|\bSP\b|\bMP\b|\bIP\b|\bDP\b/;

// 원칙 3-a: 비정상 수치 (0명, 0 확보 등)
// (?<!\d) → "2,400명" 같은 정상 수치 오탐 방지 (앞 문자가 숫자면 제외)
const ZERO_ANOMALY_PATTERN = /(?<!\d)0\s*명|(?<!\d)0\s*확보/;

// 원칙 1: 모호한 서술 — 변화 표현 뒤에 수치가 없음
// 문장 끝(句 단위)까지 숫자가 나타나지 않으면 위반
const VAGUE_CHANGE_PATTERN = /(늘어|줄어|강해|약해|개선되|악화)(?![^。.!?\n]*\d)/;

function validateMessages(messages: CouncilMessage[]): Violation[] {
  const violations: Violation[] = [];
  const speakerSet = new Set(messages.map(m => m.speaker));

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.speaker === "__system__") continue;

    const text = msg.dialogue;

    // 원칙 2: 포인트 약어
    if (ABBREV_PATTERN.test(text)) {
      violations.push({
        principle: "원칙 2 (약어)",
        index: i,
        speaker: msg.speaker,
        excerpt: text.slice(0, 70),
        detail: "영문 약어 사용",
      });
    }

    // 원칙 3-a: 비정상 수치
    if (ZERO_ANOMALY_PATTERN.test(text)) {
      violations.push({
        principle: "원칙 3-a (0값 이상)",
        index: i,
        speaker: msg.speaker,
        excerpt: text.slice(0, 70),
        detail: "0명/0 확보 등 비정상 수치",
      });
    }

    // 원칙 3-b: 미축이 방통을 언급했으나 방통 메시지 없음
    if (msg.speaker === "미축" && text.includes("방통") && !speakerSet.has("방통")) {
      violations.push({
        principle: "원칙 3-b (방통 언급 불일치)",
        index: i,
        speaker: msg.speaker,
        excerpt: text.slice(0, 70),
        detail: "미축이 방통 언급 → 방통 메시지 없음",
      });
    }

    // 원칙 1: 모호한 서술
    if (VAGUE_CHANGE_PATTERN.test(text)) {
      violations.push({
        principle: "원칙 1 (모호한 서술)",
        index: i,
        speaker: msg.speaker,
        excerpt: text.slice(0, 70),
        detail: "수치 없는 변화 표현",
      });
    }
  }

  return violations;
}

// ===================== 리포트 출력 =====================

function printReport(
  scenario: Scenario,
  result: MeetingFlowResult,
  violations: Violation[],
): void {
  const D = "═".repeat(54);
  const S = "─".repeat(54);

  console.log(D);
  console.log(`시나리오: ${scenario.id} (${scenario.label})`);
  console.log(
    `toneMap: { military: ${result.toneMap.military}, ` +
    `economy: ${result.toneMap.economy}, ` +
    `diplomacy: ${result.toneMap.diplomacy}, ` +
    `overall: ${result.toneMap.overall} }`,
  );
  console.log(S);

  console.log(`메시지 (${result.messages.length}개):`);
  for (let i = 0; i < result.messages.length; i++) {
    const m = result.messages[i];
    const preview = m.dialogue.length > 72
      ? m.dialogue.slice(0, 72) + "…"
      : m.dialogue;
    const replyTag = m.replyTo ? ` → ${m.replyTo}` : "";
    console.log(`  [${i}] ${m.speaker}${replyTag}: ${preview}`);
  }

  console.log(S);
  console.log("검증:");
  if (violations.length === 0) {
    console.log("  ✅ 위반 없음");
  } else {
    for (const v of violations) {
      console.log(`  ❌ ${v.principle}:`);
      console.log(`     index ${v.index} [${v.speaker}]: "${v.excerpt}" → ${v.detail}`);
    }
  }

  if (result.planReports.length > 0) {
    console.log(S);
    console.log(`planReports (${result.planReports.length}개):`);
    for (const r of result.planReports) {
      const preview = r.plan.length > 60 ? r.plan.slice(0, 60) + "…" : r.plan;
      console.log(`  - ${r.speaker}: ${preview}`);
    }
  }

  console.log("");
}

// ===================== 메인 =====================

async function main(): Promise<void> {
  console.log("=== Three Kingdoms AI — 회의 흐름 QA ===\n");

  let totalViolations = 0;

  for (const scenario of scenarios) {
    const world = scenario.world;
    const turn = world.currentTurn;

    const situation = analyzeGameSituation(world, INITIAL_ADVISORS);
    const result = runMeetingFlow(situation, world, INITIAL_ADVISORS, turn);

    const violations = validateMessages(result.messages);
    totalViolations += violations.length;

    printReport(scenario, result, violations);
  }

  const D = "═".repeat(54);
  console.log(D);
  console.log(`최종: ${scenarios.length}개 시나리오, 위반 ${totalViolations}건`);
  if (totalViolations > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * 케이스 기반 즉각 응답 시스템 — 타입 정의
 *
 * Phase 1(상태 보고) / Phase 3(계획 보고)에서
 * API 호출 없이 게임 상태 기반으로 즉각 응답을 생성하기 위한 타입.
 */

import type { Emotion } from "@/types/chat";
import type { FactionId, PointDeltas } from "@/types/game";
import type { StatusReport, PlanReport, CouncilMessage, AdvisorStatsDelta } from "@/types/council";

// ===================== 게임 상황 진단 =====================

/** analyzeGameSituation()이 반환하는 구조화된 상황 객체 */
export interface GameSituation {
  turn: number;
  /** 초반(1~30) / 중반(31~80) / 후반(81~120) */
  gamePhase: "early" | "mid" | "late";

  // ── 군사 ──
  military: {
    troops: number;
    training: number;
    morale: number;
    mp: number;
    deploymentCap: number;
    // 진단 플래그
    troopsCritical: boolean;      // < 10000
    troopShortage: boolean;       // < 20000
    troopsAdequate: boolean;      // 20000~50000
    troopsAbundant: boolean;      // > 50000
    troopsAtCap: boolean;         // >= deploymentCap
    lowTraining: boolean;         // < 0.5
    midTraining: boolean;         // 0.5~0.7
    highTraining: boolean;        // > 0.7
    maxTraining: boolean;         // > 0.9
    lowMorale: boolean;           // < 0.8
    highMorale: boolean;          // > 1.1
    woundedRecovering: number;
    woundedTurnsLeft: number;
  };

  // ── 경제 ──
  economy: {
    ip: number;
    ipCap: number;
    ipRegen: number;
    // 진단 플래그
    ipCritical: boolean;          // < 5
    ipLow: boolean;               // < 15
    ipAdequate: boolean;          // 15~50
    ipRich: boolean;              // > 50
    ipAtCap: boolean;             // >= ipCap
    ipNearCap: boolean;           // >= ipCap * 0.9
    // 시설
    marketCount: number;          // 건설된 시장 수 (성채당 1개)
    marketLv: number;             // 시장 레벨
    farmCount: number;            // 건설된 논 수
    farmLv: number;               // 논 레벨
    bankLv: number;               // 은행 레벨
    castleCount: number;          // 보유 성채 수 (시설 한도)
    noFacilities: boolean;        // market.count+farm.count+bank === 0
    canBuildMarket: boolean;      // marketCount < castleCount && ip >= buildCost
    canBuildFarm: boolean;        // farmCount < castleCount && ip >= buildCost
    canUpgradeMarket: boolean;    // ip >= marketUpgradeCost
    canUpgradeFarm: boolean;      // ip >= farmUpgradeCost
    canUpgradeBank: boolean;      // ip >= bankUpgradeCost
    /** 다음 건설/업그레이드 비용 */
    marketBuildCost: number;
    farmBuildCost: number;
    marketUpgradeCost: number;
    farmUpgradeCost: number;
    bankUpgradeCost: number;
    facilityImbalance: boolean;   // |marketCount - farmCount| >= 3
    highIncome: boolean;          // ipRegen >= 20
    lowIncome: boolean;           // ipRegen <= 5
  };

  // ── 외교 ──
  diplomacy: {
    dp: number;
    dpNone: boolean;              // dp === 0
    dpLow: boolean;               // dp < 2
    dpAdequate: boolean;          // 2~4
    dpRich: boolean;              // >= 5
    relations: Array<{
      target: string;             // "조조" | "손권"
      targetId: FactionId;
      score: number;
      label: string;              // scoreToLabel() 결과
      isHostile: boolean;         // < -3
      isUnfriendly: boolean;      // -3 ~ 0
      isNeutral: boolean;         // 0 ~ 3
      isFriendly: boolean;        // > 3
      isAllied: boolean;          // >= 7
    }>;
    allHostile: boolean;
    anyAllied: boolean;
    anyFriendly: boolean;
    /** 적끼리 우호 (이간 기회) */
    enemiesFriendly: boolean;
  };

  // ── 전략 (종합) ──
  strategic: {
    overallStrength: "dominant" | "advantage" | "balanced" | "disadvantage" | "critical";
    biggestThreat: { name: string; id: FactionId; mp: number; castles: number } | null;
    weakestEnemy: { name: string; id: FactionId; mp: number; castles: number } | null;
    castleCount: number;
    totalCastles: number;         // 전체 성채 수 (35)
    enemyCastles: Record<string, number>;
    adjacentEnemyCastles: string[];   // 우리 영토에 인접한 적 성채
    adjacentOurCastles: string[];     // 적 영토에 인접한 우리 성채
    // 직전 턴 기록
    recentBattle: boolean;
    recentBattleWon: boolean;
    recentBattleLost: boolean;
    recentCastleGained: boolean;
    recentCastleLost: boolean;
    recentInvasion: boolean;
    recentEvent: boolean;
    recentEventTypes: string[];
    // 연속 기록
    consecutiveWins: number;
    consecutiveLosses: number;
    // 특수 상황
    enemyNearCapital: boolean;    // 적이 우리 본성 인접
    nearEnemyCapital: boolean;    // 우리가 적 본성 인접
    leveledUp: boolean;
    skillUnlocked: boolean;
    spCanUnlock: boolean;         // SP로 새 스킬 해금 가능
    rulerLevel: number;
    sp: number;
  };

  // ── 참모 상태 ──
  advisorMood: Record<string, {
    loyalty: number;
    enthusiasm: number;
    isPassive: boolean;           // enthusiasm < 40
    isDisloyal: boolean;          // loyalty < 30
    isEnthusiastic: boolean;      // enthusiasm >= 80
    isLoyal: boolean;             // loyalty >= 80
  }>;
}

// ===================== 케이스 정의 =====================

/** 대사 변형 — 같은 케이스에서 턴마다 다른 대사 선택 */
export interface CaseVariation {
  /** 대사 (문자열 또는 동적 생성 함수) */
  dialogue: string | ((s: GameSituation) => string);
  emotion: Emotion;
  /** enthusiasm < 40일 때 대체 대사 */
  passiveDialogue?: string | ((s: GameSituation) => string);
}

/** Phase 1 케이스 정의 */
export interface CaseDefinition {
  id: string;
  advisor: string;
  /** 0~100 — 높을수록 우선 선택. 같은 참모의 케이스 중 가장 높은 것 채택 */
  priority: number;
  /** 이 케이스가 활성화되는 조건 */
  condition: (s: GameSituation) => boolean;
  /** 대사 변형 목록 (턴 번호로 결정론적 선택) */
  variations: CaseVariation[];
  /** 상태 보고 데이터 생성 (선택) */
  statusReport?: (s: GameSituation) => StatusReport | null;
}

/** Phase 3 케이스 정의 */
export interface Phase3CaseDefinition {
  id: string;
  advisor: string;
  priority: number;
  condition: (s: GameSituation) => boolean;
  variations: CaseVariation[];
  /** 계획 보고 데이터 생성 */
  planReport: (s: GameSituation) => PlanReport;
}

// ===================== 엔진 결과 =====================

/** Phase 1 케이스 엔진 결과 */
export interface Phase1Result {
  messages: CouncilMessage[];
  statusReports: StatusReport[];
  stateChanges: null;
  advisorUpdates: AdvisorStatsDelta[];
  source: "case" | "api";
}

/** Phase 3 케이스 엔진 결과 */
export interface Phase3Result {
  messages: CouncilMessage[];
  planReports: PlanReport[];
  advisorUpdates: AdvisorStatsDelta[];
  source: "case" | "api";
}

// ===================== 턴 컨텍스트 =====================

/** GameContainer에서 매턴 갱신하는 컨텍스트 */
export interface TurnContext {
  lastTurnBattle: boolean;
  lastTurnBattleWon: boolean;
  lastTurnBattleLost: boolean;
  lastTurnInvasion: boolean;
  lastTurnCastleGained: boolean;
  lastTurnCastleLost: boolean;
  lastTurnEvents: string[];
  consecutiveCaseTurns: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  phase2Messages: string[];
  lastLevelUp: boolean;
  lastSkillUnlock: boolean;
}

/** 초기 TurnContext */
export function createInitialTurnContext(): TurnContext {
  return {
    lastTurnBattle: false,
    lastTurnBattleWon: false,
    lastTurnBattleLost: false,
    lastTurnInvasion: false,
    lastTurnCastleGained: false,
    lastTurnCastleLost: false,
    lastTurnEvents: [],
    consecutiveCaseTurns: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    phase2Messages: [],
    lastLevelUp: false,
    lastSkillUnlock: false,
  };
}


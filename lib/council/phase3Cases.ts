/**
 * Phase 3 (계획 보고) 케이스 정의
 *
 * Phase 2 토론이 없거나 키워드 매칭으로 처리 가능한 경우,
 * API 없이 현재 상태 기반 계획을 즉각 생성한다.
 */

import type { Phase3CaseDefinition, GameSituation, KeywordMapping } from "./types";
import {
  RECRUIT_TROOPS_PER_IP,
  TRAIN_IP_COST,
  getFacilityUpgradeCost,
} from "@/constants/gameConstants";

// =====================================================================
//  관우 (군사) 계획 — 33개
// =====================================================================

export const GUAN_PHASE3_CASES: Phase3CaseDefinition[] = [
  // ─── 모병 ───

  {
    id: "p3_guan_recruit_urgent",
    advisor: "관우",
    priority: 75,
    condition: (s) => s.military.troopsCritical && s.economy.ip >= 10,
    planReport: (s) => {
      const ipToSpend = Math.min(s.economy.ip, 30);
      const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
      return {
        speaker: "관우",
        plan: `긴급 모병 (내정포인트 ${ipToSpend} 소비)`,
        expected_points: { ip_delta: -ipToSpend, mp_troops_delta: troops },
      };
    },
    variations: [
      {
        dialogue: (s) => {
          const ipToSpend = Math.min(s.economy.ip, 30);
          const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
          return `긴급 모병에 들어가겠소! (내정포인트 ${ipToSpend} 소비, 군사포인트(병력) +${troops})`;
        },
        emotion: "angry",
      },
      {
        dialogue: (s) => {
          const ipToSpend = Math.min(s.economy.ip, 30);
          const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
          return `긴급 모병령을 내리겠소! (내정포인트 ${ipToSpend} 소비, 군사포인트(병력) +${troops})`;
        },
        emotion: "angry",
      },
    ],
  },
  {
    id: "p3_guan_recruit_normal",
    advisor: "관우",
    priority: 55,
    condition: (s) => s.military.troopShortage && !s.military.troopsCritical && s.economy.ip >= 10,
    planReport: (s) => {
      const ipToSpend = Math.min(s.economy.ip, 20);
      const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
      return {
        speaker: "관우",
        plan: `모병 실시 (내정포인트 ${ipToSpend} 소비)`,
        expected_points: { ip_delta: -ipToSpend, mp_troops_delta: troops },
      };
    },
    variations: [
      {
        dialogue: (s) => {
          const ipToSpend = Math.min(s.economy.ip, 20);
          const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
          return `모병을 실시하겠소. (내정포인트 ${ipToSpend} 소비, 군사포인트(병력) +${troops})`;
        },
        emotion: "calm",
      },
      {
        dialogue: (s) => {
          const ipToSpend = Math.min(s.economy.ip, 20);
          const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
          return `모병 실시합니다. (내정포인트 ${ipToSpend} 소비, 군사포인트(병력) +${troops})`;
        },
        emotion: "calm",
      },
    ],
  },
  {
    id: "p3_guan_mass_recruit",
    advisor: "관우",
    priority: 50,
    condition: (s) => s.military.troopShortage && s.economy.ip >= 40,
    planReport: (s) => {
      const ipToSpend = 40;
      const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
      return {
        speaker: "관우",
        plan: `대규모 모병 (내정포인트 ${ipToSpend} 소비)`,
        expected_points: { ip_delta: -ipToSpend, mp_troops_delta: troops },
      };
    },
    variations: [
      {
        dialogue: (s) => {
          const troops = 40 * RECRUIT_TROOPS_PER_IP;
          return `대규모 모병 실시합니다! (내정포인트 40 소비, 군사포인트(병력) +${troops})`;
        },
        emotion: "excited",
      },
    ],
  },

  // ─── 훈련 ───

  {
    id: "p3_guan_train_urgent",
    advisor: "관우",
    priority: 58,
    condition: (s) => s.military.training < 0.3 && s.economy.ip >= TRAIN_IP_COST,
    planReport: () => ({
      speaker: "관우",
      plan: `집중 훈련 (내정포인트 ${TRAIN_IP_COST} 소비)`,
      expected_points: { ip_delta: -TRAIN_IP_COST, mp_training_delta: 0.05 },
    }),
    variations: [
      { dialogue: "집중 훈련에 들어가겠소! (내정포인트 15 소비, 훈련도 +5%)", emotion: "angry" },
      { dialogue: "훈련을 대폭 강화하겠소. (내정포인트 15 소비, 훈련도 +5%)", emotion: "worried" },
    ],
  },
  {
    id: "p3_guan_train_normal",
    advisor: "관우",
    priority: 45,
    condition: (s) => s.military.lowTraining && s.military.training >= 0.3 && s.economy.ip >= TRAIN_IP_COST,
    planReport: () => ({
      speaker: "관우",
      plan: `훈련 실시 (내정포인트 ${TRAIN_IP_COST} 소비)`,
      expected_points: { ip_delta: -TRAIN_IP_COST, mp_training_delta: 0.05 },
    }),
    variations: [
      { dialogue: "병사 훈련을 실시하겠소. (내정포인트 15 소비, 훈련도 +5%)", emotion: "calm" },
      { dialogue: "훈련도를 끌어올리겠소. (내정포인트 15 소비, 훈련도 +5%)", emotion: "calm" },
    ],
  },

  // ─── 공격 제안 ───

  {
    id: "p3_guan_attack_weak",
    advisor: "관우",
    priority: 42,
    condition: (s) => s.strategic.weakestEnemy !== null &&
      s.military.mp > s.strategic.weakestEnemy.mp * 1.3 &&
      s.military.highTraining &&
      s.strategic.adjacentEnemyCastles.length > 0,
    planReport: (s) => ({
      speaker: "관우",
      plan: `${s.strategic.weakestEnemy!.name} 영토 공격 준비`,
    }),
    variations: [
      {
        dialogue: (s) => `${s.strategic.weakestEnemy!.name}이 약하오! 출격하여 성을 빼앗겠소.`,
        emotion: "excited",
      },
      {
        dialogue: (s) => `${s.strategic.weakestEnemy!.name}의 허를 찔 때요. 공격을 건의하오!`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "p3_guan_attack_adjacent",
    advisor: "관우",
    priority: 38,
    condition: (s) => s.strategic.adjacentEnemyCastles.length > 0 &&
      s.military.troopsAbundant && s.military.highTraining,
    planReport: (s) => ({
      speaker: "관우",
      plan: `인접 적 성채 공격 준비 (${s.strategic.adjacentEnemyCastles[0]})`,
    }),
    variations: [
      {
        dialogue: (s) => `${s.strategic.adjacentEnemyCastles[0]}을 공략할 준비가 되었소!`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "p3_guan_attack_capital",
    advisor: "관우",
    priority: 65,
    condition: (s) => s.strategic.nearEnemyCapital && s.military.troopsAbundant,
    planReport: () => ({
      speaker: "관우",
      plan: "적 본성 최종 공략 작전",
    }),
    variations: [
      { dialogue: "이 관우가 선봉에 서겠소! 전군 돌격으로 적 본성을 함락합시다!", emotion: "excited" },
      { dialogue: "본성 공략에 정예 군사포인트(병력)을 투입하겠소. 한 번에 끝냅시다!", emotion: "excited" },
    ],
  },

  // ─── 방어 ───

  {
    id: "p3_guan_defend_capital",
    advisor: "관우",
    priority: 70,
    condition: (s) => s.strategic.enemyNearCapital,
    planReport: () => ({
      speaker: "관우",
      plan: "본성 방어 태세 강화",
      expected_points: { mp_morale_delta: 0.02 },
    }),
    variations: [
      { dialogue: "본성 방어에 전력을 다하겠소! 이곳은 절대 내주지 않겠소.", emotion: "angry" },
      { dialogue: "본성을 사수하겠소. 한 치도 물러나지 않겠소!", emotion: "angry" },
    ],
  },
  {
    id: "p3_guan_defend_general",
    advisor: "관우",
    priority: 40,
    condition: (s) => s.strategic.adjacentEnemyCastles.length >= 2 && !s.military.troopsAbundant,
    planReport: () => ({
      speaker: "관우",
      plan: "전선 방어 강화",
      expected_points: { mp_morale_delta: 0.02 },
    }),
    variations: [
      { dialogue: "전선이 넓으니 방어를 먼저 강화하겠소.", emotion: "thoughtful" },
      { dialogue: "수비를 굳히고 기회를 기다리겠소.", emotion: "calm" },
    ],
  },

  // ─── 사기 진작 ───

  {
    id: "p3_guan_morale_boost",
    advisor: "관우",
    priority: 52,
    condition: (s) => s.military.lowMorale,
    planReport: () => ({
      speaker: "관우",
      plan: "병사 사기 진작 (훈시 및 포상)",
      expected_points: { mp_morale_delta: 0.05 },
    }),
    variations: [
      { dialogue: "사기 진작에 나서겠소. (사기 +5% 예상)", emotion: "angry" },
      { dialogue: "훈시와 포상으로 사기를 높이겠소. (사기 +5% 예상)", emotion: "calm" },
    ],
  },

  // ─── 재정비 ───

  {
    id: "p3_guan_want_recruit_no_ip",
    advisor: "관우",
    priority: 62,
    condition: (s) => s.military.troopsCritical && s.economy.ip < 10,
    planReport: (s) => ({
      speaker: "관우",
      plan: `긴급 모병 대기 — 자금 부족 (최소 10 필요, 현재 ${s.economy.ip})`,
    }),
    variations: [
      { dialogue: "모병이 급하나 자금이 없소... 미축, 내정포인트 10이라도 마련해 달라!", emotion: "angry" },
      { dialogue: "내정포인트가 최소 10은 있어야 모병 가능하오. 지금은 기다릴 수밖에 없소.", emotion: "worried" },
      { dialogue: "자금만 생기면 당장 모병하겠소. 지금은 기존 군사포인트(병력)으로 버텨야 하오.", emotion: "worried" },
    ],
  },
  {
    id: "p3_guan_want_train_no_ip",
    advisor: "관우",
    priority: 46,
    condition: (s) => s.military.training < 0.3 && s.economy.ip < TRAIN_IP_COST && !s.military.troopsCritical,
    planReport: (s) => ({
      speaker: "관우",
      plan: `훈련 대기 — 자금 부족 (필요 ${TRAIN_IP_COST}, 현재 ${s.economy.ip})`,
    }),
    variations: [
      { dialogue: "훈련시키고 싶으나 자금이 없소. 미축에게 재원 확보를 부탁하겠소.", emotion: "worried" },
      { dialogue: "내정포인트가 모이면 바로 훈련에 들어가겠소.", emotion: "calm" },
    ],
  },

  {
    id: "p3_guan_regroup",
    advisor: "관우",
    priority: 48,
    condition: (s) => s.military.woundedRecovering > 10000 && s.military.troopShortage,
    planReport: () => ({
      speaker: "관우",
      plan: "부상병 회복 대기, 전력 재편",
    }),
    variations: [
      { dialogue: "부상병이 복귀할 때까지 전투를 삼가고 재정비하겠소.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_guan_rest_after_defeat",
    advisor: "관우",
    priority: 46,
    condition: (s) => s.strategic.recentBattleLost && s.military.troopShortage,
    planReport: () => ({
      speaker: "관우",
      plan: "패전 후 전력 재건",
    }),
    variations: [
      { dialogue: "패전의 상처를 치유하고 다시 일어서겠소.", emotion: "thoughtful" },
      { dialogue: "지금은 칼을 갈 때요. 반드시 설욕하겠소.", emotion: "angry" },
    ],
  },

  // ─── 조합 계획 ───

  {
    id: "p3_guan_recruit_and_train",
    advisor: "관우",
    priority: 43,
    condition: (s) => s.military.troopShortage && s.military.lowTraining &&
      s.economy.ip >= 20 + TRAIN_IP_COST,
    planReport: (s) => {
      const recruitIp = 20;
      const troops = recruitIp * RECRUIT_TROOPS_PER_IP;
      const totalIp = recruitIp + TRAIN_IP_COST;
      return {
        speaker: "관우",
        plan: `모병과 훈련 병행 (내정포인트 ${totalIp} 소비)`,
        expected_points: { ip_delta: -totalIp, mp_troops_delta: troops, mp_training_delta: 0.05 },
      };
    },
    variations: [
      {
        dialogue: (s) => {
          const troops = 20 * RECRUIT_TROOPS_PER_IP;
          return `모병과 훈련을 병행하겠소. (내정포인트 ${20 + TRAIN_IP_COST} 소비, 군사포인트(병력) +${troops}, 훈련도 +5%)`;
        },
        emotion: "calm",
      },
    ],
  },

  // ─── 안정 시 ───

  {
    id: "p3_guan_maintain",
    advisor: "관우",
    priority: 10,
    condition: (s) => !s.military.troopShortage && !s.military.lowTraining && !s.military.lowMorale,
    planReport: () => ({
      speaker: "관우",
      plan: "현 전력 유지, 상시 경계",
    }),
    variations: [
      { dialogue: "현 전력을 유지하며 적의 움직임을 주시하겠소.", emotion: "calm" },
      { dialogue: "특별한 조치 없이 경계를 이어가겠소.", emotion: "calm" },
    ],
  },
  {
    id: "p3_guan_scout",
    advisor: "관우",
    priority: 15,
    condition: (s) => s.strategic.adjacentEnemyCastles.length > 0 &&
      !s.military.troopShortage && !s.military.lowTraining,
    planReport: () => ({
      speaker: "관우",
      plan: "적 동향 정찰 및 출격 기회 탐색",
    }),
    variations: [
      { dialogue: "정찰을 강화하여 적의 허점을 찾겠소.", emotion: "thoughtful" },
      { dialogue: "적의 움직임을 면밀히 살피겠소. 기회가 오면 놓치지 않겠소.", emotion: "calm" },
    ],
  },

  // ─── 추가 관우 계획 ───

  {
    id: "p3_guan_elite_assault",
    advisor: "관우",
    priority: 44,
    condition: (s) => s.military.maxTraining && s.military.troopsAdequate &&
      s.strategic.weakestEnemy !== null && s.military.mp > s.strategic.weakestEnemy.mp,
    planReport: (s) => ({
      speaker: "관우",
      plan: `정예 병력으로 ${s.strategic.weakestEnemy!.name} 기습 공격`,
    }),
    variations: [
      {
        dialogue: (s) => `수는 적어도 정예요. 기습으로 ${s.strategic.weakestEnemy!.name}을 제압하겠소!`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "p3_guan_fortify_after_wound",
    advisor: "관우",
    priority: 55,
    condition: (s) => s.military.woundedRecovering > 15000 && !s.strategic.enemyNearCapital,
    planReport: () => ({
      speaker: "관우",
      plan: "부상병 회복 중 — 수비 강화로 전력 재건",
    }),
    variations: [
      {
        dialogue: (s) => `부상병 ${Math.round(s.military.woundedRecovering / 10000)}만이 치료 중이오. 이 기간은 수비에 집중하겠소.`,
        emotion: "worried",
      },
      { dialogue: "부상병이 복귀할 때까지 전선을 굳게 지키겠소.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_guan_small_elite_defense",
    advisor: "관우",
    priority: 36,
    condition: (s) => s.military.troopShortage && s.military.highTraining && s.military.highMorale,
    planReport: () => ({
      speaker: "관우",
      plan: "소수정예 방어선 구축 — 훈련+사기 활용",
      expected_points: { mp_morale_delta: 0.02 },
    }),
    variations: [
      { dialogue: "수는 적으나 정예로 방어선을 굳히겠소. 한 명이 열 명 몫을 하겠소.", emotion: "calm" },
    ],
  },
  {
    id: "p3_guan_win_streak_push",
    advisor: "관우",
    priority: 47,
    condition: (s) => s.strategic.consecutiveWins >= 2 && s.military.troopsAdequate,
    planReport: () => ({
      speaker: "관우",
      plan: "연승 기세 이어가기 — 추가 공세",
    }),
    variations: [
      {
        dialogue: (s) => `${s.strategic.consecutiveWins}연승의 기세로 밀어붙이겠소! 물러서지 않겠소.`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "p3_guan_morale_rebuild",
    advisor: "관우",
    priority: 53,
    condition: (s) => s.strategic.recentBattleLost && s.military.lowMorale,
    planReport: () => ({
      speaker: "관우",
      plan: "사기 회복 + 전력 재건",
      expected_points: { mp_morale_delta: 0.05 },
    }),
    variations: [
      { dialogue: "패배 후 병사들이 풀이 죽었소. 사기부터 올리겠소. (사기 +5% 예상)", emotion: "angry" },
      { dialogue: "설욕의 날을 위해 사기와 전력을 회복하겠소. (사기 +5% 예상)", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_guan_three_front_concentration",
    advisor: "관우",
    priority: 54,
    condition: (s) => s.strategic.adjacentEnemyCastles.length >= 3,
    planReport: () => ({
      speaker: "관우",
      plan: "다전선 — 핵심 방어선 집중 수비",
      expected_points: { mp_morale_delta: 0.02 },
    }),
    variations: [
      {
        dialogue: (s) => `전선이 ${s.strategic.adjacentEnemyCastles.length}곳이오. 전력을 분산하지 말고 핵심만 지킵시다.`,
        emotion: "worried",
      },
    ],
  },
  {
    id: "p3_guan_train_before_attack",
    advisor: "관우",
    priority: 42,
    condition: (s) => s.strategic.nearEnemyCapital && s.military.lowTraining && s.economy.ip >= TRAIN_IP_COST,
    planReport: () => ({
      speaker: "관우",
      plan: `훈련 후 적 본성 공략 (내정포인트 ${TRAIN_IP_COST} 소비)`,
      expected_points: { ip_delta: -TRAIN_IP_COST, mp_training_delta: 0.05 },
    }),
    variations: [
      { dialogue: "적 본성이 가깝지만 훈련이 부족하오. 한 번 갈고 닦은 뒤 공략하겠소. (훈련도 +5%)", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_guan_train_at_cap",
    advisor: "관우",
    priority: 27,
    condition: (s) => s.military.troopsAtCap && s.economy.ip >= TRAIN_IP_COST && !s.military.maxTraining,
    planReport: () => ({
      speaker: "관우",
      plan: `병력 상한 도달 — 훈련 집중 (내정포인트 ${TRAIN_IP_COST} 소비)`,
      expected_points: { ip_delta: -TRAIN_IP_COST, mp_training_delta: 0.05 },
    }),
    variations: [
      { dialogue: "군사포인트(병력)을 더 늘릴 수 없소. 훈련도를 올려 질적으로 강화하겠소. (훈련도 +5%)", emotion: "calm" },
    ],
  },
  {
    id: "p3_guan_late_all_in",
    advisor: "관우",
    priority: 40,
    condition: (s) => s.gamePhase === "late" && s.military.troopsAbundant && !s.strategic.enemyNearCapital,
    planReport: () => ({
      speaker: "관우",
      plan: "후반 결전 — 총공세 준비",
    }),
    variations: [
      { dialogue: "이제 결말을 낼 때요. 총공세를 감행하겠소!", emotion: "excited" },
      { dialogue: "후반전이오. 이 관우, 한 번에 승부를 내겠소!", emotion: "excited" },
    ],
  },
  {
    id: "p3_guan_steady_midgame",
    advisor: "관우",
    priority: 14,
    condition: (s) => s.gamePhase === "mid" && !s.military.troopShortage && !s.military.lowTraining && !s.strategic.enemyNearCapital,
    planReport: () => ({
      speaker: "관우",
      plan: "중반 전력 안정 유지 — 기회 탐색",
    }),
    variations: [
      { dialogue: "지금은 힘을 비축하면서 적의 허점을 노리겠소.", emotion: "calm" },
      { dialogue: "당장 전투보다는 내실을 다지겠소. 기회가 오면 바로 치겠소.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_guan_overwhelming_attack",
    advisor: "관우",
    priority: 45,
    condition: (s) => s.strategic.weakestEnemy !== null &&
      s.military.mp >= s.strategic.weakestEnemy.mp * 2 && s.strategic.adjacentEnemyCastles.length > 0,
    planReport: (s) => ({
      speaker: "관우",
      plan: `압도적 전력으로 ${s.strategic.weakestEnemy!.name} 대규모 공략`,
    }),
    variations: [
      {
        dialogue: (s) => `우리 병력이 ${s.strategic.weakestEnemy!.name}의 두 배요! 압도적으로 쓸어버리겠소!`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "p3_guan_counter_attack",
    advisor: "관우",
    priority: 50,
    condition: (s) => s.strategic.recentInvasion && !s.strategic.recentCastleLost && s.military.troopsAdequate,
    planReport: () => ({
      speaker: "관우",
      plan: "침공 격퇴 후 반격 작전",
    }),
    variations: [
      { dialogue: "막아냈으니 이제 반격이오! 역습으로 기세를 되돌리겠소.", emotion: "excited" },
      { dialogue: "침공을 격퇴했소. 이 기회에 반격하겠소!", emotion: "excited" },
    ],
  },
  {
    id: "p3_guan_early_foundation",
    advisor: "관우",
    priority: 20,
    condition: (s) => s.gamePhase === "early" && s.economy.ip >= 10,
    planReport: (s) => {
      const ipToSpend = Math.min(s.economy.ip, 10);
      const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
      return {
        speaker: "관우",
        plan: `초반 병력 기반 구축 (내정포인트 ${ipToSpend} 소비)`,
        expected_points: { ip_delta: -ipToSpend, mp_troops_delta: troops },
      };
    },
    variations: [
      { dialogue: "초반부터 군사포인트(병력)을 갖춰야 적이 얕보지 않소. 기초 모병을 실시하겠소.", emotion: "calm" },
    ],
  },

  // ─── 군사력 → 내정 전환 ───

  {
    id: "p3_guan_bandit_suppression",
    advisor: "관우",
    priority: 32,
    condition: (s) =>
      (s.military.troopsAdequate || s.military.troopsAbundant) &&
      s.economy.ipLow &&
      !s.strategic.recentBattle,
    planReport: () => ({
      speaker: "관우",
      plan: "산적 토벌 — 치안 회복 (군사포인트(병력) 300 소모, 내정포인트 +20)",
      expected_points: { mp_troops_delta: -300, ip_delta: 20 },
    }),
    variations: [
      { dialogue: "영내 산적을 토벌하여 백성의 민심을 얻겠소! 군사포인트(병력) 300을 투입하면 세수가 20 늘 것이오.", emotion: "excited" },
      { dialogue: "산적 무리가 치안을 어지럽히고 있소. 이 관우가 직접 정리하겠소. (군사포인트(병력) 300 소모, 내정포인트 +20)", emotion: "calm" },
      { dialogue: "도적 떼를 쓸어내면 상인들이 돌아올 것이오. 소규모 군사포인트(병력)으로 충분하오.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_guan_bandit_suppression_abundant",
    advisor: "관우",
    priority: 28,
    condition: (s) =>
      s.military.troopsAbundant &&
      s.economy.ipAdequate &&
      !s.strategic.recentBattle,
    planReport: () => ({
      speaker: "관우",
      plan: "산적 토벌 — 잉여 병력 활용 (군사포인트(병력) 300 소모, 내정포인트 +20)",
      expected_points: { mp_troops_delta: -300, ip_delta: 20 },
    }),
    variations: [
      { dialogue: "군사포인트(병력)이 남아도니 산적 토벌에 쓰겠소. 군사포인트(병력) 300으로 내정포인트 20을 벌 수 있소.", emotion: "calm" },
    ],
  },

  // ─── 포인트 전환 ───

  {
    id: "p3_guan_show_of_force_dp",
    advisor: "관우",
    priority: 27,
    condition: (s) => s.diplomacy.dpLow && (s.military.troopsAdequate || s.military.troopsAbundant),
    planReport: () => ({
      speaker: "관우",
      plan: "군사 시위 외교 (군사포인트(병력) 500 소모, 외교포인트 +1)",
      expected_points: { mp_troops_delta: -500, dp_delta: 1 },
    }),
    variations: [
      { dialogue: "힘을 보여주는 것도 외교요. 군사포인트(병력) 500을 시위에 투입하면 외교포인트를 얻을 수 있소.", emotion: "calm" },
      { dialogue: "군사포인트(병력)을 과시하면 적국도 함부로 대하지 못할 것이오. 군사 시위로 외교포인트를 확보하겠소.", emotion: "excited" },
    ],
  },
  {
    id: "p3_guan_hire_mercenary",
    advisor: "관우",
    priority: 33,
    condition: (s) => s.military.troopShortage && s.diplomacy.dpAdequate,
    planReport: () => ({
      speaker: "관우",
      plan: "용병 고용 (외교포인트 2 소모, 군사포인트(병력) +5000)",
      expected_points: { dp_delta: -2, mp_troops_delta: 5000 },
    }),
    variations: [
      { dialogue: "군사포인트(병력)이 부족하오! 외교포인트 2로 용병 5000을 즉시 확보하겠소.", emotion: "angry" },
      { dialogue: "모병이 느리니 외교포인트를 써서 용병을 고용하겠소. (외교포인트 2 소모, 군사포인트(병력) +5000)", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_guan_reward_soldiers",
    advisor: "관우",
    priority: 25,
    condition: (s) => s.military.lowMorale && s.economy.ipAdequate,
    planReport: () => ({
      speaker: "관우",
      plan: "병사 포상 — 사기 진작 (내정포인트 15 소모, 군사 사기 +0.1)",
      expected_points: { ip_delta: -15, mp_morale_delta: 0.1 },
    }),
    variations: [
      { dialogue: "병사들의 사기가 꺾였소. 내정포인트 15로 포상을 내려 사기를 올리겠소.", emotion: "worried" },
      { dialogue: "전투력은 사기에서 나오오. 포상으로 병사들의 마음을 다잡겠소.", emotion: "thoughtful" },
    ],
  },
];

// =====================================================================
//  미축 (내정) 계획 — 33개
// =====================================================================

export const MI_PHASE3_CASES: Phase3CaseDefinition[] = [
  // ─── 시장 건설 ───

  {
    id: "p3_mi_build_market_first",
    advisor: "미축",
    priority: 60,
    condition: (s) => s.economy.marketLv === 0 && s.economy.ip >= getFacilityUpgradeCost(0),
    planReport: () => {
      const cost = getFacilityUpgradeCost(0);
      return {
        speaker: "미축",
        plan: `시장 건설 (내정포인트 ${cost} 소비)`,
        expected_points: { ip_delta: -cost },
        facility_upgrades: [{ type: "market", levels: 1 }],
      };
    },
    variations: [
      {
        dialogue: () => `시장을 건설하겠습니다. (내정포인트 ${getFacilityUpgradeCost(0)} 소비, 턴당 수입 +3)`,
        emotion: "calm",
      },
      {
        dialogue: () => `시장 건설이 최우선입니다. (내정포인트 ${getFacilityUpgradeCost(0)} 소비, 턴당 수입 +3)`,
        emotion: "thoughtful",
      },
    ],
  },
  {
    id: "p3_mi_expand_market",
    advisor: "미축",
    priority: 40,
    condition: (s) => s.economy.marketLv > 0 && s.economy.marketLv < 5 &&
      s.economy.ip >= getFacilityUpgradeCost(s.economy.marketLv) && !s.economy.facilityImbalance,
    planReport: (s) => {
      const cost = getFacilityUpgradeCost(s.economy.marketLv);
      return {
        speaker: "미축",
        plan: `시장 확장 Lv${s.economy.marketLv}→${s.economy.marketLv + 1} (내정포인트 ${cost} 소비)`,
        expected_points: { ip_delta: -cost },
        facility_upgrades: [{ type: "market", levels: 1 }],
      };
    },
    variations: [
      {
        dialogue: (s) => `시장을 확장하겠습니다. (내정포인트 ${getFacilityUpgradeCost(s.economy.marketLv)} 소비, 턴당 수입 +3)`,
        emotion: "calm",
      },
      {
        dialogue: (s) => `시장을 Lv${s.economy.marketLv + 1}로 올리면 턴당 수입이 3 늘어납니다. (내정포인트 ${getFacilityUpgradeCost(s.economy.marketLv)} 소비)`,
        emotion: "calm",
      },
    ],
  },

  // ─── 논 건설 ───

  {
    id: "p3_mi_build_farm_first",
    advisor: "미축",
    priority: 45,
    condition: (s) => s.economy.farmLv === 0 && s.economy.marketLv >= 2 &&
      s.economy.ip >= getFacilityUpgradeCost(0),
    planReport: () => {
      const cost = getFacilityUpgradeCost(0);
      return {
        speaker: "미축",
        plan: `논 건설 (내정포인트 ${cost} 소비)`,
        expected_points: { ip_delta: -cost },
        facility_upgrades: [{ type: "farm", levels: 1 }],
      };
    },
    variations: [
      {
        dialogue: () => `논을 건설하겠습니다. (내정포인트 ${getFacilityUpgradeCost(0)} 소비, 턴당 수입 +2)`,
        emotion: "thoughtful",
      },
    ],
  },
  {
    id: "p3_mi_expand_farm",
    advisor: "미축",
    priority: 38,
    condition: (s) => s.economy.farmLv > 0 && s.economy.farmLv < s.economy.marketLv &&
      s.economy.ip >= getFacilityUpgradeCost(s.economy.farmLv),
    planReport: (s) => {
      const cost = getFacilityUpgradeCost(s.economy.farmLv);
      return {
        speaker: "미축",
        plan: `논 확장 Lv${s.economy.farmLv}→${s.economy.farmLv + 1} (내정포인트 ${cost} 소비)`,
        expected_points: { ip_delta: -cost },
        facility_upgrades: [{ type: "farm", levels: 1 }],
      };
    },
    variations: [
      {
        dialogue: (s) => `논을 확장하겠습니다. (내정포인트 ${getFacilityUpgradeCost(s.economy.farmLv)} 소비, 턴당 수입 +2)`,
        emotion: "calm",
      },
    ],
  },

  // ─── 은행 건설 ───

  {
    id: "p3_mi_build_bank",
    advisor: "미축",
    priority: 48,
    condition: (s) => s.economy.bankLv === 0 && s.economy.ipNearCap &&
      s.economy.marketLv >= 2 && s.economy.ip >= getFacilityUpgradeCost(0),
    planReport: () => {
      const cost = getFacilityUpgradeCost(0);
      return {
        speaker: "미축",
        plan: `은행 건설 (내정포인트 ${cost} 소비)`,
        expected_points: { ip_delta: -cost },
        facility_upgrades: [{ type: "bank", levels: 1 }],
      };
    },
    variations: [
      {
        dialogue: () => `은행을 건설하겠습니다. (내정포인트 ${getFacilityUpgradeCost(0)} 소비, 상한 +50)`,
        emotion: "thoughtful",
      },
      {
        dialogue: () => `은행 건설이 급합니다. (내정포인트 ${getFacilityUpgradeCost(0)} 소비, 상한 +50)`,
        emotion: "worried",
      },
    ],
  },
  {
    id: "p3_mi_expand_bank",
    advisor: "미축",
    priority: 36,
    condition: (s) => s.economy.bankLv > 0 && s.economy.bankLv < 3 &&
      s.economy.ipNearCap && s.economy.ip >= getFacilityUpgradeCost(s.economy.bankLv),
    planReport: (s) => {
      const cost = getFacilityUpgradeCost(s.economy.bankLv);
      return {
        speaker: "미축",
        plan: `은행 확장 Lv${s.economy.bankLv}→${s.economy.bankLv + 1} (내정포인트 ${cost} 소비)`,
        expected_points: { ip_delta: -cost },
        facility_upgrades: [{ type: "bank", levels: 1 }],
      };
    },
    variations: [
      {
        dialogue: (s) => `은행을 확장하겠습니다. (내정포인트 ${getFacilityUpgradeCost(s.economy.bankLv)} 소비, 상한 +50)`,
        emotion: "calm",
      },
    ],
  },

  // ─── 긴축 / 비축 ───

  {
    id: "p3_mi_austerity",
    advisor: "미축",
    priority: 55,
    condition: (s) => s.economy.ipCritical && !s.economy.canUpgrade,
    planReport: () => ({
      speaker: "미축",
      plan: "긴축 재정 — 불필요한 지출 동결",
    }),
    variations: [
      { dialogue: "지출을 최소화하고 내정포인트 회복에 집중하겠습니다.", emotion: "worried" },
      { dialogue: "허리띠를 졸라매야 합니다. 긴축에 들어갑시다.", emotion: "worried" },
    ],
  },
  {
    id: "p3_mi_save_for_facility",
    advisor: "미축",
    priority: 35,
    condition: (s) => {
      const targetCost = getFacilityUpgradeCost(Math.min(s.economy.marketLv, s.economy.farmLv));
      return s.economy.ip >= 15 && s.economy.ip < targetCost &&
        (s.economy.marketLv < 3 || s.economy.farmLv < 2);
    },
    planReport: (s) => {
      const targetCost = getFacilityUpgradeCost(Math.min(s.economy.marketLv, s.economy.farmLv));
      return {
        speaker: "미축",
        plan: `내정포인트 비축 (현재 ${s.economy.ip}/${targetCost} 목표)`,
      };
    },
    variations: [
      {
        dialogue: (s) => {
          const targetCost = getFacilityUpgradeCost(Math.min(s.economy.marketLv, s.economy.farmLv));
          return `시설 건설비 ${targetCost}까지 ${targetCost - s.economy.ip} 부족합니다. 비축하겠습니다.`;
        },
        emotion: "calm",
      },
    ],
  },
  {
    id: "p3_mi_save_for_recruit",
    advisor: "미축",
    priority: 32,
    condition: (s) => s.military.troopShortage && s.economy.ip < 10,
    planReport: () => ({
      speaker: "미축",
      plan: "모병 자금 확보를 위한 비축",
    }),
    variations: [
      { dialogue: "모병 자금이 부족하니 우선 비축에 집중하겠습니다.", emotion: "thoughtful" },
    ],
  },

  // ─── 투자 ───

  {
    id: "p3_mi_invest_balanced",
    advisor: "미축",
    priority: 30,
    condition: (s) => s.economy.ipRich && s.economy.canUpgrade &&
      s.economy.marketLv < 5 && s.economy.farmLv < 5,
    planReport: (s) => {
      const cost = getFacilityUpgradeCost(s.economy.marketLv);
      return {
        speaker: "미축",
        plan: "시설 균형 투자",
        expected_points: { ip_delta: -cost },
      };
    },
    variations: [
      { dialogue: "여유 자금으로 시설을 균형 있게 확장하겠습니다.", emotion: "calm" },
      { dialogue: "수입 기반을 넓혀 장기적 성장을 도모하겠습니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_mi_wartime_economy",
    advisor: "미축",
    priority: 44,
    condition: (s) => s.strategic.recentBattle && s.economy.ipLow,
    planReport: () => ({
      speaker: "미축",
      plan: "전시 경제 체제 — 재건 우선",
    }),
    variations: [
      { dialogue: "전쟁 피해 복구에 자원을 집중하겠습니다.", emotion: "worried" },
      { dialogue: "전시 경제 체제로 전환합니다. 재건이 급선무입니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_mi_maximize_income",
    advisor: "미축",
    priority: 25,
    condition: (s) => s.economy.lowIncome && s.economy.canUpgrade,
    planReport: (s) => {
      const cost = getFacilityUpgradeCost(s.economy.marketLv);
      return {
        speaker: "미축",
        plan: "수입 극대화 — 시장/논 집중 투자",
        expected_points: { ip_delta: -cost },
      };
    },
    variations: [
      { dialogue: "수입이 적으니 시설 투자로 수입을 올리는 게 우선입니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_mi_post_castle_setup",
    advisor: "미축",
    priority: 42,
    condition: (s) => s.strategic.recentCastleGained,
    planReport: (s) => {
      const cost = getFacilityUpgradeCost(0);
      return {
        speaker: "미축",
        plan: s.economy.canUpgrade
          ? `신규 성채 경제 기반 구축 (내정포인트 ${cost} 소비)`
          : `신규 성채 투자 준비 (자금 비축 중, ${s.economy.ip}/${cost})`,
        expected_points: s.economy.canUpgrade ? { ip_delta: -cost } : undefined,
      };
    },
    variations: [
      { dialogue: "새 영토의 경제 기반을 서둘러 구축하겠습니다.", emotion: "excited" },
      {
        dialogue: (s) => s.economy.canUpgrade
          ? "새 성채에 즉시 시설을 건설하겠습니다!"
          : `새 성채 투자를 위해 자금을 더 모아야 합니다. (필요 ${getFacilityUpgradeCost(0)}) 비축에 집중하겠습니다.`,
        emotion: "thoughtful",
      },
    ],
  },

  // ─── 전쟁 보급 ───

  {
    id: "p3_mi_war_supply",
    advisor: "미축",
    priority: 46,
    condition: (s) => s.strategic.nearEnemyCapital && !s.economy.ipLow,
    planReport: (s) => ({
      speaker: "미축",
      plan: `전쟁 보급 체제 유지 (현재 내정포인트 ${s.economy.ip})`,
    }),
    variations: [
      { dialogue: "전쟁 보급에 차질 없도록 하겠습니다. 자금은 충분합니다!", emotion: "excited" },
      { dialogue: "관우 장군의 출격에 필요한 자금을 확보해 두겠습니다.", emotion: "calm" },
      { dialogue: "전비 지출에 대비하여 비축분을 유지하겠습니다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_mi_support_recruit",
    advisor: "미축",
    priority: 52,
    condition: (s) => s.military.troopsCritical && s.economy.ip < 10,
    planReport: (s) => ({
      speaker: "미축",
      plan: `모병 자금 긴급 확보 (현재 ${s.economy.ip}/10)`,
    }),
    variations: [
      { dialogue: "관우 장군이 모병 자금을 요청하셨습니다. 최소 내정포인트 10을 최우선으로 확보하겠습니다!", emotion: "worried" },
      {
        dialogue: (s) => `내정포인트 ${10 - s.economy.ip}만 더 모으면 모병 가능합니다. 서두르겠습니다.`,
        emotion: "thoughtful",
      },
    ],
  },

  // ─── 안정 시 ───

  {
    id: "p3_mi_maintain",
    advisor: "미축",
    priority: 8,
    condition: () => true,
    planReport: (s) => ({
      speaker: "미축",
      plan: `현 시설 운영 유지 (매턴 +${s.economy.ipRegen})`,
    }),
    variations: [
      { dialogue: "현재 시설 운영을 유지하겠습니다. 안정적입니다.", emotion: "calm" },
      { dialogue: "무리한 투자 없이 현 수입을 유지하겠습니다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_mi_efficiency",
    advisor: "미축",
    priority: 12,
    condition: (s) => s.economy.ipAdequate && !s.economy.canUpgrade,
    planReport: () => ({
      speaker: "미축",
      plan: "효율적 자원 운영",
    }),
    variations: [
      { dialogue: "투자 여력이 부족하니 효율적으로 운영하겠습니다.", emotion: "calm" },
    ],
  },

  // ─── 추가 미축 계획 ───

  {
    id: "p3_mi_market_priority",
    advisor: "미축",
    priority: 42,
    condition: (s) => s.economy.farmLv === 0 && s.economy.marketLv < 2 &&
      s.economy.ip >= getFacilityUpgradeCost(0),
    planReport: () => {
      const cost = getFacilityUpgradeCost(0);
      return {
        speaker: "미축",
        plan: `시장 우선 건설 (내정포인트 ${cost} 소비)`,
        expected_points: { ip_delta: -cost },
        facility_upgrades: [{ type: "market", levels: 1 }],
      };
    },
    variations: [
      {
        dialogue: () => `먼저 시장을 지어 수입을 만들겠습니다. (내정포인트 ${getFacilityUpgradeCost(0)} 소비)`,
        emotion: "calm",
      },
    ],
  },
  {
    id: "p3_mi_double_invest",
    advisor: "미축",
    priority: 38,
    condition: (s) => s.economy.ipAtCap && s.economy.canUpgrade &&
      s.economy.marketLv < 5 && s.economy.farmLv < 5,
    planReport: (s) => {
      const cost1 = getFacilityUpgradeCost(s.economy.marketLv);
      const cost2 = getFacilityUpgradeCost(s.economy.farmLv);
      const total = cost1 + cost2;
      return {
        speaker: "미축",
        plan: `내정포인트 만충 — 시장+논 동시 투자 (${total} 소비)`,
        expected_points: { ip_delta: -total },
        facility_upgrades: [{ type: "market", levels: 1 }, { type: "farm", levels: 1 }],
      };
    },
    variations: [
      { dialogue: "내정포인트가 가득 찼습니다! 시장과 논을 동시에 확장하겠습니다.", emotion: "excited" },
    ],
  },
  {
    id: "p3_mi_early_setup",
    advisor: "미축",
    priority: 28,
    condition: (s) => s.gamePhase === "early" && s.economy.noFacilities && s.economy.ip >= getFacilityUpgradeCost(0),
    planReport: () => {
      const cost = getFacilityUpgradeCost(0);
      return {
        speaker: "미축",
        plan: `초반 내정 기반 — 시장 건설 (내정포인트 ${cost} 소비)`,
        expected_points: { ip_delta: -cost },
        facility_upgrades: [{ type: "market", levels: 1 }],
      };
    },
    variations: [
      { dialogue: "초반 시설 건설이 최우선입니다. 시장부터 세우겠습니다!", emotion: "calm" },
    ],
  },
  {
    id: "p3_mi_bank_after_balance",
    advisor: "미축",
    priority: 45,
    condition: (s) => s.economy.bankLv === 0 && !s.economy.facilityImbalance &&
      s.economy.marketLv >= 2 && s.economy.farmLv >= 2 && s.economy.ip >= getFacilityUpgradeCost(0),
    planReport: () => {
      const cost = getFacilityUpgradeCost(0);
      return {
        speaker: "미축",
        plan: `시장·논 균형 완성 — 이제 은행 건설 (내정포인트 ${cost} 소비)`,
        expected_points: { ip_delta: -cost },
        facility_upgrades: [{ type: "bank", levels: 1 }],
      };
    },
    variations: [
      { dialogue: "시장과 논이 균형을 맞췄습니다. 이제 은행을 지어 상한을 올리겠습니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_mi_maintain_max",
    advisor: "미축",
    priority: 22,
    condition: (s) => s.economy.marketLv >= 5 && s.economy.farmLv >= 5,
    planReport: (s) => ({
      speaker: "미축",
      plan: `최고 시설 유지 — 매턴 내정포인트 +${s.economy.ipRegen} 고정`,
    }),
    variations: [
      { dialogue: "시설이 최고 수준입니다. 안정적인 수입을 계속 유지하겠습니다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_mi_recruit_support",
    advisor: "미축",
    priority: 50,
    condition: (s) => s.military.troopShortage && s.economy.ip >= 10 && !s.military.troopsCritical,
    planReport: (s) => {
      const ipToSpend = Math.min(s.economy.ip, 20);
      const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
      return {
        speaker: "미축",
        plan: `관우 장군 모병 지원 (내정포인트 ${ipToSpend} 제공)`,
        expected_points: { ip_delta: -ipToSpend, mp_troops_delta: troops },
      };
    },
    variations: [
      {
        dialogue: (s) => {
          const ipToSpend = Math.min(s.economy.ip, 20);
          const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
          return `관우 장군 모병을 지원하겠습니다. (내정포인트 ${ipToSpend} 소비, 병력 +${troops})`;
        },
        emotion: "calm",
      },
    ],
  },
  {
    id: "p3_mi_train_support",
    advisor: "미축",
    priority: 47,
    condition: (s) => s.military.lowTraining && !s.military.troopsCritical && s.economy.ip >= TRAIN_IP_COST,
    planReport: () => ({
      speaker: "미축",
      plan: `관우 장군 훈련 지원 (내정포인트 ${TRAIN_IP_COST} 제공)`,
      expected_points: { ip_delta: -TRAIN_IP_COST, mp_training_delta: 0.05 },
    }),
    variations: [
      { dialogue: "관우 장군의 훈련을 지원하겠습니다. (내정포인트 15 소비, 훈련도 +5%)", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_mi_prebattle_reserve",
    advisor: "미축",
    priority: 44,
    condition: (s) => s.strategic.nearEnemyCapital && s.economy.ipAdequate,
    planReport: (s) => ({
      speaker: "미축",
      plan: `결전 비축 — 내정포인트 ${s.economy.ip} 전투 지원 대기`,
    }),
    variations: [
      { dialogue: "결전을 앞두고 자금을 비축하겠습니다. 관우 장군이 필요할 때 쓰시옵소서.", emotion: "calm" },
    ],
  },
  {
    id: "p3_mi_rebuild",
    advisor: "미축",
    priority: 56,
    condition: (s) => s.strategic.recentCastleLost && s.economy.canUpgrade,
    planReport: (s) => {
      const cost = getFacilityUpgradeCost(s.economy.marketLv);
      return {
        speaker: "미축",
        plan: `성채 손실 후 경제 재건 (내정포인트 ${cost} 소비)`,
        expected_points: { ip_delta: -cost },
      };
    },
    variations: [
      { dialogue: "성채를 잃었지만 경제 기반부터 다시 쌓겠습니다.", emotion: "worried" },
      { dialogue: "손실을 극복하려면 먼저 수입을 늘려야 합니다. 시설에 투자하겠습니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_mi_income_boost",
    advisor: "미축",
    priority: 34,
    condition: (s) => s.economy.lowIncome && s.economy.ip >= getFacilityUpgradeCost(s.economy.marketLv),
    planReport: (s) => {
      const cost = getFacilityUpgradeCost(s.economy.marketLv);
      return {
        speaker: "미축",
        plan: `수입 증대 — 시장 확장 (내정포인트 ${cost} 소비)`,
        expected_points: { ip_delta: -cost },
        facility_upgrades: [{ type: "market", levels: 1 }],
      };
    },
    variations: [
      { dialogue: "수입이 적으니 시장을 먼저 키워 수입을 올리겠습니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_mi_bank_fully_built",
    advisor: "미축",
    priority: 20,
    condition: (s) => s.economy.bankLv >= 3 && !s.economy.ipNearCap,
    planReport: (s) => ({
      speaker: "미축",
      plan: `은행 완비 — 상한 ${s.economy.ipCap}, 현재 ${s.economy.ip}/${s.economy.ipCap}`,
    }),
    variations: [
      { dialogue: "은행이 완비되어 있습니다. 넉넉히 비축할 수 있습니다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_mi_surplus_to_military",
    advisor: "미축",
    priority: 26,
    condition: (s) => s.economy.marketLv >= 5 && s.economy.farmLv >= 5 &&
      s.economy.ipRich && s.military.troopShortage,
    planReport: (s) => {
      const ipToSpend = Math.min(s.economy.ip, 30);
      const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
      return {
        speaker: "미축",
        plan: `잉여 내정포인트 군사 전용 (${ipToSpend} 소비)`,
        expected_points: { ip_delta: -ipToSpend, mp_troops_delta: troops },
      };
    },
    variations: [
      {
        dialogue: (s) => {
          const ipToSpend = Math.min(s.economy.ip, 30);
          const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
          return `시설이 완비됐으니 잉여 자금을 모병에 쓰겠습니다. (내정포인트 ${ipToSpend} 소비, 병력 +${troops})`;
        },
        emotion: "excited",
      },
    ],
  },
  {
    id: "p3_mi_castle_loss_austerity",
    advisor: "미축",
    priority: 54,
    condition: (s) => s.strategic.recentCastleLost && !s.economy.canUpgrade,
    planReport: () => ({
      speaker: "미축",
      plan: "성채 손실 후 긴축 — 자금 비축 우선",
    }),
    variations: [
      { dialogue: "성채를 잃어 수입이 줄었습니다. 당분간 긴축하겠습니다.", emotion: "worried" },
    ],
  },

  // ─── 군사력 → 내정 전환 ───

  {
    id: "p3_mi_civil_support",
    advisor: "미축",
    priority: 30,
    condition: (s) =>
      s.economy.ipLow &&
      (s.military.troopsAdequate || s.military.troopsAbundant) &&
      !s.strategic.recentBattle,
    planReport: () => ({
      speaker: "미축",
      plan: "대민 지원 — 민심 안정 (군사포인트(병력) 100 소모, 내정포인트 +10)",
      expected_points: { mp_troops_delta: -100, ip_delta: 10 },
    }),
    variations: [
      { dialogue: "병사들을 백성 지원에 투입하겠습니다. 군사포인트(병력) 100을 써서 내정포인트 10을 확보할 수 있습니다.", emotion: "calm" },
      { dialogue: "군사력을 민정에 활용하면 민심도 얻고 세수도 늘어납니다. 대민 지원을 실시하겠습니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_mi_civil_support_peacetime",
    advisor: "미축",
    priority: 26,
    condition: (s) =>
      s.economy.ipAdequate &&
      s.military.troopsAbundant &&
      !s.strategic.recentBattle &&
      s.gamePhase === "mid",
    planReport: () => ({
      speaker: "미축",
      plan: "평시 대민 지원 — 잉여 병력 활용 (군사포인트(병력) 100 소모, 내정포인트 +10)",
      expected_points: { mp_troops_delta: -100, ip_delta: 10 },
    }),
    variations: [
      { dialogue: "평화로운 지금이 민심을 다질 최적의 시기입니다. 잉여 군사포인트(병력)으로 대민 지원을 진행하겠습니다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_mi_send_merchants",
    advisor: "미축",
    priority: 28,
    condition: (s) => s.economy.ipRich && s.diplomacy.dpLow,
    planReport: () => ({
      speaker: "미축",
      plan: "상인 파견 — 내정→외교 전환 (내정포인트 20 소모, 외교포인트 +2)",
      expected_points: { ip_delta: -20, dp_delta: 2 },
    }),
    variations: [
      { dialogue: "자금이 넉넉하니 상인을 인근 세력에 파견하겠습니다. 외교 채널이 열릴 것입니다. (내정포인트 20, 외교포인트 +2)", emotion: "thoughtful" },
      { dialogue: "내정포인트 20을 외교에 투자해 외교포인트 2를 확보하겠습니다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_mi_attract_trade",
    advisor: "미축",
    priority: 35,
    condition: (s) => s.economy.ipLow && s.diplomacy.dpRich,
    planReport: () => ({
      speaker: "미축",
      plan: "외교 채널 활용 무역 (외교포인트 1 소모, 내정포인트 +25)",
      expected_points: { dp_delta: -1, ip_delta: 25 },
    }),
    variations: [
      { dialogue: "외교 채널을 통해 무역을 유치하겠습니다. 외교포인트 1로 내정포인트 25를 확보할 수 있습니다.", emotion: "excited" },
      { dialogue: "좋은 관계를 이용해 교역로를 열겠습니다. 즉각적인 수입이 들어올 것입니다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_mi_establish_academy",
    advisor: "미축",
    priority: 22,
    condition: (s) => s.economy.ipRich && s.strategic.sp < 5,
    planReport: () => ({
      speaker: "미축",
      plan: "서원 운영 — 학문 투자 (내정포인트 25 소모, 전략포인트 +2)",
      expected_points: { ip_delta: -25, sp_delta: 2 },
    }),
    variations: [
      { dialogue: "자금을 학문에 투자하겠습니다. 내정포인트 25로 전략포인트 2를 얻을 수 있습니다.", emotion: "thoughtful" },
      { dialogue: "서원을 운영하면 인재가 모이고 전략적 식견이 넓어집니다.", emotion: "calm" },
    ],
  },
];

// =====================================================================
//  방통 (외교) 계획 — 27개
// =====================================================================

export const PANG_PHASE3_CASES: Phase3CaseDefinition[] = [
  // ─── 관계 개선 ───

  {
    id: "p3_pang_improve_cao",
    advisor: "방통",
    priority: 45,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      return !!cao && cao.isHostile && s.diplomacy.dp >= 2;
    },
    planReport: () => ({
      speaker: "방통",
      plan: "조조와 관계 개선 (외교포인트 2 소비)",
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      { dialogue: "조조에게 사신을 보내겠소. (외교포인트 2 소비)", emotion: "thoughtful" },
      { dialogue: "조조와의 관계를 개선하겠소. (외교포인트 2 소비)", emotion: "calm" },
    ],
  },
  {
    id: "p3_pang_improve_sun",
    advisor: "방통",
    priority: 45,
    condition: (s) => {
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!sun && sun.isHostile && s.diplomacy.dp >= 2;
    },
    planReport: () => ({
      speaker: "방통",
      plan: "손권과 관계 개선 (외교포인트 2 소비)",
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      { dialogue: "손권에게 화친을 제안하겠소. (외교포인트 2 소비)", emotion: "thoughtful" },
      { dialogue: "손권과 관계를 개선하겠소. (외교포인트 2 소비)", emotion: "calm" },
    ],
  },

  // ─── 이간책 ───

  {
    id: "p3_pang_divide",
    advisor: "방통",
    priority: 55,
    condition: (s) => s.diplomacy.enemiesFriendly && s.diplomacy.dp >= 3,
    planReport: () => ({
      speaker: "방통",
      plan: "적 간 이간책 실행 (외교포인트 3 소비)",
      expected_points: { dp_delta: -3 },
    }),
    variations: [
      { dialogue: "이간책을 실행하겠소! (외교포인트 3 소비)", emotion: "excited" },
      { dialogue: "이간계를 펼치겠소. (외교포인트 3 소비)", emotion: "excited" },
    ],
  },

  // ─── 동맹 ───

  {
    id: "p3_pang_alliance",
    advisor: "방통",
    priority: 48,
    condition: (s) => s.diplomacy.anyFriendly && !s.diplomacy.anyAllied && s.diplomacy.dp >= 3,
    planReport: () => ({
      speaker: "방통",
      plan: "우호 세력과 동맹 추진 (외교포인트 3 소비)",
      expected_points: { dp_delta: -3 },
    }),
    variations: [
      { dialogue: "정식 동맹을 추진하겠소! (외교포인트 3 소비)", emotion: "excited" },
      { dialogue: "동맹 체결을 추진하겠소. (외교포인트 3 소비)", emotion: "thoughtful" },
    ],
  },

  // ─── 전략적 외교 ───

  {
    id: "p3_pang_buy_time",
    advisor: "방통",
    priority: 50,
    condition: (s) => s.strategic.biggestThreat !== null &&
      s.strategic.biggestThreat.mp > s.military.mp * 2 && s.diplomacy.dp >= 2,
    planReport: () => ({
      speaker: "방통",
      plan: "강대 세력과 휴전 교섭 (외교포인트 2 소비)",
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      { dialogue: "외교로 시간을 벌겠소. (외교포인트 2 소비)", emotion: "thoughtful" },
      { dialogue: "외교적 완충을 마련하겠소. (외교포인트 2 소비)", emotion: "worried" },
    ],
  },
  {
    id: "p3_pang_pressure",
    advisor: "방통",
    priority: 42,
    condition: (s) => s.strategic.weakestEnemy !== null &&
      s.strategic.weakestEnemy.castles <= 3 && s.diplomacy.dp >= 2,
    planReport: (s) => ({
      speaker: "방통",
      plan: `${s.strategic.weakestEnemy!.name}에 외교적 압박`,
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      {
        dialogue: (s) => `${s.strategic.weakestEnemy!.name}이 약해졌소. 외교적으로 압박하여 굴복시킵시다.`,
        emotion: "excited",
      },
    ],
  },

  // ─── DP 관련 ───

  {
    id: "p3_pang_save_dp",
    advisor: "방통",
    priority: 30,
    condition: (s) => s.diplomacy.dpLow && !s.diplomacy.allHostile,
    planReport: () => ({
      speaker: "방통",
      plan: "외교포인트 비축 — 행동 자제",
    }),
    variations: [
      { dialogue: "외교 자원이 부족하니 비축하면서 기회를 기다리겠소.", emotion: "calm" },
    ],
  },
  {
    id: "p3_pang_convert_sp",
    advisor: "방통",
    priority: 35,
    condition: (s) => s.diplomacy.dpNone && s.strategic.sp >= 4 && s.diplomacy.allHostile,
    planReport: () => ({
      speaker: "방통",
      plan: "전략포인트를 외교포인트로 전환",
    }),
    variations: [
      { dialogue: "전략포인트를 외교에 전용하여 위기를 타개합시다.", emotion: "thoughtful" },
    ],
  },

  // ─── 위기 대응 ───

  {
    id: "p3_pang_crisis_no_dp",
    advisor: "방통",
    priority: 52,
    condition: (s) => s.diplomacy.dpNone && s.diplomacy.allHostile && s.strategic.sp < 4,
    planReport: () => ({
      speaker: "방통",
      plan: "외교포인트 긴급 확보 — 외교포인트 회복 대기",
    }),
    variations: [
      { dialogue: "외교포인트가 없어 당장은 손발이 묶였소. 하나 회복되는 즉시 외교에 나서겠소!", emotion: "worried" },
      { dialogue: "외교 자원이 바닥이오... 하나 포기하지 않겠소. 다음 턴을 기다립시다.", emotion: "worried" },
      { dialogue: "양면 적대에 외교력도 없으니 최악이오. 그래도 방도를 찾겠소.", emotion: "angry" },
    ],
  },
  {
    id: "p3_pang_survive_diplomacy",
    advisor: "방통",
    priority: 48,
    condition: (s) => s.diplomacy.allHostile && s.diplomacy.dpLow && !s.diplomacy.dpNone,
    planReport: () => ({
      speaker: "방통",
      plan: "제한된 외교 — 약한 적부터 관계 개선 시도",
      expected_points: { dp_delta: -1 },
    }),
    variations: [
      { dialogue: "외교 자원이 부족하나 한 곳이라도 관계를 풀어보겠소.", emotion: "thoughtful" },
      {
        dialogue: (s) => s.strategic.weakestEnemy
          ? `${s.strategic.weakestEnemy.name} 쪽에 조심스레 접근해 보겠소.`
          : "약한 쪽부터 접근하겠소. 어떤 성과라도 내보겠소.",
        emotion: "thoughtful",
      },
    ],
  },

  // ─── 복합 외교 ───

  {
    id: "p3_pang_multiplex",
    advisor: "방통",
    priority: 40,
    condition: (s) => s.diplomacy.dpRich && s.diplomacy.allHostile,
    planReport: () => ({
      speaker: "방통",
      plan: "다면 외교 — 양쪽 모두 관계 개선 시도",
      expected_points: { dp_delta: -4 },
    }),
    variations: [
      { dialogue: "외교포인트가 넉넉하니 양쪽 모두 접근하겠소.", emotion: "excited" },
    ],
  },
  {
    id: "p3_pang_maintain_ally",
    advisor: "방통",
    priority: 25,
    condition: (s) => s.diplomacy.anyAllied,
    planReport: () => ({
      speaker: "방통",
      plan: "동맹 관계 유지 및 강화",
    }),
    variations: [
      { dialogue: "동맹을 굳건히 유지하는 것이 중요하오.", emotion: "calm" },
    ],
  },

  // ─── 안정 시 ───

  {
    id: "p3_pang_observe",
    advisor: "방통",
    priority: 8,
    condition: () => true,
    planReport: () => ({
      speaker: "방통",
      plan: "외교 정세 관망",
    }),
    variations: [
      { dialogue: "당장 외교 행동은 삼가고 정세를 관망하겠소.", emotion: "calm" },
      { dialogue: "지금은 지켜보겠소. 기회가 오면 움직이겠소.", emotion: "calm" },
    ],
  },

  // ─── 추가 방통 계획 ───

  {
    id: "p3_pang_reinforce_sun_alliance",
    advisor: "방통",
    priority: 32,
    condition: (s) => {
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!sun && sun.isAllied && s.diplomacy.dp >= 2;
    },
    planReport: () => ({
      speaker: "방통",
      plan: "손권 동맹 강화 — 협공 준비",
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      { dialogue: "손권 동맹을 더욱 굳히겠소. 함께 조조를 압박할 때입니다. (외교포인트 2 소비)", emotion: "excited" },
    ],
  },
  {
    id: "p3_pang_reinforce_cao_alliance",
    advisor: "방통",
    priority: 32,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      return !!cao && cao.isAllied && s.diplomacy.dp >= 2;
    },
    planReport: () => ({
      speaker: "방통",
      plan: "조조 동맹 강화 — 손권 견제",
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      { dialogue: "조조와의 동맹을 강화하겠소. 손권을 압박하는 데 활용합시다. (외교포인트 2 소비)", emotion: "excited" },
    ],
  },
  {
    id: "p3_pang_both_friendly_push",
    advisor: "방통",
    priority: 35,
    condition: (s) => s.diplomacy.relations.every(r => r.isFriendly) && !s.diplomacy.anyAllied && s.diplomacy.dp >= 3,
    planReport: () => ({
      speaker: "방통",
      plan: "양측 우호 → 전략적 동맹 체결",
      expected_points: { dp_delta: -3 },
    }),
    variations: [
      { dialogue: "양쪽 모두 우호적이오. 한쪽과 동맹을 맺어 더 유리한 입장을 취합시다. (외교포인트 3 소비)", emotion: "excited" },
    ],
  },
  {
    id: "p3_pang_double_truce",
    advisor: "방통",
    priority: 53,
    condition: (s) => s.diplomacy.allHostile && s.strategic.biggestThreat !== null &&
      s.strategic.biggestThreat.mp > s.military.mp * 2 && s.diplomacy.dp >= 4,
    planReport: () => ({
      speaker: "방통",
      plan: "양면 위기 — 최소 한 쪽과 긴급 화해",
      expected_points: { dp_delta: -4 },
    }),
    variations: [
      { dialogue: "압도적인 강적이 있소. 최소 한 쪽이라도 화해하여 전선을 줄여야 하오. (외교포인트 4 소비)", emotion: "worried" },
    ],
  },
  {
    id: "p3_pang_post_divide_isolate",
    advisor: "방통",
    priority: 48,
    condition: (s) => !s.diplomacy.enemiesFriendly && s.strategic.overallStrength !== "critical" &&
      s.strategic.weakestEnemy !== null && s.diplomacy.dp >= 2,
    planReport: (s) => ({
      speaker: "방통",
      plan: `분열된 적 — ${s.strategic.weakestEnemy!.name} 외교 고립`,
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      {
        dialogue: (s) => `적들이 분열되어 있소. 이 틈에 ${s.strategic.weakestEnemy!.name}을 외교적으로 고립시킵시다. (외교포인트 2 소비)`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "p3_pang_mass_diplomacy",
    advisor: "방통",
    priority: 38,
    condition: (s) => s.diplomacy.dp >= 6,
    planReport: () => ({
      speaker: "방통",
      plan: "외교포인트 풍부 — 대규모 외교 공세",
      expected_points: { dp_delta: -5 },
    }),
    variations: [
      { dialogue: "외교포인트가 넘칩니다! 대규모 외교 공세를 펼치겠소. (외교포인트 5 소비)", emotion: "excited" },
    ],
  },
  {
    id: "p3_pang_final_isolation",
    advisor: "방통",
    priority: 55,
    condition: (s) => s.gamePhase === "late" && s.strategic.weakestEnemy !== null &&
      s.strategic.weakestEnemy.castles <= 3 && s.diplomacy.dp >= 2,
    planReport: (s) => ({
      speaker: "방통",
      plan: `후반 외교 봉쇄 — ${s.strategic.weakestEnemy!.name} 고립`,
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      {
        dialogue: (s) => `결전 전 ${s.strategic.weakestEnemy!.name}을 외교적으로 봉쇄하겠소. 지원을 끊어버립시다. (외교포인트 2 소비)`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "p3_pang_dominant_pressure",
    advisor: "방통",
    priority: 36,
    condition: (s) => s.strategic.overallStrength === "dominant" && s.diplomacy.dpAdequate,
    planReport: () => ({
      speaker: "방통",
      plan: "우세 → 외교 압박으로 굴복 유도",
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      { dialogue: "우리가 압도적으로 강하오. 외교적으로 압박하면 싸우지 않고 이길 수도 있소. (외교포인트 2 소비)", emotion: "excited" },
    ],
  },
  {
    id: "p3_pang_rebuild_after_loss",
    advisor: "방통",
    priority: 50,
    condition: (s) => s.strategic.recentCastleLost && s.diplomacy.dpAdequate,
    planReport: () => ({
      speaker: "방통",
      plan: "성채 손실 후 외교 재건",
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      { dialogue: "성채를 잃었으나 외교로 만회할 수 있소. 즉시 관계 개선에 나서겠소. (외교포인트 2 소비)", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_pang_victory_exploit",
    advisor: "방통",
    priority: 44,
    condition: (s) => s.strategic.recentBattleWon && s.diplomacy.dpAdequate,
    planReport: () => ({
      speaker: "방통",
      plan: "승전 외교 — 기세로 유리한 조건 확보",
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      { dialogue: "승전의 여세를 몰아 외교에서도 주도권을 잡겠소. (외교포인트 2 소비)", emotion: "excited" },
    ],
  },
  {
    id: "p3_pang_early_outreach",
    advisor: "방통",
    priority: 22,
    condition: (s) => s.gamePhase === "early" && s.diplomacy.dpAdequate,
    planReport: () => ({
      speaker: "방통",
      plan: "초반 외교 기반 구축",
      expected_points: { dp_delta: -2 },
    }),
    variations: [
      { dialogue: "초반에 외교 기반을 다져두면 나중에 큰 도움이 됩니다. (외교포인트 2 소비)", emotion: "thoughtful" },
      { dialogue: "지금 우방을 사귀어 두는 것이 현명하오. 외교에 나서겠소. (외교포인트 2 소비)", emotion: "calm" },
    ],
  },
  {
    id: "p3_pang_mid_assessment",
    advisor: "방통",
    priority: 18,
    condition: (s) => s.gamePhase === "mid" && !s.diplomacy.allHostile,
    planReport: () => ({
      speaker: "방통",
      plan: "중반 외교 현황 정리 — 관망",
    }),
    variations: [
      { dialogue: "중반부 외교 정세를 정리하겠소. 지금은 관망하는 것이 상책이오.", emotion: "calm" },
    ],
  },

  // ─── 군사력 → 내정 전환 (비상 수단) ───

  {
    id: "p3_pang_plunder",
    advisor: "방통",
    priority: 22,
    condition: (s) =>
      s.economy.ipCritical &&
      (s.military.troopsAdequate || s.military.troopsAbundant) &&
      s.strategic.overallStrength !== "critical",
    planReport: () => ({
      speaker: "방통",
      plan: "약탈 — 비상 자금 조달 (군사포인트(병력) 20 소모, 내정포인트 +40, 외교포인트 -3)",
      expected_points: { mp_troops_delta: -20, ip_delta: 40, dp_delta: -3 },
    }),
    variations: [
      { dialogue: "달리 방도가 없소. 인근 지역을 약탈하여 자금을 조달합시다. 외교 관계는 망가지겠지만... 지금은 살아남는 게 먼저요.", emotion: "worried" },
      { dialogue: "비상 수단이오. 군사포인트(병력) 20을 풀어 즉각 자금을 확보하겠소. 외교 손실은 각오해야 하오.", emotion: "thoughtful" },
    ],
  },

  // ─── 포인트 전환 ───

  {
    id: "p3_pang_tribute_ip_to_dp",
    advisor: "방통",
    priority: 38,
    condition: (s) => s.economy.ipRich && (s.diplomacy.dpNone || s.diplomacy.dpLow),
    planReport: () => ({
      speaker: "방통",
      plan: "공물 헌납 — 내정→외교 전환 (내정포인트 20 소모, 외교포인트 +2)",
      expected_points: { ip_delta: -20, dp_delta: 2 },
    }),
    variations: [
      { dialogue: "자금으로 우호를 살 수 있소. 내정포인트 20을 공물로 써서 외교포인트 2를 확보합시다.", emotion: "thoughtful" },
      { dialogue: "지금은 돈으로 외교를 뚫을 때요. 공물 헌납으로 외교 자원을 마련하겠소.", emotion: "calm" },
    ],
  },
  {
    id: "p3_pang_trade_deal_dp_to_ip",
    advisor: "방통",
    priority: 40,
    condition: (s) => s.economy.ipLow && s.diplomacy.dpAdequate,
    planReport: () => ({
      speaker: "방통",
      plan: "무역 협정 체결 (외교포인트 1 소모, 내정포인트 +25)",
      expected_points: { dp_delta: -1, ip_delta: 25 },
    }),
    variations: [
      { dialogue: "외교포인트 1을 써서 무역 협정을 맺겠소. 즉각 내정포인트 25가 들어올 것이오.", emotion: "excited" },
      { dialogue: "외교 자원이 있으니 활용합시다. 협정 하나로 자금 25를 끌어올 수 있소.", emotion: "calm" },
    ],
  },
  {
    id: "p3_pang_allied_soldiers",
    advisor: "방통",
    priority: 35,
    condition: (s) => s.military.troopShortage && s.diplomacy.dpRich,
    planReport: () => ({
      speaker: "방통",
      plan: "우방 병력 지원 요청 (외교포인트 3 소모, 군사포인트(병력) +8000)",
      expected_points: { dp_delta: -3, mp_troops_delta: 8000 },
    }),
    variations: [
      { dialogue: "군사포인트(병력)이 부족하오. 외교포인트 3을 써서 우방에 지원군을 요청하겠소. 8000명이 올 것이오.", emotion: "thoughtful" },
      { dialogue: "외교 자산을 군사력으로 전환할 시기요. 동맹 지원군으로 전력을 보충합시다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_pang_sp_to_dp",
    advisor: "방통",
    priority: 20,
    condition: (s) => s.strategic.sp >= 5 && s.diplomacy.dpLow,
    planReport: () => ({
      speaker: "방통",
      plan: "외교 책략 — 전략→외교 전환 (전략포인트 3 소모, 외교포인트 +2)",
      expected_points: { sp_delta: -3, dp_delta: 2 },
    }),
    variations: [
      { dialogue: "전략 자원을 외교에 투입합시다. 전략포인트 3으로 외교포인트 2를 마련하겠소.", emotion: "thoughtful" },
      { dialogue: "지금 외교가 막혔소. 전략포인트를 전환해 외교포인트를 확보합시다.", emotion: "calm" },
    ],
  },
];

// =====================================================================
//  제갈량 (전략) 종합 정리 — 32개
//  Phase 3의 마지막에 전체 계획을 종합하여 정리.
// =====================================================================

export const ZHUGE_PHASE3_CASES: Phase3CaseDefinition[] = [
  // ─── 공격 중점 ───

  {
    id: "p3_zhuge_offensive",
    advisor: "제갈량",
    priority: 40,
    condition: (s) => s.military.troopsAbundant && s.military.highTraining &&
      s.strategic.weakestEnemy !== null && s.military.mp > s.strategic.weakestEnemy.mp,
    planReport: () => ({
      speaker: "제갈량",
      plan: "공세 전략 — 약한 적부터 공략",
    }),
    variations: [
      { dialogue: "이번 턴은 공세에 집중합시다. 약한 곳을 먼저 치는 것이 상책입니다.", emotion: "excited" },
      { dialogue: "적의 허를 찌를 때입니다. 공격적으로 나갑시다.", emotion: "excited" },
    ],
  },
  {
    id: "p3_zhuge_final_push",
    advisor: "제갈량",
    priority: 65,
    condition: (s) => s.strategic.nearEnemyCapital && s.military.troopsAbundant,
    planReport: () => ({
      speaker: "제갈량",
      plan: "최종 공세 — 적 본성 함락 작전",
    }),
    variations: [
      { dialogue: "적 본성이 눈앞입니다! 관우 장군은 선봉을, 방통은 외교로 후방을 봉쇄하시오. 총력전입니다.", emotion: "excited" },
      { dialogue: "최종 공세를 총괄하겠습니다. 군사·외교·내정 모든 역량을 이 한 전투에 쏟읍시다.", emotion: "excited" },
    ],
  },

  // ─── 방어 중점 ───

  {
    id: "p3_zhuge_defensive",
    advisor: "제갈량",
    priority: 45,
    condition: (s) => s.strategic.overallStrength === "disadvantage" || s.strategic.overallStrength === "critical",
    planReport: () => ({
      speaker: "제갈량",
      plan: "수세 전략 — 내실 강화 후 반격",
    }),
    variations: [
      { dialogue: "지금은 수비에 집중하고 힘을 기를 때입니다. 때를 기다립시다.", emotion: "thoughtful" },
      { dialogue: "급하게 나서지 말고 내실을 다지면서 기회를 노립시다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_zhuge_defend_capital",
    advisor: "제갈량",
    priority: 70,
    condition: (s) => s.strategic.enemyNearCapital,
    planReport: () => ({
      speaker: "제갈량",
      plan: "본성 방어 최우선 — 전력 집중",
    }),
    variations: [
      { dialogue: "본성 방어에 모든 것을 걸어야 합니다. 다른 건 후순위입니다.", emotion: "worried" },
    ],
  },

  // ─── 균형 발전 ───

  {
    id: "p3_zhuge_balanced",
    advisor: "제갈량",
    priority: 25,
    condition: (s) => s.strategic.overallStrength === "balanced",
    planReport: () => ({
      speaker: "제갈량",
      plan: "균형 발전 — 군비와 내정 병행",
    }),
    variations: [
      { dialogue: "균형 잡힌 발전이 필요합니다. 군비와 내정을 함께 키웁시다.", emotion: "calm" },
      { dialogue: "한쪽에 치우치지 말고 고르게 성장합시다.", emotion: "thoughtful" },
    ],
  },

  // ─── 내정 기반 ───

  {
    id: "p3_zhuge_economy_first",
    advisor: "제갈량",
    priority: 42,
    condition: (s) => s.economy.lowIncome && s.economy.canUpgrade && !s.strategic.enemyNearCapital,
    planReport: () => ({
      speaker: "제갈량",
      plan: "내정 우선 — 경제 기반 확충",
    }),
    variations: [
      { dialogue: "병사를 먹이려면 먼저 곳간을 채워야 합니다. 내정부터 키웁시다.", emotion: "thoughtful" },
      { dialogue: "부국강병의 기본은 부국입니다. 시설 투자가 먼저입니다.", emotion: "calm" },
    ],
  },

  // ─── 외교 중점 ───

  {
    id: "p3_zhuge_diplomacy_focus",
    advisor: "제갈량",
    priority: 43,
    condition: (s) => s.diplomacy.allHostile && s.diplomacy.dpAdequate,
    planReport: () => ({
      speaker: "제갈량",
      plan: "외교 돌파 — 고립 탈출 우선",
    }),
    variations: [
      { dialogue: "사면초가를 벗어나려면 외교가 먼저입니다. 한쪽과는 화해합시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_zhuge_divide_and_conquer",
    advisor: "제갈량",
    priority: 48,
    condition: (s) => s.diplomacy.enemiesFriendly && s.diplomacy.dpAdequate,
    planReport: () => ({
      speaker: "제갈량",
      plan: "이이제이 — 적의 연합을 와해시킨 후 각개격파",
    }),
    variations: [
      { dialogue: "적끼리 뭉치기 전에 이간책으로 분열시킵시다. 이이제이가 상책입니다.", emotion: "excited" },
    ],
  },

  // ─── 위기 대응 ───

  {
    id: "p3_zhuge_crisis",
    advisor: "제갈량",
    priority: 60,
    condition: (s) => s.strategic.overallStrength === "critical" && s.military.troopShortage,
    planReport: () => ({
      speaker: "제갈량",
      plan: "긴급 위기 대응 — 생존 최우선",
    }),
    variations: [
      { dialogue: "존망의 기로입니다. 모든 자원을 생존에 집중합시다.", emotion: "worried" },
      { dialogue: "지금은 살아남는 것이 이기는 것입니다. 방어와 외교에 집중합시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_zhuge_post_defeat",
    advisor: "제갈량",
    priority: 50,
    condition: (s) => s.strategic.recentBattleLost,
    planReport: () => ({
      speaker: "제갈량",
      plan: "패전 수습 — 전력 재건 및 방어 강화",
    }),
    variations: [
      { dialogue: "패전을 딛고 일어서야 합니다. 재건에 집중합시다.", emotion: "thoughtful" },
      { dialogue: "한 번 넘어졌다고 끝이 아닙니다. 다시 일어설 계획을 세웁시다.", emotion: "calm" },
    ],
  },

  // ─── 기회 포착 ───

  {
    id: "p3_zhuge_seize_moment",
    advisor: "제갈량",
    priority: 46,
    condition: (s) => s.strategic.recentBattleWon && s.military.troopsAdequate,
    planReport: () => ({
      speaker: "제갈량",
      plan: "승리의 기세 활용 — 추가 공세 또는 영향력 확대",
    }),
    variations: [
      { dialogue: "승전의 기세를 이어가 영향력을 넓힙시다.", emotion: "excited" },
      { dialogue: "이긴 여세를 몰아 다음 수를 두어야 합니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_zhuge_expand_territory",
    advisor: "제갈량",
    priority: 38,
    condition: (s) => s.strategic.overallStrength === "advantage" && s.military.troopsAbundant,
    planReport: () => ({
      speaker: "제갈량",
      plan: "영토 확장 전략 — 약한 전선부터 공략",
    }),
    variations: [
      { dialogue: "우세한 형국이니 영토를 넓힐 때입니다. 약한 곳부터 공략합시다.", emotion: "excited" },
    ],
  },

  // ─── 시기별 ───

  {
    id: "p3_zhuge_early_foundation",
    advisor: "제갈량",
    priority: 30,
    condition: (s) => s.gamePhase === "early",
    planReport: () => ({
      speaker: "제갈량",
      plan: "초반 기반 구축 — 내정과 군비 병행",
    }),
    variations: [
      { dialogue: "초반에는 기반을 다지는 것이 최선입니다. 급하지 않게 갑시다.", emotion: "calm" },
      { dialogue: "기초를 튼튼히 하면 나중에 큰 힘이 됩니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_zhuge_late_decisive",
    advisor: "제갈량",
    priority: 42,
    condition: (s) => s.gamePhase === "late" && s.turn >= 100,
    planReport: () => ({
      speaker: "제갈량",
      plan: "결전 준비 — 남은 턴 내 승부",
    }),
    variations: [
      {
        dialogue: (s) => `남은 ${120 - s.turn}턴 안에 승부를 봐야 합니다. 전력을 집중합시다.`,
        emotion: "excited",
      },
    ],
  },

  // ─── 스킬 ───

  {
    id: "p3_zhuge_unlock_skill",
    advisor: "제갈량",
    priority: 35,
    condition: (s) => s.strategic.spCanUnlock,
    planReport: () => ({
      speaker: "제갈량",
      plan: "스킬 트리 연구 — 전략포인트 투자",
    }),
    variations: [
      { dialogue: "새 기술을 연구하여 전략적 우위를 확보합시다.", emotion: "thoughtful" },
      { dialogue: "스킬 트리에 투자하면 장기적으로 큰 이점을 얻을 수 있습니다.", emotion: "calm" },
    ],
  },

  // ─── 기본 종합 ───

  {
    id: "p3_zhuge_summary_default",
    advisor: "제갈량",
    priority: 10,
    condition: () => true,
    planReport: () => ({
      speaker: "제갈량",
      plan: "각 참모 계획 종합 정리",
    }),
    variations: [
      { dialogue: "이상의 계획을 종합하였습니다. 주공의 재가를 기다리겠습니다.", emotion: "calm" },
      { dialogue: "각 참모의 계획을 정리하였습니다. 피드백을 주시옵소서.", emotion: "calm" },
      { dialogue: "계획 보고를 마치겠습니다. 주공께서 결정해 주시옵소서.", emotion: "calm" },
    ],
  },
  {
    id: "p3_zhuge_encourage",
    advisor: "제갈량",
    priority: 12,
    condition: (s) => s.strategic.overallStrength === "advantage" || s.strategic.overallStrength === "dominant",
    planReport: () => ({
      speaker: "제갈량",
      plan: "계획 종합 — 자신감 있는 전진",
    }),
    variations: [
      { dialogue: "형세가 유리합니다. 자신감을 갖고 나아갑시다!", emotion: "excited" },
      { dialogue: "좋은 흐름입니다. 이 기세를 이어갑시다.", emotion: "excited" },
    ],
  },

  // ─── 추가 제갈량 종합 계획 ───

  {
    id: "p3_zhuge_skill_with_summary",
    advisor: "제갈량",
    priority: 36,
    condition: (s) => s.strategic.spCanUnlock && s.strategic.overallStrength !== "critical",
    planReport: () => ({
      speaker: "제갈량",
      plan: "스킬 해금 + 균형 발전 종합 계획",
    }),
    variations: [
      { dialogue: "스킬 연구와 함께 각 분야 성장을 균형 있게 추진합시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_zhuge_expand_after_castles",
    advisor: "제갈량",
    priority: 35,
    condition: (s) => s.strategic.castleCount >= 7 && s.strategic.overallStrength !== "critical" &&
      s.strategic.adjacentEnemyCastles.length > 0,
    planReport: () => ({
      speaker: "제갈량",
      plan: "중원 확장 — 우세 활용 추가 영토 확보",
    }),
    variations: [
      {
        dialogue: (s) => `${s.strategic.castleCount}개 성채를 발판으로 더 넓혀갑시다. 아직 갈 길이 있습니다.`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "p3_zhuge_early_balanced_plan",
    advisor: "제갈량",
    priority: 28,
    condition: (s) => s.gamePhase === "early" && !s.economy.ipCritical && !s.military.troopsCritical,
    planReport: () => ({
      speaker: "제갈량",
      plan: "초반 균형 발전 — 내정 우선, 군비 병행",
    }),
    variations: [
      { dialogue: "초반에는 내정을 우선하되 군비도 소홀히 하지 않겠습니다. 균형 있게 발전합시다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_zhuge_mid_ally_focus",
    advisor: "제갈량",
    priority: 32,
    condition: (s) => s.gamePhase === "mid" && s.diplomacy.anyAllied && s.strategic.overallStrength !== "critical",
    planReport: () => ({
      speaker: "제갈량",
      plan: "동맹 협력 — 외교+군사 연계 전략",
    }),
    variations: [
      { dialogue: "동맹을 활용한 협공 전략이 유효합니다. 방통, 외교로 조율하시오.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_zhuge_late_full_check",
    advisor: "제갈량",
    priority: 43,
    condition: (s) => s.gamePhase === "late" && s.turn < 100,
    planReport: (s) => ({
      speaker: "제갈량",
      plan: `후반 종합 체크 — 남은 ${120 - s.turn}턴 전략`,
    }),
    variations: [
      {
        dialogue: (s) => `남은 ${120 - s.turn}턴을 최대한 활용합시다. 각 분야 현황을 점검하고 집중할 곳을 정합시다.`,
        emotion: "thoughtful",
      },
    ],
  },
  {
    id: "p3_zhuge_lose_streak_overhaul",
    advisor: "제갈량",
    priority: 56,
    condition: (s) => s.strategic.consecutiveLosses >= 3,
    planReport: () => ({
      speaker: "제갈량",
      plan: "연패 — 전면 전략 재검토 및 수비 강화",
    }),
    variations: [
      { dialogue: "연패가 이어지고 있습니다. 지금까지의 전략을 전면 재검토하고 수비 위주로 재편합시다.", emotion: "worried" },
    ],
  },
  {
    id: "p3_zhuge_win_streak_target",
    advisor: "제갈량",
    priority: 45,
    condition: (s) => s.strategic.consecutiveWins >= 3 && s.strategic.weakestEnemy !== null,
    planReport: (s) => ({
      speaker: "제갈량",
      plan: `연승 기세 — ${s.strategic.weakestEnemy!.name} 집중 공략`,
    }),
    variations: [
      {
        dialogue: (s) => `${s.strategic.consecutiveWins}연승! 이 기세로 ${s.strategic.weakestEnemy!.name}을 집중 공략합시다.`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "p3_zhuge_two_front_management",
    advisor: "제갈량",
    priority: 53,
    condition: (s) => s.diplomacy.allHostile && s.strategic.adjacentEnemyCastles.length >= 2 &&
      s.diplomacy.dpAdequate,
    planReport: () => ({
      speaker: "제갈량",
      plan: "양면 전쟁 관리 — 방어+외교 병행",
    }),
    variations: [
      { dialogue: "두 방면에서 적이 오고 있습니다. 방어선을 굳히면서 방통에게 외교로 돌파구를 찾아달라 부탁합시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_zhuge_economy_military_ramp",
    advisor: "제갈량",
    priority: 34,
    condition: (s) => s.economy.highIncome && s.military.troopShortage &&
      s.strategic.overallStrength !== "dominant",
    planReport: () => ({
      speaker: "제갈량",
      plan: "경제 기반 활용 — 대규모 군비 강화",
    }),
    variations: [
      { dialogue: "내정이 탄탄하니 이제 군비를 대폭 강화할 때입니다. 미축의 자금으로 모병합시다.", emotion: "excited" },
    ],
  },
  {
    id: "p3_zhuge_overwhelming_finish",
    advisor: "제갈량",
    priority: 48,
    condition: (s) => s.strategic.overallStrength === "dominant" && s.strategic.nearEnemyCapital,
    planReport: () => ({
      speaker: "제갈량",
      plan: "천하통일 — 최후 결전 총괄 지휘",
    }),
    variations: [
      { dialogue: "이 한 전투로 천하를 평정합시다! 군사·외교·내정 모든 것을 총동원합니다.", emotion: "excited" },
    ],
  },
  {
    id: "p3_zhuge_all_hostile_no_dp",
    advisor: "제갈량",
    priority: 58,
    condition: (s) => s.diplomacy.allHostile && s.diplomacy.dpNone && s.strategic.overallStrength === "critical",
    planReport: () => ({
      speaker: "제갈량",
      plan: "사면초가 생존 — 외교포인트 회복 후 외교 돌파",
    }),
    variations: [
      { dialogue: "최악의 상황입니다. 외교포인트를 회복한 뒤 즉시 외교에 나서겠습니다. 지금은 오직 생존입니다.", emotion: "worried" },
    ],
  },
  {
    id: "p3_zhuge_advantage_next_step",
    advisor: "제갈량",
    priority: 30,
    condition: (s) => s.strategic.overallStrength === "advantage" && !s.strategic.nearEnemyCapital,
    planReport: (s) => ({
      speaker: "제갈량",
      plan: "우세 상황 — 약한 적 먼저 제거 후 강한 적 대비",
    }),
    variations: [
      {
        dialogue: (s) => s.strategic.weakestEnemy
          ? `형세가 유리합니다. 먼저 ${s.strategic.weakestEnemy.name}을 제거하고 그다음을 도모합시다.`
          : "지금의 우세를 굳혀 다음 단계로 나아갑시다.",
        emotion: "thoughtful",
      },
    ],
  },

  // ─── 포인트 전환 ───

  {
    id: "p3_zhuge_promote_learning",
    advisor: "제갈량",
    priority: 24,
    condition: (s) => s.economy.ipAdequate && s.strategic.sp < 3,
    planReport: () => ({
      speaker: "제갈량",
      plan: "학문 진흥 — 내정→전략 투자 (내정포인트 20 소모, 전략포인트 +2)",
      expected_points: { ip_delta: -20, sp_delta: 2 },
    }),
    variations: [
      { dialogue: "내정포인트를 학문에 투자하면 전략적 식견이 열립니다. 내정포인트 20으로 전략포인트 2를 확보하겠습니다.", emotion: "thoughtful" },
      { dialogue: "곳간이 채워졌으니 이제 지식을 쌓을 때입니다. 학문 진흥에 투자하겠습니다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_zhuge_strategic_economy",
    advisor: "제갈량",
    priority: 28,
    condition: (s) => s.strategic.sp >= 4 && s.economy.ipLow,
    planReport: () => ({
      speaker: "제갈량",
      plan: "전략적 경영 계책 (전략포인트 2 소모, 내정포인트 +15)",
      expected_points: { sp_delta: -2, ip_delta: 15 },
    }),
    variations: [
      { dialogue: "전략 자원으로 경영 효율을 높이겠습니다. 전략포인트 2를 써서 내정포인트 15를 확보하겠습니다.", emotion: "thoughtful" },
      { dialogue: "계책 하나로 자금난을 타개할 수 있습니다. 전략포인트 2를 투입하겠습니다.", emotion: "calm" },
    ],
  },
  {
    id: "p3_zhuge_boost_morale",
    advisor: "제갈량",
    priority: 32,
    condition: (s) => s.military.lowMorale && s.economy.ipAdequate,
    planReport: () => ({
      speaker: "제갈량",
      plan: "군심 결집 — 포상과 격려 (내정포인트 15 소모, 군사 사기 +0.1)",
      expected_points: { ip_delta: -15, mp_morale_delta: 0.1 },
    }),
    variations: [
      { dialogue: "병사들의 사기가 떨어지면 전투력도 반감됩니다. 내정포인트 15로 포상을 내려 사기를 끌어올리겠습니다.", emotion: "worried" },
      { dialogue: "사기를 높이는 것이 군사포인트(병력)을 늘리는 것 이상의 효과를 냅니다. 포상에 투자하겠습니다.", emotion: "thoughtful" },
    ],
  },
];

// =====================================================================
//  전체 Phase 3 케이스 모음
// =====================================================================

export const ALL_PHASE3_CASES: Phase3CaseDefinition[] = [
  ...GUAN_PHASE3_CASES,
  ...MI_PHASE3_CASES,
  ...PANG_PHASE3_CASES,
  ...ZHUGE_PHASE3_CASES,
];

// =====================================================================
//  Phase 2 키워드 매핑
// =====================================================================

export const PHASE2_KEYWORD_MAPPINGS: KeywordMapping[] = [
  {
    id: "kw_attack",
    keywords: ["공격", "출격", "침공", "점령", "진격", "치자", "때리자", "쳐들어"],
    advisorOverride: "관우",
    description: "공격/출격 지시",
  },
  {
    id: "kw_defense",
    keywords: ["방어", "수비", "지키", "방비", "막아", "수성", "성벽"],
    advisorOverride: "관우",
    description: "방어 지시",
  },
  {
    id: "kw_recruit",
    keywords: ["모병", "징병", "병력 보충", "병사 모아", "군사 늘려"],
    advisorOverride: "관우",
    description: "모병 지시",
  },
  {
    id: "kw_train",
    keywords: ["훈련", "단련", "기량", "전투력"],
    advisorOverride: "관우",
    description: "훈련 지시",
  },
  {
    id: "kw_build_market",
    keywords: ["시장", "상업", "장사"],
    advisorOverride: "미축",
    description: "시장 건설/확장",
  },
  {
    id: "kw_build_farm",
    keywords: ["논", "농업", "농사", "식량"],
    advisorOverride: "미축",
    description: "논 건설/확장",
  },
  {
    id: "kw_build_bank",
    keywords: ["은행", "금고", "저장", "비축"],
    advisorOverride: "미축",
    description: "은행 건설/확장",
  },
  {
    id: "kw_build_general",
    keywords: ["시설", "건설", "확장", "인프라", "내정"],
    advisorOverride: "미축",
    description: "시설 건설 일반",
  },
  {
    id: "kw_diplomacy_improve",
    keywords: ["외교", "화친", "관계 개선", "사신", "우호"],
    advisorOverride: "방통",
    description: "관계 개선",
  },
  {
    id: "kw_diplomacy_alliance",
    keywords: ["동맹", "연합", "손잡"],
    advisorOverride: "방통",
    description: "동맹 추진",
  },
  {
    id: "kw_diplomacy_divide",
    keywords: ["이간", "분열", "갈라", "이이제이"],
    advisorOverride: "방통",
    description: "이간책",
  },
  {
    id: "kw_skill",
    keywords: ["스킬", "기술", "연구", "전략포인트"],
    advisorOverride: "제갈량",
    description: "스킬 트리 연구",
  },
];

/**
 * Phase 3 (계획 보고) 케이스 정의
 *
 * Phase 2 토론이 없거나 키워드 매칭으로 처리 가능한 경우,
 * API 없이 현재 상태 기반 계획을 즉각 생성한다.
 */

import type { Phase3CaseDefinition, GameSituation, KeywordMapping } from "./types";
import {
  FACILITY_BUILD_COST,
  RECRUIT_IP_COST,
  TRAIN_IP_COST,
} from "@/constants/gameConstants";

// =====================================================================
//  관우 (군사) 계획 — 20개
// =====================================================================

export const GUAN_PHASE3_CASES: Phase3CaseDefinition[] = [
  // ─── 모병 ───

  {
    id: "p3_guan_recruit_urgent",
    advisor: "관우",
    priority: 75,
    condition: (s) => s.military.troopsCritical && s.economy.ip >= RECRUIT_IP_COST,
    planReport: () => ({
      speaker: "관우",
      plan: `긴급 모병 (내정포인트 ${RECRUIT_IP_COST} 소비)`,
      expected_points: { ip_delta: -RECRUIT_IP_COST, mp_troops_delta: 20000 },
    }),
    variations: [
      { dialogue: "당장 모병하겠소! 한 명이라도 더 모아야 하오.", emotion: "angry" },
      { dialogue: "긴급 모병령을 내리겠소. 병력 확보가 급선무요!", emotion: "angry" },
    ],
  },
  {
    id: "p3_guan_recruit_normal",
    advisor: "관우",
    priority: 55,
    condition: (s) => s.military.troopShortage && !s.military.troopsCritical && s.economy.ip >= RECRUIT_IP_COST,
    planReport: () => ({
      speaker: "관우",
      plan: `모병 실시 (내정포인트 ${RECRUIT_IP_COST} 소비)`,
      expected_points: { ip_delta: -RECRUIT_IP_COST, mp_troops_delta: 20000 },
    }),
    variations: [
      { dialogue: "모병을 실시하겠소. 병력을 보충해야 하오.", emotion: "calm" },
      { dialogue: "모병하여 1만을 채우겠소.", emotion: "calm" },
    ],
  },
  {
    id: "p3_guan_mass_recruit",
    advisor: "관우",
    priority: 50,
    condition: (s) => s.military.troopShortage && s.economy.ip >= RECRUIT_IP_COST * 2,
    planReport: () => ({
      speaker: "관우",
      plan: `대규모 모병 (내정포인트 ${RECRUIT_IP_COST * 2} 소비)`,
      expected_points: { ip_delta: -RECRUIT_IP_COST * 2, mp_troops_delta: 40000 },
    }),
    variations: [
      { dialogue: "대규모 모병으로 한 번에 병력을 늘리겠소!", emotion: "excited" },
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
      { dialogue: "집중 훈련에 들어가겠소! 이 오합지졸을 정예로 만들겠소.", emotion: "angry" },
      { dialogue: "훈련을 대폭 강화하겠소. 전투력이 너무 떨어지오.", emotion: "worried" },
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
      { dialogue: "병사 훈련에 매진하겠소.", emotion: "calm" },
      { dialogue: "훈련도를 끌어올리겠소. 전투력 향상이 필요하오.", emotion: "calm" },
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
      { dialogue: "본성 공략에 정예 병력을 투입하겠소. 한 번에 끝냅시다!", emotion: "excited" },
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
      { dialogue: "사기부터 올리겠소. 이 관우가 직접 병사들 앞에 서겠소.", emotion: "angry" },
      { dialogue: "병사들에게 훈시를 내리고 포상하여 사기를 높이겠소.", emotion: "calm" },
    ],
  },

  // ─── 재정비 ───

  {
    id: "p3_guan_want_recruit_no_ip",
    advisor: "관우",
    priority: 62,
    condition: (s) => s.military.troopsCritical && s.economy.ip < RECRUIT_IP_COST,
    planReport: (s) => ({
      speaker: "관우",
      plan: `긴급 모병 대기 — 자금 부족 (필요 ${RECRUIT_IP_COST}, 현재 ${s.economy.ip})`,
    }),
    variations: [
      { dialogue: "모병이 급하나 자금이 없소... 미축, 어떻게든 마련해 달라!", emotion: "angry" },
      { dialogue: "내정포인트가 모이는 즉시 모병에 들어가겠소. 지금은 기다릴 수밖에 없소.", emotion: "worried" },
      { dialogue: "자금만 생기면 당장 모병하겠소. 지금은 기존 병력으로 버텨야 하오.", emotion: "worried" },
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
      s.economy.ip >= RECRUIT_IP_COST + TRAIN_IP_COST,
    planReport: () => ({
      speaker: "관우",
      plan: `모병과 훈련 병행 (내정포인트 ${RECRUIT_IP_COST + TRAIN_IP_COST} 소비)`,
      expected_points: { ip_delta: -(RECRUIT_IP_COST + TRAIN_IP_COST), mp_troops_delta: 20000, mp_training_delta: 0.05 },
    }),
    variations: [
      { dialogue: "모병과 훈련을 동시에 진행하겠소. 자금이 허락하니 다행이오.", emotion: "calm" },
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
];

// =====================================================================
//  미축 (내정) 계획 — 20개
// =====================================================================

export const MI_PHASE3_CASES: Phase3CaseDefinition[] = [
  // ─── 시장 건설 ───

  {
    id: "p3_mi_build_market_first",
    advisor: "미축",
    priority: 60,
    condition: (s) => s.economy.marketLv === 0 && s.economy.ip >= FACILITY_BUILD_COST,
    planReport: () => ({
      speaker: "미축",
      plan: `시장 건설 (내정포인트 ${FACILITY_BUILD_COST} 소비)`,
      expected_points: { ip_delta: -FACILITY_BUILD_COST },
    }),
    variations: [
      { dialogue: "우선 시장을 건설하여 수입의 기반을 마련하겠습니다.", emotion: "calm" },
      { dialogue: "시장 건설이 최우선입니다. 수입 없이는 아무것도 할 수 없습니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_mi_expand_market",
    advisor: "미축",
    priority: 40,
    condition: (s) => s.economy.marketLv > 0 && s.economy.marketLv < 5 &&
      s.economy.ip >= FACILITY_BUILD_COST && !s.economy.facilityImbalance,
    planReport: (s) => ({
      speaker: "미축",
      plan: `시장 확장 Lv${s.economy.marketLv}→${s.economy.marketLv + 1} (내정포인트 ${FACILITY_BUILD_COST} 소비)`,
      expected_points: { ip_delta: -FACILITY_BUILD_COST },
    }),
    variations: [
      { dialogue: "시장을 확장하여 수입을 늘리겠습니다.", emotion: "calm" },
      {
        dialogue: (s) => `시장을 Lv${s.economy.marketLv + 1}로 올리면 턴당 수입이 3 늘어납니다.`,
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
      s.economy.ip >= FACILITY_BUILD_COST,
    planReport: () => ({
      speaker: "미축",
      plan: `논 건설 (내정포인트 ${FACILITY_BUILD_COST} 소비)`,
      expected_points: { ip_delta: -FACILITY_BUILD_COST },
    }),
    variations: [
      { dialogue: "시장이 안정되었으니 논을 건설하여 수입을 다각화합시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_mi_expand_farm",
    advisor: "미축",
    priority: 38,
    condition: (s) => s.economy.farmLv > 0 && s.economy.farmLv < s.economy.marketLv &&
      s.economy.ip >= FACILITY_BUILD_COST,
    planReport: (s) => ({
      speaker: "미축",
      plan: `논 확장 Lv${s.economy.farmLv}→${s.economy.farmLv + 1} (내정포인트 ${FACILITY_BUILD_COST} 소비)`,
      expected_points: { ip_delta: -FACILITY_BUILD_COST },
    }),
    variations: [
      { dialogue: "논을 확장하여 안정적인 수입을 추가하겠습니다.", emotion: "calm" },
    ],
  },

  // ─── 은행 건설 ───

  {
    id: "p3_mi_build_bank",
    advisor: "미축",
    priority: 48,
    condition: (s) => s.economy.bankLv === 0 && s.economy.ipNearCap &&
      s.economy.marketLv >= 2 && s.economy.ip >= FACILITY_BUILD_COST,
    planReport: () => ({
      speaker: "미축",
      plan: `은행 건설 (내정포인트 ${FACILITY_BUILD_COST} 소비)`,
      expected_points: { ip_delta: -FACILITY_BUILD_COST },
    }),
    variations: [
      { dialogue: "은행을 건설하여 내정포인트 상한을 올리겠습니다.", emotion: "thoughtful" },
      { dialogue: "저장 한계에 도달하기 전에 은행을 세워야 합니다.", emotion: "worried" },
    ],
  },
  {
    id: "p3_mi_expand_bank",
    advisor: "미축",
    priority: 36,
    condition: (s) => s.economy.bankLv > 0 && s.economy.bankLv < 3 &&
      s.economy.ipNearCap && s.economy.ip >= FACILITY_BUILD_COST,
    planReport: (s) => ({
      speaker: "미축",
      plan: `은행 확장 Lv${s.economy.bankLv}→${s.economy.bankLv + 1}`,
      expected_points: { ip_delta: -FACILITY_BUILD_COST },
    }),
    variations: [
      { dialogue: "은행을 확장하여 비축 여력을 키우겠습니다.", emotion: "calm" },
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
    condition: (s) => s.economy.ip >= 15 && s.economy.ip < FACILITY_BUILD_COST &&
      (s.economy.marketLv < 3 || s.economy.farmLv < 2),
    planReport: (s) => ({
      speaker: "미축",
      plan: `내정포인트 비축 (현재 ${s.economy.ip}/${FACILITY_BUILD_COST} 목표)`,
    }),
    variations: [
      {
        dialogue: (s) => `시설 건설비 ${FACILITY_BUILD_COST}까지 ${FACILITY_BUILD_COST - s.economy.ip} 부족합니다. 비축하겠습니다.`,
        emotion: "calm",
      },
    ],
  },
  {
    id: "p3_mi_save_for_recruit",
    advisor: "미축",
    priority: 32,
    condition: (s) => s.military.troopShortage && s.economy.ip < RECRUIT_IP_COST,
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
    planReport: () => ({
      speaker: "미축",
      plan: "시설 균형 투자",
      expected_points: { ip_delta: -FACILITY_BUILD_COST },
    }),
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
    planReport: () => ({
      speaker: "미축",
      plan: "수입 극대화 — 시장/논 집중 투자",
      expected_points: { ip_delta: -FACILITY_BUILD_COST },
    }),
    variations: [
      { dialogue: "수입이 적으니 시설 투자로 수입을 올리는 게 우선입니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "p3_mi_post_castle_setup",
    advisor: "미축",
    priority: 42,
    condition: (s) => s.strategic.recentCastleGained,
    planReport: (s) => ({
      speaker: "미축",
      plan: s.economy.canUpgrade
        ? `신규 성채 경제 기반 구축 (내정포인트 ${FACILITY_BUILD_COST} 소비)`
        : `신규 성채 투자 준비 (자금 비축 중, ${s.economy.ip}/${FACILITY_BUILD_COST})`,
      expected_points: s.economy.canUpgrade ? { ip_delta: -FACILITY_BUILD_COST } : undefined,
    }),
    variations: [
      { dialogue: "새 영토의 경제 기반을 서둘러 구축하겠습니다.", emotion: "excited" },
      {
        dialogue: (s) => s.economy.canUpgrade
          ? "새 성채에 즉시 시설을 건설하겠습니다!"
          : "새 성채 투자를 위해 자금을 더 모아야 합니다. 비축에 집중하겠습니다.",
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
    condition: (s) => s.military.troopsCritical && s.economy.ip < RECRUIT_IP_COST,
    planReport: (s) => ({
      speaker: "미축",
      plan: `모병 자금 긴급 확보 (현재 ${s.economy.ip}/${RECRUIT_IP_COST})`,
    }),
    variations: [
      { dialogue: "관우 장군이 모병 자금을 요청하셨습니다. 최우선으로 확보하겠습니다!", emotion: "worried" },
      {
        dialogue: (s) => `내정포인트 ${RECRUIT_IP_COST - s.economy.ip}만 더 모으면 모병 가능합니다. 서두르겠습니다.`,
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
];

// =====================================================================
//  방통 (외교) 계획 — 15개
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
      { dialogue: "조조에게 사신을 보내 관계를 개선하겠소.", emotion: "thoughtful" },
      { dialogue: "조조와의 적대 관계를 완화할 때요. 사신을 보내겠소.", emotion: "calm" },
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
      { dialogue: "손권에게 화친의 뜻을 전하겠소.", emotion: "thoughtful" },
      { dialogue: "손권과의 관계를 풀어봅시다. 외교가 답이오.", emotion: "calm" },
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
      { dialogue: "적끼리 사이가 좋소? 이 봉추가 갈라놓겠소!", emotion: "excited" },
      { dialogue: "이간계를 펼치겠소. 적의 동맹을 와해시킵시다.", emotion: "excited" },
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
      { dialogue: "우호적인 세력과 정식 동맹을 맺읍시다!", emotion: "excited" },
      { dialogue: "관계가 좋은 쪽과 동맹을 체결하면 큰 힘이 됩니다.", emotion: "thoughtful" },
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
      { dialogue: "힘으로 안 되면 외교로 시간을 벌어야 하오.", emotion: "thoughtful" },
      { dialogue: "적이 너무 강하오. 외교적 완충을 마련합시다.", emotion: "worried" },
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
      plan: "외교포인트 긴급 확보 — DP 회복 대기",
    }),
    variations: [
      { dialogue: "DP가 없어 당장은 손발이 묶였소. 하나 회복되는 즉시 외교에 나서겠소!", emotion: "worried" },
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
];

// =====================================================================
//  제갈량 (전략) 종합 정리 — 20개
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

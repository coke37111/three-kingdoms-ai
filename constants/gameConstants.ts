// ===================== 게임 설정 =====================

export const TURN_LIMIT = 120;

/** AP 이월율: 남은 AP의 50%가 다음 턴으로 이월 */
export const AP_CARRYOVER_RATE = 0.5;

/** 부상병 복구 턴 수 */
export const WOUND_RECOVERY_TURNS = 5;

/** 군주 레벨당 배치 상한 */
export const DEPLOYMENT_PER_LEVEL = 30000;

/** IP 기본 상한 (은행 미건설 시) */
export const BASE_IP_CAP = 100;

/** 시장 레벨당 IP 충전 */
export const IP_REGEN_PER_MARKET_LEVEL = 3;

/** 논 레벨당 IP 충전 */
export const IP_REGEN_PER_FARM_LEVEL = 2;

/** 은행 레벨당 IP 상한 증가 */
export const IP_CAP_PER_BANK_LEVEL = 50;

/** 기본 전투 사망률 (동일 방어력 기준) */
export const BASE_CASUALTY_RATE = 0.2;

/** 최대 전투 사망률 */
export const MAX_CASUALTY_RATE = 0.5;

/** 사망자 중 부상병 전환 비율 */
export const WOUNDED_CONVERSION_RATE = 0.7;

/** 레벨업 필요 경험치 기본값 */
export const BASE_XP_TO_LEVEL = 100;

/** AP 1 소비 시 경험치 획득 */
export const XP_PER_AP_SPENT = 15;

/** 전투 승리 시 SP 획득 */
export const SP_PER_BATTLE_WIN = 5;

/** DP 매턴 자동 충전량 */
export const DP_REGEN_PER_TURN = 1;

/** DP 전환: IP 1 → DP 변환량 */
export const DP_CONVERSION_RATE = 0.5;

/** 시설 건설 IP 기본 비용 (Lv0→1) */
export const FACILITY_BASE_COST = 30;

/** 시설 건설 IP 비용 레벨당 추가분 */
export const FACILITY_COST_PER_LEVEL = 10;

/** 시설 업그레이드 비용 계산: 30 + currentLevel × 10 */
export function getFacilityUpgradeCost(currentLevel: number): number {
  return FACILITY_BASE_COST + currentLevel * FACILITY_COST_PER_LEVEL;
}

/** SP→DP 변환 비용: SP 2 → DP 1 */
export const SP_TO_DP_COST = 2;

/** 내정포인트 1당 모병 가능 병력 수 */
export const RECRUIT_TROOPS_PER_IP = 100;

/** 훈련 IP 비용 (훈련도 0.1당) */
export const TRAIN_IP_COST = 15;

/** 도주 시 추가 병력 손실률 */
export const RETREAT_TROOP_LOSS_RATE = 0.15;

/** 도주 시 사기 하락 */
export const RETREAT_MORALE_PENALTY = -0.1;

/** 공성/수성 시설 피해율 (총 병력 기준) */
export const SIEGE_FACILITY_DAMAGE_RATE = 0.00001;

/** 최대 시설 피해 레벨 */
export const MAX_SIEGE_FACILITY_DAMAGE = 2;

/** 이벤트 발생 확률 */
export const EVENT_TRIGGER_CHANCE = 0.3;

/** 특수 전략 SP 비용 */
export const SPECIAL_STRATEGY_SP_COST = 5;

/** 특수 전략 성공률 */
export const SPECIAL_STRATEGY_SUCCESS_RATE = 0.5;

/** 지원 요청 DP 비용 */
export const SUPPORT_REQUEST_DP_COST = 3;

/** 지원 요청 기본 성공률 */
export const SUPPORT_REQUEST_BASE_RATE = 0.3;

/** 지원 요청 관계점수당 추가 확률 */
export const SUPPORT_REQUEST_RELATION_BONUS = 0.08;

/** 조공 IP 비용 계수 (적 병력 × 이 값, 최소 20) */
export const TRIBUTE_IP_COST_MULTIPLIER = 0.0005;

/** 조공 최소 IP 비용 */
export const TRIBUTE_MIN_IP_COST = 20;

// ===================== Garrison 배분 =====================

/** 본성 병력 예약 비율 */
export const GARRISON_CAPITAL_RATIO = 0.25;

/** 전선 성채 병력 배분 비율 */
export const GARRISON_FRONTLINE_RATIO = 0.55;

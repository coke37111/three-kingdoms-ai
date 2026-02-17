import type { SkillNode } from "@/types/game";

/** 스킬트리 전체 정의 */
export const SKILL_TREE: SkillNode[] = [
  // ============ 행동 계열 ============
  {
    id: "ap_boost_1",
    name: "지도자의 자질",
    description: "매턴 AP 충전량 +0.5",
    cost: 10,
    effect: { type: "ap_regen", value: 0.5 },
    prerequisites: [],
  },
  {
    id: "ap_boost_2",
    name: "왕의 위엄",
    description: "매턴 AP 충전량 +0.5 (총 +1.0)",
    cost: 20,
    effect: { type: "ap_regen", value: 0.5 },
    prerequisites: ["ap_boost_1"],
  },
  {
    id: "ap_boost_3",
    name: "천명의 그릇",
    description: "매턴 AP 충전량 +0.5 (총 +1.5)",
    cost: 40,
    effect: { type: "ap_regen", value: 0.5 },
    prerequisites: ["ap_boost_2"],
  },

  // ============ 군사 계열 ============
  {
    id: "mp_auto_1",
    name: "상비군 체계",
    description: "매턴 훈련도 자동 +0.02",
    cost: 8,
    effect: { type: "mp_auto", value: 0.02 },
    prerequisites: [],
  },
  {
    id: "mp_auto_2",
    name: "정예병 양성",
    description: "매턴 훈련도 자동 +0.03",
    cost: 15,
    effect: { type: "mp_auto", value: 0.03 },
    prerequisites: ["mp_auto_1"],
  },
  {
    id: "siege_buff_1",
    name: "공성 전술",
    description: "공성 시 공격력 +20%",
    cost: 12,
    effect: { type: "siege_buff", value: 0.2 },
    prerequisites: ["mp_auto_1"],
  },
  {
    id: "defense_buff_1",
    name: "철벽 방어",
    description: "수성 시 방어 배율 +50%",
    cost: 12,
    effect: { type: "defense_buff", value: 0.5 },
    prerequisites: ["mp_auto_1"],
  },

  // ============ 내정 계열 ============
  {
    id: "ip_boost_1",
    name: "효율적 행정",
    description: "매턴 IP 충전량 +5",
    cost: 8,
    effect: { type: "ip_bonus", value: 5 },
    prerequisites: [],
  },
  {
    id: "ip_boost_2",
    name: "관료 체계",
    description: "매턴 IP 충전량 +8",
    cost: 18,
    effect: { type: "ip_bonus", value: 8 },
    prerequisites: ["ip_boost_1"],
  },
  {
    id: "cost_reduce_1",
    name: "절약 정책",
    description: "징병/훈련 IP 소비 -15%",
    cost: 15,
    effect: { type: "cost_reduce", value: 0.15 },
    prerequisites: ["ip_boost_1"],
  },

  // ============ 외교 계열 ============
  {
    id: "dp_boost_1",
    name: "외교 수완",
    description: "DP 전환 효율 +20%",
    cost: 10,
    effect: { type: "dp_bonus", value: 0.2 },
    prerequisites: [],
  },
  {
    id: "dp_boost_2",
    name: "합종연횡",
    description: "DP 전환 효율 +30%",
    cost: 25,
    effect: { type: "dp_bonus", value: 0.3 },
    prerequisites: ["dp_boost_1"],
  },
];

/** id로 스킬 조회 */
export function getSkillDef(id: string) {
  return SKILL_TREE.find(s => s.id === id);
}

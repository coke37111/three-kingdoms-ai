import type { Faction, DiplomaticRelation, FactionId } from "@/types/game";

export const INITIAL_FACTIONS: Faction[] = [
  {
    id: "liu_bei",
    rulerName: "유비",
    isPlayer: true,
    points: {
      ap: 3, ap_max: 10, ap_regen: 5,
      sp: 0,
      mp: 0, mp_troops: 50000, mp_training: 0.5, mp_morale: 1.0,
      ip: 30, ip_cap: 100, ip_regen: 10,
      dp: 0,
    },
    castles: ["신야", "박망", "하비"],
    facilities: { market: { count: 2, level: 1 }, farm: { count: 2, level: 1 }, bank: 0 },
    rulerLevel: { level: 2, xp: 0, xpToNext: 100, deploymentCap: 60000 },
    skills: [],
    woundedPool: [],
    recentEvents: [],
    personality: { aggression: 30, diplomacy: 70, development: 80, riskTolerance: 40 },
    color: "#4a8c5c",
    icon: "🟢",
  },
  {
    id: "cao_cao",
    rulerName: "조조",
    isPlayer: false,
    points: {
      ap: 3, ap_max: 5, ap_regen: 3,
      sp: 30,
      mp: 0, mp_troops: 600000, mp_training: 0.8, mp_morale: 1.1,
      ip: 100, ip_cap: 100, ip_regen: 25,
      dp: 5,
    },
    castles: [
      "허창", "업", "낙양", "진류", "장안",
      "완", "남피", "기주", "유주", "서주",
      "소패", "복양", "동군", "하내", "홍농",
      "천수", "안정", "무위", "북해", "평원",
      "양양", "여남", "합비", "수춘",
    ],
    facilities: { market: { count: 24, level: 1 }, farm: { count: 24, level: 1 }, bank: 0 },
    rulerLevel: { level: 20, xp: 0, xpToNext: 100, deploymentCap: 600000 },
    skills: ["ap_boost_1", "ip_boost_1", "mp_auto_1"],
    woundedPool: [],
    recentEvents: [],
    personality: { aggression: 80, diplomacy: 50, development: 60, riskTolerance: 70 },
    color: "#4466aa",
    icon: "🔵",
  },
  {
    id: "sun_quan",
    rulerName: "손권",
    isPlayer: false,
    points: {
      ap: 2, ap_max: 4, ap_regen: 2,
      sp: 10,
      mp: 0, mp_troops: 200000, mp_training: 0.7, mp_morale: 1.0,
      ip: 80, ip_cap: 100, ip_regen: 15,
      dp: 3,
    },
    castles: [
      "건업", "시상", "여강", "강릉",
      "장사", "무릉", "계양", "영릉", "강하",
    ],
    facilities: { market: { count: 9, level: 1 }, farm: { count: 9, level: 1 }, bank: 0 },
    rulerLevel: { level: 8, xp: 0, xpToNext: 100, deploymentCap: 240000 },
    skills: ["ip_boost_1"],
    woundedPool: [],
    recentEvents: [],
    personality: { aggression: 40, diplomacy: 75, development: 75, riskTolerance: 35 },
    color: "#d4443e",
    icon: "🔴",
  },
];

export const INITIAL_RELATIONS: DiplomaticRelation[] = [
  { factionA: "liu_bei", factionB: "cao_cao", score: -5 },
  { factionA: "liu_bei", factionB: "sun_quan", score: 3 },
  { factionA: "sun_quan", factionB: "cao_cao", score: -3 },
];

export const FACTION_NAMES: Record<FactionId, string> = {
  liu_bei: "유비",
  cao_cao: "조조",
  sun_quan: "손권",
};

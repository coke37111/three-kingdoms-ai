import type { Castle } from "@/types/game";

/**
 * 성채 배치 구조 (삼각형)
 *
 * 조조(허창) ←── liu_cao 라인 (~12성) ──→ 유비(신야)
 *   ↓                                       ↓
 * sun_cao 라인 (~9성)              liu_sun 라인 (~5성)
 *   ↓                                       ↓
 * 손권(건업) ←────────────────────────────────┘
 */
export const INITIAL_CASTLES: Castle[] = [
  // ============ 유비 영토 (3성 - 박망 추가) ============
  { name: "신야", grade: "본성", owner: "liu_bei", garrison: 30000, defenseMultiplier: 3.0, maxGarrison: 80000, adjacentCastles: ["하비", "박망"], lineId: "liu_cao" },
  { name: "박망", grade: "일반", owner: "liu_bei", garrison: 15000, defenseMultiplier: 1.5, maxGarrison: 40000, adjacentCastles: ["신야", "양양"], lineId: "liu_cao" },
  { name: "하비", grade: "일반", owner: "liu_bei", garrison: 20000, defenseMultiplier: 1.5, maxGarrison: 50000, adjacentCastles: ["신야", "강하"], lineId: "liu_sun" },

  // ============ 유비↔조조 라인 (liu_cao, ~12성) ============
  { name: "양양", grade: "요새", owner: "cao_cao", garrison: 40000, defenseMultiplier: 2.5, maxGarrison: 80000, adjacentCastles: ["박망", "완"], lineId: "liu_cao" },
  { name: "완", grade: "일반", owner: "cao_cao", garrison: 25000, defenseMultiplier: 1.5, maxGarrison: 60000, adjacentCastles: ["양양", "여남"], lineId: "liu_cao" },
  { name: "여남", grade: "일반", owner: "cao_cao", garrison: 20000, defenseMultiplier: 1.5, maxGarrison: 50000, adjacentCastles: ["완", "소패"], lineId: "liu_cao" },
  { name: "소패", grade: "요새", owner: "cao_cao", garrison: 35000, defenseMultiplier: 2.0, maxGarrison: 70000, adjacentCastles: ["여남", "서주"], lineId: "liu_cao" },
  { name: "서주", grade: "일반", owner: "cao_cao", garrison: 25000, defenseMultiplier: 1.5, maxGarrison: 60000, adjacentCastles: ["소패", "진류", "북해"], lineId: "liu_cao" },
  { name: "진류", grade: "일반", owner: "cao_cao", garrison: 30000, defenseMultiplier: 1.5, maxGarrison: 60000, adjacentCastles: ["서주", "복양"], lineId: "liu_cao" },
  { name: "복양", grade: "일반", owner: "cao_cao", garrison: 20000, defenseMultiplier: 1.5, maxGarrison: 50000, adjacentCastles: ["진류", "동군"], lineId: "liu_cao" },
  { name: "동군", grade: "일반", owner: "cao_cao", garrison: 20000, defenseMultiplier: 1.5, maxGarrison: 50000, adjacentCastles: ["복양", "업", "평원"], lineId: "liu_cao" },
  { name: "업", grade: "요새", owner: "cao_cao", garrison: 50000, defenseMultiplier: 2.5, maxGarrison: 100000, adjacentCastles: ["동군", "낙양", "남피"], lineId: "liu_cao" },
  { name: "낙양", grade: "일반", owner: "cao_cao", garrison: 30000, defenseMultiplier: 1.5, maxGarrison: 70000, adjacentCastles: ["업", "허창"], lineId: "liu_cao" },
  { name: "허창", grade: "본성", owner: "cao_cao", garrison: 80000, defenseMultiplier: 3.0, maxGarrison: 150000, adjacentCastles: ["낙양", "장안", "하내", "수춘"], lineId: "liu_cao" },

  // ============ 조조 후방 (허창에서 분기) ============
  { name: "장안", grade: "요새", owner: "cao_cao", garrison: 40000, defenseMultiplier: 2.0, maxGarrison: 80000, adjacentCastles: ["허창", "천수"], lineId: "sun_cao" },
  { name: "천수", grade: "일반", owner: "cao_cao", garrison: 15000, defenseMultiplier: 1.5, maxGarrison: 40000, adjacentCastles: ["장안", "안정"], lineId: "sun_cao" },
  { name: "안정", grade: "일반", owner: "cao_cao", garrison: 15000, defenseMultiplier: 1.5, maxGarrison: 40000, adjacentCastles: ["천수", "무위"], lineId: "sun_cao" },
  { name: "무위", grade: "일반", owner: "cao_cao", garrison: 10000, defenseMultiplier: 1.5, maxGarrison: 40000, adjacentCastles: ["안정"], lineId: "sun_cao" },
  { name: "하내", grade: "일반", owner: "cao_cao", garrison: 20000, defenseMultiplier: 1.5, maxGarrison: 50000, adjacentCastles: ["허창", "홍농"], lineId: "sun_cao" },
  { name: "홍농", grade: "일반", owner: "cao_cao", garrison: 15000, defenseMultiplier: 1.5, maxGarrison: 40000, adjacentCastles: ["하내"], lineId: "sun_cao" },

  // ============ 조조 북부 (업에서 분기) ============
  { name: "남피", grade: "일반", owner: "cao_cao", garrison: 25000, defenseMultiplier: 1.5, maxGarrison: 60000, adjacentCastles: ["업", "기주"], lineId: "liu_cao" },
  { name: "기주", grade: "요새", owner: "cao_cao", garrison: 35000, defenseMultiplier: 2.0, maxGarrison: 70000, adjacentCastles: ["남피", "유주"], lineId: "liu_cao" },
  { name: "유주", grade: "일반", owner: "cao_cao", garrison: 15000, defenseMultiplier: 1.5, maxGarrison: 40000, adjacentCastles: ["기주"], lineId: "liu_cao" },
  { name: "북해", grade: "일반", owner: "cao_cao", garrison: 15000, defenseMultiplier: 1.5, maxGarrison: 40000, adjacentCastles: ["서주", "평원"], lineId: "liu_cao" },
  { name: "평원", grade: "일반", owner: "cao_cao", garrison: 15000, defenseMultiplier: 1.5, maxGarrison: 40000, adjacentCastles: ["북해", "동군"], lineId: "liu_cao" },

  // ============ 유비↔손권 라인 (liu_sun, ~5성) ============
  { name: "강하", grade: "요새", owner: "sun_quan", garrison: 30000, defenseMultiplier: 2.0, maxGarrison: 60000, adjacentCastles: ["하비", "무릉"], lineId: "liu_sun" },
  { name: "무릉", grade: "일반", owner: "sun_quan", garrison: 15000, defenseMultiplier: 1.5, maxGarrison: 40000, adjacentCastles: ["강하", "장사"], lineId: "liu_sun" },
  { name: "장사", grade: "일반", owner: "sun_quan", garrison: 20000, defenseMultiplier: 1.5, maxGarrison: 50000, adjacentCastles: ["무릉", "건업"], lineId: "liu_sun" },

  // ============ 손권 영토 (8성) ============
  { name: "건업", grade: "본성", owner: "sun_quan", garrison: 50000, defenseMultiplier: 3.0, maxGarrison: 100000, adjacentCastles: ["장사", "시상", "여강"], lineId: "liu_sun" },
  { name: "시상", grade: "일반", owner: "sun_quan", garrison: 20000, defenseMultiplier: 1.5, maxGarrison: 50000, adjacentCastles: ["건업", "강릉"], lineId: "sun_cao" },
  { name: "강릉", grade: "요새", owner: "sun_quan", garrison: 30000, defenseMultiplier: 2.0, maxGarrison: 60000, adjacentCastles: ["시상", "계양"], lineId: "sun_cao" },
  { name: "계양", grade: "일반", owner: "sun_quan", garrison: 15000, defenseMultiplier: 1.5, maxGarrison: 40000, adjacentCastles: ["강릉", "영릉"], lineId: "sun_cao" },
  { name: "영릉", grade: "일반", owner: "sun_quan", garrison: 15000, defenseMultiplier: 1.5, maxGarrison: 40000, adjacentCastles: ["계양"], lineId: "sun_cao" },
  { name: "여강", grade: "일반", owner: "sun_quan", garrison: 20000, defenseMultiplier: 1.5, maxGarrison: 50000, adjacentCastles: ["건업", "합비"], lineId: "sun_cao" },

  // ============ 손권↔조조 라인 (sun_cao, ~4성 완충) ============
  { name: "합비", grade: "요새", owner: "cao_cao", garrison: 40000, defenseMultiplier: 2.5, maxGarrison: 80000, adjacentCastles: ["여강", "수춘"], lineId: "sun_cao" },
  { name: "수춘", grade: "일반", owner: "cao_cao", garrison: 20000, defenseMultiplier: 1.5, maxGarrison: 50000, adjacentCastles: ["합비", "허창"], lineId: "sun_cao" },
];

/** 성채 이름 → Castle 빠른 조회용 */
export function getCastle(castles: Castle[], name: string): Castle | undefined {
  return castles.find(c => c.name === name);
}

/** 세력의 본성 이름 */
export const CAPITAL_CASTLES: Record<string, string> = {
  liu_bei: "신야",
  cao_cao: "허창",
  sun_quan: "건업",
};

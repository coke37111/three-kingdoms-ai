import type { Castle } from "@/types/game";

// ─── SVG 좌표 (900×820 기준, 1.4배 확장) ─────────────────────────────────
export const CASTLE_POSITIONS: Record<string, { x: number; y: number }> = {
  // 조조 (북부/중부)
  "계":      { x: 532, y: 56 },
  "북평":    { x: 605, y: 87 },
  "양평":    { x: 686, y: 64 },   // 공손강
  "남피":    { x: 609, y: 179 },
  "평원":    { x: 648, y: 228 },
  "북해":    { x: 718, y: 199 },
  "업":      { x: 532, y: 228 },
  "낙양":    { x: 413, y: 326 },
  "장안":    { x: 280, y: 336 },
  "진류":    { x: 543, y: 319 },
  "복양":    { x: 591, y: 273 },
  "허창":    { x: 529, y: 379 },
  "완":      { x: 459, y: 417 },
  "여남":    { x: 522, y: 431 },
  "소패":    { x: 626, y: 342 },
  "하비":    { x: 664, y: 378 },
  "수춘":    { x: 661, y: 428 },
  "합비":    { x: 683, y: 452 },
  // 마등 (서북)
  "무위":    { x: 91,  y: 196 },
  "안정":    { x: 179, y: 200 },
  "천수":    { x: 136, y: 280 },
  // 장로
  "한중":    { x: 245, y: 368 },
  // 유장 (촉)
  "검각":    { x: 136, y: 368 },
  "성도":    { x: 160, y: 606 },
  "자동":    { x: 165, y: 522 },
  "강주":    { x: 207, y: 665 },
  // 유비
  "신야":    { x: 451, y: 500 },
  // 유표 (형주)
  "양양":    { x: 438, y: 549 },
  "강하":    { x: 538, y: 538 },
  "강릉":    { x: 445, y: 612 },
  // 손권 (오)
  "건업":    { x: 746, y: 447 },
  "여강":    { x: 683, y: 479 },
  "시상":    { x: 629, y: 538 },
  "오":      { x: 809, y: 472 },
  "회계":    { x: 823, y: 538 },
  // 남중 4소세력
  "무릉":    { x: 409, y: 633 },
  "장사":    { x: 501, y: 728 },
  "영릉":    { x: 452, y: 753 },
  "계양":    { x: 543, y: 753 },
  // 중립 빈땅 (박망 제외)
  "상용":    { x: 339, y: 462 },
  "하구관":  { x: 518, y: 522 },
  "진양":    { x: 546, y: 182 },
  "가맹관":  { x: 186, y: 434 },
  "건녕":    { x: 213, y: 727 },
};

// ─── 세력 본성 ────────────────────────────────────────────────────────────
export const CAPITAL_CASTLES: Record<string, string> = {
  liu_bei:      "신야",
  cao_cao:      "허창",
  sun_quan:     "건업",
  liu_biao:     "양양",
  ma_teng:      "무위",
  zhang_lu:     "한중",
  liu_zhang:    "성도",
  jin_xuan:     "무릉",
  liu_du:       "영릉",
  zhao_fan:     "계양",
  han_xuan:     "장사",
  gongsun_kang: "양평",
};

// ─── 성채 목록 (45성) ────────────────────────────────────────────────────
export const INITIAL_CASTLES: Castle[] = [
  // ═══ 유비 (1성) ═══
  { name: "신야",    grade: "본성", owner: "liu_bei",      garrison: 30000, defenseMultiplier: 3.0, wallLevel: 1, maxGarrison: 80000,  adjacentCastles: ["완", "양양", "여남", "상용", "하구관"], lineId: "liu_cao" },

  // ═══ 조조 (17성) ═══
  { name: "허창",    grade: "본성", owner: "cao_cao",      garrison: 60000, defenseMultiplier: 3.0, wallLevel: 1, maxGarrison: 120000, adjacentCastles: ["낙양", "진류", "완", "여남", "수춘"],          lineId: "liu_cao" },
  { name: "업",      grade: "요새", owner: "cao_cao",      garrison: 35000, defenseMultiplier: 2.5, wallLevel: 1, maxGarrison: 80000,  adjacentCastles: ["남피", "평원", "복양", "낙양", "진양"],        lineId: "north" },
  { name: "낙양",    grade: "요새", owner: "cao_cao",      garrison: 25000, defenseMultiplier: 2.0, wallLevel: 1, maxGarrison: 60000,  adjacentCastles: ["장안", "진류", "업", "허창"],                  lineId: "liu_cao" },
  { name: "장안",    grade: "요새", owner: "cao_cao",      garrison: 20000, defenseMultiplier: 2.0, wallLevel: 1, maxGarrison: 60000,  adjacentCastles: ["낙양", "안정", "천수", "한중"],                lineId: "west" },
  { name: "진류",    grade: "일반", owner: "cao_cao",      garrison: 18000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 45000,  adjacentCastles: ["복양", "낙양", "허창", "소패"],                lineId: "liu_cao" },
  { name: "복양",    grade: "일반", owner: "cao_cao",      garrison: 15000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 40000,  adjacentCastles: ["업", "진류"],                                  lineId: "north" },
  { name: "완",      grade: "일반", owner: "cao_cao",      garrison: 18000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 45000,  adjacentCastles: ["허창", "여남", "신야"],                        lineId: "liu_cao" },
  { name: "여남",    grade: "일반", owner: "cao_cao",      garrison: 16000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 40000,  adjacentCastles: ["허창", "완", "신야", "하구관"],                lineId: "liu_cao" },
  { name: "소패",    grade: "일반", owner: "cao_cao",      garrison: 18000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 45000,  adjacentCastles: ["진류", "하비", "북해"],                        lineId: "liu_cao" },
  { name: "하비",    grade: "일반", owner: "cao_cao",      garrison: 20000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 50000,  adjacentCastles: ["소패", "수춘"],                                lineId: "liu_cao" },
  { name: "수춘",    grade: "일반", owner: "cao_cao",      garrison: 18000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 45000,  adjacentCastles: ["허창", "합비", "하비"],                        lineId: "sun_cao" },
  { name: "합비",    grade: "요새", owner: "cao_cao",      garrison: 28000, defenseMultiplier: 2.5, wallLevel: 1, maxGarrison: 60000,  adjacentCastles: ["수춘", "여강"],                                lineId: "sun_cao" },
  { name: "남피",    grade: "일반", owner: "cao_cao",      garrison: 18000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 45000,  adjacentCastles: ["계", "북평", "업", "진양"],                    lineId: "north" },
  { name: "계",      grade: "일반", owner: "cao_cao",      garrison: 15000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 40000,  adjacentCastles: ["북평", "남피"],                                lineId: "north" },
  { name: "북평",    grade: "일반", owner: "cao_cao",      garrison: 15000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 40000,  adjacentCastles: ["계", "남피", "양평"],                          lineId: "north" },
  { name: "평원",    grade: "일반", owner: "cao_cao",      garrison: 12000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 35000,  adjacentCastles: ["업", "북해"],                                  lineId: "north" },
  { name: "북해",    grade: "일반", owner: "cao_cao",      garrison: 12000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 35000,  adjacentCastles: ["평원", "소패"],                                lineId: "liu_cao" },

  // ═══ 공손강 (1성) ═══
  { name: "양평",    grade: "본성", owner: "gongsun_kang", garrison: 25000, defenseMultiplier: 2.5, wallLevel: 1, maxGarrison: 50000,  adjacentCastles: ["북평"],                                        lineId: "north" },

  // ═══ 마등 (3성) ═══
  { name: "무위",    grade: "본성", owner: "ma_teng",      garrison: 30000, defenseMultiplier: 3.0, wallLevel: 1, maxGarrison: 60000,  adjacentCastles: ["안정"],                                        lineId: "west" },
  { name: "안정",    grade: "일반", owner: "ma_teng",      garrison: 20000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 40000,  adjacentCastles: ["무위", "천수", "장안"],                        lineId: "west" },
  { name: "천수",    grade: "일반", owner: "ma_teng",      garrison: 20000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 40000,  adjacentCastles: ["안정", "장안"],                                lineId: "west" },

  // ═══ 장로 (1성) ═══
  { name: "한중",    grade: "본성", owner: "zhang_lu",     garrison: 35000, defenseMultiplier: 3.0, wallLevel: 1, maxGarrison: 70000,  adjacentCastles: ["장안", "검각", "상용", "가맹관"],              lineId: "west" },

  // ═══ 유장 (4성) ═══
  { name: "성도",    grade: "본성", owner: "liu_zhang",    garrison: 40000, defenseMultiplier: 3.0, wallLevel: 1, maxGarrison: 80000,  adjacentCastles: ["자동", "강주"],                                lineId: "west" },
  { name: "검각",    grade: "요새", owner: "liu_zhang",    garrison: 25000, defenseMultiplier: 2.5, wallLevel: 1, maxGarrison: 50000,  adjacentCastles: ["한중", "자동", "가맹관"],                      lineId: "west" },
  { name: "자동",    grade: "일반", owner: "liu_zhang",    garrison: 20000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 40000,  adjacentCastles: ["검각", "성도"],                                lineId: "west" },
  { name: "강주",    grade: "일반", owner: "liu_zhang",    garrison: 20000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 40000,  adjacentCastles: ["성도", "건녕", "무릉"],                        lineId: "west" },

  // ═══ 유표 (3성) ═══
  { name: "양양",    grade: "본성", owner: "liu_biao",     garrison: 50000, defenseMultiplier: 3.0, wallLevel: 1, maxGarrison: 90000,  adjacentCastles: ["신야", "강하", "강릉"],                        lineId: "liu_sun" },
  { name: "강하",    grade: "일반", owner: "liu_biao",     garrison: 25000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 50000,  adjacentCastles: ["양양", "시상", "하구관"],                      lineId: "liu_sun" },
  { name: "강릉",    grade: "일반", owner: "liu_biao",     garrison: 25000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 50000,  adjacentCastles: ["양양", "무릉", "장사"],                        lineId: "liu_sun" },

  // ═══ 손권 (5성) ═══
  { name: "건업",    grade: "본성", owner: "sun_quan",     garrison: 60000, defenseMultiplier: 3.0, wallLevel: 1, maxGarrison: 120000, adjacentCastles: ["여강", "오", "회계"],                          lineId: "sun_cao" },
  { name: "여강",    grade: "일반", owner: "sun_quan",     garrison: 25000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 50000,  adjacentCastles: ["합비", "건업", "시상"],                        lineId: "sun_cao" },
  { name: "시상",    grade: "일반", owner: "sun_quan",     garrison: 20000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 45000,  adjacentCastles: ["강하", "여강"],                                lineId: "liu_sun" },
  { name: "오",      grade: "일반", owner: "sun_quan",     garrison: 20000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 45000,  adjacentCastles: ["건업", "회계"],                                lineId: "sun_cao" },
  { name: "회계",    grade: "일반", owner: "sun_quan",     garrison: 18000, defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 40000,  adjacentCastles: ["오", "건업"],                                  lineId: "sun_cao" },

  // ═══ 남중 소세력 (1성 각) ═══
  { name: "무릉",    grade: "본성", owner: "jin_xuan",     garrison: 22000, defenseMultiplier: 2.5, wallLevel: 1, maxGarrison: 45000,  adjacentCastles: ["강릉", "장사", "강주", "건녕"],                lineId: "south" },
  { name: "장사",    grade: "본성", owner: "han_xuan",     garrison: 22000, defenseMultiplier: 2.5, wallLevel: 1, maxGarrison: 45000,  adjacentCastles: ["무릉", "영릉", "계양", "강릉"],                lineId: "south" },
  { name: "영릉",    grade: "본성", owner: "liu_du",       garrison: 18000, defenseMultiplier: 2.5, wallLevel: 1, maxGarrison: 40000,  adjacentCastles: ["장사", "계양"],                                lineId: "south" },
  { name: "계양",    grade: "본성", owner: "zhao_fan",     garrison: 18000, defenseMultiplier: 2.5, wallLevel: 1, maxGarrison: 40000,  adjacentCastles: ["장사", "영릉"],                                lineId: "south" },

  // ═══ 중립 빈땅 (5성) ═══
  { name: "상용",    grade: "일반", owner: "neutral",      garrison: 2000,  defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 20000,  adjacentCastles: ["신야", "한중"],                                lineId: "west" },
  { name: "하구관",  grade: "일반", owner: "neutral",      garrison: 2000,  defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 20000,  adjacentCastles: ["신야", "강하", "여남"],                        lineId: "liu_sun" },
  { name: "진양",    grade: "일반", owner: "neutral",      garrison: 2500,  defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 25000,  adjacentCastles: ["남피", "업"],                                  lineId: "north" },
  { name: "가맹관",  grade: "일반", owner: "neutral",      garrison: 2000,  defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 20000,  adjacentCastles: ["한중", "검각"],                                lineId: "west" },
  { name: "건녕",    grade: "일반", owner: "neutral",      garrison: 2000,  defenseMultiplier: 1.5, wallLevel: 1, maxGarrison: 20000,  adjacentCastles: ["강주", "무릉"],                                lineId: "south" },
];

// ─── 성채 이름 → Castle 빠른 조회용 ─────────────────────────────────────
export function getCastle(castles: Castle[], name: string): Castle | undefined {
  return castles.find(c => c.name === name);
}

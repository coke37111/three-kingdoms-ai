import type { TerrainType } from "@/types/game";

export interface CityPosition {
  name: string;
  x: number;
  y: number;
  labelOffset?: { dx: number; dy: number };
}

// SVG viewBox: 0 0 1000 800
// 삼국시대 지리 기반: 북부(원소) → 중원(조조) → 남서(유비) → 동남(손권)
export const CITY_POSITIONS: CityPosition[] = [
  // 원소 영토 (북부)
  { name: "유주", x: 680, y: 80, labelOffset: { dx: 0, dy: -22 } },
  { name: "기주", x: 620, y: 170 },
  { name: "남피", x: 560, y: 250 },

  // 조조 영토 (중원)
  { name: "장안", x: 220, y: 330, labelOffset: { dx: -30, dy: 0 } },
  { name: "낙양", x: 350, y: 350 },
  { name: "업", x: 530, y: 320 },
  { name: "허창", x: 440, y: 440 },
  { name: "진류", x: 500, y: 410 },

  // 유비 영토 + 중립 (서남~중부)
  { name: "완", x: 410, y: 510 },
  { name: "신야", x: 370, y: 560 },
  { name: "한중", x: 210, y: 480, labelOffset: { dx: -30, dy: 0 } },
  { name: "강릉", x: 330, y: 620 },
  { name: "장사", x: 400, y: 680 },

  // 손권 영토 (동남)
  { name: "시상", x: 480, y: 640 },
  { name: "건업", x: 680, y: 570, labelOffset: { dx: 30, dy: 0 } },
  { name: "여강", x: 600, y: 540 },

  // 유비 동부 + 중립
  { name: "소패", x: 550, y: 470 },
  { name: "하비", x: 620, y: 450, labelOffset: { dx: 30, dy: 0 } },
  { name: "서주", x: 680, y: 420, labelOffset: { dx: 30, dy: 0 } },
];

export const TERRAIN_ICON: Record<TerrainType, string> = {
  "평원": "🌾",
  "산지": "⛰️",
  "강": "🌊",
  "요새": "🏯",
};

export function getCityPosition(name: string): CityPosition | undefined {
  return CITY_POSITIONS.find((c) => c.name === name);
}

export const ALL_CITY_NAMES: string[] = CITY_POSITIONS.map((c) => c.name);

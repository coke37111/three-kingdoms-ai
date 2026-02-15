import type { Season } from "@/types/game";

export const SEASONS: Season[] = ["봄", "여름", "가을", "겨울"];

export const SEASON_ICON: Record<Season, string> = {
  "봄": "🌸",
  "여름": "☀️",
  "가을": "🍂",
  "겨울": "❄️",
};

export const SEASON_FOOD_MULTIPLIER: Record<Season, number> = {
  "봄": 1.5,
  "여름": 1,
  "가을": 1.5,
  "겨울": 0.5,
};

export function getSeasonFromMonth(month: number): Season {
  if (month >= 3 && month <= 5) return "봄";
  if (month >= 6 && month <= 8) return "여름";
  if (month >= 9 && month <= 11) return "가을";
  return "겨울"; // 12, 1, 2
}

export const TROOP_FOOD_COST_PER_UNIT = 0.03;

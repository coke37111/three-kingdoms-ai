import type { TerrainType } from "@/types/game";

export interface WorldCity {
  name: string;
  terrain: TerrainType;
  adjacentCities: string[];
  defenseBonus: number; // 지형 방어 보너스 %
}

export const WORLD_MAP: WorldCity[] = [
  // 유비 영토
  { name: "신야", terrain: "평원", adjacentCities: ["완", "허창"], defenseBonus: 0 },
  { name: "하비", terrain: "평원", adjacentCities: ["소패", "서주"], defenseBonus: 0 },

  // 조조 영토
  { name: "허창", terrain: "평원", adjacentCities: ["신야", "완", "낙양", "진류"], defenseBonus: 0 },
  { name: "업", terrain: "평원", adjacentCities: ["낙양", "남피", "진류"], defenseBonus: 0 },
  { name: "낙양", terrain: "요새", adjacentCities: ["허창", "업", "장안"], defenseBonus: 30 },
  { name: "진류", terrain: "평원", adjacentCities: ["허창", "업", "소패"], defenseBonus: 0 },
  { name: "장안", terrain: "요새", adjacentCities: ["낙양", "한중"], defenseBonus: 25 },

  // 손권 영토
  { name: "건업", terrain: "강", adjacentCities: ["시상", "여강"], defenseBonus: 15 },
  { name: "시상", terrain: "강", adjacentCities: ["건업", "강릉", "장사"], defenseBonus: 15 },
  { name: "여강", terrain: "강", adjacentCities: ["건업", "소패"], defenseBonus: 15 },

  // 원소 영토
  { name: "남피", terrain: "평원", adjacentCities: ["업", "기주"], defenseBonus: 0 },
  { name: "기주", terrain: "평원", adjacentCities: ["남피", "유주"], defenseBonus: 0 },
  { name: "유주", terrain: "산지", adjacentCities: ["기주"], defenseBonus: 20 },

  // 중립/쟁탈 가능 지역
  { name: "완", terrain: "평원", adjacentCities: ["신야", "허창"], defenseBonus: 0 },
  { name: "소패", terrain: "평원", adjacentCities: ["하비", "진류", "여강"], defenseBonus: 0 },
  { name: "서주", terrain: "평원", adjacentCities: ["하비"], defenseBonus: 0 },
  { name: "한중", terrain: "산지", adjacentCities: ["장안", "강릉"], defenseBonus: 25 },
  { name: "강릉", terrain: "강", adjacentCities: ["시상", "한중", "장사"], defenseBonus: 15 },
  { name: "장사", terrain: "평원", adjacentCities: ["시상", "강릉"], defenseBonus: 0 },
];

export function getTerrainDefenseBonus(cityName: string): number {
  return WORLD_MAP.find((c) => c.name === cityName)?.defenseBonus ?? 0;
}

export function getAdjacentCities(cityName: string): string[] {
  return WORLD_MAP.find((c) => c.name === cityName)?.adjacentCities ?? [];
}

export function areCitiesAdjacent(cityA: string, cityB: string): boolean {
  const city = WORLD_MAP.find((c) => c.name === cityA);
  return city?.adjacentCities.includes(cityB) ?? false;
}

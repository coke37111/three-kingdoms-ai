import type { GameState } from "@/types/game";

export const INITIAL_STATE: GameState = {
  rulerName: "유비",
  gold: 10000,
  food: 20000,
  totalTroops: 80000,
  popularity: 65,
  currentTurn: 1,
  currentMonth: 3,
  currentSeason: "봄",
  cities: [
    { cityName: "신야", population: 50000, defense: 40, commerce: 55, agriculture: 60, garrison: 50000, governor: "제갈량" },
    { cityName: "하비", population: 35000, defense: 30, commerce: 45, agriculture: 70, garrison: 30000, governor: "미축" },
  ],
  generals: [
    { generalName: "제갈량", warfare: 35, intelligence: 100, leadership: 92, politics: 95, charm: 92, loyalty: 100, currentTask: "참모", location: "신야" },
    { generalName: "관우", warfare: 97, intelligence: 75, leadership: 90, politics: 62, charm: 80, loyalty: 100, currentTask: "순찰", location: "신야" },
    { generalName: "장비", warfare: 98, intelligence: 30, leadership: 55, politics: 20, charm: 45, loyalty: 100, currentTask: "훈련", location: "신야" },
    { generalName: "조운", warfare: 92, intelligence: 76, leadership: 88, politics: 70, charm: 82, loyalty: 95, currentTask: "대기", location: "하비" },
    { generalName: "미축", warfare: 25, intelligence: 35, leadership: 45, politics: 88, charm: 90, loyalty: 88, currentTask: "세금징수", location: "하비" },
  ],
  recentEvents: [],
  pendingTasks: [],
};

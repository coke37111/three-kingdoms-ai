import type { GameState, ResourceCalcResult } from "@/types/game";
import { SEASON_FOOD_MULTIPLIER, TROOP_FOOD_COST_PER_UNIT } from "@/constants/gameConstants";

export function calcResources(state: GameState): ResourceCalcResult {
  let goldIncome = 0;
  let foodProd = 0;

  state.cities.forEach((city) => {
    goldIncome += Math.floor(city.commerce * city.population / 1000);
    foodProd += Math.floor(
      city.agriculture * city.population / 500 * (SEASON_FOOD_MULTIPLIER[state.currentSeason] ?? 1)
    );
  });

  return {
    goldIncome,
    foodProd,
    foodCost: state.totalTroops * TROOP_FOOD_COST_PER_UNIT,
  };
}

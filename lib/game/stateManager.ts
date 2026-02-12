import type { GameState, StateChanges, ResourceDeltas } from "@/types/game";

export interface ApplyResult {
  nextState: GameState;
  deltas: ResourceDeltas;
  resultMessage: string | null;
}

export function applyStateChanges(prev: GameState, changes: StateChanges): ApplyResult {
  const next = { ...prev };
  const deltas: ResourceDeltas = { gold: 0, food: 0, troops: 0, popularity: 0 };

  if (changes.gold_delta) {
    next.gold = Math.max(0, next.gold + changes.gold_delta);
    deltas.gold = changes.gold_delta;
  }
  if (changes.food_delta) {
    next.food = Math.max(0, next.food + changes.food_delta);
    deltas.food = changes.food_delta;
  }
  if (changes.troops_delta) {
    next.totalTroops = Math.max(0, next.totalTroops + changes.troops_delta);
    deltas.troops = changes.troops_delta;
  }
  if (changes.popularity_delta) {
    next.popularity = Math.max(0, Math.min(100, next.popularity + changes.popularity_delta));
    deltas.popularity = changes.popularity_delta;
  }

  if (changes.city_updates) {
    next.cities = next.cities.map((c) => {
      const u = changes.city_updates!.find((x) => x.city === c.cityName);
      if (!u) return c;
      return {
        ...c,
        defense: u.defense_delta ? Math.max(0, Math.min(100, c.defense + u.defense_delta)) : c.defense,
        commerce: u.commerce_delta ? Math.max(0, Math.min(100, c.commerce + u.commerce_delta)) : c.commerce,
        agriculture: u.agriculture_delta ? Math.max(0, Math.min(100, c.agriculture + u.agriculture_delta)) : c.agriculture,
      };
    });
  }

  if (changes.general_updates) {
    next.generals = next.generals.map((g) => {
      const u = changes.general_updates!.find((x) => x.name === g.generalName);
      if (!u) return g;
      return {
        ...g,
        currentTask: u.task || g.currentTask,
        loyalty: u.loyalty_delta ? Math.max(0, Math.min(100, g.loyalty + u.loyalty_delta)) : g.loyalty,
      };
    });
  }

  if (changes.new_events) {
    next.recentEvents = [...(next.recentEvents || []), ...changes.new_events].slice(-5);
  }

  return {
    nextState: next,
    deltas,
    resultMessage: changes.result_message || null,
  };
}

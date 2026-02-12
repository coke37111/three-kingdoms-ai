import { useCallback } from "react";
import type { WorldState, Faction, GameTask, ResourceDeltas } from "@/types/game";
import type { ChatMessage } from "@/types/chat";
import { calcResources } from "@/lib/game/resourceCalculator";
import { checkEvents } from "@/lib/game/eventSystem";
import { advanceTreaties } from "@/lib/game/diplomacySystem";
import { SEASONS, SEASON_ICON, SEASON_FOOD_MULTIPLIER, TROOP_FOOD_COST_PER_UNIT } from "@/constants/gameConstants";

interface UseWorldTurnParams {
  worldStateRef: React.MutableRefObject<WorldState>;
  setWorldState: React.Dispatch<React.SetStateAction<WorldState>>;
  setDeltas: React.Dispatch<React.SetStateAction<ResourceDeltas>>;
  setTasks: React.Dispatch<React.SetStateAction<GameTask[]>>;
  addMessage: (msg: ChatMessage) => void;
}

function calcFactionResources(faction: Faction, season: string) {
  const sm = SEASON_FOOD_MULTIPLIER;
  let goldIncome = 0;
  let foodProd = 0;
  faction.cities.forEach((c) => {
    goldIncome += Math.floor(c.commerce * c.population / 1000);
    foodProd += Math.floor(c.agriculture * c.population / 500 * (sm[season as keyof typeof sm] ?? 1));
  });
  const foodCost = faction.totalTroops * TROOP_FOOD_COST_PER_UNIT;
  return { goldIncome, foodProd, foodCost };
}

export function useWorldTurn({
  worldStateRef,
  setWorldState,
  setDeltas,
  setTasks,
  addMessage,
}: UseWorldTurnParams) {
  const advanceWorldTurn = useCallback(() => {
    const world = worldStateRef.current;
    const player = world.factions.find((f) => f.isPlayer)!;
    const r = calcResources({
      rulerName: player.rulerName,
      gold: player.gold,
      food: player.food,
      totalTroops: player.totalTroops,
      popularity: player.popularity,
      currentTurn: world.currentTurn,
      currentSeason: world.currentSeason,
      cities: player.cities,
      generals: player.generals,
      recentEvents: player.recentEvents,
      pendingTasks: player.pendingTasks,
    });

    const si = SEASONS.indexOf(world.currentSeason);
    const ns = SEASONS[(si + 1) % 4];
    const netFood = r.foodProd - r.foodCost;

    setWorldState((prev) => {
      // Update all factions' resources
      const updatedFactions = prev.factions.map((faction) => {
        const res = calcFactionResources(faction, ns);
        const fNetFood = res.foodProd - res.foodCost;
        return {
          ...faction,
          gold: Math.max(0, faction.gold + res.goldIncome),
          food: Math.max(0, faction.food + fNetFood),
        };
      });

      return {
        ...prev,
        currentTurn: prev.currentTurn + 1,
        currentSeason: ns,
        factions: updatedFactions,
        relations: advanceTreaties(prev.relations),
        currentFactionIndex: 0,
      };
    });

    setDeltas({ gold: r.goldIncome, food: netFood, troops: 0, popularity: 0 });
    setTasks((prev) =>
      prev
        .map((t) => ({
          ...t,
          urgency: Math.min(100, t.urgency + 10),
          turnsRemaining: t.turnsRemaining > 0 ? t.turnsRemaining - 1 : t.turnsRemaining,
        }))
        .filter((t) => t.turnsRemaining !== 0)
    );

    addMessage({
      role: "system",
      content: `🏯 第${world.currentTurn + 1}턴 — ${ns} ${SEASON_ICON[ns]} | 금 +${r.goldIncome.toLocaleString()} | 식량 ${netFood >= 0 ? "+" : ""}${netFood.toLocaleString()}`,
    });
  }, [worldStateRef, setWorldState, setDeltas, setTasks, addMessage]);

  const checkAndTriggerEvents = useCallback(() => {
    const world = worldStateRef.current;
    const player = world.factions.find((f) => f.isPlayer)!;

    const result = checkEvents({
      rulerName: player.rulerName,
      gold: player.gold,
      food: player.food,
      totalTroops: player.totalTroops,
      popularity: player.popularity,
      currentTurn: world.currentTurn,
      currentSeason: world.currentSeason,
      cities: player.cities,
      generals: player.generals,
      recentEvents: player.recentEvents,
      pendingTasks: player.pendingTasks,
    });

    if (result.eventPrompt && result.newEvent && result.newTask) {
      setWorldState((prev) => ({
        ...prev,
        factions: prev.factions.map((f) =>
          f.isPlayer
            ? { ...f, recentEvents: [...(f.recentEvents || []), result.newEvent!].slice(-5) }
            : f,
        ),
      }));
      setTasks((prev) => [...prev, result.newTask!]);
    }

    return result.eventPrompt;
  }, [worldStateRef, setWorldState, setTasks]);

  return { advanceWorldTurn, checkAndTriggerEvents };
}

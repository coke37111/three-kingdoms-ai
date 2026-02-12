import { useCallback } from "react";
import type { WorldState, Faction, GameTask, ResourceDeltas } from "@/types/game";
import type { ChatMessage } from "@/types/chat";
import { calcResources } from "@/lib/game/resourceCalculator";
import { checkEvents } from "@/lib/game/eventSystem";
import { advanceTreaties } from "@/lib/game/diplomacySystem";
import { SEASON_ICON, SEASON_FOOD_MULTIPLIER, TROOP_FOOD_COST_PER_UNIT, getSeasonFromMonth } from "@/constants/gameConstants";

interface UseWorldTurnParams {
  worldStateRef: React.MutableRefObject<WorldState>;
  setWorldState: React.Dispatch<React.SetStateAction<WorldState>>;
  setDeltas: (d: ResourceDeltas) => void;
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
    // 자원 계산을 functional updater 내부로 이동 → prev에서 읽어 항상 최신 상태 보장 (BUG 7)
    let playerDeltas = { goldIncome: 0, netFood: 0 };
    let turnMessage = "";

    setWorldState((prev) => {
      const player = prev.factions.find((f) => f.isPlayer)!;
      const r = calcResources({
        rulerName: player.rulerName,
        gold: player.gold,
        food: player.food,
        totalTroops: player.totalTroops,
        popularity: player.popularity,
        currentTurn: prev.currentTurn,
        currentMonth: prev.currentMonth,
        currentSeason: prev.currentSeason,
        cities: player.cities,
        generals: player.generals,
        recentEvents: player.recentEvents,
        pendingTasks: player.pendingTasks,
      });

      const nextMonth = (prev.currentMonth % 12) + 1;
      const ns = getSeasonFromMonth(nextMonth);
      const netFood = r.foodProd - r.foodCost;

      // updater 바깥의 변수로 캡처
      playerDeltas = { goldIncome: r.goldIncome, netFood };
      turnMessage = `🏯 第${prev.currentTurn + 1}턴 — ${nextMonth}월 ${SEASON_ICON[ns]} ${ns} | 금 +${r.goldIncome.toLocaleString()} | 식량 ${netFood >= 0 ? "+" : ""}${netFood.toLocaleString()}`;

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
        currentMonth: nextMonth,
        currentSeason: ns,
        factions: updatedFactions,
        relations: advanceTreaties(prev.relations),
        currentFactionIndex: 0,
      };
    });

    setDeltas({ gold: playerDeltas.goldIncome, food: playerDeltas.netFood, troops: 0, popularity: 0 });
    setTasks((prev) =>
      prev
        .map((t) => ({
          ...t,
          urgency: Math.min(100, t.urgency + 10),
          turnsRemaining: t.turnsRemaining > 0 ? t.turnsRemaining - 1 : t.turnsRemaining,
        }))
        .filter((t) => t.turnsRemaining !== 0)
    );

    addMessage({ role: "system", content: turnMessage });
  }, [setWorldState, setDeltas, setTasks, addMessage]);

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
      currentMonth: world.currentMonth,
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

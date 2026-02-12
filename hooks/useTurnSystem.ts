import { useCallback } from "react";
import type { GameState, GameTask, ResourceDeltas } from "@/types/game";
import type { ChatMessage } from "@/types/chat";
import { calcResources } from "@/lib/game/resourceCalculator";
import { checkEvents } from "@/lib/game/eventSystem";
import { SEASONS, SEASON_ICON } from "@/constants/gameConstants";

interface UseTurnSystemParams {
  gameStateRef: React.MutableRefObject<GameState>;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  setDeltas: React.Dispatch<React.SetStateAction<ResourceDeltas>>;
  setTasks: React.Dispatch<React.SetStateAction<GameTask[]>>;
  addMessage: (msg: ChatMessage) => void;
}

export function useTurnSystem({
  gameStateRef,
  setGameState,
  setDeltas,
  setTasks,
  addMessage,
}: UseTurnSystemParams) {
  const advanceTurn = useCallback(() => {
    const st = gameStateRef.current;
    const r = calcResources(st);
    const si = SEASONS.indexOf(st.currentSeason);
    const ns = SEASONS[(si + 1) % 4];
    const netFood = r.foodProd - r.foodCost;

    setGameState((prev) => ({
      ...prev,
      currentTurn: prev.currentTurn + 1,
      currentSeason: ns,
      gold: Math.max(0, prev.gold + r.goldIncome),
      food: Math.max(0, prev.food + netFood),
    }));
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
      content: `🏯 第${st.currentTurn + 1}턴 — ${ns} ${SEASON_ICON[ns]} | 금 +${r.goldIncome.toLocaleString()} | 식량 ${netFood >= 0 ? "+" : ""}${netFood.toLocaleString()}`,
    });
  }, [gameStateRef, setGameState, setDeltas, setTasks, addMessage]);

  const checkAndTriggerEvents = useCallback(() => {
    const st = gameStateRef.current;
    const result = checkEvents(st);

    if (result.eventPrompt && result.newEvent && result.newTask) {
      setGameState((prev) => ({
        ...prev,
        recentEvents: [...(prev.recentEvents || []), result.newEvent!].slice(-5),
      }));
      setTasks((prev) => [...prev, result.newTask!]);
    }

    return result.eventPrompt;
  }, [gameStateRef, setGameState, setTasks]);

  return { advanceTurn, checkAndTriggerEvents };
}

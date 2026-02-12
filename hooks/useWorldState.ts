import { useState, useRef, useCallback } from "react";
import type { WorldState, Faction, FactionId, StateChanges, ResourceDeltas } from "@/types/game";
import type { ChatMessage } from "@/types/chat";
import { applyStateChanges } from "@/lib/game/stateManager";
import { INITIAL_FACTIONS, INITIAL_RELATIONS } from "@/constants/factions";

const ZERO_DELTAS: ResourceDeltas = { gold: 0, food: 0, troops: 0, popularity: 0 };

function createInitialWorldState(): WorldState {
  return {
    currentTurn: 1,
    currentMonth: 3,
    currentSeason: "봄",
    factions: INITIAL_FACTIONS,
    relations: INITIAL_RELATIONS,
    turnOrder: ["liu_bei", "cao_cao", "sun_quan", "yuan_shao"],
    currentFactionIndex: 0,
  };
}

export function useWorldState() {
  const [worldState, setWorldStateRaw] = useState<WorldState>(createInitialWorldState);
  const [deltas, setDeltas] = useState<ResourceDeltas>(ZERO_DELTAS);
  const worldStateRef = useRef<WorldState>(worldState);

  // useEffect 기반 동기화 제거 → functional updater 내부에서 즉시 동기화 (BUG 6)
  const setWorldState: typeof setWorldStateRaw = useCallback((updater) => {
    setWorldStateRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      worldStateRef.current = next;
      return next;
    });
  }, []);

  // deltas 자동 리셋 (기존 유지)
  const [, setDeltaTimer] = useState<NodeJS.Timeout | null>(null);
  const setDeltasWithReset = useCallback((nd: ResourceDeltas) => {
    setDeltas(nd);
    setDeltaTimer((prev) => {
      if (prev) clearTimeout(prev);
      return setTimeout(() => setDeltas(ZERO_DELTAS), 2200);
    });
  }, []);

  const getPlayerFaction = useCallback((): Faction => {
    return worldState.factions.find((f) => f.isPlayer)!;
  }, [worldState]);

  const getNPCFactions = useCallback((): Faction[] => {
    return worldState.factions.filter((f) => !f.isPlayer);
  }, [worldState]);

  const getFactionById = useCallback((id: FactionId): Faction | undefined => {
    return worldState.factions.find((f) => f.id === id);
  }, [worldState]);

  const updateFaction = useCallback((factionId: FactionId, updater: (f: Faction) => Faction) => {
    setWorldState((prev) => ({
      ...prev,
      factions: prev.factions.map((f) => f.id === factionId ? updater(f) : f),
    }));
  }, [setWorldState]);

  const applyPlayerChanges = useCallback((
    changes: StateChanges,
    addMessage: (msg: ChatMessage) => void,
    dialogue?: string,
  ) => {
    let pendingMessage: string | null = null;

    setWorldState((prev) => {
      const player = prev.factions.find((f) => f.isPlayer);
      if (!player) return prev;

      const playerAsGameState = {
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
      };

      const { nextState, deltas: nd, resultMessage } = applyStateChanges(playerAsGameState, changes);
      setDeltasWithReset(nd);

      if (resultMessage && !(dialogue && dialogue.includes(resultMessage))) {
        pendingMessage = resultMessage;
      }

      return {
        ...prev,
        factions: prev.factions.map((f) =>
          f.isPlayer
            ? {
                ...f,
                gold: nextState.gold,
                food: nextState.food,
                totalTroops: nextState.totalTroops,
                popularity: nextState.popularity,
                cities: nextState.cities,
                generals: nextState.generals,
                recentEvents: nextState.recentEvents,
              }
            : f,
        ),
      };
    });

    if (pendingMessage) {
      addMessage({ role: "system", content: `📜 ${pendingMessage}` });
    }
  }, [setWorldState, setDeltasWithReset]);

  const loadWorldState = useCallback((state: WorldState) => {
    worldStateRef.current = state;
    setWorldStateRaw(state);
  }, []);

  return {
    worldState,
    setWorldState,
    worldStateRef,
    deltas,
    setDeltas: setDeltasWithReset,
    getPlayerFaction,
    getNPCFactions,
    getFactionById,
    updateFaction,
    applyPlayerChanges,
    loadWorldState,
  };
}

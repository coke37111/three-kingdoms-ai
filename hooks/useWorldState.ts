import { useState, useRef, useEffect, useCallback } from "react";
import type { WorldState, Faction, FactionId, StateChanges, ResourceDeltas } from "@/types/game";
import type { ChatMessage } from "@/types/chat";
import { applyStateChanges } from "@/lib/game/stateManager";
import { INITIAL_FACTIONS, INITIAL_RELATIONS } from "@/constants/factions";

const ZERO_DELTAS: ResourceDeltas = { gold: 0, food: 0, troops: 0, popularity: 0 };

function createInitialWorldState(): WorldState {
  return {
    currentTurn: 1,
    currentSeason: "봄",
    factions: INITIAL_FACTIONS,
    relations: INITIAL_RELATIONS,
    turnOrder: ["liu_bei", "cao_cao", "sun_quan", "yuan_shao"],
    currentFactionIndex: 0,
  };
}

export function useWorldState() {
  const [worldState, setWorldState] = useState<WorldState>(createInitialWorldState);
  const [deltas, setDeltas] = useState<ResourceDeltas>(ZERO_DELTAS);
  const worldStateRef = useRef<WorldState>(worldState);

  useEffect(() => {
    worldStateRef.current = worldState;
  }, [worldState]);

  useEffect(() => {
    if (deltas.gold || deltas.food || deltas.troops || deltas.popularity) {
      const t = setTimeout(() => setDeltas(ZERO_DELTAS), 2200);
      return () => clearTimeout(t);
    }
  }, [deltas]);

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
  }, []);

  const applyPlayerChanges = useCallback((
    changes: StateChanges,
    addMessage: (msg: ChatMessage) => void,
  ) => {
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
        currentSeason: prev.currentSeason,
        cities: player.cities,
        generals: player.generals,
        recentEvents: player.recentEvents,
        pendingTasks: player.pendingTasks,
      };

      const { nextState, deltas: nd, resultMessage } = applyStateChanges(playerAsGameState, changes);
      setDeltas(nd);

      if (resultMessage) {
        addMessage({ role: "system", content: `📜 ${resultMessage}` });
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
  }, []);

  const loadWorldState = useCallback((state: WorldState) => {
    setWorldState(state);
  }, []);

  return {
    worldState,
    setWorldState,
    worldStateRef,
    deltas,
    setDeltas,
    getPlayerFaction,
    getNPCFactions,
    getFactionById,
    updateFaction,
    applyPlayerChanges,
    loadWorldState,
  };
}

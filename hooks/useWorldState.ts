import { useState, useRef, useCallback, useEffect } from "react";
import type { WorldState, Faction, FactionId, StateChanges, PointDeltas, Castle } from "@/types/game";
import type { ChatMessage } from "@/types/chat";
import { applyStateChanges } from "@/lib/game/stateManager";
import { INITIAL_FACTIONS, INITIAL_RELATIONS } from "@/constants/factions";
import { INITIAL_CASTLES } from "@/constants/castles";
import { TURN_LIMIT } from "@/constants/gameConstants";
import { syncGarrisonToState } from "@/lib/game/garrisonSystem";

function syncAllGarrisons(state: WorldState): WorldState {
  let castles = [...state.castles];
  for (const faction of state.factions) {
    const updates = syncGarrisonToState(faction, castles);
    for (const cu of updates) {
      castles = castles.map(c =>
        c.name === cu.castle && cu.garrison_delta != null
          ? { ...c, garrison: Math.max(0, Math.min(c.maxGarrison, c.garrison + cu.garrison_delta)) }
          : c
      );
    }
  }
  return { ...state, castles };
}

function createInitialWorldState(): WorldState {
  const base: WorldState = {
    currentTurn: 1,
    maxTurns: TURN_LIMIT,
    factions: INITIAL_FACTIONS,
    castles: INITIAL_CASTLES,
    relations: INITIAL_RELATIONS,
    turnOrder: ["liu_bei", "cao_cao", "sun_quan"],
  };
  return syncAllGarrisons(base);
}

export function useWorldState() {
  const [worldState, setWorldStateRaw] = useState<WorldState>(createInitialWorldState);
  const worldStateRef = useRef<WorldState>(worldState);

  const setWorldState: typeof setWorldStateRaw = useCallback((updater) => {
    setWorldStateRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      worldStateRef.current = next;
      return next;
    });
  }, []);

  const getPlayerFaction = useCallback((): Faction => {
    return worldStateRef.current.factions.find(f => f.isPlayer)!;
  }, []);

  const getNPCFactions = useCallback((): Faction[] => {
    return worldStateRef.current.factions.filter(f => !f.isPlayer);
  }, []);

  const getFactionById = useCallback((id: FactionId): Faction | undefined => {
    return worldStateRef.current.factions.find(f => f.id === id);
  }, []);

  const updateFaction = useCallback((factionId: FactionId, updater: (f: Faction) => Faction) => {
    setWorldState(prev => ({
      ...prev,
      factions: prev.factions.map(f => f.id === factionId ? updater(f) : f),
    }));
  }, [setWorldState]);

  /** StateChanges를 플레이어 세력에 적용 */
  const applyPlayerChanges = useCallback((
    changes: StateChanges,
    addMessage: (msg: ChatMessage) => void,
  ) => {
    let pendingMessage: string | null = null;

    setWorldState(prev => {
      const player = prev.factions.find(f => f.isPlayer);
      if (!player) return prev;

      const { nextFaction, nextCastles, resultMessage } = applyStateChanges(
        player,
        changes,
        prev.castles,
      );

      if (resultMessage) pendingMessage = resultMessage;

      return {
        ...prev,
        castles: nextCastles,
        factions: prev.factions.map(f => {
          if (f.isPlayer) return nextFaction;
          // 다른 세력의 성채 목록도 동기화
          return {
            ...f,
            castles: nextCastles.filter(c => c.owner === f.id).map(c => c.name),
          };
        }),
      };
    });

    if (pendingMessage) {
      addMessage({ role: "system", content: `📜 ${pendingMessage}` });
    }
  }, [setWorldState]);

  /** StateChanges를 NPC 세력에 적용 */
  const applyNPCChanges = useCallback((
    factionId: FactionId,
    changes: StateChanges,
  ) => {
    setWorldState(prev => {
      const faction = prev.factions.find(f => f.id === factionId);
      if (!faction) return prev;

      const { nextFaction, nextCastles } = applyStateChanges(
        faction,
        changes,
        prev.castles,
      );

      return {
        ...prev,
        castles: nextCastles,
        factions: prev.factions.map(f => {
          if (f.id === factionId) return nextFaction;
          // 다른 세력의 성채 목록도 동기화
          return {
            ...f,
            castles: nextCastles.filter(c => c.owner === f.id).map(c => c.name),
          };
        }),
      };
    });
  }, [setWorldState]);

  const loadWorldState = useCallback((state: WorldState) => {
    const synced = syncAllGarrisons(state);
    worldStateRef.current = synced;
    setWorldStateRaw(synced);
  }, []);

  return {
    worldState,
    setWorldState,
    worldStateRef,
    getPlayerFaction,
    getNPCFactions,
    getFactionById,
    updateFaction,
    applyPlayerChanges,
    applyNPCChanges,
    loadWorldState,
  };
}

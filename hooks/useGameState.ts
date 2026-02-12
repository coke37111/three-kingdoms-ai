import { useState, useRef, useEffect, useCallback } from "react";
import type { GameState, StateChanges, ResourceDeltas } from "@/types/game";
import type { ChatMessage } from "@/types/chat";
import { applyStateChanges } from "@/lib/game/stateManager";
import { INITIAL_STATE } from "@/constants/initialState";

const ZERO_DELTAS: ResourceDeltas = { gold: 0, food: 0, troops: 0, popularity: 0 };

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [deltas, setDeltas] = useState<ResourceDeltas>(ZERO_DELTAS);
  const gameStateRef = useRef<GameState>(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (deltas.gold || deltas.food || deltas.troops || deltas.popularity) {
      const t = setTimeout(() => setDeltas(ZERO_DELTAS), 2200);
      return () => clearTimeout(t);
    }
  }, [deltas]);

  const applyChanges = useCallback((
    changes: StateChanges,
    addMessage: (msg: ChatMessage) => void,
  ) => {
    setGameState((prev) => {
      const { nextState, deltas: nd, resultMessage } = applyStateChanges(prev, changes);
      setDeltas(nd);
      if (resultMessage) {
        addMessage({ role: "system", content: `📜 ${resultMessage}` });
      }
      return nextState;
    });
  }, []);

  return {
    gameState,
    setGameState,
    gameStateRef,
    deltas,
    setDeltas,
    applyChanges,
  };
}

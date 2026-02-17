import { useCallback } from "react";
import type { WorldState } from "@/types/game";
import type { ChatMessage } from "@/types/chat";
import { calcPointsForTurn } from "@/lib/game/pointCalculator";

interface UseWorldTurnParams {
  worldStateRef: React.MutableRefObject<WorldState>;
  setWorldState: React.Dispatch<React.SetStateAction<WorldState>>;
  addMessage: (msg: ChatMessage) => void;
}

export function useWorldTurn({
  worldStateRef,
  setWorldState,
  addMessage,
}: UseWorldTurnParams) {
  /** 턴 전진: 모든 세력 포인트 충전 + 부상 회복 */
  const advanceWorldTurn = useCallback(() => {
    const prev = worldStateRef.current;
    const player = prev.factions.find(f => f.isPlayer)!;
    const { recoveredTroops } = calcPointsForTurn(player);

    setWorldState(prev => {
      const updatedFactions = prev.factions.map(faction => {
        const { nextPoints, nextWoundedPool } = calcPointsForTurn(faction);
        return {
          ...faction,
          points: nextPoints,
          woundedPool: nextWoundedPool,
        };
      });

      return {
        ...prev,
        currentTurn: prev.currentTurn + 1,
        factions: updatedFactions,
      };
    });

    const nextTurn = prev.currentTurn + 1;
    let msg = `📅 第${nextTurn}턴 시작 | AP 충전됨`;
    if (recoveredTroops > 0) {
      msg += ` | 부상병 ${recoveredTroops.toLocaleString()}명 복귀`;
    }
    addMessage({ role: "system", content: msg });
  }, [worldStateRef, setWorldState, addMessage]);

  return { advanceWorldTurn };
}

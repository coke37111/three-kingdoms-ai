import { useState, useRef, useCallback, useEffect } from "react";
import type { WorldState, Faction, FactionId, StateChanges, ResourceDeltas } from "@/types/game";
import type { ChatMessage } from "@/types/chat";
import { applyStateChanges } from "@/lib/game/stateManager";
import { INITIAL_FACTIONS, INITIAL_RELATIONS } from "@/constants/factions";
import { ALL_CITY_NAMES } from "@/constants/mapPositions";

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

  // deltas 자동 리셋 — useRef + useEffect cleanup
  const deltaTimerRef = useRef<NodeJS.Timeout | null>(null);
  const setDeltasWithReset = useCallback((nd: ResourceDeltas) => {
    setDeltas(nd);
    if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    deltaTimerRef.current = setTimeout(() => setDeltas(ZERO_DELTAS), 2200);
  }, []);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    };
  }, []);

  const getPlayerFaction = useCallback((): Faction => {
    return worldStateRef.current.factions.find((f) => f.isPlayer)!;
  }, []);

  const getNPCFactions = useCallback((): Faction[] => {
    return worldStateRef.current.factions.filter((f) => !f.isPlayer);
  }, []);

  const getFactionById = useCallback((id: FactionId): Faction | undefined => {
    return worldStateRef.current.factions.find((f) => f.id === id);
  }, []);

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

      // 점령 도시 감지: conquered_cities 또는 이벤트/메시지에서 자동 추출
      let conqueredNames = changes.conquered_cities || [];

      // 폴백: conquered_cities 없으면 new_events/result_message에서 도시명+점령 키워드 감지
      if (conqueredNames.length === 0) {
        const conquestKeywords = ["점령", "함락", "확보", "탈취", "장악"];
        const textSources = [
          ...(changes.new_events || []),
          changes.result_message || "",
        ].join(" ");
        if (conquestKeywords.some((kw) => textSources.includes(kw))) {
          const detected = ALL_CITY_NAMES.filter(
            (name) => textSources.includes(name) && !player.cities.some((c) => c.cityName === name)
          );
          if (detected.length > 0) conqueredNames = detected;
        }
      }

      const conqueredCities: typeof player.cities = [];

      let updatedFactions = prev.factions;
      if (conqueredNames.length > 0) {
        updatedFactions = updatedFactions.map((f) => {
          if (f.isPlayer) return f; // 플레이어는 아래서 별도 처리
          const lost = f.cities.filter((c) => conqueredNames.includes(c.cityName));
          if (lost.length === 0) return f;
          conqueredCities.push(...lost);
          return {
            ...f,
            cities: f.cities.filter((c) => !conqueredNames.includes(c.cityName)),
          };
        });
      }

      return {
        ...prev,
        factions: updatedFactions.map((f) =>
          f.isPlayer
            ? {
                ...f,
                gold: nextState.gold,
                food: nextState.food,
                totalTroops: nextState.totalTroops,
                popularity: nextState.popularity,
                cities: [...nextState.cities, ...conqueredCities.map((c) => ({ ...c, garrison: Math.min(c.garrison, 10000) }))],
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

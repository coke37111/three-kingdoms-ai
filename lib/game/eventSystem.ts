import type { GameState, GameTask } from "@/types/game";
import { RANDOM_EVENTS } from "@/constants/events";

export interface EventCheckResult {
  eventPrompt: string | null;
  newEvent: string | null;
  newTask: GameTask | null;
}

export function checkEvents(state: GameState): EventCheckResult {
  const triggered = RANDOM_EVENTS.filter(
    (e) => e.condition(state) && Math.random() < e.prob
  );

  if (triggered.length > 0) {
    const ev = triggered[Math.floor(Math.random() * triggered.length)];
    return {
      eventPrompt: ev.prompt,
      newEvent: ev.prompt,
      newTask: {
        title: ev.name,
        urgency: ev.priority * 15,
        turnsRemaining: ev.priority >= 4 ? 3 : 5,
      },
    };
  }

  return { eventPrompt: null, newEvent: null, newTask: null };
}

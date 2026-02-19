import type { WorldState, GameEvent, EventType, FactionId, PointDeltas } from "@/types/game";
import { EVENT_TRIGGER_CHANCE } from "@/constants/gameConstants";

interface EventTemplate {
  type: EventType;
  emoji: string;
  description: string;
  effects: PointDeltas;
  weight: number;
  condition?: (faction: WorldState["factions"][0]) => boolean;
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: "풍년",
    emoji: "🌾",
    description: "풍년이 들어 내정 수입이 증가했습니다.",
    effects: { ip_delta: 15 },
    weight: 20,
  },
  {
    type: "흉년",
    emoji: "🥀",
    description: "흉년이 들어 내정 수입이 감소했습니다.",
    effects: { ip_delta: -10 },
    weight: 15,
  },
  {
    type: "반란",
    emoji: "🔥",
    description: "영내에서 반란이 일어나 병력과 사기가 하락했습니다.",
    effects: { mp_troops_delta: -5000, mp_morale_delta: -0.05 },
    weight: 10,
    condition: (f) => f.points.mp_troops > 20000,
  },
  {
    type: "인재_발견",
    emoji: "🧠",
    description: "뛰어난 인재를 발견하여 전략 포인트가 증가했습니다.",
    effects: { sp_delta: 3 },
    weight: 10,
  },
  {
    type: "역병",
    emoji: "☠️",
    description: "역병이 돌아 병력이 크게 감소했습니다.",
    effects: { mp_troops_delta: -8000 },
    weight: 8,
    condition: (f) => f.points.mp_troops > 30000,
  },
  {
    type: "군사_훈련",
    emoji: "🎯",
    description: "군사 훈련이 성공적으로 진행되어 훈련도가 상승했습니다.",
    effects: { mp_training_delta: 0.03 },
    weight: 12,
  },
  {
    type: "외교_사절",
    emoji: "📜",
    description: "외교 사절이 도착하여 외교 포인트가 증가했습니다.",
    effects: { dp_delta: 2 },
    weight: 10,
  },
];

/** 가중치 랜덤 선택 */
function weightedRandom(templates: EventTemplate[]): EventTemplate {
  const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const t of templates) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return templates[templates.length - 1];
}

/** 턴 이벤트 발생 */
export function rollTurnEvents(world: WorldState): GameEvent[] {
  const events: GameEvent[] = [];

  for (const faction of world.factions) {
    if (faction.id === "neutral") continue;
    if (Math.random() > EVENT_TRIGGER_CHANCE) continue;

    // 해당 세력에 적용 가능한 이벤트 필터링
    const eligible = EVENT_TEMPLATES.filter(
      t => !t.condition || t.condition(faction),
    );
    if (eligible.length === 0) continue;

    const template = weightedRandom(eligible);
    events.push({
      type: template.type,
      emoji: template.emoji,
      description: template.description,
      targetFaction: faction.id,
      effects: template.effects,
    });
  }

  return events;
}

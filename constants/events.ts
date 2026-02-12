import type { GameEvent } from "@/types/game";

export const RANDOM_EVENTS: GameEvent[] = [
  {
    name: "조조 남침 경고",
    prompt: "첩보에 의하면 조조가 대군을 이끌고 남하할 준비를 하고 있습니다.",
    condition: (s) => s.currentTurn >= 3,
    prob: 0.3,
    priority: 5,
  },
  {
    name: "유랑민 유입",
    prompt: "전란을 피해 유랑민들이 우리 영토로 몰려오고 있습니다.",
    condition: (s) => s.popularity >= 50,
    prob: 0.35,
    priority: 3,
  },
  {
    name: "메뚜기떼 출현",
    prompt: "메뚜기떼가 농경지를 덮쳐 식량 피해가 우려됩니다.",
    condition: (s) => s.currentSeason === "여름",
    prob: 0.25,
    priority: 4,
  },
  {
    name: "상인 방문",
    prompt: "서역에서 온 상인단이 교역을 제안합니다.",
    condition: (s) => s.cities.some((c) => c.commerce >= 45),
    prob: 0.4,
    priority: 2,
  },
  {
    name: "장수 불만",
    prompt: "일부 장수들 사이에서 불만의 목소리가 들려옵니다.",
    condition: (s) => s.generals.some((g) => g.loyalty < 95),
    prob: 0.3,
    priority: 3,
  },
];

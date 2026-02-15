// ===================== 기본 타입 =====================

export type Season = "봄" | "여름" | "가을" | "겨울";

export type FactionId = "liu_bei" | "cao_cao" | "sun_quan" | "yuan_shao";

export type TerrainType = "평원" | "산지" | "강" | "요새";

export type RelationType = "동맹" | "우호" | "중립" | "적대" | "전쟁";

export type BattleType = "야전" | "공성전" | "매복";

// ===================== 도시/장수 =====================

export interface City {
  cityName: string;
  population: number;
  defense: number;
  commerce: number;
  agriculture: number;
  garrison: number;
  governor: string;
  terrain?: TerrainType;
  adjacentCities?: string[];
}

export interface General {
  generalName: string;
  warfare: number;
  intelligence: number;
  leadership: number;
  politics: number;
  charm: number;
  loyalty: number;
  currentTask: string;
  location: string;
  advisorRole?: "총괄" | "군사" | "내정" | "외교" | "첩보";
}

// ===================== 이벤트/태스크 =====================

export interface GameTask {
  title: string;
  urgency: number;
  turnsRemaining: number;
}

export interface GameEvent {
  name: string;
  prompt: string;
  condition: (s: GameState) => boolean;
  prob: number;
  priority: number;
}

// ===================== 상태 변경 =====================

export interface CityUpdate {
  city: string;
  defense_delta?: number;
  commerce_delta?: number;
  agriculture_delta?: number;
}

export interface GeneralUpdate {
  name: string;
  task?: string;
  loyalty_delta?: number;
}

export interface StateChanges {
  gold_delta?: number;
  food_delta?: number;
  troops_delta?: number;
  popularity_delta?: number;
  city_updates?: CityUpdate[];
  general_updates?: GeneralUpdate[];
  new_events?: string[];
  result_message?: string;
}

export interface ResourceDeltas {
  gold: number;
  food: number;
  troops: number;
  popularity: number;
}

export interface ResourceCalcResult {
  goldIncome: number;
  foodProd: number;
  foodCost: number;
}

// ===================== 단일 세력 게임 상태 (Phase B) =====================

export interface GameState {
  rulerName: string;
  gold: number;
  food: number;
  totalTroops: number;
  popularity: number;
  currentTurn: number;
  currentMonth: number;
  currentSeason: Season;
  cities: City[];
  generals: General[];
  recentEvents: string[];
  pendingTasks: GameTask[];
}

// ===================== 다수 세력 (Phase C) =====================

export interface FactionPersonality {
  aggression: number;     // 0~100 공격 성향
  diplomacy: number;      // 0~100 외교 선호
  development: number;    // 0~100 내정 선호
  riskTolerance: number;  // 0~100 모험 성향
}

export interface Faction {
  id: FactionId;
  rulerName: string;
  isPlayer: boolean;
  gold: number;
  food: number;
  totalTroops: number;
  popularity: number;
  cities: City[];
  generals: General[];
  recentEvents: string[];
  pendingTasks: GameTask[];
  personality: FactionPersonality;
  color: string;
  icon: string;
}

export interface DiplomaticRelation {
  factionA: FactionId;
  factionB: FactionId;
  type: RelationType;
  score: number;          // -100 ~ 100
  treaties: Treaty[];
}

export interface Treaty {
  type: "교역" | "불가침" | "군사동맹" | "공물";
  turnsRemaining: number;
  details?: string;
}

export interface WorldState {
  currentTurn: number;
  currentMonth: number;
  currentSeason: Season;
  factions: Faction[];
  relations: DiplomaticRelation[];
  turnOrder: FactionId[];
  currentFactionIndex: number;
}

// ===================== 전투 =====================

export interface BattleResult {
  winner: FactionId;
  loser: FactionId;
  battleType: BattleType;
  attackerLosses: number;
  defenderLosses: number;
  capturedGenerals: string[];
  cityConquered: string | null;
  narrative: string;
}

// ===================== 세이브/로드 =====================

export interface SaveData {
  version: number;
  timestamp: number;
  slotName: string;
  worldState: WorldState;
  chatMessages: { role: string; content: string; emotion?: string }[];
  convHistory: { role: string; content: string }[];
  advisors?: import("@/types/council").AdvisorState[];
  metadata: {
    turnCount: number;
    playerFactionName: string;
    playerCityCount: number;
  };
}

// ===================== 승리/패배 =====================

export type VictoryType = "천하통일" | "천명";
export type DefeatType = "멸망" | "파산";

export interface GameEndResult {
  type: "victory" | "defeat";
  reason: VictoryType | DefeatType;
  turn: number;
  stats: {
    totalTurns: number;
    citiesOwned: number;
    generalsRecruited: number;
    battlesWon: number;
    battlesLost: number;
  };
}

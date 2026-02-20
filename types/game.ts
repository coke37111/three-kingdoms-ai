// ===================== 기본 타입 =====================

export type Season = "봄" | "여름" | "가을" | "겨울";

export type FactionId = string;

export type CastleGrade = "본성" | "요새" | "일반";

export type BattleType = "야전" | "공성" | "수성";

// ===================== 포인트 시스템 =====================

/** 세력 포인트 (5종) */
export interface FactionPoints {
  ap: number;          // 행동력 (현재)
  ap_max: number;      // AP 최대치
  ap_regen: number;    // 매턴 AP 충전량

  sp: number;          // 특수능력

  mp: number;          // 군사력 (산출값: troops × training × morale)
  mp_troops: number;   // 병력 수
  mp_training: number; // 훈련도 (0.0~1.0)
  mp_morale: number;   // 사기 (0.8~1.2)

  ip: number;          // 내정력 (현재)
  ip_cap: number;      // IP 최대치 (은행 레벨로 증가)
  ip_regen: number;    // 매턴 IP 충전량 (시설 레벨 기반)

  dp: number;          // 외교력
}

/** 포인트 변동값 (AI 응답/상태 변경용) */
export interface PointDeltas {
  ap_delta?: number;
  sp_delta?: number;
  mp_troops_delta?: number;
  mp_training_delta?: number;
  mp_morale_delta?: number;
  ip_delta?: number;
  dp_delta?: number;
}

// ===================== 성채 시스템 =====================

export interface Castle {
  name: string;
  grade: CastleGrade;
  owner: FactionId;
  garrison: number;           // 주둔 병력
  defenseMultiplier: number;  // 방어 배율 (일반 1.5, 요새 2.0~2.5, 본성 3.0)
  wallLevel: number;          // 성벽 레벨 (기본 1, 최대 5) — 수성 방어 +0.1/레벨
  maxGarrison: number;        // 최대 주둔 가능 병력
  adjacentCastles: string[];  // 인접 성채 (라인 연결)
  lineId: string;             // 소속 라인 ("liu_cao" | "liu_sun" | "sun_cao")
}

// ===================== 시설 시스템 =====================

/** 시장·논용: 개수(성채당 1개 한도) × 레벨(업그레이드) */
export interface FacilityBuilding {
  count: number;  // 건설된 건물 수 (보유 성채 수 상한)
  level: number;  // 각 건물의 레벨 (업그레이드)
}

export interface Facilities {
  market: FacilityBuilding;  // 시장 (IP 충전 증가: count×level×3)
  farm: FacilityBuilding;    // 논   (IP 충전 증가: count×level×2)
  bank: number;              // 은행 레벨 (IP 상한 증가)
}

// ===================== 군주 레벨 =====================

export interface RulerLevel {
  level: number;
  xp: number;
  xpToNext: number;
  deploymentCap: number;  // level × 30000
}

// ===================== 스킬 시스템 =====================

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number;           // SP 소비
  effect: SkillEffect;
  prerequisites: string[];  // 선행 스킬 id
}

export interface SkillEffect {
  type: "ap_regen" | "mp_auto" | "ip_bonus" | "dp_bonus" | "cost_reduce" | "siege_buff" | "defense_buff";
  value: number;
}

// ===================== 부상병 시스템 =====================

export interface WoundedPool {
  amount: number;
  recoveryTurns: number;  // 남은 복구 턴 (기본 5)
}

// ===================== 세력 =====================

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
  points: FactionPoints;
  castles: string[];          // 소유 성채 이름 목록
  facilities: Facilities;
  rulerLevel: RulerLevel;
  skills: string[];           // 해금된 스킬 id 목록
  woundedPool: WoundedPool[];
  recentEvents: string[];
  personality: FactionPersonality;
  color: string;
  icon: string;
}

// ===================== 외교 =====================

export interface DiplomaticRelation {
  factionA: FactionId;
  factionB: FactionId;
  score: number;  // -10 ~ +10
}

// ===================== 월드 상태 =====================

export interface WorldState {
  currentTurn: number;
  maxTurns: number;       // 120
  factions: Faction[];
  castles: Castle[];
  relations: DiplomaticRelation[];
  turnOrder: FactionId[];
  specialStrategyRate?: number;           // 특수 전략 현재 성공률 (0.3~1.0)
  specialStrategyLastChangedTurn?: number; // 마지막 변동 턴
}

// ===================== 전투 =====================

export interface FacilityDamage {
  farm_damage: number;
  market_damage: number;
}

export interface BattleResult {
  winner: FactionId;
  loser: FactionId;
  battleType: BattleType;
  attackerLosses: number;
  defenderLosses: number;
  attackerWounded: number;
  defenderWounded: number;
  castleConquered: string | null;
  narrative: string;
  facilityDamage?: FacilityDamage;
  retreatInfo?: RetreatInfo;
}

// ===================== 도주 시스템 =====================

export interface RetreatInfo {
  retreatingFaction: FactionId;
  fromCastle: string;
  toCastle: string;
  troopsLost: number;
  moralePenalty: number;
}

// ===================== 이벤트 시스템 =====================

export type EventType = "풍년" | "흉년" | "반란" | "인재_발견" | "역병" | "군사_훈련" | "외교_사절";

export interface GameEvent {
  type: EventType;
  emoji: string;
  description: string;
  targetFaction: FactionId;
  effects: PointDeltas;
}

// ===================== 침공 대응 시스템 =====================

export type InvasionResponseType = "특수_전략" | "전투" | "지원_요청" | "조공";

export interface PendingInvasion {
  attackerFactionId: FactionId;
  targetCastle: string;
  attackerTroops: number;
}

export interface InvasionResult {
  responseType: InvasionResponseType;
  success: boolean;
  message: string;
  battleResult?: BattleResult;
}

// ===================== 상태 변경 =====================

export interface CastleUpdate {
  castle: string;
  garrison_delta?: number;
  new_owner?: FactionId;
}

export interface StateChanges {
  point_deltas?: PointDeltas;
  castle_updates?: CastleUpdate[];
  conquered_castles?: string[];
  facility_upgrades?: { type: "market" | "farm" | "bank"; count_delta?: number; level_delta?: number }[];
  wall_upgrades?: { castle: string; level_delta: number }[];
  skill_unlocks?: string[];
  xp_gain?: number;
  result_message?: string;
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
    playerCastleCount: number;
  };
}

// ===================== 승리/패배 =====================

export type VictoryType = "천하통일";
export type DefeatType = "멸망";

export interface GameEndResult {
  type: "victory" | "defeat";
  reason: VictoryType | DefeatType;
  turn: number;
  stats: {
    totalTurns: number;
    castlesOwned: number;
    battlesWon: number;
    battlesLost: number;
  };
}

// ===================== 레거시 호환 (삭제 예정) =====================

export interface GameState {
  rulerName: string;
  gold: number;
  food: number;
  totalTroops: number;
  popularity: number;
  currentTurn: number;
  currentMonth: number;
  currentSeason: Season;
  cities: never[];
  generals: never[];
  recentEvents: string[];
  pendingTasks: never[];
}

# 08. 데이터 모델

## 타입 체계

모든 타입은 `types/game.ts`와 `types/chat.ts`에 정의되어 있다.

---

## 핵심 게임 타입 (`types/game.ts`)

### WorldState — 전체 게임 상태

```typescript
interface WorldState {
  currentTurn: number;       // 현재 턴 (0부터)
  currentMonth: number;      // 현재 월 (3~14, 15→3으로 순환)
  currentSeason: Season;     // 현재 계절
  factions: Faction[];       // 4개 세력 배열
  diplomaticRelations: DiplomaticRelation[];  // 외교 관계
  turnOrder: FactionId[];    // 턴 순서
}
```

### Faction — 세력

```typescript
interface Faction {
  id: FactionId;             // "liu_bei" | "cao_cao" | "sun_quan" | "yuan_shao"
  rulerName: string;         // 군주명 (유비, 조조, 손권, 원소)
  isPlayer: boolean;         // 플레이어 여부
  gold: number;              // 금
  food: number;              // 식량
  totalTroops: number;       // 총 병력
  popularity: number;        // 민심 (0~100)
  cities: City[];            // 보유 도시
  generals: General[];       // 보유 장수
  recentEvents: string[];    // 최근 이벤트 (최대 5개)
  pendingTasks: GameTask[];  // 진행 중 태스크
  personality: FactionPersonality;  // AI 성격
  color: string;             // 세력 색상
  icon: string;              // 세력 아이콘
}
```

### City — 도시

```typescript
interface City {
  cityName: string;          // 도시명
  population: number;        // 인구
  defense: number;           // 방어력
  commerce: number;          // 상업
  agriculture: number;       // 농업
  garrison: number;          // 수비 병력
  governor?: string;         // 태수 (장수명)
  terrain: TerrainType;      // 지형
  adjacentCities: string[];  // 인접 도시
}
```

### General — 장수

```typescript
interface General {
  generalName: string;       // 장수명
  warfare: number;           // 무력 (0~100)
  intelligence: number;      // 지력
  leadership: number;        // 통솔
  politics: number;          // 정치
  charm: number;             // 매력
  loyalty: number;           // 충성도 (0~100)
  currentTask: string;       // 현재 임무
  location: string;          // 위치 (도시명)
}
```

### DiplomaticRelation — 외교 관계

```typescript
interface DiplomaticRelation {
  factionA: FactionId;
  factionB: FactionId;
  relationType: RelationType;  // alliance | friendly | neutral | hostile | war
  relationScore: number;       // -100 ~ 100
  treaties: Treaty[];
}
```

### Treaty — 조약

```typescript
interface Treaty {
  type: "trade" | "non_aggression" | "military_alliance" | "tribute";
  turnsRemaining: number;     // 남은 턴
}
```

### StateChanges — 상태 변경 델타

```typescript
interface StateChanges {
  gold?: number;              // 금 증감
  food?: number;              // 식량 증감
  totalTroops?: number;       // 병력 증감
  popularity?: number;        // 민심 증감
  cities?: Partial<City>[];   // 도시 업데이트
  generals?: Partial<General>[]; // 장수 업데이트
  events?: string[];          // 새 이벤트
}
```

### BattleResult — 전투 결과

```typescript
interface BattleResult {
  winner: FactionId;
  loser: FactionId;
  battleType: BattleType;     // field | siege | ambush
  attackerLosses: number;
  defenderLosses: number;
  capturedGenerals: string[];
  conqueredCity?: string;
  narrative: string;
}
```

### GameEndResult — 게임 종료

```typescript
interface GameEndResult {
  isEnd: boolean;
  isVictory: boolean;
  reason: string;              // 천하통일 | 천명 | 멸망 | 파산
  totalTurns: number;
  stats: { ... };              // 도시, 장수, 병력, 금, 식량
}
```

---

## 채팅 타입 (`types/chat.ts`)

### ChatMessage — UI 메시지

```typescript
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  emotion?: Emotion;           // AI 감정 (assistant만)
}
```

### ConversationMessage — API 대화

```typescript
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}
```

### AIResponse — AI 응답

```typescript
interface AIResponse {
  speaker: string;
  dialogue: string;
  emotion: Emotion;
  choices?: Choice[];
  state_changes?: StateChanges;
}
```

### Choice — 선택지

```typescript
interface Choice {
  id: string;                  // "1", "2", "3" ...
  text: string;                // 선택지 설명
  risk: string;                // 위험도 (상/중/하)
  preview: string;             // 예상 결과 (금+500, 민심-5 등)
}
```

### FactionAIResponse — NPC 응답

```typescript
interface FactionAIResponse {
  factionId: FactionId;
  actions: FactionAIAction[];
  summary: string;
}
```

### FactionAIAction — NPC 행동

```typescript
interface FactionAIAction {
  type: "develop" | "recruit" | "attack" | "diplomacy" | "defend" | "wait";
  target?: string;
  detail?: string;
  reasoning?: string;
}
```

---

## 열거형 타입

```typescript
type Season = "봄" | "여름" | "가을" | "겨울";
type FactionId = "liu_bei" | "cao_cao" | "sun_quan" | "yuan_shao";
type TerrainType = "평원" | "산지" | "강" | "요새";
type RelationType = "alliance" | "friendly" | "neutral" | "hostile" | "war";
type BattleType = "field" | "siege" | "ambush";
type Emotion = "calm" | "worried" | "excited" | "angry" | "thoughtful";
type LLMProvider = "claude" | "openai";
```

---

## 상수 데이터

### 초기 세력 (`constants/factions.ts`)

| 세력 | 도시 | 장수 | 병력 | 금 | 식량 |
|------|------|------|------|------|------|
| 유비 | 신야, 하비 (2) | 5명 | 8만 | 10,000 | 20,000 |
| 조조 | 허창, 업, 낙양, 진류, 장안 (5) | 6명 | 150만 | 100,000 | 200,000 |
| 손권 | 건업, 시상, 여강 (3) | 6명 | 80만 | 50,000 | 100,000 |
| 원소 | 남피, 기주, 유주 (3) | 6명 | 110만 | 70,000 | 150,000 |

### 세계 지도 (`constants/worldMap.ts`)

20개 도시, 4개 지형 타입:

| 영역 | 도시 | 지형 |
|------|------|------|
| 유비 | 신야, 하비 | 평원 |
| 조조 | 허창, 업, 진류 (평원), 낙양, 장안 (요새) | 혼합 |
| 손권 | 건업, 시상, 여강 | 강 |
| 원소 | 남피, 기주 (평원), 유주 (산지) | 혼합 |
| 중립 | 완, 소패, 서주, 장사 (평원), 한중 (산지), 강릉 (강) | 혼합 |

### 초기 외교 관계 (`constants/factions.ts`)

| 관계 | 타입 | 점수 |
|------|------|------|
| 유비 ↔ 조조 | hostile | -40 |
| 유비 ↔ 손권 | friendly | 30 |
| 유비 ↔ 원소 | neutral | 5 |
| 조조 ↔ 손권 | hostile | -35 |
| 조조 ↔ 원소 | war | -60 |
| 손권 ↔ 원소 | neutral | 0 |

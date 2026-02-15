# 08. 데이터 모델

## 타입 체계

타입은 세 파일에 정의되어 있다:
- `types/game.ts` — 게임 상태, 세력, 외교, 전투
- `types/chat.ts` — AI 응답, 메시지, 감정
- `types/council.ts` — 참모 회의, 결재, 쓰레드, 브리핑

---

## 핵심 게임 타입 (`types/game.ts`)

### WorldState — 전체 게임 상태

```typescript
interface WorldState {
  currentTurn: number;       // 현재 턴 (1부터)
  currentMonth: number;      // 현재 월 (3~14, 15→3으로 순환)
  currentSeason: Season;     // 현재 계절
  factions: Faction[];       // 4개 세력 배열
  relations: DiplomaticRelation[];  // 외교 관계
  turnOrder: FactionId[];    // 턴 순서
  currentFactionIndex: number; // 현재 행동 중 세력
}
```

### Faction — 세력

```typescript
interface Faction {
  id: FactionId;             // "liu_bei" | "cao_cao" | "sun_quan" | "yuan_shao"
  rulerName: string;         // 군주명
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
  advisorRole?: AdvisorRole; // 참모 역할 (있으면)
}
```

### StateChanges — 상태 변경 델타

```typescript
interface StateChanges {
  gold_delta?: number;          // 금 증감
  food_delta?: number;          // 식량 증감
  troops_delta?: number;        // 병력 증감
  popularity_delta?: number;    // 민심 증감
  city_updates?: CityUpdate[];  // 도시 업데이트
  general_updates?: GeneralUpdate[];  // 장수 업데이트
  new_events?: string[];        // 새 이벤트
  result_message?: string;      // 결과 메시지 (UI 표시용)
}
```

---

## 참모 회의 타입 (`types/council.ts`)

### AdvisorState — 참모 상태

```typescript
interface AdvisorState {
  name: string;
  role: AdvisorRole;       // "총괄" | "군사" | "내정" | "외교" | "첩보"
  loyalty: number;         // 0~100 충성도
  enthusiasm: number;      // 0~100 열정
  icon: string;
  color: string;
  personality: string;     // AI 프롬프트용 성격 키워드
}
```

### CouncilMessage — 참모 회의 대사

```typescript
interface CouncilMessage {
  speaker: string;
  dialogue: string;
  emotion: Emotion;
}
```

### AdvisorAction — 자율 행동 보고

```typescript
interface AdvisorAction {
  advisor: string;
  role: AdvisorRole;
  action: string;           // "세금 징수", "병사 훈련" 등
  result: string;           // "금 320 확보" 등
  state_changes: StateChanges | null;
}
```

### ApprovalRequest — 결재 요청

```typescript
interface ApprovalRequest {
  id: string;
  advisor: string;
  subject: string;          // "대규모 모병 계획"
  description: string;
  cost: StateChanges | null;  // 순변화량 (양수=증가, 음수=감소)
  benefit: string;
  urgency: "routine" | "important" | "critical";
}
```

### CouncilResponse — 참모 회의 API 응답

```typescript
interface CouncilResponse {
  council_messages: CouncilMessage[];
  auto_actions: AdvisorAction[];
  approval_requests: ApprovalRequest[];  // 0~2개
  state_changes: StateChanges | null;    // auto_actions 합산
}
```

### ThreadMessage — 쓰레드 메시지

```typescript
interface ThreadMessage {
  type: "user" | "advisor";
  speaker: string;
  text: string;
  emotion?: Emotion;
}
```

### AdvisorStatsDelta — 참모 상태 변동

```typescript
interface AdvisorStatsDelta {
  name: string;
  enthusiasm_delta?: number;
  loyalty_delta?: number;
}
```

### SituationBriefing — 정세 브리핑

```typescript
interface SituationBriefing {
  isUrgent: boolean;
  briefingText: string;           // 제갈량의 브리핑 대사
  urgentType?: UrgentEventType;
  directives?: EmotionalDirective[];  // isUrgent=true일 때만
}
```

### EmotionalDirective — 감정 방향 선택지

```typescript
interface EmotionalDirective {
  id: string;
  icon: string;
  text: string;          // 유비의 대사
  tone: "aggressive" | "cooperative" | "delegating" | "anxious";
  effect: string;        // UI 힌트
}
```

---

## 채팅 타입 (`types/chat.ts`)

### ChatMessage — UI 메시지

```typescript
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  emotion?: Emotion;
}
```

### ConversationMessage — API 대화

```typescript
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}
```

---

## 열거형 타입

```typescript
type Season = "봄" | "여름" | "가을" | "겨울";
type FactionId = "liu_bei" | "cao_cao" | "sun_quan" | "yuan_shao";
type TerrainType = "평원" | "산지" | "강" | "요새";
type RelationType = "동맹" | "우호" | "중립" | "적대" | "전쟁";
type BattleType = "야전" | "공성전" | "매복";
type Emotion = "calm" | "worried" | "excited" | "angry" | "thoughtful";
type LLMProvider = "claude" | "openai";
type AdvisorRole = "총괄" | "군사" | "내정" | "외교" | "첩보";
type UrgentEventType = "invasion" | "famine" | "betrayal" | "city_lost" | "general_defect";
```

---

## 상수 데이터

### 초기 세력 (`constants/factions.ts`)

| 세력 | 도시 | 장수 | 병력 | 금 | 식량 |
|------|------|------|------|------|------|
| 유비 | 신야, 하비 (2) | 6명 | 8만 | 10,000 | 20,000 |
| 조조 | 허창, 업, 낙양, 진류, 장안 (5) | 6명 | 150만 | 80,000 | 120,000 |
| 손권 | 건업, 시상, 여강 (3) | 5명 | 80만 | 50,000 | 70,000 |
| 원소 | 남피, 기주, 유주 (3) | 5명 | 110만 | 60,000 | 90,000 |

### 초기 참모 (`constants/advisors.ts`)

| 참모 | 역할 | 충성도 | 열정 | 아이콘 |
|------|------|--------|------|--------|
| 제갈량 | 총괄 | 100 | 95 | 🪶 |
| 관우 | 군사 | 100 | 80 | ⚔️ |
| 미축 | 내정 | 88 | 70 | 💰 |
| 간옹 | 외교 | 85 | 78 | 🤝 |
| 조운 | 첩보 | 95 | 82 | 🔍 |

특수: **장비** (🔥) — 비정규 참모, 가끔 끼어들기

### 초기 외교 관계 (`constants/factions.ts`)

| 관계 | 타입 | 점수 |
|------|------|------|
| 유비 ↔ 조조 | 적대 | -40 |
| 유비 ↔ 손권 | 우호 | 30 |
| 유비 ↔ 원소 | 중립 | 0 |
| 조조 ↔ 손권 | 적대 | -30 |
| 조조 ↔ 원소 | 전쟁 | -70 |
| 손권 ↔ 원소 | 중립 | 10 |

### 세계 지도 (`constants/worldMap.ts`)

20개 도시, 4개 지형 타입:

| 영역 | 도시 | 지형 |
|------|------|------|
| 유비 | 신야, 하비 | 평원 |
| 조조 | 허창, 업, 진류 (평원), 낙양, 장안 (요새) | 혼합 |
| 손권 | 건업, 시상, 여강 | 강 |
| 원소 | 남피, 기주 (평원), 유주 (산지) | 혼합 |
| 중립 | 완, 소패, 서주, 장사 (평원), 한중 (산지), 강릉 (강) | 혼합 |

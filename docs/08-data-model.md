# 08. 데이터 모델

## 타입 체계

타입은 세 파일에 정의되어 있다:
- `types/game.ts` — 포인트, 성채, 세력, 전투, 외교
- `types/chat.ts` — AI 응답, 메시지, 감정
- `types/council.ts` — 참모 회의, 쓰레드, Phase 시스템

---

## 핵심 게임 타입 (`types/game.ts`)

### WorldState — 전체 게임 상태

```typescript
interface WorldState {
  currentTurn: number;       // 현재 턴 (1부터)
  maxTurns: number;          // 120
  factions: Faction[];       // 3개 세력 배열
  castles: Castle[];         // 35개 성채
  relations: DiplomaticRelation[];  // 외교 관계
  turnOrder: FactionId[];    // 턴 순서
}
```

### Faction — 세력

```typescript
interface Faction {
  id: FactionId;             // "liu_bei" | "cao_cao" | "sun_quan"
  rulerName: string;         // 군주명
  isPlayer: boolean;         // 플레이어 여부
  points: FactionPoints;     // 5종 포인트
  castles: string[];         // 소유 성채 이름 목록
  facilities: Facilities;    // 시설 레벨
  rulerLevel: RulerLevel;    // 군주 레벨/경험치
  skills: string[];          // 해금된 스킬 id 목록
  woundedPool: WoundedPool[];// 부상병 풀
  recentEvents: string[];    // 최근 이벤트 (최대 5개)
  personality: FactionPersonality;  // AI 성격
  color: string;             // 세력 색상
  icon: string;              // 세력 아이콘
}
```

### FactionPoints — 5종 포인트

```typescript
interface FactionPoints {
  ap: number;          // 행동 포인트 (현재)
  ap_max: number;      // AP 최대치
  ap_regen: number;    // 매턴 AP 충전량

  sp: number;          // 전략 포인트

  mp: number;          // 군사 포인트 (산출값)
  mp_troops: number;   // 병력 수
  mp_training: number; // 훈련도 (0.0~1.0)
  mp_morale: number;   // 사기 (0.8~1.2)

  ip: number;          // 내정 포인트 (현재)
  ip_cap: number;      // IP 최대치
  ip_regen: number;    // 매턴 IP 충전량

  dp: number;          // 외교 포인트
}
```

### PointDeltas — 포인트 변동값

```typescript
interface PointDeltas {
  ap_delta?: number;
  sp_delta?: number;
  mp_troops_delta?: number;
  mp_training_delta?: number;
  mp_morale_delta?: number;
  ip_delta?: number;
  dp_delta?: number;
}
```

### Castle — 성채

```typescript
interface Castle {
  name: string;
  grade: CastleGrade;           // "본성" | "요새" | "일반"
  owner: FactionId;
  garrison: number;             // 주둔 병력
  defenseMultiplier: number;    // 방어 배율
  maxGarrison: number;
  adjacentCastles: string[];    // 인접 성채 (양방향)
  lineId: string;               // "liu_cao" | "liu_sun" | "sun_cao"
}
```

### StateChanges — 상태 변경 델타

```typescript
interface StateChanges {
  point_deltas?: PointDeltas;
  castle_updates?: CastleUpdate[];
  conquered_castles?: string[];
  facility_upgrades?: { type: keyof Facilities; levels: number }[];
  skill_unlocks?: string[];
  xp_gain?: number;
  result_message?: string;
}
```

### BattleResult — 전투 결과

```typescript
interface BattleResult {
  winner: FactionId;
  loser: FactionId;
  battleType: BattleType;     // "야전" | "공성" | "수성"
  attackerLosses: number;
  defenderLosses: number;
  attackerWounded: number;
  defenderWounded: number;
  castleConquered: string | null;
  narrative: string;
}
```

---

## 참모 회의 타입 (`types/council.ts`)

### AdvisorState — 참모 상태

```typescript
interface AdvisorState {
  name: string;
  role: AdvisorRole;       // "전략" | "군사" | "외교" | "내정"
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
  phase?: MeetingPhase;    // 1 | 2 | 3 | 4 | 5
}
```

### StatusReport — 상태 보고 (Phase 1)

```typescript
interface StatusReport {
  speaker: string;
  report: string;
  point_changes?: PointDeltas;
}
```

### PlanReport — 계획 보고 (Phase 3)

```typescript
interface PlanReport {
  speaker: string;
  plan: string;
  expected_points?: PointDeltas;
}
```

### CouncilResponse — Phase 1+3 통합 응답

```typescript
interface CouncilResponse {
  council_messages: CouncilMessage[];
  status_reports: StatusReport[];
  plan_reports: PlanReport[];
  state_changes: StateChanges | null;
}
```

### CouncilReactionResponse — Phase 2/4 반응 응답

```typescript
interface CouncilReactionResponse {
  council_messages: CouncilMessage[];
  state_changes: StateChanges | null;
  boosted_plans?: string[];
}
```

### ThreadMessage — 쓰레드 메시지

```typescript
interface ThreadMessage {
  type: "user" | "advisor";
  speaker: string;
  text: string;
  emotion?: Emotion;
  stat_delta?: { enthusiasm_delta?: number; loyalty_delta?: number };
}
```

- `stat_delta`: 승인 응답 등 특정 이벤트에서 참모 스탯 변동을 UI에 표시할 때 사용.
  예: 플레이어가 계획을 승인하면 해당 참모 `enthusiasm_delta: 1` 전달 → 말풍선 하단에 `🔥 열정 +1` 표시.

### AdvisorStatsDelta — 참모 상태 변동

```typescript
interface AdvisorStatsDelta {
  name: string;
  enthusiasm_delta?: number;
  loyalty_delta?: number;
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

### FactionAIAction — NPC 행동

```typescript
interface FactionAIAction {
  action: "개발" | "모병" | "훈련" | "공격" | "외교" | "방어" | "스킬";
  target?: string;
  details?: string;
  reasoning?: string;
}
```

---

## 열거형 타입

```typescript
type FactionId = "liu_bei" | "cao_cao" | "sun_quan";
type CastleGrade = "본성" | "요새" | "일반";
type BattleType = "야전" | "공성" | "수성";
type Emotion = "calm" | "worried" | "excited" | "angry" | "thoughtful";
type LLMProvider = "claude" | "openai";
type AdvisorRole = "전략" | "군사" | "외교" | "내정";
type MeetingPhase = 1 | 2 | 3 | 4 | 5;
type VictoryType = "천하통일";
type DefeatType = "멸망";
```

---

## 상수 데이터

### 초기 세력 (`constants/factions.ts`)

| 세력 | 성채 | 병력 | AP | SP | IP | DP | 군주 레벨 |
|------|------|------|------|------|------|------|-----------|
| 유비 | 2 | 5만 | 1.5 | 0 | 30 | 0 | 2 |
| 조조 | 24 | 60만 | 3 | 30 | 200 | 5 | 20 |
| 손권 | 9 | 20만 | 2 | 10 | 80 | 3 | 8 |

### 초기 참모 (`constants/advisors.ts`)

| 참모 | 역할 | 충성도 | 열정 | 아이콘 | 색상 |
|------|------|--------|------|--------|------|
| 제갈량 | 전략 | 100 | 95 | 🪶 | #DAA520 |
| 관우 | 군사 | 100 | 80 | ⚔️ | #C0392B |
| 방통 | 외교 | 85 | 88 | 🦅 | #2980B9 |
| 미축 | 내정 | 88 | 70 | 💰 | #27AE60 |

### 초기 외교 관계 (`constants/factions.ts`)

| 관계 | 점수 |
|------|------|
| 유비 ↔ 조조 | -5 |
| 유비 ↔ 손권 | +3 |
| 손권 ↔ 조조 | -3 |

### 성채 배치 (`constants/castles.ts`)

35개 성채, 3개 라인으로 삼각형 배치:

| 라인 | 방향 | 성채 수 | 주요 거점 |
|------|------|---------|----------|
| liu_cao | 유비↔조조 | 17 | 양양(요새), 소패(요새), 업(요새), 기주(요새) |
| liu_sun | 유비↔손권 | 5 | 강하(요새), 건업(본성) |
| sun_cao | 손권↔조조 | 13 | 합비(요새), 강릉(요새), 장안(요새) |

본성: 신야(유비), 허창(조조), 건업(손권)

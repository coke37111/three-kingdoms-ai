# 06. NPC AI 판단 구조 개선 (4-레이어 + Utility AI)

> 노션 섹션 12/13 기반. 현재 단일 LLM 호출 구조에서 레이어 기반 판단 구조로 개선.

## 현재 상태

```
buildFactionAIPrompt() → API 1회 호출 → parseNPCResponse()
  └ NPC 행동: 개발/모병/훈련/공격/외교/방어/스킬 중 1~2개 선택
```

단점:
- 세력 성격(personality) 반영이 프롬프트 가중치에만 의존
- 세력 간 연동(미축 → 관우 전투 준비도 연동 등) 없음
- 전략 맥락이 없어 NPC가 장기적으로 비일관적 행동
- LLM 실패 시 fallback 결정론적 행동이 너무 단순

## 목표

노션 12/13에서 설계한 **4-레이어 Utility AI** 구조를 구현하여:
1. NPC 행동의 일관성 및 전략적 연속성 확보
2. LLM 호출을 줄이고 결정론적 Utility AI로 대체 (비용 절감)
3. 세력별 개성 반영 강화

---

## 아키텍처

```
Goal Layer      — 고정 목표 ("천하통일")
     ↓ 목표 맥락 주입
Strategy Layer  — 현재 포지션 판단 (1등 견제, 동맹 방향)
     ↓ 전략 맥락 주입
Domestic Layer  — 내정/준비 상태 판단 (시설, 병력, 훈련)
     ↓ 내정 맥락 주입
Combat Layer    — 전투 판단 (어디를, 언제, 얼마나)
```

**레이어 구현 방식:**
- Goal/Strategy Layer: LLM이 가중치 설정 (세력당 최소 빈도)
- Domestic/Combat Layer: Utility AI (매 턴 결정론적 계산)

---

## 신규 파일: `lib/game/npcAI.ts`

### 공통 팩터

```typescript
interface CommonFactors {
  /** (1등 군사력 - 내 군사력) / 1등 군사력. 클수록 위기 */
  pressureFromTop: number;
  /** 보유 성 수 / 전체 성 수. 작을수록 절박 */
  survivalMargin: number;
  /** 동맹 관계도 / 최대 관계도 */
  allianceStability: number;
}

function calcCommonFactors(faction: Faction, world: WorldState): CommonFactors
```

### Strategy Layer (제갈량 역할)

```typescript
interface StrategyContext {
  /** 1등 위협도: 1등 군사력 / (2등 + 내 군사력). S커브 */
  topThreat: number;
  /** 동맹 필요도: 압박감 × (1 - 동맹 안정도) */
  allianceNeed: number;
  /** 공세 가능도: 내 MP / 목표 세력 MP. 지수형 */
  offensiveReady: number;
  /** 현재 전략 방향 */
  stance: "aggressive" | "defensive" | "diplomatic" | "consolidate";
}

function calcStrategyContext(
  faction: Faction,
  world: WorldState,
  common: CommonFactors,
): StrategyContext
```

**stance 결정 기준:**
```
topThreat > 0.7  → diplomatic (동맹 필수)
offensiveReady > 1.3 && allianceNeed < 0.4  → aggressive
pressureFromTop > 0.5  → defensive
else  → consolidate
```

### Domestic Layer (미축 역할)

```typescript
interface DomesticContext {
  /** IP 여유: ip / ipCap */
  ipMargin: number;
  /** 전투 준비도: mp / (목표 세력 최소 mp) */
  combatReadiness: number;
  /** 시설 효율: ipRegen / 최대 ipRegen */
  facilityEfficiency: number;
  /** 낭비율: max(0, ipRegen - (ipCap - ip)) / ipRegen */
  wasteRate: number;
  /** 우선 액션 */
  priority: "bank" | "market" | "farm" | "recruit" | "train" | "hold";
}

function calcDomesticContext(
  faction: Faction,
  world: WorldState,
  strategy: StrategyContext,
): DomesticContext
```

**priority 결정 로직 (노션 13.3 기반):**
```
wasteRate > 0.3   → bank (수용치 우선)
ipMargin < 0.3 && facilityEfficiency < 0.7  → market/farm
combatReadiness < 0.7 (= 전투 준비 부족)   → recruit or train
else   → hold
```

### Combat Layer (관우 역할)

```typescript
interface CombatContext {
  /** 공격 목표 성채 (없으면 null) */
  attackTarget: string | null;
  /** 공격 가치: (성 등급 × 전략 가중치) / 목표 방어력 */
  attackValue: number;
  /** 승산: 내 MP × 공격 방어력 / 목표 MP × 수성 방어력 */
  winProbability: number;
  /** 전투 여유: (예상 잔여 MP) / (최소 안전 MP) */
  safetyMargin: number;
  /** 권장 액션 */
  action: "attack" | "defend" | "wait";
}

function calcCombatContext(
  faction: Faction,
  world: WorldState,
  domestic: DomesticContext,
  strategy: StrategyContext,
): CombatContext
```

**attack 조건:**
```
winProbability > 1.2 && safetyMargin > 1.0 && domestic.combatReadiness > 0.7
```

### Diplomacy Layer (방통 역할)

```typescript
interface DiplomacyContext {
  /** 관계 개선 가치: (목표 세력 MP / 1등 MP) × (1 - 현재 관계도 정규화) */
  improveValue: Record<FactionId, number>;
  /** 이간 가치: 1등 MP / (동맹국 MP + 1등 MP). S커브 */
  discordValue: number;
  /** 외교 자원 여유: dp / dp_max */
  dpMargin: number;
  /** 권장 액션 */
  action: "improve" | "discord" | "support_request" | "hold";
  /** 대상 세력 */
  target: FactionId | null;
}
```

### 레이어 간 연동 팩터

노션 13.6 기반:

| 연동 | 조건 | 효과 |
|------|------|------|
| 미축 → 관우 | `combatReadiness < 0.7` | 관우 공격 팩터 × 0.5 |
| 방통 → 관우 | 동맹국 존재 시 | 관우 `support_request` 액션 활성화 |
| 관우 → 미축 | 전투 후 병력 손실 > 30% | 미축 `recruit` 팩터 강제 상승 |
| 제갈량 → 전체 | 매 턴 | strategy.stance가 각 레이어 가중치 조정 |

---

## NPC 턴 처리 흐름 변경

### 현재 흐름
```
buildFactionAIPrompt() → LLM 1회 → parseNPCResponse() → applyNPCChanges()
```

### 변경 후 흐름
```
for each NPC:
  1. calcCommonFactors()
  2. calcStrategyContext()  ← LLM 업데이트 (N턴마다 or 중요 변화 시)
  3. calcDomesticContext()  ← Utility AI
  4. calcCombatContext()    ← Utility AI
  5. calcDiplomacyContext() ← Utility AI
  6. buildNPCAction()       ← 레이어 결과 → 행동 결정
  7. applyNPCAction()       ← 상태 반영
```

### LLM 호출 조건 (Strategy Layer 갱신)
- 세력의 성채 수가 변동된 턴
- 동맹 관계가 크게 변동된 턴 (±3 이상)
- 5턴마다 강제 갱신

---

## 신규 파일: `lib/game/npcActions.ts`

레이어 결과를 실제 게임 상태 변경으로 변환:

```typescript
export interface NPCAction {
  type: "recruit" | "train" | "upgrade" | "attack" | "diplomacy" | "wait";
  target?: string;       // 성채명 또는 세력 ID
  cost?: Partial<PointDeltas>;
  effects?: Partial<PointDeltas & { garrison_delta: number }>;
}

export function buildNPCAction(
  faction: Faction,
  strategy: StrategyContext,
  domestic: DomesticContext,
  combat: CombatContext,
  diplomacy: DiplomacyContext,
): NPCAction

export function applyNPCAction(
  faction: Faction,
  action: NPCAction,
  world: WorldState,
): { updatedFaction: Faction; updatedCastles: Castle[]; summary: string }
```

---

## 구현 순서

| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | 공통 팩터 + Strategy Layer | `lib/game/npcAI.ts` |
| 2 | Domestic Layer + Combat Layer | `lib/game/npcAI.ts` |
| 3 | Diplomacy Layer | `lib/game/npcAI.ts` |
| 4 | 레이어 간 연동 | `lib/game/npcAI.ts` |
| 5 | NPC 행동 실행 함수 | `lib/game/npcActions.ts` |
| 6 | GameContainer NPC 턴 교체 | `components/game/GameContainer.tsx` |
| 7 | LLM 폴백 유지 (실패 시) | — |

---

## 단계적 적용 전략

전체를 한 번에 교체하면 위험. 단계적으로 적용:

**Phase A (단기):** Domestic Layer만 결정론적으로 구현
- 내정 행동(시설 업그레이드, 모병, 훈련)은 Utility AI
- 공격/외교는 기존 LLM 유지

**Phase B (중기):** Combat Layer 추가
- 공격 대상 선정도 Utility AI
- LLM은 요약 narrative 생성에만 사용

**Phase C (장기):** Strategy Layer 주기적 LLM 업데이트
- 5턴마다 세력 전략 방향 LLM 재설정
- 나머지는 완전 결정론적

---

## 기대 효과

| 항목 | 현재 | 개선 후 |
|------|------|---------|
| NPC 일관성 | 낮음 (매 턴 독립 판단) | 높음 (전략 맥락 유지) |
| API 비용 | NPC당 매 턴 LLM | 주요 변화 시만 LLM |
| 결정론적 fallback | 너무 단순 | Utility AI 기반 |
| 세력 개성 반영 | 프롬프트 가중치만 | 팩터 계수로 직접 반영 |

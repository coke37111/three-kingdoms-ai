# 11. 케이스 기반 즉각 응답 시스템

## 개요

Phase 1(상태 보고)과 Phase 3(계획 보고)에서 LLM API 호출 없이 게임 상태 기반으로 즉각 응답을 생성하는 시스템.

**목적:**
- API 비용/지연 절감
- 상황별 고품질 대사 보장
- 장기적으로 LLM 학습 데이터로 활용 가능한 정답 케이스 라이브러리 구축

**파일:**
- `lib/council/types.ts` — 타입 정의
- `lib/council/phase1Cases.ts` — Phase 1 케이스 (~175개)
- `lib/council/phase3Cases.ts` — Phase 3 케이스 (~150개 + 키워드 매핑)
- `lib/council/engine.ts` — 케이스 선택 엔진

---

## 동작 흐름

```
doPhase1And3()
  ├─ analyzeGameSituation(worldState) → GameSituation
  ├─ Phase 1 케이스 엔진
  │    ├─ 각 참모별 최고 priority 케이스 선택
  │    ├─ CaseVariation 선택 (turn % variations.length)
  │    └─ statusReport 생성 (선택)
  ├─ Phase 3 케이스 엔진
  │    ├─ 각 참모별 최고 priority 케이스 선택
  │    └─ planReport 생성 (필수)
  └─ CouncilResponse 반환 (state_changes: null)
```

케이스가 없는 상황이거나 충분히 커버되지 않으면 LLM API 폴백.

---

## 케이스 구조

### Phase 1 케이스 (CaseDefinition)

```typescript
{
  id: string,
  advisor: "제갈량" | "관우" | "방통" | "미축",
  priority: number,          // 높을수록 우선 선택 (0~100)
  condition: (s: GameSituation) => boolean,
  variations: CaseVariation[],  // 대사 목록 (turn으로 결정론적 선택)
  statusReport?: (s: GameSituation) => StatusReport | null,
}
```

### Phase 3 케이스 (Phase3CaseDefinition)

```typescript
{
  id: string,
  advisor: "제갈량" | "관우" | "방통" | "미축",
  priority: number,
  condition: (s: GameSituation) => boolean,
  variations: CaseVariation[],
  planReport: (s: GameSituation) => PlanReport,  // 필수
}
```

### PlanReport

```typescript
{
  speaker: string,
  plan: string,                    // 계획 설명 (UI 표시)
  expected_points?: PointDeltas,   // 기대 포인트 변동
  facility_upgrades?: { type: "market" | "farm" | "bank"; levels: number }[],
}
```

---

## Phase 5 실행 (중요)

> **케이스 모드와 LLM 모드의 실행 타이밍 차이**

| 모드 | state_changes 적용 시점 |
|------|------------------------|
| LLM 모드 | Phase 1 응답 즉시 (state_changes 포함) |
| 케이스 모드 | **Phase 5 시작 시** (pendingCasePlanReportsRef) |

케이스 모드(`state_changes === null`)에서:
1. `runMeetingPhase1And3()`에서 `planReports`를 `pendingCasePlanReportsRef`에 저장
2. `handleExecuteTurn()`(Phase 5) 최초에 해당 planReports를 순서대로 `applyPlayerChanges()` 호출
3. `expected_points`(포인트 변동) + `facility_upgrades`(시설 레벨 변동) 모두 적용

```typescript
// GameContainer.tsx - Phase 5 실행부
if (pendingCasePlanReportsRef.current.length > 0) {
  for (const planReport of pendingCasePlanReportsRef.current) {
    if (planReport.expected_points || planReport.facility_upgrades) {
      applyPlayerChanges({
        point_deltas: planReport.expected_points,
        facility_upgrades: planReport.facility_upgrades,
      }, addMsgToCouncil);
    }
  }
  pendingCasePlanReportsRef.current = [];
}
```

---

## GameSituation — 상황 진단 객체

케이스 `condition` 함수에서 사용하는 진단 플래그 요약:

### 군사 (`military`)
| 플래그 | 조건 |
|--------|------|
| `troopsCritical` | troops < 10,000 |
| `troopShortage` | troops < 20,000 |
| `troopsAdequate` | 20,000 ~ 50,000 |
| `troopsAbundant` | > 50,000 |
| `lowMorale` | morale < 0.8 |
| `highMorale` | morale > 1.1 |
| `lowTraining` | training < 0.5 |
| `highTraining` | training > 0.7 |

### 경제 (`economy`)
| 플래그 | 조건 |
|--------|------|
| `ipCritical` | ip < 5 |
| `ipLow` | ip < 15 |
| `ipAdequate` | 15 ~ 50 |
| `ipRich` | ip > 50 |
| `ipAtCap` | ip >= ipCap |
| `ipNearCap` | ip >= ipCap * 0.9 |
| `canUpgrade` | ip >= 최소 업그레이드 비용 |
| `noFacilities` | market=farm=bank=0 |
| `facilityImbalance` | \|market - farm\| >= 3 |
| `highIncome` | ipRegen >= 20 |
| `lowIncome` | ipRegen <= 5 |

### 외교 (`diplomacy`)
| 플래그 | 조건 |
|--------|------|
| `dpNone` | dp === 0 |
| `dpLow` | dp < 2 |
| `dpAdequate` | dp 2~4 |
| `dpRich` | dp >= 5 |
| `allHostile` | 모든 세력 적대 |
| `anyAllied` | 동맹 세력 존재 |
| `enemiesFriendly` | 적끼리 우호 (이간 기회) |

### 전략 (`strategic`)
| 플래그 | 조건 |
|--------|------|
| `overallStrength` | dominant/advantage/balanced/disadvantage/critical |
| `enemyNearCapital` | 적이 본성 인접 |
| `nearEnemyCapital` | 우리가 적 본성 인접 |
| `recentBattle` | 직전 턴 전투 |
| `consecutiveWins/Losses` | 연속 승/패 수 |
| `leveledUp` | 직전 턴 레벨업 |
| `spCanUnlock` | SP로 새 스킬 해금 가능 |

---

## 포인트 전환 액션

군사·경제·외교·전략 포인트 간 상호 변환 행동. Phase 3 케이스로 상황에 따라 자동 제안.

### 군사 자원 → 내정 수입

| 행동 | 제안자 | 비용 | 획득 | 조건 |
|------|--------|------|------|------|
| 산적 토벌 | 관우 | 병력 300 | 내정포인트 +20 | 병력 충분 + 내정포인트 부족 + 평시 |
| 약탈 | 방통 | 병력 20 | 내정포인트 +40 | 내정포인트 위기 (비상 수단) |
| 대민 지원 | 미축 | 병력 100 | 내정포인트 +10 | 병력 충분 + 평시 |

> 약탈은 외교포인트 -50 패널티. 극도로 불리한 상황에서만 제안.

### 내정 ↔ 외교 전환

| 행동 | 제안자 | 비용 | 획득 | 조건 |
|------|--------|------|------|------|
| 상인 파견 | 미축 | 내정포인트 20 | 외교포인트 +2 | 내정포인트 풍부 + 외교포인트 부족 |
| 공물 헌납 | 방통 | 내정포인트 20 | 외교포인트 +2 | 내정포인트 풍부 + 외교포인트 없음 |
| 외교 채널 무역 | 미축 | 외교포인트 1 | 내정포인트 +25 | 내정포인트 부족 + 외교포인트 풍부 |
| 무역 협정 체결 | 방통 | 외교포인트 1 | 내정포인트 +25 | 내정포인트 부족 + 외교포인트 있음 |

### 군사 ↔ 외교 전환

| 행동 | 제안자 | 비용 | 획득 | 조건 |
|------|--------|------|------|------|
| 군사 시위 외교 | 관우 | 병력 500 | 외교포인트 +1 | 외교포인트 부족 + 병력 충분 |
| 용병 고용 | 관우 | 외교포인트 2 | 병력 +5000 | 병력 부족 + 외교포인트 있음 |
| 우방 병력 요청 | 방통 | 외교포인트 3 | 병력 +8000 | 병력 부족 + 외교포인트 풍부 |

### 내정 ↔ 전략 전환

| 행동 | 제안자 | 비용 | 획득 | 조건 |
|------|--------|------|------|------|
| 서원 운영 | 미축 | 내정포인트 25 | 전략포인트 +2 | 내정포인트 풍부 + 전략포인트 낮음 |
| 학문 진흥 | 제갈량 | 내정포인트 20 | 전략포인트 +2 | 내정포인트 적당 + 전략포인트 낮음 |
| 전략 경영 계책 | 제갈량 | 전략포인트 2 | 내정포인트 +15 | 전략포인트 4+ + 내정포인트 부족 |

### 전략 → 외교 전환

| 행동 | 제안자 | 비용 | 획득 | 조건 |
|------|--------|------|------|------|
| 외교 책략 | 방통 | 전략포인트 3 | 외교포인트 +2 | 전략포인트 5+ + 외교포인트 부족 |

### 내정 → 군사 사기

| 행동 | 제안자 | 비용 | 획득 | 조건 |
|------|--------|------|------|------|
| 병사 포상 | 관우 | 내정포인트 15 | 사기 +0.1 | 사기 낮음 + 내정포인트 있음 |
| 군심 결집 | 제갈량 | 내정포인트 15 | 사기 +0.1 | 사기 낮음 + 내정포인트 있음 |

---

## 케이스 추가 방법

### 1. 조건 설계

`GameSituation`의 플래그를 조합해 조건 정의. 중복 제안 방지를 위해 `priority`로 우선순위 조정.

### 2. Phase 1 케이스 추가

`lib/council/phase1Cases.ts`의 해당 참모 배열에 추가:

```typescript
{
  id: "unique_id",
  advisor: "관우",
  priority: 40,
  condition: (s) => s.military.troopsCritical && s.economy.ip >= 10,
  variations: [
    { dialogue: "병력이 위험 수위입니다!", emotion: "worried" },
    { dialogue: "즉시 모병이 필요하오!", emotion: "angry" },
  ],
},
```

### 3. Phase 3 케이스 추가

`lib/council/phase3Cases.ts`의 해당 참모 배열에 추가:

```typescript
{
  id: "p3_unique_id",
  advisor: "미축",
  priority: 35,
  condition: (s) => s.economy.marketLv < 5 && s.economy.canUpgrade,
  planReport: (s) => {
    const cost = getFacilityUpgradeCost(s.economy.marketLv);
    return {
      speaker: "미축",
      plan: `시장 확장 (내정포인트 ${cost} 소비)`,
      expected_points: { ip_delta: -cost },
      facility_upgrades: [{ type: "market", levels: 1 }],
    };
  },
  variations: [
    { dialogue: (s) => `시장을 Lv${s.economy.marketLv + 1}로 확장하겠습니다.`, emotion: "calm" },
  ],
},
```

### 4. 검증

```bash
node -e "var r=require('./scripts/validate-case.js'); var v=r.validateFile('./lib/council/phase1Cases.ts'); console.log(v.filter(x=>x.rule==='no-abbreviations'));"
```

---

## 케이스 수 현황 (2026-02-19 기준)

| 섹션 | 참모 | 케이스 수 |
|------|------|----------|
| Phase 1 | 제갈량 | ~42 |
| Phase 1 | 관우 | ~48 |
| Phase 1 | 미축 | ~42 |
| Phase 1 | 방통 | ~43 |
| **Phase 1 합계** | | **~175** |
| Phase 3 | 관우 | ~38 |
| Phase 3 | 미축 | ~42 |
| Phase 3 | 방통 | ~33 |
| Phase 3 | 제갈량 | ~37 |
| **Phase 3 합계** | | **~150** |
| Phase 2 키워드 매핑 | — | 12 |
| **총계** | | **~337** |

---

## 설계 철학

케이스 시스템은 단순한 API 대체재가 아니라 **"이 게임에서 자연스러운 응답이 무엇인가"를 정의하는 정답 데이터셋**이다.

- 케이스가 쌓일수록 LLM few-shot 예시로 활용 가능
- 충분한 케이스 + 낮은 토큰 비용 = 완전 LLM 전환 가능성
- 지금은 케이스(Phase 1/3) + LLM(Phase 2/4) 하이브리드 구조 유지

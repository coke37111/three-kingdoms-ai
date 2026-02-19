# 07. 미구현 소항목 모음

> 노션 기획 대비 현재 구현에서 누락된 소규모 항목들.
> 각 항목은 독립적으로 구현 가능.

---

## 1. 수성 시 내정 포인트 억제 (노션 8.3)

**노션 명세:**
> 수성(방어측): 방어력 150%~300%, 단 내정 포인트 획득 억제

**현재 상태:**
- `combatSystem.ts`: 시설 피해(farm_damage, market_damage)는 구현됨
- `pointCalculator.ts`: 수성 여부와 무관하게 항상 정상 IP 충전

**구현 방법:**
`stateManager.ts`의 `applyStateChanges()` 또는 `useWorldTurn.ts`에서 전투 결과 반영 시, 해당 턴에 수성한 세력의 IP 충전을 50% 감산.

```typescript
// useWorldTurn.ts 또는 GameContainer.tsx Phase 5 실행부
if (battleResult && battleResult.battleType === "수성") {
  const defenderFaction = updatedFactions.find(f => f.id === battleResult.loser ||
    (battleResult.winner !== "liu_bei" && f.id === "liu_bei"));
  // 수성 방어 측: IP 이번 턴 충전분의 50% 감산
  // applyPlayerChanges({ point_deltas: { ip_delta: -Math.floor(player.points.ip_regen * 0.5) } });
}
```

**주의:**
- 수성 승리 시에도 내정 억제 (방어는 했지만 전란 피해)
- 공성 공격측에는 해당 없음

---

## 2. 모병 팝업 "내정 포인트 × 100명" 공식 표시 개선

**노션 명세 (섹션 4.4):**
> 징병 명령 시 모병 팝업 자동 오픈. 슬라이더: 0 ~ 최대(현재 내정포인트 × 100)명

**현재 상태:**
`RecruitmentPopup.tsx`는 구현됨. 슬라이더 범위 확인 필요.

**확인 사항:**
- `RECRUIT_TROOPS_PER_IP = 100` 상수 사용 여부
- 25% / 50% / 75% / 100% 퀵버튼 존재 여부

---

## 3. 경험치(XP) 획득 조건 상세화 (노션 섹션 5)

**노션의 "보완 필요" 표시 항목:**
- 회의 참여 외 다른 경로?
- 레벨업 필요 XP 공식

**현재 구현:**
- `XP_PER_AP_SPENT = 15` — AP 사용 시 XP 획득
- `BASE_XP_TO_LEVEL = 100` — 레벨업 필요 XP (고정값)

**개선 방향:**
레벨업 XP를 레벨에 비례하도록 변경:
```typescript
// 현재
const XP_TO_NEXT = BASE_XP_TO_LEVEL; // 항상 100

// 개선 후
const XP_TO_NEXT = BASE_XP_TO_LEVEL + (level - 1) * 50;
// level 1 → 100, level 2 → 150, level 3 → 200, ...
```

XP 추가 획득 경로 (노션 의도 반영):
```typescript
// 성채 획득 시
XP_PER_CASTLE_GAINED = 30

// 전투 승리 시 (이미 SP 획득은 있음, XP도 추가)
XP_PER_BATTLE_WIN = 20

// 외교 성공 시
XP_PER_DIPLOMACY_SUCCESS = 10
```

---

## 4. 플레이어 공격 개시 UI (노션 섹션 8.1)

**노션 명세:**
> 전투 1회에 투입 가능한 군사 포인트는 군주 레벨에 비례

**현재 상태:**
- NPC의 플레이어 침공은 InvasionModal로 처리됨 ✅
- 플레이어가 **먼저 공격 개시**하는 UI가 없음 ❌

**필요한 것:**
플레이어가 어떤 성채를 어느 성채로 공격할지 선택하는 UI.
Phase 2 또는 Phase 4에서 참모 발언 또는 버튼으로 공격 명령 가능.

**구현 방안:**
```
방안 A: "공격" 버튼 → AttackModal (대상 성채 선택 + 투입 병력 슬라이더)
방안 B: Phase 2/4 토론에서 "XXX 공격" 키워드 → 참모가 확인 요청 → 실행
```

방안 B가 게임 컨셉(대화 중심)에 부합.

---

## 5. 도주 시스템 개선 (노션 7.3)

**노션 명세:**
> 한 라인이 모두 점령당하면 다른 라인의 빈 땅으로 도주 가능

**현재 구현 (`combatSystem.ts`):**
```typescript
// 인접 자기 성채 우선, 없으면 아무 자기 성채
const adjacentOwn = ownCastles.filter(c => fromCastle.adjacentCastles.includes(c.name));
const toCastle = adjacentOwn.length > 0 ? adjacentOwn[0] : ownCastles[0];
```

이 코드는 이미 "아무 자기 성채"로 도주를 허용하므로 다른 라인으로의 도주도 가능. ✅

**추가 확인 필요:**
- "도주한 성채는 상실"되는가? (빈 성채 vs 점령 성채)
- 도주 후 원래 성채를 적이 점령하는 로직

---

## 6. AP 최대치 초기값 및 스킬 성장 (노션 4.1)

**노션 명세:**
> 매턴 충전 1.5개 (초기) → 스킬로 최대 3개까지

**현재 구현:**
- `ap_regen` 초기값 확인 필요 (constants/factions.ts)
- `ap_max` 스킬 연동 확인 필요

**확인 사항:**
`constants/factions.ts`의 `INITIAL_FACTIONS`에서 `ap_regen: 1.5` 이고,
스킬 트리의 `ap_regen` 타입 스킬들이 올바르게 누적되는지.

---

## 구현 우선순위

| 항목 | 중요도 | 난이도 | 우선순위 |
|------|--------|--------|----------|
| 수성 내정 억제 | 중 | 낮 | 1순위 |
| 플레이어 공격 개시 UI | 높 | 중 | 2순위 |
| XP 획득 경로 다양화 | 낮 | 낮 | 3순위 |
| 모병 팝업 수치 확인 | 낮 | 낮 | 4순위 |
| 도주 시스템 검증 | 낮 | 낮 | 5순위 |
| AP 스킬 연동 확인 | 낮 | 낮 | 6순위 |

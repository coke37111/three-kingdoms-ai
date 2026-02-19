# 08. 향후 개선 항목

> Plans 05~07 구현 후 남은 미완 기능 및 추후 개선 사항.
> 각 항목은 독립적으로 구현 가능.

---

## 1. Phase 3 키워드 기반 재생성 (Plan 05 B.4)

**배경:** 케이스 엔진의 `runPhase3FromCases()`는 `phase2Keywords` 인수를 받아 Phase 2 토론에서 언급된 키워드 기반으로 해당 참모의 Phase 3 계획 우선순위를 부스트할 수 있다.

**현재 상태:** 항상 빈 배열 `[]`로 호출 → 부스트 기능 미활성.

**구현 방법:**
```typescript
// handleAdvancePhase()에서 Phase 2 → 3 전환 시
// 1. Phase 2 메시지에서 키워드 추출
function extractPhase2Keywords(messages: CouncilMessage[]): string[] {
  const keywords: string[] = [];
  for (const msg of messages) {
    for (const mapping of PHASE2_KEYWORD_MAPPINGS) {
      if (msg.dialogue.includes(mapping.keyword)) keywords.push(mapping.id);
    }
  }
  return [...new Set(keywords)];
}

// 2. Phase 3 재생성 시도
const keywords = extractPhase2Keywords(councilMsgsRef.current.filter(m => m.phase === 2));
const situation = analyzeGameSituation(worldStateRef.current, advisorsRef.current, turnCtxRef.current);
const refreshed = runPhase3FromCases(situation, currentTurn, keywords);
if (refreshed) {
  setPlanReports(refreshed.planReports);
  await animateCouncilMessages(refreshed.messages, ...);
}
```

**영향:** 플레이어가 Phase 2에서 "공격", "외교" 등을 언급하면 Phase 3 계획이 해당 방향으로 조정됨. 대화 중심 게임 컨셉에 더 부합.

---

## 2. NPC Strategy Layer LLM 주기적 갱신 (Plan 06 Phase C)

**배경:** 현재 NPC AI는 완전 결정론적 Utility AI. 세력 전략 방향(stance)도 매 턴 동일 공식으로 계산.

**개선 방향:** 5턴마다, 또는 중요 변화(성채 수 변동, 외교 관계 ±3 이상) 시 LLM으로 세력 전략 방향 재설정.

```typescript
// npcAI.ts 또는 GameContainer에 LLM 갱신 조건 추가
function shouldRefreshStrategy(faction: Faction, prevCtx: TurnContext): boolean {
  if (prevCtx.lastTurnCastleGained || prevCtx.lastTurnCastleLost) return true;
  if (worldStateRef.current.currentTurn % 5 === 0) return true;
  return false;
}
// 갱신 시: buildFactionAIPrompt() → LLM 호출 → stance만 파싱하여 npcStrategyCache에 저장
```

**현재 영향:** 미구현이어도 게임 동작에 문제없음. Utility AI가 충분히 일관적인 NPC 행동을 제공.

---

## 3. 외교 성공 XP 연동 (XP_PER_DIPLOMACY_SUCCESS)

**배경:** `constants/gameConstants.ts`에 `XP_PER_DIPLOMACY_SUCCESS = 10`이 정의되어 있으나 미사용.

**필요 조건:** 플레이어가 외교 행동을 직접 수행하는 UI가 없어, XP를 부여할 시점이 없음.

**구현 방향 A (단기):** NPC에게 외교를 성공한 경우(DP 소비 후 관계 개선) 간접 보상.
```typescript
// applyNPCAction 외교 case 또는 diplomacySystem.executeDiplomaticAction()
if (result.success && action.targetId === "liu_bei") {
  applyPlayerChanges({ xp_gain: XP_PER_DIPLOMACY_SUCCESS }, addMsgToCouncil);
}
```

**구현 방향 B (중기):** 플레이어 직접 외교 행동 UI 추가 (항목 4와 연동).

---

## 4. 플레이어 직접 외교 행동 UI

**배경:** 현재 플레이어 외교는 Phase 2/4 채팅으로 간접 수행 (참모가 실행). 외교포인트(DP)를 직접 소비하는 버튼 UI가 없음.

**노션 명세 (섹션 9):**
- 관계 개선: DP 1 소비, 관계 +1~2
- 이간계: DP 2 소비, 적 세력 간 관계 -1~3
- 지원 요청: DP 3 소비, 동맹 세력에게 병력 요청

**구현 방안:**
```
DiplomacyModal (AttackModal과 유사한 구조)
  → 외교 행동 선택 (개선/이간/지원요청)
  → 대상 세력 선택
  → 실행 시 executeDiplomaticAction() 호출
  → 성공 시 XP_PER_DIPLOMACY_SUCCESS 지급
```

**배치:** Phase 4 UI에 "🕊️ 외교" 버튼 추가 (⚔️ 공격 버튼과 동일한 위치).

---

## 5. woundedPool 상태 변이 개선

**배경:** 현재 `handlePlayerAttack`, `processNPCTurns` 등에서 `woundedPool`을 직접 변이:
```typescript
const pFac = worldStateRef.current.factions.find(f => f.isPlayer)!;
pFac.woundedPool = [...pFac.woundedPool, createWoundedPool(result.attackerWounded)];
```
이는 React 상태 관리 원칙 위반이며, `applyPlayerChanges()` 이후 shallow copy로 변이가 덮어써질 수 있는 race condition 위험.

**개선 방향:** `StateChanges`에 `wounded_pool_add` 필드 추가:
```typescript
// types/game.ts
interface StateChanges {
  // ... 기존 필드 ...
  wounded_pool_add?: WoundedPool[];  // 부상병 풀 추가
}

// stateManager.ts
if (changes.wounded_pool_add) {
  nextFaction.woundedPool = [...nextFaction.woundedPool, ...changes.wounded_pool_add];
}
```

**영향:** 코드 안전성 개선. 현재는 실제 버그 발생이 드물어 낮은 우선순위.

---

## 6. 성채 공격 시 공성 vs 야전 선택

**배경:** 현재 `handlePlayerAttack`은 항상 "공성" 전투 타입으로 고정.

**노션 명세 (섹션 8.1):** 공성(성채 공략)과 야전(성 밖 회전)을 구분.

**구현 방안:** `AttackModal`에 전투 타입 선택 토글 추가:
- 야전: 방어배율 무시, 병력 대 병력 대결 (더 위험하지만 수비 시설 패널티 없음)
- 공성: 방어배율 적용, 성채 함락 시 점령 (현재 구현)

---

## 구현 우선순위

| 항목 | 중요도 | 난이도 | 우선순위 |
|------|--------|--------|----------|
| Phase 3 키워드 재생성 | 중 | 낮 | 1순위 |
| 플레이어 직접 외교 UI | 중 | 중 | 2순위 |
| 외교 성공 XP 연동 | 낮 | 낮 | 3순위 (외교 UI 구현 후) |
| 공성 vs 야전 선택 | 낮 | 낮 | 4순위 |
| woundedPool 패턴 개선 | 낮 | 중 | 5순위 |
| NPC Strategy LLM 주기 갱신 | 낮 | 중 | 6순위 |

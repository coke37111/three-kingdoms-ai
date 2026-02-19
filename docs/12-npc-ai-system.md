# 12. NPC AI 레이어 시스템

## 개요

Plan 06으로 구현된 4-레이어 Utility AI 기반 NPC 행동 판단 시스템.

**파일:** `lib/game/npcAI.ts`

**목표:**
- NPC 행동의 전략적 일관성 확보
- LLM 호출 제거 (완전 결정론적 Utility AI)
- 세력별 개성(personality) 계수 반영

---

## 레이어 구조

```
CommonFactors        — 압박감, 생존여유, 동맹안정성 (공통 지표)
     ↓
StrategyContext      — 위협도(S커브), 동맹필요도, 공세가능도, 스탠스 결정
     ↓
DomesticContext      — IP 낭비율, 전투준비도, 시설효율 → 내정 우선 액션
     ↓
CombatContext        — 인접 성채 승산 계산 → 공격/방어/대기
     ↓
DiplomacyContext     — 외교 스탠스 → 개선/이간/대기
     ↓
NPCTurnResult        — 최종 행동 결정
```

---

## 공통 팩터 (CommonFactors)

```typescript
{
  pressureFromTop: number;    // (1등 MP - 내 MP) / 1등 MP. 클수록 위기
  survivalMargin: number;     // 보유 성 수 / 전체 성 수
  allianceStability: number;  // NPC 관계 합산 / 최대 관계
}
```

---

## Strategy Layer

**stance 결정 기준:**

| 조건 | stance |
|------|--------|
| topThreat > 0.7 | diplomatic (동맹 필수) |
| offensiveReady > 1.3 && allianceNeed < 0.4 | aggressive |
| pressureFromTop > 0.5 | defensive |
| 그 외 | consolidate |

`topThreat`는 S커브 sigmoid로 계산:
```
topThreat = sigmoid(1등MP / (2등MP + 내MP))
```

**세력 개성 반영:** `personality.aggression/diplomacy/development` 계수가 각 레이어 팩터에 곱해짐.

---

## Domestic Layer

**priority 결정 로직:**

| 조건 | 우선 액션 |
|------|-----------|
| wasteRate > 0.3 (IP 낭비 중) | bank |
| ipMargin < 0.3 && facilityEfficiency < 0.7 | market / farm |
| combatReadiness < 0.7 (전투 준비 부족) | recruit / train |
| 그 외 | hold |

---

## Combat Layer

**attack 조건:**
```
winProbability > 1.2 && safetyMargin > 1.0 && domestic.combatReadiness > 0.7
```

- 인접 성채 중 승산 최고인 성채를 공격 대상으로 선택
- `safetyMargin` = 예상 잔여 병력 / 최소 안전 병력 (30% 손실 기준)

---

## 레이어 간 연동

| 연동 | 조건 | 효과 |
|------|------|------|
| 미축 → 관우 | `combatReadiness < 0.7` | 공격 팩터 × 0.5 억제 |
| 제갈량 → 전체 | 매 턴 | strategy.stance가 각 레이어 가중치 조정 |

---

## NPC 턴 처리 흐름

```
processNPCTurns()
  ↓
calcAllNPCActions(world)     ← lib/game/npcAI.ts
  └─ for each NPC: calcNPCAction(faction, world)
       → CommonFactors → Strategy → Domestic → Combat → Diplomacy
       → NPCTurnResult { action, target, narrative, ... }
  ↓
applyNPCAction(factionId, result)   ← GameContainer.tsx
  └─ switch(result.action):
       "공격"  → resolveBattle() → applyNPCChanges()
       "개발"  → IP 소비 + 시설 업그레이드
       "모병"  → IP 소비 + mp_troops 증가
       "훈련"  → IP 소비 + mp_training 증가
       "외교"  → DP 소비
       "방어"  → mp_morale 소량 증가
```

---

## 폴백 체계

```
Utility AI (calcAllNPCActions)
     ↓ 실패 시
결정론적 폴백 (applyDeterministicAction)
     └─ 기본 행동: "개발"
```

기존(Plan 06 이전)의 LLM → 결정론적 2단 폴백에서,
Utility AI → 결정론적 2단으로 교체됨.

---

## 미구현 / 향후

- **Strategy Layer LLM 주기적 갱신 (Phase C):** 5턴마다 또는 중요 변화(성채 수 변동, 동맹 변동 ±3) 시 LLM으로 strategy.stance 재설정. 현재는 완전 결정론적으로 동작.
- **DiplomacyContext 고도화:** `improveValue`, `discordValue`, `dpMargin`, `support_request` 등 세부 외교 가치 계산 (현재는 단순화된 형태).

자세한 항목: `plans/08-future-enhancements.md`

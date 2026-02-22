# 13. 참모 회의 대화 시스템 (구현 완료)

> 작성일: 2026-02-20 / 수정일: 2026-02-21
> 원본 기획: [AI 대화 개선안](https://www.notion.so/30dd7aa7508480edbf8bddca20be60bf)

기획안의 주요 아이디어를 전부 구현 완료했습니다.

---

## 1. 구현 완료 목록

### ✅ 상황 정규화 (0~1)

**파일:** `lib/council/situationNormalizer.ts`

군사 / 내정 / 외교 세 분야를 각각 0~1로 정규화.

| 분야 | 정규화 기준 | 비고 |
|------|------------|------|
| 군사 | `playerMP / threatMP / 2` (상한 1.0) | 인접 적의 적대도 가중치 반영 |
| 내정 | `ipRegen / maxPossibleRegen` | 성채 수 × 시설 레벨 기반 이론치 대비 |
| 외교 | `(relationScore + 10) / 20` | -10→0.0, 0→0.5, +10→1.0 |
| 종합 | `min(military, economy, diplomacy)` | 가장 약한 분야가 기준 |

**톤 6단계** (`ToneLevel`):

```
comfortable ≥ 0.85
stable      ≥ 0.65
adequate    ≥ 0.45
uneasy      ≥ 0.30
crisis      ≥ 0.15
critical    < 0.15
```

---

### ✅ 대사 템플릿 시스템 (내용 × 톤 조합)

**파일:** `lib/council/dialogueTemplates.ts`

`{변수명}` 플레이스홀더 + 톤별 풀(pool)로 구현.

**변수 주입 예시:**

```
"주공, 정세가 불안합니다. {threatName}의 군사력 {threatMP}에 비해 우리는 {playerMP}으로 다소 열세입니다."
→ "주공, 정세가 불안합니다. 조조의 군사력 45,000에 비해 우리는 32,000으로 다소 열세입니다."
```

**주입 가능한 변수 목록:**

| 분야 | 변수 |
|------|------|
| 군사 | `playerMP`, `playerTroops`, `playerTraining`, `threatName`, `threatMP`, `mpRatioPercent` |
| 내정 | `ip`, `ipRegen`, `ipCap`, `marketCount`, `farmCount`, `castleCount` |
| 외교 | `threatRelation`, `threatRelationLabel`, `dp` |
| 타계책 | `recruitTarget`, `trainTarget`, `marketBuildCost`, `farmBuildCost` |

**인접 톤 폴백:** 작성되지 않은 톤은 가장 가까운 톤의 대사로 자동 대체.

---

### ✅ 참모별 전문 대사 템플릿 (4인 참여 체계)

각 참모가 자신의 전문 분야를 발언.

| 참모 | 담당 분야 | 대사 카테고리 |
|------|-----------|--------------|
| 제갈량 🪶 | 전략 총괄 | `strategic_overview`, `meeting_goal`, `meeting_close` · 모든 도메인 백업 |
| 관우 ⚔️ | 군사 | `military_status`, `countermeasure_military` |
| 미축 💰 | 내정 | `economy_status`, `countermeasure_economy` |
| 방통 🦅 | 외교 | `diplomacy_status`, `countermeasure_diplomacy` |

**testMode=true 시:** 제갈량이 모든 도메인을 단독 발언 (기획 초기 단계 대응).

---

### ✅ 회의 진행 순서

**파일:** `lib/council/meetingFlow.ts`

```
1. [시스템]    지난 턴 성과 요약 (2턴 이후, 전투승패/성채 획득/레벨업)
2. [제갈량]    전략 상황 공유 + 이번 턴 목표 선언 (broadcast)
3. [도메인 참모] 분야 현황 + 타계책 (위급한 순서로 정렬)
4. [제갈량]    회의 마무리 ("추가로 하문하실 것이 있으시면...")
5. [자동]      planReports 생성 → Phase 3 실행 데이터
```

**도메인 우선순위:** `critical < crisis < uneasy < adequate < stable < comfortable` 순으로 위급한 도메인 먼저 발언.

---

### ✅ 전략적 지시 케이스 시스템 (9개 directive)

**파일:** `lib/council/directiveAgendas.ts`

특수 상황(패전, 승전, 위기 등)에 대한 맞춤형 회의 패턴.

| Directive | 발동 조건 |
|-----------|----------|
| `rebuild` | 패전 직후 / 병력 위급 |
| `offensive` | 승전 후 / 군사 우세 |
| `defensive_crisis` | 본성 위협 |
| `total_war` | 적 본성 인접 |
| `economic_priority` | 시설 전무 / 수입 위기 / IP 상한 초과 |
| `growth` | 초반 / 병력 부족 / 훈련 저조 |
| `diplomatic_crisis` | 양측 모두 적대 |
| `diplomatic_maneuver` | 적끼리 우호 관계 |
| `steady_advance` | 기본값 (특수 조건 미해당) |

---

### ✅ 자동 planReports 생성

`meetingFlow.ts`의 `derivePlanReports()` 함수가 톤 기반으로 자동 계획 생성.

| 조건 | 계획 |
|------|------|
| 군사 crisis/critical | 긴급 모병 (IP 80% 투입) |
| 군사 uneasy/adequate | 훈련 실시 (+10%) |
| 내정 crisis/critical | 시장/논 건설 |
| 내정 uneasy/adequate | 시장 확장 또는 건설 |
| 외교 crisis/critical | 외교 관계 개선 (DP 2 소비) |

---

## 2. 기획과의 차이점 / 미구현 항목

| 기획 항목 | 상태 | 비고 |
|-----------|------|------|
| 상황 0~1 정규화 | ✅ 구현 | |
| 6단계 톤 (여유/안정/적정/불안/위기/치명) | ✅ 구현 | comfortable/stable/adequate/uneasy/crisis/critical |
| 대사 캐싱 (정적 템플릿) | ✅ 구현 | DB/API 캐싱 아닌 코드 내 정적 풀 |
| 숫자 외부 주입 (`{변수명}`) | ✅ 구현 | |
| 회의 진행 순서 (시스템→선언→제안→마무리) | ✅ 구현 | |
| 참모 간 요청/응답 쓰레드 | ✅ 구현 (directiveAgendas) | meetingFlow 기본 흐름에는 미포함 |
| 제갈량 단독 테스트 모드 | ✅ 구현 | `testMode=true` |
| "기타 보고" 단계 (6번) | ⚠️ 부분 구현 | 시스템 요약으로 대체됨 |
| 특수 능력 타계책 | ❌ 미구현 | 스킬 트리 연동 없음 |

---

## 3. 핵심 파일 구조

```
lib/council/
├── situationNormalizer.ts  # 0~1 정규화 엔진
├── dialogueTemplates.ts    # 4인 참모 대사 템플릿 + 변수 주입
├── meetingFlow.ts          # 회의 진행 오케스트레이터
├── directiveAgendas.ts     # 9개 전략 지시 케이스 (특수 상황)
├── engine.ts               # 상황 분석 + 케이스 매칭
└── types.ts                # 공통 타입 정의
```

---

## 4. 데이터 흐름

```
GameContainer (턴 시작)
  └→ buildGameSituation(worldState)
       └→ runMeetingFlow(situation, worldState, advisors, turn)
            ├→ normalizeSituation()       → NormalizedSituation (0~1 값)
            ├→ deriveToneMap()            → ToneMap (6단계 × 3도메인)
            ├→ buildDialogueVariables()   → DialogueVariables
            ├→ pickDialogue() × N         → 참모별 대사 선택
            └→ derivePlanReports()        → PlanReport[] (Phase 3 실행용)
```

---

## 5. 설계 원칙

### 핵심 원칙: **"대화는 메커니즘의 번역이다"**

초기 구현 이후 케이스별 버그 수정을 반복하면서 도출한 근본 원칙.

```
상황(Situation)
    ↓ 정규화 (0~1)
가능한 행동 목록 (Action Set)
    ↓ 캐릭터 언어로 번역
대화 (Dialogue)
```

**핵심 규칙**: 대화 레이어는 행동 레이어에 존재하는 것만 말할 수 있다. 역방향(대화 → 행동 생성)은 허용하지 않는다.

이 원칙을 위반하면 다음과 같은 버그가 발생한다:
- 미축이 "돕겠소!" 했지만 `state_changes` 없음 → 아무것도 안 됨
- 유표(멸망 세력)에게 원조 요청 → 실행 불가한 외교 제안
- 방통이 두 번 발언 → 대화 생성 로직이 상황을 고려하지 않음

---

### 참모 역할 경계

| 참모 | 권한 | 크로스 도메인 발언 조건 |
|------|------|----------------------|
| 관우 | 군사 행동만 결정 | 내정 필요 시 미축에 "요청" (결정 못함) |
| 미축 | 내정 행동만 결정 | 내정력 없으면 방통에 "위임" |
| 방통 | 외교 행동만 결정 | 경제 위기 시 원조 "제안" |
| 제갈량 | 종합, 전략 목표 | 항상 가능 |

크로스 도메인 발언은 **기계적 의존성이 존재할 때만** 발생한다.
예) 군사가 내정력을 필요로 할 때 → 관우가 미축에게 요청

---

### 새 기능·버그 판단 기준

1. **"이 대화가 말하는 행동이 실제로 실행 가능한가?"** → 불가능하면 대화에서 제거
2. **"이 발언이 해당 참모의 도메인인가?"** → 아니면 크로스 도메인 의존성이 있을 때만 허용
3. **"이 상황에서 이 메시지가 추가 정보를 주는가, 아니면 중복인가?"** → 중복이면 제거

---

## 6. 수정 이력

### 2026-02-21 버그 수정

**미축 답변이 관우 요청 전에 표시되는 버그** (`GameContainer.tsx`)
- `replyTo` 처리 시 `findIndex`(첫 번째 관우 메시지)를 역순 탐색으로 변경
- → 관우의 **가장 최근 메시지**(IP 요청)에 스레드로 연결

### 2026-02-21 신규 메커니즘

**외교 원조 요청** (`councilPrompt.ts`, `meetingFlow.ts`)

| 항목 | 내용 |
|------|------|
| 대상 | 관계 점수 ≥ +2인 세력 (조조 또는 손권) |
| 비용 | 외교력(DP) 2 소비 |
| 획득 | 내정력 = 5 + 관계점수 × 2 |
| 예시 | 관계 +5 → 내정력 +15 |

- Phase 2 프롬프트에 현재 원조 가능 세력과 획득량 실시간 표시
- 유표·유장 등 존재하지 않는 세력에 대한 외교 제안은 LLM이 거절하도록 명시

### 2026-02-21 대화 흐름 개선

**방통 선제 원조 제안** (`meetingFlow.ts`)

경제 위기(crisis/critical) + 우호 세력 존재 + 외교력 2 이상 조건 충족 시:
- 방통의 regular 외교 보고를 스킵하고 **원조 제안 메시지만 표시**
- `derivePlanReports()`에 방통의 원조 요청 계획 자동 추가

**미축 답변 개선** (`dialogueTemplates.ts`)

crisis/critical 톤에서 관우 IP 요청에 대한 미축 답변:
- 전: "지원을 드리고 싶으나 여유가 없습니다"
- 후: "방통 선생께 외교 원조를 요청하면 내정력을 확보할 수 있을 것이옵니다"

**의도된 대화 흐름:**
> 관우: "미축, 내정력을 모병에 써야 하오!"
> 미축: "여유가 없습니다. 방통 선생의 외교 원조를 활용하십시오."
> 방통: "손권과의 관계(+5)로 외교력 2면 내정력 15 확보 가능합니다."

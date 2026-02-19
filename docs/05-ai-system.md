# 05. AI 연동 시스템

## 개요

게임은 세 가지 AI 호출을 사용한다:

1. **Phase 1+3 통합 AI** — 4인 참모가 상태 보고 + 계획 보고 (callCouncilLLM)
2. **Phase 2/4 반응 AI** — 군주 발언에 대한 참모 반응 (callReactionLLM)
3. **NPC AI** — 2개 NPC 세력의 턴 행동 결정 (Phase 5, 배치 처리)

---

## AI 모델

| 제공자 | 모델 | 용도 |
|--------|------|------|
| Claude | `claude-sonnet-4-20250514` | 기본 AI |
| OpenAI | `gpt-4o-mini` | 대안 AI |

사용자가 게임 내에서 LLM 제공자를 토글 가능 (Firebase에 설정 저장).

---

## API 경로

```
클라이언트 → POST /api/chat → AI API (Claude/OpenAI)
```

### 요청 형식

```typescript
{
  system: string,          // 시스템 프롬프트
  messages: ConversationMessage[],  // 대화 히스토리 (최근 20개)
  provider?: "claude" | "openai",
  skipCache?: boolean
}
```

---

## Phase 1+3 통합 AI

> 파일: `lib/prompts/councilPrompt.ts` → `buildPhase1And3Prompt()`

### 프롬프트 구조

```
[역할 정의]
- 삼국지 전략 게임의 4인 참모 시스템
- 5-Phase 회의의 Phase 1(상태보고) + Phase 3(계획보고) 동시 생성

[참모 목록]
- 제갈량(전략), 관우(군사), 방통(외교), 미축(내정)
- 이름, 역할, 성격, 충성도, 열정

[현재 세력 상황]
- 포인트 (AP/SP/MP/IP/DP)
- 성채 목록, 시설 레벨, 군주 레벨
- 부상병 현황

[천하 정세]
- NPC 세력별 포인트/성채 요약
- 외교 관계 (-10~+10)

[응답 규칙]
- council_messages: Phase 1 대사 + Phase 3 대사 (phase 필드로 구분)
- status_reports: 참모별 현황 보고
- plan_reports: 참모별 계획 보고
- advisor_updates: 충성도/열정 변동
```

### 응답 형식 (CouncilResponse)

```json
{
  "council_messages": [
    { "speaker": "제갈량", "dialogue": "주공, 현 정세를...", "emotion": "calm", "phase": 1 },
    { "speaker": "미축", "dialogue": "내정 보고를...", "emotion": "thoughtful", "phase": 1 },
    { "speaker": "관우", "dialogue": "군사 계획을...", "emotion": "excited", "phase": 3 }
  ],
  "status_reports": [
    { "speaker": "미축", "report": "IP 30 확보, 시설 운영 정상", "point_changes": { "ip_delta": 5 } }
  ],
  "plan_reports": [
    { "speaker": "관우", "plan": "양양 방면 정찰 강화", "expected_points": { "mp_troops_delta": 5000 } }
  ],
  "state_changes": { "point_deltas": { "ip_delta": 5 } },
  "advisor_updates": [
    { "name": "관우", "enthusiasm_delta": 5, "loyalty_delta": 0 }
  ]
}
```

### 발언자 다양성

- `ensureSpeakerDiversity()`: 모든 메시지가 같은 참모일 경우 키워드 기반으로 재배정
- ADVISOR_KEYWORDS: 제갈량(전략/스킬), 관우(군사/전투), 미축(내정/시설), 방통(외교/동맹)

---

## Phase 2/4 반응 AI

> 파일: `lib/prompts/councilPrompt.ts` → `buildPhase2Prompt()`, `buildPhase4Prompt()`

### 호출 조건

- 플레이어 발언 시 AP 1 소비
- AP 0이면 발언 불가

### replyTo 처리

`replyTo`가 있으면 해당 참모가 반드시 **첫 번째 발언자**가 되도록:
1. 프롬프트에 경고 포함: "council_messages[0].speaker는 반드시 ${replyTo}"
2. 코드 레벨 정렬: 응답의 council_messages를 replyTo 참모 우선으로 sort

### AP 실패 복구

API 호출 실패 시 소비한 AP를 복구하고 오류 메시지 표시.

### 응답 형식 (CouncilReactionResponse)

```json
{
  "council_messages": [
    { "speaker": "관우", "dialogue": "주공의 뜻에 따르겠습니다!", "emotion": "excited" }
  ],
  "state_changes": null,
  "boosted_plans": ["관우"]
}
```

---

## NPC AI (Phase 5)

> 파일: `lib/game/npcAI.ts` (Utility AI, Plan 06 이후)

4-레이어 Utility AI로 완전 결정론적 NPC 행동 결정. LLM 호출 없음.

### NPC 행동 종류

| 행동 | 설명 |
|------|------|
| 개발 | 시설 건설/업그레이드 (IP 소비) |
| 모병 | 병력 충원 (IP 소비) |
| 훈련 | 훈련도 향상 (IP 소비) |
| 공격 | 타 세력 성채 공격 (MP 소비) |
| 외교 | 외교 행동 (DP 소비) |
| 방어 | 방어 강화 (사기 +0.02) |

### 레이어 구조

```
CommonFactors → StrategyContext → DomesticContext → CombatContext → DiplomacyContext
```

세력 개성(personality.aggression/diplomacy/development)이 각 레이어 팩터에 반영됨.

자세한 내용: `docs/12-npc-ai-system.md`

### 폴백 체계

```
Utility AI (calcAllNPCActions)
  → 실패 시: 결정론적 폴백 (기본 행동: "개발")
```

---

## 캐시 시스템

> 파일: `lib/api/llmCache.ts`

서버 측 인메모리 + 디스크 영구 캐시로 동일 요청의 중복 AI 호출 방지.

| 설정 | 값 |
|------|------|
| 캐시 키 | SHA-256 해시 (system + messages + provider) 16자 |
| TTL | 60분 (인메모리) |
| 최대 항목 | 2,000개 |
| 퇴거 정책 | LRU (Least Recently Used) |
| 영구 저장 | 디스크 파일 (서버 재시작 후에도 유지) |

---

## 감정 표현 (Emotion)

| 감정 | 의미 |
|------|------|
| `calm` | 평온 |
| `worried` | 걱정 |
| `excited` | 흥분 |
| `angry` | 분노 |
| `thoughtful` | 사려 깊음 |

---

## JSON 파싱 복구

AI 응답이 유효하지 않은 JSON일 경우 복구 시도:

1. **Regex 추출** — `{...}` 패턴을 찾아 파싱 시도
2. **괄호 균형 맞추기** — 누락된 `}`, `]` 추가
3. **후행 쉼표 제거** — `,}`, `,]` 패턴 정리

---

## 대화 히스토리 관리

- UI 메시지: 무제한 (스크롤)
- API 전송: 최근 **20개** 메시지만 (토큰 절약)
- 저장: 메시지 최근 **50개**, 대화 히스토리 최근 **20개**

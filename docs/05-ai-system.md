# 05. AI 연동 시스템

## 개요

게임은 세 가지 AI 호출을 사용한다:

1. **참모 회의 AI** — 5인 참모가 자율 행동 보고 + 회의 대화 (Phase 1)
2. **참모 반응 AI** — 결재/자유입력에 대한 참모 반응 (Phase 2)
3. **NPC AI** — 3개 NPC 세력의 턴 행동 결정 (Phase 3, 배치 처리)

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

## 참모 회의 AI (Phase 1)

> 파일: `lib/prompts/councilPrompt.ts` → `buildCouncilPrompt()`

### 프롬프트 구조

```
[역할 정의]
- 삼국지 전략 게임의 참모 시스템
- 5인 참모가 각자 역할에 맞게 자율 행동

[참모 목록]
- 이름, 역할, 성격, 충성도, 열정

[현재 세력 상황]
- 플레이어 자원, 도시, 장수 (JSON)

[천하 정세]
- NPC 세력별 자원/도시/장수 요약
- 외교 관계

[회의 컨텍스트]
- 이벤트, 상황 설명

[응답 규칙]
- council_messages: 3~5개 (제갈량 + 1~2명)
- auto_actions: 참모별 자율 행동 보고 (state_changes 포함)
- approval_requests: 0~2개 (중대 사안만)
- advisor_updates: 충성도/열정 변동
```

### 응답 형식 (CouncilResponse)

```json
{
  "council_messages": [
    { "speaker": "제갈량", "dialogue": "주공, ...", "emotion": "calm" },
    { "speaker": "미축", "dialogue": "금 수입이...", "emotion": "thoughtful" }
  ],
  "auto_actions": [
    {
      "advisor": "미축",
      "role": "내정",
      "action": "세금 징수",
      "result": "금 320 확보",
      "state_changes": { "gold_delta": 320 }
    }
  ],
  "approval_requests": [
    {
      "id": "req_01",
      "advisor": "관우",
      "subject": "대규모 모병",
      "description": "신야 1만 모집",
      "cost": { "gold_delta": -3000, "troops_delta": 10000 },
      "benefit": "군사력 증강",
      "urgency": "important"
    }
  ],
  "state_changes": { "gold_delta": 320 },
  "advisor_updates": [
    { "name": "관우", "enthusiasm_delta": 5, "loyalty_delta": 0 }
  ]
}
```

### 발언자 제한

- 매 회의 **제갈량 + 1~2명**만 발언 (동시 5명 금지)
- 역할 관련 참모가 우선 발언

---

## 참모 반응 AI (Phase 2)

> 파일: `lib/prompts/councilPrompt.ts` → `buildCouncilResultPrompt()`

### 두 가지 입력 유형

**결재 처리:**
```typescript
{ type: "approval", id: string, decision: "승인" | "거부", subject: string, advisor: string }
```

**자유 입력 (+ 쓰레드 답장):**
```typescript
{ type: "freetext", message: string, replyTo?: string }
```

### replyTo 처리

`replyTo`가 있으면 해당 참모가 반드시 **첫 번째 발언자**가 되도록:
1. 프롬프트에 ⚠️ 경고 포함: "council_messages[0].speaker는 반드시 ${replyTo}"
2. 코드 레벨 정렬: 응답의 council_messages를 replyTo 참모 우선으로 sort

---

## NPC AI (Phase 3)

> 파일: `lib/prompts/factionAIPrompt.ts`

3개 NPC 세력의 상황을 한 프롬프트에 배치하여 API 비용 절감.

### NPC 행동 종류

| 행동 | 설명 |
|------|------|
| develop | 도시 개발 (상업/농업/방어) |
| recruit | 모병 |
| attack | 타 세력 공격 |
| diplomacy | 외교 행동 |
| defend | 방어 강화 |
| wait | 대기 |

### 결정론적 폴백 (AI 실패 시)

- 기본 행동: 개발 (안전한 선택)
- NPC 턴 알림에 "(AI 응답 없음, 기본 행동)" 표시

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

AI 응답이 유효하지 않은 JSON일 경우 3단계 복구 시도:

1. **괄호 균형 맞추기** — 누락된 `}`, `]` 추가
2. **후행 쉼표 제거** — `,}`, `,]` 패턴 정리
3. **Regex 추출** — `{...}` 패턴을 찾아 파싱 재시도

---

## 대화 히스토리 관리

- UI 메시지: 무제한 (스크롤)
- API 전송: 최근 **20개** 메시지만 (토큰 절약)
- 저장: 메시지 최근 **50개**, 대화 히스토리 최근 **20개**

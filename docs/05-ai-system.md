# 05. AI 연동 시스템

## 개요

게임은 두 가지 AI 호출을 사용한다:

1. **참모 AI (제갈량)** — 플레이어와 대화하며 전략 조언 + 선택지 제공
2. **NPC AI** — 3개 NPC 세력의 턴 행동 결정 (배치 처리)

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
  messages: ConversationMessage[],  // 대화 히스토리
  provider?: "claude" | "openai",
  skipCache?: boolean
}
```

### 응답 형식 (NormalizedLLMResponse)

```typescript
{
  text: string,            // AI 응답 (JSON 문자열)
  usage: { input: number, output: number } | null,
  provider: "claude" | "openai",
  cached: boolean
}
```

---

## 참모 AI (제갈량)

### 프롬프트 구조 (`buildWorldSystemPrompt`)

```
[페르소나]
- 제갈량(공명)으로서 유비를 '주공'으로 호칭
- 신중하고 전략적인 조언, 한국어 공손한 말투

[현재 세력 상황]
- 플레이어 자원, 도시, 장수 (JSON)

[천하 정세]
- 다른 3세력의 자원/도시 요약

[외교 관계]
- 각 세력과의 관계 타입, 점수, 병력, 도시 수

[응답 규칙]
- JSON 형식으로 응답
- dialogue: 300자 이내
- choices: 2~4개 선택지 (전략적 맥락일 때)
- state_changes: 상태 변경 델타
```

### AI 응답 형식 (AIResponse)

```json
{
  "speaker": "제갈량",
  "dialogue": "주공, ...",
  "emotion": "thoughtful",
  "choices": [
    {
      "id": "1",
      "text": "조조에게 사신을 보내자",
      "risk": "중",
      "preview": "금-500, 조조 관계+10"
    }
  ],
  "state_changes": {
    "gold": -500,
    "food": 0,
    "totalTroops": 0,
    "popularity": 0
  }
}
```

### 감정 표현 (Emotion)

- `calm` — 평온
- `worried` — 걱정
- `excited` — 흥분
- `angry` — 분노
- `thoughtful` — 사려 깊음

---

## NPC AI

### 프롬프트 구조 (`buildFactionAIPrompt`)

3개 NPC 세력의 상황을 한 프롬프트에 배치하여 API 비용 절감.

```
[전체 세력 현황 요약]

[세력 1: 조조]
- 성격, 도시, 장수, 자원, 외교 관계
[세력 2: 손권]
- ...
[세력 3: 원소]
- ...

[응답 형식]
```

### NPC 응답 형식 (FactionAIResponse)

```json
{
  "factions": [
    {
      "factionId": "cao_cao",
      "actions": [
        {
          "type": "develop",
          "target": "허창",
          "detail": "상업 개발",
          "reasoning": "금 수입 증대"
        }
      ],
      "summary": "조조가 허창의 상업을 발전시켰습니다."
    }
  ]
}
```

### NPC 행동 종류

| 행동 | 설명 |
|------|------|
| develop | 도시 개발 (상업/농업/방어) |
| recruit | 모병 |
| attack | 타 세력 공격 |
| diplomacy | 외교 행동 |
| defend | 방어 강화 |
| wait | 대기 |

---

## 캐시 시스템

> 파일: `lib/api/llmCache.ts`

서버 측 인메모리 캐시로 동일 요청의 중복 AI 호출 방지.

| 설정 | 값 |
|------|------|
| 캐시 키 | SHA-256 해시 (system + messages + provider) 16자 |
| TTL | 10분 |
| 최대 항목 | 200개 |
| 퇴거 정책 | LRU (Least Recently Used) |

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

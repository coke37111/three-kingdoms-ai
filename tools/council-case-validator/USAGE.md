# council-case-validator 사용 가이드

## Claude Desktop에서 사용하기

### 1. MCP 서버 등록

`%APPDATA%\Claude\claude_desktop_config.json` (Windows) 또는 `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac)에 다음 내용 추가:

```json
{
  "mcpServers": {
    "council-case-validator": {
      "command": "node",
      "args": [
        "C:/Projects/three-kingdoms-ai/tools/council-case-validator/dist/index.js"
      ],
      "cwd": "C:/Projects/three-kingdoms-ai"
    }
  }
}
```

### 2. Claude Desktop 재시작

설정 파일을 수정한 후 Claude Desktop을 완전히 종료하고 다시 시작합니다.

### 3. MCP 도구 사용

Claude Desktop 대화창에서 다음과 같이 사용할 수 있습니다:

#### 예시 1: 단일 케이스 검증

```
guan_troops_critical 케이스를 검증해주세요.
```

Claude가 자동으로 `validate_case` 도구를 호출하여 검증 결과를 표시합니다.

#### 예시 2: 전체 파일 검증

```
Phase 1 케이스 파일 전체를 검증하고 통계를 보여주세요.
```

#### 예시 3: 케이스 검색

```
관우의 병력 관련 케이스를 priority 60 이상으로 검색해주세요.
```

#### 예시 4: Priority 추천

```
제갈량의 새로운 케이스를 만들려고 합니다.
상황: "적이 본성에 인접했고 긴급 방어가 필요함"
적절한 priority를 추천해주세요.
```

## 커맨드라인에서 직접 사용하기

### 로컬 테스트 실행

```bash
cd tools/council-case-validator
npm test
```

출력 예시:
```
[1] Phase 1 파일 파싱 테스트...
✓ 파싱 완료: 111개 케이스

[3] 단일 케이스 검증 테스트...
케이스 ID: zhuge_first_turn
검증 결과: PASS ✓
```

### MCP 도구 기능 테스트

```bash
npm run test:mcp
```

실제 MCP 도구 호출을 시뮬레이션하여 각 도구의 동작을 확인합니다.

### 상세 검증 보고서 생성

```bash
npm run report
```

전체 케이스 파일에 대한 상세한 검증 보고서를 생성합니다:
- 원칙별 위반 통계
- 참모별 통계
- 개선이 필요한 케이스 목록

## MCP 도구 상세 사용법

### validate_case

**목적:** 특정 케이스를 6가지 디자인 원칙으로 검증

**입력:**
- `caseId`: 검증할 케이스 ID (예: "zhuge_first_turn")
- `file`: "phase1" 또는 "phase3"

**출력 예시:**
```json
{
  "pass": false,
  "violations": [
    {
      "principle": 2,
      "description": "\"병력\" 단독 사용 금지 → \"군사포인트(병력)\"로 변경 필요",
      "location": "variation 1",
      "severity": "error"
    }
  ],
  "caseId": "guan_troops_critical",
  "advisor": "관우",
  "priority": 75
}
```

### validate_file

**목적:** 전체 케이스 파일 검증 및 통계 생성

**입력:**
- `file`: "phase1" 또는 "phase3"

**출력 예시:**
```json
{
  "file": "phase1",
  "totalCases": 111,
  "passedCases": 71,
  "failedCases": 40,
  "violationsByPrinciple": {
    "1": [
      {
        "caseId": "guan_troops_shortage",
        "line": 387,
        "description": "구체적 수치 누락"
      }
    ],
    "2": [...],
    ...
  },
  "statsByAdvisor": {
    "제갈량": {
      "totalCases": 30,
      "passedCases": 28,
      "failedCases": 2,
      "averagePriority": 42
    },
    ...
  }
}
```

### search_cases

**목적:** 키워드, 참모명, priority로 케이스 검색

**입력:**
- `file`: "phase1" 또는 "phase3"
- `keyword` (선택): 검색 키워드
- `advisor` (선택): 참모명
- `minPriority` (선택): 최소 priority
- `maxPriority` (선택): 최대 priority

**출력 예시:**
```json
[
  {
    "id": "guan_troops_critical",
    "advisor": "관우",
    "priority": 75,
    "dialoguePreview": "병력이 만도 안 되오! 이래서야 한 번 싸움도 못 하오....",
    "location": {
      "file": "phase1",
      "line": 367
    }
  }
]
```

### suggest_priority

**목적:** 같은 참모의 기존 케이스를 분석하여 적절한 priority 추천

**입력:**
- `file`: "phase1" 또는 "phase3"
- `advisor`: 참모명
- `situation`: 상황 설명

**출력 예시:**
```json
{
  "advisor": "관우",
  "situation": "병력 부족 긴급 상황",
  "suggestedPriority": 68,
  "reasoning": "관우의 기존 케이스 25개를 분석하여 추천 priority를 계산했습니다.",
  "similarCases": [
    {
      "id": "guan_troops_critical",
      "priority": 75,
      "condition": "(s) => s.military.troopsCritical"
    }
  ]
}
```

## 디자인 원칙 요약

### 원칙 1: 수치 포함 여부
- "증가", "감소" 같은 모호한 표현 금지
- 포인트/병력/시설 언급 시 구체적 수치 필수

### 원칙 2: 용어 정확성
- AP/SP/MP/IP/DP 약어 금지 → 한글 전체 이름 사용
- "병력" 단독 사용 금지 → "군사포인트(병력)" 사용

### 원칙 3: dialogue와 데이터 일치
- dialogue에서 효과 언급 → statusReport/planReport에 point_changes 존재
- point_changes 없으면 dialogue에서 변화 언급 금지

### 원칙 4: 플레이어 선택권
- 모병/징병 시 최대치 안내 + 질문 형태
- 참모가 일방적으로 수량 결정 금지

### 원칙 5: 비용 동적 계산
- 시설 업그레이드 비용: `getFacilityUpgradeCost()` 사용
- 하드코딩된 비용 금지

### 원칙 6: 증가치 표시
- 수입 증가 시 "+X" 형태로 표시

## 개발 워크플로우

### 1. 새 케이스 작성

```typescript
// lib/council/phase1Cases.ts
{
  id: "guan_new_case",
  advisor: "관우",
  priority: 65,
  condition: (s) => s.military.troopShortage,
  variations: [
    {
      dialogue: "병력이 부족하오. 내정포인트 20으로 군사포인트(병력) 2000 확보 가능합니다.",
      emotion: "worried"
    }
  ],
  statusReport: (s) => ({
    speaker: "관우",
    report: `병력 ${s.military.troops}`,
    point_changes: { ip_delta: -20, mp_troops_delta: 2000 }
  })
}
```

### 2. 검증 실행

```bash
npm run build
npm test
```

### 3. Claude Desktop에서 확인

```
guan_new_case 케이스를 검증해주세요.
```

### 4. 위반 사항 수정

검증 결과에 따라 대사를 수정하고 다시 검증합니다.

## 트러블슈팅

### MCP 서버가 인식되지 않음

1. `claude_desktop_config.json` 경로가 올바른지 확인
2. Claude Desktop을 완전히 종료하고 재시작
3. 도구가 빌드되었는지 확인: `npm run build`

### 파싱 에러

- TypeScript 파일 문법이 올바른지 확인
- 케이스 정의가 표준 형식을 따르는지 확인

### 검증 결과가 예상과 다름

- 정적 분석의 한계: 함수형 대사는 런타임에 실행되지 않음
- statusReport/planReport 함수 내부 로직은 검증하지 못함

## 추가 리소스

- [디자인 원칙 전체 문서](../../docs/design-principles.md)
- [케이스 타입 정의](../../lib/council/types.ts)
- [Phase 1 케이스 예시](../../lib/council/phase1Cases.ts)
- [Phase 3 케이스 예시](../../lib/council/phase3Cases.ts)

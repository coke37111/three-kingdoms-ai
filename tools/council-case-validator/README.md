# council-case-validator

Three Kingdoms AI 참모 케이스 검증 MCP 서버

## 개요

Phase 1(상태 보고) 및 Phase 3(계획 보고) 케이스 정의를 6가지 디자인 원칙에 따라 자동 검증하는 MCP 도구입니다.

## 디자인 원칙

1. **수치 포함 여부**: "증가", "감소" 같은 모호한 표현 금지, 구체적 수치 필수
2. **용어 정확성**: AP/SP/MP/IP/DP 약어 금지, "병력" 단독 사용 금지
3. **dialogue와 데이터 일치**: 대사와 statusReport/planReport의 point_changes 일치
4. **플레이어 선택권**: 모병 시 최대치 안내 + 질문 형태
5. **비용 동적 계산**: getFacilityUpgradeCost() 사용, 하드코딩 금지
6. **증가치 표시**: 수입 증가 시 "+X" 형태로 표시

## 설치

```bash
cd tools/council-case-validator
npm install
npm run build
```

## 사용법

### 1. MCP 클라이언트에서 사용

Claude Desktop 또는 다른 MCP 클라이언트의 설정 파일에 추가:

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

### 2. 직접 실행 (테스트)

```bash
# 빌드
npm run build

# 테스트 실행
npm test
```

## 도구 목록

### validate_case

단일 케이스 검증

**입력:**
- `caseId` (string): 케이스 ID (예: "zhuge_first_turn")
- `file` ("phase1" | "phase3"): 케이스 파일

**출력:**
```json
{
  "pass": false,
  "violations": [
    {
      "principle": 2,
      "description": "약어 사용 금지: \"AP\" → \"행동포인트\"로 변경 필요",
      "location": "variation 1",
      "severity": "error"
    }
  ],
  "caseId": "zhuge_first_turn",
  "advisor": "제갈량",
  "priority": 80
}
```

### validate_file

전체 파일 검증

**입력:**
- `file` ("phase1" | "phase3"): 검증할 파일

**출력:**
```json
{
  "file": "phase1",
  "totalCases": 111,
  "passedCases": 95,
  "failedCases": 16,
  "violationsByPrinciple": {
    "1": [],
    "2": [
      {
        "caseId": "guan_troops_shortage",
        "line": 245,
        "description": "\"병력\" 단독 사용 금지"
      }
    ],
    ...
  },
  "statsByAdvisor": {
    "제갈량": {
      "totalCases": 30,
      "passedCases": 28,
      "failedCases": 2,
      "averagePriority": 18
    },
    ...
  }
}
```

### search_cases

케이스 검색

**입력:**
- `file` ("phase1" | "phase3"): 검색할 파일
- `keyword` (string, optional): 검색 키워드
- `advisor` (string, optional): 참모명
- `minPriority` (number, optional): 최소 priority
- `maxPriority` (number, optional): 최대 priority

**출력:**
```json
[
  {
    "id": "guan_troops_shortage",
    "advisor": "관우",
    "priority": 65,
    "dialoguePreview": "주공, 병력이 부족합니다. 긴급 모병이 필요하옵니다...",
    "location": {
      "file": "phase1",
      "line": 245
    }
  },
  ...
]
```

### suggest_priority

Priority 추천

**입력:**
- `file` ("phase1" | "phase3"): 참조할 파일
- `advisor` (string): 참모명
- `situation` (string): 상황 설명

**출력:**
```json
{
  "advisor": "관우",
  "situation": "병력 부족, 긴급 상황",
  "suggestedPriority": 68,
  "reasoning": "관우의 기존 케이스 25개를 분석하여 추천 priority를 계산했습니다.",
  "similarCases": [
    {
      "id": "guan_troops_critical",
      "priority": 75,
      "condition": "(s) => s.military.troopsCritical"
    },
    ...
  ]
}
```

## 프로젝트 구조

```
tools/council-case-validator/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts              # MCP 서버 엔트리
│   ├── types.ts              # 타입 정의
│   ├── validators/
│   │   ├── index.ts          # 통합 검증기
│   │   ├── principle1.ts     # 원칙 1: 수치 포함
│   │   ├── principle2.ts     # 원칙 2: 용어 정확성
│   │   ├── principle3.ts     # 원칙 3: dialogue-데이터 일치
│   │   ├── principle4.ts     # 원칙 4: 플레이어 선택권
│   │   ├── principle5.ts     # 원칙 5: 비용 동적 계산
│   │   └── principle6.ts     # 원칙 6: 증가치 표시
│   └── utils/
│       ├── parser.ts         # TS 파일 파싱
│       └── search.ts         # 케이스 검색
└── dist/                     # 빌드 출력
```

## 개발

```bash
# 의존성 설치
npm install

# 개발 모드 (watch)
npm run dev

# 빌드
npm run build

# 서버 시작 (MCP 서버 모드)
npm start

# 로컬 테스트 (파싱 테스트)
npm test

# MCP 도구 기능 테스트
npm run test:mcp

# 상세 검증 보고서 생성
npm run report
```

## 테스트 결과 예시

현재 프로젝트의 검증 결과:

- **전체 케이스**: 176개 (Phase 1: 111개, Phase 3: 65개)
- **통과율**: 70% (123개 통과, 53개 실패)
- **주요 개선 필요 영역**:
  - 원칙 1 (수치 포함): 53개 위반
  - 원칙 3 (데이터 일치): 24개 위반
  - 원칙 2 (용어 정확성): 14개 위반

### 참모별 통계

**Phase 1 (상태 보고):**
- 제갈량: 93% 통과율 (30개 중 28개)
- 관우: 40% 통과율 (30개 중 12개) ← 개선 필요
- 미축: 54% 통과율 (26개 중 14개)
- 방통: 68% 통과율 (25개 중 17개)

**Phase 3 (계획 보고):**
- 제갈량: 94% 통과율 (17개 중 16개)
- 관우: 83% 통과율 (18개 중 15개)
- 방통: 77% 통과율 (13개 중 10개)
- 미축: 65% 통과율 (17개 중 11개)

## 제한사항

- **정적 분석**: TypeScript 파일을 텍스트로 파싱하므로 런타임 동작은 검증하지 못함
- **함수형 대사**: `(s) => ...` 형태의 동적 대사는 "[함수형 대사]"로 표시되며 내용 검증 불가
- **statusReport/planReport**: 함수 내부 로직은 검증하지 못하고 존재 여부만 확인

## 라이센스

MIT

# 빠른 시작 가이드

## 1분 안에 시작하기

### 1. 빌드

```bash
cd tools/council-case-validator
npm install
npm run build
```

### 2. 테스트

```bash
npm test
```

예상 출력:
```
✓ 파싱 완료: 111개 케이스 (Phase 1)
✓ 파싱 완료: 65개 케이스 (Phase 3)
✓ 검증 테스트 완료
```

### 3. Claude Desktop 설정

**Windows:**
`%APPDATA%\Claude\claude_desktop_config.json` 파일에 추가:

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

**macOS:**
`~/Library/Application Support/Claude/claude_desktop_config.json` 파일에 추가:

```json
{
  "mcpServers": {
    "council-case-validator": {
      "command": "node",
      "args": [
        "/Users/YOUR_USERNAME/Projects/three-kingdoms-ai/tools/council-case-validator/dist/index.js"
      ],
      "cwd": "/Users/YOUR_USERNAME/Projects/three-kingdoms-ai"
    }
  }
}
```

### 4. Claude Desktop 재시작

설정 파일을 저장한 후 Claude Desktop을 완전히 종료하고 다시 시작합니다.

### 5. 사용 예시

Claude Desktop 대화창에서:

```
Phase 1 케이스 파일을 검증해주세요.
```

또는:

```
guan_troops_critical 케이스를 검증하고 위반 사항을 알려주세요.
```

## 주요 명령어

### 로컬 개발

```bash
# 의존성 설치
npm install

# 빌드 (TypeScript → JavaScript)
npm run build

# 개발 모드 (watch)
npm run dev

# 파싱 테스트
npm test

# MCP 도구 기능 테스트
npm run test:mcp

# 상세 검증 보고서 생성
npm run report
```

## 도구 목록

| 도구 | 설명 | 예시 |
|------|------|------|
| `validate_case` | 단일 케이스 검증 | "zhuge_first_turn 케이스를 검증해주세요" |
| `validate_file` | 전체 파일 검증 | "Phase 1 케이스 파일을 검증해주세요" |
| `search_cases` | 케이스 검색 | "관우의 병력 관련 케이스를 검색해주세요" |
| `suggest_priority` | priority 추천 | "제갈량의 긴급 방어 케이스에 적절한 priority는?" |

## 검증 원칙 체크리스트

케이스 작성 시 확인할 사항:

- [ ] **원칙 1**: 구체적 수치 포함 ("증가" → "행동포인트 +5")
- [ ] **원칙 2**: 한글 용어 사용 ("AP" → "행동포인트", "병력" → "군사포인트(병력)")
- [ ] **원칙 3**: dialogue와 statusReport/planReport의 point_changes 일치
- [ ] **원칙 4**: 모병/징병 시 플레이어에게 질문 ("얼마나 모병할까요?")
- [ ] **원칙 5**: 시설 비용은 `getFacilityUpgradeCost()` 사용
- [ ] **원칙 6**: 수입 증가는 "+X" 형태로 표시

## 현재 프로젝트 통계 (최신)

### Phase 1 (상태 보고)
- 총 케이스: 111개
- 통과율: 64%
- 주요 위반: 원칙 1 (41개), 원칙 3 (24개)

### Phase 3 (계획 보고)
- 총 케이스: 65개
- 통과율: 80%
- 주요 위반: 원칙 1 (12개), 원칙 4 (9개)

### 참모별 통과율
| 참모 | Phase 1 | Phase 3 |
|------|---------|---------|
| 제갈량 | 93% | 94% |
| 관우 | 40% | 83% |
| 방통 | 68% | 77% |
| 미축 | 54% | 65% |

## 트러블슈팅

### "MCP 서버를 찾을 수 없습니다"

1. `npm run build`가 성공했는지 확인
2. `dist/index.js` 파일이 존재하는지 확인
3. `claude_desktop_config.json` 경로가 올바른지 확인
4. Claude Desktop 재시작

### "파싱 에러"

1. TypeScript 문법이 올바른지 확인
2. 케이스 정의가 표준 형식을 따르는지 확인
3. `npm test`로 파싱 테스트 실행

### "검증 결과가 이상함"

- 함수형 대사 `(s) => ...`는 정적 분석 불가 (런타임 실행 필요)
- statusReport/planReport 함수 내부는 검증하지 못함

## 다음 단계

- [상세 사용 가이드](./USAGE.md)
- [README 전체 문서](./README.md)
- [디자인 원칙 전체 문서](../../docs/design-principles.md)
- [케이스 타입 정의](../../lib/council/types.ts)

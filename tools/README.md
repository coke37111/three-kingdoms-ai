# Tools 디렉토리

프로젝트 개발을 지원하는 도구 모음

## council-case-validator

참모 케이스 정의를 6가지 디자인 원칙으로 검증하는 MCP 서버

### 기능
- 단일 케이스 검증 (`validate_case`)
- 전체 파일 검증 (`validate_file`)
- 케이스 검색 (`search_cases`)
- Priority 추천 (`suggest_priority`)

### 빠른 시작

```bash
cd council-case-validator
npm install
npm run build
npm test
```

### Claude Desktop에서 사용

`claude_desktop_config.json`에 추가:

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

### 문서
- [빠른 시작 가이드](council-case-validator/QUICKSTART.md)
- [상세 사용 가이드](council-case-validator/USAGE.md)
- [전체 README](council-case-validator/README.md)

## 향후 추가 예정

- `council-case-generator`: 케이스 자동 생성 도구
- `balance-analyzer`: 게임 밸런스 분석 도구
- `dialogue-tester`: 대사 품질 검증 도구

# 개발 도구

## Claude Code 스킬

### /add-case — 케이스 대화형 추가

참모 회의 케이스(Phase 1/3)를 대화형 인터페이스로 추가하는 스킬입니다.

#### 설치

스킬은 `~/.claude/skills/add-case/`에 설치되어 있습니다.

#### 사용법

```bash
/add-case <phase> <advisor>
```

**파라미터:**
- `phase`: `phase1` (상태 보고) 또는 `phase3` (계획 보고)
- `advisor`: `제갈량`, `관우`, `방통`, `미축`

**예시:**
```bash
/add-case phase1 관우
/add-case phase3 미축
```

#### 기능

1. **케이스 ID 자동 생성**
   - 형식: `{advisor}_{description}` (phase1) 또는 `p3_{advisor}_{description}` (phase3)
   - 중복 검사 자동 수행

2. **조건식 자동 변환**
   - 자연어 입력 → TypeScript 조건식
   - GameSituation 인터페이스 기반

3. **디자인 원칙 자동 검증**
   - 약어(AP/SP/MP/IP/DP) 사용 금지
   - 포인트 타입 명시 필수
   - "병력" → "군사포인트(병력)"
   - 수치 포함 권장

4. **파일 자동 수정**
   - `lib/council/phase1Cases.ts` 또는 `phase3Cases.ts`
   - 적절한 배열에 삽입 (ZHUGE/GUAN/PANG/MI)

#### 자세한 가이드

- **사용 가이드**: `~/.claude/skills/add-case/README.md`
- **테스트 시나리오**: `~/.claude/skills/add-case/TEST.md`

---

## 검증 도구

### validate-case.js — 대사 디자인 원칙 검증

케이스 대사가 디자인 원칙을 준수하는지 자동 검증합니다.

#### 위치

```
scripts/validate-case.js
```

#### 사용법

**단일 대사 검증:**
```bash
node scripts/validate-case.js "대사 내용"
```

**파일 전체 검증:**
```bash
node scripts/validate-case.js --file lib/council/phase1Cases.ts
node scripts/validate-case.js --file lib/council/phase3Cases.ts
```

#### 검증 규칙

1. **약어 사용 금지**
   - ❌ AP, SP, MP, IP, DP
   - ✅ 행동포인트, 전략포인트, 군사포인트, 내정포인트, 외교포인트

2. **포인트 타입 명시**
   - ❌ "수입 +3"
   - ✅ "내정포인트 수입 +3"

3. **병력 용어 규칙**
   - ❌ "병력 부족"
   - ✅ "군사포인트(병력) 부족"

4. **훈련 용어 규칙**
   - ❌ "훈련으로 군사포인트 증가"
   - ✅ "훈련으로 훈련도 상승"

5. **수치 포함 권장**
   - ⚠️ "병력이 증가했습니다"
   - ✅ "군사포인트(병력) 2000 증가했습니다"

#### 출력 예시

```bash
$ node scripts/validate-case.js "병력이 부족합니다. MP를 확보해야 합니다."

대사 검증: "병력이 부족합니다. MP를 확보해야 합니다."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
총 3개의 문제를 발견했습니다.

❌ [ERROR] 약어 사용 금지
   약어(AP/SP/MP/IP/DP)를 사용하지 마세요. 전체 이름을 사용하세요.
   발견: "MP"
   제안:
     "MP" → "군사포인트"

❌ [ERROR] 병력 용어 규칙
   "병력"만 단독으로 사용하지 마세요. "군사포인트(병력)"을 사용하세요.
   발견: "병력"

ℹ️ [INFO] 수치 포함 권장
   구체적인 수치를 포함하는 것을 권장합니다.
   발견: "확보"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
요약: 오류 2개, 경고 0개, 정보 1개
```

#### 심각도 수준

- **ERROR (오류)**: 반드시 수정 필요
- **WARNING (경고)**: 가능한 수정 권장
- **INFO (정보)**: 선택사항 (품질 향상 제안)

#### npm 스크립트 추가 (선택)

`package.json`에 추가:
```json
{
  "scripts": {
    "validate:phase1": "node scripts/validate-case.js --file lib/council/phase1Cases.ts",
    "validate:phase3": "node scripts/validate-case.js --file lib/council/phase3Cases.ts",
    "validate:all": "npm run validate:phase1 && npm run validate:phase3"
  }
}
```

사용:
```bash
npm run validate:all
```

---

## 개발 워크플로우

### 새 케이스 추가 프로세스

1. **스킬 실행**
   ```bash
   /add-case phase1 관우
   ```

2. **대화형 입력**
   - 케이스 ID, 조건, 우선순위, 대사, 감정 등

3. **검증 통과**
   - 디자인 원칙 자동 검증
   - 위반 시 수정 요청

4. **파일 수정 확인**
   - 생성된 코드 미리보기
   - 최종 승인

5. **빌드 테스트**
   ```bash
   npm run build
   ```

6. **게임 실행 확인**
   ```bash
   npm run dev
   ```

### 기존 케이스 검증

1. **파일 전체 검증**
   ```bash
   node scripts/validate-case.js --file lib/council/phase1Cases.ts
   ```

2. **문제 수정**
   - 오류(ERROR) 우선 수정
   - 경고(WARNING) 가능한 수정

3. **재검증**
   ```bash
   node scripts/validate-case.js --file lib/council/phase1Cases.ts
   ```

4. **빌드 확인**
   ```bash
   npm run build
   ```

---

## 참고 자료

### 타입 정의
- `lib/council/types.ts` — CaseDefinition, Phase3CaseDefinition, GameSituation
- `types/game.ts` — PointDeltas, Faction, Castle
- `types/council.ts` — StatusReport, PlanReport, CouncilMessage

### 게임 상수
- `constants/gameConstants.ts` — RECRUIT_TROOPS_PER_IP, getFacilityUpgradeCost 등
- `constants/advisors.ts` — INITIAL_ADVISORS (참모 성격)

### 디자인 원칙
- `docs/design-principles.md` — 보고/계획 작성 원칙

### 기존 케이스
- `lib/council/phase1Cases.ts` — Phase 1 케이스 111개
- `lib/council/phase3Cases.ts` — Phase 3 케이스 77개

---

## FAQ

### Q: 스킬이 인식 안 돼요
**A**: `~/.claude/skills/add-case/skill.md` 파일이 존재하는지 확인하세요.

### Q: 검증 도구가 실행 안 돼요
**A**: Node.js 14 이상이 설치되어 있는지 확인하세요.
```bash
node --version
```

### Q: 케이스를 추가했는데 작동 안 해요
**A**:
1. 조건식(`condition`)이 올바른지 확인
2. 우선순위가 다른 케이스보다 높은지 확인
3. 게임을 재시작했는지 확인

### Q: 디자인 원칙 검증을 통과할 수 없어요
**A**:
- "병력" → "군사포인트(병력)"
- "MP" → "군사포인트"
- "수입 +3" → "내정포인트 수입 매턴 +3"

자세한 예시는 `docs/design-principles.md` 참고

### Q: 동적 대사는 어떻게 작성하나요?
**A**:
```typescript
variations: [
  {
    dialogue: (s) => {
      const cost = s.economy.marketUpgradeCost;
      return `시장 업그레이드 비용은 내정포인트 ${cost}입니다.`;
    },
    emotion: "calm",
  },
]
```

---

## 향후 계획

- [ ] Phase 2/4 케이스 시스템 (토론/피드백)
- [ ] MCP 기반 케이스 검증 서버
- [ ] 케이스 우선순위 시각화 도구
- [ ] AI 기반 케이스 제안 시스템

# 07. UI 컴포넌트

## 스타일 규칙

- **인라인 스타일만 사용**: `style={{}}` 객체, CSS 모듈 사용 금지
- **CSS 변수**: `globals.css`의 `:root`에 정의, `var(--변수명)`으로 참조
- **폰트**: Noto Sans KR (본문), Noto Serif KR (타이틀)
- **테마**: 다크 배경 + 금색 악센트

### CSS 변수

| 변수 | 값 | 용도 |
|------|------|------|
| `--bg-primary` | `#0a0a12` | 기본 배경 |
| `--bg-secondary` | `#111122` | 보조 배경 |
| `--bg-card` | `#161630` | 카드 배경 |
| `--accent` | `#d4443e` | 강조 (빨강) |
| `--gold` | `#c9a84c` | 금색 악센트 |
| `--gold-dim` | `rgba(201,168,76,0.2)` | 금색 반투명 |
| `--text-primary` | `#e8e4d9` | 기본 텍스트 |
| `--text-secondary` | `#8a8678` | 보조 텍스트 |
| `--text-dim` | `#555049` | 흐린 텍스트 |
| `--border` | `rgba(201,168,76,0.15)` | 테두리 |
| `--success` | `#4a8c5c` | 성공 (녹색) |
| `--warning` | `#c9a84c` | 경고 (금색) |
| `--danger` | `#d4443e` | 위험 (빨강) |

### 애니메이션

| 이름 | 용도 |
|------|------|
| `fadeInUp` | 요소 등장 (위로 슬라이드) |
| `typingDot` | 타이핑 인디케이터 점 바운스 |
| `recording-pulse` | 음성 녹음 중 펄스 |

---

## 컴포넌트 구조

### GameContainer.tsx — 메인 오케스트레이터

5-Phase 게임 루프의 전체 상태 관리와 이벤트 처리를 담당하는 최상위 컴포넌트.

**관리하는 상태:**
- WorldState (세력, 성채, 외교, 포인트)
- ChatHistory (시스템 메시지)
- Auth (인증)
- Preferences (LLM 제공자)
- 참모 회의 (councilMessages, statusReports, planReports)
- 쓰레드 (threads, threadTyping, replyTarget)
- 타이핑 인디케이터 (typingIndicator)
- Phase 상태 (meetingPhase: 1~5)
- UI 상태 (로딩, 게임 시작 여부, 모달)

**렌더 구조:**
```
GameContainer
├── TitleScreen (gameStarted === false)
└── 게임 화면 (gameStarted === true)
    ├── AdvisorBar (참모 충성도/열정)
    ├── ChatBubble[] (시스템 메시지)
    ├── CouncilChat (★ 참모 회의 메인 UI)
    │   ├── Phase 구분선 (__phase_divider__)
    │   ├── 회의 대사 목록 (클릭 가능, Phase 배지)
    │   ├── 타이핑 인디케이터 (...)
    │   └── 쓰레드 (중첩 대화)
    ├── 입력 바 (텍스트 + 답장 표시 + 다음/실행)
    ├── LLM 토글 + 토큰 표시
    ├── WorldStatus (모달: 포인트, 성채, 전선 현황)
    ├── BattleReport (모달)
    └── GameEndScreen (모달)
```

---

### CouncilChat.tsx — 참모 회의 채팅

참모 회의의 메인 UI. 대화, 쓰레드, Phase 구분을 통합 표시.

**Props:**

| Prop | 타입 | 용도 |
|------|------|------|
| messages | CouncilMessage[] | 참모 회의 대사 |
| advisors | AdvisorState[] | 참모 상태 (아이콘, 색상) |
| councilNumber | number | 회의 번호 |
| typingIndicator | { speaker } \| null | 입력 중... 표시 |
| threads | Record<number, ThreadMessage[]> | 쓰레드 메시지 |
| threadTyping | { msgIndex, speaker } \| null | 쓰레드 내 타이핑 |
| onMessageClick | (msg, index) => void | 대사 클릭 → 답장 |
| replyTarget | { msg, index } \| null | 현재 답장 대상 |
| disabled | boolean | 입력 비활성화 |

**UI 요소:**
- 참모 아이콘 + 색상 코드로 발언자 구분
- Phase 배지 (P1, P2, P3, P4, P5)
- Phase 구분선 (`__phase_divider__` speaker)
- 클릭 시 하이라이트 (답장 대상 선택)
- 타이핑 인디케이터: 3개 점 바운스 애니메이션
- 쓰레드: 좌측 보더라인 + 들여쓰기
- "유비" 발언: 우측 정렬, 금색 말풍선

---

### WorldStatus.tsx — 천하 정세

전체 세력 정보를 모달로 표시.

**표시 내용:**
- 세력별 포인트 (AP/SP/MP/IP/DP)
- 병력/훈련/사기 상세
- 시설 레벨 (시장/논/은행)
- 군주 레벨 + 배치 상한
- 보유 성채 목록
- 외교 관계 (-10~+10, 라벨 표시)
- 전선 현황 (라인별 성채 소유 비율)

---

### TitleScreen.tsx — 타이틀 화면

| 상태 | 표시 |
|------|------|
| 미로그인 | "Google로 시작하기" 버튼 |
| 로그인 + autosave 있음 | "이어하기" (메인) + "새로 시작하기" |
| 로그인 + autosave 없음 | "출사표를 올리다" (새 게임) |

---

### 기타 컴포넌트

| 컴포넌트 | 용도 |
|----------|------|
| ChatBubble | 시스템 메시지 말풍선 (중앙, 금색 테두리) |
| TurnNotification | NPC 턴 행동 요약 (슬라이드인) |
| BattleReport | 전투 결과 모달 (부상병 포함) |
| GameEndScreen | 승리/패배 화면 + 통계 (성채 수, 전투 승/패) |
| FactionBanner | 세력 아이콘 + 이름 + 성채/MP 표시 |
| AdvisorBar | 참모 충성도/열정 바 |
| UserBadge | 로그인 사용자 표시 |
| SaveLoadPanel | 5슬롯 저장/로드 모달 |
| LoginPanel | Firebase/Google 로그인 모달 |
| VoiceSettingsModal | 음성 입출력 설정 모달 |

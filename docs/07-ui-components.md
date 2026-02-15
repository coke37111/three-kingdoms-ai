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
| `--accent-glow` | `rgba(212, 68, 62, 0.35)` | 강조 글로우 |

### 애니메이션

| 이름 | 용도 |
|------|------|
| `fadeInUp` | 요소 등장 (위로 슬라이드) |
| `blink` | 커서 깜빡임 |
| `pulse` | 로딩 펄스 |
| `slideIn` | 좌측 슬라이드 인 |
| `deltaFloat` | 자원 변동 숫자 상승 후 소멸 |
| `typingDot` | 타이핑 인디케이터 점 바운스 |
| `recording-pulse` | 음성 녹음 중 박스 쉐도우 펄스 |

---

## 컴포넌트 구조

### GameContainer.tsx — 메인 오케스트레이터

게임 전체의 상태 관리와 이벤트 처리를 담당하는 최상위 컴포넌트.

**관리하는 상태:**
- WorldState (세력, 외교)
- ChatHistory (시스템 메시지)
- Auth (인증)
- Preferences (LLM 제공자)
- 참모 회의 (councilMessages, autoActions, approvalRequests)
- 쓰레드 (threads, threadTyping, replyTarget)
- 타이핑 인디케이터 (typingIndicator)
- 정세 브리핑 (briefing)
- UI 상태 (로딩, 게임 시작 여부, 모달)

**렌더 구조:**
```
GameContainer
├── TitleScreen (gameStarted === false)
└── 게임 화면 (gameStarted === true)
    ├── StatusBar
    ├── ChatBubble[] (시스템 메시지)
    ├── CouncilChat (★ 참모 회의 메인 UI)
    │   ├── 회의 대사 목록 (클릭 가능)
    │   ├── 타이핑 인디케이터 (...)
    │   ├── 쓰레드 (중첩 대화)
    │   ├── 자율 행동 보고 카드
    │   └── 결재 요청 카드 (승인/거부)
    ├── BriefingPanel (Phase 0 긴급 브리핑)
    ├── 입력 바 (텍스트 + 답장 표시 + 다음턴)
    ├── LLM 토글 + 토큰 표시
    ├── WorldStatus (모달)
    ├── DiplomacyPanel (모달)
    ├── TaskPanel (모달)
    ├── BattleReport (모달)
    └── GameEndScreen (모달)
```

---

### CouncilChat.tsx — 참모 회의 채팅

참모 회의의 메인 UI. 대화, 쓰레드, 자율 행동, 결재 요청을 통합 표시.

**Props:**

| Prop | 타입 | 용도 |
|------|------|------|
| messages | CouncilMessage[] | 참모 회의 대사 |
| advisors | AdvisorState[] | 참모 상태 (아이콘, 색상) |
| councilNumber | number | 회의 번호 |
| typingIndicator | { speaker } \| null | 입력 중... 표시 |
| autoActions | AdvisorAction[] | 자율 행동 보고 |
| approvalRequests | ApprovalRequest[] | 결재 요청 |
| threads | Record<number, ThreadMessage[]> | 쓰레드 메시지 |
| threadTyping | { msgIndex, speaker } \| null | 쓰레드 내 타이핑 |
| onMessageClick | (msg, index) => void | 대사 클릭 → 답장 |
| replyTarget | { msg, index } \| null | 현재 답장 대상 |
| onApprove / onReject | (id) => void | 결재 처리 |

**UI 요소:**
- 참모 아이콘 + 색상 코드로 발언자 구분
- 클릭 시 하이라이트 (답장 대상 선택)
- 타이핑 인디케이터: 3개 점 바운스 애니메이션
- 쓰레드: 좌측 보더라인 + 들여쓰기
- 결재 카드: 비용 태그 (양수=녹색, 음수=빨강) + 승인/거부 버튼
- "유비" 발언자 (👑, 금색)

---

### BriefingPanel.tsx — 정세 브리핑

Phase 0에서 표시되는 정세 브리핑 패널.

| 상황 | 표시 |
|------|------|
| 긴급 (isUrgent) | 제갈량 브리핑 + 4개 감정 방향 선택 버튼 |
| 평상시 | 제갈량 브리핑 + "참모 회의 시작" 버튼 |

---

### TitleScreen.tsx — 타이틀 화면

금색 그라데이션 배경의 시작 화면.

| 상태 | 표시 |
|------|------|
| 미로그인 | "Google로 시작하기" 버튼 |
| 로그인 + autosave 있음 | "이어하기" (메인) + "새로 시작하기" |
| 로그인 + autosave 없음 | "출사표를 올리다" (새 게임) |

---

### StatusBar.tsx — 자원 표시

상단 바에 현재 세력의 자원, 턴/월/계절 정보 표시.

- 금, 식량, 병력, 민심 아이콘 + 숫자
- 자원 변동 시 `deltaFloat` 애니메이션 (+ 녹색, - 빨강)
- 천하정세, 외교, 이벤트 버튼

---

### ChatBubble.tsx — 시스템 메시지 말풍선

시스템 알림 메시지 표시 (참모 대화는 CouncilChat에서 처리).

| 역할 | 스타일 |
|------|--------|
| system | 중앙, 금색 테두리, 시스템 알림 |

숫자 컬러링: 긍정(+, 증가) 녹색, 부정(-, 감소) 빨강.

---

### 기타 컴포넌트

| 컴포넌트 | 용도 |
|----------|------|
| WorldStatus | 4개 세력 정보 + 외교 매트릭스 모달 |
| DiplomacyPanel | 세력별 외교 행동 6종 UI |
| TurnNotification | NPC 턴 행동 요약 (슬라이드인) |
| BattleReport | 전투 결과 모달 (장수, 병력, 피해) |
| GameEndScreen | 승리/패배 화면 + 통계 |
| TaskPanel | 이벤트 태스크 목록 (긴급도, 남은 턴) |
| FactionBanner | 세력 아이콘 + 이름 표시 |
| UserBadge | 로그인 사용자 표시 |
| SaveLoadPanel | 5슬롯 저장/로드 모달 |
| LoginPanel | Firebase/Google 로그인 모달 |
| VoiceSettingsModal | 음성 입출력 설정 모달 |

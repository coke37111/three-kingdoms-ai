# 06. 인증 및 저장 시스템

## 개요

인증과 저장은 하나의 흐름으로 연결된다:
- **로그인 = 해당 계정의 저장 데이터로 플레이**
- Firebase Auth (Google)로 인증, Firestore에 uid 기반 저장

---

## 인증

> 파일: `lib/firebase/auth.ts`, `hooks/useAuth.ts`

### 방식

- Google 팝업 로그인 (`signInWithPopup`)
- `onAuthStateChanged`로 인증 상태 구독

### 상태

```typescript
{
  user: User | null,    // Firebase User 객체
  uid: string | null,   // user.uid
  loading: boolean      // 초기 인증 확인 중
}
```

---

## 사용자 플로우

```
첫 방문 (미로그인)
  └─ "Google로 시작하기" → Google 로그인
       ├─ autosave 없음 → "출사표를 올리다" (새 게임)
       └─ autosave 있음 → "이어하기" + "새로 시작하기"

재방문 (자동 로그인)
  ├─ autosave 있음 → "이어하기" + "새로 시작하기"
  └─ autosave 없음 → "출사표를 올리다" (새 게임)
```

---

## 저장 시스템

> 파일: `lib/game/saveSystem.ts`, `lib/firebase/firestore.ts`

### Firestore 구조

```
/users/{uid}/
  ├── saves/
  │   ├── slot_0        # 수동 저장 슬롯 1
  │   ├── slot_1        # 수동 저장 슬롯 2
  │   ├── slot_2        # 수동 저장 슬롯 3
  │   ├── slot_3        # 수동 저장 슬롯 4
  │   ├── slot_4        # 수동 저장 슬롯 5
  │   └── autosave      # 자동 저장
  └── settings/
      └── preferences   # 사용자 설정 (LLM 제공자)
```

### SaveData 구조

```typescript
interface SaveData {
  version: number;              // SAVE_VERSION = 2
  timestamp: number;            // Date.now()
  slotName: string;             // 슬롯 이름 ("자동 저장" 등)
  worldState: WorldState;       // 전체 게임 상태 (포인트/성채/외교)
  chatMessages: ChatMessage[];  // UI 메시지 (최근 50개)
  convHistory: ConversationMessage[];  // API 히스토리 (최근 20개)
  advisors?: AdvisorState[];    // 참모 상태
  metadata: {
    turnCount: number;          // 턴 번호
    playerFactionName: string;  // 플레이어 세력명
    playerCastleCount: number;  // 보유 성채 수
  };
}
```

### 저장 함수

| 함수 | 설명 |
|------|------|
| `saveGame(slot, world, msgs, conv, uid, name?, advisors?)` | 수동 슬롯 저장 |
| `loadGame(slot, uid)` | 수동 슬롯 로드 |
| `autoSave(world, msgs, conv, uid, advisors?)` | 자동 저장 |
| `loadAutoSave(uid)` | 자동 저장 로드 |
| `deleteSave(slot, uid)` | 슬롯 삭제 |
| `listSaveSlots(uid)` | 5개 슬롯 정보 조회 |
| `hasAutoSave(uid)` | 자동 저장 존재 여부 |

### 자동 저장 시점

- 플레이어 발언 처리 후 (sendMessage)
- 턴 실행 후 (Phase 5)
- 게임 시작/이어하기 직후

### 저장 크기 제한

저장 시 데이터 크기를 줄이기 위해:
- 채팅 메시지: 최근 50개만 저장
- 대화 히스토리: 최근 20개만 저장

---

## 사용자 설정

> 파일: `hooks/usePreferences.ts`, `lib/firebase/firestore.ts`

### UserPreferences

```typescript
interface UserPreferences {
  llmProvider: "claude" | "openai";
}
```

- uid 변경 시 Firebase에서 자동 로드
- 변경 시 즉시 Firebase에 저장 (merge)
- 기본값: `"openai"`

---

## Firebase 환경 변수

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Firebase 앱은 싱글톤 패턴으로 초기화 (`getFirebaseApp()`).

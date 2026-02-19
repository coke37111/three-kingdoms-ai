# 02. 게임플레이 확장 (완료)

> 역사적 기록. TypeScript 리팩토링 이후 핵심 게임 시스템 추가.

## 완료된 항목

### 다수 군주 시스템
- `WorldState` (Faction[], Castle[], DiplomaticRelation[]) 도입
- 3세력: 유비(플레이어), 조조, 손권 (초기 원소 → 제거)
- `FactionPersonality` 기반 NPC AI 행동

### 전투 시스템
- 야전/공성/수성 3종, 방어 배율, 스킬 보너스
- 부상병 시스템 (5턴 회복), 도주 처리
- `lib/game/combatSystem.ts`

### 외교 시스템
- -10~+10 점수 기반, 4가지 외교 행동
- `lib/game/diplomacySystem.ts`

### 세이브/로드
- Firebase Firestore 5슬롯 + 자동저장 (localStorage → Firestore 전환)
- `lib/game/saveSystem.ts`, `components/game/SaveLoadPanel.tsx`

### 승리/패배 조건
- 승리: 적 본성 함락 (천하통일)
- 패배: 자국 본성 함락 (멸망)
- `lib/game/victorySystem.ts`, `components/game/GameEndScreen.tsx`

### 추가 시스템 (확장 중)
- 이벤트 시스템 (`lib/game/eventSystem.ts`)
- 침공 대응 4종 (`lib/game/invasionSystem.ts`)
- Garrison 자동 배분 (`lib/game/garrisonSystem.ts`)
- 5-Phase 회의 시스템 + 케이스 기반 응답

> 현행 게임 시스템 상세는 [`docs/04-game-systems.md`](./04-game-systems.md) 참조.

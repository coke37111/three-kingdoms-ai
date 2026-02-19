/**
 * Phase 1 (상태 보고) 케이스 정의
 *
 * 참모별로 게임 상황을 진단하여 API 없이 즉각 대사를 생성한다.
 * 각 케이스는 condition(조건) + priority(우선순위) + variations(대사 변형)으로 구성.
 * 같은 참모 내에서 priority가 가장 높은 케이스 1개가 채택된다.
 */

import type { CaseDefinition, GameSituation } from "./types";

// =====================================================================
//  제갈량 (전략/개회) — 42개 케이스
//  항상 1개 발언. 회의 시작과 전반적 정세 분석 담당.
// =====================================================================

export const ZHUGE_PHASE1_CASES: CaseDefinition[] = [
  // ─── 첫 턴 특수 ───

  {
    id: "zhuge_first_turn",
    advisor: "제갈량",
    priority: 80,
    condition: (s) => s.turn === 1,
    variations: [
      { dialogue: "주공, 제갈량이옵니다. 첫 회의를 시작하겠습니다. 아직 미약하오나, 큰 뜻을 품고 나아갑시다. 각 참모의 보고를 들으시옵소서.", emotion: "calm" },
      { dialogue: "주공, 대업의 첫걸음을 내딛겠습니다. 우리의 현 상황을 파악하고 방향을 정합시다.", emotion: "calm" },
    ],
  },

  // ─── 개회 발언 (기본, 시기별) ───

  {
    id: "zhuge_open_early",
    advisor: "제갈량",
    priority: 12,
    condition: (s) => s.gamePhase === "early" && s.turn <= 5,
    variations: [
      { dialogue: "주공, 아직 기반이 약하오니 내실부터 다져야 합니다. 보고를 시작하겠습니다.", emotion: "thoughtful" },
      { dialogue: "초석을 다질 때입니다. 각 참모의 보고를 들어보시옵소서.", emotion: "calm" },
      { dialogue: "주공, 천리 길도 한 걸음부터라 했습니다. 보고를 시작합시다.", emotion: "calm" },
    ],
  },
  {
    id: "zhuge_open_early_stable",
    advisor: "제갈량",
    priority: 11,
    condition: (s) => s.gamePhase === "early" && s.turn > 5,
    variations: [
      { dialogue: "주공, 기반이 조금씩 갖춰지고 있습니다. 이번 턴 보고를 드리겠습니다.", emotion: "calm" },
      { dialogue: "서서히 체제가 잡혀가고 있사옵니다. 보고를 올리겠습니다.", emotion: "calm" },
    ],
  },
  {
    id: "zhuge_open_mid",
    advisor: "제갈량",
    priority: 11,
    condition: (s) => s.gamePhase === "mid",
    variations: [
      { dialogue: "주공, 천하 삼분의 정세가 본격화되고 있습니다. 보고를 시작합니다.", emotion: "thoughtful" },
      { dialogue: "중원의 패권 다툼이 격화되고 있습니다. 보고를 올리겠습니다.", emotion: "thoughtful" },
      { dialogue: "주공, 이번 턴 정세를 살펴봅시다.", emotion: "calm" },
    ],
  },
  {
    id: "zhuge_open_late",
    advisor: "제갈량",
    priority: 13,
    condition: (s) => s.gamePhase === "late",
    variations: [
      { dialogue: "주공, 결전의 때가 다가오고 있습니다. 보고를 들으시옵소서.", emotion: "thoughtful" },
      { dialogue: "천하 대세가 곧 결정될 것입니다. 이번 턴 보고를 시작합니다.", emotion: "excited" },
      { dialogue: "종막이 가까워지고 있습니다. 신중하게 한 수 한 수를 두어야 합니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_open_default",
    advisor: "제갈량",
    priority: 10,
    condition: () => true,
    variations: [
      { dialogue: "주공, 이번 턴 보고를 시작하겠습니다.", emotion: "calm" },
      { dialogue: "참모들의 보고를 들으시옵소서.", emotion: "calm" },
      { dialogue: "그러면 금번 회의를 시작하겠사옵니다.", emotion: "calm" },
      { dialogue: "주공, 정세를 살펴보겠습니다.", emotion: "calm" },
    ],
  },

  // ─── 정세 분석 (전력 비교) ───

  {
    id: "zhuge_dominant",
    advisor: "제갈량",
    priority: 35,
    condition: (s) => s.strategic.overallStrength === "dominant",
    variations: [
      { dialogue: "주공, 보고드립니다. 이제 천하는 우리 손안에 있습니다! 마지막 일격을 준비합시다.", emotion: "excited" },
      { dialogue: "보고를 올리겠습니다. 대세가 완전히 기울었습니다. 이 기세를 놓쳐서는 안 됩니다.", emotion: "excited" },
    ],
  },
  {
    id: "zhuge_advantage",
    advisor: "제갈량",
    priority: 30,
    condition: (s) => s.strategic.overallStrength === "advantage",
    variations: [
      { dialogue: "주공, 보고를 시작합니다. 천하의 형세가 유리하게 돌아가고 있사옵니다.", emotion: "excited" },
      { dialogue: "보고를 올리겠습니다. 우리 세력이 점차 강해지고 있습니다. 좋은 흐름입니다.", emotion: "calm" },
      { dialogue: "이번 턴 보고입니다. 지금의 기세를 이어가면 대업을 이룰 수 있습니다.", emotion: "excited" },
    ],
  },
  {
    id: "zhuge_balanced",
    advisor: "제갈량",
    priority: 20,
    condition: (s) => s.strategic.overallStrength === "balanced",
    variations: [
      { dialogue: "주공, 보고를 시작합니다. 천하 삼분의 균형이 유지되고 있습니다. 틈을 노려야 합니다.", emotion: "thoughtful" },
      { dialogue: "보고를 올리겠습니다. 아직 대세가 결정되지 않았습니다. 한 수 앞을 내다봐야 합니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_disadvantage",
    advisor: "제갈량",
    priority: 38,
    condition: (s) => s.strategic.overallStrength === "disadvantage",
    variations: [
      { dialogue: "주공, 보고를 올리겠습니다. 현 상황이 녹록하지 않사옵니다. 신중해야 합니다.", emotion: "worried" },
      { dialogue: "보고를 시작합니다. 적의 기세가 대단합니다. 지금은 힘을 기를 때입니다.", emotion: "thoughtful" },
      { dialogue: "주공, 금번 보고를 드립니다. 불리한 정세이나 절망할 때가 아닙니다. 방도를 찾읍시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_critical",
    advisor: "제갈량",
    priority: 45,
    condition: (s) => s.strategic.overallStrength === "critical",
    variations: [
      { dialogue: "주공, 급히 보고 올립니다. 사태가 심각합니다. 지금이 존망의 기로입니다.", emotion: "worried" },
      { dialogue: "긴급 보고입니다. 위기입니다. 모든 역량을 집중하지 않으면 안 됩니다.", emotion: "angry" },
      { dialogue: "주공... 보고를 드리겠습니다. 한 치 앞도 보이지 않는 형국이나... 길은 반드시 있습니다.", emotion: "thoughtful" },
    ],
  },

  // ─── 전투 직후 반응 ───

  {
    id: "zhuge_after_victory",
    advisor: "제갈량",
    priority: 55,
    condition: (s) => s.strategic.recentBattleWon && !s.strategic.recentCastleGained,
    variations: [
      { dialogue: "지난 승전을 축하드립니다. 이 기세를 어떻게 이어갈지 논의합시다.", emotion: "excited" },
      { dialogue: "승리하였으나 방심은 금물입니다. 보고를 들어봅시다.", emotion: "calm" },
    ],
  },
  {
    id: "zhuge_after_castle_gained",
    advisor: "제갈량",
    priority: 60,
    condition: (s) => s.strategic.recentCastleGained,
    variations: [
      { dialogue: "새 성채를 얻었습니다! 이를 굳건히 지키면서 다음을 도모합시다.", emotion: "excited" },
      { dialogue: "영토가 확장되었습니다. 축하드리옵니다. 방비를 서둘러야 합니다.", emotion: "excited" },
    ],
  },
  {
    id: "zhuge_after_defeat",
    advisor: "제갈량",
    priority: 58,
    condition: (s) => s.strategic.recentBattleLost && !s.strategic.recentCastleLost,
    variations: [
      { dialogue: "지난 패전의 원인을 분석하고 재기를 도모합시다.", emotion: "thoughtful" },
      { dialogue: "한 번의 패배로 무너지는 것이 아닙니다. 대책을 논의합시다.", emotion: "calm" },
    ],
  },
  {
    id: "zhuge_after_castle_lost",
    advisor: "제갈량",
    priority: 65,
    condition: (s) => s.strategic.recentCastleLost,
    variations: [
      { dialogue: "성채를 잃었습니다... 통탄스럽사오나, 반드시 되찾읍시다.", emotion: "worried" },
      { dialogue: "주공, 잃은 것은 크나 아직 기회는 있습니다. 대책을 세웁시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_after_invasion",
    advisor: "제갈량",
    priority: 57,
    condition: (s) => s.strategic.recentInvasion && !s.strategic.recentCastleLost,
    variations: [
      { dialogue: "적의 침공을 막아냈습니다. 방비를 더 강화해야 합니다.", emotion: "thoughtful" },
      { dialogue: "침공을 물리쳤으나 또 올 것입니다. 대비합시다.", emotion: "worried" },
    ],
  },

  // ─── 연승/연패 ───

  {
    id: "zhuge_win_streak",
    advisor: "제갈량",
    priority: 50,
    condition: (s) => s.strategic.consecutiveWins >= 3,
    variations: [
      {
        dialogue: (s) => `${s.strategic.consecutiveWins}연승의 기세입니다! 하나 교만은 패망의 시작이옵니다.`,
        emotion: "thoughtful",
      },
      { dialogue: "연전연승이나 자만하면 안 됩니다. 초심을 잃지 맙시다.", emotion: "calm" },
    ],
  },
  {
    id: "zhuge_lose_streak",
    advisor: "제갈량",
    priority: 52,
    condition: (s) => s.strategic.consecutiveLosses >= 3,
    variations: [
      { dialogue: "연이은 패배... 전략을 근본부터 재검토해야 합니다.", emotion: "worried" },
      {
        dialogue: (s) => `${s.strategic.consecutiveLosses}연패입니다. 주공, 지금은 칼을 갈며 기회를 기다려야 합니다.`,
        emotion: "thoughtful",
      },
    ],
  },

  // ─── 턴 마일스톤 ───

  {
    id: "zhuge_milestone_30",
    advisor: "제갈량",
    priority: 42,
    condition: (s) => s.turn === 30,
    variations: [
      { dialogue: "30턴이 지났습니다. 그간의 성과를 되돌아보고 중기 전략을 수립합시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_milestone_60",
    advisor: "제갈량",
    priority: 42,
    condition: (s) => s.turn === 60,
    variations: [
      { dialogue: "벌써 60턴... 천하 대세가 서서히 드러나고 있습니다.", emotion: "thoughtful" },
      { dialogue: "절반이 지났습니다. 이제부터가 진정한 싸움입니다.", emotion: "excited" },
    ],
  },
  {
    id: "zhuge_milestone_90",
    advisor: "제갈량",
    priority: 43,
    condition: (s) => s.turn === 90,
    variations: [
      { dialogue: "90턴입니다. 최후의 30턴, 결단의 시간이 왔습니다.", emotion: "excited" },
    ],
  },
  {
    id: "zhuge_milestone_100",
    advisor: "제갈량",
    priority: 44,
    condition: (s) => s.turn >= 100 && s.turn % 10 === 0,
    variations: [
      {
        dialogue: (s) => `${s.turn}턴... 남은 시간이 ${120 - s.turn}턴뿐입니다. 서두릅시다.`,
        emotion: "worried",
      },
    ],
  },

  // ─── 특수 상황 ───

  {
    id: "zhuge_enemy_near_capital",
    advisor: "제갈량",
    priority: 70,
    condition: (s) => s.strategic.enemyNearCapital,
    variations: [
      { dialogue: "주공! 적이 우리 본성 근처까지 밀고 왔습니다. 긴급 대응이 필요합니다!", emotion: "worried" },
      { dialogue: "본성이 위협받고 있습니다. 모든 것에 우선하여 방어해야 합니다.", emotion: "angry" },
    ],
  },
  {
    id: "zhuge_near_enemy_capital",
    advisor: "제갈량",
    priority: 55,
    condition: (s) => s.strategic.nearEnemyCapital,
    variations: [
      { dialogue: "적의 본성이 눈앞에 있습니다. 최후의 일격을 준비합시다!", emotion: "excited" },
      { dialogue: "적 본성까지 도달했습니다. 신중하되 과감하게 공략합시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_level_up",
    advisor: "제갈량",
    priority: 48,
    condition: (s) => s.strategic.leveledUp,
    variations: [
      {
        dialogue: (s) => `주공께서 ${s.strategic.rulerLevel}단계에 이르셨습니다. 배치 상한이 늘어났사옵니다.`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "zhuge_skill_unlocked",
    advisor: "제갈량",
    priority: 47,
    condition: (s) => s.strategic.skillUnlocked,
    variations: [
      { dialogue: "새 기술이 해금되었습니다. 전략의 폭이 넓어졌사옵니다.", emotion: "excited" },
    ],
  },
  {
    id: "zhuge_sp_can_unlock",
    advisor: "제갈량",
    priority: 32,
    condition: (s) => s.strategic.spCanUnlock && s.strategic.sp >= 5,
    variations: [
      {
        dialogue: (s) => `전략포인트가 ${s.strategic.sp}입니다. 새로운 기술을 연구할 수 있사옵니다.`,
        emotion: "thoughtful",
      },
      { dialogue: "스킬 트리에서 해금할 수 있는 기술이 있습니다. 검토해 보시옵소서.", emotion: "calm" },
    ],
  },
  {
    id: "zhuge_single_castle",
    advisor: "제갈량",
    priority: 68,
    condition: (s) => s.strategic.castleCount === 1,
    variations: [
      { dialogue: "주공, 마지막 성채 하나만 남았습니다. 이곳을 잃으면 모든 것이 끝입니다.", emotion: "worried" },
      { dialogue: "배수의 진입니다. 이 성을 지키면서 반격의 기회를 찾읍시다.", emotion: "angry" },
    ],
  },
  {
    id: "zhuge_many_castles",
    advisor: "제갈량",
    priority: 33,
    condition: (s) => s.strategic.castleCount >= 10,
    variations: [
      {
        dialogue: (s) => `성채 ${s.strategic.castleCount}개를 보유하고 있습니다. 대업이 눈앞에 있사옵니다.`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "zhuge_recent_event",
    advisor: "제갈량",
    priority: 46,
    condition: (s) => s.strategic.recentEvent,
    variations: [
      { dialogue: "지난 턴 뜻밖의 일이 있었습니다. 영향을 살펴봅시다.", emotion: "thoughtful" },
      { dialogue: "예상치 못한 사건이 있었습니다. 보고를 들어봅시다.", emotion: "worried" },
    ],
  },

  // ─── 추가 전략 분석 ───

  {
    id: "zhuge_two_weak_enemies",
    advisor: "제갈량",
    priority: 40,
    condition: (s) => s.strategic.weakestEnemy !== null &&
      s.military.mp > s.strategic.weakestEnemy.mp * 1.5 &&
      s.strategic.overallStrength !== "disadvantage" &&
      s.strategic.overallStrength !== "critical",
    variations: [
      {
        dialogue: (s) => `${s.strategic.weakestEnemy!.name}이 우리보다 약합니다. 먼저 약한 적을 쓰러뜨린 뒤 강한 적에 집중합시다.`,
        emotion: "thoughtful",
      },
      { dialogue: "약한 적부터 각개격파하는 것이 상책입니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_sp_accumulating",
    advisor: "제갈량",
    priority: 29,
    condition: (s) => s.strategic.sp >= 10 && !s.strategic.spCanUnlock,
    variations: [
      {
        dialogue: (s) => `전략포인트가 ${s.strategic.sp}이나 쌓여 있습니다. 새 스킬 연구를 검토하시옵소서.`,
        emotion: "thoughtful",
      },
    ],
  },
  {
    id: "zhuge_we_are_weakest",
    advisor: "제갈량",
    priority: 36,
    condition: (s) => {
      const threats = [s.strategic.biggestThreat, s.strategic.weakestEnemy].filter(Boolean);
      return threats.length === 2 && threats.every(e => e!.mp > s.military.mp);
    },
    variations: [
      { dialogue: "솔직히 우리가 삼국 중 가장 약합니다. 그러나 역사상 약자가 이긴 사례가 많습니다. 방도를 찾읍시다.", emotion: "thoughtful" },
      { dialogue: "형세가 불리하나 낙담하지 마십시오. 지략으로 역전할 수 있습니다.", emotion: "calm" },
    ],
  },
  {
    id: "zhuge_mid_stable_progress",
    advisor: "제갈량",
    priority: 17,
    condition: (s) => s.gamePhase === "mid" && s.strategic.overallStrength === "balanced" && s.economy.highIncome,
    variations: [
      { dialogue: "중반부에 접어들었으나 내실이 탄탄합니다. 이 기세를 이어갑시다.", emotion: "calm" },
      { dialogue: "균형 잡힌 성장세입니다. 여기서 한 수를 더 두어야 합니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_castle_5_to_9",
    advisor: "제갈량",
    priority: 28,
    condition: (s) => s.strategic.castleCount >= 5 && s.strategic.castleCount < 10,
    variations: [
      {
        dialogue: (s) => `성채 ${s.strategic.castleCount}개를 보유하고 있습니다. 착실히 성장하고 있사옵니다.`,
        emotion: "calm",
      },
      {
        dialogue: (s) => `${s.strategic.castleCount}개 성채... 중원 패권이 가까워지고 있습니다.`,
        emotion: "thoughtful",
      },
    ],
  },
  {
    id: "zhuge_near_enemy_but_weak_army",
    advisor: "제갈량",
    priority: 62,
    condition: (s) => s.strategic.nearEnemyCapital && s.military.troopShortage,
    variations: [
      { dialogue: "적 본성이 눈앞이나 군사포인트(병력)이 부족합니다. 무리한 공격은 위험합니다. 먼저 모병하십시오.", emotion: "worried" },
      { dialogue: "기회가 왔으나 준비가 덜 됐습니다. 욕심 내지 말고 전력을 갖춘 뒤 공략합시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_after_strategy_fail",
    advisor: "제갈량",
    priority: 54,
    condition: (s) => s.strategic.consecutiveLosses === 2,
    variations: [
      { dialogue: "두 번 연패... 전략 자체를 재고해야 합니다. 보고를 들어봅시다.", emotion: "worried" },
      { dialogue: "패인을 분석해야 합니다. 같은 실수를 반복해선 안 됩니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_dominant_last_push",
    advisor: "제갈량",
    priority: 38,
    condition: (s) => s.strategic.overallStrength === "dominant" && s.strategic.castleCount >= 12,
    variations: [
      { dialogue: "거의 다 왔습니다. 마지막 일격만 남았사옵니다. 긴장을 놓지 마십시오.", emotion: "excited" },
      { dialogue: "대업이 목전입니다! 전력을 집중하여 마무리합시다.", emotion: "excited" },
    ],
  },
  {
    id: "zhuge_high_sp_can_unlock",
    advisor: "제갈량",
    priority: 34,
    condition: (s) => s.strategic.sp >= 8 && s.strategic.spCanUnlock,
    variations: [
      {
        dialogue: (s) => `전략포인트 ${s.strategic.sp}, 연구 가능합니다. 지금이 스킬 투자의 적기입니다.`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "zhuge_mid_turning_point",
    advisor: "제갈량",
    priority: 41,
    condition: (s) => s.turn >= 40 && s.turn <= 50 && s.gamePhase === "mid",
    variations: [
      { dialogue: "중원의 형세가 갈림길에 서 있습니다. 이 시기의 선택이 판도를 결정합니다.", emotion: "thoughtful" },
      { dialogue: "이 구간이 천하 삼분의 분기점입니다. 신중한 한 수가 필요합니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "zhuge_allied_strong",
    advisor: "제갈량",
    priority: 31,
    condition: (s) => s.diplomacy.anyAllied && s.strategic.overallStrength !== "critical",
    variations: [
      { dialogue: "동맹이 있으니 두 방면에서 협공이 가능합니다. 이를 전략에 활용합시다.", emotion: "thoughtful" },
      { dialogue: "동맹국과의 협력이 강점입니다. 연계 전략을 구상해 봅시다.", emotion: "calm" },
    ],
  },
  {
    id: "zhuge_good_economy_expand",
    advisor: "제갈량",
    priority: 19,
    condition: (s) => s.economy.highIncome && s.economy.ipRich && s.strategic.overallStrength !== "critical",
    variations: [
      { dialogue: "내정이 탄탄합니다. 이 경제력을 바탕으로 군비를 더 강화합시다.", emotion: "excited" },
      { dialogue: "경제 기반이 굳건합니다. 이제 군사력을 키울 여유가 생겼습니다.", emotion: "calm" },
    ],
  },
];

// =====================================================================
//  관우 (군사) — 48개 케이스
//  군사적 이슈가 있을 때 발언. 이슈 없으면 생략 가능.
// =====================================================================

export const GUAN_PHASE1_CASES: CaseDefinition[] = [
  // ─── 병력 상태 ───

  {
    id: "guan_troops_critical",
    advisor: "관우",
    priority: 75,
    condition: (s) => s.military.troopsCritical,
    variations: [
      { dialogue: "군사포인트(병력)이 만도 안 되오! 이래서야 한 번 싸움도 못 하오.", emotion: "angry" },
      {
        dialogue: (s) => `겨우 ${s.military.troops.toLocaleString()}명... 당장 모병하지 않으면 멸망이오!`,
        emotion: "angry",
      },
      { dialogue: "주공, 병사가 없으면 나라도 없소. 모병이 급선무요!", emotion: "angry",
        passiveDialogue: "병력이... 심히 부족합니다.",
      },
    ],
    statusReport: (s) => ({
      speaker: "관우",
      report: `현재 병력 ${s.military.troops.toLocaleString()}명, 위급한 상태`,
    }),
  },
  {
    id: "guan_troops_shortage",
    advisor: "관우",
    priority: 60,
    condition: (s) => s.military.troopShortage && !s.military.troopsCritical,
    variations: [
      { dialogue: "군사포인트(병력)이 태부족이오. 모병이 시급합니다.", emotion: "angry" },
      { dialogue: "이 군사포인트(병력)으로는 싸움이 되지 않소. 모병을 서둘러야 하오.", emotion: "worried" },
      {
        dialogue: (s) => `병력이 ${Math.round(s.military.troops / 10000)}만에 불과하오. 보충이 필요합니다.`,
        emotion: "worried",
      },
    ],
    statusReport: (s) => ({
      speaker: "관우",
      report: `현재 병력 ${s.military.troops.toLocaleString()}명, 모병 필요`,
    }),
  },
  {
    id: "guan_troops_adequate",
    advisor: "관우",
    priority: 15,
    condition: (s) => s.military.troopsAdequate,
    variations: [
      { dialogue: "군사포인트(병력)은 그럭저럭 유지되고 있소. 하나 더 모을 수 있으면 좋겠소.", emotion: "calm" },
      {
        dialogue: (s) => `병력 ${Math.round(s.military.troops / 10000)}만. 기본은 갖추었으나 넉넉하지는 않소.`,
        emotion: "calm",
      },
    ],
  },
  {
    id: "guan_troops_abundant",
    advisor: "관우",
    priority: 20,
    condition: (s) => s.military.troopsAbundant && !s.military.troopsAtCap,
    variations: [
      { dialogue: "군사포인트(병력)이 충분하오. 이제 질적 강화에 집중할 때요.", emotion: "calm" },
      {
        dialogue: (s) => `${Math.round(s.military.troops / 10000)}만 대군이오. 어디든 싸울 수 있소!`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "guan_troops_at_cap",
    advisor: "관우",
    priority: 25,
    condition: (s) => s.military.troopsAtCap,
    variations: [
      { dialogue: "배치 상한에 도달했소. 더 늘리려면 군주 레벨을 올려야 하오.", emotion: "thoughtful" },
      { dialogue: "이 이상 모병은 어렵소. 지금 군사포인트(병력)으로 최선을 다합시다.", emotion: "calm" },
    ],
  },

  // ─── 훈련도 ───

  {
    id: "guan_training_very_low",
    advisor: "관우",
    priority: 58,
    condition: (s) => s.military.training < 0.3,
    variations: [
      { dialogue: "훈련도가 참담하오! 이 상태론 오합지졸에 불과하오.", emotion: "angry" },
      {
        dialogue: (s) => `훈련도 ${(s.military.training * 100).toFixed(0)}%... 이래서야 전장에 세울 수 없소!`,
        emotion: "angry",
      },
    ],
  },
  {
    id: "guan_training_low",
    advisor: "관우",
    priority: 48,
    condition: (s) => s.military.lowTraining && s.military.training >= 0.3,
    variations: [
      { dialogue: "병사들의 훈련이 부족하오. 훈련을 강화해야 합니다.", emotion: "worried" },
      {
        dialogue: (s) => `훈련도가 ${(s.military.training * 100).toFixed(0)}%에 불과하오. 전투력이 떨어지오.`,
        emotion: "worried",
      },
      { dialogue: "훈련이 부족한 병사로는 승리를 장담할 수 없소.", emotion: "worried" },
    ],
  },
  {
    id: "guan_training_mid",
    advisor: "관우",
    priority: 12,
    condition: (s) => s.military.midTraining,
    variations: [
      {
        dialogue: (s) => `훈련도 ${(s.military.training * 100).toFixed(0)}%입니다. 기본 수준은 갖추고 있소.`,
        emotion: "calm",
      },
      {
        dialogue: (s) => `현재 훈련도 ${(s.military.training * 100).toFixed(0)}%. 실전 투입은 가능한 수준이오.`,
        emotion: "calm",
      },
    ],
  },
  {
    id: "guan_training_high",
    advisor: "관우",
    priority: 22,
    condition: (s) => s.military.highTraining && !s.military.maxTraining,
    variations: [
      { dialogue: "병사들의 기량이 상당히 올랐소. 어디서든 싸울 수 있소!", emotion: "excited" },
      { dialogue: "훈련이 잘 되어 있소. 이 정예병이면 자신 있소.", emotion: "calm" },
    ],
  },
  {
    id: "guan_training_max",
    advisor: "관우",
    priority: 28,
    condition: (s) => s.military.maxTraining,
    variations: [
      { dialogue: "정예 중의 정예요! 이 병사들이면 천하를 누빌 수 있소!", emotion: "excited" },
      { dialogue: "훈련도가 최고 수준이오. 한 명이 열을 당할 수 있소.", emotion: "excited" },
    ],
  },

  // ─── 사기 ───

  {
    id: "guan_morale_low",
    advisor: "관우",
    priority: 55,
    condition: (s) => s.military.lowMorale,
    variations: [
      { dialogue: "사기가 바닥이오. 병사들의 눈에서 빛이 사라졌소.", emotion: "worried" },
      { dialogue: "병사들이 전의를 잃었소. 사기 진작이 급선무요!", emotion: "angry" },
      { dialogue: "이 상태로 전투에 나가면 패할 것이 뻔하오. 사기부터 올려야 하오.", emotion: "worried" },
    ],
  },
  {
    id: "guan_morale_high",
    advisor: "관우",
    priority: 24,
    condition: (s) => s.military.highMorale,
    variations: [
      { dialogue: "병사들의 사기가 충천하오! 지금이야말로 출격할 때요!", emotion: "excited" },
      { dialogue: "장병들의 눈빛이 살아 있소. 이 기세면 무엇이든 가능하오.", emotion: "excited" },
    ],
  },

  // ─── 부상병 ───

  {
    id: "guan_wounded_small",
    advisor: "관우",
    priority: 30,
    condition: (s) => s.military.woundedRecovering > 0 && s.military.woundedRecovering <= 10000,
    variations: [
      {
        dialogue: (s) => `부상병 ${s.military.woundedRecovering.toLocaleString()}명이 치료 중이오. 곧 복귀할 것이오.`,
        emotion: "calm",
      },
    ],
  },
  {
    id: "guan_wounded_large",
    advisor: "관우",
    priority: 40,
    condition: (s) => s.military.woundedRecovering > 10000,
    variations: [
      {
        dialogue: (s) => `부상병이 ${s.military.woundedRecovering.toLocaleString()}명이나 되오. ${s.military.woundedTurnsLeft}턴은 전력 회복이 어렵소.`,
        emotion: "worried",
      },
      {
        dialogue: (s) => `${Math.round(s.military.woundedRecovering / 10000)}만 명이 부상 중이오. 당분간 대규모 전투는 삼가야 하오.`,
        emotion: "worried",
      },
    ],
  },

  // ─── 적과의 비교 ───

  {
    id: "guan_enemy_overwhelming",
    advisor: "관우",
    priority: 52,
    condition: (s) => s.strategic.biggestThreat !== null && s.strategic.biggestThreat.mp > s.military.mp * 3,
    variations: [
      {
        dialogue: (s) => `${s.strategic.biggestThreat!.name}의 군세가 우리의 세 배가 넘소! 정면승부는 무모하오.`,
        emotion: "worried",
      },
      {
        dialogue: (s) => `${s.strategic.biggestThreat!.name} 군의 병력이 압도적이오. 지금은 피해야 하오.`,
        emotion: "worried",
      },
      {
        dialogue: (s) => `${s.strategic.biggestThreat!.name}이 너무 강하오. 방통, 외교로 시간을 벌 수는 없겠소?`,
        emotion: "worried",
      },
    ],
  },
  {
    id: "guan_enemy_stronger",
    advisor: "관우",
    priority: 45,
    condition: (s) => s.strategic.biggestThreat !== null &&
      s.strategic.biggestThreat.mp > s.military.mp * 1.5 &&
      s.strategic.biggestThreat.mp <= s.military.mp * 3,
    variations: [
      {
        dialogue: (s) => `${s.strategic.biggestThreat!.name}의 군세가 우세하오. 방비를 서둘러야 하오.`,
        emotion: "worried",
      },
      {
        dialogue: (s) => `${s.strategic.biggestThreat!.name}이 우리보다 강하오. 경계를 늦추지 마시오.`,
        emotion: "worried",
      },
    ],
  },
  {
    id: "guan_we_stronger",
    advisor: "관우",
    priority: 26,
    condition: (s) => s.strategic.weakestEnemy !== null && s.military.mp > s.strategic.weakestEnemy.mp * 1.5,
    variations: [
      {
        dialogue: (s) => `${s.strategic.weakestEnemy!.name}보다 우리 군세가 앞서오. 공격의 기회요!`,
        emotion: "excited",
      },
      {
        dialogue: (s) => `${s.strategic.weakestEnemy!.name}의 허를 찌를 수 있소. 출격을 건의하오!`,
        emotion: "excited",
        passiveDialogue: (s) => `${s.strategic.weakestEnemy!.name}이 약해 보이긴 합니다...`,
      },
    ],
  },

  // ─── 전투 직후 반응 ───

  {
    id: "guan_after_victory",
    advisor: "관우",
    priority: 56,
    condition: (s) => s.strategic.recentBattleWon,
    variations: [
      { dialogue: "통쾌한 승리였소! 하하, 이 관우가 있는 한 패배란 없소!", emotion: "excited" },
      { dialogue: "대승이오! 병사들도 기뻐하고 있소.", emotion: "excited" },
      { dialogue: "승전보를 올리오! 적의 간담이 서늘해졌을 것이오.", emotion: "excited" },
    ],
  },
  {
    id: "guan_after_defeat",
    advisor: "관우",
    priority: 57,
    condition: (s) => s.strategic.recentBattleLost,
    variations: [
      { dialogue: "... 이번 패배, 부끄럽소. 반드시 설욕하겠소!", emotion: "angry" },
      { dialogue: "이 치욕을 잊지 않겠소. 다시는 지지 않겠소!", emotion: "angry" },
      { dialogue: "패했으나 의기를 잃지는 않겠소. 재기를 도모합시다.", emotion: "thoughtful",
        passiveDialogue: "... 할 말이 없소.",
      },
    ],
  },
  {
    id: "guan_defense_success",
    advisor: "관우",
    priority: 53,
    condition: (s) => s.strategic.recentInvasion && !s.strategic.recentCastleLost,
    variations: [
      { dialogue: "적의 침공을 막아냈소! 성벽을 지킨 장병들이 자랑스럽소.", emotion: "excited" },
      { dialogue: "수성에 성공했소. 하나 다음 공격에도 대비해야 하오.", emotion: "calm" },
    ],
  },

  // ─── 전선 상태 ───

  {
    id: "guan_frontline_threatened",
    advisor: "관우",
    priority: 42,
    condition: (s) => s.strategic.adjacentEnemyCastles.length >= 3,
    variations: [
      {
        dialogue: (s) => `전선이 ${s.strategic.adjacentEnemyCastles.length}곳에서 적과 맞닿아 있소. 방어가 벅차오.`,
        emotion: "worried",
      },
      { dialogue: "사방에서 적이 노리고 있소. 전선 정리가 필요하오.", emotion: "worried" },
    ],
  },
  {
    id: "guan_frontline_stable",
    advisor: "관우",
    priority: 8,
    condition: (s) => s.strategic.adjacentEnemyCastles.length <= 1,
    variations: [
      { dialogue: "전선이 안정적이오. 병사들이 잘 따르고 있소.", emotion: "calm" },
      { dialogue: "군사적으로 문제 없소. 기강이 바로 서 있소.", emotion: "calm" },
    ],
  },
  {
    id: "guan_two_front_war",
    advisor: "관우",
    priority: 50,
    condition: (s) => {
      const r = s.diplomacy.relations;
      return r.every(rel => rel.isHostile) && s.strategic.adjacentEnemyCastles.length >= 2;
    },
    variations: [
      { dialogue: "양면 전쟁이오! 이래서는 군사포인트(병력)이 분산되어 위험하오.", emotion: "angry" },
      { dialogue: "두 방면에서 적이 압박하고 있소. 한쪽은 외교로 풀어야 하오.", emotion: "worried" },
    ],
  },

  // ─── 조합 상태 ───

  {
    id: "guan_ready_for_war",
    advisor: "관우",
    priority: 35,
    condition: (s) => s.military.troopsAbundant && s.military.highTraining && !s.military.lowMorale,
    variations: [
      { dialogue: "군사포인트(병력), 훈련, 사기 모두 충분하오! 언제든 출격할 수 있소!", emotion: "excited" },
      { dialogue: "만반의 준비가 되었소. 주공의 명만 내리시오!", emotion: "excited" },
    ],
  },
  {
    id: "guan_worst_state",
    advisor: "관우",
    priority: 72,
    condition: (s) => s.military.troopShortage && s.military.lowTraining && s.military.lowMorale,
    variations: [
      { dialogue: "군사포인트(병력)도, 훈련도, 사기도 바닥이오... 이 관우 면목이 없소.", emotion: "worried" },
      { dialogue: "군사적으로 최악의 상태요. 전투를 피하고 재건에 집중해야 하오.", emotion: "worried" },
    ],
  },
  {
    id: "guan_troops_low_but_trained",
    advisor: "관우",
    priority: 38,
    condition: (s) => s.military.troopShortage && s.military.highTraining,
    variations: [
      { dialogue: "수는 적으나 정예요. 소수정예로 적을 상대할 수 있소.", emotion: "thoughtful" },
      { dialogue: "군사포인트(병력)은 부족하나 한 명 한 명이 백 명의 값을 하오.", emotion: "calm" },
    ],
  },
  {
    id: "guan_many_but_untrained",
    advisor: "관우",
    priority: 43,
    condition: (s) => s.military.troopsAbundant && s.military.lowTraining,
    variations: [
      { dialogue: "수만 많고 전투력이 없소! 오합지졸을 정예로 만들어야 하오.", emotion: "angry" },
      { dialogue: "군사포인트(병력)은 많으나 훈련이 안 되었소. 이대로 전쟁하면 패하오.", emotion: "worried" },
    ],
  },

  // ─── 자원 부족 크로스 참조 ───

  {
    id: "guan_need_funds_recruit",
    advisor: "관우",
    priority: 65,
    condition: (s) => s.military.troopsCritical && s.economy.ip < 10,
    variations: [
      { dialogue: "모병이 급하나 자금이 없소! 미축, 어떻게든 마련해 달라!", emotion: "angry" },
      {
        dialogue: (s) => `병력이 ${s.military.troops.toLocaleString()}뿐인데 모병할 돈이 없소... 미축에게 부탁하는 수밖에.`,
        emotion: "worried",
      },
      { dialogue: "자금만 있으면 당장 모병할 수 있소. 내정이 급선무요!", emotion: "angry" },
    ],
  },
  {
    id: "guan_need_funds_train",
    advisor: "관우",
    priority: 50,
    condition: (s) => s.military.training < 0.3 && s.economy.ip < 15 && !s.military.troopsCritical,
    variations: [
      { dialogue: "훈련이 급하나 자금이 부족하오. 미축, 서둘러 재원을 확보해 달라.", emotion: "worried" },
      { dialogue: "오합지졸을 그대로 둘 수는 없소. 내정포인트가 모이면 즉시 훈련에 투입하겠소.", emotion: "worried" },
    ],
  },

  // ─── 안정 (기본) ───

  {
    id: "guan_stable",
    advisor: "관우",
    priority: 5,
    condition: () => true,
    variations: [
      { dialogue: "군사적으로 특별한 변동은 없소.", emotion: "calm" },
      { dialogue: "장병들이 잘 따르고 있소. 이상 없소.", emotion: "calm" },
      { dialogue: "평온하오. 주공의 명을 기다리겠소.", emotion: "calm" },
      { dialogue: "평온하오. 병사들의 기강은 유지되고 있소.", emotion: "calm" },
      { dialogue: "조용한 날이오. 전방에 이상 없소.", emotion: "calm" },
    ],
  },

  // ─── 추가 군사 보고 ───

  {
    id: "guan_full_force_ready",
    advisor: "관우",
    priority: 32,
    condition: (s) => s.military.troopsAbundant && s.military.highTraining && s.military.highMorale,
    variations: [
      { dialogue: "군사포인트(병력), 훈련, 사기 삼박자가 맞았소! 지금 당장 출격해도 두렵지 않소!", emotion: "excited" },
      { dialogue: "만반의 준비가 되었소. 어느 적도 당할 수 없소!", emotion: "excited" },
    ],
  },
  {
    id: "guan_near_capital_ready",
    advisor: "관우",
    priority: 58,
    condition: (s) => s.strategic.nearEnemyCapital && s.military.troopsAbundant && s.military.highTraining,
    variations: [
      { dialogue: "적 본성이 눈앞이오! 이 관우, 선봉에 서겠소. 결전의 날이 왔소!", emotion: "excited" },
      { dialogue: "최후의 일격이오. 군사포인트(병력)도 훈련도 만반이오. 돌격합시다!", emotion: "excited" },
    ],
  },
  {
    id: "guan_morale_normal",
    advisor: "관우",
    priority: 9,
    condition: (s) => !s.military.lowMorale && !s.military.highMorale,
    variations: [
      { dialogue: "병사들의 사기는 보통 수준이오. 뭔가 계기가 있으면 올릴 수 있소.", emotion: "calm" },
      { dialogue: "사기가 나쁘진 않소. 현 상태를 유지합시다.", emotion: "calm" },
    ],
  },
  {
    id: "guan_solo_front",
    advisor: "관우",
    priority: 11,
    condition: (s) => s.strategic.adjacentEnemyCastles.length === 1,
    variations: [
      {
        dialogue: (s) => `전선이 ${s.strategic.adjacentEnemyCastles[0]} 한 곳이오. 집중 대응이 가능하오.`,
        emotion: "calm",
      },
      { dialogue: "전선이 하나로 집중되어 있소. 효율적으로 방어할 수 있소.", emotion: "calm" },
    ],
  },
  {
    id: "guan_dominant_military",
    advisor: "관우",
    priority: 27,
    condition: (s) => s.strategic.weakestEnemy !== null && s.military.mp >= s.strategic.weakestEnemy.mp * 2,
    variations: [
      {
        dialogue: (s) => `우리 병력이 ${s.strategic.weakestEnemy!.name}의 두 배요! 마음만 먹으면 언제든 쓸 수 있소.`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "guan_mass_wounded_warning",
    advisor: "관우",
    priority: 44,
    condition: (s) => s.military.woundedRecovering > 20000,
    variations: [
      {
        dialogue: (s) => `부상병이 ${Math.round(s.military.woundedRecovering / 10000)}만 명이오. 전력이 크게 줄었소. 당분간 수비에 집중해야 하오.`,
        emotion: "worried",
      },
    ],
  },
  {
    id: "guan_two_win_streak",
    advisor: "관우",
    priority: 47,
    condition: (s) => s.strategic.consecutiveWins === 2,
    variations: [
      { dialogue: "2연승이오! 이 기세를 이어가야 하오. 다음 전투도 반드시 이기겠소!", emotion: "excited" },
    ],
  },
  {
    id: "guan_late_game_resolution",
    advisor: "관우",
    priority: 39,
    condition: (s) => s.gamePhase === "late" && !s.military.troopShortage,
    variations: [
      { dialogue: "결전이 가까워졌소. 이 관우, 마지막까지 최선을 다하겠소!", emotion: "excited" },
      { dialogue: "이제 끝을 내야 할 때요. 전군의 사기가 최고조에 달했소!", emotion: "excited" },
    ],
  },
  {
    id: "guan_high_train_low_troops",
    advisor: "관우",
    priority: 36,
    condition: (s) => s.military.maxTraining && s.military.troopShortage,
    variations: [
      { dialogue: "한 명 한 명이 정예 중의 정예요. 수는 적어도 실력은 뒤지지 않소!", emotion: "calm" },
      { dialogue: "훈련은 완벽하오. 모병만 이루어지면 천하를 상대할 수 있소!", emotion: "excited" },
    ],
  },
  {
    id: "guan_hostile_strategic_comment",
    advisor: "관우",
    priority: 20,
    condition: (s) => s.diplomacy.allHostile && s.military.troopsAdequate,
    variations: [
      { dialogue: "사방이 적이오. 하나 이 관우가 지키는 한 무너지지 않겠소.", emotion: "angry" },
      { dialogue: "양면 전쟁이 두렵지 않소. 방통이 외교로 한쪽을 잡는 동안 내가 전선을 지키겠소.", emotion: "angry" },
    ],
  },
  {
    id: "guan_mid_game_stable",
    advisor: "관우",
    priority: 7,
    condition: (s) => s.gamePhase === "mid" && !s.military.troopShortage && !s.military.lowTraining,
    variations: [
      { dialogue: "중반부로 접어들었소. 군사적으로 안정적이오.", emotion: "calm" },
      { dialogue: "지금은 힘을 유지하면서 기회를 노릴 때요.", emotion: "thoughtful" },
    ],
  },
  {
    id: "guan_enthusiasm_high",
    advisor: "관우",
    priority: 16,
    condition: (s) => {
      const mood = s.advisorMood["관우"];
      return !!mood && mood.isEnthusiastic;
    },
    variations: [
      { dialogue: "오늘따라 전의가 불타오르오! 주공의 명이라면 어디든 달려가겠소!", emotion: "excited" },
      { dialogue: "의욕이 넘치오. 지금 당장이라도 출격할 수 있소!", emotion: "excited" },
    ],
  },
  {
    id: "guan_win_streak_caution",
    advisor: "관우",
    priority: 51,
    condition: (s) => s.strategic.consecutiveWins >= 2 && s.military.lowMorale,
    variations: [
      { dialogue: "연승 중이나 병사들의 피로가 쌓였소. 쉬게 해줘야 하오.", emotion: "thoughtful" },
      { dialogue: "이겼으나 무리했소. 사기가 떨어진 걸 보니 휴식이 필요하오.", emotion: "worried" },
    ],
  },
];

// =====================================================================
//  미축 (내정) — 42개 케이스
//  재정/시설 관련 보고. 매턴 수입 보고가 기본.
// =====================================================================

export const MI_PHASE1_CASES: CaseDefinition[] = [
  // ─── IP 상태 ───

  {
    id: "mi_ip_critical",
    advisor: "미축",
    priority: 70,
    condition: (s) => s.economy.ipCritical,
    variations: [
      { dialogue: "주공, 곳간이 텅 비었습니다! 당장 지출을 줄여야 합니다.", emotion: "worried" },
      { dialogue: "재정이 바닥입니다. 이대로는 아무것도 할 수 없습니다.", emotion: "angry" },
      {
        dialogue: (s) => `내정포인트가 ${s.economy.ip}뿐입니다. 긴급 사태입니다.`,
        emotion: "worried",
      },
    ],
    statusReport: (s) => ({
      speaker: "미축",
      report: `내정포인트 ${s.economy.ip}/${s.economy.ipCap}, 재정 위기`,
    }),
  },
  {
    id: "mi_ip_low",
    advisor: "미축",
    priority: 50,
    condition: (s) => s.economy.ipLow && !s.economy.ipCritical,
    variations: [
      { dialogue: "재정이 궁핍합니다. 지출을 줄이고 수입원을 확보해야 합니다.", emotion: "worried" },
      {
        dialogue: (s) => `내정포인트가 ${s.economy.ip}입니다. 여유가 없습니다.`,
        emotion: "worried",
      },
      { dialogue: "곳간이 넉넉하지 못합니다. 시설 투자로 수입을 늘려야 합니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "mi_ip_adequate",
    advisor: "미축",
    priority: 15,
    condition: (s) => s.economy.ipAdequate,
    variations: [
      {
        dialogue: (s) => `이번 턴 내정포인트 ${s.economy.ipRegen} 확보하였습니다. 재정은 안정적입니다.`,
        emotion: "calm",
      },
      {
        dialogue: (s) => `내정포인트 ${s.economy.ip}/${s.economy.ipCap}. 무리하지 않으면 운영 가능합니다.`,
        emotion: "calm",
      },
    ],
    statusReport: (s) => ({
      speaker: "미축",
      report: `시설 운영으로 내정포인트 ${s.economy.ipRegen} 확보`,
    }),
  },
  {
    id: "mi_ip_rich",
    advisor: "미축",
    priority: 22,
    condition: (s) => s.economy.ipRich && !s.economy.ipNearCap,
    variations: [
      {
        dialogue: (s) => `내정포인트가 ${s.economy.ip}입니다. 여유가 있으니 투자할 때입니다.`,
        emotion: "calm",
      },
      { dialogue: "곳간이 넉넉합니다. 시설이든 군비든 투자하기 좋은 때입니다.", emotion: "excited" },
    ],
  },
  {
    id: "mi_ip_at_cap",
    advisor: "미축",
    priority: 45,
    condition: (s) => s.economy.ipAtCap,
    variations: [
      { dialogue: "내정포인트가 상한에 도달했습니다! 저장할 수 없으니 반드시 사용하시옵소서.", emotion: "worried" },
      {
        dialogue: (s) => `${s.economy.ip}/${s.economy.ipCap} — 상한입니다. 은행을 확장하거나 즉시 사용해야 합니다.`,
        emotion: "worried",
      },
    ],
  },
  {
    id: "mi_ip_near_cap",
    advisor: "미축",
    priority: 40,
    condition: (s) => s.economy.ipNearCap && !s.economy.ipAtCap,
    variations: [
      { dialogue: "내정포인트가 상한에 가깝습니다. 은행 확장을 건의합니다.", emotion: "thoughtful" },
      {
        dialogue: (s) => `${s.economy.ip}/${s.economy.ipCap} — 곧 넘칩니다. 쓰거나 은행을 확장하셔야 합니다.`,
        emotion: "worried",
      },
    ],
  },

  // ─── 시설 상태 ───

  {
    id: "mi_no_facilities",
    advisor: "미축",
    priority: 55,
    condition: (s) => s.economy.noFacilities,
    variations: [
      { dialogue: "시설이 하나도 없습니다! 시장부터 건설해야 합니다.", emotion: "worried" },
      { dialogue: "아무런 시설이 없으니 수입이 미미합니다. 즉시 건설에 착수합시다.", emotion: "angry" },
    ],
  },
  {
    id: "mi_only_market",
    advisor: "미축",
    priority: 30,
    condition: (s) => s.economy.marketLv > 0 && s.economy.farmLv === 0 && s.economy.bankLv === 0,
    variations: [
      { dialogue: "시장만으로는 한계가 있습니다. 논을 건설하여 수입을 다각화합시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "mi_market_high_farm_low",
    advisor: "미축",
    priority: 32,
    condition: (s) => s.economy.facilityImbalance && s.economy.marketLv > s.economy.farmLv,
    variations: [
      { dialogue: "시장에 편중되어 있습니다. 논을 확장하여 균형을 맞춥시다.", emotion: "thoughtful" },
      {
        dialogue: (s) => `시장 Lv${s.economy.marketLv}에 논 Lv${s.economy.farmLv}... 균형이 맞지 않습니다.`,
        emotion: "thoughtful",
      },
    ],
  },
  {
    id: "mi_farm_high_market_low",
    advisor: "미축",
    priority: 32,
    condition: (s) => s.economy.facilityImbalance && s.economy.farmLv > s.economy.marketLv,
    variations: [
      { dialogue: "논은 충분하나 시장이 부족합니다. 시장을 확장합시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "mi_need_bank",
    advisor: "미축",
    priority: 36,
    condition: (s) => s.economy.bankLv === 0 && s.economy.ipNearCap && s.economy.marketLv >= 2,
    variations: [
      { dialogue: "은행이 없어 저장 한계가 낮습니다. 은행 건설을 건의합니다.", emotion: "thoughtful" },
      { dialogue: "내정포인트를 더 비축하려면 은행이 필요합니다.", emotion: "calm" },
    ],
  },
  {
    id: "mi_bank_expand",
    advisor: "미축",
    priority: 28,
    condition: (s) => s.economy.bankLv > 0 && s.economy.bankLv < 3 && s.economy.ipNearCap,
    variations: [
      {
        dialogue: (s) => `은행 Lv${s.economy.bankLv}으로는 부족합니다. 확장하여 상한을 올립시다.`,
        emotion: "thoughtful",
      },
    ],
  },
  {
    id: "mi_facilities_good",
    advisor: "미축",
    priority: 18,
    condition: (s) => s.economy.marketLv >= 3 && s.economy.farmLv >= 2 && !s.economy.facilityImbalance,
    variations: [
      { dialogue: "시설이 잘 갖춰져 있습니다. 수입이 안정적입니다.", emotion: "calm" },
      {
        dialogue: (s) => `시장 Lv${s.economy.marketLv}, 논 Lv${s.economy.farmLv}. 기반이 탄탄합니다.`,
        emotion: "calm",
      },
    ],
  },
  {
    id: "mi_facilities_max",
    advisor: "미축",
    priority: 25,
    condition: (s) => s.economy.marketLv >= 5 && s.economy.farmLv >= 5,
    variations: [
      { dialogue: "시설이 최고 수준입니다. 이 수입이면 무엇이든 할 수 있습니다.", emotion: "excited" },
    ],
  },

  // ─── 수입 분석 ───

  {
    id: "mi_income_high",
    advisor: "미축",
    priority: 20,
    condition: (s) => s.economy.highIncome,
    variations: [
      {
        dialogue: (s) => `매턴 내정포인트 ${s.economy.ipRegen}씩 들어옵니다. 재정이 튼튼합니다.`,
        emotion: "calm",
      },
    ],
    statusReport: (s) => ({
      speaker: "미축",
      report: `시설 수입 내정포인트 ${s.economy.ipRegen}/턴, 안정적`,
    }),
  },
  {
    id: "mi_income_low",
    advisor: "미축",
    priority: 42,
    condition: (s) => s.economy.lowIncome,
    variations: [
      {
        dialogue: (s) => `수입이 턴당 ${s.economy.ipRegen}에 불과합니다. 시설 투자가 시급합니다.`,
        emotion: "worried",
      },
      { dialogue: "수입이 너무 적습니다. 이 속도로는 아무것도 할 수 없습니다.", emotion: "worried" },
    ],
  },

  // ─── 전후 재건 ───

  {
    id: "mi_post_battle_damage",
    advisor: "미축",
    priority: 58,
    condition: (s) => s.strategic.recentBattle && s.economy.ipLow,
    variations: [
      { dialogue: "전쟁의 여파로 재정이 크게 줄었습니다. 재건이 시급합니다.", emotion: "worried" },
      { dialogue: "전후 복구에 자금이 필요합니다. 내정에 집중해야 합니다.", emotion: "worried" },
    ],
  },
  {
    id: "mi_post_castle_gained",
    advisor: "미축",
    priority: 48,
    condition: (s) => s.strategic.recentCastleGained,
    variations: [
      { dialogue: "새 성채 확보로 관할 영역이 넓어졌습니다. 투자가 필요합니다.", emotion: "thoughtful" },
      { dialogue: "영토가 늘었으니 그만큼 경제 기반도 넓혀야 합니다.", emotion: "calm" },
    ],
  },

  // ─── 전쟁 지원 ───

  {
    id: "mi_wartime_support",
    advisor: "미축",
    priority: 46,
    condition: (s) => s.strategic.nearEnemyCapital && s.economy.ipRich,
    variations: [
      { dialogue: "전쟁 자금이 충분합니다. 관우 장군, 마음 놓고 출격하시오!", emotion: "excited" },
      { dialogue: "보급선 확보 완료입니다. 자금 걱정은 안 하셔도 됩니다.", emotion: "calm" },
    ],
  },
  {
    id: "mi_wartime_economy_active",
    advisor: "미축",
    priority: 44,
    condition: (s) => s.strategic.recentBattle && !s.economy.ipCritical && !s.economy.ipLow,
    variations: [
      { dialogue: "전쟁 비용을 감당할 수 있습니다. 재정은 버티고 있습니다.", emotion: "calm" },
      { dialogue: "전비 지출이 있었으나 아직 여유가 있습니다.", emotion: "calm" },
    ],
  },
  {
    id: "mi_near_enemy_capital_tight",
    advisor: "미축",
    priority: 43,
    condition: (s) => s.strategic.nearEnemyCapital && !s.economy.ipRich && !s.economy.ipCritical,
    variations: [
      { dialogue: "자금이 넉넉하진 않으나 전투 보급은 가능합니다. 아껴 쓰겠습니다.", emotion: "thoughtful" },
      { dialogue: "최종 결전을 위해 불필요한 지출을 전부 동결하겠습니다.", emotion: "calm" },
    ],
  },

  // ─── 비용 안내 ───

  {
    id: "mi_can_afford_recruit",
    advisor: "미축",
    priority: 16,
    condition: (s) => s.economy.ip >= 10 && s.military.troopShortage,
    variations: [
      {
        dialogue: (s) => `모병 자금 여유가 있습니다. 내정포인트 10으로 1만 명 모병 가능합니다.`,
        emotion: "calm",
      },
    ],
  },
  {
    id: "mi_cannot_afford",
    advisor: "미축",
    priority: 44,
    condition: (s) => s.economy.ip < 10 && (s.military.troopShortage || s.military.lowTraining),
    variations: [
      { dialogue: "군비에 쓸 자금이 부족합니다. 내정부터 키워야 합니다.", emotion: "worried" },
      { dialogue: "모병도 훈련도 할 여력이 없습니다. 수입을 늘려야 합니다.", emotion: "worried" },
    ],
  },

  // ─── 조합 상태 ───

  {
    id: "mi_rich_and_stable",
    advisor: "미축",
    priority: 17,
    condition: (s) => s.economy.ipRich && !s.economy.ipNearCap && s.economy.highIncome,
    variations: [
      { dialogue: "재정과 수입 모두 양호합니다. 투자의 적기입니다.", emotion: "excited" },
      { dialogue: "곳간이 넉넉하고 수입도 좋습니다. 편안한 마음으로 보고드립니다.", emotion: "calm" },
    ],
  },
  {
    id: "mi_poor_no_facility",
    advisor: "미축",
    priority: 62,
    condition: (s) => s.economy.ipCritical && s.economy.lowIncome,
    variations: [
      { dialogue: "재정도 바닥이고 수입도 없습니다... 악순환입니다.", emotion: "worried" },
      { dialogue: "돈도 없고 벌 수단도 없습니다. 시장이라도 지어야 합니다.", emotion: "angry" },
    ],
  },

  // ─── 추가 내정 보고 ───

  {
    id: "mi_balanced_facilities",
    advisor: "미축",
    priority: 19,
    condition: (s) => s.economy.marketLv >= 2 && s.economy.farmLv >= 2 &&
      Math.abs(s.economy.marketLv - s.economy.farmLv) <= 1 && !s.economy.facilityImbalance,
    variations: [
      {
        dialogue: (s) => `시장 Lv${s.economy.marketLv}, 논 Lv${s.economy.farmLv}로 균형 잡혀 있습니다. 안정적인 수입이 기대됩니다.`,
        emotion: "calm",
      },
    ],
  },
  {
    id: "mi_all_max_facilities",
    advisor: "미축",
    priority: 27,
    condition: (s) => s.economy.marketLv >= 5 && s.economy.farmLv >= 5 && s.economy.bankLv >= 3,
    variations: [
      { dialogue: "시장, 논, 은행 모두 최고 수준입니다! 이 수입이면 전쟁도 내정도 두렵지 않습니다.", emotion: "excited" },
    ],
  },
  {
    id: "mi_income_growing",
    advisor: "미축",
    priority: 21,
    condition: (s) => s.economy.ipRegen >= 15 && s.economy.ipRegen < 20,
    variations: [
      {
        dialogue: (s) => `매턴 내정포인트 ${s.economy.ipRegen} 확보 중입니다. 투자 효과가 나타나고 있습니다.`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "mi_post_military_spend",
    advisor: "미축",
    priority: 38,
    condition: (s) => s.economy.ipLow && !s.economy.ipCritical && s.strategic.recentBattle,
    variations: [
      { dialogue: "전비로 내정포인트가 줄었습니다. 아껴 쓰겠습니다.", emotion: "thoughtful" },
      { dialogue: "군사 지출이 있었습니다. 재정이 빠듯하니 현명하게 운영하겠습니다.", emotion: "worried" },
    ],
  },
  {
    id: "mi_peace_growth",
    advisor: "미축",
    priority: 16,
    condition: (s) => !s.strategic.recentBattle && s.economy.ipAdequate && !s.strategic.enemyNearCapital,
    variations: [
      { dialogue: "전쟁이 없으니 내정에 집중할 수 있습니다. 좋은 기회입니다.", emotion: "calm" },
      { dialogue: "평화로운 시기에 투자해 두는 것이 현명합니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "mi_bank_completed",
    advisor: "미축",
    priority: 23,
    condition: (s) => s.economy.bankLv >= 3 && s.economy.ipCap >= 200,
    variations: [
      {
        dialogue: (s) => `은행 Lv${s.economy.bankLv}으로 상한이 ${s.economy.ipCap}까지 늘었습니다. 비축이 충분합니다.`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "mi_castle_expansion_opportunity",
    advisor: "미축",
    priority: 37,
    condition: (s) => s.strategic.recentCastleGained && s.economy.ipRich,
    variations: [
      { dialogue: "새 영토 확보와 동시에 투자 여력도 있습니다. 즉시 경제 기반을 구축할 수 있습니다.", emotion: "excited" },
    ],
  },
  {
    id: "mi_near_enemy_capital_funds",
    advisor: "미축",
    priority: 46,
    condition: (s) => s.strategic.nearEnemyCapital && s.economy.ipRich,
    variations: [
      { dialogue: "결전 자금이 충분합니다. 관우 장군, 마음 놓고 공략하시오!", emotion: "excited" },
      { dialogue: "전쟁 보급에 차질이 없습니다. 전비는 걱정 마십시오.", emotion: "calm" },
    ],
  },
  {
    id: "mi_upgrade_cost_info",
    advisor: "미축",
    priority: 14,
    condition: (s) => s.economy.canUpgrade && s.economy.ipAdequate,
    variations: [
      {
        dialogue: (s) => `시설 업그레이드 가능합니다. 시장 업그레이드에 내정포인트 ${s.economy.marketUpgradeCost}이 필요합니다.`,
        emotion: "calm",
      },
    ],
  },
  {
    id: "mi_late_rich",
    advisor: "미축",
    priority: 26,
    condition: (s) => s.gamePhase === "late" && s.economy.ipRich && s.economy.highIncome,
    variations: [
      { dialogue: "후반부에도 재정이 탄탄합니다. 결전을 위한 자금은 충분합니다.", emotion: "excited" },
    ],
  },
  {
    id: "mi_mid_investment_timing",
    advisor: "미축",
    priority: 18,
    condition: (s) => s.gamePhase === "mid" && s.economy.canUpgrade && s.economy.ipAdequate,
    variations: [
      { dialogue: "중반부 투자의 적기입니다. 지금 시설을 키워 두면 후반에 큰 이득이 됩니다.", emotion: "thoughtful" },
      { dialogue: "지금 투자하면 수익이 배로 돌아옵니다. 과감하게 투자합시다.", emotion: "excited" },
    ],
  },
  {
    id: "mi_early_growth",
    advisor: "미축",
    priority: 13,
    condition: (s) => s.gamePhase === "early" && s.economy.ipAdequate,
    variations: [
      { dialogue: "초반에 시설 기반을 빨리 갖춰야 후에 여유가 생깁니다.", emotion: "thoughtful" },
      { dialogue: "기초 내정을 잘 닦으면 이후 발전이 빠릅니다. 차근차근 쌓아가겠습니다.", emotion: "calm" },
    ],
  },

  // ─── 안정 (기본) ───

  {
    id: "mi_stable_report",
    advisor: "미축",
    priority: 8,
    condition: () => true,
    variations: [
      {
        dialogue: (s) => `내정포인트 ${s.economy.ip}/${s.economy.ipCap}, 매턴 +${s.economy.ipRegen}. 안정적입니다.`,
        emotion: "calm",
      },
      {
        dialogue: (s) => `시설 운영하여 내정포인트 ${s.economy.ipRegen} 확보했습니다. 현재 ${s.economy.ip}/${s.economy.ipCap}.`,
        emotion: "calm",
      },
      {
        dialogue: (s) => `매턴 내정포인트 +${s.economy.ipRegen}. 재정 안정적입니다.`,
        emotion: "calm",
      },
      {
        dialogue: (s) => `내정포인트 ${s.economy.ip}/${s.economy.ipCap}, 수입 +${s.economy.ipRegen}/턴. 이상 없습니다.`,
        emotion: "calm",
      },
      {
        dialogue: (s) => `통상 운영 중입니다. 현재 내정포인트 ${s.economy.ip}, 매턴 +${s.economy.ipRegen}.`,
        emotion: "calm",
      },
    ],
    statusReport: (s) => ({
      speaker: "미축",
      report: `내정포인트 ${s.economy.ip}/${s.economy.ipCap}, 매턴 +${s.economy.ipRegen}`,
    }),
  },
];

// =====================================================================
//  방통 (외교) — 43개 케이스
//  외교 관계와 기회 분석. 변동이 없으면 생략 가능.
// =====================================================================

export const PANG_PHASE1_CASES: CaseDefinition[] = [
  // ─── 조조 관계별 ───

  {
    id: "pang_cao_hostile",
    advisor: "방통",
    priority: 35,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      return !!cao && cao.score <= -5;
    },
    variations: [
      { dialogue: "조조와의 관계가 극도로 악화되었소. 전쟁 각오를 하시오.", emotion: "worried" },
      {
        dialogue: (s) => {
          const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao")!;
          return `조조와의 관계 점수 ${cao.score}... 화해는 어려울 것이오.`;
        },
        emotion: "worried",
      },
    ],
  },
  {
    id: "pang_cao_unfriendly",
    advisor: "방통",
    priority: 25,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      return !!cao && cao.isUnfriendly && !cao.isHostile;
    },
    variations: [
      { dialogue: "조조와 사이가 좋지 않소. 악화되기 전에 관리해야 하오.", emotion: "thoughtful" },
      { dialogue: "조조 쪽에서 불편한 기색이 보이오. 주의해야 합니다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_cao_neutral",
    advisor: "방통",
    priority: 15,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      return !!cao && cao.isNeutral;
    },
    variations: [
      { dialogue: "조조와는 중립 상태요. 기회가 되면 관계를 개선할 수 있소.", emotion: "calm" },
    ],
  },
  {
    id: "pang_cao_friendly",
    advisor: "방통",
    priority: 28,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      return !!cao && cao.isFriendly && !cao.isAllied;
    },
    variations: [
      { dialogue: "조조와의 관계가 우호적이오. 이를 잘 활용합시다.", emotion: "excited" },
      { dialogue: "조조와 사이가 나쁘지 않소. 무역이나 동맹을 고려할 수 있소.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_cao_allied",
    advisor: "방통",
    priority: 30,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      return !!cao && cao.isAllied;
    },
    variations: [
      { dialogue: "조조와 동맹 상태요. 이 관계를 최대한 활용합시다.", emotion: "excited" },
      { dialogue: "조조와의 동맹이 유지되고 있소. 든든한 배경이오.", emotion: "calm" },
    ],
  },

  // ─── 손권 관계별 ───

  {
    id: "pang_sun_hostile",
    advisor: "방통",
    priority: 35,
    condition: (s) => {
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!sun && sun.score <= -5;
    },
    variations: [
      { dialogue: "손권과의 관계가 최악이오. 남쪽에서도 위협이 됩니다.", emotion: "worried" },
      { dialogue: "손권이 우릴 적으로 보고 있소. 각별히 경계해야 하오.", emotion: "worried" },
    ],
  },
  {
    id: "pang_sun_unfriendly",
    advisor: "방통",
    priority: 25,
    condition: (s) => {
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!sun && sun.isUnfriendly && !sun.isHostile;
    },
    variations: [
      { dialogue: "손권과의 관계가 삐걱거리고 있소. 관리가 필요하오.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_sun_neutral",
    advisor: "방통",
    priority: 15,
    condition: (s) => {
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!sun && sun.isNeutral;
    },
    variations: [
      { dialogue: "손권과는 중립이오. 좋은 관계를 맺을 여지가 있소.", emotion: "calm" },
    ],
  },
  {
    id: "pang_sun_friendly",
    advisor: "방통",
    priority: 28,
    condition: (s) => {
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!sun && sun.isFriendly && !sun.isAllied;
    },
    variations: [
      { dialogue: "손권과의 관계가 양호하오. 동맹으로 발전시킬 수 있소.", emotion: "excited" },
      { dialogue: "손권이 호의를 보이고 있소. 이 기회를 놓치지 맙시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_sun_allied",
    advisor: "방통",
    priority: 30,
    condition: (s) => {
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!sun && sun.isAllied;
    },
    variations: [
      { dialogue: "손권과의 동맹이 공고하오. 함께 조조를 견제합시다.", emotion: "excited" },
    ],
  },

  // ─── 양쪽 조합 ───

  {
    id: "pang_all_hostile",
    advisor: "방통",
    priority: 72,
    condition: (s) => s.diplomacy.allHostile,
    variations: [
      { dialogue: "사면초가요! 양쪽 모두 적대적이니 고립되기 전에 한쪽과는 화해해야 하오.", emotion: "worried" },
      { dialogue: "조조도 손권도 우리를 적으로 보고 있소. 위태로운 상황이오.", emotion: "worried" },
      { dialogue: "사방이 적이오. 외교적 돌파구를 찾지 않으면 무너집니다.", emotion: "angry" },
    ],
  },
  {
    id: "pang_both_neutral",
    advisor: "방통",
    priority: 18,
    condition: (s) => s.diplomacy.relations.every(r => r.isNeutral),
    variations: [
      { dialogue: "양쪽 모두 중립이오. 어느 쪽과 먼저 손잡을지 결정할 때요.", emotion: "thoughtful" },
      { dialogue: "외교적으로 백지 상태요. 우리가 주도권을 쥘 수 있소.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_one_ally_one_hostile",
    advisor: "방통",
    priority: 33,
    condition: (s) => s.diplomacy.anyAllied && s.diplomacy.relations.some(r => r.isHostile),
    variations: [
      { dialogue: "한쪽은 동맹, 한쪽은 적이오. 동맹의 힘을 빌려 적을 압박합시다.", emotion: "excited" },
      { dialogue: "동맹이 있으니 든든하오. 적에 집중할 수 있소.", emotion: "calm" },
    ],
  },
  {
    id: "pang_one_friendly_one_hostile",
    advisor: "방통",
    priority: 30,
    condition: (s) => s.diplomacy.anyFriendly && s.diplomacy.relations.some(r => r.isHostile),
    variations: [
      { dialogue: "한쪽은 우호적이니 그 관계를 강화하면서 적을 견제합시다.", emotion: "thoughtful" },
    ],
  },

  // ─── DP 상태 ───

  {
    id: "pang_dp_none",
    advisor: "방통",
    priority: 42,
    condition: (s) => s.diplomacy.dpNone,
    variations: [
      { dialogue: "외교포인트가 전혀 없소. 손발이 묶인 격이오.", emotion: "worried" },
      { dialogue: "외교 자원이 바닥이오. 당분간 행동이 제한됩니다.", emotion: "worried" },
    ],
  },
  {
    id: "pang_dp_low",
    advisor: "방통",
    priority: 35,
    condition: (s) => s.diplomacy.dpLow && !s.diplomacy.dpNone,
    variations: [
      { dialogue: "외교포인트가 부족하오. 큰 외교 행동은 어렵소.", emotion: "worried" },
      {
        dialogue: (s) => `외교포인트 ${s.diplomacy.dp}... 아껴 써야 합니다.`,
        emotion: "thoughtful",
      },
    ],
  },
  {
    id: "pang_dp_rich",
    advisor: "방통",
    priority: 26,
    condition: (s) => s.diplomacy.dpRich,
    variations: [
      { dialogue: "외교포인트가 넉넉하오. 적극적인 외교가 가능합니다.", emotion: "excited" },
      {
        dialogue: (s) => `외교포인트 ${s.diplomacy.dp}! 이 정도면 큰 외교 행동도 할 수 있소.`,
        emotion: "excited",
      },
    ],
  },

  // ─── 외교 기회 ───

  {
    id: "pang_enemies_friendly",
    advisor: "방통",
    priority: 45,
    condition: (s) => s.diplomacy.enemiesFriendly,
    variations: [
      { dialogue: "조조와 손권 사이가 좋소. 이간책을 써서 갈라놓을 수 있소!", emotion: "excited" },
      { dialogue: "적끼리 손을 잡으려 하오. 그 전에 이간질을 놓읍시다.", emotion: "thoughtful" },
      { dialogue: "이 봉추가 계략 하나를 품고 있소. 적의 동맹을 깨뜨립시다.", emotion: "excited" },
    ],
  },
  {
    id: "pang_weak_enemy_opportunity",
    advisor: "방통",
    priority: 38,
    condition: (s) => s.strategic.weakestEnemy !== null && s.strategic.weakestEnemy.castles <= 3,
    variations: [
      {
        dialogue: (s) => `${s.strategic.weakestEnemy!.name}이 약해졌소. 외교적으로 압박하면 굴복시킬 수 있소.`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "pang_dp_rich_hostile_exists",
    advisor: "방통",
    priority: 34,
    condition: (s) => s.diplomacy.dpRich && s.diplomacy.relations.some(r => r.isHostile),
    variations: [
      { dialogue: "외교 자원이 충분하오. 적대 관계를 개선할 수 있소.", emotion: "thoughtful" },
      { dialogue: "외교포인트를 사용하여 적과의 관계를 풀어봅시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_strategic_diplomacy",
    advisor: "방통",
    priority: 40,
    condition: (s) => s.strategic.biggestThreat !== null &&
      s.strategic.biggestThreat.mp > s.military.mp * 2 &&
      s.diplomacy.dpAdequate,
    variations: [
      {
        dialogue: (s) => `${s.strategic.biggestThreat!.name}이 너무 강하오. 외교로 시간을 벌어야 하오.`,
        emotion: "thoughtful",
      },
      { dialogue: "힘으로 안 되면 머리를 써야 하오. 외교가 답이오.", emotion: "thoughtful" },
      { dialogue: "관우 장군도 아시다시피 군사력으로는 부족하오. 이 봉추에게 맡기시오.", emotion: "thoughtful" },
    ],
  },

  // ─── 특수 상황 ───

  {
    id: "pang_post_battle_diplomacy",
    advisor: "방통",
    priority: 43,
    condition: (s) => s.strategic.recentBattle,
    variations: [
      { dialogue: "전투 후 외교 지형이 바뀌었을 수 있소. 살펴봅시다.", emotion: "thoughtful" },
      { dialogue: "전란 뒤에는 반드시 외교가 움직이는 법이오. 주시해야 하오.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_early_game",
    advisor: "방통",
    priority: 22,
    condition: (s) => s.gamePhase === "early" && s.diplomacy.dpAdequate,
    variations: [
      { dialogue: "초반에 외교 기반을 다져놓으면 나중에 큰 도움이 됩니다.", emotion: "thoughtful" },
      { dialogue: "지금 우방을 만들어두면 위기 때 의지할 수 있소.", emotion: "calm" },
    ],
  },
  {
    id: "pang_late_game",
    advisor: "방통",
    priority: 32,
    condition: (s) => s.gamePhase === "late",
    variations: [
      { dialogue: "후반부에는 외교 한 수가 전쟁의 승패를 가르오.", emotion: "thoughtful" },
      { dialogue: "최종 결전을 앞두고 외교적 정리가 필요하오.", emotion: "thoughtful" },
    ],
  },

  // ─── 안정 (기본) ───

  {
    id: "pang_stable",
    advisor: "방통",
    priority: 5,
    condition: () => true,
    variations: [
      { dialogue: "외교적으로 특별한 변동은 없소.", emotion: "calm" },
      { dialogue: "천하의 외교 정세가 잠잠하오.", emotion: "calm" },
      { dialogue: "별다른 외교 동향은 없소. 지켜보겠소.", emotion: "calm" },
      { dialogue: "외교 정세에 변동 없소. 각국 동향을 주시하고 있소.", emotion: "calm" },
      { dialogue: "적의 외교 동향을 살피고 있소. 아직은 잠잠하오.", emotion: "calm" },
    ],
  },

  // ─── 추가 외교 보고 ───

  {
    id: "pang_cao_hostile_sun_neutral",
    advisor: "방통",
    priority: 38,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!cao && !!sun && cao.isHostile && (sun.isNeutral || sun.isFriendly);
    },
    variations: [
      { dialogue: "조조와는 적이지만 손권과는 소통이 가능하오. 손권과 먼저 손을 잡읍시다.", emotion: "thoughtful" },
      { dialogue: "손권이 중립이니 외교 공세로 우리 편으로 끌어들일 수 있소.", emotion: "excited" },
    ],
  },
  {
    id: "pang_sun_hostile_cao_neutral",
    advisor: "방통",
    priority: 38,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!cao && !!sun && sun.isHostile && (cao.isNeutral || cao.isFriendly);
    },
    variations: [
      { dialogue: "손권과 갈등이 있으나 조조와는 여지가 있소. 조조와의 관계를 먼저 다져봅시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_sun_allied_cao_hostile",
    advisor: "방통",
    priority: 33,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!cao && !!sun && sun.isAllied && cao.isHostile;
    },
    variations: [
      { dialogue: "손권과 동맹 중이니 조조에 집중할 수 있소. 손권과 함께 조조를 압박합시다!", emotion: "excited" },
    ],
  },
  {
    id: "pang_cao_allied_sun_hostile",
    advisor: "방통",
    priority: 33,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!cao && !!sun && cao.isAllied && sun.isHostile;
    },
    variations: [
      { dialogue: "조조와 동맹이니 손권 쪽에 집중합시다. 조조의 협력을 기대할 수 있소.", emotion: "excited" },
    ],
  },
  {
    id: "pang_both_friendly",
    advisor: "방통",
    priority: 36,
    condition: (s) => s.diplomacy.relations.every(r => r.isFriendly || r.isAllied),
    variations: [
      { dialogue: "양쪽 모두 우호적이오! 이 외교적 우위를 십분 활용해야 하오.", emotion: "excited" },
      { dialogue: "천하에 적이 없는 상태요. 이를 발판으로 내실을 더 다져야 하오.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_dp_high_accumulate",
    advisor: "방통",
    priority: 29,
    condition: (s) => s.diplomacy.dp >= 6,
    variations: [
      {
        dialogue: (s) => `외교포인트가 ${s.diplomacy.dp}나 됩니다! 대규모 외교 행동을 취할 수 있소.`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "pang_enemy_divide_success",
    advisor: "방통",
    priority: 42,
    condition: (s) => {
      const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
      const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
      return !!cao && !!sun && !s.diplomacy.enemiesFriendly && cao.score <= 0 && sun.score <= 0;
    },
    variations: [
      { dialogue: "조조와 손권 사이가 틀어져 있소. 이간의 효과가 있는 것 같소. 우리에게 유리하오.", emotion: "excited" },
    ],
  },
  {
    id: "pang_big_threat_diplomacy",
    advisor: "방통",
    priority: 40,
    condition: (s) => s.strategic.biggestThreat !== null &&
      s.strategic.biggestThreat.mp > s.military.mp * 1.8 && s.diplomacy.dpAdequate,
    variations: [
      {
        dialogue: (s) => `${s.strategic.biggestThreat!.name}이 너무 강하오. 외교로 시간을 벌어야 하오.`,
        emotion: "thoughtful",
      },
    ],
  },
  {
    id: "pang_weak_enemy_surrender",
    advisor: "방통",
    priority: 39,
    condition: (s) => s.strategic.weakestEnemy !== null &&
      s.strategic.weakestEnemy.castles <= 2 && s.diplomacy.dpAdequate,
    variations: [
      {
        dialogue: (s) => `${s.strategic.weakestEnemy!.name}이 겨우 성채 ${s.strategic.weakestEnemy!.castles}개뿐이오. 외교적 압박으로 굴복시킬 수 있소!`,
        emotion: "excited",
      },
    ],
  },
  {
    id: "pang_mid_game_diplomacy",
    advisor: "방통",
    priority: 24,
    condition: (s) => s.gamePhase === "mid" && !s.diplomacy.allHostile,
    variations: [
      { dialogue: "중반부 외교 정세를 정비해야 할 때요. 후반을 위한 포석을 깔겠소.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_late_game_seal",
    advisor: "방통",
    priority: 37,
    condition: (s) => s.gamePhase === "late" && s.diplomacy.dpRich,
    variations: [
      { dialogue: "결전을 앞두고 외교적으로 유리한 위치를 확보해야 하오. 이 봉추의 마지막 계략을 보여드리겠소.", emotion: "excited" },
      { dialogue: "후반부 외교 봉쇄에 들어갑시다. 적이 지원받지 못하게 차단하겠소.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_post_victory_diplomacy",
    advisor: "방통",
    priority: 45,
    condition: (s) => s.strategic.recentBattleWon && s.diplomacy.dpAdequate,
    variations: [
      { dialogue: "승전으로 우리의 위세가 높아졌소. 이 기세에 외교도 유리합니다.", emotion: "excited" },
      { dialogue: "승리 후 상대방이 태도를 바꿀 수 있소. 외교적 접촉을 시도합시다.", emotion: "thoughtful" },
    ],
  },
  {
    id: "pang_enthusiasm_high",
    advisor: "방통",
    priority: 17,
    condition: (s) => {
      const mood = s.advisorMood["방통"];
      return !!mood && mood.isEnthusiastic;
    },
    variations: [
      { dialogue: "오늘따라 계략이 넘쳐흐르오! 주공, 이 봉추의 책략에 주목하시오!", emotion: "excited" },
      { dialogue: "좋은 구상이 떠올랐소. 이번 회의가 기대되오!", emotion: "excited" },
    ],
  },
];

// =====================================================================
//  전체 Phase 1 케이스 모음
// =====================================================================

export const ALL_PHASE1_CASES: CaseDefinition[] = [
  ...ZHUGE_PHASE1_CASES,
  ...GUAN_PHASE1_CASES,
  ...MI_PHASE1_CASES,
  ...PANG_PHASE1_CASES,
];

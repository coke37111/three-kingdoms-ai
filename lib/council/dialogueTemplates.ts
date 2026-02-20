/**
 * 대사 템플릿 시스템
 *
 * {변수명} 플레이스홀더 기반 대사 + 변수 주입.
 * 제갈량(ZHUGE_TEMPLATES)을 기준으로 구현하며,
 * 인접 톤 폴백으로 작성하지 않은 톤도 자연스럽게 커버.
 */

import type { Emotion } from "@/types/chat";
import type { GameSituation, ToneLevel, DialogueCategory, DialogueTemplate, TemplateMap, NormalizedSituation } from "./types";
import { toneToEmotion } from "./situationNormalizer";
import { RECRUIT_TROOPS_PER_IP } from "@/constants/gameConstants";

// ===================== 변수 맵 =====================

export interface DialogueVariables {
  // 군사
  playerMP: string;
  playerTroops: string;
  playerTraining: string;
  playerMorale: string;
  threatName: string;
  threatMP: string;
  mpRatioPercent: string;
  adjacentEnemyCount: string;
  // 내정
  ip: string;
  ipRegen: string;
  ipCap: string;
  marketCount: string;
  farmCount: string;
  castleCount: string;
  // 외교
  threatRelation: string;
  threatRelationLabel: string;
  dp: string;
  // 전략
  turn: string;
  totalCastles: string;
  // 타계책
  recruitTarget: string;
  trainTarget: string;
  marketBuildCost: string;
  farmBuildCost: string;
  /** 현재 IP로 실행 가능한 최적 시설 행동 또는 축적 안내 */
  buildAdvice: string;
}

export function buildDialogueVariables(
  situation: GameSituation,
  normalized: NormalizedSituation,
): DialogueVariables {
  const d = normalized.details;
  const ipToSpend = Math.floor(d.ip * 0.8);
  const recruitTarget = (ipToSpend * RECRUIT_TROOPS_PER_IP).toLocaleString();
  const trainTarget = Math.min(100, Math.round(d.playerTraining * 100) + 10).toString();

  // 현재 IP로 실행 가능한 최적 시설 행동 계산
  const econ = situation.economy;
  let buildAdvice: string;
  if (econ.canUpgradeMarket) {
    buildAdvice = `시장 업그레이드(비용 ${econ.marketUpgradeCost}) 즉시 가능`;
  } else if (econ.canUpgradeFarm) {
    buildAdvice = `논 업그레이드(비용 ${econ.farmUpgradeCost}) 즉시 가능`;
  } else if (econ.canBuildMarket) {
    buildAdvice = `시장 건설(비용 ${econ.marketBuildCost}) 즉시 가능`;
  } else if (econ.canBuildFarm) {
    buildAdvice = `논 건설(비용 ${econ.farmBuildCost}) 즉시 가능`;
  } else {
    const opts = [econ.marketBuildCost, econ.farmBuildCost];
    if (econ.marketCount > 0) opts.push(econ.marketUpgradeCost);
    if (econ.farmCount > 0) opts.push(econ.farmUpgradeCost);
    buildAdvice = `내정력 ${Math.min(...opts)} 필요 (현재 ${econ.ip})`;
  }

  return {
    playerMP: d.playerMP.toLocaleString(),
    playerTroops: d.playerTroops.toLocaleString(),
    playerTraining: Math.round(d.playerTraining * 100).toString(),
    playerMorale: Math.round(situation.military.morale * 100).toString(),
    threatName: d.primaryThreat?.rulerName ?? "적",
    threatMP: d.primaryThreat?.mp.toLocaleString() ?? "불명",
    mpRatioPercent: isFinite(d.mpRatio) ? Math.round(d.mpRatio * 100).toString() : "∞",
    adjacentEnemyCount: situation.strategic.adjacentEnemyCastles.length.toString(),
    ip: d.ip.toString(),
    ipRegen: d.ipRegen.toString(),
    ipCap: d.ipCap.toString(),
    marketCount: d.marketCount.toString(),
    farmCount: d.farmCount.toString(),
    castleCount: d.castleCount.toString(),
    threatRelation: d.threatRelationScore.toString(),
    threatRelationLabel: d.primaryThreat?.relationLabel ?? "불명",
    dp: d.dp.toString(),
    turn: situation.turn.toString(),
    totalCastles: situation.strategic.totalCastles.toString(),
    recruitTarget,
    trainTarget,
    marketBuildCost: situation.economy.marketBuildCost.toString(),
    farmBuildCost: situation.economy.farmBuildCost.toString(),
    buildAdvice,
  };
}

/** 템플릿의 {변수명}을 실제 값으로 치환 */
export function resolveTemplate(template: string, vars: DialogueVariables): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return (vars as unknown as Record<string, string>)[key] ?? match;
  });
}

// ===================== 대사 선택 =====================

const TONE_ORDER: ToneLevel[] = ["critical", "crisis", "uneasy", "adequate", "stable", "comfortable"];

function findClosestTonePool(
  categoryMap: Partial<Record<ToneLevel, DialogueTemplate[]>> | undefined,
  targetTone: ToneLevel,
): DialogueTemplate[] | undefined {
  if (!categoryMap) return undefined;
  const targetIdx = TONE_ORDER.indexOf(targetTone);

  for (let dist = 1; dist < TONE_ORDER.length; dist++) {
    for (const dir of [-1, 1]) {
      const idx = targetIdx + dist * dir;
      if (idx >= 0 && idx < TONE_ORDER.length) {
        const pool = categoryMap[TONE_ORDER[idx]];
        if (pool && pool.length > 0) return pool;
      }
    }
  }
  return undefined;
}

export function pickDialogue(
  templates: Partial<TemplateMap>,
  category: DialogueCategory,
  tone: ToneLevel,
  turn: number,
  variables: DialogueVariables,
): { text: string; emotion: Emotion } {
  let pool = templates[category]?.[tone];

  if (!pool || pool.length === 0) {
    pool = findClosestTonePool(templates[category], tone);
  }

  if (!pool || pool.length === 0) {
    return { text: "...", emotion: toneToEmotion(tone) };
  }

  const template = pool[turn % pool.length];
  return {
    text: resolveTemplate(template.text, variables),
    emotion: template.emotion ?? toneToEmotion(tone),
  };
}

// ===================== 제갈량 대사 템플릿 =====================

export const ZHUGE_TEMPLATES: Partial<TemplateMap> = {
  // ── 전략 상황 종합 보고 ──
  strategic_overview: {
    comfortable: [
      { text: "주공, 현재 천하 정세가 우리에게 유리합니다. 군사력 {playerMP}으로 {threatName}의 {threatMP}을 크게 앞서고 있사옵니다." },
      { text: "형세가 밝습니다. 병력 {playerTroops}에 내정 수입 {ipRegen}으로 안정된 기반이 갖추어져 있습니다." },
    ],
    stable: [
      { text: "주공, 정세는 대체로 안정적입니다. 군사력 {playerMP}, 내정 수입 {ipRegen}으로 내실을 기하고 있사옵니다." },
    ],
    adequate: [
      { text: "주공, 정세가 균형을 이루고 있습니다. 우리 군사력 {playerMP}, {threatName}의 군사력 {threatMP}이옵니다." },
      { text: "현 정세는 판가름이 나지 않았습니다. {castleCount}개 성채에 병력 {playerTroops}, 내정 수입 {ipRegen}이옵니다." },
    ],
    uneasy: [
      { text: "주공, 정세가 불안합니다. {threatName}의 군사력 {threatMP}에 비해 우리는 {playerMP}으로 다소 열세입니다." },
    ],
    crisis: [
      { text: "주공, 위기입니다. {threatName}의 군사력 {threatMP}에 비해 우리는 {playerMP}에 불과하옵니다. 인접 {adjacentEnemyCount}개 성에서 위협받고 있습니다." },
      { text: "주공, 사태가 심각합니다. {threatName}과의 관계는 {threatRelationLabel}, 군사력 비율은 {mpRatioPercent}%에 불과합니다." },
    ],
    critical: [
      { text: "주공, 존망의 기로입니다! {threatName}이 군사력 {threatMP}으로 압도하고 있으며, 우리 {playerMP}으로는 정면 대결이 불가합니다." },
    ],
  },

  // ── 군사 현황 ──
  military_status: {
    comfortable: [
      { text: "군사 면에서는 걱정이 없습니다. 병력 {playerTroops}에 훈련도 {playerTraining}%로 {threatName} 대비 압도적 우위입니다." },
    ],
    stable: [
      { text: "병력 {playerTroops}으로 안정적이며, 훈련도 {playerTraining}%를 유지하고 있사옵니다." },
    ],
    adequate: [
      { text: "병력은 {playerTroops}으로 적정 수준이나, 훈련도가 {playerTraining}%로 아직 부족합니다." },
    ],
    uneasy: [
      { text: "병력 {playerTroops}, 훈련도 {playerTraining}%로 {threatName}에 밀리고 있습니다. 보강이 필요합니다." },
    ],
    crisis: [
      { text: "군사 상황이 위태롭습니다. 병력 {playerTroops}, 훈련도 {playerTraining}%로 {threatName}에 크게 뒤처져 있습니다." },
    ],
    critical: [
      { text: "병력 {playerTroops}은 위기 수준입니다. {threatName}의 {threatMP}에 맞설 여력이 없사옵니다." },
    ],
  },

  // ── 내정 현황 ──
  economy_status: {
    comfortable: [
      { text: "내정은 순조롭습니다. 시장 {marketCount}개, 논 {farmCount}개로 턴당 {ipRegen} 내정력을 확보하고 있습니다." },
    ],
    stable: [
      { text: "내정 수입은 턴당 {ipRegen}으로 안정적입니다. 현재 내정력 {ip}/{ipCap}이옵니다." },
    ],
    adequate: [
      { text: "내정 수입은 턴당 {ipRegen}으로 보통 수준입니다. 시설 확충의 여지가 있습니다." },
    ],
    uneasy: [
      { text: "내정 수입 {ipRegen}이 다소 부족합니다. 시장 {marketCount}개, 논 {farmCount}개로는 충분하지 않사옵니다." },
    ],
    crisis: [
      { text: "내정이 매우 취약합니다. 턴당 수입 {ipRegen}, 현재 내정력 {ip}로는 시설 투자가 쉽지 않습니다." },
    ],
    critical: [
      { text: "내정이 바닥났습니다. 수입 {ipRegen}, 잔액 {ip}로는 시설 투자가 불가합니다." },
    ],
  },

  // ── 외교 현황 ──
  diplomacy_status: {
    comfortable: [
      { text: "외교적으로 안정적입니다. {threatName}과의 관계가 {threatRelationLabel}로, 당분간 침공 위험은 낮습니다." },
    ],
    stable: [
      { text: "{threatName}과의 관계는 {threatRelationLabel}입니다. 현 상태를 유지하면 됩니다." },
    ],
    adequate: [
      { text: "{threatName}과의 관계는 {threatRelationLabel}입니다. 외교력 {dp}로 관계 개선을 도모할 수 있습니다." },
    ],
    uneasy: [
      { text: "{threatName}과의 관계({threatRelationLabel})가 불안합니다. 조속한 외교 조치가 필요합니다." },
    ],
    crisis: [
      { text: "{threatName}과의 관계가 {threatRelationLabel}로 극도로 악화되어 있습니다. 언제든 침공이 올 수 있습니다." },
    ],
    critical: [
      { text: "{threatName}과의 관계가 최악의 상태입니다. 즉각적인 외교 수습이 없으면 전쟁을 면치 못합니다." },
    ],
  },

  // ── 타계책: 군사 ──
  countermeasure_military: {
    comfortable: [
      { text: "군사적 여유가 있으니, 훈련도를 {trainTarget}%까지 올려 질적 우위를 확고히 합시다." },
    ],
    stable: [
      { text: "병력은 충분하오나, 훈련도 향상을 권합니다. 목표는 {trainTarget}%이옵니다." },
    ],
    adequate: [
      { text: "모병과 훈련을 병행해야 합니다. 내정력을 투입해 병력을 보강하고 훈련도를 높여야 합니다." },
    ],
    uneasy: [
      { text: "병력 보강이 시급합니다. 내정력을 모병에 우선 투입하시기 바랍니다." },
    ],
    crisis: [
      { text: "즉시 모병에 착수해야 합니다. 내정력을 최대한 투입해 병력을 긴급 충원합시다." },
    ],
    critical: [
      { text: "일각도 지체할 수 없습니다! 모든 자원을 병력 확보에 집중해야 합니다." },
    ],
  },

  // ── 타계책: 내정 ──
  countermeasure_economy: {
    comfortable: [
      { text: "내정 기반이 탄탄하니, 은행을 업그레이드하여 내정력 상한을 높이는 것이 좋겠습니다." },
    ],
    stable: [
      { text: "시장과 논을 추가 업그레이드하여 수입을 늘리는 것을 권합니다." },
    ],
    adequate: [
      { text: "수입 증대를 위한 시설 투자를 권합니다. {buildAdvice}." },
    ],
    uneasy: [
      { text: "수입 증대가 필요합니다. {buildAdvice}." },
    ],
    crisis: [
      { text: "수입 기반 강화가 급선무입니다. {buildAdvice}." },
    ],
    critical: [
      { text: "내정이 붕괴 직전입니다. {buildAdvice}." },
    ],
  },

  // ── 타계책: 외교 ──
  countermeasure_diplomacy: {
    comfortable: [
      { text: "외교 관계가 양호하니, 현 상태를 유지하면서 기회를 엿봅시다." },
    ],
    stable: [
      { text: "외교 상황은 안정적이옵니다. 외교력 {dp}를 다른 필요에 활용하시는 것이 좋겠습니다." },
    ],
    adequate: [
      { text: "외교력 {dp}를 활용해 {threatName}과의 관계를 개선할 것을 권합니다." },
    ],
    uneasy: [
      { text: "{threatName}과의 관계 개선이 필요합니다. 외교력 {dp}를 활용해 조속히 수습하십시오." },
    ],
    crisis: [
      { text: "{threatName}과의 관계가 최악입니다. 외교력을 투입해 당장 관계를 개선하지 않으면 침공을 면치 못합니다." },
    ],
    critical: [
      { text: "지금 당장 {threatName}과의 외교를 수습하지 않으면 전멸을 면치 못합니다. 외교력 {dp}를 모두 투입하십시오." },
    ],
  },

  // ── 회의 시작 ──
  meeting_open: {
    comfortable: [
      { text: "제{turn}차 참모 회의를 시작하겠습니다." },
    ],
    adequate: [
      { text: "제{turn}차 참모 회의를 시작합니다." },
    ],
    crisis: [
      { text: "긴급 회의를 소집합니다. 시간이 없으니 핵심만 보고하겠습니다." },
    ],
    critical: [
      { text: "존망의 위기입니다. 즉각 대책을 논의해야 합니다." },
    ],
  },

  // ── 전략 목표 ──
  meeting_goal: {
    comfortable: [
      { text: "이번 턴은 이 유리한 정세를 활용해 영토를 넓히는 것을 목표로 하겠습니다." },
    ],
    stable: [
      { text: "이번 턴은 내실을 다지면서 점진적으로 성장하는 것을 목표로 합니다." },
    ],
    adequate: [
      { text: "이번 턴은 균형 잡힌 성장을 목표로, 군사와 내정을 병행하겠습니다." },
    ],
    uneasy: [
      { text: "이번 턴은 취약한 부분을 보완하는 것을 최우선으로 하겠습니다." },
    ],
    crisis: [
      { text: "이번 턴은 생존이 최우선입니다. 방어와 재건에 모든 역량을 집중합니다." },
    ],
    critical: [
      { text: "지금은 오직 살아남는 것만이 목표입니다. 모든 수단을 동원해야 합니다." },
    ],
  },

  // ── 회의 종료 ──
  meeting_close: {
    comfortable: [
      { text: "이상입니다. 주공, 추가로 하문하실 것이 있으시면 말씀해 주시옵소서." },
    ],
    stable: [
      { text: "이상 보고를 마치겠습니다. 주공의 지시를 기다리겠습니다." },
    ],
    adequate: [
      { text: "이상이옵니다. 주공, 어떠한 방침을 내리시겠습니까?" },
    ],
    crisis: [
      { text: "급한 안건은 이상입니다. 주공, 결단을 내려주시옵소서." },
    ],
    critical: [
      { text: "이상이옵니다. 주공, 즉각 결단을 내려주시옵소서. 시간이 없습니다." },
    ],
  },

  // ── 지난 턴 성과 요약 ──
  turn_result_summary: {
    comfortable: [
      { text: "지난 턴의 성과를 보고드립니다." },
    ],
  },
};

// ===================== 관우 대사 템플릿 (군사 담당) =====================

export const GUAN_YU_TEMPLATES: Partial<TemplateMap> = {
  military_status: {
    comfortable: [
      { text: "주공, 병력 {playerTroops}에 훈련도 {playerTraining}%입니다. {threatName}에 비해 우리가 강합니다. 언제든 출격 가능하옵니다.", emotion: "calm" },
      { text: "군사 상황은 만족스럽습니다. 병력 {playerTroops}, 전투력 {playerMP}으로 어떤 적도 두렵지 않습니다.", emotion: "excited" },
    ],
    stable: [
      { text: "병력 {playerTroops}으로 안정적이옵니다. 훈련도 {playerTraining}%를 유지하며 대비하고 있습니다.", emotion: "calm" },
    ],
    adequate: [
      { text: "병력은 {playerTroops}이나, 훈련도 {playerTraining}%가 다소 부족합니다. 더 강해져야 합니다.", emotion: "thoughtful" },
      { text: "{threatName}의 군사력 {threatMP}에 비해 우리는 {playerMP}이옵니다. 병력 보강이 필요합니다.", emotion: "thoughtful" },
    ],
    uneasy: [
      { text: "{threatName}의 {threatMP}에 비해 우리 {playerMP}은 부족합니다. 훈련도 {playerTraining}%로는 싸우기 힘듭니다.", emotion: "worried" },
    ],
    crisis: [
      { text: "주공, 병력 {playerTroops}으로는 {threatName}의 {threatMP}을 당해낼 수 없습니다! 즉각 충원해야 합니다!", emotion: "worried" },
      { text: "군사 상황이 위급합니다. 훈련도 {playerTraining}%, 병력 {playerTroops}으로는 방어조차 불확실합니다.", emotion: "worried" },
    ],
    critical: [
      { text: "주공! 병력이 위기입니다! {playerTroops}으로는 {threatName}의 침공을 막을 수 없사옵니다!", emotion: "angry" },
    ],
  },
  countermeasure_military: {
    comfortable: [
      { text: "현 병력을 유지하되, 훈련도를 {trainTarget}%까지 끌어올리면 더욱 강해질 것입니다.", emotion: "calm" },
    ],
    stable: [
      { text: "정예화에 집중합시다. 훈련도 {trainTarget}%를 목표로 훈련을 강화하겠습니다.", emotion: "calm" },
    ],
    adequate: [
      { text: "모병과 훈련을 병행해야 합니다. 내정력을 투입해 병력과 훈련도를 동시에 높이겠습니다.", emotion: "thoughtful" },
    ],
    uneasy: [
      { text: "우선 모병이 급합니다. 내정력을 투입해 병력을 보강한 뒤 훈련을 실시하겠습니다.", emotion: "worried" },
    ],
    crisis: [
      { text: "지금 당장 모병에 착수해야 합니다! 가능한 모든 내정력을 병력 충원에 쏟아부으십시오!", emotion: "worried" },
    ],
    critical: [
      { text: "모든 것을 병력 확보에 집중해야 합니다! 내정력을 전부 모병에 투입하십시오!", emotion: "angry" },
    ],
  },

  // ── 미축에게 IP 지원 요청 ──
  request_ip_support: {
    uneasy: [
      { text: "미축, 훈련 강화에 내정력이 필요하오. {trainTarget}%까지 끌어올리려 하는데 지원해 줄 수 있소?", emotion: "thoughtful" },
      { text: "미축, 모병과 훈련을 병행하려 하오. 내정력 여유가 있으면 군사 쪽으로 좀 써도 되겠소?", emotion: "thoughtful" },
    ],
    crisis: [
      { text: "미축, 병력 보충이 급하오! {recruitTarget}명 모병이 목표인데, 내정력이 얼마나 됩니까?", emotion: "worried" },
      { text: "미축! 모병에 내정력을 최대한 투입해야 하오. 지금 얼마나 지원할 수 있소?", emotion: "worried" },
    ],
    critical: [
      { text: "미축! 지금 당장 내정력을 모두 모병에 써야 하오! 얼마나 있소?", emotion: "angry" },
    ],
  },
};

// ===================== 미축 대사 템플릿 (내정 담당) =====================

export const MI_ZHU_TEMPLATES: Partial<TemplateMap> = {
  economy_status: {
    comfortable: [
      { text: "주공, 내정은 순조롭습니다. 시장 {marketCount}개, 논 {farmCount}개로 턴당 {ipRegen} 내정력을 확보하고 있사옵니다. 현재 {ip}/{ipCap}이옵니다.", emotion: "excited" },
      { text: "재정 상황이 양호합니다. 수입 {ipRegen}, 잔액 {ip}로 어떠한 사업도 실행 가능합니다.", emotion: "calm" },
    ],
    stable: [
      { text: "내정 수입은 {ipRegen}으로 안정적입니다. 시장 {marketCount}개, 논 {farmCount}개를 운영 중이옵니다.", emotion: "calm" },
    ],
    adequate: [
      { text: "턴당 수입 {ipRegen}으로 보통 수준입니다. {castleCount}개 성채 기준으로 시설 확충의 여지가 있습니다.", emotion: "thoughtful" },
      { text: "수입 {ipRegen}은 나쁘지 않으나, 시장 {marketCount}개, 논 {farmCount}개 이상의 투자가 필요합니다.", emotion: "thoughtful" },
    ],
    uneasy: [
      { text: "수입 {ipRegen}이 다소 부족합니다. 현재 잔액 {ip}로는 장기적으로 불안합니다.", emotion: "worried" },
    ],
    crisis: [
      { text: "주공, 내정이 위태롭습니다. 턴당 수입 {ipRegen}, 잔액 {ip}로는 시설 개선이 쉽지 않습니다.", emotion: "worried" },
    ],
    critical: [
      { text: "내정이 바닥났습니다! 수입 {ipRegen}, 잔액 {ip}로는 시설 투자가 불가합니다!", emotion: "angry" },
    ],
  },
  countermeasure_economy: {
    comfortable: [
      { text: "여유가 있으니 은행 업그레이드로 내정력 상한을 늘리거나, 기존 시설을 업그레이드하는 것이 좋겠습니다.", emotion: "calm" },
    ],
    stable: [
      { text: "시장이나 논을 업그레이드해 수입을 더 늘리면 좋겠습니다.", emotion: "calm" },
    ],
    adequate: [
      { text: "시설 투자를 권합니다. {buildAdvice}.", emotion: "thoughtful" },
    ],
    uneasy: [
      { text: "수입 증대가 시급합니다. {buildAdvice}.", emotion: "worried" },
    ],
    crisis: [
      { text: "수입 개선이 최우선입니다. {buildAdvice}.", emotion: "worried" },
    ],
    critical: [
      { text: "내정이 붕괴 직전입니다! {buildAdvice}.", emotion: "angry" },
    ],
  },

  // ── 관우의 IP 요청에 대한 응답 ──
  reply_ip_to_military: {
    comfortable: [
      { text: "관우 장군, 현재 내정력 {ip}이옵니다. 군사 지원에 아낌없이 쓰십시오.", emotion: "calm" },
    ],
    stable: [
      { text: "관우 장군, 내정력 {ip} 보유 중입니다. 필요한 만큼 모병에 투입 가능합니다.", emotion: "calm" },
    ],
    adequate: [
      { text: "관우 장군, 현재 {ip} 있습니다. 모병 지원은 가능하나 시설 투자와 나눠 써야 합니다.", emotion: "thoughtful" },
      { text: "관우 장군, 내정력 {ip}이옵니다. 모병 우선으로 배정하되 시장 투자도 챙겨야 합니다.", emotion: "thoughtful" },
    ],
    uneasy: [
      { text: "관우 장군, 내정력이 {ip}으로 넉넉하지 않습니다. 모병과 시설 투자 중 우선순위를 정해야 합니다.", emotion: "worried" },
    ],
    crisis: [
      { text: "관우 장군, 내정력이 {ip}으로 여유가 없습니다. 방통 선생께 외교 원조를 요청하면 내정력을 확보할 수 있을 것이옵니다.", emotion: "worried" },
    ],
    critical: [
      { text: "관우 장군, 내정력이 {ip}으로 당장 지원이 불가합니다. 방통 선생의 외교 원조를 받은 뒤 모병에 쓰심이 옳을 것이옵니다.", emotion: "angry" },
    ],
  },
};

// ===================== 방통 대사 템플릿 (외교 담당) =====================

export const PANG_TONG_TEMPLATES: Partial<TemplateMap> = {
  diplomacy_status: {
    comfortable: [
      { text: "주공, 외교적으로 안정적입니다. {threatName}과의 관계는 {threatRelationLabel}이라, 당분간 침공 위험은 낮아 보입니다.", emotion: "calm" },
      { text: "{threatName}과의 관계({threatRelationLabel})는 양호합니다. 외교력 {dp}를 비축할 여유가 있사옵니다.", emotion: "excited" },
    ],
    stable: [
      { text: "{threatName}과의 관계는 {threatRelationLabel}입니다. 현 상태를 유지하는 것이 상책이옵니다.", emotion: "calm" },
    ],
    adequate: [
      { text: "{threatName}과의 관계가 {threatRelationLabel}입니다. 외교력 {dp}로 관계 개선을 도모할 시기이옵니다.", emotion: "thoughtful" },
      { text: "{threatName}의 속내를 살펴야 합니다. 관계 점수 {threatRelation}은 애매한 위치입니다.", emotion: "thoughtful" },
    ],
    uneasy: [
      { text: "{threatName}과의 관계({threatRelationLabel})가 불안합니다. 조속히 외교적 조치를 취하지 않으면 위태로울 수 있습니다.", emotion: "worried" },
    ],
    crisis: [
      { text: "{threatName}과의 관계가 {threatRelationLabel}로 극도로 악화되어 있습니다. 언제든 침공이 올 수 있으니 경계를 늦출 수 없습니다.", emotion: "worried" },
    ],
    critical: [
      { text: "주공, {threatName}이 언제 쳐들어와도 이상하지 않습니다! {threatRelationLabel} 상태로는 외교로 막기도 어렵습니다!", emotion: "angry" },
    ],
  },
  countermeasure_diplomacy: {
    comfortable: [
      { text: "현 외교 관계를 유지하면서, 여유가 있을 때 동맹 관계를 더 공고히 하는 것이 좋겠습니다.", emotion: "calm" },
    ],
    stable: [
      { text: "외교 상황은 안정적이옵니다. 외교력 {dp}를 보유하고 있으니, 필요 시 즉각 대응이 가능합니다.", emotion: "calm" },
    ],
    adequate: [
      { text: "외교력 {dp}를 투입해 {threatName}과의 관계를 개선할 것을 권합니다. 작은 투자로 큰 위험을 막을 수 있습니다.", emotion: "thoughtful" },
    ],
    uneasy: [
      { text: "{threatName}과의 관계 개선이 시급합니다. 외교력 {dp}를 아끼지 말고 투입하십시오.", emotion: "worried" },
    ],
    crisis: [
      { text: "지금 당장 {threatName}과 외교를 수습해야 합니다! 외교력 {dp}를 즉시 투입해 관계를 개선하십시오. 그렇지 않으면 침공을 면치 못합니다.", emotion: "worried" },
    ],
    critical: [
      { text: "{threatName}의 침공이 코앞입니다! 외교력 {dp}를 모두 쏟아부어 당장 관계를 수습하지 않으면 전멸입니다!", emotion: "angry" },
    ],
  },
};

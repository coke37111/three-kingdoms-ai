/**
 * 2-레이어 참모 회의 — DirectiveAgendaCase 정의
 *
 * 기존 16개 AgendaCase를 9개 directive별로 재편성.
 * 대사 텍스트는 기존 agendaCases.ts에서 그대로 재활용.
 */

import type { DirectiveAgendaCase } from "./types";
import { getWallUpgradeCost, RECRUIT_TROOPS_PER_IP } from "@/constants/gameConstants";

export const ALL_DIRECTIVE_AGENDAS: DirectiveAgendaCase[] = [

  // ══════════════════════════════════════════════════════════
  // rebuild — 패전/병력위급 후 재건
  // ══════════════════════════════════════════════════════════
  {
    directive: "rebuild",
    strategicDeclaration: [
      {
        subCondition: (s) => s.strategic.recentBattleLost,
        variations: [
          {
            dialogue: (s) => `주공, 지난 전투의 패배로 큰 손실을 입었습니다. 지금 당장은 수성과 병력 재건에 집중해야 합니다. 신도 현 방어선을 재정비할 것이옵니다.`,
            emotion: "worried",
          },
          {
            dialogue: (s) => `패전의 충격이 아직 가시지 않았습니다. 섣불리 나서다간 더 큰 화를 부를 수 있습니다. 이번 회의에서는 재건 방안을 논하겠사옵니다.`,
            emotion: "thoughtful",
          },
          {
            dialogue: (s) => `주공, 패전은 뼈아프나 여기서 무너지면 대업도 없습니다. 방어를 굳히고 병력을 회복하는 것이 급선무이옵니다.`,
            emotion: "worried",
          },
        ],
      },
      {
        subCondition: (s) => s.military.troopsCritical,
        variations: [
          {
            dialogue: (s) => `주공, 지금 우리 병력이 만 명도 되지 않습니다. 즉시 모병에 전력을 다해야 합니다. 이 상태로는 어떤 전투도 감당할 수 없습니다.`,
            emotion: "worried",
          },
          {
            dialogue: (s) => `병력이 바닥났습니다. 지금은 모든 자원을 모병에 쏟아야 합니다. 전투는 병력 회복 이후의 일입니다.`,
            emotion: "worried",
          },
        ],
      },
    ],
    domainResponses: {
      "관우": [
        {
          subCondition: (s) => s.strategic.recentBattleLost,
          variations: [
            {
              dialogue: (s) => `부끄럽습니다, 주공. 이 관우가 병력을 즉시 보충하고 수비 진형을 강화하겠습니다. 적이 다시 오면 물리칠 준비를 갖추겠습니다.`,
              emotion: "worried",
            },
            {
              dialogue: (s) => `패배를 설욕할 기회는 반드시 옵니다. 지금은 부상병 회복과 수비 강화에 전력을 기울이겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        },
        {
          subCondition: (s) => s.military.troopsCritical,
          variations: [
            {
              dialogue: (s) => {
                const ipToSpend = Math.min(40, Math.floor(s.economy.ip * 0.4));
                const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
                return `병력이 너무 적소! 내정력 ${ipToSpend}를 투입해 ${troops.toLocaleString()}명을 즉시 모병하겠소. 미축, 지금 내정력이 얼마나 있소?`;
              },
              emotion: "worried",
            },
            {
              dialogue: (s) => {
                const ipToSpend = Math.min(30, Math.floor(s.economy.ip * 0.3));
                const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
                return `병력이 이 지경이라면 수비만이 살 길이오. 내정력 ${ipToSpend}로 ${troops.toLocaleString()}명 모병하고 모병에 집중하겠소.`;
              },
              emotion: "worried",
            },
          ],
        },
      ],
      "미축": [
        {
          subCondition: (s) => s.strategic.recentBattleLost,
          variations: [
            {
              dialogue: (s) => `전쟁 중 물자 소모가 심각합니다. 시장과 농장을 최대한 활성화하여 군량 보급을 서둘러야 하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `패전 후 경제적 손실도 상당합니다. 내정을 안정시켜 병력 재건에 필요한 재원을 확보해야겠습니다.`,
              emotion: "worried",
            },
          ],
        },
        {
          subCondition: (s) => s.military.troopsCritical,
          variations: [
            {
              dialogue: (s) => `모병 비용을 확보하는 것이 급선무입니다. 다른 지출을 줄이고 내정력을 모병에 집중 투자해야 하겠습니다.`,
              emotion: "worried",
            },
            {
              dialogue: (s) => `군량과 군비가 갖추어져야 병사도 모을 수 있습니다. 시장 운영을 최대화하여 자원을 확보하겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        },
      ],
      "방통": [
        {
          subCondition: (s) => s.strategic.recentBattleLost,
          variations: [
            {
              dialogue: (s) => `적들이 우리의 패배를 기회로 삼을 수 있습니다. 조속히 한쪽 적과 화친을 맺어 양면 압박을 피해야 합니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `패전 소식은 외교에도 악영향을 미칩니다. 서둘러 평화 협상이라도 시도하여 시간을 버는 것이 상책이옵니다.`,
              emotion: "worried",
            },
          ],
        },
        {
          subCondition: (s) => s.military.troopsCritical,
          variations: [
            {
              dialogue: (s) => `이렇게 허약한 상태에서 외교가 유일한 방패입니다. 한 세력과라도 관계를 맺어 공격을 막아야 합니다.`,
              emotion: "worried",
            },
            {
              dialogue: (s) => `병력 회복 기간 동안 외교로 시간을 버는 것이 전략입니다. 제가 화친 교섭을 맡겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        },
      ],
    },
    threadReplies: {
      "관우": {
        "미축": [{
          variations: [
            {
              dialogue: (s) => {
                const ip = s.economy.ip;
                const ipToSpend = Math.min(40, Math.floor(ip * 0.4));
                const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
                if (ip < 5) return `관우 장군, 내정력이 ${ip}으로 모병도 어렵습니다. 시장 건설이 먼저입니다.`;
                return `관우 장군, 내정력 ${ip} 중 ${ipToSpend}를 투입하면 ${troops.toLocaleString()}명 모병이 가능합니다.`;
              },
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `관우 장군의 모병 계획에 맞춰 자금을 최우선으로 배정하겠습니다. 다른 지출은 뒤로 미루겠습니다.`,
              emotion: "worried",
            },
          ],
        }],
        "방통": [{
          variations: [
            {
              dialogue: () => `관우 장군이 병력을 재건하는 동안, 제가 적의 추격을 외교로 막아보겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: () => `패전 직후라 적이 기세를 몰아올 수 있습니다. 화친 제안으로 시간을 벌겠습니다.`,
              emotion: "worried",
            },
          ],
        }],
      },
      "미축": {
        "관우": [{
          variations: [
            {
              dialogue: () => `미축이 자원을 확보해주면 이 관우가 즉시 모병하겠소. 병력 재건은 내가 맡겠소!`,
              emotion: "worried",
            },
            {
              dialogue: () => `좋소. 미축의 지원을 받아 먼저 수비 병력부터 채우겠소. 공세는 그 다음이오.`,
              emotion: "thoughtful",
            },
          ],
        }],
        "방통": [{
          variations: [
            {
              dialogue: () => `미축이 내정을 안정시키는 동안 외교로 적의 공격 의지를 꺾어놓겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: () => `자원 회복 기간이 필요하니, 제가 적과의 대화 창구를 열어 시간을 확보하겠습니다.`,
              emotion: "calm",
            },
          ],
        }],
      },
      "방통": {
        "관우": [{
          variations: [
            {
              dialogue: () => `방통의 외교가 성사되면 한 방면은 안전하오. 그 사이 병력을 집중적으로 회복하겠소.`,
              emotion: "thoughtful",
            },
            {
              dialogue: () => `외교로 숨통이 트이면 재건에 전력할 수 있소. 방통에게 맡기겠소.`,
              emotion: "calm",
            },
          ],
        }],
        "미축": [{
          variations: [
            {
              dialogue: () => `방통 선생의 외교 비용은 제가 마련하겠습니다. 사절 파견과 동시에 내정 재건도 시작하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: () => `외교와 내정 재건을 동시에 추진해야 합니다. 자금 배분은 제가 조율하겠습니다.`,
              emotion: "calm",
            },
          ],
        }],
      },
    },
    mentionResponses: [
      {
        subCondition: (s) => s.military.troopsCritical,
        from: "관우",
        to: "미축",
        variations: [
          {
            dialogue: (s) => {
              const ip = s.economy.ip;
              const ipToSpend = Math.min(40, Math.floor(ip * 0.4));
              const troops = ipToSpend * RECRUIT_TROOPS_PER_IP;
              if (ip < 5) {
                return `내정력이 ${ip}으로 모병도 어렵습니다. 시장 건설이 시급합니다.`;
              }
              return `현재 내정력 ${ip}이옵니다. 내정력 ${ipToSpend}로 ${troops.toLocaleString()}명 모병 가능합니다.`;
            },
            emotion: "thoughtful",
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // offensive — 공세 (승전, 군사 우세)
  // ══════════════════════════════════════════════════════════
  {
    directive: "offensive",
    strategicDeclaration: [
      {
        subCondition: (s) => s.strategic.recentBattleWon,
        variations: [
          {
            dialogue: (s) => `주공, 지난 전투의 승리를 축하드립니다! 이 기세를 몰아 전과를 확대하거나 방어선을 공고히 할 때입니다. 전략을 논하겠사옵니다.`,
            emotion: "excited",
          },
          {
            dialogue: (s) => `승전의 기운이 군중에 넘칩니다. 이 사기를 살려 다음 단계로 나아갈 방책을 마련해야겠습니다.`,
            emotion: "excited",
          },
          {
            dialogue: (s) => `전승의 여세를 유지하되 너무 깊이 들어가 보급이 끊기는 일이 없도록 조심해야 합니다. 신중하게 다음 수를 논하겠습니다.`,
            emotion: "thoughtful",
          },
        ],
      },
      {
        subCondition: () => true,
        variations: [
          {
            dialogue: (s) => `주공, 지금 우리 군사력이 ${s.strategic.weakestEnemy?.name ?? "적"}을 크게 앞서고 있습니다. 공세로 전환하여 영토를 넓힐 절호의 기회입니다.`,
            emotion: "excited",
          },
          {
            dialogue: (s) => `힘의 우위를 가진 지금, 수세만 취하는 것은 기회를 낭비하는 것입니다. 공세를 논의해야 하겠습니다.`,
            emotion: "excited",
          },
          {
            dialogue: (s) => `군사력이 우세할 때 공격해야 합니다. 수세만 지키다가는 적들에게 역전을 허용할 수 있습니다. 공세 전략을 논하겠사옵니다.`,
            emotion: "thoughtful",
          },
        ],
      },
    ],
    domainResponses: {
      "관우": [
        {
          subCondition: (s) => s.strategic.recentBattleWon,
          variations: [
            {
              dialogue: (s) => `하하, 이번 승리로 우리 군의 사기가 하늘을 찌릅니다! 지금이야말로 진격하여 적의 성채를 하나 더 빼앗을 기회입니다.`,
              emotion: "excited",
            },
            {
              dialogue: (s) => `적이 혼란에 빠진 지금이 찬스입니다. 이 관우가 앞장서서 추격전을 벌이겠습니다.`,
              emotion: "excited",
            },
          ],
        },
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `드디어 때가 왔습니다! 이 관우가 선봉에 서겠습니다. 어느 성채를 먼저 공략할지 명령만 내려주십시오.`,
              emotion: "excited",
            },
            {
              dialogue: (s) => `적이 약할 때 쳐야 합니다. 지금 진격하지 않으면 후회할 것입니다. 명령을 기다립니다.`,
              emotion: "excited",
            },
          ],
        },
      ],
      "미축": [
        {
          subCondition: (s) => s.strategic.recentBattleWon,
          variations: [
            {
              dialogue: (s) => `승전보에 민심도 높아졌습니다. 지금 시설 투자를 늘리면 내정 성장에 탄력이 붙을 것이옵니다.`,
              emotion: "excited",
            },
            {
              dialogue: (s) => `전투 물자 보충과 함께 점령지 내정 안정화에도 힘써야 하겠습니다. 승리를 지속하려면 보급이 뒷받침되어야 합니다.`,
              emotion: "thoughtful",
            },
          ],
        },
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `공세를 위한 군량과 물자를 미리 비축하겠습니다. 장기 원정에 대비한 보급선도 준비하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `공격에 앞서 군수 준비를 확인해야 합니다. 보급이 뒷받침되어야 오래 싸울 수 있습니다.`,
              emotion: "calm",
            },
          ],
        },
      ],
      "방통": [
        {
          subCondition: (s) => s.strategic.recentBattleWon,
          variations: [
            {
              dialogue: (s) => `승리는 외교 협상에서도 강력한 패가 됩니다. 이 기회에 한 세력과 관계를 개선해 두면 나중에 유리하게 쓸 수 있습니다.`,
              emotion: "excited",
            },
            {
              dialogue: (s) => `두 적이 우리의 기세에 긴장하고 있을 것입니다. 약한 쪽에 화의를 제안하여 한 방향에서 안전을 확보하는 것도 묘책이옵니다.`,
              emotion: "thoughtful",
            },
          ],
        },
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `공격 전에 한 세력과 관계를 안정시켜 두면 유리합니다. 외교로 후방을 확보한 뒤 공세에 나서는 것이 상책입니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `공격 시기에 다른 세력이 뒤를 찌를 수 있습니다. 외교적 안전 장치를 먼저 마련하겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        },
      ],
    },
    threadReplies: {
      "관우": {
        "미축": [{
          variations: [
            {
              dialogue: () => `관우 장군의 진격에 맞춰 군수 보급을 최대한 준비하겠습니다. 장기전에도 대비해야 합니다.`,
              emotion: "excited",
            },
            {
              dialogue: () => `관우 장군이 선봉이시라면, 전투 물자와 보급선을 미리 확보하겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        }],
        "방통": [{
          variations: [
            {
              dialogue: () => `관우 장군이 전면에 나서는 동안, 다른 세력이 뒤를 치지 못하도록 외교로 견제하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: () => `공세 중 배후가 걱정됩니다. 제가 외교로 한쪽 전선을 안전하게 만들어두겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        }],
      },
      "미축": {
        "관우": [{
          variations: [
            {
              dialogue: () => `미축이 보급을 준비해주니 안심이오! 이 관우가 반드시 전과를 올리겠소.`,
              emotion: "excited",
            },
            {
              dialogue: () => `좋소. 보급이 따라오면 장기 원정도 문제없소. 적 성채를 빼앗겠소!`,
              emotion: "excited",
            },
          ],
        }],
        "방통": [{
          variations: [
            {
              dialogue: () => `미축이 군수를 챙기는 동안 제가 적 후방의 동요를 유도하겠습니다. 안팎으로 압박합시다.`,
              emotion: "excited",
            },
            {
              dialogue: () => `보급이 든든하니 외교에서도 자신감을 갖고 협상할 수 있습니다.`,
              emotion: "thoughtful",
            },
          ],
        }],
      },
      "방통": {
        "관우": [{
          variations: [
            {
              dialogue: () => `방통이 외교를 맡겠다니, 후방 걱정 없이 전면 공격에 집중하겠소!`,
              emotion: "excited",
            },
            {
              dialogue: () => `외교로 배후를 안정시켜준다면, 이 관우가 전력을 다해 적을 치겠소.`,
              emotion: "excited",
            },
          ],
        }],
        "미축": [{
          variations: [
            {
              dialogue: () => `방통 선생이 외교로 한쪽을 막아주신다면, 공세에 필요한 군비를 집중 투자하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: () => `배후가 안전하다면 자원을 공격에 집중할 수 있습니다. 전쟁 물자를 최대한 확보하겠습니다.`,
              emotion: "excited",
            },
          ],
        }],
      },
    },
  },

  // ══════════════════════════════════════════════════════════
  // defensive_crisis — 본성 위협
  // ══════════════════════════════════════════════════════════


  {
    directive: "defensive_crisis",
    strategicDeclaration: [
      {
        subCondition: () => true,
        variations: [
          {
            dialogue: (s) => `주공, 위급합니다! 적군이 우리 본성 바로 옆까지 다가왔습니다. 즉각 방어 체제로 전환하지 않으면 본성을 잃을 수 있습니다.`,
            emotion: "worried",
          },
          {
            dialogue: (s) => `주공, 지금 본성이 위협받고 있습니다. 병력을 총동원하여 방어에 집중해야 할 때입니다. 다른 모든 것은 부차적입니다.`,
            emotion: "worried",
          },
          {
            dialogue: (s) => `본성의 함락은 곧 대업의 끝입니다. 지금 당장 수비 태세를 완비하는 것이 이번 회의의 유일한 안건이옵니다.`,
            emotion: "worried",
          },
        ],
      },
    ],
    domainResponses: {
      "관우": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => {
                const wallCost = getWallUpgradeCost(1);
                const recruitIp = Math.min(30, Math.floor(s.economy.ip * 0.3));
                const troops = recruitIp * RECRUIT_TROOPS_PER_IP;
                return `성벽을 쌓고 병력을 늘려야 버틸 수 있소! 성벽 강화(내정력 ${wallCost} 소비)와 모병 ${troops.toLocaleString()}명(내정력 ${recruitIp} 소비)을 동시에 추진하겠소. 미축, 내정력이 충분하오?`;
              },
              emotion: "worried",
            },
            {
              dialogue: (s) => {
                const wallCost = getWallUpgradeCost(1);
                return `지금 당장 성벽을 강화해야 하오! 내정력 ${wallCost} 투입하면 수성 방어가 0.1 오르오. 병력도 추가 모병하겠소. 미축이 내정력 상황을 확인해주시오.`;
              },
              emotion: "angry",
            },
          ],
        },
      ],
      "미축": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `방어전에 대비해 군량과 군비를 최대한 비축해야 합니다. 시장에서 긴급 조달도 서둘러야겠습니다.`,
              emotion: "worried",
            },
            {
              dialogue: (s) => `성내 자원을 전부 동원해야 합니다. 비상 시기에 내정력을 아껴서는 안 됩니다.`,
              emotion: "worried",
            },
          ],
        },
      ],
      "방통": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `다른 세력에 긴급 화친을 요청해야 합니다. 한쪽 전선만이라도 안전하게 만들어야 본성 방어에 집중할 수 있습니다.`,
              emotion: "worried",
            },
            {
              dialogue: (s) => `이 방통이 외교적 수단을 총동원하겠습니다. 적의 동맹을 깨거나 화친으로 시간을 버는 것이 관건입니다.`,
              emotion: "worried",
            },
          ],
        },
      ],
    },
    threadReplies: {
      "관우": {
        "미축": [{
          variations: [
            {
              dialogue: (s) => {
                const wallCost = getWallUpgradeCost(1);
                const ip = s.economy.ip;
                if (ip >= wallCost)
                  return `관우 장군, 내정력 ${ip}이니 성벽 강화(${wallCost})와 모병 모두 지원 가능합니다. 즉시 준비하겠습니다!`;
                return `관우 장군, 현재 내정력 ${ip}으로는 성벽 강화(${wallCost})가 부족합니다. 모병 쪽을 우선하겠습니다.`;
              },
              emotion: "worried",
            },
            {
              dialogue: (s) => {
                const ip = s.economy.ip;
                return `관우 장군의 방어 계획에 맞춰 내정력 ${ip} 전부를 군비에 투입하겠습니다. 지금은 아낄 때가 아닙니다.`;
              },
              emotion: "worried",
            },
          ],
        }],
        "방통": [{
          variations: [
            {
              dialogue: () => `관우 장군이 방어를 맡는 동안, 제가 화친 교섭으로 한쪽 전선을 안정시키겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: () => `관우 장군의 수성이 성공하려면 양면 전쟁을 피해야 합니다. 외교로 한 방향을 막아두겠습니다.`,
              emotion: "worried",
            },
          ],
        }],
      },
      "미축": {
        "관우": [{
          variations: [
            {
              dialogue: () => `미축의 말이 맞소. 자원이 확보되는 대로 즉시 성벽 강화와 모병에 투입하겠소!`,
              emotion: "worried",
            },
            {
              dialogue: () => `미축이 군비를 마련해주면 이 관우가 반드시 본성을 지켜내겠소. 걱정 마시오!`,
              emotion: "angry",
            },
          ],
        }],
        "방통": [{
          variations: [
            {
              dialogue: () => `미축이 자원을 확보하는 동안 외교적으로 시간을 벌어보겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: () => `미축의 자원 동원과 함께 제가 적진에 사신을 보내 공격을 늦추겠습니다.`,
              emotion: "worried",
            },
          ],
        }],
      },
      "방통": {
        "관우": [{
          variations: [
            {
              dialogue: () => `방통의 외교 교섭이 성사되면 좋겠소만, 만일의 경우 방어는 내가 책임지겠소.`,
              emotion: "worried",
            },
            {
              dialogue: () => `외교가 먹히는 동안 나는 성벽을 쌓고 병사를 훈련시키겠소. 두 갈래로 가야 합니다.`,
              emotion: "angry",
            },
          ],
        }],
        "미축": [{
          variations: [
            {
              dialogue: () => `방통 선생의 외교전에 필요한 자금은 제가 준비하겠습니다.`,
              emotion: "worried",
            },
            {
              dialogue: () => `외교 사절 파견 비용과 함께 방어 군비도 동시에 조달하겠습니다.`,
              emotion: "worried",
            },
          ],
        }],
      },
    },
    mentionResponses: [
      {
        from: "관우",
        to: "미축",
        variations: [
          {
            dialogue: (s) => {
              const wallCost = getWallUpgradeCost(1);
              const ip = s.economy.ip;
              if (ip >= wallCost) {
                return `현재 내정력 ${ip}이라 성벽 강화(${wallCost})와 모병 모두 가능합니다. 즉시 지원하겠습니다!`;
              } else {
                return `현재 내정력이 ${ip}이라 성벽 강화(${wallCost})는 부족합니다. 모병은 가능하오니 내정력 확보를 서두르겠습니다.`;
              }
            },
            emotion: "worried",
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // total_war — 적 본성 공략
  // ══════════════════════════════════════════════════════════
  {
    directive: "total_war",
    strategicDeclaration: [
      {
        subCondition: () => true,
        variations: [
          {
            dialogue: (s) => `주공, 우리 병력이 적의 본성 바로 앞까지 다가가 있습니다. 지금이야말로 결정적 일격을 날릴 기회입니다. 이 기회를 놓쳐서는 안 됩니다.`,
            emotion: "excited",
          },
          {
            dialogue: (s) => `천재일우의 기회가 왔습니다. 적 본성이 코앞입니다. 병력을 집결시켜 총공세를 논해야 합니다.`,
            emotion: "excited",
          },
        ],
      },
    ],
    domainResponses: {
      "관우": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `드디어 때가 왔습니다! 이 관우가 선봉이 되어 적 본성을 공략하겠습니다. 명령만 내려주십시오!`,
              emotion: "excited",
            },
            {
              dialogue: (s) => `지금 총공격을 감행하면 대업을 이룰 수 있습니다. 모든 병력을 집결시켜야 합니다.`,
              emotion: "excited",
            },
          ],
        },
      ],
      "미축": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `총공세를 위한 보급을 최대치로 준비하겠습니다. 이번만큼은 아낌없이 지원하겠습니다.`,
              emotion: "excited",
            },
            {
              dialogue: (s) => `장기전에 대비한 물자도 미리 비축하겠습니다. 포위 작전이 될 수도 있으니 충분한 준비가 필요합니다.`,
              emotion: "thoughtful",
            },
          ],
        },
      ],
      "방통": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `총공세 전에 다른 세력이 뒤를 찌르지 않도록 외교적 안전을 확보하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `적 본성 공략 중 다른 적이 우리를 공격하면 곤란합니다. 외교로 견제하겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // economic_priority — 경제 우선 (시설 전무 / 수입 위기)
  // ══════════════════════════════════════════════════════════
  {
    directive: "economic_priority",
    strategicDeclaration: [
      {
        subCondition: (s) => s.economy.noFacilities,
        variations: [
          {
            dialogue: (s) => `주공, 아직 기본 시설이 하나도 없습니다. 시장과 농장 없이는 안정적인 수입을 기대할 수 없으니, 기반 시설 건설이 이번 회의의 최우선 안건입니다.`,
            emotion: "thoughtful",
          },
          {
            dialogue: (s) => `지금 시설이 전무하여 내정력 재생이 극히 낮습니다. 당장 시장이나 농장부터 건설해야 합니다.`,
            emotion: "thoughtful",
          },
          {
            dialogue: (s) => `기반이 없으면 대업도 없습니다. 이번 회의에서는 첫 번째 시설 건설을 결정해야 하겠습니다.`,
            emotion: "calm",
          },
        ],
      },
      {
        subCondition: (s) => s.economy.ipNearCap,
        variations: [
          {
            dialogue: (s) => `주공, 내정력이 한도에 거의 차올랐습니다. 지금 적극적으로 소비하지 않으면 다음 턴부터 이득 없이 넘쳐버립니다. 은행 확장이나 시설 투자를 서둘러야 합니다.`,
            emotion: "thoughtful",
          },
          {
            dialogue: (s) => `내정 창고가 가득 찼습니다. 한도를 넘으면 자원이 사라집니다. 이번 턴에 시설 업그레이드나 모병으로 소비를 해야 하옵니다.`,
            emotion: "thoughtful",
          },
        ],
      },
      {
        subCondition: (s) => s.economy.lowIncome,
        variations: [
          {
            dialogue: (s) => `주공, 이번 턴 내정 수입이 겨우 ${s.economy.ipRegen}에 불과합니다. 이 상태로는 아무것도 할 수 없습니다. 시장 건설이 시급합니다.`,
            emotion: "worried",
          },
          {
            dialogue: (s) => `수입이 극히 저조합니다. 시장을 건설하거나 업그레이드하지 않으면 자원이 고갈되어 대업에 차질이 생깁니다.`,
            emotion: "thoughtful",
          },
          {
            dialogue: (s) => `주공, 지금 당장 수입 기반을 늘려야 합니다. 시장 없이 전쟁도 정치도 불가능합니다.`,
            emotion: "worried",
          },
        ],
      },
    ],
    domainResponses: {
      "관우": [
        {
          subCondition: (s) => s.economy.noFacilities,
          variations: [
            {
              dialogue: (s) => `병력을 먹일 군량이 없으면 전투도 불가능합니다. 농장을 먼저 지어 군량 기반을 마련해야 한다고 생각합니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `시설 건설에 이 관우도 찬성합니다. 군대는 보급 없이 움직일 수 없으니 기초부터 다집시다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: (s) => s.economy.ipNearCap,
          variations: [
            {
              dialogue: (s) => `내정력이 넘치면 모병에 쓰면 됩니다. 이번 턴에 병력을 보충하는 데 활용하시는 것이 어떻겠습니까?`,
              emotion: "calm",
            },
            {
              dialogue: (s) => `군사 훈련 강화에도 내정력이 필요합니다. 넘치는 자원을 훈련에 투자하면 전투력이 오릅니다.`,
              emotion: "thoughtful",
            },
          ],
        },
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `군비가 없으면 병사도 못 먹입니다. 내정을 빨리 일으켜 군사 비용을 감당할 수 있게 해주셔야 합니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `빈 창고로는 전쟁을 치를 수 없습니다. 시장 건설을 우선 지원하겠습니다.`,
              emotion: "calm",
            },
          ],
        },
      ],
      "미축": [
        {
          subCondition: (s) => s.economy.noFacilities,
          variations: [
            {
              dialogue: (s) => `시장을 먼저 건설하면 교역으로 안정적인 내정력을 확보할 수 있습니다. 시장 건설을 추천드립니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `지금 당장 시장이나 농장 중 하나를 건설해야 합니다. 미축이 건설 계획을 이미 세워 두었습니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: (s) => s.economy.ipNearCap,
          variations: [
            {
              dialogue: (s) => `은행 레벨을 올리면 한도가 늘어납니다. 지금 당장 은행 확장을 하면 자원 손실 없이 더 많이 비축할 수 있습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `시장이나 농장 확장도 좋은 투자입니다. 넘치는 내정력을 시설 강화에 쓰면 앞으로 수입도 늘어납니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `시장을 짓는 것이 급선무입니다. 수입이 늘어야 모든 분야에 투자할 수 있습니다. 미축이 직접 관장하겠습니다.`,
              emotion: "worried",
            },
            {
              dialogue: (s) => `지금 당장 시장이나 농장 건설 허가를 내려주시면, 이번 턴부터 수입이 올라갑니다.`,
              emotion: "thoughtful",
            },
          ],
        },
      ],
      "방통": [
        {
          subCondition: (s) => s.economy.noFacilities,
          variations: [
            {
              dialogue: (s) => `내정이 안정되어야 외교도 힘을 발휘합니다. 기반 시설 건설로 경제력을 키우는 것이 장기 전략에도 도움이 됩니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `약소한 세력의 외교는 한계가 있습니다. 시설을 건설하여 내실을 다지면 협상 카드도 생깁니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: (s) => s.economy.ipNearCap,
          variations: [
            {
              dialogue: (s) => `외교 활동에 투자하는 방법도 있습니다. 넘치는 자원으로 관계 개선을 시도하면 선린 외교의 기반이 됩니다.`,
              emotion: "calm",
            },
            {
              dialogue: (s) => `자원이 넘치는 것은 좋은 신호이나, 낭비는 곤란합니다. 지금 가장 급한 분야에 집중 투자하시기 바랍니다.`,
              emotion: "thoughtful",
            },
          ],
        },
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `경제적 기반 없이는 외교도 허약합니다. 내실을 다져야 협상 테이블에서도 목소리를 낼 수 있습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `가난한 나라의 외교는 구걸에 불과합니다. 시장을 세워 상황을 바꿔야 하옵니다.`,
              emotion: "worried",
            },
          ],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // growth — 균형 성장 (초반/병력부족/훈련저조/수입저조)
  // ══════════════════════════════════════════════════════════
  {
    directive: "growth",
    strategicDeclaration: [
      {
        subCondition: (s) => s.military.troopShortage && !s.military.troopsCritical,
        variations: [
          {
            dialogue: (s) => `주공, 병력이 ${s.military.troops.toLocaleString()}명으로 아직 부족합니다. 모병을 통해 최소 2만 명 이상은 확보해야 안정적인 방어가 가능합니다.`,
            emotion: "thoughtful",
          },
          {
            dialogue: (s) => `현재 병력으로는 적의 공세를 막아내기 어렵습니다. 이번 턴에 모병을 우선시해야 하겠사옵니다.`,
            emotion: "thoughtful",
          },
        ],
      },
      {
        subCondition: (s) => s.military.lowTraining,
        variations: [
          {
            dialogue: (s) => `주공, 병사들의 훈련도가 ${Math.round(s.military.training * 100)}%에 불과합니다. 오합지졸로는 어떤 전투도 이기기 어렵습니다. 훈련 강화가 시급합니다.`,
            emotion: "thoughtful",
          },
          {
            dialogue: (s) => `훈련되지 않은 병사는 적이 올 때 짐이 됩니다. 이번 회의에서 훈련 집중 방안을 논해야 하겠습니다.`,
            emotion: "thoughtful",
          },
        ],
      },
      {
        subCondition: (s) => s.economy.ipRegen <= 10 && !s.economy.lowIncome,
        variations: [
          {
            dialogue: (s) => `주공, 이번 턴 내정 수입이 ${s.economy.ipRegen}으로 아직 부족합니다. 시장 건설이나 업그레이드로 수입을 늘려야 할 때입니다.`,
            emotion: "thoughtful",
          },
          {
            dialogue: (s) => `수입 기반이 약합니다. 지금 당장 내정 투자를 늘리지 않으면 병력 확충과 시설 강화 모두 늦어집니다.`,
            emotion: "thoughtful",
          },
        ],
      },
      {
        subCondition: (s) => s.turn <= 10,
        variations: [
          {
            dialogue: (s) => `주공, 아직 초반입니다. 지금은 기반을 다지는 것이 최우선입니다. 내정과 군사, 외교 세 축을 균형 있게 키워야 대업의 토대가 됩니다.`,
            emotion: "calm",
          },
          {
            dialogue: (s) => `첫 걸음이 중요합니다. 시설을 건설하고 병력을 키우며 외교 관계도 챙겨야 할 때입니다.`,
            emotion: "calm",
          },
          {
            dialogue: (s) => `큰 뜻을 품고 작은 것부터 차근차근 다져야 합니다. 이번 회의에서 기반 강화 방향을 정하겠사옵니다.`,
            emotion: "thoughtful",
          },
        ],
      },
      {
        subCondition: () => true,
        variations: [
          {
            dialogue: (s) => `주공, 지금은 각 분야를 고르게 성장시켜야 할 때입니다. 균형 잡힌 발전이 장기 대업의 기반이 됩니다.`,
            emotion: "calm",
          },
        ],
      },
    ],
    domainResponses: {
      "관우": [
        {
          subCondition: (s) => s.military.troopShortage && !s.military.troopsCritical,
          variations: [
            {
              dialogue: (s) => `병사가 부족하면 장수도 힘을 쓸 수 없습니다. 이번 턴 모병에 집중하고 훈련도 함께 강화하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `최소한 2만은 있어야 수비라도 제대로 할 수 있습니다. 모병을 서둘러야 합니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: (s) => s.military.lowTraining,
          variations: [
            {
              dialogue: (s) => `훈련되지 않은 병사를 데리고는 싸우고 싶지 않습니다. 이번 턴 훈련에 집중하면 전투력이 눈에 띄게 오를 것입니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `이 관우가 직접 훈련을 감독하겠습니다. 훈련도를 최소 70% 이상으로 끌어올리는 것이 목표입니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: (s) => s.turn <= 10,
          variations: [
            {
              dialogue: (s) => `초반에는 병력 확충과 훈련이 핵심입니다. 강한 군대 없이는 어떤 계책도 공허합니다. 군사력 강화에 집중하겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: (s) => `아직 병력이 적습니다. 지금부터 꾸준히 병사를 모으고 훈련시켜야 나중에 힘을 쓸 수 있습니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `군사 측면에서 보면 꾸준한 병력 유지와 훈련이 중요합니다. 이 관우는 군사력 강화에 힘쓰겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: (s) => `넉넉한 군량이 있어야 병사들도 싸울 의지가 생깁니다. 수입을 늘리는 데 협력하겠습니다.`,
              emotion: "calm",
            },
          ],
        },
      ],
      "미축": [
        {
          subCondition: (s) => s.military.troopShortage && !s.military.troopsCritical,
          variations: [
            {
              dialogue: (s) => `모병 비용을 조달하겠습니다. 내정력을 모병에 우선 배정하도록 준비하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `병사를 늘리는 것과 동시에 그들을 먹일 군량도 확보해야 합니다. 두 마리 토끼를 잡겠습니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: (s) => s.military.lowTraining,
          variations: [
            {
              dialogue: (s) => `훈련 비용도 상당합니다. 군수 지원을 아끼지 않겠습니다. 충분한 군량이 있어야 병사들도 훈련에 집중할 수 있습니다.`,
              emotion: "calm",
            },
            {
              dialogue: (s) => `훈련에 투자하는 것은 나중에 전투 손실을 줄이는 현명한 선택입니다. 비용을 아끼지 마십시오.`,
              emotion: "thoughtful",
            },
          ],
        },
        {
          subCondition: (s) => s.economy.ipRegen <= 10 && !s.economy.lowIncome,
          variations: [
            {
              dialogue: (s) => `시장 레벨을 올리거나 새 시장을 건설하면 수입이 크게 오릅니다. 이번 턴에 투자해 주십시오.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `농장도 장기적으로 군량 확보에 중요합니다. 시장과 농장을 균형 있게 발전시켜야 합니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: (s) => s.turn <= 10,
          variations: [
            {
              dialogue: (s) => `기반 시설이 없으면 모든 것이 느립니다. 이번 턴에 시장이나 농장을 최소 하나는 건설해야 합니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `초반 내정이 후반을 결정합니다. 지금 투자한 시장과 농장이 나중에 수십 배로 돌아올 것입니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `내정은 꾸준함이 핵심입니다. 시설을 지속적으로 업그레이드하여 수입 기반을 탄탄히 하겠습니다.`,
              emotion: "calm",
            },
          ],
        },
      ],
      "방통": [
        {
          subCondition: (s) => s.military.troopShortage && !s.military.troopsCritical,
          variations: [
            {
              dialogue: (s) => `병력이 약할수록 외교적 위험도 커집니다. 모병 기간 동안 외교로 적의 공격 의지를 꺾어놓겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `병력 회복 중에는 외교가 방패가 되어야 합니다. 이 방통이 협상 창구를 열어두겠습니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: (s) => s.military.lowTraining,
          variations: [
            {
              dialogue: (s) => `약한 군대가 있는 동안 외교로 시간을 벌겠습니다. 훈련이 완료될 때까지 적이 공격하지 못하도록 막겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `정예병이 될 때까지는 외교가 군사 부족을 메워야 합니다. 제가 협상에 나서겠습니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: (s) => s.economy.ipRegen <= 10 && !s.economy.lowIncome,
          variations: [
            {
              dialogue: (s) => `경제력이 뒷받침되어야 외교에서도 주도권을 쥘 수 있습니다. 내정 발전이 외교의 기반이옵니다.`,
              emotion: "calm",
            },
            {
              dialogue: (s) => `부강한 나라가 외교에서도 유리합니다. 수입을 늘려 장기적 외교 전략의 토대를 마련해야 합니다.`,
              emotion: "thoughtful",
            },
          ],
        },
        {
          subCondition: (s) => s.turn <= 10,
          variations: [
            {
              dialogue: (s) => `초반에는 외교로 시간을 벌어야 합니다. 두 세력 모두와 최대한 우호 관계를 유지하는 것이 초반 생존의 핵심입니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `아직 우리가 약하니 싸움보다 대화가 유리합니다. 외교 관계를 다져두면 나중에 큰 이득이 됩니다.`,
              emotion: "calm",
            },
          ],
        },
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `외교는 늘 열려 있어야 합니다. 적대 관계를 완화하거나 우호 관계를 강화하는 기회를 항상 살피겠습니다.`,
              emotion: "calm",
            },
          ],
        },
      ],
    },
    threadReplies: {
      "관우": {
        "미축": [{
          variations: [
            {
              dialogue: () => `관우 장군의 군사 강화에 맞춰 모병 비용을 조달하겠습니다. 군량도 넉넉히 준비하겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: () => `관우 장군이 병력을 키우는 동안 내정 수입을 늘려 뒷받침하겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        }],
        "방통": [{
          variations: [
            {
              dialogue: () => `관우 장군이 군비를 쌓는 동안, 외교로 적의 도발을 억제하겠습니다. 성장기에 전쟁은 피해야 합니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: () => `군사력 성장 기간에 평화를 유지하는 것이 핵심입니다. 외교에 힘쓰겠습니다.`,
              emotion: "calm",
            },
          ],
        }],
      },
      "미축": {
        "관우": [{
          variations: [
            {
              dialogue: () => `미축이 내정을 키워주면 병력 확충이 빨라지겠소. 군사비 지원을 부탁드리오.`,
              emotion: "calm",
            },
            {
              dialogue: () => `수입이 늘면 모병도 훈련도 한결 수월해지오. 미축의 노력에 기대하겠소.`,
              emotion: "thoughtful",
            },
          ],
        }],
        "방통": [{
          variations: [
            {
              dialogue: () => `미축이 내정을 다지는 동안 외교로 안전한 환경을 만들어두겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: () => `경제 성장기에 적의 공격을 받으면 곤란합니다. 외교적 완충 지대를 마련하겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        }],
      },
      "방통": {
        "관우": [{
          variations: [
            {
              dialogue: () => `방통이 외교를 맡아주니, 군사 훈련에 집중할 수 있겠소. 고맙소.`,
              emotion: "calm",
            },
            {
              dialogue: () => `외교가 안정되면 전쟁 걱정 없이 병력을 키울 수 있소. 방통의 수완을 믿겠소.`,
              emotion: "calm",
            },
          ],
        }],
        "미축": [{
          variations: [
            {
              dialogue: () => `방통 선생이 외교를 맡아주시니 안심됩니다. 내정 투자에 집중하겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: () => `평화로운 동안 시설 투자를 최대화하겠습니다. 이 시기를 놓치면 안 됩니다.`,
              emotion: "thoughtful",
            },
          ],
        }],
      },
    },
  },

  // ══════════════════════════════════════════════════════════
  // diplomatic_crisis — 외교 위기 (양측 모두 적대)
  // ══════════════════════════════════════════════════════════
  {
    directive: "diplomatic_crisis",
    strategicDeclaration: [
      {
        subCondition: () => true,
        variations: [
          {
            dialogue: (s) => `주공, 현재 조조와 손권 모두 우리에게 적대적입니다. 양면 전쟁은 자멸의 길입니다. 외교적 돌파구를 마련하는 것이 이번 회의의 핵심 안건입니다.`,
            emotion: "worried",
          },
          {
            dialogue: (s) => `사방이 적입니다. 지금 당장 한 세력과 관계를 개선하지 않으면 협공을 당할 수 있습니다. 외교력을 총동원해야 합니다.`,
            emotion: "thoughtful",
          },
          {
            dialogue: (s) => `두 적이 동시에 압박해 온다면 버텨내기 어렵습니다. 이 상황을 타개할 외교 방책을 논의합시다.`,
            emotion: "worried",
          },
        ],
      },
    ],
    domainResponses: {
      "관우": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `양쪽을 동시에 상대하는 것은 불리합니다. 외교가 성사될 때까지 군사적으로는 방어에 집중하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `한 방향이라도 안전해지면 나머지에 전력을 다할 수 있습니다. 외교가 먼저입니다.`,
              emotion: "calm",
            },
          ],
        },
      ],
      "미축": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `외교 활동에는 자원이 필요합니다. 내정 안정화로 외교력 확보를 뒷받침하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `선물 외교나 사신 파견에 드는 비용을 미리 준비해 두겠습니다.`,
              emotion: "calm",
            },
          ],
        },
      ],
      "방통": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => {
                const cao = s.diplomacy.relations.find(r => r.targetId === "cao_cao");
                const sun = s.diplomacy.relations.find(r => r.targetId === "sun_quan");
                return (cao?.score ?? -999) > (sun?.score ?? -999)
                  ? `손권보다 조조와의 관계가 덜 나쁩니다. 조조에게 먼저 접근해 상황을 타개해야 합니다.`
                  : `조조보다 손권과의 관계가 덜 나쁩니다. 손권에게 먼저 화친을 제안해 보는 것이 현명합니다.`;
              },
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `두 적 사이에 쐐기를 박는 이간계도 검토해 볼 만합니다. 이 방통이 계략을 꾸미겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // diplomatic_maneuver — 외교 공작 (적끼리 우호)
  // ══════════════════════════════════════════════════════════
  {
    directive: "diplomatic_maneuver",
    strategicDeclaration: [
      {
        subCondition: () => true,
        variations: [
          {
            dialogue: (s) => `주공, 조조와 손권이 서로 우호 관계에 있습니다. 이들이 동맹을 맺으면 우리는 협공을 당할 수 있습니다. 이간계를 써서 두 적의 관계를 갈라놓아야 합니다.`,
            emotion: "thoughtful",
          },
          {
            dialogue: (s) => `적들이 손을 잡고 있는 것은 우리에게 큰 위협입니다. 지금 이 관계를 끊어놓지 않으면 더 큰 위기가 옵니다.`,
            emotion: "worried",
          },
        ],
      },
    ],
    domainResponses: {
      "관우": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `적들이 뭉치면 우리는 힘들어집니다. 방통의 이간계가 먹히는 동안 방어를 강화하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `두 적이 함께 공격하면 막아내기 어렵습니다. 무슨 수를 써서라도 이들의 연대를 끊어야 합니다.`,
              emotion: "worried",
            },
          ],
        },
      ],
      "미축": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `이간계에 필요한 자원을 지원하겠습니다. 사신 파견 비용이나 선물도 준비할 수 있습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `외교 작전에는 물질적 지원이 필요합니다. 내정에서 자원을 조달하겠습니다.`,
              emotion: "calm",
            },
          ],
        },
      ],
      "방통": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `이 방통이 마침 좋은 계책을 생각해 두었습니다. 한쪽에는 밀서를, 다른 쪽에는 의심을 심어주면 됩니다. 이간계를 실행하겠습니다.`,
              emotion: "excited",
            },
            {
              dialogue: (s) => `두 적의 이해관계 차이를 부각시키는 것이 핵심입니다. 상인을 통한 정보 공작으로 불신을 조장하겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // steady_advance — 점진적 전진 (기본값)
  // ══════════════════════════════════════════════════════════
  {
    directive: "steady_advance",
    strategicDeclaration: [
      {
        subCondition: () => true,
        variations: [
          {
            dialogue: (s) => `주공, 이번 턴도 내실을 다지며 나아가야 합니다. 급하게 서두르지 말고 각 분야를 고르게 발전시키는 것이 장기 대계입니다.`,
            emotion: "calm",
          },
          {
            dialogue: (s) => `주공, 현재 상황을 안정적으로 유지하면서 점진적으로 힘을 키워야 합니다. 각 참모의 보고를 들어보시옵소서.`,
            emotion: "calm",
          },
          {
            dialogue: (s) => `천하를 얻는 것은 하루아침의 일이 아닙니다. 오늘도 한 걸음씩 나아가겠습니다. 각자의 의견을 들어봅시다.`,
            emotion: "calm",
          },
        ],
      },
    ],
    domainResponses: {
      "관우": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `군사 측면에서 보면 꾸준한 병력 유지와 훈련이 중요합니다. 이 관우는 군사력 강화에 힘쓰겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: (s) => `방어는 철저히, 기회가 오면 과감하게 — 이것이 관우의 병법입니다. 언제든 준비되어 있겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: (s) => `적들이 아직 공세를 취하지 않는 지금이 군비를 쌓을 기회입니다. 병력과 훈련을 꾸준히 강화하겠습니다.`,
              emotion: "calm",
            },
          ],
        },
      ],
      "미축": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `내정은 꾸준함이 핵심입니다. 시설을 지속적으로 업그레이드하여 수입 기반을 탄탄히 하겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: (s) => `한 턴 한 턴 내정을 다지다 보면 어느새 풍족해집니다. 미축이 살림을 알뜰히 챙기겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: (s) => `지금 심는 씨앗이 나중에 열매가 됩니다. 내정 투자를 게을리하지 않겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        },
      ],
      "방통": [
        {
          subCondition: () => true,
          variations: [
            {
              dialogue: (s) => `외교는 늘 열려 있어야 합니다. 적대 관계를 완화하거나 우호 관계를 강화하는 기회를 항상 살피겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: (s) => `천하 삼분의 균형을 잘 읽어야 합니다. 이 방통이 외교 정세를 면밀히 분석하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: (s) => `외교력이 있다면 허비하지 말고 관계 개선에 씁시다. 미리 쌓아둔 신뢰가 위기 때 빛을 발합니다.`,
              emotion: "calm",
            },
          ],
        },
      ],
    },
    threadReplies: {
      "관우": {
        "미축": [{
          variations: [
            {
              dialogue: () => `관우 장군의 군비 강화에 맞춰 내정 지원을 꾸준히 이어가겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: () => `관우 장군이 군사를 다지는 동안 시설 투자로 수입을 늘리겠습니다. 튼튼한 내정이 강한 군대의 기반입니다.`,
              emotion: "calm",
            },
            {
              dialogue: () => `관우 장군의 계획대로 군비를 쌓으면서, 동시에 내정 수입도 점진적으로 늘려가겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        }],
        "방통": [{
          variations: [
            {
              dialogue: () => `관우 장군이 군사를 키우는 동안, 외교로 평화를 유지하겠습니다. 불필요한 전쟁은 피해야 합니다.`,
              emotion: "calm",
            },
            {
              dialogue: () => `점진적 성장기에는 외교적 안정이 핵심입니다. 적과의 관계를 잘 관리하겠습니다.`,
              emotion: "thoughtful",
            },
            {
              dialogue: () => `관우 장군이 방어를 굳히는 동안, 저는 외교 채널을 통해 정보를 수집하겠습니다.`,
              emotion: "calm",
            },
          ],
        }],
      },
      "미축": {
        "관우": [{
          variations: [
            {
              dialogue: () => `미축의 내정이 순조롭다 하니 군사도 안심이오. 수입이 늘면 모병에 투자해주시오.`,
              emotion: "calm",
            },
            {
              dialogue: () => `내정이 튼튼하면 군대도 강해지오. 미축의 노고에 감사하오.`,
              emotion: "calm",
            },
            {
              dialogue: () => `좋소. 미축이 살림을 챙기는 동안 군사 훈련에 더 힘쓰겠소.`,
              emotion: "calm",
            },
          ],
        }],
        "방통": [{
          variations: [
            {
              dialogue: () => `미축이 경제를 키우는 동안 외교적 리스크를 줄여두겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: () => `내정이 안정되면 외교에서도 목소리를 낼 수 있습니다. 좋은 방향입니다.`,
              emotion: "calm",
            },
            {
              dialogue: () => `미축의 경제 성장에 발맞춰 외교 관계도 차근차근 개선하겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        }],
      },
      "방통": {
        "관우": [{
          variations: [
            {
              dialogue: () => `방통이 외교를 맡아주니, 이 관우는 전쟁 준비에만 집중하겠소.`,
              emotion: "calm",
            },
            {
              dialogue: () => `외교가 순조로우면 뒤가 든든하오. 그 사이 병력을 더 키우겠소.`,
              emotion: "calm",
            },
            {
              dialogue: () => `방통의 외교 덕에 안심하고 훈련에 매진할 수 있소. 고맙소.`,
              emotion: "calm",
            },
          ],
        }],
        "미축": [{
          variations: [
            {
              dialogue: () => `방통 선생이 외교를 챙겨주시니, 저는 내정에만 전념하겠습니다.`,
              emotion: "calm",
            },
            {
              dialogue: () => `외교적 안정 속에서 시설 투자를 계속하겠습니다. 차근차근 쌓아가면 됩니다.`,
              emotion: "calm",
            },
            {
              dialogue: () => `방통 선생의 외교 수완을 믿고 내정 기반 확충에 집중하겠습니다.`,
              emotion: "thoughtful",
            },
          ],
        }],
      },
    },
  },
];

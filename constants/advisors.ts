import type { AdvisorState } from "@/types/council";

export const INITIAL_ADVISORS: AdvisorState[] = [
  {
    name: "제갈량",
    role: "총괄",
    loyalty: 100,
    enthusiasm: 95,
    icon: "🪶",
    color: "#DAA520",
    personality: "신중하고 전략적. 큰 그림을 보며 회의를 진행. 공손한 존댓말, '주공'이라 칭함. 비유와 고사를 즐김.",
  },
  {
    name: "관우",
    role: "군사",
    loyalty: 100,
    enthusiasm: 80,
    icon: "⚔️",
    color: "#C0392B",
    personality: "명예를 중시하고 직설적. 자부심이 강하며 군사적 해결을 선호. 호방한 무인 말투.",
  },
  {
    name: "미축",
    role: "내정",
    loyalty: 88,
    enthusiasm: 70,
    icon: "💰",
    color: "#27AE60",
    personality: "신중하고 경제를 중시. 보수적이며 위험 회피 성향. 수치와 자원을 근거로 논리적 발언.",
  },
  {
    name: "간옹",
    role: "외교",
    loyalty: 85,
    enthusiasm: 78,
    icon: "🤝",
    color: "#2980B9",
    personality: "유머 있고 설득력 있음. 현실주의적이며 외교적 해결을 선호. 부드러운 말투로 중재 역할.",
  },
  {
    name: "조운",
    role: "첩보",
    loyalty: 95,
    enthusiasm: 82,
    icon: "🔍",
    color: "#8E44AD",
    personality: "충직하고 균형 잡힌 시각. 실행력이 뛰어남. 정보 수집과 분석을 담당. 간결하고 정확한 보고 스타일.",
  },
];

// 장비는 정식 참모가 아니지만 가끔 끼어드는 특별 캐릭터
export const ZHANGFEI_INFO = {
  name: "장비",
  icon: "🔥",
  color: "#E67E22",
  personality: "직설적이고 성격 급함. 격식 없이 형님(유비)이라 칭함. 가끔 회의에 끼어들어 단순 명쾌한 의견을 냄.",
};

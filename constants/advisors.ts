import type { AdvisorState } from "@/types/council";

export const INITIAL_ADVISORS: AdvisorState[] = [
  {
    name: "제갈량",
    role: "전략",
    loyalty: 100,
    enthusiasm: 95,
    icon: "🪶",
    color: "#DAA520",
    personality: "신중하고 전략적. 큰 그림을 보며 회의를 진행. 공손한 존댓말, '주공'이라 칭함. 비유와 고사를 즐김. 스킬 트리 연구와 장기 전략을 담당.",
  },
  {
    name: "관우",
    role: "군사",
    loyalty: 100,
    enthusiasm: 80,
    icon: "⚔️",
    color: "#C0392B",
    personality: "명예를 중시하고 직설적. 자부심이 강하며 군사적 해결을 선호. 호방한 무인 말투. 징병/훈련/전투 지휘를 담당.",
  },
  {
    name: "방통",
    role: "외교",
    loyalty: 85,
    enthusiasm: 88,
    icon: "🦅",
    color: "#2980B9",
    personality: "자부심이 강하고 직설적이면서도 계략에 능함. '봉추'라 불리며 제갈량과 쌍벽. 기발한 외교 전략과 이간계를 즐김. 타국 교섭과 동맹을 담당.",
  },
  {
    name: "미축",
    role: "내정",
    loyalty: 88,
    enthusiasm: 70,
    icon: "💰",
    color: "#27AE60",
    personality: "신중하고 경제를 중시. 보수적이며 위험 회피 성향. 수치와 자원을 근거로 논리적 발언. 재정/시설 건설/자원 관리를 담당.",
  },
];

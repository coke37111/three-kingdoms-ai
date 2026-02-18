/**
 * 디자인 원칙 3: dialogue와 statusReport/planReport 일치
 *
 * - dialogue에서 효과를 언급하면 → statusReport/planReport의 point_changes/expected_points에 반드시 존재
 * - point_changes가 없으면 → dialogue에서 변화가 있는 것처럼 표현 금지
 */

import type { Violation, ParsedCase } from "../types.js";

const CHANGE_INDICATORS = [
  "증가",
  "감소",
  "상승",
  "하락",
  "확보",
  "소비",
  "획득",
  "투입",
  "강화",
  "약화",
  "개선",
  "악화",
  "모병",
  "징병",
  "훈련",
  "업그레이드",
];

/**
 * 대사에 변화 언급이 있는지 검사
 */
function mentionsChange(dialogue: string): boolean {
  return CHANGE_INDICATORS.some((indicator) => dialogue.includes(indicator));
}

/**
 * 원칙 3 검증
 * (정확한 검증은 런타임에 statusReport/planReport 함수를 실행해야 가능)
 * 여기서는 정적 분석으로 기본 검사만 수행
 */
export function validatePrinciple3(parsedCase: ParsedCase): Violation[] {
  const violations: Violation[] = [];

  // Phase 1 케이스: statusReport 필요
  if (!parsedCase.planReport) {
    // Phase 1으로 추정
    const hasStatusReport = parsedCase.statusReport !== undefined;

    for (let i = 0; i < parsedCase.variations.length; i++) {
      const variation = parsedCase.variations[i];
      const dialogue = variation.dialogue;

      if (dialogue === "[함수형 대사]") continue;

      // 변화 언급이 있는데 statusReport가 없으면 경고
      if (mentionsChange(dialogue) && !hasStatusReport) {
        violations.push({
          principle: 3,
          description:
            "대사에서 변화를 언급했지만 statusReport가 없음 - point_changes 누락 가능성",
          location: `variation ${i + 1}`,
          severity: "warning",
        });
      }
    }
  }

  // Phase 3 케이스: planReport 필요
  if (parsedCase.planReport) {
    const hasPlanReport = parsedCase.planReport !== undefined;

    for (let i = 0; i < parsedCase.variations.length; i++) {
      const variation = parsedCase.variations[i];
      const dialogue = variation.dialogue;

      if (dialogue === "[함수형 대사]") continue;

      // 계획 언급이 있는데 planReport가 없으면 에러
      if (mentionsChange(dialogue) && !hasPlanReport) {
        violations.push({
          principle: 3,
          description:
            "대사에서 계획을 언급했지만 planReport가 없음 - expected_points 누락",
          location: `variation ${i + 1}`,
          severity: "error",
        });
      }
    }
  }

  return violations;
}

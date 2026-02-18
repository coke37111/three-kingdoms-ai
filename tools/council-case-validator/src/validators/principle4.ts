/**
 * 디자인 원칙 4: 플레이어 선택권
 *
 * - 모병/징병 직접 지시 시 → 최대치를 안내하고 얼마나 할지 질문 형태
 * - 참모가 일방적으로 수량을 결정하지 않음
 */

import type { Violation, ParsedCase } from "../types.js";

const RECRUITMENT_KEYWORDS = ["모병", "징병"];

/**
 * 질문 형태인지 확인
 */
function isQuestion(text: string): boolean {
  return /[?？]|\?|얼마|어떻게|할까|하시겠습|하시오/.test(text);
}

/**
 * 최대치 안내가 있는지 확인
 */
function hasMaxInfo(text: string): boolean {
  return /최대|가능/.test(text);
}

/**
 * 원칙 4 검증
 */
export function validatePrinciple4(parsedCase: ParsedCase): Violation[] {
  const violations: Violation[] = [];

  // Phase 3 케이스만 검사 (계획 단계)
  if (!parsedCase.planReport) return violations;

  // planReport가 모병/징병을 포함하는지 확인 (간단히 id로 판단)
  const isRecruitmentCase = RECRUITMENT_KEYWORDS.some((keyword) =>
    parsedCase.id.toLowerCase().includes("recruit")
  );

  if (!isRecruitmentCase) return violations;

  // 각 variation 검사
  for (let i = 0; i < parsedCase.variations.length; i++) {
    const variation = parsedCase.variations[i];
    const dialogue = variation.dialogue;

    if (dialogue === "[함수형 대사]") continue;

    // 모병/징병 언급이 있는지
    const mentionsRecruitment = RECRUITMENT_KEYWORDS.some((keyword) =>
      dialogue.includes(keyword)
    );

    if (mentionsRecruitment) {
      // 질문 형태인지 확인
      if (!isQuestion(dialogue)) {
        violations.push({
          principle: 4,
          description:
            '모병/징병 시 플레이어에게 질문해야 함 (예: "얼마나 모병할까요?")',
          location: `variation ${i + 1}`,
          severity: "warning",
        });
      }

      // 최대치 안내가 있는지 확인
      if (!hasMaxInfo(dialogue)) {
        violations.push({
          principle: 4,
          description: '모병 시 최대치 안내 필요 (예: "최대 X명 가능합니다")',
          location: `variation ${i + 1}`,
          severity: "warning",
        });
      }
    }
  }

  return violations;
}

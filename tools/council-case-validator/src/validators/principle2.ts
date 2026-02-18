/**
 * 디자인 원칙 2: 용어 정확성
 *
 * - AP/SP/MP/IP/DP 약어 금지 → 한글 전체 이름 사용
 * - "병력" 단독 사용 금지 → "군사포인트(병력)" 사용
 */

import type { Violation, ParsedCase } from "../types.js";

const FORBIDDEN_ABBREVS = [
  { pattern: /\bAP\b/, correct: "행동포인트" },
  { pattern: /\bSP\b/, correct: "전략포인트" },
  { pattern: /\bMP\b/, correct: "군사포인트" },
  { pattern: /\bIP\b/, correct: "내정포인트" },
  { pattern: /\bDP\b/, correct: "외교포인트" },
];

/**
 * "병력" 단독 사용 검출
 * "군사포인트(병력)" 또는 "병력 × 훈련도 × 사기" 같은 형태는 허용
 */
function hasStandaloneTroops(text: string): boolean {
  // "군사포인트(병력)" 패턴 제거
  const withoutValid = text.replace(/군사포인트\(병력\)/g, "");
  // 병력 × 훈련도 × 사기 패턴 제거
  const withoutFormula = withoutValid.replace(/병력\s*[×x]\s*훈련도\s*[×x]\s*사기/g, "");

  // 이제 남은 "병력" 검사
  return /병력/.test(withoutFormula);
}

/**
 * 원칙 2 검증
 */
export function validatePrinciple2(parsedCase: ParsedCase): Violation[] {
  const violations: Violation[] = [];

  // 모든 variation dialogue 검사
  for (let i = 0; i < parsedCase.variations.length; i++) {
    const variation = parsedCase.variations[i];
    const dialogue = variation.dialogue;

    if (dialogue === "[함수형 대사]") continue;

    // 약어 검사
    for (const { pattern, correct } of FORBIDDEN_ABBREVS) {
      if (pattern.test(dialogue)) {
        violations.push({
          principle: 2,
          description: `약어 사용 금지: "${pattern.source}" → "${correct}"로 변경 필요`,
          location: `variation ${i + 1}`,
          severity: "error",
        });
      }
    }

    // "병력" 단독 사용 검사
    if (hasStandaloneTroops(dialogue)) {
      violations.push({
        principle: 2,
        description: '"병력" 단독 사용 금지 → "군사포인트(병력)"로 변경 필요',
        location: `variation ${i + 1}`,
        severity: "error",
      });
    }
  }

  return violations;
}

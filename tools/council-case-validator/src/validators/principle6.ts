/**
 * 디자인 원칙 6: 증가치 표시
 *
 * - UI에서 포인트 증가 시 (+X) 형태로 표시
 * - 대사에서도 증가량을 명시
 */

import type { Violation, ParsedCase } from "../types.js";

/**
 * 증가치 표시 패턴
 * 예: "+3", "매턴 +5", "수입 +2"
 */
function hasIncrementDisplay(text: string): boolean {
  return /[+＋]\d+|매턴.*\d+/.test(text);
}

/**
 * 수입/증가 언급이 있는지
 */
function mentionsIncrease(text: string): boolean {
  return /수입|증가|상승|확보/.test(text);
}

/**
 * 원칙 6 검증
 */
export function validatePrinciple6(parsedCase: ParsedCase): Violation[] {
  const violations: Violation[] = [];

  // Phase 3 케이스에서 시설 업그레이드 관련만 검사
  if (!parsedCase.planReport) return violations;

  const isFacilityCase = /market|farm|bank|시장|농장|은행/.test(
    parsedCase.id.toLowerCase()
  );

  if (!isFacilityCase) return violations;

  // 각 variation 검사
  for (let i = 0; i < parsedCase.variations.length; i++) {
    const variation = parsedCase.variations[i];
    const dialogue = variation.dialogue;

    if (dialogue === "[함수형 대사]") continue;

    // 수입 증가를 언급하는데 증가치 표시가 없으면 경고
    if (mentionsIncrease(dialogue) && !hasIncrementDisplay(dialogue)) {
      violations.push({
        principle: 6,
        description: '증가량 명시 필요 (예: "매턴 +3", "수입 +5")',
        location: `variation ${i + 1}`,
        severity: "warning",
      });
    }
  }

  return violations;
}

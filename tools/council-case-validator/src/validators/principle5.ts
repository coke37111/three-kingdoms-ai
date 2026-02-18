/**
 * 디자인 원칙 5: 비용 동적 계산
 *
 * - 시설 업그레이드 비용은 getFacilityUpgradeCost() 사용
 * - 고정 비용 하드코딩 금지
 */

import type { Violation, ParsedCase } from "../types.js";

const FACILITY_KEYWORDS = ["시장", "농장", "은행", "업그레이드", "확장"];

/**
 * 하드코딩된 비용 패턴 검출
 * 예: "30 소비", "비용 40" 등
 */
function hasHardcodedCost(text: string): RegExpMatchArray | null {
  // "내정포인트 -30" 같은 패턴은 허용 (동적 계산 결과일 수 있음)
  // "비용 30", "30 소비" 같은 고정 표현만 검출
  return text.match(/비용\s*\d+|업그레이드.*\d+\s*소비/);
}

/**
 * 원칙 5 검증
 */
export function validatePrinciple5(parsedCase: ParsedCase): Violation[] {
  const violations: Violation[] = [];

  // 시설 업그레이드 관련 케이스만 검사
  const isFacilityCase = FACILITY_KEYWORDS.some(
    (keyword) =>
      parsedCase.id.toLowerCase().includes(keyword.toLowerCase()) ||
      parsedCase.conditionSource?.includes(keyword)
  );

  if (!isFacilityCase) return violations;

  // 각 variation 검사
  for (let i = 0; i < parsedCase.variations.length; i++) {
    const variation = parsedCase.variations[i];
    const dialogue = variation.dialogue;

    if (dialogue === "[함수형 대사]") continue;

    // 하드코딩된 비용 검출
    const hardcodedMatch = hasHardcodedCost(dialogue);
    if (hardcodedMatch) {
      violations.push({
        principle: 5,
        description: `하드코딩된 비용 발견: "${hardcodedMatch[0]}" - getFacilityUpgradeCost() 사용 권장`,
        location: `variation ${i + 1}`,
        severity: "warning",
      });
    }

    // 시설 언급이 있는데 함수형이 아니면 경고
    const mentionsFacility = FACILITY_KEYWORDS.some((keyword) =>
      dialogue.includes(keyword)
    );
    if (mentionsFacility && dialogue !== "[함수형 대사]") {
      // "내정포인트 -" 패턴이 있으면 동적 계산으로 간주
      if (!/내정포인트\s*-?\d+/.test(dialogue)) {
        violations.push({
          principle: 5,
          description:
            "시설 업그레이드 대사는 함수형으로 작성하여 비용을 동적 계산해야 함",
          location: `variation ${i + 1}`,
          severity: "warning",
        });
      }
    }
  }

  return violations;
}

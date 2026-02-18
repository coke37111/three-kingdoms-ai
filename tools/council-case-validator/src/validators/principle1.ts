/**
 * 디자인 원칙 1: 수치 포함 여부
 *
 * 모든 보고에는 구체적 수치가 포함되어야 한다.
 * "증가", "감소" 같은 모호한 표현 금지.
 */

import type { Violation, ParsedCase } from "../types.js";

const VAGUE_TERMS = [
  /증가(?!치)/,
  /감소(?!치)/,
  /상승(?!.*\d)/,
  /하락(?!.*\d)/,
  /늘어(?!.*\d)/,
  /줄어(?!.*\d)/,
  /많이/,
  /조금/,
  /약간/,
  /크게/,
  /작게/,
];

/**
 * 대사에 수치가 있는지 확인
 */
function hasNumbers(text: string): boolean {
  return /\d+/.test(text);
}

/**
 * 모호한 표현 검출
 */
function hasVagueTerms(text: string): RegExpMatchArray | null {
  for (const pattern of VAGUE_TERMS) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

/**
 * 원칙 1 검증
 */
export function validatePrinciple1(parsedCase: ParsedCase): Violation[] {
  const violations: Violation[] = [];

  // 모든 variation dialogue 검사
  for (let i = 0; i < parsedCase.variations.length; i++) {
    const variation = parsedCase.variations[i];
    const dialogue = variation.dialogue;

    // 함수형 대사는 스킵 (런타임에만 확인 가능)
    if (dialogue === "[함수형 대사]") continue;

    // 모호한 표현 검사
    const vagueMatch = hasVagueTerms(dialogue);
    if (vagueMatch) {
      violations.push({
        principle: 1,
        description: `모호한 표현 발견: "${vagueMatch[0]}" - 구체적 수치로 대체 필요`,
        location: `variation ${i + 1}`,
        severity: "error",
      });
    }

    // 수치 누락 검사 (특정 키워드가 있는데 수치가 없으면)
    const needsNumbers =
      /포인트|병력|훈련|사기|시설|업그레이드|모병|징병/.test(dialogue);
    if (needsNumbers && !hasNumbers(dialogue)) {
      violations.push({
        principle: 1,
        description: "구체적 수치 누락 - 포인트/병력/시설 언급 시 수치 필수",
        location: `variation ${i + 1}`,
        severity: "warning",
      });
    }
  }

  return violations;
}

/**
 * 통합 검증기
 */

import type { ValidationResult, ParsedCase, FileValidationResult, ViolationInfo } from "../types.js";
import { validatePrinciple1 } from "./principle1.js";
import { validatePrinciple2 } from "./principle2.js";
import { validatePrinciple3 } from "./principle3.js";
import { validatePrinciple4 } from "./principle4.js";
import { validatePrinciple5 } from "./principle5.js";
import { validatePrinciple6 } from "./principle6.js";

/**
 * 단일 케이스 검증
 */
export function validateCase(parsedCase: ParsedCase): ValidationResult {
  const violations = [
    ...validatePrinciple1(parsedCase),
    ...validatePrinciple2(parsedCase),
    ...validatePrinciple3(parsedCase),
    ...validatePrinciple4(parsedCase),
    ...validatePrinciple5(parsedCase),
    ...validatePrinciple6(parsedCase),
  ];

  return {
    pass: violations.length === 0,
    violations,
    caseId: parsedCase.id,
    advisor: parsedCase.advisor,
    priority: parsedCase.priority,
  };
}

/**
 * 파일 전체 검증
 */
export function validateFile(cases: ParsedCase[], fileName: string): FileValidationResult {
  const results = cases.map((c) => validateCase(c));

  const violationsByPrinciple: Record<number, ViolationInfo[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };

  const statsByAdvisor: Record<string, any> = {};

  let passedCount = 0;
  let failedCount = 0;

  for (const result of results) {
    if (result.pass) {
      passedCount++;
    } else {
      failedCount++;
    }

    // 원칙별 위반 수집
    for (const violation of result.violations) {
      violationsByPrinciple[violation.principle].push({
        caseId: result.caseId,
        line: cases.find((c) => c.id === result.caseId)?.line,
        description: violation.description,
      });
    }

    // 참모별 통계 수집
    if (!statsByAdvisor[result.advisor]) {
      statsByAdvisor[result.advisor] = {
        totalCases: 0,
        passedCases: 0,
        failedCases: 0,
        priorities: [],
      };
    }
    statsByAdvisor[result.advisor].totalCases++;
    if (result.pass) {
      statsByAdvisor[result.advisor].passedCases++;
    } else {
      statsByAdvisor[result.advisor].failedCases++;
    }
    statsByAdvisor[result.advisor].priorities.push(result.priority);
  }

  // 평균 priority 계산
  for (const advisor in statsByAdvisor) {
    const priorities = statsByAdvisor[advisor].priorities;
    const avg = priorities.reduce((sum: number, p: number) => sum + p, 0) / priorities.length;
    statsByAdvisor[advisor].averagePriority = Math.round(avg);
    delete statsByAdvisor[advisor].priorities;
  }

  return {
    file: fileName,
    totalCases: cases.length,
    passedCases: passedCount,
    failedCases: failedCount,
    violationsByPrinciple,
    statsByAdvisor,
  };
}

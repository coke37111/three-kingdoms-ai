/**
 * 상세 검증 보고서 생성
 */

import { parseCaseFile, resolveCaseFilePath } from "./utils/parser.js";
import { validateCase, validateFile } from "./validators/index.js";
import { DESIGN_PRINCIPLES } from "./types.js";

console.log("=".repeat(80));
console.log("Council Case Validator - 상세 검증 보고서");
console.log("=".repeat(80));

// Phase 1 검증
console.log("\n" + "=".repeat(80));
console.log("Phase 1 (상태 보고) 케이스 검증");
console.log("=".repeat(80));

const phase1Path = resolveCaseFilePath("phase1");
const phase1Cases = parseCaseFile(phase1Path);
const phase1Result = validateFile(phase1Cases, "phase1");

console.log(`\n파일: ${phase1Result.file}`);
console.log(`총 케이스: ${phase1Result.totalCases}`);
console.log(`통과: ${phase1Result.passedCases} (${Math.round((phase1Result.passedCases / phase1Result.totalCases) * 100)}%)`);
console.log(`실패: ${phase1Result.failedCases} (${Math.round((phase1Result.failedCases / phase1Result.totalCases) * 100)}%)`);

// 원칙별 위반 상세
console.log("\n" + "-".repeat(80));
console.log("원칙별 위반 상세");
console.log("-".repeat(80));

for (let i = 1; i <= 6; i++) {
  const violations = phase1Result.violationsByPrinciple[i];
  console.log(`\n[원칙 ${i}] ${DESIGN_PRINCIPLES[i as keyof typeof DESIGN_PRINCIPLES]}`);
  console.log(`위반 케이스: ${violations.length}개`);

  if (violations.length > 0) {
    // 상위 5개만 표시
    for (const v of violations.slice(0, 5)) {
      console.log(`  - ${v.caseId} (라인 ${v.line})`);
      console.log(`    ${v.description}`);
    }
    if (violations.length > 5) {
      console.log(`  ... 외 ${violations.length - 5}개`);
    }
  }
}

// 참모별 통계
console.log("\n" + "-".repeat(80));
console.log("참모별 통계");
console.log("-".repeat(80));

for (const [advisor, stats] of Object.entries(phase1Result.statsByAdvisor)) {
  const passRate = Math.round((stats.passedCases / stats.totalCases) * 100);
  console.log(
    `\n${advisor}: ${stats.totalCases}개 케이스 (통과율 ${passRate}%)`
  );
  console.log(`  통과: ${stats.passedCases}개`);
  console.log(`  실패: ${stats.failedCases}개`);
  console.log(`  평균 priority: ${stats.averagePriority}`);
}

// Phase 3 검증
console.log("\n" + "=".repeat(80));
console.log("Phase 3 (계획 보고) 케이스 검증");
console.log("=".repeat(80));

const phase3Path = resolveCaseFilePath("phase3");
const phase3Cases = parseCaseFile(phase3Path);
const phase3Result = validateFile(phase3Cases, "phase3");

console.log(`\n파일: ${phase3Result.file}`);
console.log(`총 케이스: ${phase3Result.totalCases}`);
console.log(`통과: ${phase3Result.passedCases} (${Math.round((phase3Result.passedCases / phase3Result.totalCases) * 100)}%)`);
console.log(`실패: ${phase3Result.failedCases} (${Math.round((phase3Result.failedCases / phase3Result.totalCases) * 100)}%)`);

// 원칙별 위반 상세
console.log("\n" + "-".repeat(80));
console.log("원칙별 위반 상세");
console.log("-".repeat(80));

for (let i = 1; i <= 6; i++) {
  const violations = phase3Result.violationsByPrinciple[i];
  console.log(`\n[원칙 ${i}] ${DESIGN_PRINCIPLES[i as keyof typeof DESIGN_PRINCIPLES]}`);
  console.log(`위반 케이스: ${violations.length}개`);

  if (violations.length > 0) {
    for (const v of violations.slice(0, 5)) {
      console.log(`  - ${v.caseId} (라인 ${v.line})`);
      console.log(`    ${v.description}`);
    }
    if (violations.length > 5) {
      console.log(`  ... 외 ${violations.length - 5}개`);
    }
  }
}

// 참모별 통계
console.log("\n" + "-".repeat(80));
console.log("참모별 통계");
console.log("-".repeat(80));

for (const [advisor, stats] of Object.entries(phase3Result.statsByAdvisor)) {
  const passRate = Math.round((stats.passedCases / stats.totalCases) * 100);
  console.log(
    `\n${advisor}: ${stats.totalCases}개 케이스 (통과율 ${passRate}%)`
  );
  console.log(`  통과: ${stats.passedCases}개`);
  console.log(`  실패: ${stats.failedCases}개`);
  console.log(`  평균 priority: ${stats.averagePriority}`);
}

// 종합 요약
console.log("\n" + "=".repeat(80));
console.log("종합 요약");
console.log("=".repeat(80));

const totalCases = phase1Result.totalCases + phase3Result.totalCases;
const totalPassed = phase1Result.passedCases + phase3Result.passedCases;
const totalFailed = phase1Result.failedCases + phase3Result.failedCases;
const totalPassRate = Math.round((totalPassed / totalCases) * 100);

console.log(`\n전체 케이스: ${totalCases}개`);
console.log(`통과: ${totalPassed}개 (${totalPassRate}%)`);
console.log(`실패: ${totalFailed}개 (${100 - totalPassRate}%)`);

// 가장 많이 위반된 원칙
const totalViolationsByPrinciple: Record<number, number> = {};
for (let i = 1; i <= 6; i++) {
  totalViolationsByPrinciple[i] =
    phase1Result.violationsByPrinciple[i].length +
    phase3Result.violationsByPrinciple[i].length;
}

console.log("\n주요 개선 필요 영역:");
const sortedPrinciples = Object.entries(totalViolationsByPrinciple)
  .sort(([, a], [, b]) => b - a)
  .filter(([, count]) => count > 0);

for (const [principle, count] of sortedPrinciples.slice(0, 3)) {
  console.log(
    `  ${count}개 위반 - [원칙 ${principle}] ${DESIGN_PRINCIPLES[parseInt(principle) as keyof typeof DESIGN_PRINCIPLES]}`
  );
}

console.log("\n" + "=".repeat(80));

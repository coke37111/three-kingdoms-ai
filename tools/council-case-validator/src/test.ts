/**
 * 로컬 테스트 스크립트
 * MCP 서버를 직접 호출하지 않고 함수를 직접 테스트
 */

import { parseCaseFile, resolveCaseFilePath } from "./utils/parser.js";
import { searchCases, suggestPriority } from "./utils/search.js";
import { validateCase, validateFile } from "./validators/index.js";

console.log("=".repeat(60));
console.log("council-case-validator 테스트");
console.log("=".repeat(60));

// Phase 1 파일 파싱
console.log("\n[1] Phase 1 파일 파싱 테스트...");
try {
  const phase1Path = resolveCaseFilePath("phase1");
  console.log(`파일 경로: ${phase1Path}`);
  const phase1Cases = parseCaseFile(phase1Path);
  console.log(`✓ 파싱 완료: ${phase1Cases.length}개 케이스`);

  // 첫 케이스 출력
  if (phase1Cases.length > 0) {
    const first = phase1Cases[0];
    console.log(`\n첫 케이스: ${first.id}`);
    console.log(`  참모: ${first.advisor}`);
    console.log(`  Priority: ${first.priority}`);
    console.log(`  Variations: ${first.variations.length}개`);
    console.log(`  라인: ${first.line}`);
  }
} catch (error) {
  console.error(`✗ 파싱 실패:`, error);
}

// Phase 3 파일 파싱
console.log("\n[2] Phase 3 파일 파싱 테스트...");
try {
  const phase3Path = resolveCaseFilePath("phase3");
  console.log(`파일 경로: ${phase3Path}`);
  const phase3Cases = parseCaseFile(phase3Path);
  console.log(`✓ 파싱 완료: ${phase3Cases.length}개 케이스`);
} catch (error) {
  console.error(`✗ 파싱 실패:`, error);
}

// 단일 케이스 검증
console.log("\n[3] 단일 케이스 검증 테스트...");
try {
  const phase1Path = resolveCaseFilePath("phase1");
  const phase1Cases = parseCaseFile(phase1Path);

  if (phase1Cases.length > 0) {
    const testCase = phase1Cases[0];
    const result = validateCase(testCase);

    console.log(`케이스 ID: ${result.caseId}`);
    console.log(`검증 결과: ${result.pass ? "PASS ✓" : "FAIL ✗"}`);
    console.log(`위반 개수: ${result.violations.length}`);

    if (result.violations.length > 0) {
      console.log("\n위반 항목:");
      for (const v of result.violations) {
        console.log(
          `  - [원칙 ${v.principle}] ${v.severity.toUpperCase()}: ${v.description}`
        );
        if (v.location) console.log(`    위치: ${v.location}`);
      }
    }
  }
} catch (error) {
  console.error(`✗ 검증 실패:`, error);
}

// 파일 전체 검증
console.log("\n[4] 파일 전체 검증 테스트...");
try {
  const phase1Path = resolveCaseFilePath("phase1");
  const phase1Cases = parseCaseFile(phase1Path);
  const fileResult = validateFile(phase1Cases, "phase1");

  console.log(`파일: ${fileResult.file}`);
  console.log(`총 케이스: ${fileResult.totalCases}`);
  console.log(`통과: ${fileResult.passedCases}`);
  console.log(`실패: ${fileResult.failedCases}`);

  console.log("\n원칙별 위반 통계:");
  for (let i = 1; i <= 6; i++) {
    const violations = fileResult.violationsByPrinciple[i];
    console.log(`  원칙 ${i}: ${violations.length}개 위반`);
    if (violations.length > 0 && violations.length <= 3) {
      for (const v of violations) {
        console.log(`    - ${v.caseId} (라인 ${v.line}): ${v.description}`);
      }
    }
  }

  console.log("\n참모별 통계:");
  for (const [advisor, stats] of Object.entries(fileResult.statsByAdvisor)) {
    console.log(
      `  ${advisor}: ${stats.totalCases}개 (통과 ${stats.passedCases}, 실패 ${stats.failedCases}, 평균 priority ${stats.averagePriority})`
    );
  }
} catch (error) {
  console.error(`✗ 파일 검증 실패:`, error);
}

// 케이스 검색
console.log("\n[5] 케이스 검색 테스트...");
try {
  const phase1Path = resolveCaseFilePath("phase1");
  const phase1Cases = parseCaseFile(phase1Path);

  const searchResult = searchCases(phase1Cases, {
    advisor: "관우",
    minPriority: 60,
  });

  console.log(`검색 결과: ${searchResult.length}개`);
  if (searchResult.length > 0) {
    console.log("\n상위 3개:");
    for (const r of searchResult.slice(0, 3)) {
      console.log(`  - ${r.id} (priority ${r.priority})`);
      console.log(`    "${r.dialoguePreview}"`);
    }
  }
} catch (error) {
  console.error(`✗ 검색 실패:`, error);
}

// Priority 추천
console.log("\n[6] Priority 추천 테스트...");
try {
  const phase1Path = resolveCaseFilePath("phase1");
  const phase1Cases = parseCaseFile(phase1Path);

  const suggested = suggestPriority(phase1Cases, "관우", "병력 부족 긴급");
  console.log(`추천 priority: ${suggested}`);
} catch (error) {
  console.error(`✗ 추천 실패:`, error);
}

console.log("\n" + "=".repeat(60));
console.log("테스트 완료");
console.log("=".repeat(60));

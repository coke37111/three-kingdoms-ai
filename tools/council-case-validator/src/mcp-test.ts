/**
 * MCP 서버 기능 테스트 (직접 함수 호출)
 */

import { parseCaseFile, resolveCaseFilePath } from "./utils/parser.js";
import { searchCases, suggestPriority } from "./utils/search.js";
import { validateCase, validateFile } from "./validators/index.js";

console.log("=".repeat(80));
console.log("MCP 도구 기능 테스트");
console.log("=".repeat(80));

// 1. validate_case 테스트
console.log("\n[1] validate_case 도구 테스트");
console.log("-".repeat(80));

const phase1Cases = parseCaseFile(resolveCaseFilePath("phase1"));
const testCaseId = "guan_troops_critical";
const testCase = phase1Cases.find((c) => c.id === testCaseId);

if (testCase) {
  const result = validateCase(testCase);
  console.log(`\n케이스 ID: ${result.caseId}`);
  console.log(`참모: ${result.advisor}`);
  console.log(`Priority: ${result.priority}`);
  console.log(`검증 결과: ${result.pass ? "PASS ✓" : "FAIL ✗"}`);
  console.log(`위반 개수: ${result.violations.length}`);

  if (result.violations.length > 0) {
    console.log("\n위반 항목:");
    for (const v of result.violations) {
      console.log(`  [원칙 ${v.principle}] ${v.severity}: ${v.description}`);
      if (v.location) console.log(`    위치: ${v.location}`);
    }
  }
} else {
  console.log(`케이스 '${testCaseId}'를 찾을 수 없습니다.`);
}

// 2. validate_file 테스트
console.log("\n[2] validate_file 도구 테스트");
console.log("-".repeat(80));

const fileResult = validateFile(phase1Cases, "phase1");
console.log(`\n파일: ${fileResult.file}`);
console.log(`총 케이스: ${fileResult.totalCases}`);
console.log(`통과: ${fileResult.passedCases} (${Math.round((fileResult.passedCases / fileResult.totalCases) * 100)}%)`);
console.log(`실패: ${fileResult.failedCases} (${Math.round((fileResult.failedCases / fileResult.totalCases) * 100)}%)`);

console.log("\n원칙별 위반 통계:");
for (let i = 1; i <= 6; i++) {
  console.log(`  원칙 ${i}: ${fileResult.violationsByPrinciple[i].length}개`);
}

// 3. search_cases 테스트
console.log("\n[3] search_cases 도구 테스트");
console.log("-".repeat(80));

const searchResults = searchCases(phase1Cases, {
  keyword: "병력",
  minPriority: 60,
});

console.log(`\n검색 결과: ${searchResults.length}개 케이스`);
console.log("키워드: 병력, 최소 priority: 60");

for (const r of searchResults.slice(0, 5)) {
  console.log(`\n  ID: ${r.id}`);
  console.log(`  참모: ${r.advisor}`);
  console.log(`  Priority: ${r.priority}`);
  console.log(`  대사: ${r.dialoguePreview}`);
  console.log(`  위치: 라인 ${r.location.line}`);
}

if (searchResults.length > 5) {
  console.log(`\n  ... 외 ${searchResults.length - 5}개`);
}

// 4. suggest_priority 테스트
console.log("\n[4] suggest_priority 도구 테스트");
console.log("-".repeat(80));

const advisor = "관우";
const situation = "병력 부족 긴급 상황";
const suggested = suggestPriority(phase1Cases, advisor, situation);

const advisorCases = phase1Cases.filter((c) => c.advisor === advisor);
const sorted = advisorCases.sort(
  (a, b) => Math.abs(a.priority - suggested) - Math.abs(b.priority - suggested)
);
const similarCases = sorted.slice(0, 3).map((c) => ({
  id: c.id,
  priority: c.priority,
  condition: c.conditionSource || "[조건 파싱 실패]",
}));

console.log(`\n참모: ${advisor}`);
console.log(`상황: ${situation}`);
console.log(`추천 priority: ${suggested}`);
console.log(`\n유사 케이스:`);
for (const c of similarCases) {
  console.log(`  - ${c.id} (priority ${c.priority})`);
}

console.log("\n" + "=".repeat(80));
console.log("테스트 완료");
console.log("=".repeat(80));

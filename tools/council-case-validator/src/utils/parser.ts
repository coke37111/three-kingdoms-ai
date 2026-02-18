/**
 * TypeScript 파일 파싱 유틸리티
 * phase1Cases.ts / phase3Cases.ts 파일에서 케이스 정의를 추출한다.
 */

import * as fs from "fs";
import * as path from "path";
import type { ParsedCase } from "../types.js";

/**
 * TypeScript 케이스 파일을 파싱하여 케이스 배열 추출
 */
export function parseCaseFile(filePath: string): ParsedCase[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const cases: ParsedCase[] = [];

  let currentCase: Partial<ParsedCase> | null = null;
  let braceDepth = 0;
  let inVariations = false;
  let inStatusReport = false;
  let inPlanReport = false;
  let currentVariation: any = null;
  let variationBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 새 케이스 시작 감지 (export const 뒤의 배열 안에서)
    if (trimmed === "{" && !currentCase && i > 0) {
      // 이전 줄에 variations 배열이 시작되지 않았는지 확인
      const prevLine = lines[i - 1]?.trim();
      if (!prevLine?.includes("variations:")) {
        currentCase = { line: i + 1, variations: [] };
        braceDepth = 1;
        continue;
      }
    }

    if (!currentCase) continue;

    // brace depth 추적
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    braceDepth += openBraces - closeBraces;

    // id 추출
    if (trimmed.startsWith("id:")) {
      const match = trimmed.match(/id:\s*["']([^"']+)["']/);
      if (match) currentCase.id = match[1];
    }

    // advisor 추출
    if (trimmed.startsWith("advisor:")) {
      const match = trimmed.match(/advisor:\s*["']([^"']+)["']/);
      if (match) currentCase.advisor = match[1];
    }

    // priority 추출
    if (trimmed.startsWith("priority:")) {
      const match = trimmed.match(/priority:\s*(\d+)/);
      if (match) currentCase.priority = parseInt(match[1], 10);
    }

    // condition 추출 (간단한 문자열 표현)
    if (trimmed.startsWith("condition:")) {
      let conditionStr = trimmed.replace(/^condition:\s*/, "").replace(/,$/, "");
      // 다음 줄까지 읽어서 완전한 조건 수집
      let j = i + 1;
      while (j < lines.length && !lines[j].includes("variations:")) {
        const nextLine = lines[j].trim();
        if (nextLine && !nextLine.startsWith("//")) {
          conditionStr += " " + nextLine;
        }
        j++;
        if (nextLine.includes("},")) break;
      }
      currentCase.conditionSource = conditionStr;
    }

    // variations 시작
    if (trimmed.startsWith("variations:")) {
      inVariations = true;
      variationBraceDepth = 0;
    }

    // variation 항목 파싱 (한 줄에 { dialogue: "...", emotion: "..." } 형태)
    if (inVariations && trimmed.includes("dialogue:") && trimmed.includes("emotion:")) {
      // 한 줄 variation
      const dialogueMatch = trimmed.match(/dialogue:\s*["']([^"']+)["']/);
      const emotionMatch = trimmed.match(/emotion:\s*["']([^"']+)["']/);

      if (dialogueMatch && emotionMatch) {
        currentCase.variations!.push({
          dialogue: dialogueMatch[1],
          emotion: emotionMatch[1],
        });
      } else if (trimmed.includes("(s) =>")) {
        // 함수형 dialogue
        const emotionMatch2 = trimmed.match(/emotion:\s*["']([^"']+)["']/);
        currentCase.variations!.push({
          dialogue: "[함수형 대사]",
          emotion: emotionMatch2 ? emotionMatch2[1] : "calm",
        });
      }
    } else if (inVariations && trimmed === "{") {
      // 여러 줄 variation 시작
      variationBraceDepth++;
      currentVariation = {};
    } else if (inVariations && currentVariation && trimmed.startsWith("dialogue:")) {
      // dialogue 추출
      const dialogueMatch = trimmed.match(/dialogue:\s*["']([^"']+)["']/);
      if (dialogueMatch) {
        currentVariation.dialogue = dialogueMatch[1];
      } else if (trimmed.includes("(s) =>")) {
        currentVariation.dialogue = "[함수형 대사]";
      }
    } else if (inVariations && currentVariation && trimmed.startsWith("emotion:")) {
      // emotion 추출
      const emotionMatch = trimmed.match(/emotion:\s*["']([^"']+)["']/);
      if (emotionMatch) {
        currentVariation.emotion = emotionMatch[1];
      }
    } else if (inVariations && currentVariation && trimmed === "},") {
      // variation 종료
      if (currentVariation.dialogue && currentVariation.emotion) {
        currentCase.variations!.push(currentVariation);
      }
      currentVariation = null;
      variationBraceDepth--;
    }

    // statusReport 감지
    if (trimmed.startsWith("statusReport:")) {
      inStatusReport = true;
      currentCase.statusReport = "[함수형 statusReport]";
    }

    // planReport 감지
    if (trimmed.startsWith("planReport:")) {
      inPlanReport = true;
      currentCase.planReport = "[함수형 planReport]";
    }

    // 케이스 종료
    if (braceDepth === 0 && currentCase.id) {
      if (currentCase.id && currentCase.advisor && currentCase.priority !== undefined) {
        cases.push(currentCase as ParsedCase);
      }
      currentCase = null;
      inVariations = false;
      inStatusReport = false;
      inPlanReport = false;
    }
  }

  return cases;
}

/**
 * 프로젝트 루트 기준으로 케이스 파일 경로 반환
 */
export function resolveCaseFilePath(file: "phase1" | "phase3"): string {
  const fileName = file === "phase1" ? "phase1Cases.ts" : "phase3Cases.ts";

  // MCP 서버가 프로젝트 루트에서 실행되면 process.cwd()가 루트
  // 그렇지 않으면 상위 디렉토리를 탐색
  let projectRoot = process.cwd();

  // tools/council-case-validator에서 실행되면 2단계 상위로
  if (projectRoot.includes("tools/council-case-validator") ||
      projectRoot.includes("tools\\council-case-validator")) {
    projectRoot = path.join(projectRoot, "..", "..");
  }

  return path.join(projectRoot, "lib", "council", fileName);
}

/**
 * 케이스 ID로 특정 케이스 찾기
 */
export function findCaseById(cases: ParsedCase[], id: string): ParsedCase | undefined {
  return cases.find((c) => c.id === id);
}

/**
 * 참모명으로 필터링
 */
export function filterByAdvisor(cases: ParsedCase[], advisor: string): ParsedCase[] {
  return cases.filter((c) => c.advisor === advisor);
}

/**
 * Priority 범위로 필터링
 */
export function filterByPriority(
  cases: ParsedCase[],
  min?: number,
  max?: number
): ParsedCase[] {
  return cases.filter((c) => {
    if (min !== undefined && c.priority < min) return false;
    if (max !== undefined && c.priority > max) return false;
    return true;
  });
}

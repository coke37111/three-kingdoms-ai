#!/usr/bin/env node

/**
 * council-case-validator MCP 서버
 *
 * Three Kingdoms AI 참모 케이스 검증 도구
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { parseCaseFile, resolveCaseFilePath } from "./utils/parser.js";
import { searchCases, suggestPriority } from "./utils/search.js";
import { validateCase, validateFile } from "./validators/index.js";
import type { SearchFilter } from "./types.js";

// MCP 서버 생성
const server = new Server(
  {
    name: "council-case-validator",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 도구 목록 정의
const tools: Tool[] = [
  {
    name: "validate_case",
    description:
      "단일 케이스를 검증합니다. 케이스 JSON 또는 케이스 ID를 입력받아 6가지 디자인 원칙을 검증합니다.",
    inputSchema: {
      type: "object",
      properties: {
        caseId: {
          type: "string",
          description: "검증할 케이스 ID (예: zhuge_first_turn)",
        },
        file: {
          type: "string",
          enum: ["phase1", "phase3"],
          description: "케이스 파일 (phase1 또는 phase3)",
        },
      },
      required: ["caseId", "file"],
    },
  },
  {
    name: "validate_file",
    description:
      "전체 케이스 파일을 검증합니다. 모든 케이스를 검증하고 원칙별 위반 통계를 반환합니다.",
    inputSchema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          enum: ["phase1", "phase3"],
          description: "검증할 파일 (phase1 또는 phase3)",
        },
      },
      required: ["file"],
    },
  },
  {
    name: "search_cases",
    description:
      "케이스를 검색합니다. 키워드, 참모명, priority 범위로 필터링할 수 있습니다.",
    inputSchema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          enum: ["phase1", "phase3"],
          description: "검색할 파일",
        },
        keyword: {
          type: "string",
          description: "검색 키워드 (id, dialogue, condition에서 검색)",
        },
        advisor: {
          type: "string",
          description: "참모명 필터 (예: 제갈량, 관우, 방통, 미축)",
        },
        minPriority: {
          type: "number",
          description: "최소 priority",
        },
        maxPriority: {
          type: "number",
          description: "최대 priority",
        },
      },
      required: ["file"],
    },
  },
  {
    name: "suggest_priority",
    description:
      "새 케이스의 적절한 priority를 제안합니다. 같은 참모의 기존 케이스를 분석하여 추천값을 계산합니다.",
    inputSchema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          enum: ["phase1", "phase3"],
          description: "참조할 파일",
        },
        advisor: {
          type: "string",
          description: "참모명 (예: 제갈량)",
        },
        situation: {
          type: "string",
          description: "상황 설명 (예: 병력 부족, 적 본성 인접)",
        },
      },
      required: ["file", "advisor", "situation"],
    },
  },
];

// 도구 목록 핸들러
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// 도구 호출 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "validate_case": {
        const { caseId, file } = args as { caseId: string; file: "phase1" | "phase3" };
        const filePath = resolveCaseFilePath(file);
        const cases = parseCaseFile(filePath);
        const targetCase = cases.find((c) => c.id === caseId);

        if (!targetCase) {
          return {
            content: [
              {
                type: "text",
                text: `케이스 ID '${caseId}'를 찾을 수 없습니다.`,
              },
            ],
          };
        }

        const result = validateCase(targetCase);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "validate_file": {
        const { file } = args as { file: "phase1" | "phase3" };
        const filePath = resolveCaseFilePath(file);
        const cases = parseCaseFile(filePath);
        const result = validateFile(cases, file);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "search_cases": {
        const { file, keyword, advisor, minPriority, maxPriority } = args as {
          file: "phase1" | "phase3";
          keyword?: string;
          advisor?: string;
          minPriority?: number;
          maxPriority?: number;
        };

        const filePath = resolveCaseFilePath(file);
        const cases = parseCaseFile(filePath);

        const filter: SearchFilter = {
          keyword,
          advisor,
          minPriority,
          maxPriority,
        };

        const results = searchCases(cases, filter);

        // location.file 채우기
        for (const r of results) {
          r.location.file = file;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "suggest_priority": {
        const { file, advisor, situation } = args as {
          file: "phase1" | "phase3";
          advisor: string;
          situation: string;
        };

        const filePath = resolveCaseFilePath(file);
        const cases = parseCaseFile(filePath);

        const suggested = suggestPriority(cases, advisor, situation);

        // 유사 케이스 3개 찾기
        const advisorCases = cases.filter((c) => c.advisor === advisor);
        const sorted = advisorCases.sort(
          (a, b) => Math.abs(a.priority - suggested) - Math.abs(b.priority - suggested)
        );
        const similarCases = sorted.slice(0, 3).map((c) => ({
          id: c.id,
          priority: c.priority,
          condition: c.conditionSource || "[조건 파싱 실패]",
        }));

        const result = {
          advisor,
          situation,
          suggestedPriority: suggested,
          reasoning: `${advisor}의 기존 케이스 ${advisorCases.length}개를 분석하여 추천 priority를 계산했습니다.`,
          similarCases,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `알 수 없는 도구: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `오류 발생: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("council-case-validator MCP 서버가 시작되었습니다.");
}

main().catch((error) => {
  console.error("서버 시작 오류:", error);
  process.exit(1);
});

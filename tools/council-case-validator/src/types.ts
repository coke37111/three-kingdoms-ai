/**
 * council-case-validator MCP 서버 타입 정의
 */

export interface ValidationResult {
  pass: boolean;
  violations: Violation[];
  caseId: string;
  advisor: string;
  priority: number;
}

export interface Violation {
  principle: number;
  description: string;
  location?: string; // 파일 내 위치 (라인 번호 등)
  severity: "error" | "warning";
}

export interface FileValidationResult {
  file: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  violationsByPrinciple: Record<number, ViolationInfo[]>;
  statsByAdvisor: Record<string, AdvisorStats>;
}

export interface ViolationInfo {
  caseId: string;
  line?: number;
  description: string;
}

export interface AdvisorStats {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  averagePriority: number;
}

export interface CaseSearchResult {
  id: string;
  advisor: string;
  priority: number;
  dialoguePreview: string;
  location: {
    file: string;
    line: number;
  };
}

export interface PrioritySuggestion {
  advisor: string;
  situation: string;
  suggestedPriority: number;
  reasoning: string;
  similarCases: Array<{
    id: string;
    priority: number;
    condition: string;
  }>;
}

// 디자인 원칙 정의
export const DESIGN_PRINCIPLES = {
  1: "수치 포함 여부",
  2: "용어 정확성",
  3: "dialogue와 데이터 일치",
  4: "플레이어 선택권",
  5: "비용 동적 계산",
  6: "증가치 표시",
} as const;

// 케이스 파싱된 데이터 구조
export interface ParsedCase {
  id: string;
  advisor: string;
  priority: number;
  conditionSource: string;
  variations: Array<{
    dialogue: string;
    emotion: string;
    passiveDialogue?: string;
  }>;
  statusReport?: string;
  planReport?: string;
  line: number;
}

// 검색 필터
export interface SearchFilter {
  advisor?: string;
  minPriority?: number;
  maxPriority?: number;
  keyword?: string;
}

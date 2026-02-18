#!/usr/bin/env node
/**
 * 케이스 검증 도구
 *
 * 디자인 원칙 위반 여부를 자동 검사합니다.
 *
 * 사용법:
 *   node scripts/validate-case.js "대사 내용"
 *   node scripts/validate-case.js --file lib/council/phase1Cases.ts
 */

const fs = require('fs');
const path = require('path');

// ===================== 디자인 원칙 규칙 =====================

const RULES = [
  {
    id: 'no-abbreviations',
    name: '약어 사용 금지',
    pattern: /\b(AP|SP|MP|IP|DP)\b/g,
    message: '약어(AP/SP/MP/IP/DP)를 사용하지 마세요. 전체 이름을 사용하세요.',
    replacement: {
      'AP': '행동포인트',
      'SP': '전략포인트',
      'MP': '군사포인트',
      'IP': '내정포인트',
      'DP': '외교포인트',
    },
  },
  {
    id: 'specify-point-type',
    name: '포인트 타입 명시',
    pattern: /(수입|소비|충전|회복)\s*[+\-]?\d+(?!.*포인트)/g,
    message: '포인트 변화를 언급할 때는 어떤 포인트인지 명시하세요 (예: "내정포인트 +3")',
    severity: 'warning',
  },
  {
    id: 'troops-with-mp',
    name: '병력 용어 규칙',
    pattern: /(?<!군사포인트\()병력(?!\))/g,
    message: '"병력"만 단독으로 사용하지 마세요. "군사포인트(병력)"을 사용하세요.',
    exceptions: ['부상병', '병력 수', '병력이 강해', '병력의 사기'],
  },
  {
    id: 'training-not-mp',
    name: '훈련 용어 규칙',
    pattern: /훈련.*군사포인트.*증가|군사포인트.*훈련.*증가/gi,
    message: '훈련은 "훈련도"만 올립니다. 군사포인트가 직접 증가하지 않습니다.',
  },
  {
    id: 'prefer-numbers',
    name: '수치 포함 권장',
    pattern: /^(?!.*\d).*(증가|감소|상승|하락|확보|소비|충전).*$/,
    message: '구체적인 수치를 포함하는 것을 권장합니다.',
    severity: 'info',
  },
];

// ===================== 검증 함수 =====================

function validateDialogue(dialogue, lineNumber = null) {
  const violations = [];

  for (const rule of RULES) {
    const matches = dialogue.match(rule.pattern);

    if (matches) {
      // 예외 처리
      if (rule.exceptions) {
        const hasException = rule.exceptions.some(exception =>
          dialogue.includes(exception)
        );
        if (hasException) continue;
      }

      const violation = {
        rule: rule.id,
        name: rule.name,
        message: rule.message,
        severity: rule.severity || 'error',
        matches: matches,
        line: lineNumber,
      };

      if (rule.replacement) {
        violation.suggestions = matches.map(match => ({
          wrong: match,
          correct: rule.replacement[match] || match,
        }));
      }

      violations.push(violation);
    }
  }

  return violations;
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const allViolations = [];

  lines.forEach((line, index) => {
    // dialogue: "..." 패턴 찾기
    const dialogueMatch = line.match(/dialogue:\s*["'`](.*?)["'`]/);
    if (dialogueMatch) {
      const dialogue = dialogueMatch[1];
      const violations = validateDialogue(dialogue, index + 1);
      allViolations.push(...violations);
    }
  });

  return allViolations;
}

function formatViolation(violation) {
  const icons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const icon = icons[violation.severity] || '•';
  let output = `${icon} [${violation.severity.toUpperCase()}] ${violation.name}\n`;

  if (violation.line) {
    output += `   줄 ${violation.line}\n`;
  }

  output += `   ${violation.message}\n`;

  if (violation.matches) {
    output += `   발견: "${violation.matches.join('", "')}"\n`;
  }

  if (violation.suggestions) {
    output += `   제안:\n`;
    violation.suggestions.forEach(s => {
      output += `     "${s.wrong}" → "${s.correct}"\n`;
    });
  }

  return output;
}

// ===================== CLI =====================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('사용법:');
    console.log('  node scripts/validate-case.js "대사 내용"');
    console.log('  node scripts/validate-case.js --file lib/council/phase1Cases.ts');
    process.exit(1);
  }

  let violations = [];

  if (args[0] === '--file') {
    const filePath = path.resolve(args[1]);
    console.log(`파일 검증: ${filePath}\n`);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
      process.exit(1);
    }

    violations = validateFile(filePath);
  } else {
    const dialogue = args.join(' ');
    console.log(`대사 검증: "${dialogue}"\n`);
    violations = validateDialogue(dialogue);
  }

  // 결과 출력
  if (violations.length === 0) {
    console.log('✅ 모든 검사를 통과했습니다!\n');
    process.exit(0);
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`총 ${violations.length}개의 문제를 발견했습니다.\n`);

  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;
  const infoCount = violations.filter(v => v.severity === 'info').length;

  violations.forEach(violation => {
    console.log(formatViolation(violation));
  });

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`요약: 오류 ${errorCount}개, 경고 ${warningCount}개, 정보 ${infoCount}개\n`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateDialogue, validateFile };

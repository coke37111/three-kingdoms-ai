"use client";

import type { ChatMessage, Emotion } from "@/types/chat";

const EMOTION_EMOJI: Record<Emotion, string> = {
  calm: "😌",
  worried: "😟",
  excited: "😄",
  angry: "😠",
  thoughtful: "🤔",
};

function colorizeNumbers(text: string) {
  // 숫자와 증감 키워드를 포함한 패턴 매칭
  // 그룹 1: 증가/회복 등 (녹색, +부호)
  // 그룹 2: 감소/소모 등 (적색, -부호)
  // 그룹 3: 기타 숫자 (부호에 따라 색상 적용)
  const regex = /([+-]?\d[\d,]*)(?:\s*(?:증가|회복|획득|상승))|([+-]?\d[\d,]*)(?:\s*(?:감소|소모|피해|하락|지출))|([+-]?\d[\d,]*)/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // 매치된 문자열 앞부분 추가
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const positiveVal = match[1]; // "1500" (뒤에 '증가'가 있었음) 혹은 undefined
    const negativeVal = match[2]; // "500" (뒤에 '소모'가 있었음) 혹은 undefined
    const neutralVal = match[3];  // 단순 숫자 혹은 undefined

    if (positiveVal) {
      // 이미 +가 있으면 제거하고 다시 붙임
      const val = positiveVal.replace(/^[+]/, "");
      parts.push(
        <span key={match.index} style={{ color: "var(--success)", fontWeight: 700 }}>
          {`+${val}`}
        </span>
      );
    } else if (negativeVal) {
      // 이미 -가 있으면 제거하고 다시 붙임
      const val = negativeVal.replace(/^[-]/, "");
      parts.push(
        <span key={match.index} style={{ color: "var(--danger)", fontWeight: 700 }}>
          {`-${val}`}
        </span>
      );
    } else if (neutralVal) {
      // 키워드 없는 단순 숫자 (+/- 부호가 이미 있는 경우 처리)
      if (neutralVal.startsWith("+")) {
        parts.push(<span key={match.index} style={{ color: "var(--success)", fontWeight: 700 }}>{neutralVal}</span>);
      } else if (neutralVal.startsWith("-")) {
        parts.push(<span key={match.index} style={{ color: "var(--danger)", fontWeight: 700 }}>{neutralVal}</span>);
      } else {
        parts.push(neutralVal);
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

interface ChatBubbleProps {
  message: ChatMessage;
  isTyping?: boolean;
}

export default function ChatBubble({ message, isTyping }: ChatBubbleProps) {
  const isPlayer = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div style={{
        textAlign: "center",
        padding: "6px 16px",
        margin: "12px 0",
        animation: "fadeInUp 0.3s ease",
      }}>
        <span style={{
          background: "var(--gold-dim)",
          color: "var(--gold)",
          fontSize: "11px",
          padding: "4px 14px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          letterSpacing: "0.5px",
        }}>
          {colorizeNumbers(message.content)}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: isPlayer ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: "8px",
      margin: "6px 14px",
      animation: isPlayer ? "fadeInUp 0.3s ease" : undefined,
    }}>
      {!isPlayer && (
        <div style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1a1640, #2d1f4e)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          flexShrink: 0,
          border: "1.5px solid var(--gold-dim)",
        }}>
          🪶
        </div>
      )}
      <div style={{ maxWidth: "80%", minWidth: "40px" }}>
        {!isPlayer && (
          <div style={{
            fontSize: "10px",
            color: "var(--gold)",
            marginBottom: "3px",
            fontWeight: 500,
            letterSpacing: "1px",
          }}>
            제갈량
            {message.emotion && (
              <span style={{ marginLeft: "4px", opacity: 0.6 }}>
                {EMOTION_EMOJI[message.emotion] || ""}
              </span>
            )}
          </div>
        )}
        <div style={{
          background: isPlayer
            ? "linear-gradient(135deg, #5c4a1e, #3d3011)"
            : "var(--bg-card)",
          color: "var(--text-primary)",
          padding: "10px 14px",
          borderRadius: isPlayer ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          fontSize: "13.5px",
          lineHeight: 1.65,
          border: isPlayer ? "none" : "1px solid var(--border)",
          wordBreak: "break-word",
        }}>
          {message.content}
          {isTyping && <span style={{ animation: "blink 1s infinite", color: "var(--gold)" }}>▊</span>}
        </div>
      </div>
    </div>
  );
}

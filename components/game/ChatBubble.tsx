"use client";

import type { ChatMessage, Emotion } from "@/types/chat";

const EMOTION_EMOJI: Record<Emotion, string> = {
  calm: "😌",
  worried: "😟",
  excited: "😄",
  angry: "😠",
  thoughtful: "🤔",
};

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
          {message.content}
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
      animation: "fadeInUp 0.3s ease",
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

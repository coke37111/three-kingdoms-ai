"use client";

import type { CouncilMessage, ThreadMessage } from "@/types/council";
import type { AdvisorState } from "@/types/council";
import type { Emotion } from "@/types/chat";

const EMOTION_EMOJI: Record<Emotion, string> = {
  calm: "😌",
  worried: "😟",
  excited: "😄",
  angry: "😠",
  thoughtful: "🤔",
};

function getSpeakerInfo(speaker: string, advisors: AdvisorState[]): { icon: string; color: string; role: string } {
  const advisor = advisors.find((a) => a.name === speaker);
  if (advisor) return { icon: advisor.icon, color: advisor.color, role: advisor.role };
  if (speaker === "유비") return { icon: "👑", color: "var(--gold)", role: "주공" };
  return { icon: "👤", color: "#888", role: "" };
}

function getAdvisorStats(speaker: string, advisors: AdvisorState[]): { loyalty: number; enthusiasm: number } | null {
  const advisor = advisors.find((a) => a.name === speaker);
  if (!advisor || advisor.role === "전략") return null;
  return { loyalty: advisor.loyalty, enthusiasm: advisor.enthusiasm };
}

/** 타이핑 도트 인디케이터 */
function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: "3px", alignItems: "center" }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--text-dim)", animation: "typingDot 1.2s infinite 0s" }} />
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--text-dim)", animation: "typingDot 1.2s infinite 0.2s" }} />
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--text-dim)", animation: "typingDot 1.2s infinite 0.4s" }} />
    </span>
  );
}

/** 쓰레드 메시지 렌더링 */
function renderThread(threadMsgs: ThreadMessage[], advisors: AdvisorState[], threadTyping: { speaker: string } | null) {
  return (
    <div style={{
      marginLeft: "42px",
      borderLeft: "2px solid var(--border)",
      paddingLeft: "10px",
      marginTop: "4px",
      marginBottom: "4px",
    }}>
      {threadMsgs.map((tm, j) => {
        const isUser = tm.type === "user";
        const { icon, color } = getSpeakerInfo(tm.speaker, advisors);
        return (
          <div key={j} style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
            margin: "4px 0",
            animation: "fadeInUp 0.25s ease both",
          }}>
            <div style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: isUser
                ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.4))"
                : `linear-gradient(135deg, ${color}22, ${color}44)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              flexShrink: 0,
              border: isUser ? "1.5px solid rgba(201,168,76,0.6)" : `1.5px solid ${color}66`,
            }}>
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "9px", color: isUser ? "var(--gold)" : color, fontWeight: 600, marginBottom: "2px" }}>
                {tm.speaker}
              </div>
              <div style={{
                background: isUser ? "rgba(201,168,76,0.1)" : "var(--bg-card)",
                padding: "6px 10px",
                borderRadius: "10px 10px 10px 4px",
                fontSize: "12px",
                lineHeight: 1.5,
                border: isUser ? "1px solid rgba(201,168,76,0.3)" : `1px solid ${color}22`,
                color: "var(--text-primary)",
                wordBreak: "break-word",
              }}>
                {tm.text}
              </div>
            </div>
          </div>
        );
      })}
      {/* 쓰레드 내 타이핑 인디케이터 */}
      {threadTyping && (() => {
        const { icon, color } = getSpeakerInfo(threadTyping.speaker, advisors);
        return (
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
            margin: "4px 0",
            animation: "fadeInUp 0.2s ease both",
          }}>
            <div style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${color}22, ${color}44)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              flexShrink: 0,
              border: `1.5px solid ${color}66`,
            }}>
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "9px", color, fontWeight: 600, marginBottom: "2px" }}>
                {threadTyping.speaker}
              </div>
              <div style={{
                background: "var(--bg-card)",
                padding: "6px 12px",
                borderRadius: "10px 10px 10px 4px",
                border: `1px solid ${color}22`,
                display: "inline-block",
              }}>
                <TypingDots />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

interface CouncilChatProps {
  messages: CouncilMessage[];
  advisors: AdvisorState[];
  councilNumber: number;
  typingIndicator?: { speaker: string } | null;
  threads?: Record<number, ThreadMessage[]>;
  threadTyping?: { msgIndex: number; speaker: string } | null;
  onMessageClick?: (msg: CouncilMessage, index: number) => void;
  replyTarget?: { msg: CouncilMessage; index: number } | null;
  disabled?: boolean;
}

export default function CouncilChat({
  messages, advisors, councilNumber,
  typingIndicator,
  threads, threadTyping,
  onMessageClick, replyTarget, disabled,
}: CouncilChatProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {/* 회의 제목 (도입 서사(0회)는 표시하지 않음) */}
      {councilNumber > 0 && (
        <div style={{
          textAlign: "center",
          padding: "8px 16px",
          margin: "8px 0",
        }}>
          <span style={{
            background: "var(--gold-dim)",
            color: "var(--gold)",
            fontSize: "11px",
            padding: "4px 14px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            letterSpacing: "1px",
            fontWeight: 700,
          }}>
            📋 제{councilNumber}회 참모 회의
          </span>
        </div>
      )}

      {/* 메시지들 */}
      {messages.map((msg, i) => {
        // Phase 구분선
        if (msg.speaker === "__phase_divider__") {
          return (
            <div key={i} style={{
              textAlign: "center",
              padding: "6px 0",
              margin: "4px 0",
              animation: "fadeInUp 0.3s ease both",
            }}>
              <span style={{
                fontSize: "10px",
                color: "var(--text-dim)",
                padding: "2px 12px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                letterSpacing: "1px",
              }}>
                {msg.dialogue}
              </span>
            </div>
          );
        }

        // 회의 타이틀 구분선
        if (msg.speaker === "__council_title__") {
          return (
            <div key={i} style={{
              textAlign: "center",
              padding: "12px 16px 8px",
              margin: "8px 0",
              animation: "fadeInUp 0.4s ease both",
            }}>
              <span style={{
                background: "var(--gold-dim)",
                color: "var(--gold)",
                fontSize: "11px",
                padding: "4px 14px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                letterSpacing: "1px",
                fontWeight: 700,
              }}>
                📋 제{msg.dialogue}회 참모 회의
              </span>
            </div>
          );
        }

        const { icon, color, role } = getSpeakerInfo(msg.speaker, advisors);
        const stats = getAdvisorStats(msg.speaker, advisors);
        const isSelected = replyTarget && replyTarget.index === i;
        const isRuler = msg.speaker === "유비";

        // Phase 배지
        const phaseBadge = msg.phase ? (
          <span style={{
            fontSize: "8px",
            padding: "0px 4px",
            borderRadius: "4px",
            background: "rgba(201,168,76,0.1)",
            color: "var(--text-dim)",
            marginLeft: "4px",
          }}>
            P{msg.phase}
          </span>
        ) : null;

        // 이 메시지의 쓰레드
        const msgThreads = threads?.[i];
        const msgThreadTyping = threadTyping && threadTyping.msgIndex === i ? { speaker: threadTyping.speaker } : null;

        return (
          <div key={i}>
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              margin: "3px 14px",
              flexDirection: isRuler ? "row-reverse" : "row",
              animation: `fadeInUp 0.3s ease ${i * 0.05}s both`,
            }}>
              {/* 아바타 */}
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: isRuler
                  ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.4))"
                  : `linear-gradient(135deg, ${color}22, ${color}44)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                flexShrink: 0,
                border: isRuler ? "1.5px solid rgba(201,168,76,0.6)" : `1.5px solid ${color}66`,
              }}>
                {icon}
              </div>

              {/* 내용 */}
              <div style={{ maxWidth: "80%", minWidth: "40px", flex: 1, textAlign: isRuler ? "right" : "left" }}>
                <div style={{
                  fontSize: "10px",
                  marginBottom: "3px",
                  fontWeight: 500,
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  justifyContent: isRuler ? "flex-end" : "flex-start",
                }}>
                  <span style={{ color }}>
                    {role && <span style={{ opacity: 0.7 }}>[{role}]</span>} {msg.speaker}
                  </span>
                  {msg.emotion && !isRuler && (
                    <span style={{ opacity: 0.6 }}>{EMOTION_EMOJI[msg.emotion] || ""}</span>
                  )}
                  {phaseBadge}
                  {stats && (
                    <span style={{
                      fontSize: "9px",
                      color: "var(--text-dim)",
                      opacity: 0.7,
                    }}>
                      ♥{stats.loyalty} 🔥{stats.enthusiasm}
                    </span>
                  )}
                </div>
                <div
                  onClick={() => !isRuler && !disabled && onMessageClick && onMessageClick(msg, i)}
                  style={{
                    background: isRuler ? "rgba(201,168,76,0.12)" : isSelected ? `${color}22` : "var(--bg-card)",
                    color: "var(--text-primary)",
                    padding: "8px 12px",
                    borderRadius: isRuler ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    border: isRuler ? "1px solid rgba(201,168,76,0.35)" : isSelected ? `1px solid ${color}88` : `1px solid ${color}33`,
                    wordBreak: "break-word",
                    cursor: !isRuler && onMessageClick && !disabled ? "pointer" : "default",
                    transition: "all 0.2s ease",
                    display: "inline-block",
                    textAlign: "left",
                  }}>
                  {msg.dialogue}
                </div>
              </div>
            </div>

            {/* 쓰레드 (이 메시지 아래에 중첩) */}
            {(msgThreads || msgThreadTyping) && renderThread(msgThreads || [], advisors, msgThreadTyping)}
          </div>
        );
      })}

      {/* 입력 중 인디케이터 (메인 — 쓰레드 밖) */}
      {typingIndicator && (() => {
        const { icon, color, role } = getSpeakerInfo(typingIndicator.speaker, advisors);
        return (
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            margin: "3px 14px",
            animation: "fadeInUp 0.2s ease both",
          }}>
            <div style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${color}22, ${color}44)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              flexShrink: 0,
              border: `1.5px solid ${color}66`,
            }}>
              {icon}
            </div>
            <div style={{ maxWidth: "80%", minWidth: "40px", flex: 1 }}>
              <div style={{
                fontSize: "10px",
                marginBottom: "3px",
                fontWeight: 500,
                color,
              }}>
                {role && <span style={{ opacity: 0.7 }}>[{role}]</span>} {typingIndicator.speaker}
              </div>
              <div style={{
                background: "var(--bg-card)",
                padding: "8px 14px",
                borderRadius: "12px 12px 12px 4px",
                border: `1px solid ${color}33`,
                display: "inline-block",
              }}>
                <TypingDots />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

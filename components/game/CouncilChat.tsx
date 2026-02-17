"use client";

import type { CouncilMessage, AdvisorAction, ApprovalRequest, ThreadMessage } from "@/types/council";
import type { AdvisorState } from "@/types/council";
import type { Emotion } from "@/types/chat";
import { ZHANGFEI_INFO } from "@/constants/advisors";
import { renderCityLinks } from "@/lib/utils/cityTextParser";

const EMOTION_EMOJI: Record<Emotion, string> = {
  calm: "😌",
  worried: "😟",
  excited: "😄",
  angry: "😠",
  thoughtful: "🤔",
};

const URGENCY_STYLE = {
  routine: { color: "var(--text-dim)", label: "일상" },
  important: { color: "var(--gold)", label: "중요" },
  critical: { color: "var(--danger)", label: "긴급" },
} as const;

function getSpeakerInfo(speaker: string, advisors: AdvisorState[]): { icon: string; color: string; role: string } {
  const advisor = advisors.find((a) => a.name === speaker);
  if (advisor) return { icon: advisor.icon, color: advisor.color, role: advisor.role };
  if (speaker === ZHANGFEI_INFO.name) return { icon: ZHANGFEI_INFO.icon, color: ZHANGFEI_INFO.color, role: "무장" };
  if (speaker === "유비") return { icon: "👑", color: "var(--gold)", role: "주공" };
  return { icon: "👤", color: "#888", role: "" };
}

function getAdvisorStats(speaker: string, advisors: AdvisorState[]): { loyalty: number; enthusiasm: number } | null {
  const advisor = advisors.find((a) => a.name === speaker);
  if (!advisor || advisor.role === "총괄") return null;
  return { loyalty: advisor.loyalty, enthusiasm: advisor.enthusiasm };
}

/** 자율 행동 결과 태그 렌더링 */
function renderActionTag(action: AdvisorAction) {
  const sc = action.state_changes;
  if (!sc) return null;

  const tags: { text: string; positive: boolean }[] = [];
  if (sc.gold_delta && sc.gold_delta !== 0) tags.push({ text: `금${sc.gold_delta > 0 ? "+" : ""}${sc.gold_delta}`, positive: sc.gold_delta > 0 });
  if (sc.food_delta && sc.food_delta !== 0) tags.push({ text: `식량${sc.food_delta > 0 ? "+" : ""}${sc.food_delta}`, positive: sc.food_delta > 0 });
  if (sc.troops_delta && sc.troops_delta !== 0) tags.push({ text: `병력${sc.troops_delta > 0 ? "+" : ""}${sc.troops_delta}`, positive: sc.troops_delta > 0 });
  if (sc.popularity_delta && sc.popularity_delta !== 0) tags.push({ text: `인망${sc.popularity_delta > 0 ? "+" : ""}${sc.popularity_delta}`, positive: sc.popularity_delta > 0 });

  if (tags.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
      {tags.map((t, i) => (
        <span key={i} style={{
          padding: "1px 6px",
          borderRadius: "6px",
          fontSize: "10px",
          fontWeight: 600,
          background: t.positive ? "rgba(74,140,92,0.2)" : "rgba(212,68,62,0.2)",
          color: t.positive ? "var(--success)" : "var(--danger)",
          border: `1px solid ${t.positive ? "rgba(74,140,92,0.4)" : "rgba(212,68,62,0.4)"}`,
        }}>
          {t.text}
        </span>
      ))}
    </div>
  );
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
function renderThread(threadMsgs: ThreadMessage[], advisors: AdvisorState[], threadTyping: { speaker: string } | null, onOpenMap?: (cityName: string) => void) {
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
                borderRadius: isUser ? "10px 10px 10px 4px" : "10px 10px 10px 4px",
                fontSize: "12px",
                lineHeight: 1.5,
                border: isUser ? "1px solid rgba(201,168,76,0.3)" : `1px solid ${color}22`,
                color: "var(--text-primary)",
                wordBreak: "break-word",
              }}>
                {renderCityLinks(tm.text, onOpenMap)}
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
  streamingMessage?: { speaker: string; text: string } | null;
  typingIndicator?: { speaker: string } | null;
  autoActions?: AdvisorAction[];
  approvalRequests?: ApprovalRequest[];
  threads?: Record<number, ThreadMessage[]>;
  threadTyping?: { msgIndex: number; speaker: string } | null;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onMessageClick?: (msg: CouncilMessage, index: number) => void;
  replyTarget?: { msg: CouncilMessage; index: number } | null;
  disabled?: boolean;
  onOpenMap?: (cityName: string) => void;
}

export default function CouncilChat({
  messages, advisors, councilNumber, streamingMessage,
  typingIndicator, autoActions, approvalRequests,
  threads, threadTyping,
  onApprove, onReject,
  onMessageClick, replyTarget, disabled,
  onOpenMap,
}: CouncilChatProps) {
  // 참모별 자율 행동 매핑 (메시지 옆에 태그 표시)
  const actionByAdvisor = new Map<string, AdvisorAction>();
  if (autoActions) {
    for (const a of autoActions) {
      actionByAdvisor.set(a.advisor, a);
    }
  }

  // 이미 태그를 렌더링한 참모 추적
  const renderedActionAdvisors = new Set<string>();

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

        // 이 참모의 마지막 메시지인지 확인 (자율 행동 태그 배치 위치)
        const isLastMsgOfSpeaker = !messages.slice(i + 1).some((m) => m.speaker === msg.speaker);
        const speakerAction = isLastMsgOfSpeaker && !renderedActionAdvisors.has(msg.speaker)
          ? actionByAdvisor.get(msg.speaker)
          : undefined;
        if (speakerAction) renderedActionAdvisors.add(msg.speaker);

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
                  {renderCityLinks(msg.dialogue, onOpenMap)}
                </div>

                {/* 이 참모의 자율 행동 결과 태그 */}
                {speakerAction && renderActionTag(speakerAction)}
              </div>
            </div>

            {/* 쓰레드 (이 메시지 아래에 중첩) */}
            {(msgThreads || msgThreadTyping) && renderThread(msgThreads || [], advisors, msgThreadTyping, onOpenMap)}
          </div>
        );
      })}

      {/* 결재 요청 카드 */}
      {approvalRequests && approvalRequests.length > 0 && (
        <div style={{ margin: "8px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {approvalRequests.map((req) => {
            const { icon, color } = getSpeakerInfo(req.advisor, advisors);
            const urgStyle = URGENCY_STYLE[req.urgency] || URGENCY_STYLE.routine;

            // 변화량 태그 (양수=이득, 음수=비용)
            const changeTags: { text: string; positive: boolean }[] = [];
            if (req.cost) {
              if (req.cost.gold_delta) changeTags.push({ text: `금${req.cost.gold_delta > 0 ? "+" : ""}${req.cost.gold_delta.toLocaleString()}`, positive: req.cost.gold_delta > 0 });
              if (req.cost.food_delta) changeTags.push({ text: `식량${req.cost.food_delta > 0 ? "+" : ""}${req.cost.food_delta.toLocaleString()}`, positive: req.cost.food_delta > 0 });
              if (req.cost.troops_delta) changeTags.push({ text: `병력${req.cost.troops_delta > 0 ? "+" : ""}${req.cost.troops_delta.toLocaleString()}`, positive: req.cost.troops_delta > 0 });
              if (req.cost.popularity_delta) changeTags.push({ text: `인망${req.cost.popularity_delta > 0 ? "+" : ""}${req.cost.popularity_delta.toLocaleString()}`, positive: req.cost.popularity_delta > 0 });
            }

            return (
              <div key={req.id} style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${color}55`,
                borderRadius: "12px",
                padding: "10px 14px",
                animation: "fadeInUp 0.4s ease",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "16px" }}>{icon}</span>
                  <span style={{ color, fontWeight: 700, fontSize: "13px" }}>
                    [{req.advisor}] {req.subject}
                  </span>
                  <span style={{
                    fontSize: "9px",
                    padding: "1px 6px",
                    borderRadius: "8px",
                    background: `${urgStyle.color}22`,
                    color: urgStyle.color,
                    fontWeight: 600,
                    marginLeft: "auto",
                  }}>
                    {urgStyle.label}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  {req.description}
                </div>
                {changeTags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                    {changeTags.map((t, i) => (
                      <span key={i} style={{
                        padding: "1px 6px",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: 600,
                        background: t.positive ? "rgba(74,140,92,0.15)" : "rgba(212,68,62,0.15)",
                        color: t.positive ? "var(--success)" : "var(--danger)",
                        border: `1px solid ${t.positive ? "rgba(74,140,92,0.3)" : "rgba(212,68,62,0.3)"}`,
                      }}>
                        {t.text}
                      </span>
                    ))}
                    {req.benefit && (
                      <span style={{
                        padding: "1px 6px",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: 600,
                        background: "rgba(74,140,92,0.15)",
                        color: "var(--success)",
                        border: "1px solid rgba(74,140,92,0.3)",
                      }}>
                        {req.benefit}
                      </span>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => onApprove && onApprove(req.id)}
                    disabled={disabled}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: disabled ? "not-allowed" : "pointer",
                      background: disabled ? "rgba(255,255,255,0.02)" : "rgba(74,140,92,0.2)",
                      color: disabled ? "var(--text-dim)" : "var(--success)",
                      border: `1px solid ${disabled ? "var(--border)" : "rgba(74,140,92,0.5)"}`,
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    ✅ 승인
                  </button>
                  <button
                    onClick={() => onReject && onReject(req.id)}
                    disabled={disabled}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: disabled ? "not-allowed" : "pointer",
                      background: disabled ? "rgba(255,255,255,0.02)" : "rgba(212,68,62,0.15)",
                      color: disabled ? "var(--text-dim)" : "var(--danger)",
                      border: `1px solid ${disabled ? "var(--border)" : "rgba(212,68,62,0.4)"}`,
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    ❌ 거부
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {/* 스트리밍 중인 메시지 */}
      {streamingMessage && (() => {
        const { icon, color, role } = getSpeakerInfo(streamingMessage.speaker, advisors);
        return (
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            margin: "3px 14px",
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
                {role && <span style={{ opacity: 0.7 }}>[{role}]</span>} {streamingMessage.speaker}
              </div>
              <div style={{
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                padding: "8px 12px",
                borderRadius: "12px 12px 12px 4px",
                fontSize: "13px",
                lineHeight: 1.6,
                border: `1px solid ${color}33`,
              }}>
                {streamingMessage.text}
                <span style={{ animation: "blink 1s infinite", color: "var(--gold)" }}>▊</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

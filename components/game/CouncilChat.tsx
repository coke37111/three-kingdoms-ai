"use client";

import React from "react";
import type { AdvisorState, CouncilMessage, ThreadMessage, PlanReport } from "@/types/council";
import type { Emotion } from "@/types/chat";
import { getPointColor, POINT_REGEX } from "@/constants/uiConstants";

const EMOTION_EMOJI: Record<Emotion, string> = {
  calm: "😌",
  worried: "😟",
  excited: "😄",
  angry: "😠",
  thoughtful: "🤔",
};

const PLAN_LABEL_COLOR: Record<string, { label: string; color: string }> = {
  ip_delta:          { label: "내정력",   color: "#ffa726" },
  dp_delta:          { label: "외교력",   color: "#ba68c8" },
  ap_delta:          { label: "행동력",   color: "#64b464" },
  sp_delta:          { label: "특수능력", color: "#5c9aff" },
  mp_troops_delta:   { label: "병력",     color: "#e65c5c" },
  mp_training_delta: { label: "훈련도",   color: "#e65c5c" },
  mp_morale_delta:   { label: "사기",     color: "#e65c5c" },
};

/** 계획의 expected_points를 컬러 JSX 요약으로 변환 */
function formatPlanSummary(
  expected_points: PlanReport["expected_points"],
  extra_note?: string,
): React.ReactNode {
  if (!expected_points) return null;

  const costs: React.ReactNode[] = [];
  const gains: React.ReactNode[] = [];

  for (const [key, val] of Object.entries(expected_points)) {
    if (val === undefined || val === 0) continue;
    const { label, color } = PLAN_LABEL_COLOR[key] ?? { label: key, color: "#888" };
    let formatted: string;
    if (key === "mp_training_delta") {
      const pct = Math.round((val as number) * 100);
      formatted = pct >= 0 ? `+${pct}%` : `${pct}%`;
    } else {
      const n = val as number;
      formatted = n >= 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
    }
    const node = <span key={key} style={{ color, fontWeight: 600 }}>{label} {formatted}</span>;
    (val as number) < 0 ? costs.push(node) : gains.push(node);
  }

  const parts: React.ReactNode[] = [];
  costs.forEach((c, i) => { if (i > 0) parts.push(<span key={`cs${i}`}>, </span>); parts.push(c); });
  if (costs.length && gains.length) parts.push(<span key="arr"> → </span>);
  gains.forEach((g, i) => { if (i > 0) parts.push(<span key={`gs${i}`}>, </span>); parts.push(g); });
  if (extra_note) {
    parts.push(<span key="note" style={{ color: "#e65c5c", marginLeft: "2px" }}>{extra_note}</span>);
  }

  return parts.length > 0 ? <>{parts}</> : null;
}

/** 대사 내의 포인트 용어를 감지하여 컬러링, "지도" 키워드는 클릭 가능한 링크로 변환 */
function formatDialogue(text: string, onOpenMap?: () => void) {
  if (!text) return null;
  const parts = text.split(POINT_REGEX);
  return (
    <>
      {parts.map((part, index) => {
        const color = getPointColor(part);
        if (color !== "inherit") {
          return (
            <span key={index} style={{ color, fontWeight: 600 }}>
              {part}
            </span>
          );
        }
        // 평문 파트에서 "지도" 키워드를 클릭 가능한 링크로 변환
        if (onOpenMap && part.includes("지도")) {
          const subParts = part.split(/(지도)/g);
          return (
            <React.Fragment key={index}>
              {subParts.map((sub, j) =>
                sub === "지도" ? (
                  <span
                    key={j}
                    onClick={onOpenMap}
                    style={{
                      color: "#64b4e4",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    지도
                  </span>
                ) : (
                  sub
                ),
              )}
            </React.Fragment>
          );
        }
        return part;
      })}
    </>
  );
}

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
        const tmStats = !isUser ? getAdvisorStats(tm.speaker, advisors) : null;
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
              <div style={{
                fontSize: "9px",
                color: isUser ? "var(--gold)" : color,
                fontWeight: 600,
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}>
                <span>{tm.speaker}</span>
                {tmStats && (
                  <span style={{ fontSize: "9px", color: "var(--text-dim)", opacity: 0.8, fontWeight: 400 }}>
                    ♥{tmStats.loyalty} 🔥{tmStats.enthusiasm}
                  </span>
                )}
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
                {formatDialogue(tm.text)}
              </div>
              {tm.stat_delta && (
                <div style={{ marginTop: "3px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {tm.stat_delta.enthusiasm_delta !== undefined && tm.stat_delta.enthusiasm_delta !== 0 && (
                    <span style={{
                      fontSize: "10px",
                      color: tm.stat_delta.enthusiasm_delta > 0 ? "#ff9f40" : "#aaa",
                      fontWeight: 600,
                    }}>
                      🔥 열정 {tm.stat_delta.enthusiasm_delta > 0 ? `+${tm.stat_delta.enthusiasm_delta}` : tm.stat_delta.enthusiasm_delta}
                    </span>
                  )}
                  {tm.stat_delta.loyalty_delta !== undefined && tm.stat_delta.loyalty_delta !== 0 && (
                    <span style={{
                      fontSize: "10px",
                      color: tm.stat_delta.loyalty_delta > 0 ? "#e87d7d" : "#aaa",
                      fontWeight: 600,
                    }}>
                      ♥ 충성도 {tm.stat_delta.loyalty_delta > 0 ? `+${tm.stat_delta.loyalty_delta}` : tm.stat_delta.loyalty_delta}
                    </span>
                  )}
                </div>
              )}
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
  planReports?: PlanReport[];
  approvedPlans?: Set<number>;
  onApprovePlan?: (index: number) => void;
  meetingPhase?: number;
  onOpenMap?: () => void;
}

export default function CouncilChat({
  messages, advisors, councilNumber,
  typingIndicator,
  threads, threadTyping,
  onMessageClick, replyTarget, disabled,
  planReports, approvedPlans, onApprovePlan, meetingPhase,
  onOpenMap,
}: CouncilChatProps) {
  // 각 참모의 마지막 메시지 인덱스와 planReport 인덱스를 사전 계산
  const speakerPlanMap = new Map<string, number>(); // speaker → planReport index
  const lastMsgBySpeaker = new Map<string, number>(); // speaker → last message index
  if (meetingPhase === 2 && planReports && planReports.length > 0 && onApprovePlan) {
    planReports.forEach((plan, i) => {
      if (!speakerPlanMap.has(plan.speaker)) speakerPlanMap.set(plan.speaker, i);
    });
    messages.forEach((msg, i) => {
      if (speakerPlanMap.has(msg.speaker)) lastMsgBySpeaker.set(msg.speaker, i);
    });
  }

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
        // 시스템 메시지 (인라인)
        if (msg.speaker === "__system__") {
          return (
            <div key={i} style={{
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
                whiteSpace: "pre-line",
              }}>
                {formatDialogue(msg.dialogue, onOpenMap)}
              </span>
            </div>
          );
        }

        // Phase 구분선
        if (msg.speaker === "__phase_divider__") {
          const dividerLabel = msg.dialogue === "계획" ? "📋 계획 보고" : msg.dialogue;
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
                {dividerLabel}
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

        // ── broadcast 메시지 (제갈량 전략 선언) ──
        if (msg.messageMode === "broadcast") {
          const { icon, color, role } = getSpeakerInfo(msg.speaker, advisors);
          const phaseLabels: Record<number, string> = { 1: "보고", 2: "토론", 3: "계획", 4: "토론" };
          const phaseBadge = msg.phase ? (
            <span style={{
              fontSize: "8px",
              padding: "0px 4px",
              borderRadius: "4px",
              background: "rgba(201,168,76,0.1)",
              color: "var(--text-dim)",
              marginLeft: "4px",
            }}>
              {phaseLabels[msg.phase] || `P${msg.phase}`}
            </span>
          ) : null;
          return (
            <div key={i} style={{
              margin: "6px 14px",
              padding: "10px 14px",
              background: "rgba(201,168,76,0.06)",
              borderLeft: "3px solid var(--gold-dim)",
              borderRadius: "0 8px 8px 0",
              animation: `fadeInUp 0.3s ease ${i * 0.05}s both`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
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
                <span style={{ color, fontSize: "10px", fontWeight: 600 }}>
                  [{role}] {msg.speaker}
                </span>
                <span style={{
                  fontSize: "8px",
                  color: "var(--gold)",
                  background: "rgba(201,168,76,0.15)",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}>
                  전략
                </span>
                {msg.emotion && (
                  <span style={{ opacity: 0.6 }}>{EMOTION_EMOJI[msg.emotion] || ""}</span>
                )}
                {phaseBadge}
              </div>
              <div style={{ fontSize: "13px", lineHeight: 1.7, color: "var(--text-primary)" }}>
                {formatDialogue(msg.dialogue, onOpenMap)}
              </div>
            </div>
          );
        }

        const { icon, color, role } = getSpeakerInfo(msg.speaker, advisors);
        const stats = getAdvisorStats(msg.speaker, advisors);
        const isSelected = replyTarget && replyTarget.index === i;
        const isRuler = msg.speaker === "유비";

        // Phase 배지
        const phaseLabels: Record<number, string> = { 1: "보고", 2: "토론", 3: "계획", 4: "토론" };
        const phaseBadge = msg.phase ? (
          <span style={{
            fontSize: "8px",
            padding: "0px 4px",
            borderRadius: "4px",
            background: "rgba(201,168,76,0.1)",
            color: "var(--text-dim)",
            marginLeft: "4px",
          }}>
            {phaseLabels[msg.phase] || `P${msg.phase}`}
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
                  {formatDialogue(msg.dialogue, onOpenMap)}
                </div>
                {/* 승인 버튼 — 이 참모의 마지막 메시지에만 표시 */}
                {lastMsgBySpeaker.get(msg.speaker) === i && speakerPlanMap.has(msg.speaker) && (() => {
                  const planIdx = speakerPlanMap.get(msg.speaker)!;
                  const isApproved = approvedPlans?.has(planIdx) ?? false;
                  const plan = planReports?.[planIdx];
                  const summary = formatPlanSummary(plan?.expected_points, plan?.extra_note);
                  return (
                    <div style={{ marginTop: "5px", display: "flex", alignItems: "center", gap: "6px" }}>
                      {summary && (
                        <span style={{ fontSize: "10px" }}>{summary}</span>
                      )}
                      {isApproved ? (
                        <span style={{
                          fontSize: "10px", padding: "2px 8px", borderRadius: "8px",
                          background: "rgba(100,200,100,0.15)", color: "#64c864",
                          border: "1px solid rgba(100,200,100,0.35)",
                        }}>✓ 승인됨</span>
                      ) : (
                        <button onClick={() => onApprovePlan!(planIdx)} style={{
                          fontSize: "11px", padding: "3px 10px", borderRadius: "8px",
                          background: "rgba(201,168,76,0.15)", color: "var(--gold)",
                          border: "1px solid rgba(201,168,76,0.4)", cursor: "pointer",
                          fontWeight: 600,
                        }}>승인</button>
                      )}
                    </div>
                  );
                })()}
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

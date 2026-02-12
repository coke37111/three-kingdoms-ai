"use client";

import type { GameTask } from "@/types/game";

interface TaskPanelProps {
  tasks: GameTask[];
  show: boolean;
  onToggle: () => void;
}

export default function TaskPanel({ tasks, show, onToggle }: TaskPanelProps) {
  if (!show) return null;

  return (
    <div style={{
      position: "absolute",
      top: "90px",
      right: "12px",
      width: "240px",
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "12px",
      zIndex: 20,
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      animation: "fadeInUp 0.2s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "12px", letterSpacing: "1px" }}>📋 안건</span>
        <button onClick={onToggle} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "14px" }}>✕</button>
      </div>
      {tasks.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: "12px", textAlign: "center", padding: "16px 0" }}>안건 없음</div>
      ) : tasks.map((task, i) => {
        const color = task.urgency >= 70 ? "var(--danger)" : task.urgency >= 40 ? "var(--warning)" : "var(--success)";
        return (
          <div key={i} style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: "6px",
            padding: "8px",
            marginBottom: "4px",
            borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ fontSize: "12px", fontWeight: 600 }}>{task.title}</div>
            {task.turnsRemaining > 0 && (
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>{task.turnsRemaining}턴 남음</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

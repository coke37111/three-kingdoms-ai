"use client";

import type { FactionId } from "@/types/game";
import { FACTION_NAMES } from "@/constants/factions";

interface TurnNotificationProps {
  notifications: TurnNotificationItem[];
  onDismiss: () => void;
}

export interface TurnNotificationItem {
  factionId: FactionId;
  summary: string;
  icon?: string;
}

export default function TurnNotification({ notifications, onDismiss }: TurnNotificationProps) {
  if (notifications.length === 0) return null;

  return (
    <div style={{
      padding: "10px 14px",
      background: "linear-gradient(180deg, rgba(30,30,60,0.95) 0%, rgba(20,20,40,0.95) 100%)",
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      animation: "fadeInUp 0.3s ease",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "6px",
      }}>
        <span style={{ fontSize: "11px", color: "var(--gold)", fontWeight: 700, letterSpacing: "1px" }}>
          📢 타국 동향
        </span>
        <button onClick={onDismiss} style={{
          background: "none", border: "none", color: "var(--text-dim)",
          cursor: "pointer", fontSize: "12px",
        }}>
          확인
        </button>
      </div>
      {notifications.map((n, i) => (
        <div key={i} style={{
          fontSize: "12px",
          color: "var(--text-secondary)",
          padding: "4px 0",
          borderBottom: i < notifications.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
        }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {n.icon || "🏴"} {FACTION_NAMES[n.factionId]}
          </span>
          {" — "}
          {n.summary}
        </div>
      ))}
    </div>
  );
}

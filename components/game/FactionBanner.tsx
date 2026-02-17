"use client";

import type { Faction } from "@/types/game";

interface FactionBannerProps {
  faction: Faction;
  compact?: boolean;
}

export default function FactionBanner({ faction, compact }: FactionBannerProps) {
  if (compact) {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 6px",
        borderRadius: "6px",
        background: `${faction.color}20`,
        border: `1px solid ${faction.color}40`,
        fontSize: "11px",
        fontWeight: 600,
      }}>
        <span>{faction.icon}</span>
        <span style={{ color: faction.color }}>{faction.rulerName}</span>
      </span>
    );
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 10px",
      borderRadius: "8px",
      background: `${faction.color}10`,
      border: `1px solid ${faction.color}30`,
    }}>
      <span style={{ fontSize: "16px" }}>{faction.icon}</span>
      <div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: faction.color }}>
          {faction.rulerName}
        </div>
        <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
          🏯 {faction.castles.length}성채 · ⚔️ 군사 {faction.points.mp.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

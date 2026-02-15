"use client";

import type { AdvisorState } from "@/types/council";

interface AdvisorBarProps {
  advisors: AdvisorState[];
}

function getGaugeColor(value: number): string {
  if (value >= 70) return "var(--success)";
  if (value >= 40) return "var(--gold)";
  if (value >= 20) return "var(--danger)";
  return "#666";
}

export default function AdvisorBar({ advisors }: AdvisorBarProps) {
  return (
    <div style={{
      display: "flex",
      gap: "2px",
      padding: "4px 10px",
      background: "var(--bg-secondary)",
      borderBottom: "1px solid var(--border)",
      overflowX: "auto",
      justifyContent: "center",
    }}>
      {advisors.map((a) => (
        <div key={a.name} style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "2px 8px",
          minWidth: "52px",
        }}>
          <div style={{ fontSize: "14px" }}>{a.icon}</div>
          <div style={{
            fontSize: "9px",
            color: a.color,
            fontWeight: 600,
            marginTop: "1px",
            whiteSpace: "nowrap",
          }}>
            {a.name}
          </div>
          <div style={{
            display: "flex",
            gap: "6px",
            marginTop: "2px",
            fontSize: "9px",
          }}>
            <span style={{ color: getGaugeColor(a.loyalty) }}>
              ♥{a.loyalty}
            </span>
            <span style={{ color: getGaugeColor(a.enthusiasm) }}>
              🔥{a.enthusiasm}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

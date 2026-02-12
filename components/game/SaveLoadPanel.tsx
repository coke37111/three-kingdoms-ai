"use client";

import { useState, useEffect } from "react";
import { listSaveSlots, deleteSave, type SaveSlotInfo } from "@/lib/game/saveSystem";

interface SaveLoadPanelProps {
  show: boolean;
  mode: "save" | "load";
  onClose: () => void;
  onSave: (slotIndex: number) => void;
  onLoad: (slotIndex: number) => void;
}

export default function SaveLoadPanel({ show, mode, onClose, onSave, onLoad }: SaveLoadPanelProps) {
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    if (show) {
      setSlots(listSaveSlots());
      setConfirmDelete(null);
    }
  }, [show]);

  if (!show) return null;

  const handleDelete = (index: number) => {
    if (confirmDelete === index) {
      deleteSave(index);
      setSlots(listSaveSlots());
      setConfirmDelete(null);
    } else {
      setConfirmDelete(index);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.85)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "fadeInUp 0.3s ease",
    }}>
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "20px",
        width: "85%",
        maxWidth: "400px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "14px", letterSpacing: "2px" }}>
            {mode === "save" ? "💾 저장" : "📂 불러오기"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>

        {slots.map((slot) => (
          <div key={slot.index} style={{
            background: slot.isEmpty ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "6px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div style={{ flex: 1 }}>
              {slot.isEmpty ? (
                <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>빈 슬롯 {slot.index + 1}</div>
              ) : (
                <>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>{slot.name}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                    {slot.playerFactionName} · {slot.turnCount}턴 · {slot.playerCityCount}도시 · {new Date(slot.timestamp).toLocaleString("ko-KR")}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: "4px" }}>
              {mode === "save" && (
                <button
                  onClick={() => onSave(slot.index)}
                  style={{
                    background: "var(--gold)",
                    color: "var(--bg-primary)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  저장
                </button>
              )}
              {mode === "load" && !slot.isEmpty && (
                <button
                  onClick={() => onLoad(slot.index)}
                  style={{
                    background: "var(--gold)",
                    color: "var(--bg-primary)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  불러오기
                </button>
              )}
              {!slot.isEmpty && (
                <button
                  onClick={() => handleDelete(slot.index)}
                  style={{
                    background: confirmDelete === slot.index ? "var(--danger)" : "rgba(212,68,62,0.15)",
                    color: confirmDelete === slot.index ? "white" : "var(--danger)",
                    border: "1px solid var(--danger)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "10px",
                    cursor: "pointer",
                  }}
                >
                  {confirmDelete === slot.index ? "확인" : "삭제"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

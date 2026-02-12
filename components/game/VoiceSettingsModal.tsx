"use client";

import type { VoiceSettings } from "@/lib/voice/types";

interface VoiceSettingsModalProps {
  show: boolean;
  settings: VoiceSettings;
  onUpdate: (patch: Partial<VoiceSettings>) => void;
  onClose: () => void;
}

export default function VoiceSettingsModal({ show, settings, onUpdate, onClose }: VoiceSettingsModalProps) {
  if (!show) return null;

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
        maxWidth: "360px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "14px", letterSpacing: "2px" }}>
            🔊 음성 설정
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "16px" }}>
            ✕
          </button>
        </div>

        {/* TTS 토글 */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 0", borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>음성 읽기 (TTS)</span>
          <button
            onClick={() => onUpdate({ ttsEnabled: !settings.ttsEnabled })}
            style={{
              background: settings.ttsEnabled ? "var(--gold)" : "rgba(255,255,255,0.1)",
              color: settings.ttsEnabled ? "var(--bg-primary)" : "var(--text-dim)",
              border: "none",
              borderRadius: "12px",
              padding: "4px 12px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {settings.ttsEnabled ? "ON" : "OFF"}
          </button>
        </div>

        {/* 볼륨 */}
        <div style={{ padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>볼륨</span>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{Math.round(settings.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(settings.volume * 100)}
            onChange={(e) => onUpdate({ volume: Number(e.target.value) / 100 })}
            style={{
              width: "100%",
              accentColor: "var(--gold)",
              cursor: "pointer",
            }}
          />
        </div>

        {/* 속도 */}
        <div style={{ padding: "14px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>속도</span>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{settings.speed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="50"
            max="200"
            value={Math.round(settings.speed * 100)}
            onChange={(e) => onUpdate({ speed: Number(e.target.value) / 100 })}
            style={{
              width: "100%",
              accentColor: "var(--gold)",
              cursor: "pointer",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>느리게</span>
            <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>빠르게</span>
          </div>
        </div>
      </div>
    </div>
  );
}

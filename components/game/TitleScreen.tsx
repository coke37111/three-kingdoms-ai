"use client";

import { useState } from "react";
import SaveLoadPanel from "./SaveLoadPanel";

interface TitleScreenProps {
  onStart: () => void;
  onContinue?: () => void;
  onLoadSlot?: (slotIndex: number) => void;
}

export default function TitleScreen({ onStart, onContinue, onLoadSlot }: TitleScreenProps) {
  const [showLoad, setShowLoad] = useState(false);

  return (
    <div style={{
      height: "100dvh",
      background: `radial-gradient(ellipse at 50% 30%, rgba(201,168,76,0.08) 0%, transparent 60%),
                    linear-gradient(180deg, var(--bg-primary) 0%, #0d0d1a 50%, var(--bg-primary) 100%)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative border lines */}
      <div style={{
        position: "absolute",
        top: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "200px",
        height: "1px",
        background: "linear-gradient(90deg, transparent, var(--gold-dim), transparent)",
      }} />

      <div style={{
        fontSize: "11px",
        color: "var(--text-dim)",
        letterSpacing: "6px",
        marginBottom: "16px",
        animation: "fadeInUp 0.8s ease",
      }}>
        A I · 군 주 · 시 뮬 레 이 션
      </div>

      <h1 style={{
        fontFamily: "'Noto Serif KR', serif",
        fontSize: "clamp(36px, 10vw, 56px)",
        fontWeight: 900,
        color: "var(--gold)",
        textShadow: "0 0 40px rgba(201,168,76,0.3)",
        letterSpacing: "8px",
        marginBottom: "4px",
        animation: "fadeInUp 0.8s ease 0.1s both",
      }}>
        삼국지
      </h1>

      <div style={{
        width: "60px",
        height: "1px",
        background: "var(--gold)",
        margin: "12px 0 20px",
        animation: "fadeInUp 0.8s ease 0.2s both",
      }} />

      <div style={{
        background: "rgba(255,255,255,0.03)",
        borderRadius: "12px",
        padding: "20px 24px",
        maxWidth: "300px",
        border: "1px solid var(--border)",
        marginBottom: "32px",
        animation: "fadeInUp 0.8s ease 0.3s both",
      }}>
        <p style={{ fontSize: "13px", lineHeight: 2, color: "var(--text-secondary)", textAlign: "center" }}>
          당신은 <b style={{ color: "var(--gold)" }}>유비</b><br />
          참모 <b style={{ color: "var(--gold)" }}>제갈량</b>의 보고를 받고<br />
          국가의 운명을 결정하시오<br />
          <br />
          <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
            💰 자원을 관리하고 ⚔️ 장수를 지휘하여<br />
            천하통일을 이루십시오
          </span>
        </p>
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        animation: "fadeInUp 0.8s ease 0.5s both",
      }}>
        <button
          onClick={onStart}
          style={{
            background: "transparent",
            color: "var(--gold)",
            border: "1px solid var(--gold)",
            padding: "14px 48px",
            borderRadius: "4px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "4px",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = "var(--gold)";
            (e.target as HTMLButtonElement).style.color = "var(--bg-primary)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = "transparent";
            (e.target as HTMLButtonElement).style.color = "var(--gold)";
          }}
        >
          출사표를 올리다
        </button>

        {onContinue && (
          <button
            onClick={onContinue}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              padding: "10px 48px",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "2px",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "var(--gold)";
              (e.target as HTMLButtonElement).style.color = "var(--gold)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.target as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
          >
            이어하기
          </button>
        )}

        {onLoadSlot && (
          <button
            onClick={() => setShowLoad(true)}
            style={{
              background: "transparent",
              color: "var(--text-dim)",
              border: "none",
              padding: "8px",
              fontSize: "12px",
              cursor: "pointer",
              letterSpacing: "1px",
            }}
          >
            📂 불러오기
          </button>
        )}
      </div>

      <div style={{
        position: "absolute",
        bottom: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "200px",
        height: "1px",
        background: "linear-gradient(90deg, transparent, var(--gold-dim), transparent)",
      }} />

      {onLoadSlot && (
        <SaveLoadPanel
          show={showLoad}
          mode="load"
          onClose={() => setShowLoad(false)}
          onSave={() => {}}
          onLoad={(slot) => { setShowLoad(false); onLoadSlot(slot); }}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { RECRUIT_TROOPS_PER_IP } from "@/constants/gameConstants";

interface RecruitmentPopupProps {
  maxIP: number;
  onConfirm: (troops: number) => void;
  onCancel: () => void;
}

export default function RecruitmentPopup({ maxIP, onConfirm, onCancel }: RecruitmentPopupProps) {
  const maxTroops = maxIP * RECRUIT_TROOPS_PER_IP;
  const [troops, setTroops] = useState(Math.floor(maxTroops / 2));

  const ipCost = Math.ceil(troops / RECRUIT_TROOPS_PER_IP);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.85)",
      zIndex: 200,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "fadeInUp 0.2s ease",
    }}>
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "24px",
        width: "90%",
        maxWidth: "380px",
      }}>
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "14px", letterSpacing: "2px" }}>
            ⚔️ 모병 수량 지정
          </span>
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "16px" }}
          >✕</button>
        </div>

        {maxTroops === 0 ? (
          <>
            <p style={{ color: "var(--text-dim)", textAlign: "center", margin: "20px 0", fontSize: "14px" }}>
              내정포인트가 없어 모병할 수 없습니다.
            </p>
            <button
              onClick={onCancel}
              style={{
                width: "100%", padding: "10px",
                background: "var(--bg-hover)", border: "1px solid var(--border)",
                borderRadius: "8px", color: "var(--text-primary)", cursor: "pointer",
              }}
            >닫기</button>
          </>
        ) : (
          <>
            {/* 수량 표시 */}
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--gold)" }}>
                {troops.toLocaleString()}명
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>
                내정포인트 -{ipCost} 소비
              </div>
            </div>

            {/* 슬라이더 */}
            <input
              type="range"
              min={0}
              max={maxTroops}
              step={100}
              value={troops}
              onChange={e => setTroops(Number(e.target.value))}
              style={{ width: "100%", marginBottom: "8px", accentColor: "var(--gold)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", marginBottom: "16px" }}>
              <span>0명</span>
              <span>최대 {maxTroops.toLocaleString()}명 (내정포인트 {maxIP})</span>
            </div>

            {/* 퀵 버튼 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "20px" }}>
              {[25, 50, 75, 100].map(pct => {
                const pctTroops = Math.floor(maxTroops * pct / 100);
                const isSelected = troops === pctTroops;
                return (
                  <button
                    key={pct}
                    onClick={() => setTroops(pctTroops)}
                    style={{
                      padding: "10px 0",
                      background: isSelected ? "var(--gold)" : "var(--bg-hover)",
                      border: `1px solid ${isSelected ? "var(--gold)" : "var(--border)"}`,
                      borderRadius: "8px",
                      color: isSelected ? "#1a1008" : "var(--text-primary)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 700,
                      transition: "all 0.15s",
                    }}
                  >{pct}%</button>
                );
              })}
            </div>

            {/* 확인 버튼 */}
            <button
              onClick={() => troops > 0 && onConfirm(troops)}
              style={{
                width: "100%",
                padding: "13px",
                background: troops > 0 ? "var(--gold)" : "var(--bg-hover)",
                border: "none",
                borderRadius: "10px",
                color: troops > 0 ? "#1a1008" : "var(--text-dim)",
                cursor: troops > 0 ? "pointer" : "not-allowed",
                fontWeight: 700,
                fontSize: "14px",
                letterSpacing: "1px",
              }}
            >
              {troops > 0 ? `${troops.toLocaleString()}명 징병 실시` : "수량을 선택하세요"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

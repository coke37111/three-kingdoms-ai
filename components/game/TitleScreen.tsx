"use client";

import { useState, useCallback } from "react";
import type { User } from "firebase/auth";
import SaveLoadPanel from "./SaveLoadPanel";

interface TitleScreenProps {
  onStart: () => void;
  onContinue?: () => void;
  onLoadSlot?: (slotIndex: number) => void;
  user: User | null;
  uid: string | null;
  authLoading: boolean;
  onGoogleLogin: () => Promise<void>;
  onLogout: () => void;
}

export default function TitleScreen({ onStart, onContinue, onLoadSlot, user, uid, authLoading, onGoogleLogin, onLogout }: TitleScreenProps) {
  const [showLoad, setShowLoad] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLoginAndStart = useCallback(async () => {
    setLoginLoading(true);
    try {
      await onGoogleLogin();
    } finally {
      setLoginLoading(false);
    }
  }, [onGoogleLogin]);

  const isLoggedIn = !!user;

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
      {/* 로그아웃 버튼 (로그인 시만) */}
      {isLoggedIn && (
        <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "4px 10px 4px 5px",
          }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: "18px", height: "18px", borderRadius: "50%" }} referrerPolicy="no-referrer" />
            ) : (
              <span style={{ fontSize: "12px" }}>👤</span>
            )}
            <span style={{ fontSize: "10px", color: "var(--text-secondary)", maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.displayName?.split(" ")[0] || "User"}
            </span>
            <button
              onClick={onLogout}
              style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "10px", cursor: "pointer", padding: "0 2px" }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 장식 상단 라인 */}
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
        {/* 미로그인: Google 로그인 버튼 (로그인 후 바로 게임 시작) */}
        {!isLoggedIn && !authLoading && (
          <button
            onClick={handleLoginAndStart}
            disabled={loginLoading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              background: "transparent",
              color: "var(--gold)",
              border: "1px solid var(--gold)",
              padding: "14px 40px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loginLoading ? "wait" : "pointer",
              letterSpacing: "2px",
              transition: "all 0.3s",
              opacity: loginLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loginLoading) {
                (e.currentTarget).style.background = "var(--gold)";
                (e.currentTarget).style.color = "var(--bg-primary)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget).style.background = "transparent";
              (e.currentTarget).style.color = "var(--gold)";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loginLoading ? "로그인 중..." : "Google로 시작하기"}
          </button>
        )}

        {/* 인증 로딩 중 */}
        {authLoading && (
          <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-dim)", padding: "14px" }}>
            인증 확인 중...
          </div>
        )}

        {/* 로그인 완료: 게임 시작 버튼들 */}
        {isLoggedIn && (
          <>
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
          </>
        )}
      </div>

      {/* 장식 하단 라인 */}
      <div style={{
        position: "absolute",
        bottom: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "200px",
        height: "1px",
        background: "linear-gradient(90deg, transparent, var(--gold-dim), transparent)",
      }} />

      {onLoadSlot && uid && (
        <SaveLoadPanel
          show={showLoad}
          mode="load"
          onClose={() => setShowLoad(false)}
          onSave={() => {}}
          onLoad={(slot) => { setShowLoad(false); onLoadSlot(slot); }}
          uid={uid}
        />
      )}
    </div>
  );
}

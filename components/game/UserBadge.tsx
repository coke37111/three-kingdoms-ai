"use client";

import type { User } from "firebase/auth";

interface UserBadgeProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function UserBadge({ user, onLogin, onLogout }: UserBadgeProps) {
  if (!user) {
    return (
      <button
        onClick={onLogin}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "3px 10px",
          color: "var(--text-secondary)",
          fontSize: "11px",
          cursor: "pointer",
        }}
      >
        로그인
      </button>
    );
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid var(--border)",
      borderRadius: "16px",
      padding: "2px 8px 2px 3px",
    }}>
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt=""
          style={{ width: "18px", height: "18px", borderRadius: "50%" }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span style={{ fontSize: "12px" }}>👤</span>
      )}
      <span style={{ fontSize: "10px", color: "var(--text-secondary)", maxWidth: "60px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {user.displayName?.split(" ")[0] || "User"}
      </span>
      <button
        onClick={onLogout}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-dim)",
          fontSize: "10px",
          cursor: "pointer",
          padding: "0 2px",
        }}
      >
        ✕
      </button>
    </div>
  );
}

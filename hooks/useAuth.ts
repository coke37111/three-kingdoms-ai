"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "firebase/auth";
import { signInWithGoogle, signOut, subscribeAuth } from "@/lib/firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let resolved = false;
    let unsubscribe: (() => void) | null = null;

    // 3초 타임아웃 — Firebase가 응답하지 않으면 로딩 해제
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn("Firebase auth timeout — proceeding without auth");
        resolved = true;
        setLoading(false);
      }
    }, 3000);

    // Firebase 인증 구독 (실패해도 타임아웃이 처리)
    try {
      unsubscribe = subscribeAuth((u) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
        }
        setUser(u);
        setLoading(false);
      });
    } catch (e) {
      console.error("Firebase auth init failed:", e);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        setLoading(false);
      }
    }

    return () => {
      clearTimeout(timeout);
      unsubscribe?.();
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error("Google login failed:", e);
      // 사용자에게 에러 상황 알림
      const code = e instanceof Error && "code" in e ? (e as { code: string }).code : "UNKNOWN";
      const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
      alert(`로그인 실패\n\nCode: ${code}\nMessage: ${message}\n\n설정이나 네트워크 상태를 확인해주세요.`);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  }, []);

  return {
    user,
    uid: user?.uid ?? null,
    loading,
    loginWithGoogle,
    logout,
  };
}

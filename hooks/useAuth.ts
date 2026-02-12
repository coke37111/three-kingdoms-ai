"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "firebase/auth";
import { signInWithGoogle, signOut, subscribeAuth } from "@/lib/firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      console.error("Google login failed:", e);
      // 사용자에게 에러 상황 알림
      const code = e.code || "UNKNOWN";
      const message = e.message || "알 수 없는 오류가 발생했습니다.";
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

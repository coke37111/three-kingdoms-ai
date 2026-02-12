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
    } catch (e) {
      console.error("Google login failed:", e);
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

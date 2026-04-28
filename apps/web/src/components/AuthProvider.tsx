"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useWallet } from "@solana/wallet-adapter-react";
import { signIn as emailSignIn, signOut as emailSignOut, signUp as emailSignUp } from "@/lib/auth/email";

type AppRole = "tourist" | "guide" | "admin";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  wallet: ReturnType<typeof useWallet>;
  isGuide: boolean;
  isAdmin: boolean;
  signIn: typeof emailSignIn;
  signOut: () => Promise<void>;
  signUp: typeof emailSignUp;
  connectWallet: () => Promise<void>;
  linkWallet: (args: { walletAddress: string; signature: string; nonce: string }) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>("tourist");

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function loadSession() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) {
        if (active) {
          setSession(null);
          setUser(null);
          setRole("tourist");
        }
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        const profile = await supabase
          .from("users")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (active && profile.data?.role) {
          setRole(profile.data.role as AppRole);
        }
      }
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      });
      unsubscribe = () => subscription.unsubscribe();
    }

    void loadSession();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const connectWallet = useCallback(async () => {
    if (!wallet.connected) {
      await wallet.connect();
    }
  }, [wallet]);

  const linkWallet = useCallback(
    async (args: { walletAddress: string; signature: string; nonce: string }) => {
      return fetch("/api/auth/link-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
    },
    [],
  );

  const signOut = useCallback(async () => {
    await emailSignOut();
    setSession(null);
    setUser(null);
    setRole("tourist");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      wallet,
      isGuide: role === "guide",
      isAdmin: role === "admin",
      signIn: emailSignIn,
      signOut,
      signUp: emailSignUp,
      connectWallet,
      linkWallet,
    }),
    [connectWallet, linkWallet, role, session, signOut, user, wallet],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

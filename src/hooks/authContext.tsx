import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AuthService, supabase } from "@/services";
import type { AppRole, HospishiftUser, SignInPayload, SignUpPayload } from "@/interfaces";

interface AuthContextValue {
  user: HospishiftUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  signIn: (payload: SignInPayload) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<HospishiftUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    try {
      const current = await AuthService.getCurrentUser();
      setUser(current);
    } catch (err) {
      console.error("[Auth] refresh failed", err);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => {
          void refresh();
        }, 0);
      }
    });

    (async () => {
      await refresh();
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  const signIn = useCallback(async (payload: SignInPayload) => {
    try {
      await AuthService.signIn(payload);
      await refresh();
    } catch (err) {
      console.error("[Auth] signIn failed", err);
      toast.error((err as Error).message);
      throw err;
    }
  }, [refresh]);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    try {
      await AuthService.signUp(payload);
      await refresh();
    } catch (err) {
      console.error("[Auth] signUp failed", err);
      toast.error((err as Error).message);
      throw err;
    }
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await AuthService.signOut();
      setUser(null);
    } catch (err) {
      console.error("[Auth] signOut failed", err);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    hasRole: (role) => user?.roles.includes(role) ?? false,
    hasAnyRole: (roles) => roles.some((r) => user?.roles.includes(r) ?? false),
    signIn,
    signUp,
    signOut,
    refresh,
  }), [user, loading, signIn, signUp, signOut, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

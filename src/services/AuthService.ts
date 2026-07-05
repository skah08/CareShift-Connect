import type { Provider } from "@supabase/supabase-js";
import type { SignInPayload, SignUpPayload } from "@/interfaces";
import { supabase } from "./SupabaseClient";
import { getCurrentUser as getCurrentUserServerFn } from "@/lib/auth.functions";

function getRedirectOrigin() {
  return typeof window !== "undefined" ? window.location.origin : undefined;
}

export const AuthService = {
  async signIn({ email, password }: SignInPayload) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp({ email, password }: SignUpPayload) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getRedirectOrigin() },
    });
    if (error) throw error;
    return data;
  },

  async signInWithOAuth(provider: Provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getRedirectOrigin() },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    return getCurrentUserServerFn();
  },
};

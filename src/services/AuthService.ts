import type { AppRole, HospishiftUser, SignInPayload, SignUpPayload } from "@/interfaces";
import { supabase } from "./SupabaseClient";

export const AuthService = {
  async signIn({ email, password }: SignInPayload) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp({ email, password }: SignUpPayload) {
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<HospishiftUser | null> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return null;

    const [profileRes, detailsRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_details").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (!profileRes.data) return null;

    const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);

    return {
      id: profileRes.data.id,
      email: profileRes.data.email,
      created_at: profileRes.data.created_at,
      updated_at: profileRes.data.updated_at,
      details: detailsRes.data
        ? {
            user_id: detailsRes.data.user_id,
            first_name: detailsRes.data.first_name,
            last_name: detailsRes.data.last_name,
            avatar_url: detailsRes.data.avatar_url,
            theme_preference: (detailsRes.data.theme_preference as "light" | "dark") ?? "light",
          }
        : null,
      roles,
    };
  },
};
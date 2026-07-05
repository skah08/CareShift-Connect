import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AppRole, HospishiftUser } from "@/interfaces";

export const getCurrentUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const sb = supabaseAdmin;

    const [profileRes, detailsRes, rolesRes] = await Promise.all([
      sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
      sb.from("user_details").select("*").eq("user_id", userId).maybeSingle(),
      sb.from("user_roles").select("role").eq("user_id", userId),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (!profileRes.data) return null;

    const roles = (rolesRes.data ?? []).map((r: any) => r.role as AppRole);

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
    } satisfies HospishiftUser;
  });

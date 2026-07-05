import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PermissionKey, UserPermissionRow } from "@/interfaces/Permission";

export const listUserPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      tenant_id: z.string().uuid(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("user_permissions")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("user_id");
    if (error) throw error;
    return (rows ?? []) as UserPermissionRow[];
  });

const setPermissionSchema = z.object({
  user_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  permission_key: z.string(),
});

export const grantPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => setPermissionSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("user_permissions")
      .insert({
        user_id: data.user_id,
        tenant_id: data.tenant_id,
        permission_key: data.permission_key as PermissionKey,
      });
    if (error) throw error;
    return { success: true };
  });

export const revokePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => setPermissionSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("user_permissions")
      .delete()
      .eq("user_id", data.user_id)
      .eq("tenant_id", data.tenant_id)
      .eq("permission_key", data.permission_key as PermissionKey);
    if (error) throw error;
    return { success: true };
  });

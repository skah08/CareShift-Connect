import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface TenantMembershipDTO {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  role: "owner" | "manager" | "planner" | "staff" | "viewer";
}

export const listMyMemberships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TenantMembershipDTO[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("tenant_members")
      .select("role, tenant_id, tenants(id, name, slug)")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? [])
      .map((row) => {
        const t = row.tenants as { id: string; name: string; slug: string } | null;
        if (!t) return null;
        return {
          tenant_id: t.id,
          tenant_name: t.name,
          tenant_slug: t.slug,
          role: row.role,
        } satisfies TenantMembershipDTO;
      })
      .filter((v): v is TenantMembershipDTO => v !== null);
  });

const createTenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, digits and hyphens only"),
});

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => createTenantSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: tenantId, error } = await supabase.rpc("create_tenant_with_owner", {
      _name: data.name,
      _slug: data.slug,
    });
    if (error) throw error;
    const tid = tenantId as string;

    const now = new Date().toISOString();
    const defaultTemplates = [
      { shift_code: "M", start_time: "07:00", end_time: "14:00", is_night_shift: false, allocated_break_minutes: 30 },
      { shift_code: "P", start_time: "14:00", end_time: "21:00", is_night_shift: false, allocated_break_minutes: 30 },
      { shift_code: "N", start_time: "21:00", end_time: "07:00", is_night_shift: true, allocated_break_minutes: 45 },
      { shift_code: "G", start_time: "08:00", end_time: "16:00", is_night_shift: false, allocated_break_minutes: 30 },
      { shift_code: "TL", start_time: "07:00", end_time: "19:00", is_night_shift: false, allocated_break_minutes: 60 },
      { shift_code: "TLN", start_time: "19:00", end_time: "07:00", is_night_shift: true, allocated_break_minutes: 60 },
      { shift_code: "I", start_time: "10:00", end_time: "17:00", is_night_shift: false, allocated_break_minutes: 30 },
    ];

    const { error: tmplErr } = await supabase.from("shift_templates").insert(
      defaultTemplates.map((t) => ({ ...t, tenant_id: tid })),
    );
    if (tmplErr) throw tmplErr;

    const { error: cfgErr } = await supabase.from("tenant_config").insert({
      tenant_id: tid,
      min_daily_rest_hrs: 11,
      max_weekly_work_hrs: 48,
      min_weekly_rest_hrs: 35,
      forbidden_sequence_matrix: { N: ["M", "P", "G", "I", "TL"] },
      night_shift_window: { start: "22:00", end: "06:00" },
      auto_approval_peer_swap: false,
    });
    if (cfgErr) throw cfgErr;

    return { tenant_id: tid };
  });

export const getTenantConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ tenant_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cfg, error } = await supabase
      .from("tenant_config")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .maybeSingle();
    if (error) throw error;
    return cfg;
  });

const updateConfigSchema = z.object({
  tenant_id: z.string().uuid(),
  min_daily_rest_hrs: z.number().min(0).max(48).optional(),
  max_weekly_work_hrs: z.number().min(0).max(168).optional(),
  min_weekly_rest_hrs: z.number().min(0).max(168).optional(),
  weekly_avg_ref_period_wks: z.number().int().min(1).max(52).optional(),
  overtime_threshold_mth_minutes: z.number().int().min(0).optional(),
  forbidden_sequence_matrix: z.record(z.string(), z.array(z.string())).optional(),
  night_shift_window: z
    .object({ start: z.string(), end: z.string() })
    .optional(),
  auto_approval_peer_swap: z.boolean().optional(),
});

export const updateTenantConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => updateConfigSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { tenant_id, ...patch } = data;
    const { supabase } = context;
    const { error } = await supabase.from("tenant_config").update(patch).eq("tenant_id", tenant_id);
    if (error) throw error;
    return { ok: true };
  });

export interface TenantAdminDTO {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  member_count: number;
}

export const listAllTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TenantAdminDTO[]> => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("list_all_tenants");
    if (error) throw error;
    return (data ?? []) as TenantAdminDTO[];
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      tenant_id: z.string().uuid(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("delete_tenant", { _tenant_id: data.tenant_id });
    if (error) throw error;
    return { ok: true };
  });
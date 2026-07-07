import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PendingRequestDTO {
  id: string;
  user_id: string;
  email: string | null;
  request_type: "tenant_join" | "shift_change" | "leave_request";
  payload: Record<string, string>;
  created_at: string;
}

export interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

export const createTenantJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string> => {
    const { supabase } = context;
    const { data, error } = await (
      supabase.rpc as unknown as (
        name: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>
    )("create_tenant_join_request", {});
    if (error) throw error;
    return data as string;
  });

export const listPendingRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PendingRequestDTO[]> => {
    const { supabase } = context;
    const { data, error } = await (
      supabase.rpc as unknown as (
        name: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>
    )("list_pending_requests", { p_request_type: null });
    if (error) throw error;
    return (data ?? []) as PendingRequestDTO[];
  });

export const listTenantsForApproval = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TenantOption[]> => {
    const { supabase } = context;
    const { data, error } = await (
      supabase.rpc as unknown as (
        name: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>
    )("list_tenants_for_approval", {});
    if (error) throw error;
    return (data ?? []) as TenantOption[];
  });

const approveRequestSchema = z.object({
  requestId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(["owner", "manager", "planner", "staff", "viewer"]),
  departmentId: z.string().uuid().optional(),
});

export const approvePendingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => approveRequestSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await (
      supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>
    )("approve_pending_request", {
      p_request_id: data.requestId,
      p_tenant_id: data.tenantId,
      p_role: data.role,
      p_department_id: data.departmentId ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

const declineRequestSchema = z.object({
  requestId: z.string().uuid(),
});

export const declinePendingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => declineRequestSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await (
      supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>
    )("decline_pending_request", {
      p_request_id: data.requestId,
    });
    if (error) throw error;
    return { ok: true };
  });

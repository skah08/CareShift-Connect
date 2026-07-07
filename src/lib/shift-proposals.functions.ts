import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ShiftProposalDTO {
  id: string;
  employee_id: string;
  employee_name: string;
  department_id: string;
  department_name: string;
  shift_template_id: string | null;
  shift_code: string | null;
  shift_date: string;
  actual_start_timestamp: string;
  actual_end_timestamp: string;
  coverage_type: string;
  notes: string | null;
  created_at: string;
}

export const listPendingShiftProposals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ tenant_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await (supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>)("list_pending_shift_proposals", {
      p_tenant_id: data.tenant_id,
    });
    if (error) throw error;
    return (rows ?? []) as ShiftProposalDTO[];
  });

export const approveShiftProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      assignment_id: z.string().uuid(),
      review_notes: z.string().optional(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await (supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>)("approve_shift_proposal", {
      p_assignment_id: data.assignment_id,
      p_review_notes: data.review_notes ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const rejectShiftProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ assignment_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await (supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>)("reject_shift_proposal", {
      p_assignment_id: data.assignment_id,
    });
    if (error) throw error;
    return { ok: true };
  });

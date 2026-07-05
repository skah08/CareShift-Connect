import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// List swaps involving me (either side) within a tenant.
export const listSwaps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ tenant_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("shift_swaps")
      .select(
        "id, status, created_at, requester_assignment_id, target_assignment_id, requester_employee_id, target_employee_id",
      )
      .eq("tenant_id", data.tenant_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

// Propose a peer-to-peer swap.
export const proposeSwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        requester_assignment_id: z.string().uuid(),
        target_assignment_id: z.string().uuid(),
        notes: z.string().max(500).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: reqA, error: e1 } = await supabase
      .from("shift_assignments")
      .select("id, employee_id, tenant_id")
      .eq("id", data.requester_assignment_id)
      .eq("tenant_id", data.tenant_id)
      .single();
    if (e1) throw e1;
    const { data: tgtA, error: e2 } = await supabase
      .from("shift_assignments")
      .select("id, employee_id, tenant_id")
      .eq("id", data.target_assignment_id)
      .eq("tenant_id", data.tenant_id)
      .single();
    if (e2) throw e2;

    const { data: row, error } = await supabase
      .from("shift_swaps")
      .insert({
        tenant_id: data.tenant_id,
        requester_assignment_id: reqA.id,
        target_assignment_id: tgtA.id,
        requester_employee_id: reqA.employee_id,
        target_employee_id: tgtA.employee_id,
        status: "Pending_Peer",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

// Peer response (accept/decline) — manager approval handled separately.
export const respondSwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        swap_id: z.string().uuid(),
        decision: z.enum(["accept", "decline"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const nextStatus: "Pending_Manager" | "Declined" =
      data.decision === "accept" ? "Pending_Manager" : "Declined";
    const { error } = await context.supabase
      .from("shift_swaps")
      .update({ status: nextStatus })
      .eq("id", data.swap_id)
      .eq("tenant_id", data.tenant_id);
    if (error) throw error;
    return { status: nextStatus };
  });

// Manager approval → run compliance re-check on both legs, then swap employee_ids atomically.
export const approveSwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ tenant_id: z.string().uuid(), swap_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { evaluate } = await import("@/lib/compliance/engine.server");
    const { loadEvaluationContext } = await import("@/lib/compliance/loader.server");

    const { data: swap, error } = await supabase
      .from("shift_swaps")
      .select(
        "id, tenant_id, status, requester_assignment_id, target_assignment_id, requester_employee_id, target_employee_id",
      )
      .eq("id", data.swap_id)
      .eq("tenant_id", data.tenant_id)
      .single();
    if (error) throw error;
    if (swap.status !== "Pending_Manager") {
      return { ok: false as const, reason: "invalid_status" };
    }

    const [{ data: legA }, { data: legB }] = await Promise.all([
      supabase
        .from("shift_assignments")
        .select("id, actual_start_timestamp, actual_end_timestamp, shift_template_id")
        .eq("id", swap.requester_assignment_id)
        .single(),
      supabase
        .from("shift_assignments")
        .select("id, actual_start_timestamp, actual_end_timestamp, shift_template_id")
        .eq("id", swap.target_assignment_id ?? "")
        .single(),
    ]);
    if (!legA || !legB) return { ok: false as const, reason: "missing_legs" };

    const evalPair = async (
      leg: typeof legA,
      newEmployee: string,
      ignoreId: string,
    ) => {
      const ctx = await loadEvaluationContext(supabase, data.tenant_id, {
        employee_id: newEmployee,
        shift_template_id: leg.shift_template_id,
        shift_code: null,
        actual_start_timestamp: leg.actual_start_timestamp,
        actual_end_timestamp: leg.actual_end_timestamp,
        ignore_assignment_id: ignoreId,
      });
      return evaluate(ctx);
    };

    const [reportA, reportB] = await Promise.all([
      evalPair(legA, swap.target_employee_id, legA.id),
      evalPair(legB, swap.requester_employee_id, legB.id),
    ]);

    if (!reportA.ok || !reportB.ok) {
      return { ok: false as const, reason: "compliance", reportA, reportB };
    }

    // Perform swap
    const { error: u1 } = await supabase
      .from("shift_assignments")
      .update({ employee_id: swap.target_employee_id })
      .eq("id", legA.id);
    if (u1) throw u1;
    const { error: u2 } = await supabase
      .from("shift_assignments")
      .update({ employee_id: swap.requester_employee_id })
      .eq("id", legB.id);
    if (u2) throw u2;

    const { error: u3 } = await supabase
      .from("shift_swaps")
      .update({ status: "Approved" })
      .eq("id", swap.id);
    if (u3) throw u3;

    return { ok: true as const };
  });
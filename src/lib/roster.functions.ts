import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ComplianceReport } from "@/lib/compliance/types";

// ---------- LIST ROSTER FOR A RANGE ---------------------------------

const listRosterSchema = z.object({
  tenant_id: z.string().uuid(),
  from: z.string(),
  to: z.string(),
  department_id: z.string().uuid().optional(),
});

export const listRosterRange = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => listRosterSchema.parse(raw))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("shift_assignments")
      .select(
        "id, employee_id, department_id, shift_template_id, shift_date, actual_start_timestamp, actual_end_timestamp, assignment_status, coverage_type, notes, employees(first_name, last_name, primary_role), shift_templates(shift_code, is_night_shift), departments(department_name, color_code)"
      )
      .eq("tenant_id", data.tenant_id)
      .gte("actual_start_timestamp", data.from)
      .lte("actual_start_timestamp", data.to)
      .order("actual_start_timestamp", { ascending: true });
    if (data.department_id) q = q.eq("department_id", data.department_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

// ---------- EVALUATE (dry-run) --------------------------------------

const evaluateSchema = z.object({
  tenant_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  shift_template_id: z.string().uuid().nullable().optional(),
  actual_start_timestamp: z.string(),
  actual_end_timestamp: z.string(),
  required_skill_ids: z.array(z.string().uuid()).optional(),
  ignore_assignment_id: z.string().uuid().optional(),
});

async function runEvaluation(
  supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>,
  tenantId: string,
  input: z.infer<typeof evaluateSchema>,
): Promise<ComplianceReport> {
  const { evaluate } = await import("@/lib/compliance/engine.server");
  const { loadEvaluationContext } = await import("@/lib/compliance/loader.server");

  let shift_code: string | null = null;
  if (input.shift_template_id) {
    const { data: tmpl, error } = await supabase
      .from("shift_templates")
      .select("shift_code")
      .eq("id", input.shift_template_id)
      .maybeSingle();
    if (error) throw error;
    shift_code = tmpl?.shift_code ?? null;
  }

  const ctx = await loadEvaluationContext(supabase, tenantId, {
    employee_id: input.employee_id,
    shift_template_id: input.shift_template_id ?? null,
    shift_code,
    actual_start_timestamp: input.actual_start_timestamp,
    actual_end_timestamp: input.actual_end_timestamp,
    required_skill_ids: input.required_skill_ids,
    ignore_assignment_id: input.ignore_assignment_id,
  });
  return evaluate(ctx);
}

export const evaluateAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => evaluateSchema.parse(raw))
  .handler(async ({ data, context }) => runEvaluation(context.supabase, data.tenant_id, data));

// ---------- CREATE / UPDATE ASSIGNMENT ------------------------------

const upsertAssignmentSchema = z.object({
  tenant_id: z.string().uuid(),
  id: z.string().uuid().optional(),
  employee_id: z.string().uuid(),
  department_id: z.string().uuid(),
  shift_template_id: z.string().uuid().nullable().optional(),
  shift_date: z.string(),
  actual_start_timestamp: z.string(),
  actual_end_timestamp: z.string(),
  coverage_type: z
    .enum(["Regular_Shift", "On_Call_Active", "On_Call_Passive", "Mandatory_Overtime"])
    .default("Regular_Shift"),
  required_skill_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().max(500).optional().nullable(),
  force: z.boolean().default(false), // allow save with soft warnings; hard always blocks
});

export const upsertAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => upsertAssignmentSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const report = await runEvaluation(supabase, data.tenant_id, {
      tenant_id: data.tenant_id,
      employee_id: data.employee_id,
      shift_template_id: data.shift_template_id ?? null,
      actual_start_timestamp: data.actual_start_timestamp,
      actual_end_timestamp: data.actual_end_timestamp,
      required_skill_ids: data.required_skill_ids,
      ignore_assignment_id: data.id,
    });

    if (!report.ok) {
      return { ok: false as const, report };
    }

    const payload = {
      employee_id: data.employee_id,
      department_id: data.department_id,
      shift_template_id: data.shift_template_id ?? null,
      shift_date: data.shift_date,
      actual_start_timestamp: data.actual_start_timestamp,
      actual_end_timestamp: data.actual_end_timestamp,
      coverage_type: data.coverage_type,
      notes: data.notes ?? null,
    };

    if (data.id) {
      const { error } = await supabase
        .from("shift_assignments")
        .update(payload)
        .eq("id", data.id)
        .eq("tenant_id", data.tenant_id);
      if (error) throw error;
      return { ok: true as const, report, id: data.id };
    }
    const { data: row, error } = await supabase
      .from("shift_assignments")
      .insert({ ...payload, tenant_id: data.tenant_id })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, report, id: row.id };
  });

// ---------- DELETE --------------------------------------------------

export const deleteAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ tenant_id: z.string().uuid(), id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shift_assignments")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenant_id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- FIND REPLACEMENTS (sick-leave dispatch) -----------------

const findReplacementsSchema = z.object({
  tenant_id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  required_skill_ids: z.array(z.string().uuid()).optional(),
});

export interface ReplacementCandidate {
  employee_id: string;
  first_name: string;
  last_name: string;
  primary_role: string;
  ok: boolean;
  hard_violation_codes: string[];
  soft_violation_codes: string[];
  overtime_score: number;
}

export const findReplacements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => findReplacementsSchema.parse(raw))
  .handler(async ({ data, context }): Promise<ReplacementCandidate[]> => {
    const { supabase } = context;
    const { data: assignment, error } = await supabase
      .from("shift_assignments")
      .select("id, tenant_id, department_id, actual_start_timestamp, actual_end_timestamp, employee_id, employees(primary_role)")
      .eq("id", data.assignment_id)
      .eq("tenant_id", data.tenant_id)
      .maybeSingle();
    if (error) throw error;
    if (!assignment) return [];

    const originalRole = (assignment.employees as { primary_role: string } | null)?.primary_role;
    if (!originalRole) return [];

    const { data: candidates, error: candErr } = await supabase
      .from("employees")
      .select("id, first_name, last_name, primary_role, accumulated_overtime_month")
      .eq("tenant_id", data.tenant_id)
      .is("termination_date", null)
      .eq("primary_role", originalRole as "Nurse_RN")
      .neq("id", assignment.employee_id);
    if (candErr) throw candErr;

    const results: ReplacementCandidate[] = [];
    for (const c of candidates ?? []) {
      const report = await runEvaluation(supabase, data.tenant_id, {
        tenant_id: data.tenant_id,
        employee_id: c.id,
        shift_template_id: null,
        actual_start_timestamp: assignment.actual_start_timestamp,
        actual_end_timestamp: assignment.actual_end_timestamp,
        required_skill_ids: data.required_skill_ids,
      });
      results.push({
        employee_id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        primary_role: c.primary_role,
        ok: report.ok,
        hard_violation_codes: report.hardViolations.map((v) => v.code),
        soft_violation_codes: report.softViolations.map((v) => v.code),
        overtime_score: c.accumulated_overtime_month ?? 0,
      });
    }

    // Order: compliant first, then by lowest overtime (fairness proxy)
    results.sort((a, b) => {
      if (a.ok !== b.ok) return a.ok ? -1 : 1;
      return a.overtime_score - b.overtime_score;
    });
    return results;
  });
// Server-only: loads compliance context from Supabase for a given assignment.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  AssignmentWindow,
  EvaluateAssignmentInput,
  TenantComplianceConfig,
} from "./types";
import type { EmployeeSkillRow, EvaluationContext } from "./engine.server";

const WINDOW_DAYS = 10; // ± days around the target shift

export async function loadEvaluationContext(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: EvaluateAssignmentInput,
): Promise<EvaluationContext> {
  const targetStart = new Date(input.actual_start_timestamp).getTime();
  const windowStart = new Date(targetStart - WINDOW_DAYS * 86_400_000).toISOString();
  const windowEnd = new Date(targetStart + WINDOW_DAYS * 86_400_000).toISOString();

  const [configRes, assignmentsRes, skillsRes] = await Promise.all([
    supabase.from("tenant_config").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase
      .from("shift_assignments")
      .select("id, employee_id, department_id, shift_template_id, actual_start_timestamp, actual_end_timestamp, shift_templates(shift_code)")
      .eq("employee_id", input.employee_id)
      .gte("actual_end_timestamp", windowStart)
      .lte("actual_start_timestamp", windowEnd),
    supabase
      .from("employee_skills")
      .select("skill_id, certification_expiry_date")
      .eq("employee_id", input.employee_id),
  ]);

  if (configRes.error) throw configRes.error;
  if (!configRes.data) throw new Error(`Missing tenant_config for tenant ${tenantId}`);
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (skillsRes.error) throw skillsRes.error;

  const cfg = configRes.data;
  const config: TenantComplianceConfig = {
    min_daily_rest_hrs: Number(cfg.min_daily_rest_hrs),
    max_weekly_work_hrs: Number(cfg.max_weekly_work_hrs),
    min_weekly_rest_hrs: Number(cfg.min_weekly_rest_hrs),
    forbidden_sequence_matrix: (cfg.forbidden_sequence_matrix ?? {}) as Record<string, string[]>,
    night_shift_window: (cfg.night_shift_window ?? { start: "22:00", end: "06:00" }) as { start: string; end: string },
    auto_approval_peer_swap: cfg.auto_approval_peer_swap,
  };

  const employeeAssignments: AssignmentWindow[] = (assignmentsRes.data ?? []).map((row) => {
    const tmpl = row.shift_templates as { shift_code: string } | null;
    return {
      id: row.id,
      employee_id: row.employee_id,
      department_id: row.department_id,
      shift_template_id: row.shift_template_id,
      actual_start_timestamp: row.actual_start_timestamp,
      actual_end_timestamp: row.actual_end_timestamp,
      shift_code: tmpl?.shift_code ?? null,
    };
  });

  const employeeSkills: EmployeeSkillRow[] = (skillsRes.data ?? []).map((r) => ({
    skill_id: r.skill_id,
    certification_expiry_date: r.certification_expiry_date,
  }));

  return { input, config, employeeAssignments, employeeSkills };
}
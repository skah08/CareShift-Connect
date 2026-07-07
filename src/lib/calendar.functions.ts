import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Assignment = Database["public"]["Tables"]["shift_assignments"]["Row"] & {
  employees: { first_name: string; last_name: string; primary_role: string } | null;
  shift_templates: { shift_code: string; is_night_shift: boolean } | null;
  departments: { department_name: string; color_code: string } | null;
};

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type EmployeeDept = { employee_id: string; department_id: string; is_primary: boolean };

const inputSchema = z.object({
  tenant_id: z.string().uuid(),
  view_from: z.string(),
  view_to: z.string(),
});

async function getUserDeptFilter(
  supabase: any,
  userId: string,
  tenantId: string,
): Promise<{ allowedDeptIds: string[]; employeeId: string } | null> {
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (adminRole) return null;

  const empRes = await supabase
    .from("employees")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!empRes.data) return null;

  const edRes = await supabase
    .from("employee_departments")
    .select("department_id")
    .eq("employee_id", empRes.data.id);

  const deptIds = (edRes.data ?? []).map((d: { department_id: string }) => d.department_id);
  if (deptIds.length === 0) return null;

  return { allowedDeptIds: deptIds, employeeId: empRes.data.id };
}

export const getCalendarPageData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { tenant_id, view_from, view_to } = data;

    const deptIds = (
      await supabase.from("departments").select("id").eq("tenant_id", tenant_id)
    ).data?.map((d: { id: string }) => d.id) ?? [];

    const [employeesRes, departmentsRes, templatesRes, rosterRes, leavesRes, deptRes] =
      await Promise.all([
        supabase.from("employees").select("*").eq("tenant_id", tenant_id),
        supabase.from("departments").select("*").eq("tenant_id", tenant_id).order("department_name"),
        supabase.from("shift_templates").select("*").eq("tenant_id", tenant_id),
        supabase
          .from("shift_assignments")
          .select(
            "id, employee_id, department_id, shift_template_id, shift_date, actual_start_timestamp, actual_end_timestamp, assignment_status, coverage_type, notes, employees(first_name, last_name, primary_role), shift_templates(shift_code, is_night_shift), departments(department_name, color_code)",
          )
          .eq("tenant_id", tenant_id)
          .gte("actual_start_timestamp", view_from)
          .lte("actual_start_timestamp", view_to)
          .order("actual_start_timestamp", { ascending: true }),
        supabase
          .from("leaves")
          .select("*")
          .eq("tenant_id", tenant_id)
          .gte("start_date", view_from.slice(0, 10))
          .lte("end_date", view_to.slice(0, 10))
          .order("start_date", { ascending: true }),
        deptIds.length > 0
          ? supabase
              .from("employee_departments")
              .select("employee_id, department_id, is_primary")
              .in("department_id", deptIds)
          : { data: [] },
      ]);

    let employees = (employeesRes.data ?? []) as Employee[];
    let departments = (departmentsRes.data ?? []) as Database["public"]["Tables"]["departments"]["Row"][];
    let roster = (rosterRes.data ?? []) as Assignment[];
    let leaves = (leavesRes.data ?? []) as Array<{
      id: string; tenant_id: string; employee_id: string;
      start_date: string; end_date: string;
      leave_type: string; status: string; reason: string | null;
      created_at: string; updated_at: string;
    }>;
    let employeeDepartments = ((deptRes as any)?.data ?? []) as EmployeeDept[];

    const filter = await getUserDeptFilter(supabase, context.userId, tenant_id);
    if (filter) {
      const { allowedDeptIds, employeeId } = filter;
      const deptSet = new Set(allowedDeptIds);
      const empIdsInDepts = new Set(
        employeeDepartments
          .filter((ed) => deptSet.has(ed.department_id))
          .map((ed) => ed.employee_id),
      );
      empIdsInDepts.add(employeeId);

      employees = employees.filter((e) => empIdsInDepts.has(e.id));
      departments = departments.filter((d) => deptSet.has(d.id));
      roster = roster.filter((a) => a.department_id && deptSet.has(a.department_id));
      leaves = leaves.filter((l) => empIdsInDepts.has(l.employee_id));
      employeeDepartments = employeeDepartments.filter((ed) => deptSet.has(ed.department_id));
    }

    return {
      employees,
      departments,
      templates: (templatesRes.data ?? []) as Database["public"]["Tables"]["shift_templates"]["Row"][],
      roster,
      leaves,
      employeeDepartments,
    };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Assignment = Database["public"]["Tables"]["shift_assignments"]["Row"] & {
  employees: { first_name: string; last_name: string; primary_role: string } | null;
  shift_templates: { shift_code: string; is_night_shift: boolean } | null;
  departments: { department_name: string; color_code: string } | null;
};

const inputSchema = z.object({
  tenant_id: z.string().uuid(),
  week_from: z.string(),
  week_to: z.string(),
});

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { tenant_id, week_from, week_to } = data;

    const deptIds = (
      await supabase.from("departments").select("id").eq("tenant_id", tenant_id)
    ).data?.map((d: { id: string }) => d.id) ?? [];

    const [employeesRes, departmentsRes, rosterRes, leavesRes, deptRes, permsRes] =
      await Promise.all([
        supabase.from("employees").select("*").eq("tenant_id", tenant_id),
        supabase.from("departments").select("*").eq("tenant_id", tenant_id).order("department_name"),
        supabase
          .from("shift_assignments")
          .select(
            "id, employee_id, department_id, shift_template_id, shift_date, actual_start_timestamp, actual_end_timestamp, assignment_status, coverage_type, notes, employees(first_name, last_name, primary_role), shift_templates(shift_code, is_night_shift), departments(department_name, color_code)",
          )
          .eq("tenant_id", tenant_id)
          .gte("actual_start_timestamp", week_from)
          .lte("actual_start_timestamp", week_to)
          .order("actual_start_timestamp", { ascending: true }),
        supabase
          .from("leaves")
          .select("*")
          .eq("tenant_id", tenant_id)
          .gte("start_date", week_from.slice(0, 10))
          .lte("end_date", week_to.slice(0, 10))
          .order("start_date", { ascending: true }),
        deptIds.length > 0
          ? supabase
              .from("employee_departments")
              .select("employee_id, department_id, is_primary")
              .in("department_id", deptIds)
          : { data: [] },
        supabase
          .from("user_permissions")
          .select("user_id, permission_key")
          .eq("tenant_id", tenant_id),
      ]);

    return {
      employees: (employeesRes.data ?? []) as Database["public"]["Tables"]["employees"]["Row"][],
      departments: (departmentsRes.data ?? []) as Database["public"]["Tables"]["departments"]["Row"][],
      roster: (rosterRes.data ?? []) as Assignment[],
      leaves: (leavesRes.data ?? []) as Array<{
        id: string; tenant_id: string; employee_id: string;
        start_date: string; end_date: string;
        leave_type: string; status: string; reason: string | null;
        created_at: string; updated_at: string;
      }>,
      employeeDepartments: ((deptRes as any)?.data ?? []) as Array<{
        employee_id: string; department_id: string; is_primary: boolean;
      }>,
      permissions: (permsRes.data ?? []) as Array<{
        user_id: string; permission_key: string;
      }>,
    };
  });

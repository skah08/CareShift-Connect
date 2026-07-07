import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

type EmployeeDept = { employee_id: string; department_id: string; is_primary: boolean };

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

const primaryRoles = [
  "Physician_Attending",
  "Physician_Resident",
  "Nurse_Manager",
  "Nurse_RN",
  "Nurse_Aide",
  "Midwife",
  "Surgeon",
  "Anesthesiologist",
  "Pediatrician",
  "Psychologist",
  "Physiotherapist",
  "Lab_Technician",
  "Radiology_Technician",
] as const;

const contractTypes = ["Full_Time", "Part_Time", "Freelancer_Locum", "External_Consultant"] as const;

const sortKeys = ["name", "role", "contract", "fte"] as const;
type SortKey = (typeof sortKeys)[number];

const sortColumnMap: Record<SortKey, string> = {
  name: "last_name",
  role: "primary_role",
  contract: "contract_type",
  fte: "fte_factor",
};

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      tenant_id: z.string().uuid(),
      search: z.string().optional(),
      role_filter: z.array(z.string()).optional(),
      contract_filter: z.array(z.string()).optional(),
      sort_key: z.enum(sortKeys).optional().default("name"),
      sort_dir: z.enum(["asc", "desc"]).optional().default("asc"),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: rows, error } = await supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", data.tenant_id);
    if (error) throw error;

    let result: Employee[] = rows ?? [];

    const filter = await getUserDeptFilter(supabase, context.userId, data.tenant_id);
    if (filter) {
      const { allowedDeptIds, employeeId } = filter;
      const deptSet = new Set(allowedDeptIds);
      const empIdsInDepts = new Set<string>();

      const { data: allEd } = await supabase
        .from("employee_departments")
        .select("employee_id, department_id")
        .in("department_id", allowedDeptIds);

      for (const ed of (allEd ?? []) as EmployeeDept[]) {
        if (deptSet.has(ed.department_id)) empIdsInDepts.add(ed.employee_id);
      }
      empIdsInDepts.add(employeeId);

      result = result.filter((e) => empIdsInDepts.has(e.id));
    }

    if (data.search) {
      const q = data.search.toLowerCase().trim();
      result = result.filter(
        (e: any) => `${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(q),
      );
    }

    if (data.role_filter && data.role_filter.length > 0) {
      result = result.filter((e: any) => data.role_filter!.includes(e.primary_role));
    }

    if (data.contract_filter && data.contract_filter.length > 0) {
      result = result.filter((e: any) => data.contract_filter!.includes(e.contract_type ?? ""));
    }

    const col = sortColumnMap[data.sort_key] ?? "last_name";
    result.sort((a: any, b: any) => {
      const av = String(a[col] ?? "");
      const bv = String(b[col] ?? "");
      const cmp = col === "fte_factor"
        ? (Number(a[col] ?? 0) - Number(b[col] ?? 0))
        : av.localeCompare(bv);
      return data.sort_dir === "desc" ? -cmp : cmp;
    });

    return result;
  });

const upsertEmployeeSchema = z.object({
  tenant_id: z.string().uuid(),
  id: z.string().uuid().optional(),
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  email: z.string().email(),
  tax_id: z.string().max(40).optional().nullable(),
  primary_role: z.enum(primaryRoles),
  contract_type: z.enum(contractTypes).default("Full_Time"),
  fte_factor: z.number().min(0.1).max(1).default(1),
  hire_date: z.string().optional(),
  termination_date: z.string().nullable().optional(),
});

export const listEmployeeDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      tenant_id: z.string().uuid(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("employee_departments")
      .select("employee_id, department_id, is_primary")
      .in(
        "department_id",
        (
          await context.supabase
            .from("departments")
            .select("id")
            .eq("tenant_id", data.tenant_id)
        ).data?.map((d) => d.id) ?? [],
      );
    if (error) throw error;
    return rows as {
      employee_id: string;
      department_id: string;
      is_primary: boolean;
    }[];
  });

export const upsertEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => upsertEmployeeSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.id) {
      const { error } = await supabase
        .from("employees")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          tax_id: data.tax_id ?? null,
          primary_role: data.primary_role,
          contract_type: data.contract_type,
          fte_factor: data.fte_factor,
          termination_date: data.termination_date ?? null,
        })
        .eq("id", data.id)
        .eq("tenant_id", data.tenant_id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("employees")
      .insert({
        tenant_id: data.tenant_id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        tax_id: data.tax_id ?? null,
        primary_role: data.primary_role,
        contract_type: data.contract_type,
        fte_factor: data.fte_factor,
        hire_date: data.hire_date ?? new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const setEmployeeDepartments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      employee_id: z.string().uuid(),
      department_ids: z.array(z.string().uuid()),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { employee_id, department_ids } = data;

    const { error: delError } = await supabase
      .from("employee_departments")
      .delete()
      .eq("employee_id", employee_id);
    if (delError) throw delError;

    if (department_ids.length === 0) return;

    const rows = department_ids.map((department_id, i) => ({
      employee_id,
      department_id,
      is_primary: i === 0,
    }));
    const { error: insError } = await supabase
      .from("employee_departments")
      .insert(rows);
    if (insError) throw insError;
  });
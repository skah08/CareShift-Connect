import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ tenant_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("departments")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("department_name", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

const upsertDepartmentSchema = z.object({
  tenant_id: z.string().uuid(),
  id: z.string().uuid().optional(),
  department_name: z.string().min(1).max(120),
  cost_center_code: z.string().max(40).optional().nullable(),
  color_code: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#3b82f6"),
  min_staffing_requirements: z.record(z.string(), z.record(z.string(), z.number())).default({}),
});

export const upsertDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => upsertDepartmentSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const payload = {
      department_name: data.department_name,
      cost_center_code: data.cost_center_code ?? null,
      color_code: data.color_code,
      min_staffing_requirements: data.min_staffing_requirements,
    };
    if (data.id) {
      const { error } = await supabase
        .from("departments")
        .update(payload)
        .eq("id", data.id)
        .eq("tenant_id", data.tenant_id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("departments")
      .insert({ ...payload, tenant_id: data.tenant_id })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });
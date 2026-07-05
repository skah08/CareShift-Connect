import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const leaveTypes = ["Annual", "Sick", "Personal", "Other"] as const;
const leaveStatuses = ["Approved", "Pending", "Declined"] as const;

export interface LeaveRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export const listLeaves = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      tenant_id: z.string().uuid(),
      from: z.string(),
      to: z.string(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("leaves")
      .select("*")
      .eq("tenant_id", data.tenant_id);
    if (error) throw error;
    const all = (rows ?? []) as LeaveRow[];
    const inRange = all.filter(
      (r) => r.start_date <= data.to && r.end_date >= data.from,
    );
    return inRange.sort((a, b) => a.start_date.localeCompare(b.start_date));
  });

const upsertLeaveSchema = z.object({
  id: z.string().optional(),
  tenant_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
  leave_type: z.enum(leaveTypes),
  reason: z.string().max(500).optional().default(""),
});

export const upsertLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => upsertLeaveSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const payload: Record<string, unknown> = {
      tenant_id: data.tenant_id,
      employee_id: data.employee_id,
      start_date: data.start_date,
      end_date: data.end_date,
      leave_type: data.leave_type,
      status: "Approved",
      reason: data.reason || null,
    };

    if (data.id) {
      const { error } = await supabase
        .from("leaves")
        .update(payload)
        .eq("id", data.id)
        .eq("tenant_id", data.tenant_id);
      if (error) throw error;
      return { id: data.id };
    }

    const { data: row, error } = await supabase
      .from("leaves")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const deleteLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), tenant_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("leaves")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenant_id);
    if (error) throw error;
    return { success: true };
  });

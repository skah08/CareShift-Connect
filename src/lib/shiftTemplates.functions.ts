import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listShiftTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ tenant_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("shift_templates")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("shift_code", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

const timeStr = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);
const upsertSchema = z.object({
  tenant_id: z.string().uuid(),
  id: z.string().uuid().optional(),
  shift_code: z.string().min(1).max(10),
  start_time: timeStr,
  end_time: timeStr,
  is_night_shift: z.boolean().default(false),
  allocated_break_minutes: z.number().int().min(0).max(240).default(0),
});

export const upsertShiftTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => upsertSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const payload = {
      shift_code: data.shift_code,
      start_time: data.start_time,
      end_time: data.end_time,
      is_night_shift: data.is_night_shift,
      allocated_break_minutes: data.allocated_break_minutes,
    };
    if (data.id) {
      const { error } = await supabase
        .from("shift_templates")
        .update(payload)
        .eq("id", data.id)
        .eq("tenant_id", data.tenant_id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("shift_templates")
      .insert({ ...payload, tenant_id: data.tenant_id })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const deleteShiftTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), tenant_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("shift_templates")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenant_id);
    if (error) throw error;
    return { ok: true };
  });
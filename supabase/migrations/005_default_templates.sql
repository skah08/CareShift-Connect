-- 005: Default shift templates (7-shift model) and updated RPC
-- Run this in Supabase SQL Editor after 004_add_roles.sql

-- Update create_tenant_with_owner to also insert default templates and config
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(_name TEXT, _slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  INSERT INTO public.tenants(name, slug) VALUES (_name, _slug) RETURNING id INTO new_id;
  INSERT INTO public.tenant_members(tenant_id, user_id, role) VALUES (new_id, auth.uid(), 'owner');

  -- Default shift templates (7-shift model with short codes, translated in UI)
  INSERT INTO public.shift_templates (tenant_id, shift_code, start_time, end_time, is_night_shift, allocated_break_minutes) VALUES
    (new_id, 'M',   '07:00', '14:00', false, 30),
    (new_id, 'P',   '14:00', '21:00', false, 30),
    (new_id, 'N',   '21:00', '07:00', true,  45),
    (new_id, 'G',   '08:00', '16:00', false, 30),
    (new_id, 'TL',  '07:00', '19:00', false, 60),
    (new_id, 'TLN', '19:00', '07:00', true,  60),
    (new_id, 'I',   '10:00', '17:00', false, 30);

  -- Default tenant_config with EU-compliant defaults
  INSERT INTO public.tenant_config (tenant_id, min_daily_rest_hrs, max_weekly_work_hrs, min_weekly_rest_hrs, forbidden_sequence_matrix, night_shift_window, auto_approval_peer_swap)
  VALUES (new_id, 11, 48, 35, '{"N":["M","P","G","I","TL"]}'::jsonb, '{"start":"22:00","end":"06:00"}'::jsonb, false);

  RETURN new_id;
END;
$$;

-- Migrate existing tenants to the 7-shift model
-- San Camillo
UPDATE public.shift_templates SET shift_code='M',  start_time='07:00', end_time='14:00', is_night_shift=false, allocated_break_minutes=30  WHERE id='e0000000-0000-4000-0000-000000000001' AND tenant_id='a0000000-0000-4000-0000-000000000001';
UPDATE public.shift_templates SET shift_code='P',  start_time='14:00', end_time='21:00', is_night_shift=false, allocated_break_minutes=30  WHERE id='e0000000-0000-4000-0000-000000000002' AND tenant_id='a0000000-0000-4000-0000-000000000001';
UPDATE public.shift_templates SET shift_code='N',  start_time='21:00', end_time='07:00', is_night_shift=true,  allocated_break_minutes=45  WHERE id='e0000000-0000-4000-0000-000000000003' AND tenant_id='a0000000-0000-4000-0000-000000000001';
UPDATE public.shift_templates SET shift_code='G',  start_time='08:00', end_time='16:00', is_night_shift=false, allocated_break_minutes=30  WHERE id='e0000000-0000-4000-0000-000000000004' AND tenant_id='a0000000-0000-4000-0000-000000000001';
UPDATE public.shift_templates SET shift_code='TL', start_time='07:00', end_time='19:00', is_night_shift=false, allocated_break_minutes=60  WHERE id='e0000000-0000-4000-0000-000000000005' AND tenant_id='a0000000-0000-4000-0000-000000000001';
-- New: TLN
INSERT INTO public.shift_templates (id, tenant_id, shift_code, start_time, end_time, is_night_shift, allocated_break_minutes)
VALUES ('e0000000-0000-4000-0000-000000000006', 'a0000000-0000-4000-0000-000000000001', 'TLN', '19:00', '07:00', true, 60)
ON CONFLICT (id) DO NOTHING;
-- New: I
INSERT INTO public.shift_templates (id, tenant_id, shift_code, start_time, end_time, is_night_shift, allocated_break_minutes)
VALUES ('e0000000-0000-4000-0000-000000000007', 'a0000000-0000-4000-0000-000000000001', 'I', '10:00', '17:00', false, 30)
ON CONFLICT (id) DO NOTHING;

-- Santa Maria Nuova
UPDATE public.shift_templates SET shift_code='M',  start_time='07:00', end_time='14:00', is_night_shift=false, allocated_break_minutes=30  WHERE id='e0000000-0000-4000-0000-000000000010' AND tenant_id='a0000000-0000-4000-0000-000000000002';
UPDATE public.shift_templates SET shift_code='P',  start_time='14:00', end_time='21:00', is_night_shift=false, allocated_break_minutes=30  WHERE id='e0000000-0000-4000-0000-000000000011' AND tenant_id='a0000000-0000-4000-0000-000000000002';
UPDATE public.shift_templates SET shift_code='N',  start_time='21:00', end_time='07:00', is_night_shift=true,  allocated_break_minutes=45  WHERE id='e0000000-0000-4000-0000-000000000012' AND tenant_id='a0000000-0000-4000-0000-000000000002';
UPDATE public.shift_templates SET shift_code='G',  start_time='08:00', end_time='16:00', is_night_shift=false, allocated_break_minutes=30  WHERE id='e0000000-0000-4000-0000-000000000013' AND tenant_id='a0000000-0000-4000-0000-000000000002';
UPDATE public.shift_templates SET shift_code='TL', start_time='07:00', end_time='19:00', is_night_shift=false, allocated_break_minutes=60  WHERE id='e0000000-0000-4000-0000-000000000014' AND tenant_id='a0000000-0000-4000-0000-000000000002';
-- New: TLN
INSERT INTO public.shift_templates (id, tenant_id, shift_code, start_time, end_time, is_night_shift, allocated_break_minutes)
VALUES ('e0000000-0000-4000-0000-000000000015', 'a0000000-0000-4000-0000-000000000002', 'TLN', '19:00', '07:00', true, 60)
ON CONFLICT (id) DO NOTHING;
-- New: I
INSERT INTO public.shift_templates (id, tenant_id, shift_code, start_time, end_time, is_night_shift, allocated_break_minutes)
VALUES ('e0000000-0000-4000-0000-000000000016', 'a0000000-0000-4000-0000-000000000002', 'I', '10:00', '17:00', false, 30)
ON CONFLICT (id) DO NOTHING;

-- Update existing tenant_config for new codes
UPDATE public.tenant_config
SET forbidden_sequence_matrix = '{"N":["M","P","G","I","TL"]}'::jsonb,
    min_weekly_rest_hrs = 35
WHERE tenant_id IN ('a0000000-0000-4000-0000-000000000001', 'a0000000-0000-4000-0000-000000000002');

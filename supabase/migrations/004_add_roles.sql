-- ⚠️ Run this in Supabase SQL Editor (not via db push), because
--    ALTER TYPE ... ADD VALUE cannot run inside a transaction block.

ALTER TYPE public.primary_role ADD VALUE IF NOT EXISTS 'Surgeon';
ALTER TYPE public.primary_role ADD VALUE IF NOT EXISTS 'Anesthesiologist';
ALTER TYPE public.primary_role ADD VALUE IF NOT EXISTS 'Pediatrician';
ALTER TYPE public.primary_role ADD VALUE IF NOT EXISTS 'Psychologist';
ALTER TYPE public.primary_role ADD VALUE IF NOT EXISTS 'Physiotherapist';
ALTER TYPE public.primary_role ADD VALUE IF NOT EXISTS 'Lab_Technician';
ALTER TYPE public.primary_role ADD VALUE IF NOT EXISTS 'Radiology_Technician';

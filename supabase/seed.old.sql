-- ============================================================
-- SEED DATI DI TEST - CareShift Connect
-- ============================================================
-- Istruzioni: esegui questo script dopo aver applicato tutte le
-- migrazioni. Crea 2 tenant (Ospedali) con dati realistici.
-- ============================================================

-- Disabilita triggers per velocizzare l'inserimento
SET session_replication_role = 'replica';

-- ============================================================
-- 1. TENANTS (Ospedali)
-- ============================================================
INSERT INTO public.tenants (id, name, slug, config) VALUES
  ('a0000000-0000-4000-0000-000000000001', 'Ospedale San Camillo', 'san-camillo', '{"timezone": "Europe/Rome", "week_starts_on": 1}'),
  ('a0000000-0000-4000-0000-000000000002', 'Ospedale Santa Maria Nuova', 'santa-maria-nuova', '{"timezone": "Europe/Rome", "week_starts_on": 1}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. UTENTI DI TEST (auth.users simulati)
-- ============================================================
-- NOTA: In produzione questi verrebbero creati da Supabase Auth.
-- Per il seed usiamo gli UUID reali come se fossero già registrati.
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role) VALUES
  -- Admin globale
  ('d0000000-0000-4000-0000-000000000001', 'admin@san-camillo.test', '', now(), '{}', '{"first_name": "Marco", "last_name": "Admin"}', now(), now(), 'authenticated'),
  -- Ospedale San Camillo
  ('d0000000-0000-4000-0000-000000000010', 'laura.bianchi@san-camillo.test', '', now(), '{}', '{"first_name": "Laura", "last_name": "Bianchi"}', now(), now(), 'authenticated'),
  ('d0000000-0000-4000-0000-000000000011', 'giuseppe.verdi@san-camillo.test', '', now(), '{}', '{"first_name": "Giuseppe", "last_name": "Verdi"}', now(), now(), 'authenticated'),
  ('d0000000-0000-4000-0000-000000000012', 'elena.ferrari@san-camillo.test', '', now(), '{}', '{"first_name": "Elena", "last_name": "Ferrari"}', now(), now(), 'authenticated'),
  ('d0000000-0000-4000-0000-000000000013', 'antonio.russo@san-camillo.test', '', now(), '{}', '{"first_name": "Antonio", "last_name": "Russo"}', now(), now(), 'authenticated'),
  ('d0000000-0000-4000-0000-000000000014', 'sofia.colombo@san-camillo.test', '', now(), '{}', '{"first_name": "Sofia", "last_name": "Colombo"}', now(), now(), 'authenticated'),
  -- Ospedale Santa Maria Nuova
  ('d0000000-0000-4000-0000-000000000020', 'francesco.romano@santamaria.test', '', now(), '{}', '{"first_name": "Francesco", "last_name": "Romano"}', now(), now(), 'authenticated'),
  ('d0000000-0000-4000-0000-000000000021', 'martina.ricci@santamaria.test', '', now(), '{}', '{"first_name": "Martina", "last_name": "Ricci"}', now(), now(), 'authenticated'),
  ('d0000000-0000-4000-0000-000000000022', 'roberto.marini@santamaria.test', '', now(), '{}', '{"first_name": "Roberto", "last_name": "Marini"}', now(), now(), 'authenticated'),
  ('d0000000-0000-4000-0000-000000000023', 'chiara.moretti@santamaria.test', '', now(), '{}', '{"first_name": "Chiara", "last_name": "Moretti"}', now(), now(), 'authenticated'),
  ('d0000000-0000-4000-0000-000000000024', 'alessandro.gallo@santamaria.test', '', now(), '{}', '{"first_name": "Alessandro", "last_name": "Gallo"}', now(), now(), 'authenticated'),
  ('d0000000-0000-4000-0000-000000000025', 'valentina.costa@santamaria.test', '', now(), '{}', '{"first_name": "Valentina", "last_name": "Costa"}', now(), now(), 'authenticated'),
  ('d0000000-0000-4000-0000-000000000026', 'stefano.conti@santamaria.test', '', now(), '{}', '{"first_name": "Stefano", "last_name": "Conti"}', now(), now(), 'authenticated'),
  ('d0000000-0000-4000-0000-000000000027', 'paola.barbieri@santamaria.test', '', now(), '{}', '{"first_name": "Paola", "last_name": "Barbieri"}', now(), now(), 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. USER ROLES (app-level)
-- ============================================================
INSERT INTO public.user_roles (user_id, role) VALUES
  ('d0000000-0000-4000-0000-000000000001', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================
-- 4. TENANT MEMBERS
-- ============================================================
INSERT INTO public.tenant_members (tenant_id, user_id, role) VALUES
  -- Admin su entrambi i tenant
  ('a0000000-0000-4000-0000-000000000001', 'd0000000-0000-4000-0000-000000000001', 'owner'),
  ('a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000001', 'owner'),
  -- San Camillo
  ('a0000000-0000-4000-0000-000000000001', 'd0000000-0000-4000-0000-000000000010', 'manager'),
  ('a0000000-0000-4000-0000-000000000001', 'd0000000-0000-4000-0000-000000000011', 'planner'),
  ('a0000000-0000-4000-0000-000000000001', 'd0000000-0000-4000-0000-000000000012', 'staff'),
  ('a0000000-0000-4000-0000-000000000001', 'd0000000-0000-4000-0000-000000000013', 'staff'),
  ('a0000000-0000-4000-0000-000000000001', 'd0000000-0000-4000-0000-000000000014', 'staff'),
  -- Santa Maria Nuova
  ('a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000020', 'manager'),
  ('a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000021', 'planner'),
  ('a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000022', 'staff'),
  ('a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000023', 'staff'),
  ('a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000024', 'staff'),
  ('a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000025', 'staff'),
  ('a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000026', 'staff'),
  ('a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000027', 'staff')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- ============================================================
-- 5. REPARTI (Ospedale San Camillo)
-- ============================================================
INSERT INTO public.departments (id, tenant_id, department_name, cost_center_code, color_code) VALUES
  ('b0000000-0000-4000-0000-000000000001', 'a0000000-0000-4000-0000-000000000001', 'Pronto Soccorso', 'PS-01', '#ef4444'),
  ('b0000000-0000-4000-0000-000000000002', 'a0000000-0000-4000-0000-000000000001', 'Cardiologia', 'CAR-02', '#f97316'),
  ('b0000000-0000-4000-0000-000000000003', 'a0000000-0000-4000-0000-000000000001', 'Pediatria', 'PED-03', '#22c55e'),
  ('b0000000-0000-4000-0000-000000000004', 'a0000000-0000-4000-0000-000000000001', 'Chirurgia Generale', 'CHG-04', '#3b82f6'),
  ('b0000000-0000-4000-0000-000000000005', 'a0000000-0000-4000-0000-000000000001', 'Ostetricia e Ginecologia', 'OBG-05', '#a855f7'),
  ('b0000000-0000-4000-0000-000000000006', 'a0000000-0000-4000-0000-000000000001', 'Terapia Intensiva', 'TI-06', '#dc2626'),
  ('b0000000-0000-4000-0000-000000000007', 'a0000000-0000-4000-0000-000000000001', 'Radiologia', 'RAD-07', '#06b6d4'),
  ('b0000000-0000-4000-0000-000000000008', 'a0000000-0000-4000-0000-000000000001', 'Neurologia', 'NEU-08', '#8b5cf6'),
  ('b0000000-0000-4000-0000-000000000009', 'a0000000-0000-4000-0000-000000000001', 'Medicina Interna', 'MED-09', '#14b8a6')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. REPARTI (Ospedale Santa Maria Nuova)
-- ============================================================
INSERT INTO public.departments (id, tenant_id, department_name, cost_center_code, color_code) VALUES
  ('b0000000-0000-4000-0000-000000000010', 'a0000000-0000-4000-0000-000000000002', 'Pronto Soccorso', 'PS-01', '#ef4444'),
  ('b0000000-0000-4000-0000-000000000011', 'a0000000-0000-4000-0000-000000000002', 'Cardiologia', 'CAR-02', '#f97316'),
  ('b0000000-0000-4000-0000-000000000012', 'a0000000-0000-4000-0000-000000000002', 'Pediatria', 'PED-03', '#22c55e'),
  ('b0000000-0000-4000-0000-000000000013', 'a0000000-0000-4000-0000-000000000002', 'Chirurgia Generale', 'CHG-04', '#3b82f6'),
  ('b0000000-0000-4000-0000-000000000014', 'a0000000-0000-4000-0000-000000000002', 'Ostetricia e Ginecologia', 'OBG-05', '#a855f7'),
  ('b0000000-0000-4000-0000-000000000015', 'a0000000-0000-4000-0000-000000000002', 'Terapia Intensiva', 'TI-06', '#dc2626'),
  ('b0000000-0000-4000-0000-000000000016', 'a0000000-0000-4000-0000-000000000002', 'Medicina Interna', 'MED-09', '#14b8a6')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. DIPENDENTI (San Camillo)
-- ============================================================
INSERT INTO public.employees (id, tenant_id, user_id, first_name, last_name, email, primary_role, contract_type, fte_factor, hire_date, accumulated_overtime_month, remaining_leave_balance) VALUES
  -- medico 1: Capo Sala Pronto Soccorso
  ('c0000000-0000-4000-0000-000000000001', 'a0000000-0000-4000-0000-000000000001', 'd0000000-0000-4000-0000-000000000010', 'Laura', 'Bianchi', 'laura.bianchi@san-camillo.test', 'Physician_Attending', 'Full_Time', 1.0, '2019-03-01', 120, 25),
  -- medico 2: Capo Sala Cardiologia
  ('c0000000-0000-4000-0000-000000000002', 'a0000000-0000-4000-0000-000000000001', 'd0000000-0000-4000-0000-000000000011', 'Giuseppe', 'Verdi', 'giuseppe.verdi@san-camillo.test', 'Physician_Resident', 'Full_Time', 1.0, '2022-09-15', 45, 18),
  -- capo sala infermieri
  ('c0000000-0000-4000-0000-000000000003', 'a0000000-0000-4000-0000-000000000001', 'd0000000-0000-4000-0000-000000000012', 'Elena', 'Ferrari', 'elena.ferrari@san-camillo.test', 'Nurse_Manager', 'Full_Time', 1.0, '2017-11-01', 80, 30),
  -- infermiere
  ('c0000000-0000-4000-0000-000000000004', 'a0000000-0000-4000-0000-000000000001', 'd0000000-0000-4000-0000-000000000013', 'Antonio', 'Russo', 'antonio.russo@san-camillo.test', 'Nurse_RN', 'Full_Time', 1.0, '2020-02-10', 60, 22),
  -- infermiere part-time
  ('c0000000-0000-4000-0000-000000000005', 'a0000000-0000-4000-0000-000000000001', 'd0000000-0000-4000-0000-000000000014', 'Sofia', 'Colombo', 'sofia.colombo@san-camillo.test', 'Nurse_RN', 'Part_Time', 0.5, '2023-06-05', 10, 15),
  -- OSS
  ('c0000000-0000-4000-0000-000000000006', 'a0000000-0000-4000-0000-000000000001', NULL, 'Michele', 'Fontana', 'michele.fontana@san-camillo.test', 'Nurse_Aide', 'Full_Time', 1.0, '2021-08-20', 30, 20),
  -- ostetrica
  ('c0000000-0000-4000-0000-000000000007', 'a0000000-0000-4000-0000-000000000001', NULL, 'Chiara', 'Galli', 'chiara.galli@san-camillo.test', 'Midwife', 'Full_Time', 1.0, '2018-05-12', 50, 28),
  -- infermiere
  ('c0000000-0000-4000-0000-000000000008', 'a0000000-0000-4000-0000-000000000001', NULL, 'Luca', 'Barbieri', 'luca.barbieri@san-camillo.test', 'Nurse_RN', 'Freelancer_Locum', 0.8, '2024-01-08', 15, 12),
  -- capo sala infermieri 2
  ('c0000000-0000-4000-0000-000000000009', 'a0000000-0000-4000-0000-000000000001', NULL, 'Paola', 'Rinaldi', 'paola.rinaldi@san-camillo.test', 'Nurse_Manager', 'Full_Time', 1.0, '2016-07-15', 95, 32),
  -- medico
  ('c0000000-0000-4000-0000-000000000010', 'a0000000-0000-4000-0000-000000000001', NULL, 'Andrea', 'Moretti', 'andrea.moretti@san-camillo.test', 'Physician_Attending', 'Full_Time', 1.0, '2015-02-01', 110, 20),
  -- infermiere
  ('c0000000-0000-4000-0000-000000000011', 'a0000000-0000-4000-0000-000000000001', NULL, 'Silvia', 'Conti', 'silvia.conti@san-camillo.test', 'Nurse_RN', 'Full_Time', 1.0, '2020-10-01', 40, 18),
  -- specializzando
  ('c0000000-0000-4000-0000-000000000012', 'a0000000-0000-4000-0000-000000000001', NULL, 'Roberto', 'Fabbri', 'roberto.fabbri@san-camillo.test', 'Physician_Resident', 'Full_Time', 1.0, '2023-03-20', 5, 14)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. DIPENDENTI (Santa Maria Nuova)
-- ============================================================
INSERT INTO public.employees (id, tenant_id, user_id, first_name, last_name, email, primary_role, contract_type, fte_factor, hire_date, accumulated_overtime_month, remaining_leave_balance) VALUES
  ('c0000000-0000-4000-0000-000000000020', 'a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000020', 'Francesco', 'Romano', 'francesco.romano@santamaria.test', 'Nurse_Manager', 'Full_Time', 1.0, '2016-07-15', 95, 30),
  ('c0000000-0000-4000-0000-000000000021', 'a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000021', 'Martina', 'Ricci', 'martina.ricci@santamaria.test', 'Nurse_RN', 'Full_Time', 1.0, '2020-10-01', 40, 22),
  ('c0000000-0000-4000-0000-000000000022', 'a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000022', 'Roberto', 'Marini', 'roberto.marini@santamaria.test', 'Physician_Resident', 'Part_Time', 0.6, '2023-03-20', 5, 16),
  ('c0000000-0000-4000-0000-000000000023', 'a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000023', 'Chiara', 'Moretti', 'chiara.moretti@santamaria.test', 'Nurse_RN', 'Freelancer_Locum', 0.8, '2024-01-08', 15, 10),
  ('c0000000-0000-4000-0000-000000000024', 'a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000024', 'Alessandro', 'Gallo', 'alessandro.gallo@santamaria.test', 'Midwife', 'Full_Time', 1.0, '2018-05-12', 50, 25),
  ('c0000000-0000-4000-0000-000000000025', 'a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000025', 'Valentina', 'Costa', 'valentina.costa@santamaria.test', 'Nurse_Aide', 'Full_Time', 1.0, '2021-11-30', 25, 20),
  ('c0000000-0000-4000-0000-000000000026', 'a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000026', 'Stefano', 'Conti', 'stefano.conti@santamaria.test', 'Physician_Attending', 'Full_Time', 1.0, '2014-09-01', 130, 28),
  ('c0000000-0000-4000-0000-000000000027', 'a0000000-0000-4000-0000-000000000002', 'd0000000-0000-4000-0000-000000000027', 'Paola', 'Barbieri', 'paola.barbieri@santamaria.test', 'Nurse_RN', 'Full_Time', 1.0, '2019-04-15', 55, 20),
  ('c0000000-0000-4000-0000-000000000028', 'a0000000-0000-4000-0000-000000000002', NULL, 'Gianni', 'Leone', 'gianni.leone@santamaria.test', 'Nurse_Aide', 'Full_Time', 1.0, '2022-02-20', 20, 18),
  ('c0000000-0000-4000-0000-000000000029', 'a0000000-0000-4000-0000-000000000002', NULL, 'Monica', 'Rizzi', 'monica.rizzi@santamaria.test', 'Nurse_RN', 'Part_Time', 0.75, '2023-09-01', 8, 12),
  ('c0000000-0000-4000-0000-000000000030', 'a0000000-0000-4000-0000-000000000002', NULL, 'Davide', 'Ferri', 'davide.ferri@santamaria.test', 'Physician_Attending', 'Full_Time', 1.0, '2017-06-01', 90, 22),
  ('c0000000-0000-4000-0000-000000000031', 'a0000000-0000-4000-0000-000000000002', NULL, 'Elena', 'Piazza', 'elena.piazza@santamaria.test', 'Nurse_Manager', 'Full_Time', 1.0, '2015-12-01', 75, 26)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. ASSOCIAZIONE DIPENDENTI-REPARTI (molti a molti)
-- ============================================================
-- San Camillo: usiamo questa tabella per sapere in quale reparto
-- lavora ciascun dipendente. Aggiungiamo una tabella employee_departments
-- se non esiste già.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_departments') THEN
    CREATE TABLE public.employee_departments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
      department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
      is_primary boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(employee_id, department_id)
    );

    ALTER TABLE public.employee_departments ENABLE ROW LEVEL LEVEL;

    CREATE POLICY "employee_departments_read" ON public.employee_departments
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = auth.uid() AND tm.tenant_id = (
          SELECT d.tenant_id FROM public.departments d WHERE d.id = employee_departments.department_id
        ))
      );

    CREATE POLICY "employee_departments_manage" ON public.employee_departments
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
        OR
        EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'manager') AND tm.tenant_id = (
          SELECT d.tenant_id FROM public.departments d WHERE d.id = employee_departments.department_id
        ))
      );
  END IF;
END $$;

-- San Camillo: assegnazioni dipendenti
INSERT INTO public.employee_departments (employee_id, department_id, is_primary) VALUES
  ('c0000000-0000-4000-0000-000000000001', 'b0000000-0000-4000-0000-000000000001', true),
  ('c0000000-0000-4000-0000-000000000002', 'b0000000-0000-4000-0000-000000000002', true),
  ('c0000000-0000-4000-0000-000000000003', 'b0000000-0000-4000-0000-000000000001', true),
  ('c0000000-0000-4000-0000-000000000004', 'b0000000-0000-4000-0000-000000000001', true),
  ('c0000000-0000-4000-0000-000000000005', 'b0000000-0000-4000-0000-000000000003', true),
  ('c0000000-0000-4000-0000-000000000006', 'b0000000-0000-4000-0000-000000000006', true),
  ('c0000000-0000-4000-0000-000000000007', 'b0000000-0000-4000-0000-000000000005', true),
  ('c0000000-0000-4000-0000-000000000008', 'b0000000-0000-4000-0000-000000000004', true),
  ('c0000000-0000-4000-0000-000000000009', 'b0000000-0000-4000-0000-000000000002', true),
  ('c0000000-0000-4000-0000-000000000010', 'b0000000-0000-4000-0000-000000000009', true),
  ('c0000000-0000-4000-0000-000000000011', 'b0000000-0000-4000-0000-000000000007', true),
  ('c0000000-0000-4000-0000-000000000012', 'b0000000-0000-4000-0000-000000000009', true)
ON CONFLICT (employee_id, department_id) DO NOTHING;

-- Santa Maria Nuova: assegnazioni dipendenti
INSERT INTO public.employee_departments (employee_id, department_id, is_primary) VALUES
  ('c0000000-0000-4000-0000-000000000020', 'b0000000-0000-4000-0000-000000000010', true),
  ('c0000000-0000-4000-0000-000000000021', 'b0000000-0000-4000-0000-000000000010', true),
  ('c0000000-0000-4000-0000-000000000022', 'b0000000-0000-4000-0000-000000000011', true),
  ('c0000000-0000-4000-0000-000000000023', 'b0000000-0000-4000-0000-000000000013', true),
  ('c0000000-0000-4000-0000-000000000024', 'b0000000-0000-4000-0000-000000000014', true),
  ('c0000000-0000-4000-0000-000000000025', 'b0000000-0000-4000-0000-000000000015', true),
  ('c0000000-0000-4000-0000-000000000026', 'b0000000-0000-4000-0000-000000000011', true),
  ('c0000000-0000-4000-0000-000000000027', 'b0000000-0000-4000-0000-000000000016', true),
  ('c0000000-0000-4000-0000-000000000028', 'b0000000-0000-4000-0000-000000000015', true),
  ('c0000000-0000-4000-0000-000000000029', 'b0000000-0000-4000-0000-000000000012', true),
  ('c0000000-0000-4000-0000-000000000030', 'b0000000-0000-4000-0000-000000000016', true),
  ('c0000000-0000-4000-0000-000000000031', 'b0000000-0000-4000-0000-000000000010', true)
ON CONFLICT (employee_id, department_id) DO NOTHING;

-- ============================================================
-- 10. SHIFT TEMPLATES
-- ============================================================
INSERT INTO public.shift_templates (id, tenant_id, shift_code, start_time, end_time, is_night_shift, allocated_break_minutes) VALUES
  -- San Camillo
  ('e0000000-0000-4000-0000-000000000001', 'a0000000-0000-4000-0000-000000000001', 'MAT', '06:00', '14:00', false, 30),
  ('e0000000-0000-4000-0000-000000000002', 'a0000000-0000-4000-0000-000000000001', 'POM', '14:00', '22:00', false, 30),
  ('e0000000-0000-4000-0000-000000000003', 'a0000000-0000-4000-0000-000000000001', 'NOT', '22:00', '06:00', true, 45),
  ('e0000000-0000-4000-0000-000000000004', 'a0000000-0000-4000-0000-000000000001', 'INT', '08:00', '20:00', false, 60),
  ('e0000000-0000-4000-0000-000000000005', 'a0000000-0000-4000-0000-000000000001', 'GUA', '09:00', '17:00', false, 30),
  -- Santa Maria Nuova
  ('e0000000-0000-4000-0000-000000000010', 'a0000000-0000-4000-0000-000000000002', 'MAT', '06:00', '14:00', false, 30),
  ('e0000000-0000-4000-0000-000000000011', 'a0000000-0000-4000-0000-000000000002', 'POM', '14:00', '22:00', false, 30),
  ('e0000000-0000-4000-0000-000000000012', 'a0000000-0000-4000-0000-000000000002', 'NOT', '22:00', '06:00', true, 45),
  ('e0000000-0000-4000-0000-000000000013', 'a0000000-0000-4000-0000-000000000002', 'INT', '08:00', '20:00', false, 60)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. SKILLS
-- ============================================================
INSERT INTO public.skills (id, tenant_id, skill_name) VALUES
  ('f0000000-0000-4000-0000-000000000001', 'a0000000-0000-4000-0000-000000000001', 'ACLS'),
  ('f0000000-0000-4000-0000-000000000002', 'a0000000-0000-4000-0000-000000000001', 'PALS'),
  ('f0000000-0000-4000-0000-000000000003', 'a0000000-0000-4000-0000-000000000001', 'BLSD'),
  ('f0000000-0000-4000-0000-000000000004', 'a0000000-0000-4000-0000-000000000001', 'Triaging'),
  ('f0000000-0000-4000-0000-000000000005', 'a0000000-0000-4000-0000-000000000001', 'Ventilazione Meccanica'),
  ('f0000000-0000-4000-0000-000000000006', 'a0000000-0000-4000-0000-000000000001', 'Ecografia'),
  ('f0000000-0000-4000-0000-000000000007', 'a0000000-0000-4000-0000-000000000001', 'Gestione PICC'),
  ('f0000000-0000-4000-0000-000000000010', 'a0000000-0000-4000-0000-000000000002', 'ACLS'),
  ('f0000000-0000-4000-0000-000000000011', 'a0000000-0000-4000-0000-000000000002', 'PALS'),
  ('f0000000-0000-4000-0000-000000000012', 'a0000000-0000-4000-0000-000000000002', 'BLSD'),
  ('f0000000-0000-4000-0000-000000000013', 'a0000000-0000-4000-0000-000000000002', 'Triaging')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. EMPLOYEE SKILLS (alcuni esempi)
-- ============================================================
INSERT INTO public.employee_skills (employee_id, skill_id) VALUES
  ('c0000000-0000-4000-0000-000000000001', 'f0000000-0000-4000-0000-000000000001'),
  ('c0000000-0000-4000-0000-000000000001', 'f0000000-0000-4000-0000-000000000004'),
  ('c0000000-0000-4000-0000-000000000003', 'f0000000-0000-4000-0000-000000000001'),
  ('c0000000-0000-4000-0000-000000000003', 'f0000000-0000-4000-0000-000000000003'),
  ('c0000000-0000-4000-0000-000000000003', 'f0000000-0000-4000-0000-000000000004'),
  ('c0000000-0000-4000-0000-000000000004', 'f0000000-0000-4000-0000-000000000003'),
  ('c0000000-0000-4000-0000-000000000004', 'f0000000-0000-4000-0000-000000000004'),
  ('c0000000-0000-4000-0000-000000000007', 'f0000000-0000-4000-0000-000000000006'),
  ('c0000000-0000-4000-0000-000000000010', 'f0000000-0000-4000-0000-000000000001'),
  ('c0000000-0000-4000-0000-000000000010', 'f0000000-0000-4000-0000-000000000005'),
  ('c0000000-0000-4000-0000-000000000010', 'f0000000-0000-4000-0000-000000000006'),
  ('c0000000-0000-4000-0000-000000000020', 'f0000000-0000-4000-0000-000000000010'),
  ('c0000000-0000-4000-0000-000000000021', 'f0000000-0000-4000-0000-000000000012'),
  ('c0000000-0000-4000-0000-000000000026', 'f0000000-0000-4000-0000-000000000010'),
  ('c0000000-0000-4000-0000-000000000026', 'f0000000-0000-4000-0000-000000000013'),
  ('c0000000-0000-4000-0000-000000000031', 'f0000000-0000-4000-0000-000000000010'),
  ('c0000000-0000-4000-0000-000000000031', 'f0000000-0000-4000-0000-000000000012')
ON CONFLICT (employee_id, skill_id) DO NOTHING;

-- ============================================================
-- 13. FERIE (mese corrente e successivo)
-- ============================================================
-- Usiamo date relative al CURRENT_DATE
DO $$
DECLARE
  today date := CURRENT_DATE;
  start_of_month date := date_trunc('month', today)::date;
  next_month date := (date_trunc('month', today) + interval '1 month')::date;
BEGIN
  INSERT INTO public.leaves (tenant_id, employee_id, start_date, end_date, leave_type, reason, status) VALUES
    -- Laura Bianchi: ferie annuali (5 giorni la prossima settimana)
    ('a0000000-0000-4000-0000-000000000001', 'c0000000-0000-4000-0000-000000000001',
      today + 7, today + 11, 'Annual', 'Ferie annuali programmate', 'Approved'),
    -- Elena Ferrari: permesso personale (2 giorni)
    ('a0000000-0000-4000-0000-000000000001', 'c0000000-0000-4000-0000-000000000003',
      today + 3, today + 4, 'Personal', 'Permesso personale', 'Approved'),
    -- Antonio Russo: malattia in corso
    ('a0000000-0000-4000-0000-000000000001', 'c0000000-0000-4000-0000-000000000004',
      today, today + 3, 'Sick', 'Influenza', 'Approved'),
    -- Sofia Colombo: ferie annuali (1 settimana)
    ('a0000000-0000-4000-0000-000000000001', 'c0000000-0000-4000-0000-000000000005',
      today + 14, today + 20, 'Annual', 'Vacanza estiva', 'Pending'),
    -- Michele Fontana: ferie
    ('a0000000-0000-4000-0000-000000000001', 'c0000000-0000-4000-0000-000000000006',
      today + 21, today + 25, 'Annual', 'Ferie', 'Approved'),
    -- Chiara Galli: permesso
    ('a0000000-0000-4000-0000-000000000001', 'c0000000-0000-4000-0000-000000000007',
      today + 1, today + 1, 'Personal', 'Visita medica', 'Approved'),
    -- Francesco Romano: ferie (Santa Maria Nuova)
    ('a0000000-0000-4000-0000-000000000002', 'c0000000-0000-4000-0000-000000000020',
      today + 5, today + 9, 'Annual', 'Ferie familiari', 'Approved'),
    -- Martina Ricci: malattia (Santa Maria Nuova)
    ('a0000000-0000-4000-0000-000000000002', 'c0000000-0000-4000-0000-000000000021',
      today, today + 2, 'Sick', 'Malattia', 'Approved'),
    -- Stefano Conti: ferie (Santa Maria Nuova)
    ('a0000000-0000-4000-0000-000000000002', 'c0000000-0000-4000-0000-000000000026',
      today + 10, today + 17, 'Annual', 'Ferie estive', 'Approved'),
    -- Paola Barbieri: permesso (Santa Maria Nuova)
    ('a0000000-0000-4000-0000-000000000002', 'c0000000-0000-4000-0000-000000000027',
      today + 2, today + 2, 'Personal', 'Permesso', 'Pending');
END $$;

-- ============================================================
-- 14. ASSEGNAZIONI TURNI (3 settimane a partire da oggi)
-- ============================================================
DO $$
DECLARE
  today date := CURRENT_DATE;
  d date;
  i int := 0;
  -- San Camillo: dipendenti e templates
  sc_employees uuid[] := ARRAY[
    'c0000000-0000-4000-0000-000000000001',
    'c0000000-0000-4000-0000-000000000002',
    'c0000000-0000-4000-0000-000000000003',
    'c0000000-0000-4000-0000-000000000004',
    'c0000000-0000-4000-0000-000000000005',
    'c0000000-0000-4000-0000-000000000006',
    'c0000000-0000-4000-0000-000000000007',
    'c0000000-0000-4000-0000-000000000008',
    'c0000000-0000-4000-0000-000000000009',
    'c0000000-0000-4000-0000-000000000010',
    'c0000000-0000-4000-0000-000000000011',
    'c0000000-0000-4000-0000-000000000012'
  ];
  sc_templates uuid[] := ARRAY[
    'e0000000-0000-4000-0000-000000000001',
    'e0000000-0000-4000-0000-000000000002',
    'e0000000-0000-4000-0000-000000000003',
    'e0000000-0000-4000-0000-000000000004'
  ];
  sc_depts uuid[] := ARRAY[
    'b0000000-0000-4000-0000-000000000001',
    'b0000000-0000-4000-0000-000000000002',
    'b0000000-0000-4000-0000-000000000003',
    'b0000000-0000-4000-0000-000000000004',
    'b0000000-0000-4000-0000-000000000005',
    'b0000000-0000-4000-0000-000000000006',
    'b0000000-0000-4000-0000-000000000007',
    'b0000000-0000-4000-0000-000000000008',
    'b0000000-0000-4000-0000-000000000009'
  ];
  -- Santa Maria Nuova
  smn_employees uuid[] := ARRAY[
    'c0000000-0000-4000-0000-000000000020',
    'c0000000-0000-4000-0000-000000000021',
    'c0000000-0000-4000-0000-000000000022',
    'c0000000-0000-4000-0000-000000000023',
    'c0000000-0000-4000-0000-000000000024',
    'c0000000-0000-4000-0000-000000000025',
    'c0000000-0000-4000-0000-000000000026',
    'c0000000-0000-4000-0000-000000000027',
    'c0000000-0000-4000-0000-000000000028',
    'c0000000-0000-4000-0000-000000000029',
    'c0000000-0000-4000-0000-000000000030',
    'c0000000-0000-4000-0000-000000000031'
  ];
  smn_templates uuid[] := ARRAY[
    'e0000000-0000-4000-0000-000000000010',
    'e0000000-0000-4000-0000-000000000011',
    'e0000000-0000-4000-0000-000000000012',
    'e0000000-0000-4000-0000-000000000013'
  ];
  smn_depts uuid[] := ARRAY[
    'b0000000-0000-4000-0000-000000000010',
    'b0000000-0000-4000-0000-000000000011',
    'b0000000-0000-4000-0000-000000000012',
    'b0000000-0000-4000-0000-000000000013',
    'b0000000-0000-4000-0000-000000000014',
    'b0000000-0000-4000-0000-000000000015',
    'b0000000-0000-4000-0000-000000000016'
  ];
  emp_id uuid;
  tpl_id uuid;
  dept_id uuid;
  start_hour int;
  end_hour int;
BEGIN
  -- San Camillo: 3 settimane di turni
  FOR i IN 0..20 LOOP
    d := today + i;
    -- ~3-5 turni per giorno
    FOR j IN 1..4 LOOP
      emp_id := sc_employees[1 + ((i * 4 + j) % array_length(sc_employees, 1))];
      tpl_id := sc_templates[1 + (j % array_length(sc_templates, 1))];
      dept_id := sc_depts[1 + ((i + j) % array_length(sc_depts, 1))];

      INSERT INTO public.shift_assignments
        (tenant_id, employee_id, department_id, template_id, assignment_date,
         actual_start_timestamp, actual_end_timestamp, status, coverage_type)
      VALUES (
        'a0000000-0000-4000-0000-000000000001',
        emp_id,
        dept_id,
        tpl_id,
        d,
        (d::text || ' ' || CASE WHEN tpl_id = 'e0000000-0000-4000-0000-000000000003' THEN '22:00:00' WHEN tpl_id = 'e0000000-0000-4000-0000-000000000004' THEN '08:00:00' ELSE '06:00:00' END)::timestamp,
        (d::text || ' ' || CASE WHEN tpl_id = 'e0000000-0000-4000-0000-000000000003' THEN '06:00:00' WHEN tpl_id = 'e0000000-0000-4000-0000-000000000004' THEN '20:00:00' ELSE '14:00:00' END)::timestamp + CASE WHEN tpl_id = 'e0000000-0000-4000-0000-000000000003' THEN interval '1 day' ELSE interval '0' END,
        CASE WHEN d <= today THEN 'Completed' ELSE 'Scheduled' END,
        'Regular_Shift'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- Santa Maria Nuova: 3 settimane di turni
  FOR i IN 0..20 LOOP
    d := today + i;
    FOR j IN 1..4 LOOP
      emp_id := smn_employees[1 + ((i * 4 + j) % array_length(smn_employees, 1))];
      tpl_id := smn_templates[1 + (j % array_length(smn_templates, 1))];

      INSERT INTO public.shift_assignments
        (tenant_id, employee_id, department_id, template_id, assignment_date,
         actual_start_timestamp, actual_end_timestamp, status, coverage_type)
      VALUES (
        'a0000000-0000-4000-0000-000000000002',
        emp_id,
        smn_depts[1 + ((i + j) % array_length(smn_depts, 1))],
        tpl_id,
        d,
        (d::text || ' 06:00:00')::timestamp,
        (d::text || ' 14:00:00')::timestamp,
        CASE WHEN d <= today THEN 'Completed' ELSE 'Scheduled' END,
        'Regular_Shift'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 15. PERMESSI UTENTE (esempi)
-- ============================================================
INSERT INTO public.user_permissions (user_id, tenant_id, permission_key) VALUES
  -- Admin globale ha tutti i permessi (gestito via user_roles.admin)
  -- Laura Bianchi (Capo Sala PS): gestione turni e ferie
  ('d0000000-0000-4000-0000-000000000010', 'a0000000-0000-4000-0000-000000000001', 'calendar.manage_department'),
  ('d0000000-0000-4000-0000-000000000010', 'a0000000-0000-4000-0000-000000000001', 'leaves.manage_department'),
  ('d0000000-0000-4000-0000-000000000010', 'a0000000-0000-4000-0000-000000000001', 'employees.view'),
  ('d0000000-0000-4000-0000-000000000010', 'a0000000-0000-4000-0000-000000000001', 'swaps.approve'),
  -- Giuseppe Verdi (Capo Sala Cardiologia)
  ('d0000000-0000-4000-0000-000000000011', 'a0000000-0000-4000-0000-000000000001', 'calendar.manage_department'),
  ('d0000000-0000-4000-0000-000000000011', 'a0000000-0000-4000-0000-000000000001', 'employees.view'),
  -- Francesco Romano (Capo Sala PS - Santa Maria Nuova)
  ('d0000000-0000-4000-0000-000000000020', 'a0000000-0000-4000-0000-000000000002', 'calendar.manage_department'),
  ('d0000000-0000-4000-0000-000000000020', 'a0000000-0000-4000-0000-000000000002', 'leaves.manage_department'),
  ('d0000000-0000-4000-0000-000000000020', 'a0000000-0000-4000-0000-000000000002', 'employees.view'),
  ('d0000000-0000-4000-0000-000000000020', 'a0000000-0000-4000-0000-000000000002', 'swaps.approve')
ON CONFLICT (user_id, tenant_id, permission_key) DO NOTHING;

-- ============================================================
-- 16. TENANT CONFIG (default per entrambi)
-- ============================================================
INSERT INTO public.tenant_config (tenant_id, config) VALUES
  ('a0000000-0000-4000-0000-000000000001', '{"timezone": "Europe/Rome", "week_starts_on": 1, "language": "it", "auto_approve_swaps": false}'),
  ('a0000000-0000-4000-0000-000000000002', '{"timezone": "Europe/Rome", "week_starts_on": 1, "language": "it", "auto_approve_swaps": false}')
ON CONFLICT (tenant_id) DO NOTHING;

-- Riabilita triggers
SET session_replication_role = 'origin';

-- Migrazione: sistema di permessi granulari + tabelle mancanti
-- Aggiunge tabelle per gestire permessi utente specifici per tenant

-- ============================================================
-- Tabella employee_departments (relazione N:N dipendenti-reparti)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employee_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, department_id)
);

COMMENT ON TABLE public.employee_departments IS 'Associazione molti-a-molti tra dipendenti e reparti';
COMMENT ON COLUMN public.employee_departments.is_primary IS 'Reparto principale di assegnazione';

CREATE INDEX idx_emp_dept_employee ON public.employee_departments(employee_id);
CREATE INDEX idx_emp_dept_department ON public.employee_departments(department_id);

ALTER TABLE public.employee_departments ENABLE ROW LEVEL SECURITY;

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

-- ============================================================
-- Tabella leaves (ferie e permessi)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.leave_type AS ENUM ('Annual', 'Sick', 'Personal', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.leave_status AS ENUM ('Approved', 'Pending', 'Declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  leave_type public.leave_type NOT NULL DEFAULT 'Annual',
  status public.leave_status NOT NULL DEFAULT 'Pending',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leaves_date_check CHECK (end_date >= start_date)
);

COMMENT ON TABLE public.leaves IS 'Ferie, permessi e assenze del personale';

CREATE INDEX idx_leaves_tenant ON public.leaves(tenant_id);
CREATE INDEX idx_leaves_employee ON public.leaves(employee_id);
CREATE INDEX idx_leaves_dates ON public.leaves(tenant_id, start_date, end_date);

ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leaves_read" ON public.leaves
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = auth.uid() AND tm.tenant_id = leaves.tenant_id)
  );

CREATE POLICY "leaves_insert" ON public.leaves
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = auth.uid() AND tm.tenant_id = leaves.tenant_id)
  );

CREATE POLICY "leaves_update" ON public.leaves
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    OR
    EXISTS (SELECT 1 FROM public.user_permissions up WHERE up.user_id = auth.uid() AND up.tenant_id = leaves.tenant_id AND up.permission_key IN ('leaves.manage', 'leaves.manage_department'))
  );

CREATE POLICY "leaves_delete" ON public.leaves
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    OR
    EXISTS (SELECT 1 FROM public.user_permissions up WHERE up.user_id = auth.uid() AND up.tenant_id = leaves.tenant_id AND up.permission_key IN ('leaves.manage', 'leaves.manage_department'))
  );

CREATE TRIGGER set_updated_at_leaves
  BEFORE UPDATE ON public.leaves
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Tabella permissions (elenco permessi granulari)
-- ============================================================
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.permissions IS 'Elenco di tutti i permessi granulari disponibili';
COMMENT ON COLUMN public.permissions.permission_key IS 'Chiave univoca del permesso (es. calendar.manage, employees.view)';
COMMENT ON COLUMN public.permissions.category IS 'Categoria di raggruppamento (calendar, employees, departments, leaves, swaps, permissions)';

-- Permessi predefiniti di sistema
INSERT INTO public.permissions (permission_key, label, description, category) VALUES
  ('calendar.view', 'Visualizza calendario', 'Consente di visualizzare il calendario dei turni', 'calendar'),
  ('calendar.manage', 'Gestisce tutti i turni', 'Creare, modificare e cancellare turni di qualsiasi reparto', 'calendar'),
  ('calendar.manage_department', 'Gestisce turni del proprio reparto', 'Creare, modificare e cancellare turni solo del reparto di appartenenza', 'calendar'),
  ('employees.view', 'Visualizza dipendenti', 'Consente di visualizzare l''elenco dei dipendenti', 'employees'),
  ('employees.manage', 'Gestisce dipendenti', 'Creare, modificare e cancellare dipendenti', 'employees'),
  ('departments.view', 'Visualizza reparti', 'Consente di visualizzare l''elenco dei reparti', 'departments'),
  ('departments.manage', 'Gestisce reparti', 'Creare, modificare e cancellare reparti', 'departments'),
  ('leaves.manage', 'Gestisce ferie e permessi', 'Approvare o rifiutare richieste di ferie', 'leaves'),
  ('leaves.manage_department', 'Gestisce ferie del proprio reparto', 'Approvare o rifiutare ferie solo del reparto di appartenenza', 'leaves'),
  ('swaps.approve', 'Approva scambi turni', 'Approvare o rifiutare richieste di scambio turni', 'swaps'),
  ('permissions.manage', 'Gestisce permessi utente', 'Assegnare o rimuovere permessi agli utenti', 'permissions'),
  ('reports.view', 'Visualizza report', 'Consente di visualizzare report e statistiche', 'reports');

-- Tabella che associa permessi agli utenti (per tenant)
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(permission_key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, tenant_id, permission_key)
);

COMMENT ON TABLE public.user_permissions IS 'Permessi granulari assegnati a ciascun utente per tenant';
COMMENT ON COLUMN public.user_permissions.user_id IS 'Utente a cui è assegnato il permesso';
COMMENT ON COLUMN public.user_permissions.tenant_id IS 'Tenant per cui vale il permesso';
COMMENT ON COLUMN public.user_permissions.permission_key IS 'Il permesso specifico';

CREATE INDEX idx_user_permissions_user_tenant ON public.user_permissions(user_id, tenant_id);
CREATE INDEX idx_user_permissions_tenant ON public.user_permissions(tenant_id);

-- RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Chiunque (autenticato) può leggere la lista dei permessi
CREATE POLICY "permissions_read_all" ON public.permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo chi ha il permesso permissions.manage può leggere/scrivere user_permissions
CREATE POLICY "user_permissions_select_self_or_admin" ON public.user_permissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_permissions.tenant_id
        AND up.permission_key = 'permissions.manage'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "user_permissions_manage_admin" ON public.user_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_permissions.tenant_id
        AND up.permission_key = 'permissions.manage'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "user_permissions_manage_admin_delete" ON public.user_permissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_permissions.tenant_id
        AND up.permission_key = 'permissions.manage'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Trigger: updated_at per entrambe
CREATE TRIGGER set_updated_at_permissions
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_user_permissions
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Funzione per verificare se un utente ha un permesso specifico per un tenant
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id uuid,
  p_tenant_id uuid,
  p_permission_key text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = p_user_id
      AND up.tenant_id = p_tenant_id
      AND up.permission_key = p_permission_key
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id AND ur.role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.has_permission IS 'Verifica se un utente ha un permesso specifico (gli admin hanno sempre tutti i permessi)';

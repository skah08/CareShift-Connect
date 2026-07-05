-- Migrazione: configurazione automatica account admin
-- Quando un utente si registra con email alten.vsk@gmail.com,
-- viene automaticamente promosso ad admin e aggiunto a tutti i tenant come owner.

-- ============================================================
-- Aggiornamento funzione handle_new_user
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_details (user_id) VALUES (NEW.id);

  -- Se l'email corrisponde all'admin predefinito, assegna ruolo admin + tenant
  IF NEW.email = 'alten.vsk@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

    -- Aggiunge come owner a tutti i tenant esistenti
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    SELECT t.id, NEW.id, 'owner'
    FROM public.tenants t
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;

  RETURN NEW;
END;
$$;

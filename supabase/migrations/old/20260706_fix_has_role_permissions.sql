-- Fix: concede execute su has_role() a authenticated
-- La funzione è SECURITY DEFINER ma necessita di EXECUTE privilege
-- per essere chiamata dalle RLS policies degli utenti autenticati.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

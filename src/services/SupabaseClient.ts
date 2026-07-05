// Thin re-export so app code follows the guideline of importing services from
// src/services rather than reaching directly into the integration folder.
export { supabase } from "@/integrations/supabase/client";
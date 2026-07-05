import { supabase } from "./SupabaseClient";

export interface StaffListItem {
  id: string;
  email: string;
}

export const UserService = {
  async listStaff(): Promise<StaffListItem[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email")
      .order("email", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};
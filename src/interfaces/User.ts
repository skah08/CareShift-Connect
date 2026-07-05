export type AppRole = "admin" | "staff" | "viewer";

export interface Profile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UserDetails {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  theme_preference: "light" | "dark";
}

export interface HospishiftUser extends Profile {
  details: UserDetails | null;
  roles: AppRole[];
}
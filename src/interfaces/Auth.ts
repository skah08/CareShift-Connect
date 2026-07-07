import type { HospishiftUser } from "./User";

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload extends SignInPayload {
  first_name?: string;
  last_name?: string;
}

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

export interface AuthState {
  user: HospishiftUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

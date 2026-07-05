export const ALL_PERMISSIONS = [
  "calendar.view",
  "calendar.manage",
  "calendar.manage_department",
  "employees.view",
  "employees.manage",
  "departments.view",
  "departments.manage",
  "leaves.manage",
  "leaves.manage_department",
  "swaps.approve",
  "permissions.manage",
  "reports.view",
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "calendar.view": "Visualizza calendario",
  "calendar.manage": "Gestisce tutti i turni",
  "calendar.manage_department": "Gestisce turni del proprio reparto",
  "employees.view": "Visualizza dipendenti",
  "employees.manage": "Gestisce dipendenti",
  "departments.view": "Visualizza reparti",
  "departments.manage": "Gestisce reparti",
  "leaves.manage": "Gestisce ferie e permessi",
  "leaves.manage_department": "Gestisce ferie del proprio reparto",
  "swaps.approve": "Approva scambi turni",
  "permissions.manage": "Gestisce permessi utente",
  "reports.view": "Visualizza report",
};

export const PERMISSION_CATEGORIES: Record<string, PermissionKey[]> = {
  calendar: ["calendar.view", "calendar.manage", "calendar.manage_department"],
  employees: ["employees.view", "employees.manage"],
  departments: ["departments.view", "departments.manage"],
  leaves: ["leaves.manage", "leaves.manage_department"],
  swaps: ["swaps.approve"],
  permissions: ["permissions.manage"],
  reports: ["reports.view"],
};

export interface UserPermissionRow {
  id: string;
  user_id: string;
  tenant_id: string;
  permission_key: PermissionKey;
  created_at: string;
}

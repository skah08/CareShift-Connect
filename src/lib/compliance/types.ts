// Compliance types shared client + server.
// Pure data: no imports, safe to reference from UI.

export type ComplianceSeverity = "error" | "warning";

export interface ComplianceViolation {
  code: string;
  severity: ComplianceSeverity;
  message: string;
  i18nKey: string;
  i18nParams?: Record<string, string | number>;
  meta?: Record<string, string | number | boolean | null>;
}

export interface ComplianceReport {
  ok: boolean;
  hardViolations: ComplianceViolation[];
  softViolations: ComplianceViolation[];
}

export interface AssignmentWindow {
  id: string;
  employee_id: string;
  department_id: string;
  shift_template_id: string | null;
  actual_start_timestamp: string;
  actual_end_timestamp: string;
  shift_code?: string | null;
}

export interface TenantComplianceConfig {
  min_daily_rest_hrs: number;
  max_weekly_work_hrs: number;
  min_weekly_rest_hrs: number;
  forbidden_sequence_matrix: Record<string, string[]>;
  night_shift_window: { start: string; end: string };
  auto_approval_peer_swap: boolean;
}

export interface EvaluateAssignmentInput {
  employee_id: string;
  shift_template_id?: string | null;
  shift_code?: string | null;
  actual_start_timestamp: string; // ISO UTC
  actual_end_timestamp: string;   // ISO UTC
  required_skill_ids?: string[];
  ignore_assignment_id?: string;  // for edits: exclude self
}
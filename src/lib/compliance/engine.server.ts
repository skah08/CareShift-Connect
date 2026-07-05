// Pure Rule Engine — no I/O.
// All timestamps must be ISO UTC. All hour calculations use absolute
// UTC minute differentials (see SRS §5.1 DST edge case).

import type {
  AssignmentWindow,
  ComplianceReport,
  ComplianceViolation,
  EvaluateAssignmentInput,
  TenantComplianceConfig,
} from "./types";

const MS_PER_MIN = 60_000;
const MS_PER_HR = 3_600_000;

function toMs(iso: string): number {
  return new Date(iso).getTime();
}

function overlapsUtc(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ---------- HARD CONSTRAINTS -----------------------------------------

export function checkOverlap(
  input: EvaluateAssignmentInput,
  existing: AssignmentWindow[],
): ComplianceViolation | null {
  const newStart = toMs(input.actual_start_timestamp);
  const newEnd = toMs(input.actual_end_timestamp);
  for (const a of existing) {
    if (a.id === input.ignore_assignment_id) continue;
    if (a.employee_id !== input.employee_id) continue;
    if (overlapsUtc(newStart, newEnd, toMs(a.actual_start_timestamp), toMs(a.actual_end_timestamp))) {
      return {
        code: "DOUBLE_BOOKING",
        severity: "error",
        message: "Employee is already assigned to an overlapping shift in this window.",
        meta: { conflicting_assignment_id: a.id, department_id: a.department_id },
      };
    }
  }
  return null;
}

export function checkDailyRest(
  input: EvaluateAssignmentInput,
  existing: AssignmentWindow[],
  config: TenantComplianceConfig,
): ComplianceViolation | null {
  const newStart = toMs(input.actual_start_timestamp);
  const newEnd = toMs(input.actual_end_timestamp);
  const minRestMs = config.min_daily_rest_hrs * MS_PER_HR;

  for (const a of existing) {
    if (a.id === input.ignore_assignment_id) continue;
    if (a.employee_id !== input.employee_id) continue;
    const otherStart = toMs(a.actual_start_timestamp);
    const otherEnd = toMs(a.actual_end_timestamp);

    // Rest between other → new (other ends before new starts)
    if (otherEnd <= newStart) {
      const rest = newStart - otherEnd;
      if (rest < minRestMs) {
        return violation("DAILY_REST", config, rest);
      }
    }
    // Rest between new → other (new ends before other starts)
    if (newEnd <= otherStart) {
      const rest = otherStart - newEnd;
      if (rest < minRestMs) {
        return violation("DAILY_REST", config, rest);
      }
    }
  }
  return null;
}

function violation(code: "DAILY_REST", config: TenantComplianceConfig, restMs: number): ComplianceViolation {
  return {
    code,
    severity: "error",
    message: `Daily rest of ${(restMs / MS_PER_HR).toFixed(1)}h is below the required minimum of ${config.min_daily_rest_hrs}h.`,
    meta: { actual_rest_hrs: restMs / MS_PER_HR, required_hrs: config.min_daily_rest_hrs },
  };
}

export function checkForbiddenSequence(
  input: EvaluateAssignmentInput,
  existing: AssignmentWindow[],
  config: TenantComplianceConfig,
): ComplianceViolation | null {
  if (!input.shift_code) return null;
  const matrix = config.forbidden_sequence_matrix ?? {};
  const newStart = toMs(input.actual_start_timestamp);
  const newEnd = toMs(input.actual_end_timestamp);

  // Find immediate previous and next assignments for same employee
  let prev: AssignmentWindow | null = null;
  let next: AssignmentWindow | null = null;
  for (const a of existing) {
    if (a.id === input.ignore_assignment_id) continue;
    if (a.employee_id !== input.employee_id) continue;
    if (!a.shift_code) continue;
    const otherEnd = toMs(a.actual_end_timestamp);
    const otherStart = toMs(a.actual_start_timestamp);
    if (otherEnd <= newStart) {
      if (!prev || toMs(prev.actual_end_timestamp) < otherEnd) prev = a;
    } else if (otherStart >= newEnd) {
      if (!next || toMs(next.actual_start_timestamp) > otherStart) next = a;
    }
  }

  const forbidden = (from: string, to: string): boolean =>
    Array.isArray(matrix[from]) && matrix[from].includes(to);

  if (prev?.shift_code && forbidden(prev.shift_code, input.shift_code)) {
    return {
      code: "FORBIDDEN_SEQUENCE",
      severity: "error",
      message: `Shift sequence ${prev.shift_code} → ${input.shift_code} is forbidden by the ergonomics matrix.`,
      meta: { from: prev.shift_code, to: input.shift_code },
    };
  }
  if (next?.shift_code && forbidden(input.shift_code, next.shift_code)) {
    return {
      code: "FORBIDDEN_SEQUENCE",
      severity: "error",
      message: `Shift sequence ${input.shift_code} → ${next.shift_code} is forbidden by the ergonomics matrix.`,
      meta: { from: input.shift_code, to: next.shift_code },
    };
  }
  return null;
}

export interface EmployeeSkillRow {
  skill_id: string;
  certification_expiry_date: string | null;
}

export function checkCertifications(
  input: EvaluateAssignmentInput,
  employeeSkills: EmployeeSkillRow[],
): ComplianceViolation | null {
  if (!input.required_skill_ids || input.required_skill_ids.length === 0) return null;
  const shiftDate = input.actual_start_timestamp.slice(0, 10);
  const byId = new Map(employeeSkills.map((s) => [s.skill_id, s] as const));

  for (const required of input.required_skill_ids) {
    const row = byId.get(required);
    if (!row) {
      return {
        code: "MISSING_SKILL",
        severity: "error",
        message: "Employee is missing a skill required for this shift slot.",
        meta: { missing_skill_id: required },
      };
    }
    if (row.certification_expiry_date && row.certification_expiry_date < shiftDate) {
      return {
        code: "EXPIRED_CERTIFICATION",
        severity: "error",
        message: "A required certification has expired before the shift date.",
        meta: { skill_id: required, expired_on: row.certification_expiry_date },
      };
    }
  }
  return null;
}

// ---------- SOFT CONSTRAINTS -----------------------------------------

export function checkWeeklyHours(
  input: EvaluateAssignmentInput,
  existing: AssignmentWindow[],
  config: TenantComplianceConfig,
): ComplianceViolation | null {
  const newStart = toMs(input.actual_start_timestamp);
  const newEnd = toMs(input.actual_end_timestamp);
  const windowStart = newStart - 7 * 24 * MS_PER_HR;
  const windowEnd = newStart + 7 * 24 * MS_PER_HR;

  let totalMs = newEnd - newStart;
  for (const a of existing) {
    if (a.id === input.ignore_assignment_id) continue;
    if (a.employee_id !== input.employee_id) continue;
    const s = toMs(a.actual_start_timestamp);
    const e = toMs(a.actual_end_timestamp);
    if (e >= windowStart && s <= windowEnd) totalMs += Math.max(0, e - s);
  }
  const totalHrs = totalMs / MS_PER_HR;
  if (totalHrs > config.max_weekly_work_hrs) {
    return {
      code: "MAX_WEEKLY_HOURS",
      severity: "warning",
      message: `Scheduled ${totalHrs.toFixed(1)}h in a rolling 7-day window (max ${config.max_weekly_work_hrs}h).`,
      meta: { total_hrs: totalHrs, max_hrs: config.max_weekly_work_hrs },
    };
  }
  return null;
}

// ---------- ORCHESTRATOR ---------------------------------------------

export interface EvaluationContext {
  input: EvaluateAssignmentInput;
  config: TenantComplianceConfig;
  employeeAssignments: AssignmentWindow[];
  employeeSkills: EmployeeSkillRow[];
}

export function evaluate(ctx: EvaluationContext): ComplianceReport {
  const hard: ComplianceViolation[] = [];
  const soft: ComplianceViolation[] = [];

  const overlap = checkOverlap(ctx.input, ctx.employeeAssignments);
  if (overlap) hard.push(overlap);
  const rest = checkDailyRest(ctx.input, ctx.employeeAssignments, ctx.config);
  if (rest) hard.push(rest);
  const seq = checkForbiddenSequence(ctx.input, ctx.employeeAssignments, ctx.config);
  if (seq) hard.push(seq);
  const cert = checkCertifications(ctx.input, ctx.employeeSkills);
  if (cert) hard.push(cert);

  const weekly = checkWeeklyHours(ctx.input, ctx.employeeAssignments, ctx.config);
  if (weekly) soft.push(weekly);

  return {
    ok: hard.length === 0,
    hardViolations: hard,
    softViolations: soft,
  };
}
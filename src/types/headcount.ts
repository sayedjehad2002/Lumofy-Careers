export interface Employee {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  idIqamaNumber: string | null;
  jobTitle: string | null;
  department: string | null;
  reportsTo: string | null;
  tier: string;
  status: EmployeeStatus;
  joiningDate: string | null;
  photoUrl: string | null;
  lastActiveAt: string | null;
  notes: string | null;
  isOnProbation: boolean;
  probationStartDate: string | null;
  probationDurationMonths: number;
  createdAt: string;
  updatedAt: string;
}

export type EmployeeStatus = "Active" | "Not Active" | "Offboarded";

export const EMPLOYEE_STATUSES: EmployeeStatus[] = ["Active", "Not Active", "Offboarded"];

export const TIER_OPTIONS = ["Tier 0", "Tier 1", "Tier 2", "Tier 3"] as const;

export const DEPARTMENTS = [
  "Engineering", "Product", "Design", "Marketing", "Sales",
  "Human Resources", "Finance", "Legal", "Operations", "Customer Success",
  "Data Science", "Quality Assurance", "IT", "Administration", "Other"
] as const;

export const PROBATION_DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12] as const;

export function getEmployeeTags(employee: Employee): string[] {
  const tags: string[] = [];
  if (employee.isOnProbation && employee.status === "Active") {
    tags.push("On Probation");
  }
  if (!employee.joiningDate) return tags;
  const joining = new Date(employee.joiningDate);
  const now = new Date();
  const daysSinceJoining = Math.floor((now.getTime() - joining.getTime()) / (1000 * 60 * 60 * 24));
  if (employee.status === "Active" && daysSinceJoining <= 30) {
    tags.push("New Hire");
  }
  return tags;
}

export function getProbationEndDate(startDate: string | null, durationMonths: number): Date | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths);
  return end;
}

export function getProbationProgress(startDate: string | null, durationMonths: number): { daysLeft: number; percentComplete: number; isExpired: boolean } | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const end = getProbationEndDate(startDate, durationMonths)!;
  const now = new Date();
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const percentComplete = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  return { daysLeft, percentComplete, isExpired: now >= end };
}

export function getTimeAtOrg(joiningDate: string | null): string {
  if (!joiningDate) return "—";
  const joining = new Date(joiningDate);
  const now = new Date();
  const months = (now.getFullYear() - joining.getFullYear()) * 12 + (now.getMonth() - joining.getMonth());
  if (months < 1) {
    const days = Math.floor((now.getTime() - joining.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} month${rem !== 1 ? "s" : ""}`;
  return `${years}y ${rem}m`;
}

export function dbRowToEmployee(row: any): Employee {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    nationality: row.nationality,
    idIqamaNumber: row.id_iqama_number,
    jobTitle: row.job_title,
    department: row.department,
    reportsTo: row.reports_to,
    tier: row.tier || "Tier 1",
    status: row.status as EmployeeStatus,
    joiningDate: row.joining_date,
    photoUrl: row.photo_url,
    lastActiveAt: row.last_active_at,
    notes: row.notes,
    isOnProbation: row.is_on_probation || false,
    probationStartDate: row.probation_start_date || null,
    probationDurationMonths: row.probation_duration_months ?? 3,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function employeeToDbRow(e: Partial<Employee> & { fullName: string }) {
  return {
    full_name: e.fullName,
    email: e.email || null,
    phone: e.phone || null,
    nationality: e.nationality || null,
    id_iqama_number: e.idIqamaNumber || null,
    job_title: e.jobTitle || null,
    department: e.department || null,
    reports_to: e.reportsTo || null,
    tier: e.tier || "Tier 1",
    status: e.status || "Active",
    joining_date: e.joiningDate || null,
    photo_url: e.photoUrl || null,
    notes: e.notes || null,
    is_on_probation: e.isOnProbation || false,
    probation_start_date: e.probationStartDate || null,
    probation_duration_months: e.probationDurationMonths ?? 3,
  };
}

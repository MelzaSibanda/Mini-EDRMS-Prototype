import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function generateDocumentNumber(prefix: string = "EDMS"): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}-${year}-${random}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    submitted: "bg-blue-100 text-blue-700",
    under_review: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    active: "bg-emerald-100 text-emerald-700",
    archived: "bg-gray-100 text-gray-700",
    expired: "bg-orange-100 text-orange-700",
    disposed: "bg-slate-100 text-slate-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

export function getClassificationColor(classification: string): string {
  const colors: Record<string, string> = {
    public: "bg-green-100 text-green-700",
    internal: "bg-blue-100 text-blue-700",
    confidential: "bg-yellow-100 text-yellow-700",
    restricted: "bg-orange-100 text-orange-700",
    top_secret: "bg-red-100 text-red-700",
  };
  return colors[classification] || "bg-gray-100 text-gray-700";
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-yellow-100 text-yellow-700",
    critical: "bg-red-100 text-red-700",
  };
  return colors[priority] || "bg-gray-100 text-gray-700";
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    system_administrator: "System Administrator",
    records_manager: "Records Manager",
    records_officer: "Records Officer",
    department_manager: "Department Manager",
    document_owner: "Document Owner",
    compliance_officer: "Department Contributor",
    dispute_resolution_officer: "Department Contributor",
    enforcement_officer: "Department Contributor",
    hr_officer: "HR Officer",
    finance_officer: "Finance Officer",
    general_employee: "General Employee",
    auditor: "Auditor",
  };
  return labels[role] || role;
}

export function getLifecycleStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    create: "Create",
    capture: "Capture",
    classify: "Classify",
    review: "Review",
    approve: "Approve",
    active_record: "Active Record",
    retention: "Retention",
    retention_review: "Retention Review",
    archive: "Archive",
    authorised_disposition: "Authorised Disposition",
  };
  return labels[stage] || stage;
}

export function getRecordCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    collective_bargaining: "Historical category",
    collective_agreements: "Historical category",
    dispute_resolution: "Historical category",
    compliance: "Historical category",
    enforcement: "Historical category",
    human_resources: "Human Resources",
    finance: "Finance",
    procurement: "Procurement",
    information_technology: "Information Technology",
    administration: "Administration",
    corporate_services: "Corporate Services",
    governance: "Governance",
  };
  return labels[category] || category;
}
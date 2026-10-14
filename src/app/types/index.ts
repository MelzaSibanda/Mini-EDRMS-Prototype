// Legacy interchange types retained for existing data; current product roles/configuration live in enterprise.ts and repository-config.ts.
export type UserRole = 
  | "system_administrator"
  | "records_manager"
  | "records_officer"
  | "department_manager"
  | "document_owner"
  | "compliance_officer"
  | "dispute_resolution_officer"
  | "enforcement_officer"
  | "hr_officer"
  | "finance_officer"
  | "general_employee"
  | "auditor";

export type Permission = 
  | "view"
  | "create"
  | "edit"
  | "upload"
  | "download"
  | "approve"
  | "reject"
  | "delete"
  | "archive"
  | "retention_review"
  | "disposition"
  | "manage_users"
  | "manage_roles"
  | "view_audit_logs"
  | "manage_workflows"
  | "manage_retention";

export type DocumentLifecycleStage = 
  | "create"
  | "capture"
  | "classify"
  | "review"
  | "approve"
  | "active_record"
  | "retention"
  | "retention_review"
  | "archive"
  | "authorised_disposition";

export type DocumentStatus = 
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "active"
  | "archived"
  | "expired"
  | "disposed";

export type SecurityClassification = 
  | "public"
  | "internal"
  | "confidential"
  | "restricted"
  | "top_secret";

export type RecordCategory = 
  | "collective_bargaining"
  | "collective_agreements"
  | "dispute_resolution"
  | "compliance"
  | "enforcement"
  | "human_resources"
  | "finance"
  | "procurement"
  | "information_technology"
  | "administration"
  | "corporate_services"
  | "governance";

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  businessUnit?: string;
  region?: string;
  role: UserRole;
  permissions: Permission[];
  avatar?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  businessUnit: string;
  region: string;
  managerId?: string;
  parentDepartmentId?: string;
  description?: string;
  isActive: boolean;
}

export interface DocumentType {
  id: string;
  name: string;
  code: string;
  category: RecordCategory;
  description?: string;
  retentionRuleId?: string;
  metadataSchema?: Record<string, unknown>;
  isActive: boolean;
}

export interface RetentionRule {
  id: string;
  name: string;
  code: string;
  category: RecordCategory;
  retentionPeriod: string;
  retentionStartEvent: string;
  dispositionAction: "archive" | "destroy" | "review";
  requiresApproval: boolean;
  approverRole?: UserRole;
  legalBasis?: string;
  isActive: boolean;
}

export interface DocumentVersion {
  version: string;
  authorId: string;
  authorName: string;
  date: string;
  changeDescription: string;
  isCurrent: boolean;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
}

export interface DocumentMetadata {
  documentNumber: string;
  title: string;
  documentTypeId: string;
  documentType?: DocumentType;
  recordCategory: RecordCategory;
  departmentId: string;
  department?: Department;
  businessUnitId: string;
  regionId: string;
  ownerId: string;
  owner?: User;
  createdById: string;
  createdBy?: User;
  classification: SecurityClassification;
  status: DocumentStatus;
  lifecycleStage: DocumentLifecycleStage;
  version: string;
  effectiveDate?: string;
  expiryDate?: string;
  retentionRuleId?: string;
  retentionRule?: RetentionRule;
  retentionStartDate?: string;
  reviewDate?: string;
  createdDate: string;
  modifiedDate: string;
  tags?: string[];
  description?: string;
  keywords?: string[];
}

export interface Document extends DocumentMetadata {
  id: string;
  versions: DocumentVersion[];
  currentVersion: DocumentVersion;
  workflowInstanceId?: string;
}

export interface WorkflowAction {
  id: string;
  workflowInstanceId: string;
  stepId: string;
  stepName: string;
  action: "approve" | "reject" | "request_changes" | "reassign" | "escalate" | "comment" | "delegate";
  userId: string;
  userName: string;
  comment?: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
}

export interface WorkflowInstance {
  id: string;
  documentId: string;
  workflowDefinitionId: string;
  currentStepId: string;
  status: "active" | "completed" | "terminated" | "escalated";
  initiatedBy: string;
  initiatedDate: string;
  completedDate?: string;
  actions: WorkflowAction[];
  assignedTo?: string;
  dueDate?: string;
}

export interface AuditEvent {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  recordType: string;
  recordId: string;
  recordTitle: string;
  timestamp: string;
  ipAddress?: string;
  deviceInfo?: string;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
  severity: "info" | "warning" | "critical";
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: "approval" | "review" | "classification" | "retention_review" | "disposition" | "general";
  status: "pending" | "in_progress" | "completed" | "overdue" | "escalated";
  priority: "low" | "medium" | "high" | "critical";
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  assignedByName: string;
  documentId?: string;
  documentTitle?: string;
  workflowInstanceId?: string;
  createdDate: string;
  dueDate: string;
  completedDate?: string;
  relatedRecordIds?: string[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "task_assigned" | "task_completed" | "approval_required" | "document_expiring" | "retention_review_due";
  isRead: boolean;
  createdDate: string;
  relatedRecordId?: string;
  relatedRecordType?: string;
  actionUrl?: string;
}

export interface SearchFilters {
  keywords?: string;
  documentNumber?: string;
  documentTypeId?: string;
  departmentId?: string;
  regionId?: string;
  ownerId?: string;
  status?: DocumentStatus;
  classification?: SecurityClassification;
  dateRange?: { from: string; to: string };
  effectiveDateRange?: { from: string; to: string };
  expiryDateRange?: { from: string; to: string };
  recordCategory?: RecordCategory;
  lifecycleStage?: DocumentLifecycleStage;
}

export interface SearchResult {
  documents: Document[];
  totalCount: number;
  page: number;
  pageSize: number;
  facets: {
    documentTypes: { id: string; name: string; count: number }[];
    departments: { id: string; name: string; count: number }[];
    statuses: { status: DocumentStatus; count: number }[];
    classifications: { classification: SecurityClassification; count: number }[];
    recordCategories: { category: RecordCategory; count: number }[];
  };
}

export interface DashboardMetrics {
  totalRecords: number;
  activeRecords: number;
  awaitingMyAction: number;
  underReview: number;
  expiringRecords: number;
  overdueActions: number;
  retentionReviewRequired: number;
  recentActivity: ActivityEvent[];
  workflowActivity: WorkflowActivityEvent[];
  departmentDistribution: { department: string; count: number }[];
  lifecycleDistribution: { stage: DocumentLifecycleStage; count: number }[];
  securityAlerts: SecurityAlert[];
}

export interface ActivityEvent {
  id: string;
  type: "document_created" | "document_viewed" | "document_edited" | "document_approved" | "document_rejected" | "workflow_started" | "workflow_completed" | "version_created" | "retention_reviewed" | "disposition_initiated";
  userId: string;
  userName: string;
  documentId: string;
  documentTitle: string;
  timestamp: string;
  details?: string;
}

export interface WorkflowActivityEvent {
  id: string;
  workflowInstanceId: string;
  documentId: string;
  documentTitle: string;
  stepName: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
  status: "pending" | "completed" | "escalated";
}

export interface SecurityAlert {
  id: string;
  type: "unauthorized_access" | "permission_change" | "bulk_download" | "retention_violation" | "classification_mismatch";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  userId?: string;
  userName?: string;
  documentId?: string;
  documentTitle?: string;
  timestamp: string;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedDate?: string;
}
import { useSyncExternalStore } from 'react';
import { defaultConfig, type RepositoryConfig } from './repository-config';
import { genericInitialState } from './demonstration-data';
import { legacyRoles, migrateDemonstrationBranding, METADATA_STORAGE_KEY, FILE_STORAGE_DATABASE } from './legacy-branding-compatibility';
export const departments = defaultConfig().departments;
export const documentTypes = defaultConfig().documentTypes;
export const stages = ['Create', 'Capture', 'Classify', 'Review', 'Approve', 'Active Record', 'Retention', 'Retention Review', 'Archive', 'Authorised Disposition'];
export const roles = ['records_manager', 'records_officer', 'department_manager', 'document_owner', 'hr_officer', 'finance_officer', 'general_employee', 'auditor', 'system_administrator'] as const;
export type Role = typeof roles[number] | keyof typeof legacyRoles;
export const isSupportedRole = (value: string): value is Role => roles.some(role => role === value) || Object.hasOwn(legacyRoles, value);
export interface Identity {
  id: string;
  name: string;
  role: Role;
  department: string;
  permissions: string[];
}
export const roleLabel = (role: string) => Object.hasOwn(legacyRoles, role) ? 'Department Contributor' : role.split('_').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
export function identity(role: Role): Identity {
  const department = ({
    hr_officer: 'Human Resources',
    finance_officer: 'Finance',
    system_administrator: 'Information Technology'
  } as Record<string, string>)[role] || (role in legacyRoles ? legacyRoles[role as keyof typeof legacyRoles].department : state.repositoryConfig?.departments.includes('Governance') ? 'Governance' : 'Operations');
  const rights: Record<string, string[]> = {
    system_administrator: ['manage_users', 'manage_roles', 'manage_categories'],
    records_manager: ['view', 'create', 'edit', 'upload', 'download', 'archive', 'delete', 'view_audit_logs', 'manage_categories', 'manage_document_access'],
    records_officer: ['view', 'create', 'edit', 'upload', 'download', 'archive'],
    department_manager: ['view', 'create', 'edit', 'upload', 'download'],
    document_owner: ['view', 'create', 'edit', 'upload', 'download'],
    auditor: ['view', 'view_audit_logs'],
    general_employee: ['view']
  };
  return {
    id: `evaluation-${role}`,
    name: `${roleLabel(role)} · Evaluation`,
    role,
    department,
    permissions: rights[role] || ['view', 'create', 'edit', 'upload', 'download']
  };
}
export interface Version {
  number: string;
  author: string;
  date: string;
  description: string;
  fileId?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}
export interface RecordItem {
  storageStatus?: "Available" | "Metadata only" | "Archived" | "Deleted";
  uploadedById?: string;
  tags?: string[];
  extractedText?: string;
  extraction?: {
    method: string;
    pages: number;
    totalPages: number;
    partial: boolean;
  };
  relatedDocumentIds?: string[];
  sourceReference?: string;
  id: string;
  number: string;
  title: string;
  type: string;
  category: string;
  department: string;
  businessUnit: string;
  region: string;
  owner: string;
  createdBy: string;
  classification: string;
  status: string;
  stage: string;
  effective: string;
  expiry: string;
  review: string;
  retentionRule: string;
  retentionStart: string;
  created: string;
  modified: string;
  versions: Version[];
  description: string;
  assignee: string;
  due: string;
  legalHold: boolean;
  disposition: string;
  business: Record<string, string>;
}
export interface Audit {
  id: string;
  actor: string;
  role: string;
  action: string;
  recordId: string;
  recordTitle: string;
  time: string;
  previous: string;
  next: string;
  device: string;
}
export interface Schedule {
  id: string;
  category: string;
  period: string;
  start: string;
  approved: boolean;
  officer: string;
}
export interface WorkflowConfig {
  department: string;
  name: string;
  reviewer: Role;
  approver: Role;
  dueDays: number;
}
export interface State {
  repositoryConfig?: RepositoryConfig;
  workflowConfigs: WorkflowConfig[];
  schema: number;
  records: RecordItem[];
  audit: Audit[];
  schedules: Schedule[];
  recent: string[];
  readNotifications: string[];
}
export const key = METADATA_STORAGE_KEY;
export const today = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Johannesburg',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());
export const date = (value: string) => value ? new Intl.DateTimeFormat('en-ZA', {
  timeZone: 'Africa/Johannesburg',
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}).format(new Date(value.length === 10 ? `${value}T12:00:00+02:00` : value)) : 'Not specified';
export const timestamp = (value: string) => new Intl.DateTimeFormat('en-ZA', {
  timeZone: 'Africa/Johannesburg',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
}).format(new Date(value));
export function initialState(): State {
  return genericInitialState();
}
function load(): State {
  const saved = localStorage.getItem(key);
  if (!saved) return initialState();
  const parsed = JSON.parse(saved);
  if (parsed.schema !== 1 || !Array.isArray(parsed.records) || !Array.isArray(parsed.audit)) throw new Error('Stored evaluation data is not compatible. Preserve it before migration.');
  return normaliseState(parsed);
}
export function normaliseState(parsed: State): State {
  parsed = migrateDemonstrationBranding(parsed);
  return {
    ...parsed,
    workflowConfigs: parsed.workflowConfigs || [],
    repositoryConfig: parsed.repositoryConfig || defaultConfig(),
    records: parsed.records.map(r => ({
      ...r,
      sourceReference: r.sourceReference || r.business?.['Case number'] || r.business?.['Agreement number'] || '',
      storageStatus: r.storageStatus || (['Archive', 'Authorised Disposition'].includes(r.stage) || r.status === 'Archived' ? 'Archived' : r.versions.some(v => v.fileId) ? 'Available' : 'Metadata only'),
      tags: r.tags || []
    }))
  };
}
let state = normaliseState(load());
let persistedSnapshot = localStorage.getItem(key);
const listeners = new Set<() => void>();
export const snapshot = () => state;
export const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export function useRecords() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
export function commit(next: State) {
  const stored = localStorage.getItem(key);
  if (stored !== persistedSnapshot) {
    throw new Error('This workspace changed in another tab. Reload before saving to avoid overwriting records.');
  }
  const serialised = JSON.stringify(next);
  localStorage.setItem(key, serialised);
  persistedSnapshot = serialised;
  state = next;
  listeners.forEach(fn => fn());
}
export function canRead(user: Identity, r: RecordItem) {
  if (!user.permissions.includes('view')) return false;
  const rule = (state.repositoryConfig || defaultConfig()).classifications.find(c => c.name === r.classification);
  if (!rule) return false;
  if (rule.access === 'restricted') return user.role !== 'auditor' && user.department === r.department;
  return rule.access === 'public' || rule.access === 'internal' || user.department === r.department || ['records_manager', 'records_officer', 'auditor'].includes(user.role);
}
export function requireRight(user: Identity, right: string, r?: RecordItem) {
  if (!user.permissions.includes(right) || r && !canRead(user, r)) throw new Error('Your role does not authorise this document action.');
  if (r && ['edit', 'upload', 'archive', 'delete', 'manage_document_access'].includes(right) && !['records_manager', 'records_officer'].includes(user.role) && r.department !== user.department) throw new Error('Document changes are limited to your department.');
}
export const visible = (user: Identity) => state.records.filter(r => canRead(user, r) && r.storageStatus !== 'Deleted');
export function event(user: Identity, action: string, r: RecordItem | undefined, previous = '', next = ''): Audit {
  return {
    id: crypto.randomUUID(),
    actor: user.name,
    role: user.role,
    action,
    recordId: r?.id || '',
    recordTitle: r?.title || 'Information governance',
    time: new Date().toISOString(),
    previous,
    next,
    device: 'Browser evaluation session · IP not collected'
  };
}
export function log(user: Identity, action: string, r?: RecordItem, previous = '', next = '') {
  if (r) requireRight(user, 'view', r);
  commit({
    ...state,
    audit: [event(user, action, r, previous, next), ...state.audit],
    recent: action === 'Document viewed' && r ? [r.id, ...state.recent.filter(id => id !== r.id)].slice(0, 8) : state.recent
  });
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FILE_STORAGE_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('File storage is unavailable.'));
  });
}
export async function saveFile(file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error('The evaluation workspace accepts files up to 20 MB.');
  const db = await database();
  const id = crypto.randomUUID();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error('File could not be stored.'));
    tx.onabort = () => reject(new Error('File storage was interrupted.'));
  });
  db.close();
  return id;
}
export async function getFile(id: string): Promise<Blob> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const req = db.transaction('files').objectStore('files').get(id);
    req.onsuccess = () => {
      db.close();
      req.result ? resolve(req.result) : reject(new Error('No attachment is available for this version.'));
    };
    req.onerror = () => {
      db.close();
      reject(new Error('Unable to read attachment.'));
    };
  });
}
export async function removeUnlinkedFile(id: string): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('The failed upload could not be cleaned up.'));
      tx.onabort = () => reject(new Error('Upload cleanup was interrupted.'));
    });
  } finally {
    db.close();
  }
}

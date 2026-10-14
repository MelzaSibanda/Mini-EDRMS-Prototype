/** EDMS backend integration boundary. The evaluation workspace uses enterprise.ts. */
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
export interface Department {
  id: string;
  name: string;
  description: string;
}
export interface DocumentType {
  id: string;
  name: string;
  description: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  department_id: string;
}
export interface Document {
  id: string;
  title: string;
  document_type_id: string;
  department_id: string;
  owner_id: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Archived';
  date_created: string;
  description: string;
  department?: Department;
  owner?: User;
  document_type?: DocumentType;
}
export interface CreateDocumentDTO {
  title: string;
  document_type_id: string;
  department_id: string;
  owner_id: string;
  status: string;
  description?: string;
}
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-964a65bf`;
let accessToken: string | null = null;
/** Supply an organisational access token only after server authorisation is integrated. */
export function setBackendAccessToken(token: string | null) {
  accessToken = token;
}
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!accessToken) throw new Error('Authenticated backend integration is not configured.');
  const response = await fetch(BASE_URL + endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': publicAnonKey,
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Backend request failed (${response.status}).`);
  return payload as T;
}
export async function initializeDatabase(): Promise<{
  message: string;
  alreadyInitialized?: boolean;
}> {
  return apiFetch('/init-database', {
    method: 'POST'
  });
}
export async function getDepartments(): Promise<Department[]> {
  return apiFetch('/departments');
}
export async function getDocumentTypes(): Promise<DocumentType[]> {
  return apiFetch('/document-types');
}
export async function getUsers(): Promise<User[]> {
  return apiFetch('/users');
}
export async function getDocuments(): Promise<Document[]> {
  return apiFetch('/documents');
}
export async function getDocumentById(id: string): Promise<Document> {
  return apiFetch('/documents/' + encodeURIComponent(id));
}
export async function searchDocuments(filters: {
  department_id?: string;
  status?: string;
}): Promise<Document[]> {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
  return apiFetch('/documents/search?' + p);
}
export async function createDocument(data: CreateDocumentDTO): Promise<Document> {
  return apiFetch('/documents', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
export async function updateDocument(id: string, data: Partial<Document>): Promise<Document> {
  return apiFetch('/documents/' + encodeURIComponent(id), {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}
export async function deleteDocument(id: string): Promise<{
  message: string;
}> {
  return apiFetch('/documents/' + encodeURIComponent(id), {
    method: 'DELETE'
  });
}

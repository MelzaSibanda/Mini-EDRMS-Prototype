/**
 * API Client for EDRMS Backend
 * 
 * This module handles all communication with the backend server
 * It demonstrates RESTful API patterns and HTTP methods (GET, POST, PUT, DELETE)
 * 
 * Base URL: https://{projectId}.supabase.co/functions/v1/make-server-964a65bf
 * All requests include Authorization header with the public anon key
 */

import { projectId, publicAnonKey } from '/utils/supabase/info';

// Base URL for all API requests
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-964a65bf`;

/**
 * TypeScript interfaces representing database entities
 * These mirror the database schema and demonstrate data modeling
 */

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
  // Related data from JOIN operations
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

/**
 * Generic fetch wrapper with error handling
 * For demo purposes, returns mock data instead of making API calls
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Mock data for demonstration
  console.log(`Mock API call: ${endpoint}`);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));

  if (endpoint === '/departments') {
    return Promise.resolve([
      { id: "1", name: "HR" },
      { id: "2", name: "Finance" },
      { id: "3", name: "IT" },
      { id: "4", name: "Operations" },
    ] as T);
  }

  if (endpoint === '/document-types') {
    return Promise.resolve([
      { id: "1", name: "Policy" },
      { id: "2", name: "Contract" },
      { id: "3", name: "Invoice" },
      { id: "4", name: "Evaluation Report" },
    ] as T);
  }

  if (endpoint === '/users') {
    return Promise.resolve([
      { id: "1", name: "Sarah Johnson", email: "sarah.johnson@company.com", department_id: "1" },
      { id: "2", name: "Michael Chen", email: "michael.chen@company.com", department_id: "2" },
      { id: "3", name: "David Kumar", email: "david.kumar@company.com", department_id: "3" },
      { id: "4", name: "Emma Williams", email: "emma.williams@company.com", department_id: "4" },
    ] as T);
  }

  if (endpoint.startsWith('/documents')) {
    // Get all documents first
    const allDocuments = [
      {
        id: "1",
        title: "Employee Handbook 2026",
        document_type_id: "1",
        department_id: "1",
        owner_id: "1",
        status: "Approved",
        date_created: "2026-01-15",
        description: "Employee Handbook 2026",
        department: { id: "1", name: "HR" },
        document_type: { id: "1", name: "Policy" },
        owner: { id: "1", name: "Sarah Johnson", email: "sarah.johnson@company.com", department_id: "1" }
      },
      {
        id: "2",
        title: "Q4 2025 Financial Report",
        document_type_id: "4",
        department_id: "2",
        owner_id: "2",
        status: "Approved",
        date_created: "2026-01-20",
        description: "Q4 2025 Financial Report",
        department: { id: "2", name: "Finance" },
        document_type: { id: "4", name: "Evaluation Report" },
        owner: { id: "2", name: "Michael Chen", email: "michael.chen@company.com", department_id: "2" }
      },
      {
        id: "3",
        title: "Software License Agreement",
        document_type_id: "2",
        department_id: "3",
        owner_id: "3",
        status: "Submitted",
        date_created: "2026-02-01",
        description: "Software License Agreement",
        department: { id: "3", name: "IT" },
        document_type: { id: "2", name: "Contract" },
        owner: { id: "3", name: "David Kumar", email: "david.kumar@company.com", department_id: "3" }
      },
      {
        id: "4",
        title: "Office Supplies Invoice - January",
        document_type_id: "3",
        department_id: "4",
        owner_id: "4",
        status: "Approved",
        date_created: "2026-02-05",
        description: "Office Supplies Invoice - January",
        department: { id: "4", name: "Operations" },
        document_type: { id: "3", name: "Invoice" },
        owner: { id: "4", name: "Emma Williams", email: "emma.williams@company.com", department_id: "4" }
      },
      {
        id: "5",
        title: "Remote Work Policy Draft",
        document_type_id: "1",
        department_id: "1",
        owner_id: "1",
        status: "Draft",
        date_created: "2026-02-10",
        description: "Remote Work Policy Draft",
        department: { id: "1", name: "HR" },
        document_type: { id: "1", name: "Policy" },
        owner: { id: "1", name: "Sarah Johnson", email: "sarah.johnson@company.com", department_id: "1" }
      },
      {
        id: "6",
        title: "Network Security Assessment",
        document_type_id: "4",
        department_id: "3",
        owner_id: "3",
        status: "Submitted",
        date_created: "2026-02-11",
        description: "Network Security Assessment",
        department: { id: "3", name: "IT" },
        document_type: { id: "4", name: "Evaluation Report" },
        owner: { id: "3", name: "David Kumar", email: "david.kumar@company.com", department_id: "3" }
      },
    ];

    if (endpoint === '/documents') {
      return Promise.resolve(allDocuments as T);
    }

    if (endpoint.startsWith('/documents/search')) {
      // Parse query parameters for filtering
      const url = new URL(endpoint, 'http://localhost');
      const department_id = url.searchParams.get('department_id');
      const status = url.searchParams.get('status');

      let filtered = allDocuments;
      if (department_id) {
        filtered = filtered.filter(doc => doc.department_id === department_id);
      }
      if (status) {
        filtered = filtered.filter(doc => doc.status === status);
      }

      return Promise.resolve(filtered as T);
    }

    if (endpoint.match(/^\/documents\/\d+$/)) {
      const id = endpoint.split('/').pop();
      const documents = [
        {
          id: "1",
          title: "Employee Handbook 2026",
          document_type_id: "1",
          department_id: "1",
          owner_id: "1",
          status: "Approved",
          date_created: "2026-01-15",
          description: "Employee Handbook 2026",
          department: { id: "1", name: "HR" },
          document_type: { id: "1", name: "Policy" },
          owner: { id: "1", name: "Sarah Johnson", email: "sarah.johnson@company.com", department_id: "1" }
        },
        // ... other documents
      ];
      const doc = documents.find(d => d.id === id);
      if (doc) {
        return Promise.resolve(doc as T);
      }
      throw new Error("Document not found");
    }

    if (options.method === 'POST') {
      // Mock create
      return Promise.resolve({
        id: "7",
        title: "New Document",
        document_type_id: "1",
        department_id: "1",
        owner_id: "1",
        status: "Draft",
        date_created: new Date().toISOString().split('T')[0],
        description: "New Document",
        department: { id: "1", name: "HR" },
        document_type: { id: "1", name: "Policy" },
        owner: { id: "1", name: "Sarah Johnson", email: "sarah.johnson@company.com", department_id: "1" }
      } as T);
    }

    if (options.method === 'PUT') {
      // Mock update
      return Promise.resolve({
        id: "1",
        title: "Updated Document",
        document_type_id: "1",
        department_id: "1",
        owner_id: "1",
        status: "Approved",
        date_created: "2026-01-15",
        description: "Updated Document",
        department: { id: "1", name: "HR" },
        document_type: { id: "1", name: "Policy" },
        owner: { id: "1", name: "Sarah Johnson", email: "sarah.johnson@company.com", department_id: "1" }
      } as T);
    }

    if (options.method === 'DELETE') {
      return Promise.resolve({ message: "Document deleted successfully" } as T);
    }
  }

  if (endpoint === '/statistics') {
    // Calculate statistics from documents
    const documents = await apiFetch<Document[]>('/documents');
    const totalDocuments = documents.length;
    const statusCounts = { Draft: 0, Submitted: 0, Approved: 0, Archived: 0 };
    const deptCounts: { [key: string]: number } = {};

    documents.forEach(doc => {
      if (statusCounts[doc.status as keyof typeof statusCounts] !== undefined) {
        statusCounts[doc.status as keyof typeof statusCounts]++;
      }
      if (doc.department?.name) {
        deptCounts[doc.department.name] = (deptCounts[doc.department.name] || 0) + 1;
      }
    });

    return Promise.resolve({
      totalDocuments,
      statusCounts,
      deptCounts,
    } as T);
  }

  // Default mock response
  return Promise.resolve({ message: "Mock API response" } as T);
}

/**
 * SYSTEM OPERATIONS
 */

// Initialize database with seed data (called once on first load)
export async function initializeDatabase(): Promise<{ message: string; alreadyInitialized?: boolean }> {
  return apiFetch('/init-database', { method: 'POST' });
}

/**
 * DEPARTMENTS - Demonstrates SELECT operations on lookup tables
 */

export async function getDepartments(): Promise<Department[]> {
  return apiFetch('/departments');
}

/**
 * DOCUMENT TYPES - Demonstrates SELECT operations on lookup tables
 */

export async function getDocumentTypes(): Promise<DocumentType[]> {
  return apiFetch('/document-types');
}

/**
 * USERS - Demonstrates SELECT operations on user table
 */

export async function getUsers(): Promise<User[]> {
  return apiFetch('/users');
}

/**
 * DOCUMENTS - Demonstrates full CRUD operations
 * CREATE, READ, UPDATE, DELETE
 */

// READ all documents with JOIN (demonstrates table relationships)
export async function getDocuments(): Promise<Document[]> {
  return apiFetch('/documents');
}

// READ single document by ID with JOIN
export async function getDocumentById(id: string): Promise<Document> {
  return apiFetch(`/documents/${id}`);
}

// SEARCH documents with filters (demonstrates WHERE clause)
export async function searchDocuments(filters: {
  department_id?: string;
  status?: string;
}): Promise<Document[]> {
  const params = new URLSearchParams();
  if (filters.department_id) params.append('department_id', filters.department_id);
  if (filters.status) params.append('status', filters.status);
  
  const queryString = params.toString();
  return apiFetch(`/documents/search${queryString ? '?' + queryString : ''}`);
}

// CREATE new document (demonstrates INSERT operation)
export async function createDocument(data: CreateDocumentDTO): Promise<Document> {
  return apiFetch('/documents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// UPDATE existing document (demonstrates UPDATE operation)
export async function updateDocument(id: string, data: Partial<Document>): Promise<Document> {
  return apiFetch(`/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// DELETE document (demonstrates DELETE operation)
export async function deleteDocument(id: string): Promise<{ message: string }> {
  return apiFetch(`/documents/${id}`, {
    method: 'DELETE',
  });
}

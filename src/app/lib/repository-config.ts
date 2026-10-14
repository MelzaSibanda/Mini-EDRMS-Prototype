export interface Classification {
  name: string;
  access: 'public' | 'internal' | 'department' | 'restricted';
}
export interface Collection {
  id: string;
  name: string;
  description: string;
  department?: string;
  type?: string;
  tags?: string[];
}
export interface RepositoryConfig {
  departments: string[];
  documentTypes: string[];
  classifications: Classification[];
  collections: Collection[];
  requiredFields: Record<string, string[]>;
  archiveEnabled: boolean;
  archiveReference: string;
  deleteEnabled: boolean;
  deleteReference: string;
}
export const mandatoryFields = ['title', 'type', 'department', 'owner', 'classification'];
export function defaultConfig(): RepositoryConfig {
  return {
    departments: ['Human Resources', 'Finance', 'Information Technology', 'Operations', 'Administration', 'Procurement'],
    documentTypes: ['Handbook', 'Policy', 'Agreement', 'Contract', 'Meeting minutes', 'Requirements document', 'Training material', 'Guidelines', 'Report', 'Technical documentation', 'Correspondence', 'Spreadsheet', 'Presentation', 'Other document'],
    classifications: [{
      name: 'Public',
      access: 'public'
    }, {
      name: 'Internal',
      access: 'internal'
    }, {
      name: 'Confidential',
      access: 'department'
    }, {
      name: 'Restricted',
      access: 'restricted'
    }],
    collections: [{
      id: 'governance',
      name: 'Administration documents',
      description: 'Documents owned by Administration.',
      department: 'Administration'
    }, {
      id: 'agreements',
      name: 'Agreement library',
      description: 'Stored agreements. Business processes remain in their existing systems.',
      type: 'Agreement'
    }],
    requiredFields: {},
    archiveEnabled: false,
    archiveReference: '',
    deleteEnabled: false,
    deleteReference: ''
  };
}

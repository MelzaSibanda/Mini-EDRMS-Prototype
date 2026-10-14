// Compatibility fingerprints only; never presented as product branding.
// Storage and role identifiers remain unchanged to protect existing data/sessions.
import type { State, RecordItem } from './enterprise';
import { demonstrationRecord } from './demonstration-data';
import { defaultConfig } from './repository-config';
export const legacyRoles = {
  compliance_officer: {
    department: 'Compliance'
  },
  dispute_resolution_officer: {
    department: 'Dispute Resolution'
  },
  enforcement_officer: {
    department: 'Enforcement'
  }
} as const;
export const legacySamplePrefix = 'NBCRFLI-2026-';
const oldRows = [['Collective Bargaining Agreement – 2026', 'Agreement', 'Collective Bargaining', 'Internal'], ['Compliance Inspection Report', 'Inspection report', 'Compliance', 'Confidential'], ['Dispute Resolution Case File', 'Case file', 'Dispute Resolution', 'Restricted'], ['Regional Office Correspondence', 'Correspondence', 'Regional Offices', 'Internal'], ['Supplier Service Agreement', 'Contract', 'Procurement', 'Confidential'], ['HR Policy Review', 'Policy', 'Human Resources', 'Confidential'], ['Enforcement Investigation Record', 'Investigation record', 'Enforcement', 'Restricted'], ['Information Governance Policy', 'Policy', 'Governance', 'Internal'], ['Finance Quarterly Review', 'Financial report', 'Finance', 'Confidential'], ['Collective Agreement Amendment', 'Agreement', 'Collective Agreements', 'Internal'], ['IT Access Review', 'Policy', 'Information Technology', 'Confidential'], ['Corporate Services Meeting Record', 'Correspondence', 'Corporate Services', 'Internal']];
export function isUntouchedLegacySample(record: RecordItem, index: number) {
  const old = oldRows[index];
  return !!old && record.id === String(index + 1) && record.number === legacySamplePrefix + String(index + 1).padStart(4, '0') && record.title === old[0] && record.type === old[1] && record.department === old[2] && record.classification === old[3] && record.owner === `Fictional ${old[2]} Officer` && record.createdBy === 'Fictional Records Officer' && record.created === `2026-09-${String(12 + index).padStart(2, '0')}` && record.modified === `2026-10-${String(1 + index % 10).padStart(2, '0')}` && record.description === 'Fictional evaluation record. No real employee, employer, case or agreement information is represented.' && !record.tags?.length && !record.relatedDocumentIds?.length && !record.extractedText && !record.uploadedById && !record.extraction && record.versions.length === 2 && record.versions.every(v => !v.fileId && !v.fileName && !v.fileType && v.fileSize === undefined) && record.versions[0].number === '1.0' && record.versions[0].author === 'Fictional Records Officer' && record.versions[0].description === 'Initial controlled capture' && record.versions[1].number === '1.1' && record.versions[1].author === `Fictional ${old[2]} Officer` && record.versions[1].description === 'Metadata and classification review';
}
export function migrateDemonstrationBranding(input: State): State {
  const replaced = new Set<string>();
  const records = input.records.map(r => {
    const index = Number(r.id) - 1;
    if (isUntouchedLegacySample(r, index)) {
      replaced.add(r.id);
      const generic = demonstrationRecord(index);
      return {
        ...r,
        number: generic.number,
        title: generic.title,
        type: generic.type,
        department: generic.department,
        category: r.category === r.department ? generic.category : r.category,
        owner: generic.owner,
        createdBy: generic.createdBy,
        description: generic.description,
        versions: r.versions.map((v, i) => ({
          ...v,
          author: generic.versions[i].author,
          description: generic.versions[i].description
        }))
      };
    }
    return r;
  });
  const previous = input.repositoryConfig;
  const generic = defaultConfig();
  let config = previous || {
    ...generic,
    departments: [...new Set([...generic.departments, ...records.map(r => r.department)])],
    documentTypes: [...new Set([...generic.documentTypes, ...Object.keys(previous?.requiredFields || {}), ...records.map(r => r.type)])]
  };
  if (previous) {
    const oldDepartments = ['Governance', 'Collective Bargaining', 'Collective Agreements', 'Dispute Resolution', 'Compliance', 'Enforcement', 'Human Resources', 'Finance', 'Procurement', 'Information Technology', 'Administration', 'Regional Offices', 'Corporate Services'];
    const oldTypes = ['Agreement', 'Inspection report', 'Case file', 'Correspondence', 'Policy', 'Financial report', 'Contract', 'Investigation record', 'Spreadsheet', 'Presentation', 'Other document'];
    const same = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);
    config = {
      ...previous,
      departments: same(previous.departments, oldDepartments) ? [...new Set([...generic.departments, ...records.map(r => r.department)])] : [...new Set([...previous.departments, ...records.map(r => r.department)])],
      documentTypes: same(previous.documentTypes, oldTypes) ? [...new Set([...generic.documentTypes, ...records.map(r => r.type)])] : [...new Set([...previous.documentTypes, ...records.map(r => r.type)])]
    };
    const oldCollections = [{
      id: 'governance',
      name: 'Governance documents',
      description: 'Documents owned by Governance.',
      department: 'Governance'
    }, {
      id: 'agreements',
      name: 'Agreement library',
      description: 'Stored agreements. Business processes remain in their existing systems.',
      type: 'Agreement'
    }];
    if (JSON.stringify(previous.collections) === JSON.stringify(oldCollections)) config.collections = generic.collections;
  }
  config = {
    ...config,
    departments: [...new Set([...config.departments, ...config.collections.flatMap(c => c.department ? [c.department] : [])])],
    documentTypes: [...new Set([...config.documentTypes, ...Object.keys(config.requiredFields), ...config.collections.flatMap(c => c.type ? [c.type] : [])])]
  };
  return {
    ...input,
    records,
    repositoryConfig: config,
    audit: input.audit.map(a => a.id === 'seed-1' && a.actor === 'Fictional Records Officer' && replaced.has(a.recordId) ? {
      ...a,
      actor: 'Demonstration Document Administrator',
      recordTitle: records.find(r => r.id === a.recordId)!.title,
      action: 'Demonstration entry created',
      next: 'Metadata only',
      device: 'Demonstration event'
    } : a)
  };
}
export const METADATA_STORAGE_KEY = 'nbcrfli-edrms-v1';
export const SESSION_STORAGE_KEY = 'nbcrfli-session';
export const FILE_STORAGE_DATABASE = 'nbcrfli-controlled-files';
export const DENSITY_STORAGE_KEY = 'nbcrfli-density';

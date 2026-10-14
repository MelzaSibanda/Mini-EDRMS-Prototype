import type { RecordItem, State } from './enterprise';
export const sampleRows = [['Employee Handbook', 'Handbook', 'Human Resources', 'Internal'], ['Information Security Policy', 'Policy', 'Information Technology', 'Confidential'], ['Supplier Agreement', 'Agreement', 'Procurement', 'Restricted'], ['Meeting Minutes', 'Meeting minutes', 'Administration', 'Internal'], ['Project Requirements Document', 'Requirements document', 'Operations', 'Internal'], ['Training Materials', 'Training material', 'Human Resources', 'Internal'], ['Operational Guidelines', 'Guidelines', 'Operations', 'Internal'], ['Service Agreement', 'Agreement', 'Procurement', 'Internal'], ['Annual Report', 'Report', 'Finance', 'Internal'], ['Technical Documentation', 'Technical documentation', 'Information Technology', 'Internal'], ['Project Plan', 'Requirements document', 'Operations', 'Internal'], ['Archived Meeting Minutes', 'Meeting minutes', 'Administration', 'Internal']];
export function demonstrationRecord(index: number): RecordItem {
  const row = sampleRows[index];
  const created = `2026-09-${String(12 + index).padStart(2, '0')}`;
  const modified = `2026-10-${String(1 + index % 10).padStart(2, '0')}`;
  return {
    id: String(index + 1),
    number: `EDMS-SAMPLE-${String(index + 1).padStart(4, '0')}`,
    title: row[0],
    type: row[1],
    category: row[2],
    department: row[2],
    businessUnit: '',
    region: index % 2 === 0 ? 'Head Office' : 'Regional Office',
    owner: `Demonstration ${row[2]} Contributor`,
    createdBy: 'Demonstration Document Administrator',
    classification: row[3],
    status: index === 11 ? 'Archived' : 'Metadata only',
    storageStatus: index === 11 ? 'Archived' : 'Metadata only',
    stage: index === 11 ? 'Archive' : 'Stored',
    effective: '',
    expiry: '',
    review: '',
    retentionRule: '',
    retentionStart: '',
    created,
    modified,
    description: 'Demonstration metadata only. This is not an actual organisational document.',
    assignee: '',
    due: '',
    legalHold: index === 2,
    disposition: '',
    sourceReference: `SAMPLE-REF-${String(index + 1).padStart(3, '0')}`,
    tags: ['demonstration'],
    versions: [{
      number: '1.0',
      author: 'Demonstration Document Administrator',
      date: '2026-09-12T08:00:00+02:00',
      description: 'Initial demonstration entry'
    }, {
      number: '1.1',
      author: `Demonstration ${row[2]} Contributor`,
      date: '2026-10-01T10:00:00+02:00',
      description: 'Demonstration metadata revision'
    }],
    business: {}
  };
}
export function genericInitialState(): State {
  const records = sampleRows.map((_, index) => demonstrationRecord(index));
  return {
    schema: 1,
    workflowConfigs: [],
    records,
    audit: [{
      id: 'seed-1',
      actor: 'Demonstration Document Administrator',
      role: 'records_officer',
      action: 'Demonstration entry created',
      recordId: '8',
      recordTitle: records[7].title,
      time: '2026-10-09T09:15:00+02:00',
      previous: '',
      next: 'Metadata only',
      device: 'Demonstration event'
    }],
    schedules: [],
    recent: [],
    readNotifications: []
  };
}

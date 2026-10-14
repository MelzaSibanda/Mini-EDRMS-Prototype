import { snapshot, commit, event, RecordItem, Version, Identity, State, canRead, requireRight, saveFile, getFile, removeUnlinkedFile, visible } from './enterprise';
import { defaultConfig, mandatoryFields, RepositoryConfig, Collection } from './repository-config';
import { validateDocumentFile } from './file-validation';
export const configFor = (state: State = snapshot()) => state.repositoryConfig || defaultConfig();
export const storageStatus = (r: RecordItem) => r.storageStatus || (['Archive', 'Authorised Disposition'].includes(r.stage) ? 'Archived' : r.versions.some(v => v.fileId) ? 'Available' : 'Metadata only');
export const currentVersion = (r: RecordItem) => r.versions.at(-1)!;
export const parseTags = (value: string | string[] | undefined) => [...new Set((Array.isArray(value) ? value : (value || '').split(',')).map(s => s.trim()).filter(Boolean))].slice(0, 30);
export const isMyUpload = (r: RecordItem, user: Identity) => r.uploadedById === user.id || r.createdBy === user.name;
const editable = ['title', 'type', 'description', 'department', 'businessUnit', 'region', 'sourceReference', 'owner', 'classification', 'category', 'tags', 'relatedDocumentIds'];
export function validateMetadata(user: Identity, data: Partial<RecordItem>) {
  const config = configFor();
  const required = [...mandatoryFields, ...(config.requiredFields[data.type || ''] || [])];
  for (const key of required) {
    const value = data[key as keyof RecordItem];
    if (value === undefined || value === null || typeof value === 'string' && !value.trim() || Array.isArray(value) && !value.length) throw new Error(`${key} is required for this document type.`);
  }
  if (!config.documentTypes.includes(data.type!)) throw new Error('Choose a configured document type.');
  if (!config.departments.includes(data.department!)) throw new Error('Choose a configured department.');
  if (!config.classifications.some(c => c.name === data.classification)) throw new Error('Choose a configured confidentiality classification.');
  if (!['records_manager', 'records_officer'].includes(user.role) && data.department !== user.department) throw new Error('Uploads and changes are limited to your department.');
  if (!canRead(user, data as RecordItem)) throw new Error('This classification is outside your access scope.');
}
export function createRecord(user: Identity, data: Partial<RecordItem>, attachment?: {
  fileId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
}): RecordItem {
  requireRight(user, 'create');
  if (attachment) requireRight(user, 'upload');
  const now = new Date().toISOString();
  const r: RecordItem = {
    id: crypto.randomUUID(),
    number: `EDMS-DOC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    title: data.title?.trim() || '',
    type: data.type || '',
    category: data.category || data.department || user.department,
    department: data.department || user.department,
    businessUnit: data.businessUnit || '',
    region: data.region || '',
    owner: data.owner || user.name,
    createdBy: user.name,
    uploadedById: user.id,
    classification: data.classification || 'Internal',
    status: attachment ? 'Available' : 'Metadata only',
    storageStatus: attachment ? 'Available' : 'Metadata only',
    stage: 'Stored',
    sourceReference: data.sourceReference || '',
    created: now,
    modified: now,
    versions: [{
      number: '1.0',
      author: user.name,
      date: now,
      description: attachment ? 'Document uploaded' : 'Metadata entry created',
      ...attachment
    }],
    description: data.description || '',
    tags: parseTags(data.tags),
    extractedText: data.extractedText?.slice(0, 200000) || '',
    extraction: data.extraction,
    relatedDocumentIds: data.relatedDocumentIds || [],
    effective: '',
    expiry: '',
    review: '',
    retentionRule: '',
    retentionStart: '',
    assignee: '',
    due: '',
    legalHold: false,
    disposition: '',
    business: {}
  };
  validateMetadata(user, r);
  commit({
    ...snapshot(),
    records: [r, ...snapshot().records],
    audit: [event(user, attachment ? 'Document uploaded' : 'Metadata entry created', r, '', r.number), ...snapshot().audit]
  });
  return r;
}
export function updateMetadata(user: Identity, id: string, changes: Partial<RecordItem>) {
  const r = findDocument(user, id);
  requireRight(user, 'edit', r);
  if (changes.classification && changes.classification !== r.classification) requireRight(user, 'manage_document_access', r);
  if (storageStatus(r) === 'Archived') throw new Error('Restore the document before editing its metadata.');
  const clean = Object.fromEntries(Object.entries(changes).filter(([key]) => editable.includes(key))) as Partial<RecordItem>;
  if (clean.tags) clean.tags = parseTags(clean.tags);
  if (clean.relatedDocumentIds) {
    if (clean.relatedDocumentIds.includes(id) || clean.relatedDocumentIds.some(related => !snapshot().records.some(doc => doc.id === related && canRead(user, doc) && storageStatus(doc) !== 'Deleted'))) throw new Error('Related documents must be accessible records other than this document.');
  }
  const next = {
    ...r,
    ...clean,
    modified: new Date().toISOString()
  };
  validateMetadata(user, next);
  commit({
    ...snapshot(),
    records: snapshot().records.map(doc => doc.id === id ? next : doc),
    audit: [event(user, r.classification !== next.classification ? 'Document access classification changed' : 'Metadata updated', r, JSON.stringify(Object.fromEntries(Object.keys(clean).map(key => [key, r[key as keyof RecordItem]]))), JSON.stringify(clean)), ...snapshot().audit]
  });
}
export function findDocument(user: Identity, id: string) {
  const r = snapshot().records.find(r => r.id === id);
  if (!r || !canRead(user, r) || storageStatus(r) === 'Deleted') throw new Error('The document is unavailable or you do not have access.');
  return r;
}
export function addVersion(user: Identity, id: string, description: string, fileId: string, fileName: string, majorRevision = false, details?: {
  fileType?: string;
  fileSize?: number;
  extractedText?: string;
  extraction?: RecordItem['extraction'];
}) {
  const r = findDocument(user, id);
  requireRight(user, 'edit', r);
  requireRight(user, 'upload', r);
  if (storageStatus(r) === 'Archived') throw new Error('Restore the document before uploading a version.');
  if (!description.trim() || !fileId) throw new Error('A file and change description are required.');
  const [major, minor] = currentVersion(r).number.split('.').map(Number);
  const v: Version = {
    number: majorRevision ? `${major + 1}.0` : `${major}.${minor + 1}`,
    author: user.name,
    date: new Date().toISOString(),
    description,
    fileId,
    fileName,
    fileType: details?.fileType,
    fileSize: details?.fileSize
  };
  const next = {
    ...r,
    versions: [...r.versions, v],
    storageStatus: 'Available' as const,
    modified: v.date,
    extractedText: details?.extractedText || '',
    extraction: details?.extraction
  };
  commit({
    ...snapshot(),
    records: snapshot().records.map(doc => doc.id === id ? next : doc),
    audit: [event(user, 'New version uploaded', r, currentVersion(r).number, v.number + ' · ' + description), ...snapshot().audit]
  });
}
export interface UploadServices {
  validate: typeof validateDocumentFile;
  store: typeof saveFile;
  remove: typeof removeUnlinkedFile;
}
const uploads: UploadServices = {
  validate: validateDocumentFile,
  store: saveFile,
  remove: removeUnlinkedFile
};
async function withStoredFile<T>(file: File, save: (id: string, info: Awaited<ReturnType<typeof validateDocumentFile>>) => T, services: UploadServices) {
  const info = await services.validate(file);
  const id = await services.store(file);
  try {
    return save(id, info);
  } catch (error) {
    try {
      await services.remove(id);
    } catch {
      throw new Error('The document was not saved and upload cleanup needs attention. Preserve this workspace for recovery.');
    }
    throw error;
  }
}
export async function uploadDocument(user: Identity, file: File, data: Partial<RecordItem>, services: UploadServices = uploads) {
  requireRight(user, 'create');
  requireRight(user, 'upload');
  validateMetadata(user, {
    ...data,
    owner: data.owner || user.name,
    department: data.department || user.department
  });
  return withStoredFile(file, (id, info) => createRecord(user, data, {
    fileId: id,
    fileName: file.name,
    fileType: info.mime,
    fileSize: info.size
  }), services);
}
export async function uploadVersion(user: Identity, id: string, file: File, description: string, majorRevision = false, extraction?: {
  text: string;
  method: string;
  pages: number;
  totalPages: number;
  warnings: string[];
}, services: UploadServices = uploads) {
  const r = findDocument(user, id);
  requireRight(user, 'edit', r);
  requireRight(user, 'upload', r);
  if (storageStatus(r) === 'Archived') throw new Error('Restore the document before uploading a version.');
  if (!description.trim()) throw new Error('Describe the new version.');
  return withStoredFile(file, (fileId, info) => addVersion(user, id, description, fileId, file.name, majorRevision, {
    fileType: info.mime,
    fileSize: info.size,
    extractedText: extraction?.text,
    extraction: extraction ? {
      method: extraction.method,
      pages: extraction.pages,
      totalPages: extraction.totalPages,
      partial: extraction.warnings.length > 0
    } : undefined
  }), services);
}
export async function readDocumentFile(user: Identity, id: string, versionNumber: string, action: 'preview' | 'download', reader: typeof getFile = getFile) {
  const r = findDocument(user, id);
  requireRight(user, action === 'download' ? 'download' : 'view', r);
  const version = r.versions.find(v => v.number === versionNumber);
  if (!version?.fileId) throw new Error('No file is attached to this version.');
  const blob = await reader(version.fileId);
  findDocument(user, id);
  requireRight(user, action === 'download' ? 'download' : 'view', findDocument(user, id));
  logDocumentEvent(user, action === 'download' ? 'Download requested' : 'Preview requested', r, version.number);
  return {
    blob,
    version
  };
}
export function logDocumentEvent(user: Identity, action: string, r: RecordItem, details = '') {
  requireRight(user, 'view', r);
  commit({
    ...snapshot(),
    audit: [event(user, action, r, '', details), ...snapshot().audit],
    recent: action === 'Preview requested' || action === 'Details opened' ? [r.id, ...snapshot().recent.filter(id => id !== r.id)].slice(0, 12) : snapshot().recent
  });
}
export function archiveDocument(user: Identity, id: string, reason: string, restore = false) {
  const r = findDocument(user, id);
  requireRight(user, 'archive', r);
  const config = configFor();
  if (!config.archiveEnabled || !config.archiveReference.trim()) throw new Error('Archival requires a configured organisational approval reference.');
  if (r.legalHold) throw new Error('A legal hold blocks this archival action.');
  if (!reason.trim()) throw new Error('An archival reason is required.');
  const next = {
    ...r,
    storageStatus: (restore ? currentVersion(r).fileId ? 'Available' : 'Metadata only' : 'Archived') as RecordItem['storageStatus'],
    modified: new Date().toISOString()
  };
  commit({
    ...snapshot(),
    records: snapshot().records.map(doc => doc.id === id ? next : doc),
    audit: [event(user, restore ? 'Document restored' : 'Document archived', r, storageStatus(r), reason + ' · ' + config.archiveReference), ...snapshot().audit]
  });
}
export function deleteDocument(user: Identity, id: string, reason: string) {
  const r = findDocument(user, id);
  requireRight(user, 'delete', r);
  const config = configFor();
  if (!config.deleteEnabled || !config.deleteReference.trim()) throw new Error('Removal is disabled until organisational rules are configured.');
  if (r.legalHold || ['Retention', 'Retention Review', 'Authorised Disposition'].includes(r.stage) || r.retentionRule && !r.retentionRule.startsWith('Unassigned')) throw new Error('A hold or historical retention restriction requires stakeholder review before removal.');
  if (!reason.trim()) throw new Error('A removal reason is required.');
  commit({
    ...snapshot(),
    records: snapshot().records.map(doc => doc.id === id ? {
      ...doc,
      storageStatus: 'Deleted' as const,
      modified: new Date().toISOString()
    } : doc),
    audit: [event(user, 'Document removed from library', r, storageStatus(r), reason + ' · ' + config.deleteReference + ' · files and metadata retained'), ...snapshot().audit]
  });
}
export function configureRepository(user: Identity, changes: Partial<RepositoryConfig>) {
  requireRight(user, 'manage_categories');
  const next = {
    ...configFor(),
    ...changes
  };
  if (configFor().classifications.some(c => next.classifications.find(n => n.name === c.name)?.access !== c.access)) throw new Error('Existing classification access tiers cannot be changed through evaluation configuration.');
  for (const key of ['departments', 'documentTypes'] as const) {
    if (!next[key].length || next[key].some(v => !v.trim()) || new Set(next[key]).size !== next[key].length) throw new Error('Configuration names must be non-empty and unique.');
  }
  if (next.archiveEnabled && !next.archiveReference.trim() || next.deleteEnabled && !next.deleteReference.trim()) throw new Error('An organisational approval reference is required.');
  for (const r of snapshot().records) {
    if (!next.departments.includes(r.department) || !next.documentTypes.includes(r.type) || !next.classifications.some(c => c.name === r.classification)) throw new Error('A configuration value used by an existing document cannot be removed.');
  }
  if (next.classifications.some(c => !c.name.trim() || !['public', 'internal', 'department', 'restricted'].includes(c.access)) || new Set(next.classifications.map(c => c.name)).size !== next.classifications.length) throw new Error('Classifications must have unique names and a valid access tier.');
  for (const [type, fields] of Object.entries(next.requiredFields)) {
    if (!next.documentTypes.includes(type) || fields.some(f => !editable.includes(f))) throw new Error('Mandatory rules must use configured document types and supported metadata fields.');
  }
  commit({
    ...snapshot(),
    repositoryConfig: next,
    audit: [event(user, 'Repository configuration updated', undefined, '', JSON.stringify(changes)), ...snapshot().audit]
  });
}
export function addCollection(user: Identity, collection: Omit<Collection, 'id'>) {
  requireRight(user, 'manage_categories');
  if (!collection.name.trim()) throw new Error('A collection name is required.');
  configureRepository(user, {
    collections: [...configFor().collections, {
      ...collection,
      id: crypto.randomUUID()
    }]
  });
}
export interface Query {
  q?: string;
  content?: string;
  department?: string;
  type?: string;
  classification?: string;
  region?: string;
  owner?: string;
  uploader?: string;
  reference?: string;
  from?: string;
  to?: string;
  format?: string;
  status?: string;
  collection?: string;
  sort?: string;
  page?: string;
  mine?: string;
  recent?: string;
}
export function queryDocuments(user: Identity, query: Query = {}, pageSize = 12) {
  let documents = visible(user).filter(r => {
    if (query.status ? storageStatus(r) !== query.status : storageStatus(r) === 'Archived') return false;
    if (query.mine && !isMyUpload(r, user)) return false;
    if (query.recent && !snapshot().recent.includes(r.id)) return false;
    for (const field of ['department', 'type', 'classification', 'region'] as const) if (query[field] && r[field] !== query[field]) return false;
    if (query.owner && !r.owner.toLowerCase().includes(query.owner.toLowerCase())) return false;
    if (query.uploader && !r.createdBy.toLowerCase().includes(query.uploader.toLowerCase())) return false;
    if (query.reference && !(r.sourceReference || '').toLowerCase().includes(query.reference.toLowerCase())) return false;
    const uploaded = r.created.slice(0, 10);
    if (query.from && uploaded < query.from || query.to && uploaded > query.to) return false;
    if (query.format && !currentVersion(r).fileName?.toLowerCase().endsWith('.' + query.format)) return false;
    if (query.collection) {
      const c = configFor().collections.find(c => c.id === query.collection);
      if (!c || c.department && r.department !== c.department || c.type && r.type !== c.type || c.tags?.some(t => !r.tags?.includes(t))) return false;
    }
    const content = [r.title, r.number, r.sourceReference, r.description, r.owner, r.createdBy, ...(r.tags || []), ...r.versions.map(v => v.fileName || ''), ...(query.content ? [r.extractedText || ''] : [])].join(' ').toLowerCase();
    return !query.q || content.includes(query.q.toLowerCase());
  });
  documents = [...documents].sort((a, b) => query.sort === 'title' ? a.title.localeCompare(b.title) : query.sort === 'oldest' ? a.created.localeCompare(b.created) : query.sort === 'modified' ? b.modified.localeCompare(a.modified) : b.created.localeCompare(a.created));
  const total = documents.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(query.page) || 1)));
  return {
    documents: documents.slice((page - 1) * pageSize, page * pageSize),
    total,
    pages,
    page
  };
}
export function fileBytes(user: Identity) {
  const ids = new Set<string>();
  let bytes = 0,
    unknown = 0;
  for (const r of visible(user)) for (const v of r.versions) if (v.fileId && !ids.has(v.fileId)) {
    ids.add(v.fileId);
    if (v.fileSize === undefined) unknown++;else bytes += v.fileSize;
  }
  return {
    bytes,
    unknown,
    files: ids.size
  };
}
export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

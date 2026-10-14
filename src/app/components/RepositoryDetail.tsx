import { useEffect, useState, lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router';
import { FileText, Download, Eye, Archive, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { useRecords, canRead, RecordItem, timestamp, date, visible } from '../lib/enterprise';
import { configFor, currentVersion, storageStatus, formatBytes, findDocument, updateMetadata, readDocumentFile, uploadVersion, archiveDocument, deleteDocument, logDocumentEvent, parseTags } from '../lib/repository';
import { validateDocumentFile } from '../lib/file-validation';
import type { ScanResult } from '../lib/scan-document';
import { PageHead, Panel, Badge, Denied, Empty } from './RepositoryUI';
const PdfPreview = lazy(() => import('./PdfPreview'));
function FilePreview({
  record,
  version
}: {
  record: RecordItem;
  version: string;
}) {
  const {
    user
  } = useAuth();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let closed = false;
    let objectUrl = '';
    setBlob(null);
    setError('');
    setText('');
    setUrl('');
    void readDocumentFile(user!, record.id, version, 'preview').then(async result => {
      if (closed) return;
      const ext = result.version.fileName?.split('.').at(-1)?.toLowerCase();
      if (ext === 'txt') {
        const content = await result.blob.text();
        if (!closed) setText(content.slice(0, 100000) + (content.length > 100000 ? '\n\n[Preview limited to the first 100,000 characters. Download the document to read the complete file.]' : ''));
      } else if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext || '')) {
        await validateDocumentFile(new File([result.blob], result.version.fileName!));
        if (closed) return;
        setBlob(result.blob);
        if (ext !== 'pdf') {
          objectUrl = URL.createObjectURL(result.blob);
          setUrl(objectUrl);
        }
      } else setError('Inline preview is not supported for this format. Use authorised download to open the file in its native application.');
    }).catch(e => {
      if (!closed) setError((e as Error).message);
    });
    return () => {
      closed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [record.id, version, user?.id]);
  const v = record.versions.find(v => v.number === version);
  return <Panel title={'File preview · v' + version} meta={v?.fileName || 'Attachment'}>{error ? <div className="notice">{error}</div> : text ? <pre className="text-preview">{text}</pre> : url ? <img className="image-preview" src={url} alt={'Preview of ' + record.title} /> : blob ? <Suspense fallback={<p className="padded">Loading PDF viewer…</p>}><PdfPreview blob={blob} /></Suspense> : <p className="padded">Loading authorised preview…</p>}</Panel>;
}
export function RepositoryDetail() {
  const {
    id
  } = useParams();
  const {
    user
  } = useAuth();
  useRecords();
  let record: RecordItem;
  try {
    record = findDocument(user!, id || '');
  } catch {
    return <Denied />;
  }
  return <DocumentContent key={record.id} record={record} />;
}
function DocumentContent({
  record: r
}: {
  record: RecordItem;
}) {
  const {
    user,
    hasPermission
  } = useAuth();
  const state = useRecords();
  const config = configFor(state);
  const v = currentVersion(r);
  const [tab, setTab] = useState('Details');
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const fieldsOf = () => ({
    title: r.title,
    type: r.type,
    description: r.description,
    department: r.department,
    businessUnit: r.businessUnit,
    region: r.region,
    sourceReference: r.sourceReference || '',
    owner: r.owner,
    classification: r.classification,
    category: r.category,
    tags: (r.tags || []).join(', ')
  });
  const [draft, setDraft] = useState(fieldsOf);
  const [file, setFile] = useState<File | null>(null);
  const [changes, setChanges] = useState('');
  const [major, setMajor] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  useEffect(() => {
    try {
      logDocumentEvent(user!, 'Details opened', r);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [r.id, user?.id]);
  const run = (operation: () => void) => {
    setError('');
    setMessage('');
    try {
      operation();
      setMessage('Document action recorded locally.');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  async function download(versionNumber: string) {
    setError('');
    try {
      const {
        blob,
        version
      } = await readDocumentFile(user!, r.id, versionNumber, 'download');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = version.fileName || r.number;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saveVersion(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Choose the replacement file.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await uploadVersion(user!, r.id, file, changes, major, scan || undefined);
      setFile(null);
      setChanges('');
      setScan(null);
      setMessage('A new version was stored. Previous version files remain available.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function scanVersion() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const {
        scanDocument
      } = await import('../lib/scan-document');
      setScan(await scanDocument(file, new AbortController().signal, () => {}));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const metadata = [['Document ID', r.number], ['Document type', r.type], ['Department', r.department], ['Business unit', r.businessUnit || 'Not specified'], ['Region / office', r.region || 'Not specified'], ['Existing business reference', r.sourceReference || r.business?.['Case number'] || r.business?.['Agreement number'] || 'Not specified'], ['Owner', r.owner], ['Uploaded by', r.createdBy], ['Upload date', date(r.created)], ['Last modified', date(r.modified)], ['Confidentiality', r.classification], ['Storage status', storageStatus(r)], ['Content search', r.extractedText ? r.extraction?.partial ? 'Partial extracted text saved' : 'Extracted text saved' : 'No text index for this file'], ['Current version', 'v' + v.number], ['File name', v.fileName || 'No current attachment'], ['File format', v.fileType || v.fileName?.split('.').at(-1)?.toUpperCase() || 'Not recorded'], ['File size', v.fileSize !== undefined ? formatBytes(v.fileSize) : 'Not recorded for this version'], ['Tags / keywords', (r.tags || []).join(', ') || 'Not specified']];
  return <><Link className="back-link" to="/documents">← Document library</Link><PageHead eyebrow={r.number} title={r.title} description={`${r.department} · ${r.type}`}><Badge>{storageStatus(r)}</Badge><Badge>{r.classification}</Badge>{v.fileId && <button onClick={() => setPreview(preview ? null : v.number)}><Eye size={15} />{preview ? 'Close preview' : 'Preview'}</button>}{v.fileId && hasPermission('download') && <button className="primary" onClick={() => download(v.number)}><Download size={15} /> Download</button>}</PageHead>{r.legalHold && <div className="notice">This document has a preserved legal hold. Archive and removal require stakeholder review.</div>}{error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}{preview && <FilePreview record={r} version={preview} />}<div className="tabs">{['Details', 'Versions', 'Document activity'].map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>{tab === 'Details' && <><Panel title="Document metadata" meta="Business references describe links to existing systems; no live integration is implied"><div className="metadata-grid">{metadata.map(([key, value]) => <div key={key}><small>{key}</small><strong>{value}</strong></div>)}</div><div className="padded"><p>{r.description || 'No description provided.'}</p>{hasPermission('edit') && storageStatus(r) !== 'Archived' && <button onClick={() => {
            setDraft(fieldsOf());
            setEditing(!editing);
          }}>{editing ? 'Cancel editing' : 'Edit metadata'}</button>}{editing && <form className="form-grid" onSubmit={e => {
            e.preventDefault();
            run(() => {
              updateMetadata(user!, r.id, {
                ...draft,
                tags: parseTags(draft.tags)
              });
              setEditing(false);
            });
          }}>{Object.entries(draft).map(([key, value]) => {
              const options = key === 'type' ? config.documentTypes : key === 'department' ? ['records_manager', 'records_officer'].includes(user!.role) ? config.departments : [user!.department] : key === 'classification' ? config.classifications.map(c => c.name) : undefined;
              return <label key={key} className={key === 'description' ? 'span-two' : ''}>{({
                  sourceReference: 'Existing business reference',
                  businessUnit: 'Business unit'
                } as Record<string, string>)[key] || key}{options ? <select disabled={key === 'classification' && !hasPermission('manage_document_access')} value={value} onChange={e => setDraft({
                  ...draft,
                  [key]: e.target.value
                })}>{options.map(s => <option key={s}>{s}</option>)}</select> : key === 'description' ? <textarea value={value} onChange={e => setDraft({
                  ...draft,
                  [key]: e.target.value
                })} /> : <input value={value} onChange={e => setDraft({
                  ...draft,
                  [key]: e.target.value
                })} />}</label>;
            })}<button className="primary">Save metadata</button></form>}</div></Panel><Panel title="Related documents" meta="Only explicitly linked, accessible documents appear here"><div className="padded">{r.relatedDocumentIds?.map(id => state.records.find(doc => doc.id === id && canRead(user!, doc) && storageStatus(doc) !== 'Deleted')).filter(Boolean).map(doc => <p key={doc!.id}><Link className="text-link" to={'/documents/' + doc!.id}>{doc!.title}</Link></p>)}{!r.relatedDocumentIds?.length && <p>No documents have been explicitly linked.</p>}{hasPermission('edit') && storageStatus(r) !== 'Archived' && <form onSubmit={e => {
            e.preventDefault();
            const id = String(new FormData(e.currentTarget).get('related'));
            run(() => updateMetadata(user!, r.id, {
              relatedDocumentIds: [...new Set([...(r.relatedDocumentIds || []), id])]
            }));
          }}><label>Link an accessible document<select name="related" required><option value="">Select document</option>{visible(user!).filter(doc => doc.id !== r.id && !r.relatedDocumentIds?.includes(doc.id)).map(doc => <option key={doc.id} value={doc.id}>{doc.title}</option>)}</select></label><button>Link document</button></form>}</div></Panel>{hasPermission('archive') && <Panel title="Repository archive action" meta="Disabled until a referenced organisational process is configured"><div className="padded"><label>Reason<input value={reason} onChange={e => setReason(e.target.value)} /></label><button disabled={!config.archiveEnabled || !!r.legalHold} onClick={() => run(() => archiveDocument(user!, r.id, reason, storageStatus(r) === 'Archived'))}><Archive size={15} />{storageStatus(r) === 'Archived' ? 'Restore document' : 'Archive document'}</button></div></Panel>}{hasPermission('delete') && <Panel title="Remove from the library" meta="Soft removal retains linked files, metadata and activity; it does not destroy documents"><div className="padded"><label className="checkbox"><input type="checkbox" checked={confirmRemoval} onChange={e => setConfirmRemoval(e.target.checked)} /> Confirm removal under the configured organisational rule.</label><button disabled={!config.deleteEnabled || !confirmRemoval || !!r.legalHold} onClick={() => run(() => deleteDocument(user!, r.id, reason))}><Trash2 size={15} /> Remove from library</button></div></Panel>}</>}{tab === 'Versions' && <Panel title="Document version history" meta="New uploads retain their predecessors; old metadata-only versions are labelled"><div className="table-scroll"><table><thead><tr><th>Version</th><th>Uploaded by</th><th>Date / time</th><th>Change description</th><th>File</th><th>Actions</th></tr></thead><tbody>{[...r.versions].reverse().map((version, i) => <tr key={version.number}><td>v{version.number} {i === 0 && <Badge>Current</Badge>}</td><td>{version.author}</td><td>{timestamp(version.date)}</td><td>{version.description}</td><td>{version.fileName || 'Metadata-only history'}<small>{version.fileSize !== undefined ? formatBytes(version.fileSize) : ''}</small></td><td>{version.fileId && <><button className="text-button" onClick={() => setPreview(version.number)}>Preview</button>{hasPermission('download') && <button className="text-button" onClick={() => download(version.number)}>Download</button>}</>}</td></tr>)}</tbody></table></div>{hasPermission('edit') && hasPermission('upload') && storageStatus(r) !== 'Archived' && <form className="form-grid padded" onSubmit={saveVersion}><label>New version file<input type="file" disabled={busy} required onChange={e => {
            setFile(e.target.files?.[0] || null);
            setScan(null);
          }} /></label><label>Version increment<select value={major ? 'major' : 'minor'} onChange={e => setMajor(e.target.value === 'major')}><option value="minor">Minor revision</option><option value="major">Major revision</option></select></label><label className="span-two">Change description<input value={changes} required onChange={e => setChanges(e.target.value)} /></label><div className="actions"><button type="button" disabled={!file || busy} onClick={scanVersion}>Extract text for search</button><button className="primary" disabled={busy}><Upload size={15} />{busy ? 'Processing…' : 'Upload new version'}</button></div>{scan && <div className="notice span-two">{scan.method} complete. {scan.pages} of {scan.totalPages} pages will be indexed for search. Metadata is not overwritten by a new version.</div>}</form>}</Panel>}{tab === 'Document activity' && <Panel title="Local document history" meta="Application entries are not server-verified access logs"><div className="table-scroll"><table><thead><tr><th>Actor</th><th>Event</th><th>Time (SAST)</th></tr></thead><tbody>{state.audit.filter(a => a.recordId === r.id).map(a => <tr key={a.id}><td>{a.actor}</td><td>{a.action}</td><td>{timestamp(a.time)}</td></tr>)}</tbody></table></div></Panel>}</>;
}

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FileText, ScanText, CheckCircle2, CircleAlert, X } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { requireRight, useRecords } from '../lib/enterprise';
import { uploadDocument, configFor, parseTags } from '../lib/repository';
import { mandatoryFields } from '../lib/repository-config';
import { validateDocumentFile } from '../lib/file-validation';
import type { ScanProgress, ScanResult } from '../lib/scan-document';
import { mergeScannedMetadata, type SuggestedField } from '../lib/document-metadata';
import { PageHead, Panel, Denied } from './RepositoryUI';
const fieldLabels: Record<string, string> = {
  title: 'Title',
  type: 'Document type',
  category: 'Record category',
  department: 'Department',
  businessUnit: 'Business unit',
  region: 'Region',
  owner: 'Owner',
  classification: 'Security classification',
  effective: 'Effective date',
  expiry: 'Expiry date',
  review: 'Review date',
  due: 'Action due date',
  retentionRule: 'Retention rule',
  retentionStart: 'Retention start event',
  description: 'Description / keywords',
  sourceReference: 'Existing business reference',
  tags: 'Tags / keywords (comma separated)'
};
export function DocumentCapture() {
  const {
    user,
    hasPermission
  } = useAuth();
  const state = useRecords();
  const config = configFor(state);
  const departments = config.departments;
  const documentTypes = config.documentTypes;
  const navigate = useNavigate();
  const defaults: Record<string, string> = {
    title: '',
    type: '',
    category: user!.department,
    department: user!.department,
    businessUnit: '',
    region: '',
    owner: user!.name,
    classification: 'Internal',
    description: '',
    sourceReference: '',
    tags: ''
  };
  const [fields, setFields] = useState<Record<string, string>>(defaults);
  const [file, setFile] = useState<File | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [scanError, setScanError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const edited = useRef(new Set<string>());
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => () => {
    generation.current++;
    controller.current?.abort();
  }, []);
  const allowedDepartments = ['records_manager', 'records_officer'].includes(user!.role) ? departments : [user!.department];
  function change(key: string, value: string) {
    edited.current.add(key);
    setFields(prev => ({
      ...prev,
      [key]: value
    }));
    setReviewed(false);
  }
  async function startScan(selected: File) {
    controller.current?.abort();
    const current = ++generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setScanning(true);
    setScan(null);
    setScanError('');
    setProgress({
      stage: 'Preparing attachment',
      percent: 0
    });
    setReviewed(false);
    setManual(false);
    setSkipped([]);
    try {
      const {
        scanDocument
      } = await import('../lib/scan-document');
      await validateDocumentFile(selected);
      const result = await scanDocument(selected, abort.signal, p => {
        if (generation.current === current) setProgress(p);
      });
      if (abort.signal.aborted || generation.current !== current) return;
      const relevant = Object.fromEntries(Object.entries(result.suggestions).filter(([key, value]) => key in defaults && !(key === 'type' && !config.documentTypes.includes(value!.value)) && !(key === 'classification' && !config.classifications.some(c => c.name === value!.value))));
      setFields(prev => mergeScannedMetadata(prev, relevant, edited.current, allowedDepartments).fields);
      setSkipped(mergeScannedMetadata({}, result.suggestions, edited.current, allowedDepartments).skipped);
      setScan(result);
    } catch (e) {
      if (generation.current !== current) return;
      if (abort.signal.aborted) setScanError('Scan cancelled. Retry the scan or complete the metadata manually.');else setScanError((e as Error).message || 'The attachment could not be scanned. Complete metadata manually.');
    } finally {
      if (generation.current === current) {
        setScanning(false);
        controller.current = null;
      }
    }
  }
  function attach(selected: File | null) {
    if (!selected && inputRef.current) inputRef.current.value = '';
    if (selected && selected.size > 20 * 1024 * 1024) {
      attach(null);
      setScanError('Choose a document no larger than 20 MB.');
      return;
    }
    controller.current?.abort();
    generation.current++;
    setFile(selected);
    setFields(prev => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, edited.current.has(key) ? prev[key] : value])));
    setReviewed(false);
    setScan(null);
    setScanError('');
    setManual(false);
    setScanning(false);
    setProgress(null);
    if (selected) void startScan(selected);
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (scanning) {
      setError('Wait for the scan to finish or cancel it.');
      return;
    }
    if (!file || !reviewed) {
      setError('Review and confirm the document metadata before saving.');
      return;
    }
    setBusy(true);
    try {
      if (!file) throw new Error('Attach a document before uploading.');
      const record = await uploadDocument(user!, file, {
        ...fields,
        tags: parseTags(fields.tags),
        extractedText: scan?.text || '',
        extraction: scan ? {
          method: scan.method,
          pages: scan.pages,
          totalPages: scan.totalPages,
          partial: scan.warnings.length > 0
        } : undefined
      });
      navigate('/documents/' + record.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!hasPermission('create')) return <Denied />;
  function field(key: string, options?: string[], required = false) {
    required = mandatoryFields.includes(key) || (config.requiredFields[fields.type] || []).includes(key);
    const suggestion = scan?.suggestions[key as SuggestedField];
    return <label key={key} className={key === 'title' || key === 'description' ? 'span-two' : ''}>{fieldLabels[key]}{required ? ' *' : ''}{options ? <select name={key} value={fields[key]} required={required} onChange={e => change(key, e.target.value)}>{(key === 'type' || key === 'region') && <option value="">{key === 'type' ? 'Select document type' : 'Not specified'}</option>}{options.map(value => <option key={value} value={value}>{value}</option>)}</select> : key === 'description' ? <textarea rows={4} name={key} value={fields[key]} onChange={e => change(key, e.target.value)} /> : <input name={key} type={['effective', 'expiry', 'review', 'due'].includes(key) ? 'date' : 'text'} maxLength={key === 'title' ? 180 : undefined} value={fields[key]} required={required} onChange={e => change(key, e.target.value)} />} {suggestion && <span className={'scan-field-hint ' + (edited.current.has(key) ? 'edited' : suggestion.confidence.toLowerCase())}>{edited.current.has(key) ? 'Edited by you' : `Detected · ${suggestion.confidence.toLowerCase()} confidence`}<span title={suggestion.evidence}> · {suggestion.evidence}</span></span>}</label>;
  }
  return <><PageHead eyebrow="EDMS DOCUMENT LIBRARY" title="Upload document" description="Attach a document to identify its type and extract metadata, then review and edit the results." /><form onSubmit={submit}>{hasPermission('upload') && <Panel title="1. Attach & scan" meta="PDF, DOCX, XLSX, PPTX, TXT and images · maximum 20 MB"><div className="padded"><label className="upload-zone"><ScanText size={28} /><strong>Attach the source document</strong><span>Text extraction and English OCR run in this browser.</span><input ref={inputRef} type="file" aria-label="Source document" disabled={busy} onChange={e => attach(e.target.files?.[0] || null)} /></label>{file && <div className="scan-file"><FileText size={17} /><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(0)} KB</span><button type="button" disabled={busy} onClick={() => attach(null)}><X size={14} /> Remove</button></div>}{scanning && <div className="scan-progress" role="status" aria-live="polite"><div><span>{progress?.stage}</span><button type="button" onClick={() => controller.current?.abort()}>Cancel scan</button></div><progress value={progress?.percent || 0} max="100" /><p>You may edit metadata while scanning. Your edits will be preserved.</p></div>}{scanError && <div className="error" role="alert">{scanError}</div>}{scan && <div className="scan-result" role="status"><CheckCircle2 size={20} /><div><strong>Scan complete · {Object.keys(scan.suggestions).length} suggested fields</strong><p>{scan.method} · {scan.pages} of {scan.totalPages} page(s){scan.ocrConfidence !== undefined ? ` · OCR confidence ${Math.round(scan.ocrConfidence)}%` : ''}</p><p>{scan.suggestions.type ? `Suggested document type: ${scan.suggestions.type.value}` : 'Document type could not be determined. Select it manually.'}</p>{scan.warnings.map(w => <p className="scan-warning" key={w}><CircleAlert size={13} />{w}</p>)}{skipped.length > 0 && <p>Not applied: {skipped.join(', ')}.</p>}<details><summary>Review extracted text</summary><pre>{scan.text}</pre></details></div></div>}{file && !scanning && <div className="scan-review">{!scan && !manual && <button type="button" onClick={() => {
              setManual(true);
              setScanError('');
            }}>Complete metadata manually</button>}<button type="button" disabled={busy} onClick={() => void startScan(file)}>{scan ? 'Scan again' : 'Retry scan'}</button>{(scan || manual) && <label className="checkbox"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> I checked the metadata against the original document and completed missing information.</label>}</div>}</div></Panel>}<Panel title={hasPermission('upload') ? '2. Review document metadata' : 'Record metadata'} meta="Detected values are suggestions. All fields remain editable; missing values require manual completion."><div className="form-grid padded">{field('title', undefined, true)}{field('type', documentTypes, true)}{field('sourceReference')}{field('category', departments, true)}{field('department', allowedDepartments, true)}{field('businessUnit', undefined, true)}{field('region')}{field('owner', undefined, true)}{field('classification', config.classifications.map(c => c.name), true)}{field('tags')}{field('description')}</div></Panel>{error && <p className="error" role="alert">{error}</p>}<div className="form-footer"><p>Business references are descriptive only. File name, size, uploader, upload date and initial version are recorded automatically.</p><Link className="button" to="/documents">Cancel</Link><button className="primary" disabled={busy || scanning || !file || !reviewed}>{busy ? 'Uploading…' : scanning ? 'Scanning attachment…' : 'Upload document'}</button></div></form></>;
}

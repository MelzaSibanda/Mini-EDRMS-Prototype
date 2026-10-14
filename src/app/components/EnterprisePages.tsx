import { DENSITY_STORAGE_KEY } from '../lib/legacy-branding-compatibility';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Plus, Search, Filter, Upload, FolderSearch, ArrowUpRight, Building2, Tags } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { useRecords, visible, roleLabel, roles, identity, timestamp, canRead } from '../lib/enterprise';
import { configFor, currentVersion, fileBytes, formatBytes, isMyUpload, queryDocuments, storageStatus, configureRepository, addCollection } from '../lib/repository';
import { PageHead, Panel, RecordTable, Empty, Denied, Badge } from './RepositoryUI';
export { PageHead, Panel, RecordTable, Empty, Denied, Badge } from './RepositoryUI';
export { DocumentCapture as Capture } from './DocumentCapture';
export { RepositoryDetail as Detail } from './RepositoryDetail';
function UploadLink() {
  const {
    hasPermission
  } = useAuth();
  return hasPermission('upload') && hasPermission('create') ? <Link className="primary" to="/documents/create"><Plus size={16} /> Upload document</Link> : null;
}
export function Dashboard() {
  const {
    user,
    hasPermission
  } = useAuth();
  const state = useRecords();
  const [q, setQ] = useState('');
  if (!hasPermission('view')) return <Administration />;
  const docs = visible(user!);
  const active = docs.filter(r => storageStatus(r) !== 'Archived');
  const bytes = fileBytes(user!);
  const my = docs.filter(r => isMyUpload(r, user!));
  const recent = [...active].sort((a, b) => b.created.localeCompare(a.created)).slice(0, 5);
  const accessed = state.recent.map(id => docs.find(r => r.id === id)).filter(Boolean);
  const activity = state.audit.filter(a => docs.some(r => r.id === a.recordId)).slice(0, 4);
  return <><PageHead title="Document workspace" description="Upload once. Find the right document quickly. Keep business references with the document."><UploadLink /></PageHead><section className="panel repository-finder"><div><FolderSearch size={25} /><h2>Find a document</h2><p>Search by title, file name, keywords, document ID or existing business reference.</p></div><form action="/documents"><div className="search-input"><Search size={19} /><input name="q" aria-label="Find a document" placeholder="What are you looking for?" value={q} onChange={e => setQ(e.target.value)} /></div><button className="primary">Search library</button></form></section><div className="metrics">{[['Library entries', docs.length, 'Including metadata-only entries', '/documents'], ['Stored documents', docs.filter(r => r.versions.some(v => v.fileId)).length, 'Documents with an attached file', '/documents'], ['My uploads', my.length, 'Created by your evaluation identity', '/documents/mine'], ['Known file bytes', formatBytes(bytes.bytes), bytes.unknown ? `${bytes.unknown} older attachments have unrecorded sizes` : 'Accessible version files only', '/documents']].map(([label, count, meta, path]) => <Link className="metric" key={label} to={String(path)}><div><span>{label}</span><ArrowUpRight size={15} /></div><strong>{count}</strong><small>{meta}</small></Link>)}</div><Panel title="Recent uploads & entries" meta="Actual library data, limited to your document access scope" link="/documents/recent"><RecordTable records={recent} compact /></Panel><div className="dashboard-grid"><Panel title="Browse by department" meta="Metadata-driven navigation without duplicate files"><div className="directory-grid">{configFor(state).departments.map(d => [d, active.filter(r => r.department === d).length] as const).filter(([, count]) => count > 0).map(([d, count]) => <Link to={'/documents?department=' + encodeURIComponent(d)} key={d}><Building2 size={19} /><div><h3>{d}</h3><p>{count} accessible entries</p></div><ArrowUpRight size={14} /></Link>)}</div></Panel><Panel title="Recently accessed" meta="Local evaluation activity; not a server access log" link="/documents/recent">{accessed.length ? <RecordTable records={accessed.slice(0, 3) as typeof docs} compact /> : <Empty text="No documents opened in this workspace yet." />}</Panel></div><Panel title="Recent document activity" meta="Recorded in this browser only; durable audit integration is required"><div className="activity-list">{activity.map(a => <div className="activity-row" key={a.id}><span className="activity-dot" /><div><strong>{a.action}</strong><Link to={'/documents/' + a.recordId}>{a.recordTitle}</Link><small>{a.actor} · {timestamp(a.time)} SAST</small></div></div>)}</div></Panel></>;
}
export function Documents({
  mode = 'all'
}: {
  mode?: string;
}) {
  const {
    user
  } = useAuth();
  const state = useRecords();
  const config = configFor(state);
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, string>>(() => Object.fromEntries(params));
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => setFilters(Object.fromEntries(params)), [params]);
  const extra = mode === 'mine' ? {
    mine: '1'
  } : mode === 'archived' ? {
    status: 'Archived'
  } : mode === 'recent' ? {
    sort: params.get('sort') || 'modified'
  } : {};
  const query = {
    ...Object.fromEntries(params),
    ...extra
  };
  const result = queryDocuments(user!, query);
  const labels: Record<string, string> = {
    department: 'Department',
    type: 'Document type',
    classification: 'Confidentiality',
    region: 'Region / office',
    owner: 'Owner',
    uploader: 'Uploaded by',
    reference: 'Business reference',
    format: 'File format',
    status: 'Storage status',
    from: 'Uploaded from',
    to: 'Uploaded to'
  };
  const options: Record<string, string[]> = {
    department: config.departments,
    type: config.documentTypes,
    classification: config.classifications.map(c => c.name),
    region: [...new Set(visible(user!).map(r => r.region).filter(Boolean))],
    format: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'],
    status: ['Available', 'Metadata only', 'Archived']
  };
  const title = mode === 'mine' ? 'My uploads' : mode === 'archived' ? 'Archived documents' : mode === 'recent' ? 'Recent documents' : 'All documents';
  return <><PageHead eyebrow="DOCUMENT LIBRARY" title={title} description="Browse, search and retrieve documents within your access permissions."><UploadLink /></PageHead><section className="panel search-panel"><form onSubmit={e => {
        e.preventDefault();
        setParams(Object.fromEntries(Object.entries(filters).filter(([k, v]) => k !== 'page' && v)));
      }}><div className="search-line"><div className="search-input"><Search size={18} /><input aria-label="Document search" placeholder="Title, file name, tags, document ID or business reference…" value={filters.q || ''} onChange={e => setFilters({
              ...filters,
              q: e.target.value
            })} /></div><button className="primary">Search</button><button type="button" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}><Filter size={16} /> Filters</button></div>{advanced && <div className="form-grid">{Object.entries(labels).filter(([key]) => !(mode === 'archived' && key === 'status')).map(([key, label]) => <label key={key}>{label}{options[key] ? <select value={filters[key] || ''} onChange={e => setFilters({
              ...filters,
              [key]: e.target.value
            })}><option value="">All</option>{options[key].map(v => <option key={v}>{v}</option>)}</select> : <input type={['from', 'to'].includes(key) ? 'date' : 'text'} value={filters[key] || ''} onChange={e => setFilters({
              ...filters,
              [key]: e.target.value
            })} />}</label>)}</div>}<div className="search-meta"><label className="checkbox"><input type="checkbox" checked={filters.content === '1'} onChange={e => setFilters({
              ...filters,
              content: e.target.checked ? '1' : ''
            })} /> Include saved extracted text where available</label><button className="text-button" type="button" onClick={() => {
            setFilters({});
            setParams({});
          }}>Clear filters</button></div></form></section><Panel title={`${result.total} accessible documents`} meta="Content search covers saved scan text only, not every file format"><div className="library-toolbar"><span>{params.get('collection') ? 'Collection: ' + config.collections.find(c => c.id === params.get('collection'))?.name : title}</span><label>Sort<select aria-label="Sort documents" value={params.get('sort') || extra.sort || 'newest'} onChange={e => {
            const p = new URLSearchParams(params);
            p.set('sort', e.target.value);
            p.delete('page');
            setParams(p);
          }}><option value="newest">Newest upload</option><option value="oldest">Oldest upload</option><option value="modified">Last modified</option><option value="title">Title A–Z</option></select></label></div><RecordTable records={result.documents} /><div className="pagination"><span>Page {result.page} of {result.pages} · {result.total} entries</span><button disabled={result.page <= 1} onClick={() => {
          const p = new URLSearchParams(params);
          p.set('page', String(result.page - 1));
          setParams(p);
        }}>Previous</button><button disabled={result.page >= result.pages} onClick={() => {
          const p = new URLSearchParams(params);
          p.set('page', String(result.page + 1));
          setParams(p);
        }}>Next</button></div></Panel></>;
}
export function Directory({
  kind = 'departments'
}: {
  kind?: string;
}) {
  const {
    user
  } = useAuth();
  const state = useRecords();
  const values = kind === 'departments' ? configFor(state).departments : configFor(state).documentTypes;
  return <><PageHead title={kind === 'departments' ? 'Departments' : 'Document types'} description="Browse documents by their descriptive metadata." /><Panel title="Browse the library"><div className="directory-grid">{values.map(name => <Link key={name} to={'/documents?' + (kind === 'departments' ? 'department' : 'type') + '=' + encodeURIComponent(name)}><Building2 size={20} /><div><h3>{name}</h3><p>{visible(user!).filter(r => (kind === 'departments' ? r.department : r.type) === name).length} accessible entries</p></div><ArrowUpRight size={15} /></Link>)}</div></Panel></>;
}
export function Collections() {
  const {
    user
  } = useAuth();
  const state = useRecords();
  return <><PageHead title="Shared collections" description="Metadata-driven views of the same document library. No files are duplicated." /><Panel title="Available collections"><div className="directory-grid">{configFor(state).collections.map(c => <Link key={c.id} to={'/documents?collection=' + encodeURIComponent(c.id)}><FolderSearch size={22} /><div><h3>{c.name}</h3><p>{c.description}</p><p>{queryDocuments(user!, {
                collection: c.id
              }).total} accessible entries</p></div><ArrowUpRight size={15} /></Link>)}</div></Panel></>;
}
export function AuditTrail() {
  const {
    user,
    hasPermission
  } = useAuth();
  const state = useRecords();
  const [q, setQ] = useState('');
  if (!hasPermission('view_audit_logs')) return <Denied />;
  const events = state.audit.filter(a => (!a.recordId || state.records.some(r => r.id === a.recordId && canRead(user!, r))) && `${a.action} ${a.actor} ${a.recordTitle}`.toLowerCase().includes(q.toLowerCase()));
  return <><PageHead title="Document activity history" description="Recorded document changes, version uploads and local access requests." /><div className="notice">This history is stored in this browser. Preview and download requests are local events, not verified server delivery logs. Server audit storage and authenticated access logging remain integration requirements.</div><div className="search-input"><Search size={18} /><input aria-label="Filter activity" value={q} placeholder="Search action, actor or document…" onChange={e => setQ(e.target.value)} /></div><Panel title={`${events.length} local activity events`}><div className="table-scroll"><table><thead><tr><th>Actor</th><th>Action</th><th>Document</th><th>Date / time (SAST)</th></tr></thead><tbody>{events.map(a => <tr key={a.id}><td>{a.actor}<small>{roleLabel(a.role)}</small></td><td>{a.action}</td><td>{a.recordTitle}</td><td>{timestamp(a.time)}</td></tr>)}</tbody></table></div></Panel></>;
}
export function Administration() {
  const {
    hasPermission
  } = useAuth();
  if (!hasPermission('manage_users')) return <Denied />;
  return <><PageHead title="User management" description="Inspect evaluation roles and their repository permissions." /><div className="notice">These identities are fictional. User provisioning, permission changes and revocation require the organisational identity provider and are not active here. Technical administrators have no automatic business-document access.</div><Panel title="Evaluation role directory"><div className="table-scroll"><table><thead><tr><th>Identity</th><th>Department</th><th>Repository permissions</th></tr></thead><tbody>{roles.map(role => <tr key={role}><td>{identity(role).name}</td><td>{identity(role).department}</td><td>{identity(role).permissions.map(p => <Badge key={p}>{roleLabel(p)}</Badge>)}</td></tr>)}</tbody></table></div></Panel></>;
}
export function Settings() {
  const {
    user,
    logout
  } = useAuth();
  const [dense, setDense] = useState(localStorage.getItem(DENSITY_STORAGE_KEY) === 'compact');
  useEffect(() => {
    document.documentElement.dataset.density = dense ? 'compact' : 'comfortable';
    localStorage.setItem(DENSITY_STORAGE_KEY, dense ? 'compact' : 'comfortable');
  }, [dense]);
  return <><PageHead title="Settings & access profile" description="Workspace preferences and evaluation storage boundaries." /><div className="dashboard-grid"><Panel title="Access profile"><div className="padded"><h3>{user!.name}</h3><p>{user!.department}</p><div className="permission-list">{user!.permissions.map(p => <Badge key={p}>{roleLabel(p)}</Badge>)}</div><button onClick={logout}>Sign out</button></div></Panel><Panel title="Workspace preferences"><div className="padded"><label className="checkbox"><input type="checkbox" checked={dense} onChange={e => setDense(e.target.checked)} /> Compact document tables</label><p>Dates use South Africa Standard Time. Evaluation sessions expire after 30 minutes of inactivity.</p><p>Metadata uses localStorage; attachments use IndexedDB. This is temporary evaluation storage and is not a permanent organisational repository.</p><p>Permanent storage proposal: the existing Supabase provider, private document storage, database row-level policies and authenticated access logging. These are not connected to this local workspace.</p></div></Panel></div></>;
}
export function NotFound() {
  return <><PageHead title="Repository page unavailable" description="Business cases, approvals, departmental tasks and workflows belong in the existing operational systems." /><Link className="primary" to="/documents">Open document library</Link></>;
}
export function Configuration() {
  const {
    user,
    hasPermission
  } = useAuth();
  const state = useRecords();
  const config = configFor(state);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState(config.documentTypes[0]);
  if (!hasPermission('manage_categories')) return <Denied />;
  const run = (fn: () => void) => {
    try {
      fn();
      setError('');
      setMessage('Repository configuration saved for this evaluation.');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const optional = ['description', 'region', 'businessUnit', 'sourceReference', 'category', 'tags'];
  return <><PageHead title="Repository configuration" description="Configure descriptive metadata and collection views without managing operational business processes." />{error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}<div className="dashboard-grid"><Panel title="Departments"><div className="padded"><div className="permission-list">{config.departments.map(d => <Badge key={d}>{d}</Badge>)}</div><form onSubmit={e => {
            e.preventDefault();
            const value = String(new FormData(e.currentTarget).get('name')).trim();
            run(() => configureRepository(user!, {
              departments: [...config.departments, value]
            }));
          }}><label>New department<input name="name" required /></label><button>Add department</button></form></div></Panel><Panel title="Document types"><div className="padded"><div className="permission-list">{config.documentTypes.map(d => <Badge key={d}>{d}</Badge>)}</div><form onSubmit={e => {
            e.preventDefault();
            const value = String(new FormData(e.currentTarget).get('name')).trim();
            run(() => configureRepository(user!, {
              documentTypes: [...config.documentTypes, value]
            }));
          }}><label>New document type<input name="name" required /></label><button>Add document type</button></form></div></Panel></div><Panel title="Confidentiality classifications" meta="Existing access tiers are preserved; new classifications must declare an access tier"><div className="padded"><div className="permission-list">{config.classifications.map(c => <Badge key={c.name}>{c.name} · {c.access}</Badge>)}</div><form className="form-grid" onSubmit={e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(() => configureRepository(user!, {
            classifications: [...config.classifications, {
              name: String(f.get('name')).trim(),
              access: String(f.get('access')) as 'public' | 'internal' | 'department' | 'restricted'
            }]
          }));
        }}><label>Classification name<input name="name" required /></label><label>Access tier<select name="access"><option value="internal">Internal repository readers</option><option value="department">Department / records roles</option><option value="restricted">Department only, excluding auditors</option><option value="public">Authenticated readers</option></select></label><button>Add classification</button></form></div></Panel><Panel title="Mandatory metadata by document type" meta="Title, type, department, owner and confidentiality are always required"><form className="form-grid padded" onSubmit={e => {
        e.preventDefault();
        const fields = new FormData(e.currentTarget).getAll('fields').map(String);
        run(() => configureRepository(user!, {
          requiredFields: {
            ...config.requiredFields,
            [type]: fields
          }
        }));
      }}><label>Document type<select value={type} onChange={e => setType(e.target.value)}>{config.documentTypes.map(t => <option key={t}>{t}</option>)}</select></label><div className="required-fields" key={type}>{optional.map(f => <label className="checkbox" key={f}><input type="checkbox" name="fields" value={f} defaultChecked={config.requiredFields[type]?.includes(f)} /> Require {f}</label>)}</div><button className="primary">Save metadata rules</button></form></Panel><Panel title="Create a shared collection" meta="Collections filter existing metadata; they neither duplicate documents nor grant access"><form className="form-grid padded" onSubmit={e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(() => addCollection(user!, {
          name: String(f.get('name')),
          description: String(f.get('description')),
          department: String(f.get('department')) || undefined,
          type: String(f.get('type')) || undefined,
          tags: String(f.get('tags')).split(',').map(t => t.trim()).filter(Boolean)
        }));
      }}><label>Collection name<input name="name" required /></label><label>Description<input name="description" /></label><label>Department<select name="department"><option value="">Any department</option>{config.departments.map(d => <option key={d}>{d}</option>)}</select></label><label>Document type<select name="type"><option value="">Any type</option>{config.documentTypes.map(d => <option key={d}>{d}</option>)}</select></label><label>Required tags (comma separated)<input name="tags" /></label><button className="primary">Create collection</button></form></Panel><Panel title="Archive and removal rules" meta="For stakeholder evaluation only. No retention periods or automatic destruction are configured"><form className="form-grid padded" onSubmit={e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(() => configureRepository(user!, {
          archiveEnabled: f.has('archive'),
          archiveReference: String(f.get('archiveReference')),
          deleteEnabled: f.has('delete'),
          deleteReference: String(f.get('deleteReference'))
        }));
      }}><label className="checkbox"><input name="archive" type="checkbox" defaultChecked={config.archiveEnabled} /> Enable referenced archive process</label><label>Archive approval reference<input name="archiveReference" defaultValue={config.archiveReference} /></label><label className="checkbox"><input name="delete" type="checkbox" defaultChecked={config.deleteEnabled} /> Enable removal from library (soft deletion)</label><label>Removal rule reference<input name="deleteReference" defaultValue={config.deleteReference} /></label><p className="span-two">Removal retains files and metadata. Permanent deletion and organisational retention requirements require stakeholder validation and a backend implementation.</p><button className="primary">Save repository rules</button></form></Panel></>;
}

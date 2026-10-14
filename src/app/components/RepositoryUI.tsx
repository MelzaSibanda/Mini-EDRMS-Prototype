import { ReactNode } from 'react';
import { Link } from 'react-router';
import { FileText, ArrowUpRight, LockKeyhole, ChevronRight } from 'lucide-react';
import { RecordItem, date } from '../lib/enterprise';
import { currentVersion, storageStatus, formatBytes } from '../lib/repository';
export function Badge({
  children
}: {
  children: ReactNode;
}) {
  return <span className={'status ' + (/Available|Public/.test(String(children)) ? 'good' : /Confidential|Restricted/.test(String(children)) ? 'warn' : 'neutral')}>{children}</span>;
}
export function PageHead({
  eyebrow = 'EDMS DOCUMENT LIBRARY',
  title,
  description,
  children
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <div className="page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><div className="actions">{children}</div></div>;
}
export function Panel({
  title,
  meta,
  link,
  children,
  className = ''
}: {
  title: string;
  meta?: string;
  link?: string;
  children: ReactNode;
  className?: string;
}) {
  return <section className={'panel ' + className}><div className="panel-head"><div><h2>{title}</h2>{meta && <p>{meta}</p>}</div>{link && <Link className="text-link" to={link}>View all <ArrowUpRight size={14} /></Link>}</div>{children}</section>;
}
export function Empty({
  text = 'No documents match this view.'
}: {
  text?: string;
}) {
  return <div className="empty"><FileText size={25} /><h3>{text}</h3><p>Clear your filters, try another keyword or upload an authorised document.</p></div>;
}
export function Denied() {
  return <div className="notice"><LockKeyhole size={22} /><div><h2>Document access restricted</h2><p>This role does not authorise this action. Technical administration does not grant access to business documents.</p><Link to="/settings">View access profile</Link></div></div>;
}
export function RecordTable({
  records,
  compact = false
}: {
  records: RecordItem[];
  compact?: boolean;
}) {
  return records.length ? <div className="table-scroll"><table><thead><tr><th>Document</th><th>Department</th><th>Storage status</th>{!compact && <><th>Classification</th><th>File / version</th><th>Uploaded</th></>}<th><span className="sr-only">Open</span></th></tr></thead><tbody>{records.map(r => {
          const v = currentVersion(r);
          return <tr key={r.id}><td><Link className="record-link" to={'/documents/' + r.id}><span className="file-icon"><FileText size={18} /></span><span><strong>{r.title}</strong><small>{r.number} · {r.type}</small>{r.sourceReference && <small>Business reference: {r.sourceReference}</small>}</span></Link></td><td>{r.department}</td><td><Badge>{storageStatus(r)}</Badge></td>{!compact && <><td><Badge>{r.classification}</Badge></td><td>{v.fileName || 'No current attachment'}<small>v{v.number}{v.fileSize !== undefined ? ' · ' + formatBytes(v.fileSize) : ''}</small></td><td>{date(r.created)}<small>{r.createdBy}</small></td></>}<td><Link aria-label={'Open ' + r.title} to={'/documents/' + r.id}><ChevronRight size={17} /></Link></td></tr>;
        })}</tbody></table></div> : <Empty />;
}

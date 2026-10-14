import { PRODUCT_NAME, PRODUCT_SHORT_NAME, PRODUCT_SUBTITLE } from '../lib/product';
import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Files, Upload, Library, Building2, Tags, Clock3, Archive, ListChecks, Users, Settings2, Search, LogOut, Menu, X, ChevronRight, FolderSearch, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { roles, Role, roleLabel } from '../lib/enterprise';
export const navigation = [['Library', [['Dashboard', '/', LayoutDashboard, 'view'], ['All Documents', '/documents', Files, 'view'], ['My Uploads', '/documents/mine', Upload, 'view'], ['Shared Collections', '/collections', Library, 'view'], ['Recent Documents', '/documents/recent', Clock3, 'view'], ['Archived Documents', '/documents/archived', Archive, 'view']]], ['Organisation', [['Departments', '/departments', Building2, 'view'], ['Document Types', '/document-types', Tags, 'view'], ['Activity History', '/activity', ListChecks, 'view_audit_logs'], ['User Management', '/users', Users, 'manage_users'], ['Repository Configuration', '/configuration', Settings2, 'manage_categories'], ['Settings', '/settings', Settings2, 'session']]]] as const;
export function Login() {
  const {
    login
  } = useAuth();
  const [role, setRole] = useState<Role>('records_manager');
  return <div className="edr-login"><div className="login-story"><div className="brand"><FolderSearch /><div><strong>{PRODUCT_SHORT_NAME}</strong><small>{PRODUCT_NAME}</small></div></div><div><span className="eyebrow">{PRODUCT_SUBTITLE}</span><h1>Find documents.<br />Keep information together.</h1><p>A centralised document library for authorised users across organisations. Store, classify, find and retrieve documents while existing business systems retain their operational responsibilities.</p><div className="login-values"><span><Upload /> Upload & classify</span><span><Search /> Search & retrieve</span><span><Files /> Versions & metadata</span></div></div><small>{PRODUCT_NAME}</small></div><div className="login-form"><span className="eyebrow">STAKEHOLDER EVALUATION</span><h2>Open your document workspace</h2><p>Browse accessible documents, upload a file and find information through structured metadata.</p><form onSubmit={e => {
        e.preventDefault();
        login(role);
      }}><label>Fictional evaluation identity<select value={role} onChange={e => setRole(e.target.value as Role)}>{roles.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></label><button className="primary">Enter evaluation workspace <ArrowUpRight size={16} /></button></form><div className="notice"><FolderSearch size={18} /><div><strong>Local evaluation environment</strong><p>Role selection is not organisational authentication. Metadata and files are stored in this browser. No official approval, commissioning or deployment is implied.</p></div></div><small>Use fictional documents only. Organisational sign-in and permanent storage are not connected.</small></div></div>;
}
export function EnterpriseLayout() {
  const {
    user,
    hasPermission,
    logout
  } = useAuth();
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  if (!user) return <Login />;
  const title = navigation.flatMap(g => g[1]).find(n => n[1] === location.pathname)?.[0] || 'Document details';
  return <div className="edr-shell"><a className="skip-link" href="#main">Skip to documents</a>{mobile && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}<aside className={'edr-sidebar ' + (mobile ? 'open' : '')}><Link to="/" className="brand"><FolderSearch size={27} /><div><strong>{PRODUCT_SHORT_NAME}</strong><small>{PRODUCT_NAME}</small></div></Link><div className="workspace-label"><span className="live-dot" /> DOCUMENT WORKSPACE <button className="mobile-close" aria-label="Close navigation" onClick={() => setMobile(false)}><X size={17} /></button></div><nav aria-label="Repository navigation">{navigation.map(([group, items]) => <div className="nav-group" key={group}><p>{group}</p>{items.filter(n => n[3] === 'session' || hasPermission(n[3])).map(([label, path, Icon]) => <NavLink to={path} end key={path} onClick={() => setMobile(false)}><Icon size={17} /><span>{label}</span></NavLink>)}</div>)}</nav><div className="sidebar-user"><span className="avatar">{user.role === 'system_administrator' ? 'SA' : 'EU'}</span><div><strong>{roleLabel(user.role)}</strong><small>Fictional evaluation identity</small></div><button aria-label="Sign out" onClick={logout}><LogOut size={17} /></button></div></aside><div className="edr-workspace"><header className="edr-header"><button className="mobile-trigger" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu size={20} /></button><span className="breadcrumb">Repository <ChevronRight size={14} /> <strong>{title}</strong></span>{hasPermission('view') && <form className="global-search" onSubmit={e => {
          e.preventDefault();
          navigate('/documents?q=' + encodeURIComponent(query));
        }}><Search size={17} /><input aria-label="Search accessible documents" placeholder="Search title, filename, tags or reference…" value={query} onChange={e => setQuery(e.target.value)} /><kbd>Enter</kbd></form>}<span className="env-badge">LOCAL EVALUATION</span><span className="header-avatar">EU</span></header><div className="environment-strip"><span><span className="live-dot" /> Demonstration data · browser storage only</span><span>{PRODUCT_SUBTITLE}</span></div><main id="main" className="edr-main"><Outlet /></main><footer className="edr-footer"><span>{PRODUCT_NAME}</span><span>Stakeholder evaluation · no live business-system integration</span></footer></div></div>;
}

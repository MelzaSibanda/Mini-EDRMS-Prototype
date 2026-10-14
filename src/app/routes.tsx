import { createBrowserRouter, Navigate } from 'react-router';
import { ReactNode } from 'react';
import { EnterpriseLayout } from './components/EnterpriseLayout';
import { Dashboard, Documents, Capture, Detail, Directory, Collections, AuditTrail, Administration, Configuration, Settings, NotFound, Denied } from './components/EnterprisePages';
import { useAuth } from '../hooks/use-auth';
function Guard({
  permission = 'view',
  children
}: {
  permission?: string;
  children: ReactNode;
}) {
  const {
    hasPermission
  } = useAuth();
  return hasPermission(permission) ? children : <Denied />;
}
const allowed = (node: ReactNode, permission = 'view') => <Guard permission={permission}>{node}</Guard>;
export const router = createBrowserRouter([{
  path: '/',
  Component: EnterpriseLayout,
  children: [{
    index: true,
    Component: Dashboard
  }, {
    path: 'documents',
    element: allowed(<Documents />)
  }, {
    path: 'documents/search',
    element: allowed(<Documents />)
  }, {
    path: 'documents/create',
    element: allowed(<Capture />, 'upload')
  }, {
    path: 'documents/mine',
    element: allowed(<Documents mode="mine" />)
  }, {
    path: 'documents/recent',
    element: allowed(<Documents mode="recent" />)
  }, {
    path: 'documents/archived',
    element: allowed(<Documents mode="archived" />)
  }, {
    path: 'documents/:id',
    element: allowed(<Detail />)
  }, {
    path: 'collections',
    element: allowed(<Collections />)
  }, {
    path: 'departments',
    element: allowed(<Directory />)
  }, {
    path: 'document-types',
    element: allowed(<Directory kind="types" />)
  }, {
    path: 'activity',
    element: allowed(<AuditTrail />, 'view_audit_logs')
  }, {
    path: 'users',
    element: allowed(<Administration />, 'manage_users')
  }, {
    path: 'configuration',
    element: allowed(<Configuration />, 'manage_categories')
  }, {
    path: 'settings',
    Component: Settings
  }, {
    path: 'profile',
    Component: Settings
  }, {
    path: 'add',
    element: <Navigate to="/documents/create" replace />
  }, {
    path: 'search',
    element: <Navigate to="/documents" replace />
  }, {
    path: 'admin/departments',
    element: <Navigate to="/departments" replace />
  }, {
    path: 'admin/document-types',
    element: <Navigate to="/document-types" replace />
  }, {
    path: 'admin/audit',
    element: <Navigate to="/activity" replace />
  }, {
    path: 'admin/users',
    element: <Navigate to="/users" replace />
  }, {
    path: 'records',
    element: <Navigate to="/documents" replace />
  }, {
    path: 'records/archived',
    element: <Navigate to="/documents/archived" replace />
  }, {
    path: '*',
    Component: NotFound
  }]
}]);

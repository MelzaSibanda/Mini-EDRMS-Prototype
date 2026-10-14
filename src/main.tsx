import React, { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
function Recovery({
  message
}: {
  message: string;
}) {
  return <div className="login-form"><span className="eyebrow">Electronic Document Management System</span><h2>Workspace requires attention</h2><div className="notice"><p>{message}</p></div><p>Preserve the stored records before troubleshooting or migration. Reload to retry.</p><button className="primary" onClick={() => window.location.reload()}>Reload workspace</button></div>;
}
class WorkspaceBoundary extends Component<{
  children: ReactNode;
}, {
  error: string | null;
}> {
  state = {
    error: null as string | null
  };
  static getDerivedStateFromError(error: Error) {
    return {
      error: error.message
    };
  }
  render() {
    return this.state.error ? <Recovery message={this.state.error} /> : this.props.children;
  }
}
const root = createRoot(document.getElementById('root')!);
import('./app/App').then(({
  default: App
}) => root.render(<WorkspaceBoundary><App /></WorkspaceBoundary>)).catch(error => root.render(<Recovery message={error.message || 'Workspace storage is unavailable.'} />));

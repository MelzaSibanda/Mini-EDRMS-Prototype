/**
 * Root Layout Component
 * 
 * This component provides the main layout structure for all pages.
 * It includes:
 * - Navigation header
 * - Outlet for child routes (pages)
 * 
 * The Outlet component from React Router renders the appropriate page
 * based on the current URL path.
 */

import { Outlet, Link, useLocation } from 'react-router';
import { FileText, Home, Plus, Search } from 'lucide-react';

export default function Root() {
  const location = useLocation();

  // Helper function to determine if a link is active
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <FileText className="size-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mini EDRMS</h1>
                <p className="text-xs text-gray-500">Electronic Document & Records Management</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex gap-1">
              <Link
                to="/"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Home className="size-4" />
                Dashboard
              </Link>
              <Link
                to="/add"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/add')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Plus className="size-4" />
                Add Document
              </Link>
              <Link
                to="/search"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/search')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Search className="size-4" />
                Search Documents
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area - renders child routes */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Mini EDRMS - Graduate IT Interview Demonstration Project
          </p>
        </div>
      </footer>
    </div>
  );
}

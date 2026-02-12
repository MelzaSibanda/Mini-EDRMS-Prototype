/**
 * Layout Component - Main Application Shell
 * 
 * Provides consistent navigation and structure across all pages
 * Demonstrates component composition and routing integration
 */

import { Link, Outlet, useLocation } from "react-router";
import { FileText, Home, Search, PlusCircle } from "lucide-react";

export function Layout() {
  const location = useLocation();
  
  // Helper function to determine if a link is active
  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Mini EDRMS</h1>
              <p className="text-blue-100 text-sm">Electronic Document & Records Management System</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <NavLink to="/" icon={<Home className="w-4 h-4" />} active={isActive("/")}>
              Dashboard
            </NavLink>
            <NavLink to="/add-document" icon={<PlusCircle className="w-4 h-4" />} active={isActive("/add-document")}>
              Add Document
            </NavLink>
            <NavLink to="/search" icon={<Search className="w-4 h-4" />} active={isActive("/search")}>
              Search Documents
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            EDRMS Demo System • Built for Interview Demonstration
          </p>
        </div>
      </footer>
    </div>
  );
}

// Navigation Link Component
interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  active: boolean;
  children: React.ReactNode;
}

function NavLink({ to, icon, active, children }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={`
        flex items-center gap-2 px-4 py-3 text-sm font-medium
        border-b-2 transition-colors
        ${active 
          ? 'border-blue-600 text-blue-600' 
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
        }
      `}
    >
      {icon}
      {children}
    </Link>
  );
}

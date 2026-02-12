/**
 * Search Documents Component
 * 
 * This page allows users to search and filter documents.
 * It demonstrates:
 * - Search functionality with multiple filters
 * - Dynamic query building
 * - Results display in a table
 * - Linking to detail pages
 * 
 * Interview talking points:
 * - WHERE clause filtering in database queries
 * - Combining multiple search criteria
 * - Efficient data retrieval
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Search, Filter, FileText, RefreshCw, Eye } from 'lucide-react';
import { getDepartments, searchDocuments } from '../lib/api';

// TypeScript interfaces
interface Department {
  id: string;
  name: string;
}

interface Document {
  id: string;
  title: string;
  typeName: string;
  departmentName: string;
  deptId: string;
  status: string;
  dateCreated: string;
  ownerName: string;
}

export default function SearchDocuments() {
  // Search filters
  const [filters, setFilters] = useState({
    department: '',
    status: '',
  });

  // Data
  const [documents, setDocuments] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch departments for filter dropdown when component mounts
  useEffect(() => {
    fetchDepartments();
  }, []);

  /**
   * Fetch departments for the filter dropdown
   */
  const fetchDepartments = async () => {
    try {
      const depts = await getDepartments();
      setDepartments(depts);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Search documents with current filters
   * This demonstrates building a filtered query with WHERE conditions
   */
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Search documents with filters
      const docs = await searchDocuments({
        department_id: filters.department,
        status: filters.status,
      });

      // Convert to the format expected by the table
      const tableDocs = docs.map(doc => ({
        id: doc.id,
        title: doc.title,
        typeName: doc.document_type?.name || 'Unknown',
        departmentName: doc.department?.name || 'Unknown',
        deptId: doc.department_id,
        status: doc.status,
        dateCreated: doc.date_created,
        ownerName: doc.owner?.name || 'Unknown',
      }));

      setDocuments(tableDocs);

    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search documents');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset filters and show all documents
   */
  const handleReset = () => {
    setFilters({
      department: '',
      status: '',
    });
    setDocuments([]);
    setHasSearched(false);
    setError(null);
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Search className="size-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Search Documents</h2>
        </div>
        <p className="text-gray-600">Filter documents by department and status</p>
      </div>

      {/* Search Filters Card */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="size-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Search Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Department Filter */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              id="department"
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Searching...
              </>
            ) : (
              <>
                <Search className="size-5" />
                Search
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            <RefreshCw className="size-5" />
            Reset
          </button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-gray-500 mt-4">
          This search demonstrates SQL WHERE clause filtering with multiple conditions
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Results Section */}
      {hasSearched && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Search Results
                {documents.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({documents.length} document{documents.length !== 1 ? 's' : ''} found)
                  </span>
                )}
              </h3>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="size-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">No documents found</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your search filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {doc.id}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <FileText className="size-5 text-gray-400 mr-2 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900">
                              {doc.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {doc.typeName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {doc.departmentName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {doc.dateCreated}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {doc.ownerName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <Link
                            to={`/documents/${doc.id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <Eye className="size-4" />
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Database Query Explanation */}
      {hasSearched && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">SQL Query Equivalent</h3>
          <div className="bg-white border border-gray-300 rounded p-3 font-mono text-sm text-gray-800">
            SELECT d.*, dept.name AS departmentName, dt.name AS typeName<br />
            FROM Documents d<br />
            LEFT JOIN Departments dept ON d.deptId = dept.id<br />
            LEFT JOIN DocumentTypes dt ON d.typeId = dt.id
            {(filters.department || filters.status) && (
              <>
                <br />WHERE {' '}
                {filters.department && `d.deptId = '${filters.department}'`}
                {filters.department && filters.status && ' AND '}
                {filters.status && `d.status = '${filters.status}'`}
              </>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            This demonstrates how the search performs JOIN operations to resolve foreign keys
            and applies WHERE clause filtering based on selected criteria.
          </p>
        </div>
      )}
    </div>
  );
}

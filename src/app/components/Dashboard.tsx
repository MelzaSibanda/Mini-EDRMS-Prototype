/**
 * Dashboard Component
 * 
 * The home page of the EDRMS showing:
 * - Key statistics (total documents, status breakdown, department breakdown)
 * - Recent documents list
 * 
 * This demonstrates:
 * - API data fetching with useState and useEffect hooks
 * - Displaying aggregate data (similar to SQL COUNT and GROUP BY)
 * - Responsive card-based layout
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { FileText, Clock, CheckCircle, Archive, AlertCircle } from 'lucide-react';
import { getDocuments } from '../lib/api';

// TypeScript interfaces for type safety
interface Statistics {
  totalDocuments: number;
  statusCounts: {
    Draft: number;
    Submitted: number;
    Approved: number;
    Archived: number;
  };
  deptCounts: {
    [key: string]: number;
  };
}

interface Document {
  id: string;
  title: string;
  typeName: string;
  departmentName: string;
  status: string;
  dateCreated: string;
  ownerName: string;
}

export default function Dashboard() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data when component mounts
  useEffect(() => {
    fetchDashboardData();
  }, []);

  /**
   * Fetch statistics and recent documents from the backend API
   * This demonstrates asynchronous data fetching and error handling
   */
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all documents
      const docs = await getDocuments();

      // Calculate statistics from documents
      const totalDocuments = docs.length;
      const statusCounts = { Draft: 0, Submitted: 0, Approved: 0, Archived: 0 };
      const deptCounts: { [key: string]: number } = {};

      docs.forEach(doc => {
        if (statusCounts[doc.status as keyof typeof statusCounts] !== undefined) {
          statusCounts[doc.status as keyof typeof statusCounts]++;
        }
        if (doc.department?.name) {
          deptCounts[doc.department.name] = (deptCounts[doc.department.name] || 0) + 1;
        }
      });

      setStatistics({
        totalDocuments,
        statusCounts,
        deptCounts,
      });

      // Convert documents to the format expected by the table
      const tableDocs = docs.map(doc => ({
        id: doc.id,
        title: doc.title,
        typeName: doc.document_type?.name || 'Unknown',
        departmentName: doc.department?.name || 'Unknown',
        status: doc.status,
        dateCreated: doc.date_created,
        ownerName: doc.owner?.name || 'Unknown',
      }));

      // Sort by date (most recent first) and take top 5
      const sortedDocs = tableDocs.sort((a: Document, b: Document) =>
        new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
      );
      setRecentDocuments(sortedDocs.slice(0, 5));

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Status icon helper
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Clock className="size-5 text-yellow-600" />;
      case 'Submitted':
        return <AlertCircle className="size-5 text-blue-600" />;
      case 'Approved':
        return <CheckCircle className="size-5 text-green-600" />;
      case 'Archived':
        return <Archive className="size-5 text-gray-600" />;
      default:
        return <FileText className="size-5 text-gray-600" />;
    }
  };

  // Status badge color helper
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Overview of your document management system</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {statistics?.totalDocuments || 0}
              </p>
            </div>
            <FileText className="size-12 text-blue-600 opacity-20" />
          </div>
        </div>

        {/* Draft Documents */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Draft</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {statistics?.statusCounts.Draft || 0}
              </p>
            </div>
            <Clock className="size-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        {/* Submitted Documents */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Submitted</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {statistics?.statusCounts.Submitted || 0}
              </p>
            </div>
            <AlertCircle className="size-12 text-blue-600 opacity-20" />
          </div>
        </div>

        {/* Approved Documents */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {statistics?.statusCounts.Approved || 0}
              </p>
            </div>
            <CheckCircle className="size-12 text-green-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Documents by Department */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents by Department</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statistics?.deptCounts && Object.entries(statistics.deptCounts).map(([dept, count]) => (
              <div key={dept} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 mt-1">{dept}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Documents</h3>
            <Link to="/search" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
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
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(doc.status)}
                        <span className="ml-2 text-sm font-medium text-gray-900">
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
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

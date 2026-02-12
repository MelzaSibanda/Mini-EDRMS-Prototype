/**
 * Document Details Component
 * 
 * This page displays detailed information about a specific document.
 * It demonstrates:
 * - Retrieving a single record by ID (SELECT ... WHERE id=?)
 * - Displaying related data through foreign key relationships
 * - URL parameter handling
 * 
 * Interview talking points:
 * - Primary key lookup
 * - JOIN operations to get related data
 * - Navigation between pages
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { FileText, Calendar, Building, FolderOpen, User, Tag, ArrowLeft } from 'lucide-react';
import { getDocumentById } from '../lib/api';

interface Document {
  id: string;
  title: string;
  typeName: string;
  departmentName: string;
  status: string;
  dateCreated: string;
  ownerName: string;
  typeId: string;
  deptId: string;
}

export default function DocumentDetails() {
  const { id } = useParams<{ id: string }>(); // Get document ID from URL
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch document details when component mounts or ID changes
  useEffect(() => {
    if (id) {
      fetchDocumentDetails(id);
    }
  }, [id]);

  /**
   * Fetch document by ID
   * This demonstrates: SELECT * FROM documents WHERE id = ?
   * with JOIN operations to get related department and type names
   */
  const fetchDocumentDetails = async (documentId: string) => {
    try {
      setLoading(true);
      setError(null);

      const doc = await getDocumentById(documentId);

      // Convert to the format expected by the component
      const formattedDoc = {
        id: doc.id,
        title: doc.title,
        typeName: doc.document_type?.name || 'Unknown',
        departmentName: doc.department?.name || 'Unknown',
        status: doc.status,
        dateCreated: doc.date_created,
        ownerName: doc.owner?.name || 'Unknown',
        typeId: doc.document_type_id,
        deptId: doc.department_id,
      };

      setDocument(formattedDoc);

    } catch (err) {
      console.error(`Error fetching document ${documentId}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load document details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get status badge styling
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Document</h2>
          <p className="text-red-800 mb-4">{error}</p>
          <button
            onClick={() => navigate('/search')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <FileText className="size-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Document not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        to="/search"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft className="size-4" />
        Back to Search
      </Link>

      {/* Document Header */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="size-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{document.title}</h1>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(document.status)}`}>
                  {document.status}
                </span>
                <span className="text-sm text-gray-500">Document ID: {document.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Metadata */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Document Type */}
          <div className="flex items-start gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <FolderOpen className="size-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Document Type</p>
              <p className="text-base font-semibold text-gray-900 mt-1">{document.typeName}</p>
              <p className="text-xs text-gray-500 mt-1">Type ID: {document.typeId} (Foreign Key)</p>
            </div>
          </div>

          {/* Department */}
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Department</p>
              <p className="text-base font-semibold text-gray-900 mt-1">{document.departmentName}</p>
              <p className="text-xs text-gray-500 mt-1">Dept ID: {document.deptId} (Foreign Key)</p>
            </div>
          </div>

          {/* Date Created */}
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Calendar className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Date Created</p>
              <p className="text-base font-semibold text-gray-900 mt-1">
                {new Date(document.dateCreated).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Owner */}
          <div className="flex items-start gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <User className="size-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Document Owner</p>
              <p className="text-base font-semibold text-gray-900 mt-1">{document.ownerName}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-start gap-3">
            <div className="bg-gray-100 p-2 rounded-lg">
              <Tag className="size-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Current Status</p>
              <p className="text-base font-semibold text-gray-900 mt-1">{document.status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Database Relationship Explanation */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Database Relationships Demonstrated</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="bg-white border border-gray-300 rounded p-3">
            <p className="font-mono text-xs mb-2 text-blue-600">SQL Query to retrieve this document:</p>
            <code className="block font-mono text-xs bg-gray-50 p-2 rounded">
              SELECT d.*, dept.name AS departmentName, dt.name AS typeName<br />
              FROM Documents d<br />
              LEFT JOIN Departments dept ON d.deptId = dept.id<br />
              LEFT JOIN DocumentTypes dt ON d.typeId = dt.id<br />
              WHERE d.id = '{document.id}'
            </code>
          </div>

          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Primary Key:</strong> The document ID ({document.id}) uniquely identifies this record
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Foreign Keys:</strong> typeId ({document.typeId}) and deptId ({document.deptId}) reference other tables
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>JOIN Operations:</strong> We use LEFT JOINs to combine data from Documents, Departments, and DocumentTypes tables
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Data Normalization:</strong> Instead of storing "Finance" repeatedly, we store the department ID and reference the Departments table
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/search')}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Search
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

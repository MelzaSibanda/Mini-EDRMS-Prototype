/**
 * Add Document Component
 * 
 * This page allows users to create new document records.
 * It demonstrates:
 * - Form handling with controlled components
 * - Form validation
 * - API POST request to create data
 * - Dynamic dropdown population from database
 * - Navigation after successful submission
 * 
 * Interview talking points:
 * - Foreign key relationships (typeId references DocumentTypes, deptId references Departments)
 * - Form validation before submission
 * - User feedback (loading states, success/error messages)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { FileText, Save, AlertCircle } from 'lucide-react';
import { getDepartments, getDocumentTypes, createDocument } from '../lib/api';

// TypeScript interfaces for reference data
interface Department {
  id: string;
  name: string;
}

interface DocumentType {
  id: string;
  name: string;
}

export default function AddDocument() {
  const navigate = useNavigate();

  // Form state - demonstrates controlled components pattern in React
  const [formData, setFormData] = useState({
    title: '',
    typeId: '',
    deptId: '',
    status: 'Draft',
    ownerName: '',
  });

  // Reference data for dropdowns
  const [departments, setDepartments] = useState<Department[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch reference data when component mounts
  useEffect(() => {
    fetchReferenceData();
  }, []);

  /**
   * Fetch departments and document types for dropdowns
   * This demonstrates loading reference/lookup tables
   */
  const fetchReferenceData = async () => {
    try {
      // Fetch departments
      const depts = await getDepartments();
      setDepartments(depts);

      // Fetch document types
      const types = await getDocumentTypes();
      setDocumentTypes(types);
    } catch (err) {
      console.error('Error fetching reference data:', err);
    }
  };

  /**
   * Handle form field changes
   * This updates the state as the user types
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Validate form before submission
   * This demonstrates client-side validation
   */
  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Document title is required');
      return false;
    }
    if (!formData.typeId) {
      setError('Please select a document type');
      return false;
    }
    if (!formData.deptId) {
      setError('Please select a department');
      return false;
    }
    if (!formData.status) {
      setError('Please select a status');
      return false;
    }
    if (!formData.ownerName.trim()) {
      setError('Owner name is required');
      return false;
    }
    return true;
  };

  /**
   * Submit form to create new document
   * This demonstrates:
   * - INSERT operation via API
   * - Error handling
   * - Success feedback and navigation
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous messages
    setError(null);
    setSuccess(false);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create new document using API function
      const newDocument = await createDocument({
        title: formData.title,
        document_type_id: formData.typeId,
        department_id: formData.deptId,
        owner_id: "1", // Mock owner ID
        status: formData.status,
        description: formData.title,
      });

      console.log('Document created successfully:', newDocument);

      // Show success message
      setSuccess(true);

      // Reset form
      setFormData({
        title: '',
        typeId: '',
        deptId: '',
        status: 'Draft',
        ownerName: '',
      });

      // Navigate to the new document's detail page after a short delay
      setTimeout(() => {
        navigate(`/documents/${newDocument.id}`);
      }, 1500);

    } catch (err) {
      console.error('Error creating document:', err);
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="size-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Add New Document</h2>
        </div>
        <p className="text-gray-600">Create a new document record in the system</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <svg className="size-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-800 font-medium">Document created successfully! Redirecting...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Document Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Document Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Employee Handbook 2026"
              required
            />
          </div>

          {/* Document Type - Demonstrates foreign key dropdown */}
          <div>
            <label htmlFor="typeId" className="block text-sm font-medium text-gray-700 mb-2">
              Document Type *
            </label>
            <select
              id="typeId"
              name="typeId"
              value={formData.typeId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="">Select a document type</option>
              {documentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Foreign key reference to DocumentTypes table
            </p>
          </div>

          {/* Department - Demonstrates foreign key dropdown */}
          <div>
            <label htmlFor="deptId" className="block text-sm font-medium text-gray-700 mb-2">
              Department *
            </label>
            <select
              id="deptId"
              name="deptId"
              value={formData.deptId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="">Select a department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Foreign key reference to Departments table
            </p>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {/* Owner Name */}
          <div>
            <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-2">
              Owner Name *
            </label>
            <input
              type="text"
              id="ownerName"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., John Smith"
              required
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The Document ID and Date Created will be automatically generated when you save.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="size-5" />
                  Create Document
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      {/* Database Relationship Info - Useful for interview explanations */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Database Relationships Explained</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-mono">•</span>
            <span><strong>typeId:</strong> Foreign key to DocumentTypes table (one-to-many relationship)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-mono">•</span>
            <span><strong>deptId:</strong> Foreign key to Departments table (one-to-many relationship)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-mono">•</span>
            <span>This ensures data integrity and normalization (avoiding data duplication)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

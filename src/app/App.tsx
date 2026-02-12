/**
 * EDRMS Main Application Component
 * 
 * This is the entry point for the Electronic Document and Records Management System.
 * It uses React Router for multi-page navigation.
 * 
 * The application demonstrates:
 * - Modern web architecture with React
 * - RESTful API communication with backend
 * - Routing and navigation
 * - Form handling and validation
 * - Data filtering and search
 * - CRUD operations (Create, Read, Update, Delete)
 */

import { RouterProvider } from 'react-router';
import { router } from './routes';

export default function App() {
  return <RouterProvider router={router} />;
}

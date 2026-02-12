import { createBrowserRouter } from "react-router";
import Root from "./components/Root";
import Dashboard from "./components/Dashboard";
import AddDocument from "./components/AddDocument";
import SearchDocuments from "./components/SearchDocuments";
import DocumentDetails from "./components/DocumentDetails";
import NotFound from "./components/NotFound";

/**
 * EDRMS Routing Configuration
 * 
 * This file defines all routes for the Electronic Document and Records Management System
 * Routes:
 * - / : Dashboard (home page showing statistics)
 * - /add : Form to add new documents
 * - /search : Search and filter documents
 * - /documents/:id : View detailed information about a specific document
 */

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: "add",
        Component: AddDocument,
      },
      {
        path: "search",
        Component: SearchDocuments,
      },
      {
        path: "documents/:id",
        Component: DocumentDetails,
      },
      {
        path: "*",
        Component: NotFound,
      },
    ],
  },
]);

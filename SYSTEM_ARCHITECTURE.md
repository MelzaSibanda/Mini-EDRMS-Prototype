# Mini EDRMS - System Architecture Documentation

## Overview

This document provides a technical overview of the Mini Electronic Document and Records Management System architecture, designed for interview demonstrations.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                     │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ Dashboard  │  │    Add     │  │   Search   │        │
│  │   Page     │  │  Document  │  │ Documents  │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │        React Router Navigation              │         │
│  └────────────────────────────────────────────┘         │
└─────────────────────┬────────────────────────────────────┘
                      │
                      │ HTTPS / REST API
                      │ (Fetch Requests)
                      │
┌─────────────────────▼────────────────────────────────────┐
│              BACKEND (Supabase Edge Functions)           │
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │         Hono Web Server (Routes)            │         │
│  │                                             │         │
│  │  • GET  /departments                        │         │
│  │  • GET  /document-types                     │         │
│  │  • GET  /documents                          │         │
│  │  • GET  /documents/:id                      │         │
│  │  • POST /documents                          │         │
│  │  • GET  /statistics                         │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │          Business Logic Layer               │         │
│  │  • Validation                               │         │
│  │  • Foreign Key Resolution (JOINs)           │         │
│  │  • Data Transformation                      │         │
│  └────────────────────────────────────────────┘         │
└─────────────────────┬────────────────────────────────────┘
                      │
                      │ Key-Value Store API
                      │
┌─────────────────────▼────────────────────────────────────┐
│                  DATABASE (KV Store)                     │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Departments  │  │ DocumentTypes│  │  Documents   │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │ dept:1       │  │ doctype:1    │  │ doc:1        │  │
│  │ dept:2       │  │ doctype:2    │  │ doc:2        │  │
│  │ dept:3       │  │ doctype:3    │  │ doc:3        │  │
│  │ dept:4       │  │ doctype:4    │  │ doc:4        │  │
│  └──────────────┘  └──────────────┘  │ doc:5        │  │
│                                      │ doc:6        │  │
│                                      └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Technology Breakdown

### Frontend Layer

**Framework:** React 18 with TypeScript

**Key Libraries:**
- `react-router` - Client-side routing
- `lucide-react` - Icon system
- `tailwindcss` - Utility-first CSS framework

**State Management:** React Hooks (useState, useEffect)

**Components Structure:**
```
/src/app/
  ├── App.tsx                  # Main entry point
  ├── routes.tsx               # Route configuration
  └── components/
      ├── Root.tsx             # Layout wrapper
      ├── Dashboard.tsx        # Home page
      ├── AddDocument.tsx      # Create document form
      ├── SearchDocuments.tsx  # Search and filter
      ├── DocumentDetails.tsx  # Single document view
      └── NotFound.tsx         # 404 page
```

---

### Backend Layer

**Runtime:** Deno (Supabase Edge Functions)

**Web Framework:** Hono

**Key Features:**
- RESTful API design
- CORS enabled for cross-origin requests
- Request logging for debugging
- Error handling and validation
- Foreign key constraint enforcement

**Server Structure:**
```
/supabase/functions/server/
  ├── index.tsx       # Main server file with all routes
  └── kv_store.tsx    # Database abstraction layer (protected)
```

---

### Database Layer

**Type:** Key-Value Store (simulating relational database)

**Data Model:**

#### Departments Table
```typescript
{
  id: string,        // Primary Key
  name: string       // Department name (HR, Finance, IT, Operations)
}
```
**Storage Key Pattern:** `dept:{id}`

#### DocumentTypes Table
```typescript
{
  id: string,        // Primary Key
  name: string       // Type name (Policy, Contract, Invoice, Evaluation Report)
}
```
**Storage Key Pattern:** `doctype:{id}`

#### Documents Table
```typescript
{
  id: string,          // Primary Key
  title: string,       // Document title
  typeId: string,      // Foreign Key -> DocumentTypes.id
  deptId: string,      // Foreign Key -> Departments.id
  dateCreated: string, // ISO date (YYYY-MM-DD)
  status: string,      // Draft | Submitted | Approved | Archived
  ownerName: string    // Document owner's name
}
```
**Storage Key Pattern:** `doc:{id}`

**Index Table:**
```typescript
// Stores all document IDs for efficient retrieval
"doc:ids": ["1", "2", "3", "4", "5", "6"]
```

---

## Data Flow Examples

### Example 1: Creating a New Document

```
1. USER ACTION
   └─> User fills form and clicks "Create Document"

2. FRONTEND VALIDATION
   └─> Checks all required fields are filled
   └─> If valid, sends POST request

3. API REQUEST
   POST /make-server-964a65bf/documents
   Headers: { Authorization: Bearer <token> }
   Body: {
     title: "New Policy Document",
     typeId: "1",
     deptId: "3",
     status: "Draft",
     ownerName: "John Doe"
   }

4. BACKEND PROCESSING
   └─> Validates required fields
   └─> Checks foreign keys exist (referential integrity)
       ├─> Verifies dept:3 exists
       └─> Verifies doctype:1 exists
   └─> Generates new ID
   └─> Creates document record
   └─> Updates document ID index

5. DATABASE OPERATIONS
   └─> SET doc:7 = { id: "7", title: "New Policy Document", ... }
   └─> SET doc:ids = ["1", "2", "3", "4", "5", "6", "7"]

6. API RESPONSE
   └─> Returns created document with resolved foreign keys
   {
     id: "7",
     title: "New Policy Document",
     typeName: "Policy",        // Resolved from typeId
     departmentName: "IT",       // Resolved from deptId
     ...
   }

7. FRONTEND UPDATE
   └─> Shows success message
   └─> Navigates to document details page
```

---

### Example 2: Searching Documents

```
1. USER ACTION
   └─> Selects Department: "Finance", Status: "Approved"
   └─> Clicks "Search"

2. API REQUEST
   GET /make-server-964a65bf/documents?department=2&status=Approved
   Headers: { Authorization: Bearer <token> }

3. BACKEND PROCESSING
   └─> Parses query parameters
   └─> Retrieves all document IDs
   └─> For each document:
       ├─> GET doc:{id}
       ├─> Apply filters (deptId == "2" AND status == "Approved")
       ├─> If matches, resolve foreign keys:
       │   ├─> GET dept:2 -> "Finance"
       │   └─> GET doctype:{typeId} -> type name
       └─> Add to results array

4. SQL EQUIVALENT
   SELECT d.*, dept.name AS departmentName, dt.name AS typeName
   FROM Documents d
   LEFT JOIN Departments dept ON d.deptId = dept.id
   LEFT JOIN DocumentTypes dt ON d.typeId = dt.id
   WHERE d.deptId = '2' AND d.status = 'Approved'

5. API RESPONSE
   └─> Returns filtered documents array with resolved names

6. FRONTEND DISPLAY
   └─> Renders results in table format
   └─> Shows count: "2 documents found"
```

---

## Security Considerations

### Current Implementation
- ✅ CORS properly configured
- ✅ Authorization header required for API calls
- ✅ Foreign key validation prevents invalid references
- ✅ Input validation on both client and server

### Production Enhancements Needed
- 🔒 User authentication (login/logout)
- 🔒 Role-based access control
- 🔒 Input sanitization against XSS
- 🔒 SQL injection prevention (if using SQL database)
- 🔒 Rate limiting
- 🔒 Audit logging
- 🔒 HTTPS enforcement
- 🔒 Session management

---

## Performance Optimizations

### Current Optimizations
- Efficient key-based lookups
- Minimal data transfer (only required fields)
- Client-side filtering where possible

### Future Improvements
- Pagination for large result sets
- Caching frequently accessed data
- Database indexing on typeId, deptId, status
- Lazy loading of document lists
- CDN for static assets
- Compression of API responses

---

## Scalability

### Current Architecture Scalability
- **Frontend:** Static files can be served from CDN globally
- **Backend:** Serverless functions auto-scale with traffic
- **Database:** KV store is fast but limited for complex queries

### Scaling Recommendations
1. **Database Migration:** Move to PostgreSQL for complex queries and relationships
2. **Caching Layer:** Add Redis for frequently accessed data
3. **Search Optimization:** Implement Elasticsearch for full-text search
4. **Load Balancing:** Distribute API requests across multiple servers
5. **Microservices:** Split into document service, user service, etc.

---

## Testing Strategy

### Unit Tests
- Test individual functions (validation, data transformation)
- Test React components in isolation
- Mock API calls

### Integration Tests
- Test API endpoints with real database
- Test foreign key constraints
- Test error handling

### End-to-End Tests
- Test complete user workflows
- Test navigation between pages
- Test form submission and validation

### Example Test Cases
```
✓ Should create document with valid data
✓ Should reject document with missing title
✓ Should reject document with invalid department ID
✓ Should return filtered results when searching
✓ Should display error when document not found
✓ Should navigate to detail page after creation
```

---

## Deployment Architecture

```
┌──────────────────────────────────────────────────────┐
│                   PRODUCTION                          │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  CDN (Cloudflare / AWS CloudFront)          │    │
│  │  └─> Serves static frontend files           │    │
│  └─────────────────────────────────────────────┘    │
│                      │                               │
│                      │ HTML/CSS/JS                   │
│                      ▼                               │
│  ┌─────────────────────────────────────────────┐    │
│  │  User's Browser                              │    │
│  │  └─> React Application Runs Here            │    │
│  └─────────────────────────────────────────────┘    │
│                      │                               │
│                      │ API Requests (HTTPS)          │
│                      ▼                               │
│  ┌─────────────────────────────────────────────┐    │
│  │  Supabase Edge Functions (Global CDN)       │    │
│  │  └─> Hono Server Processes Requests         │    │
│  └─────────────────────────────────────────────┘    │
│                      │                               │
│                      │ Database Calls                │
│                      ▼                               │
│  ┌─────────────────────────────────────────────┐    │
│  │  Supabase Database (PostgreSQL)             │    │
│  │  └─> Stores all application data            │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
ERROR OCCURS
    │
    ├─> Frontend Error
    │   └─> try/catch block
    │       ├─> Log to console
    │       ├─> Set error state
    │       └─> Display user-friendly message
    │
    └─> Backend Error
        └─> try/catch block
            ├─> Log error details
            ├─> Return appropriate HTTP status
            │   ├─> 400: Bad Request (validation error)
            │   ├─> 404: Not Found
            │   └─> 500: Internal Server Error
            └─> Send error message to frontend
```

---

## Key Interview Talking Points

### 1. Three-Tier Architecture
"This application follows a classic three-tier architecture: Presentation (React), Business Logic (Hono server), and Data (KV store). This separation allows each layer to be developed, tested, and scaled independently."

### 2. RESTful API Design
"The API follows REST principles: GET for retrieval, POST for creation, proper use of HTTP status codes, and resource-based URLs like /documents/:id."

### 3. Database Normalization
"I've normalized the data by using foreign keys. Instead of duplicating department names across all documents, I store a reference to the Departments table. This follows Third Normal Form (3NF)."

### 4. Client-Server Communication
"The frontend and backend communicate via JSON over HTTPS. The frontend sends requests with authorization headers, and the backend responds with JSON data. This stateless design makes the system scalable."

### 5. Error Handling
"I've implemented comprehensive error handling at every layer: validation errors show helpful messages, network errors are caught and logged, and database errors return appropriate HTTP status codes."

---

## Conclusion

This architecture demonstrates:
- ✅ Modern web application design patterns
- ✅ Proper separation of concerns
- ✅ Database design fundamentals
- ✅ RESTful API best practices
- ✅ Scalable, maintainable code structure

Perfect for demonstrating full-stack development knowledge in a graduate IT interview!

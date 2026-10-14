import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

/**
 * EDMS Backend Server - Hono Web Server
 *
 * This server handles all backend operations for the Electronic Document and Records Management System.
 * Architecture: Frontend -> Server -> Database (KV Store)
 *
 * Database Structure (Record Reference Model using KV Store):
 * - Departments: dept:{id} -> { id, name }
 * - DocumentTypes: doctype:{id} -> { id, name }
 * - Documents: doc:{id} -> { id, title, typeId, deptId, dateCreated, status, ownerName }
 * - Users: user:{id} -> { id, name }
 *
 */

const app = new Hono();

// KV Store functions (inlined for single-file deployment)
const kvClient = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

const kv = {
  set: async (key: string, value: any): Promise<void> => {
    try {
      const supabase = kvClient();
      const { error } = await supabase.from("kv_store_964a65bf").upsert({
        key,
        value
      });
      if (error) {
        console.error("KV set error:", error);
        throw new Error(error.message);
      }
    } catch (e) {
      console.error("KV set failed:", e);
      throw e;
    }
  },

  get: async (key: string): Promise<any> => {
    try {
      const supabase = kvClient();
      const { data, error } = await supabase.from("kv_store_964a65bf").select("value").eq("key", key).maybeSingle();
      if (error) {
        console.error("KV get error:", error);
        throw new Error(error.message);
      }
      return data?.value;
    } catch (e) {
      console.error("KV get failed:", e);
      throw e;
    }
  },

  del: async (key: string): Promise<void> => {
    try {
      const supabase = kvClient();
      const { error } = await supabase.from("kv_store_964a65bf").delete().eq("key", key);
      if (error) {
        console.error("KV del error:", error);
        throw new Error(error.message);
      }
    } catch (e) {
      console.error("KV del failed:", e);
      throw e;
    }
  }
};

// Enable logger for debugging
app.use('*', logger(console.log));

// Enable CORS for all routes - required for frontend to communicate with backend
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

/**
 * Initialize Database with Seed Data
 * It runs idempotently (safe to run multiple times)
 */
async function initializeDatabase() {
  try {
    // Check if already initialized
    const initialized = await kv.get("edrms:initialized");
    if (initialized === "true") {
      console.log("Database already initialized");
      return;
    }

    console.log("Initializing EDMS database with seed data...");
    const departments = [
      { id: "1", name: "HR" },
      { id: "2", name: "Finance" },
      { id: "3", name: "IT" },
      { id: "4", name: "Operations" },
    ];

    for (const dept of departments) {
      await kv.set(`dept:${dept.id}`, JSON.stringify(dept));
    }
    const documentTypes = [
      { id: "1", name: "Policy" },
      { id: "2", name: "Contract" },
      { id: "3", name: "Invoice" },
      { id: "4", name: "Evaluation Report" },
    ];

    for (const type of documentTypes) {
      await kv.set(`doctype:${type.id}`, JSON.stringify(type));
    }
    const evaluationRecords = [
      {
        id: "1",
        title: "Fictional HR Policy Review – 2026",
        typeId: "1", // Foreign key to Document Types (Policy)
        deptId: "1", // Foreign key to Departments (HR)
        dateCreated: "2026-01-15",
        status: "Approved",
        ownerName: "Fictional HR Officer",
      },
      {
        id: "2",
        title: "Fictional Finance Quarterly Review",
        typeId: "4", // Evaluation Report
        deptId: "2", // Finance
        dateCreated: "2026-01-20",
        status: "Approved",
        ownerName: "Fictional Finance Officer",
      },
      {
        id: "3",
        title: "Fictional Supplier Service Agreement",
        typeId: "2", // Contract
        deptId: "3", // IT
        dateCreated: "2026-02-01",
        status: "Submitted",
        ownerName: "Fictional IT Officer",
      },
      {
        id: "4",
        title: "Fictional Regional Office Correspondence",
        typeId: "3", // Invoice
        deptId: "4", // Operations
        dateCreated: "2026-02-05",
        status: "Approved",
        ownerName: "Fictional Regional Officer",
      },
      {
        id: "5",
        title: "Fictional HR Policy Amendment",
        typeId: "1", // Policy
        deptId: "1", // HR
        dateCreated: "2026-02-10",
        status: "Draft",
        ownerName: "Fictional HR Officer",
      },
      {
        id: "6",
        title: "Fictional Information Governance Assessment",
        typeId: "4", // Evaluation Report
        deptId: "3", // IT
        dateCreated: "2026-02-11",
        status: "Submitted",
        ownerName: "Fictional IT Officer",
      },
    ];

    for (const doc of evaluationRecords) {
      await kv.set(`doc:${doc.id}`, JSON.stringify(doc));
    }

    // Keep track of all document IDs for efficient retrieval
    await kv.set("doc:ids", JSON.stringify(evaluationRecords.map(d => d.id)));

    // Mark as initialized
    await kv.set("edrms:initialized", "true");

    console.log("Database initialization complete!");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Initialize database on server startup (async)
(async () => {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
})();

/**
 * GET /init-database
 * Initialize database with seed data
 */
app.post("/init-database", async (c) => {
  await initializeDatabase();
  return c.json({ message: "Database initialized successfully" });
});

/**
 * GET /departments
 * Retrieves all departments
 * Used for populating dropdown menus in forms and filters
 */
app.get("/departments", async (c) => {
  try {
    // Retrieve all department records using key prefix pattern
    const deptKeys = ["dept:1", "dept:2", "dept:3", "dept:4"];
    const departments = [];

    for (const key of deptKeys) {
      const dept = await kv.get(key);
      if (dept) {
        departments.push(JSON.parse(dept));
      }
    }

    return c.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return c.json({ error: "Failed to fetch departments" }, 500);
  }
});

/**
 * GET /users
 * Retrieves all users
 */
app.get("/users", async (c) => {
  try {
    const users = [
      { id: "1", name: "Fictional HR Officer", email: "hr-officer@example.invalid", department_id: "1" },
      { id: "2", name: "Fictional Finance Officer", email: "finance-officer@example.invalid", department_id: "2" },
      { id: "3", name: "Fictional IT Officer", email: "it-officer@example.invalid", department_id: "3" },
      { id: "4", name: "Fictional Regional Officer", email: "regional-officer@example.invalid", department_id: "4" },
    ];

    return c.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

/**
 * GET /document-types
 * Retrieves all document types
 */
app.get("/document-types", async (c) => {
  try {
    const typeKeys = ["doctype:1", "doctype:2", "doctype:3", "doctype:4"];
    const types = [];

    for (const key of typeKeys) {
      const type = await kv.get(key);
      if (type) {
        types.push(JSON.parse(type));
      }
    }

    return c.json(types);
  } catch (error) {
    console.error("Error fetching document types:", error);
    return c.json({ error: "Failed to fetch document types" }, 500);
  }
});

/**
 * GET /documents
 * Retrieves all documents with optional filtering
 * Query params: department_id, status
 *
 * - Data retrieval with filtering
 * - JOIN-like operations (resolving foreign keys to get related data)
 */
app.get("/documents", async (c) => {
  try {
    const deptFilter = c.req.query("department_id");
    const statusFilter = c.req.query("status");

    // Get all document IDs
    const idsJson = await kv.get("doc:ids");
    const ids = idsJson ? JSON.parse(idsJson) : [];

    const documents = [];

    // Retrieve each document and apply filters
    for (const id of ids) {
      const docJson = await kv.get(`doc:${id}`);
      if (docJson) {
        const doc = JSON.parse(docJson);

        // Apply filters if provided
        if (deptFilter && doc.deptId !== deptFilter) continue;
        if (statusFilter && doc.status !== statusFilter) continue;
        const deptJson = await kv.get(`dept:${doc.deptId}`);
        const typeJson = await kv.get(`doctype:${doc.typeId}`);

        // Transform to match API interface
        documents.push({
          id: doc.id,
          title: doc.title,
          document_type_id: doc.typeId,
          department_id: doc.deptId,
          owner_id: "1",
          status: doc.status,
          date_created: doc.dateCreated,
          description: doc.title, // Use title as description
          department: deptJson ? JSON.parse(deptJson) : undefined,
          document_type: typeJson ? JSON.parse(typeJson) : undefined,
          owner: { id: "1", name: doc.ownerName, email: `${doc.ownerName.toLowerCase().replace(' ', '.')}@example.invalid`, department_id: doc.deptId }
        });
      }
    }

    return c.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return c.json({ error: "Failed to fetch documents" }, 500);
  }
});

/**
 * GET /documents/:id
 * Retrieves a single document by ID with all related data
 */
app.get("/documents/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const docJson = await kv.get(`doc:${id}`);

    if (!docJson) {
      return c.json({ error: "Document not found" }, 404);
    }

    const doc = JSON.parse(docJson);

    // Resolve foreign keys to get full related data
    const deptJson = await kv.get(`dept:${doc.deptId}`);
    const typeJson = await kv.get(`doctype:${doc.typeId}`);

    const fullDocument = {
      id: doc.id,
      title: doc.title,
      document_type_id: doc.typeId,
      department_id: doc.deptId,
      owner_id: "1",
      status: doc.status,
      date_created: doc.dateCreated,
      description: doc.title,
      department: deptJson ? JSON.parse(deptJson) : undefined,
      document_type: typeJson ? JSON.parse(typeJson) : undefined,
      owner: { id: "1", name: doc.ownerName, email: `${doc.ownerName.toLowerCase().replace(' ', '.')}@example.invalid`, department_id: doc.deptId }
    };

    return c.json(fullDocument);
  } catch (error) {
    console.error(`Error fetching document ${c.req.param("id")}:`, error);
    return c.json({ error: "Failed to fetch document" }, 500);
  }
});

/**
 * POST /documents
 * Creates a new document record
 */
app.post("/documents", async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields (map from API fields to internal fields)
    if (!body.title || !body.document_type_id || !body.department_id || !body.status) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Validate foreign keys exist (referential integrity)
    const deptExists = await kv.get(`dept:${body.department_id}`);
    const typeExists = await kv.get(`doctype:${body.document_type_id}`);

    if (!deptExists) {
      return c.json({ error: "Invalid department ID" }, 400);
    }
    if (!typeExists) {
      return c.json({ error: "Invalid document type ID" }, 400);
    }

    // Generate new ID (in production, use UUID or auto-increment)
    const idsJson = await kv.get("doc:ids");
    const ids = idsJson ? JSON.parse(idsJson) : [];
    const newId = (Math.max(...ids.map((id: string) => parseInt(id)), 0) + 1).toString();

    // Create new document record
    const newDocument = {
      id: newId,
      title: body.title,
      typeId: body.document_type_id,
      deptId: body.department_id,
      dateCreated: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      status: body.status,
      ownerName: "Fictional Records Officer", // Fictional evaluation identity
    };

    // Save to database
    await kv.set(`doc:${newId}`, JSON.stringify(newDocument));

    // Update ID list
    ids.push(newId);
    await kv.set("doc:ids", JSON.stringify(ids));

    // Return created document with resolved foreign keys
    const deptJson = await kv.get(`dept:${newDocument.deptId}`);
    const typeJson = await kv.get(`doctype:${newDocument.typeId}`);

    const fullDocument = {
      id: newDocument.id,
      title: newDocument.title,
      document_type_id: newDocument.typeId,
      department_id: newDocument.deptId,
      owner_id: "1",
      status: newDocument.status,
      date_created: newDocument.dateCreated,
      description: body.description || newDocument.title,
      department: deptJson ? JSON.parse(deptJson) : undefined,
      document_type: typeJson ? JSON.parse(typeJson) : undefined,
      owner: { id: "1", name: newDocument.ownerName, email: `${newDocument.ownerName.toLowerCase().replace(' ', '.')}@example.invalid`, department_id: newDocument.deptId }
    };

    return c.json(fullDocument, 201);
  } catch (error) {
    console.error("Error creating document:", error);
    return c.json({ error: "Failed to create document" }, 500);
  }
});

/**
 * PUT /documents/:id
 * Updates an existing document
 */
app.put("/documents/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const docJson = await kv.get(`doc:${id}`);
    if (!docJson) {
      return c.json({ error: "Document not found" }, 404);
    }

    const existingDoc = JSON.parse(docJson);

    // Update fields
    const updatedDoc = {
      ...existingDoc,
      title: body.title || existingDoc.title,
      typeId: body.document_type_id || existingDoc.typeId,
      deptId: body.department_id || existingDoc.deptId,
      status: body.status || existingDoc.status,
    };

    // Validate foreign keys if changed
    if (body.document_type_id) {
      const typeExists = await kv.get(`doctype:${body.document_type_id}`);
      if (!typeExists) {
        return c.json({ error: "Invalid document type ID" }, 400);
      }
    }
    if (body.department_id) {
      const deptExists = await kv.get(`dept:${body.department_id}`);
      if (!deptExists) {
        return c.json({ error: "Invalid department ID" }, 400);
      }
    }

    // Save updated document
    await kv.set(`doc:${id}`, JSON.stringify(updatedDoc));

    // Return updated document with resolved foreign keys
    const deptJson = await kv.get(`dept:${updatedDoc.deptId}`);
    const typeJson = await kv.get(`doctype:${updatedDoc.typeId}`);

    const fullDocument = {
      id: updatedDoc.id,
      title: updatedDoc.title,
      document_type_id: updatedDoc.typeId,
      department_id: updatedDoc.deptId,
      owner_id: "1",
      status: updatedDoc.status,
      date_created: updatedDoc.dateCreated,
      description: body.description || updatedDoc.title,
      department: deptJson ? JSON.parse(deptJson) : undefined,
      document_type: typeJson ? JSON.parse(typeJson) : undefined,
      owner: { id: "1", name: updatedDoc.ownerName, email: `${updatedDoc.ownerName.toLowerCase().replace(' ', '.')}@example.invalid`, department_id: updatedDoc.deptId }
    };

    return c.json(fullDocument);
  } catch (error) {
    console.error(`Error updating document ${c.req.param("id")}:`, error);
    return c.json({ error: "Failed to update document" }, 500);
  }
});

/**
 * DELETE /documents/:id
 * Deletes a document
 */
app.delete("/documents/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const docJson = await kv.get(`doc:${id}`);
    if (!docJson) {
      return c.json({ error: "Document not found" }, 404);
    }

    // Remove from database
    await kv.del(`doc:${id}`);

    // Update ID list
    const idsJson = await kv.get("doc:ids");
    if (idsJson) {
      const ids = JSON.parse(idsJson).filter((docId: string) => docId !== id);
      await kv.set("doc:ids", JSON.stringify(ids));
    }

    return c.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error(`Error deleting document ${c.req.param("id")}:`, error);
    return c.json({ error: "Failed to delete document" }, 500);
  }
});

/**
 * GET /statistics
 * Retrieves dashboard statistics
 */
app.get("/statistics", async (c) => {
  try {
    const idsJson = await kv.get("doc:ids");
    const ids = idsJson ? JSON.parse(idsJson) : [];

    let totalDocuments = 0;
    const statusCounts: { [key: string]: number } = { Draft: 0, Submitted: 0, Approved: 0, Archived: 0 };
    const deptCounts: { [key: string]: number } = {};

    // Count documents by status and department
    for (const id of ids) {
      const docJson = await kv.get(`doc:${id}`);
      if (docJson) {
        const doc = JSON.parse(docJson);
        totalDocuments++;

        // Count by status
        if (statusCounts[doc.status] !== undefined) {
          statusCounts[doc.status]++;
        }

        // Count by department
        const deptJson = await kv.get(`dept:${doc.deptId}`);
        if (deptJson) {
          const deptName = JSON.parse(deptJson).name;
          deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
        }
      }
    }

    return c.json({
      totalDocuments,
      statusCounts,
      deptCounts,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return c.json({ error: "Failed to fetch statistics" }, 500);
  }
});

Deno.serve(app.fetch);

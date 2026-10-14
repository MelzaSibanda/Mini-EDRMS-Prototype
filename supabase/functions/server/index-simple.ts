import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";

const app = new Hono();

// Enable CORS for all routes - integration CORS configuration
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Client-Info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Identity integration is required before operational use
app.use("/*", async (c, next) => {
  await next();
});
const departments = [
  { id: "1", name: "HR" },
  { id: "2", name: "Finance" },
  { id: "3", name: "IT" },
  { id: "4", name: "Operations" },
];

const documentTypes = [
  { id: "1", name: "Policy" },
  { id: "2", name: "Contract" },
  { id: "3", name: "Invoice" },
  { id: "4", name: "Evaluation Report" },
];

const users = [
  { id: "1", name: "Fictional HR Officer", email: "hr-officer@example.invalid", department_id: "1" },
  { id: "2", name: "Fictional Finance Officer", email: "finance-officer@example.invalid", department_id: "2" },
  { id: "3", name: "Fictional IT Officer", email: "it-officer@example.invalid", department_id: "3" },
  { id: "4", name: "Fictional Regional Officer", email: "regional-officer@example.invalid", department_id: "4" },
];

let documents = [
  {
    id: "1",
    title: "Fictional HR Policy Review – 2026",
    document_type_id: "1",
    department_id: "1",
    owner_id: "1",
    status: "Approved",
    date_created: "2026-01-15",
    description: "Fictional HR Policy Review – 2026",
    department: { id: "1", name: "HR" },
    document_type: { id: "1", name: "Policy" },
    owner: { id: "1", name: "Fictional HR Officer", email: "hr-officer@example.invalid", department_id: "1" }
  },
  {
    id: "2",
    title: "Fictional Finance Quarterly Review",
    document_type_id: "4",
    department_id: "2",
    owner_id: "2",
    status: "Approved",
    date_created: "2026-01-20",
    description: "Fictional Finance Quarterly Review",
    department: { id: "2", name: "Finance" },
    document_type: { id: "4", name: "Evaluation Report" },
    owner: { id: "2", name: "Fictional Finance Officer", email: "finance-officer@example.invalid", department_id: "2" }
  },
  {
    id: "3",
    title: "Fictional Supplier Service Agreement",
    document_type_id: "2",
    department_id: "3",
    owner_id: "3",
    status: "Submitted",
    date_created: "2026-02-01",
    description: "Fictional Supplier Service Agreement",
    department: { id: "3", name: "IT" },
    document_type: { id: "2", name: "Contract" },
    owner: { id: "3", name: "Fictional IT Officer", email: "it-officer@example.invalid", department_id: "3" }
  },
  {
    id: "4",
    title: "Fictional Regional Office Correspondence",
    document_type_id: "3",
    department_id: "4",
    owner_id: "4",
    status: "Approved",
    date_created: "2026-02-05",
    description: "Fictional Regional Office Correspondence",
    department: { id: "4", name: "Operations" },
    document_type: { id: "3", name: "Invoice" },
    owner: { id: "4", name: "Fictional Regional Officer", email: "regional-officer@example.invalid", department_id: "4" }
  },
  {
    id: "5",
    title: "Fictional HR Policy Amendment",
    document_type_id: "1",
    department_id: "1",
    owner_id: "1",
    status: "Draft",
    date_created: "2026-02-10",
    description: "Fictional HR Policy Amendment",
    department: { id: "1", name: "HR" },
    document_type: { id: "1", name: "Policy" },
    owner: { id: "1", name: "Fictional HR Officer", email: "hr-officer@example.invalid", department_id: "1" }
  },
  {
    id: "6",
    title: "Fictional Information Governance Assessment",
    document_type_id: "4",
    department_id: "3",
    owner_id: "3",
    status: "Submitted",
    date_created: "2026-02-11",
    description: "Fictional Information Governance Assessment",
    department: { id: "3", name: "IT" },
    document_type: { id: "4", name: "Evaluation Report" },
    owner: { id: "3", name: "Fictional IT Officer", email: "it-officer@example.invalid", department_id: "3" }
  },
];

// Test route
app.get("/", (c) => {
  return c.json({ message: "EDMS API is running", status: "ok" });
});

// Routes
app.get("/departments", (c) => {
  return c.json(departments);
});

app.get("/users", (c) => {
  return c.json(users);
});

app.get("/document-types", (c) => {
  return c.json(documentTypes);
});

app.get("/documents", (c) => {
  const deptFilter = c.req.query("department_id");
  const statusFilter = c.req.query("status");

  let filtered = documents;
  if (deptFilter) {
    filtered = filtered.filter(doc => doc.department_id === deptFilter);
  }
  if (statusFilter) {
    filtered = filtered.filter(doc => doc.status === statusFilter);
  }

  return c.json(filtered);
});

app.get("/documents/:id", (c) => {
  const id = c.req.param("id");
  const doc = documents.find(d => d.id === id);
  if (!doc) {
    return c.json({ error: "Document not found" }, 404);
  }
  return c.json(doc);
});

app.post("/documents", (c) => {
  return c.req.json().then(body => {
    const newId = (Math.max(...documents.map(d => parseInt(d.id)), 0) + 1).toString();
    const newDoc = {
      id: newId,
      title: body.title,
      document_type_id: body.document_type_id,
      department_id: body.department_id,
      owner_id: "1",
      status: body.status,
      date_created: new Date().toISOString().split('T')[0],
      description: body.description || body.title,
      department: departments.find(d => d.id === body.department_id),
      document_type: documentTypes.find(dt => dt.id === body.document_type_id),
      owner: users.find(u => u.id === "1")
    };
    documents.push(newDoc);
    return c.json(newDoc, 201);
  });
});

app.put("/documents/:id", (c) => {
  const id = c.req.param("id");
  return c.req.json().then(body => {
    const index = documents.findIndex(d => d.id === id);
    if (index === -1) {
      return c.json({ error: "Document not found" }, 404);
    }
    documents[index] = { ...documents[index], ...body };
    return c.json(documents[index]);
  });
});

app.delete("/documents/:id", (c) => {
  const id = c.req.param("id");
  const index = documents.findIndex(d => d.id === id);
  if (index === -1) {
    return c.json({ error: "Document not found" }, 404);
  }
  documents.splice(index, 1);
  return c.json({ message: "Document deleted successfully" });
});

app.get("/statistics", (c) => {
  const totalDocuments = documents.length;
  const statusCounts = { Draft: 0, Submitted: 0, Approved: 0, Archived: 0 };
  const deptCounts: { [key: string]: number } = {};

  documents.forEach(doc => {
    if (statusCounts[doc.status as keyof typeof statusCounts] !== undefined) {
      statusCounts[doc.status as keyof typeof statusCounts]++;
    }
    const deptName = doc.department?.name;
    if (deptName) {
      deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
    }
  });

  return c.json({
    totalDocuments,
    statusCounts,
    deptCounts,
  });
});

Deno.serve(app.fetch);

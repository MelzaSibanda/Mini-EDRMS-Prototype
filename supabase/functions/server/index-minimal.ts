// Minimal test function
export default async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace('/make-server-964a65bf', '');

  if (path === '/' || path === '') {
    return new Response(JSON.stringify({
      message: "EDRMS API is running",
      status: "ok",
      path: path
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (path === '/statistics') {
    return new Response(JSON.stringify({
      totalDocuments: 6,
      statusCounts: { Draft: 1, Submitted: 2, Approved: 3, Archived: 0 },
      deptCounts: { HR: 2, Finance: 1, IT: 2, Operations: 1 }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (path === '/departments') {
    return new Response(JSON.stringify([
      { id: "1", name: "HR" },
      { id: "2", name: "Finance" },
      { id: "3", name: "IT" },
      { id: "4", name: "Operations" }
    ]), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ error: "Not found", path: path }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  });
};
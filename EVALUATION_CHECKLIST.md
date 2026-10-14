# Electronic Document Management System evaluation checklist

- Enter using a fictional evaluation role; check role-specific navigation.
- Upload a real fictional file and verify metadata, filename, MIME type and byte size.
- Reject unsupported extensions, disguised files, empty uploads and oversized files.
- Review scan suggestions and confirm that manually edited values are retained.
- Search metadata, tags, filenames and business references; filter and paginate results.
- Verify that saved-text search only covers indexed supported content.
- Open details and preview PDF/image/text; use native downloads for Office formats.
- Edit metadata and explicitly link an accessible related document.
- Upload independent minor/major versions and retrieve historical file bytes.
- Test failed storage writes and confirm that metadata is not created and new files are cleaned up.
- Check that unauthorised roles cannot search restricted metadata or invoke the file reader.
- Configure required fields and collections; verify no file duplication.
- Keep archive/removal disabled without a rule reference; retain legal holds and historical restrictions.
- Review local activity without calling it a server-verified or immutable audit service.
- Verify document-only navigation and preserved legacy IDs, binary versions and business references.
- Complete browser/responsive, Supabase RLS/file-broker, organisational identity, dependency security and recovery validation before production use.
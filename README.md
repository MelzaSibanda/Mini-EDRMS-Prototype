# Electronic Document Management System

*Centralised Document Storage & Retrieval*

A centralised platform for securely storing, classifying, searching, retrieving and managing electronic documents. EDMS is an independent demonstration suitable for different organisations; sample metadata and evaluation identities are clearly labelled. See the security boundaries below.

## Scope

This repository stores, classifies, searches and retrieves documents. Existing business systems retain responsibility for operational processes, business approvals and departmental tasks. Business references are descriptive metadata; there is no live integration with those systems.

## Run and verify

Run `npm.cmd run dev` and open the Vite address (configured port 5174). Sign in with a fictional evaluation role. Run `npm.cmd test` for repository lifecycle, IndexedDB integrity, access, extraction and OCR checks. Run `npm.cmd run build` to prepare a deployable frontend bundle. OCR/PDF assets are copied locally by predev/prebuild; document content is not sent to an external OCR service.

## Functional local capabilities

- Central library, My Uploads, recent and archived views; sortable paginated browsing.
- Metadata search by title, ID, filename, tags, reference, type, department, region, owner, uploader, classification, format and date range.
- Search of saved extracted text where available; no blanket full-text search claim.
- Validated file uploads (20 MB): PDF, DOCX, XLSX, PPTX, TXT, PNG, JPEG, WEBP, BMP and GIF. Office package structure and file signatures are checked. This is not antivirus protection.
- Browser text extraction and English OCR for supported PDF, Word, text and image files; editable suggestions and user review. Excel/PowerPoint use manual metadata.
- PDF canvas preview, image/text preview, native-download indicators for other formats.
- Editable metadata, explicit related-document links and retained binary version history.
- Configurable departments, document types, confidentiality labels, required fields and metadata collections; collections never duplicate files or grant access.
- Local document activity, role inspection and 30-minute inactivity sessions.
- Referenced archive/restoration and permission-gated soft removal. Rules are disabled by default; historical holds are preserved. Soft removal retains metadata, versions and files. There is no automatic destruction or invented retention schedule.

## Data preservation

The original browser metadata key and IndexedDB database are preserved; see [Rebranding report](REBRANDING_REPORT.md) for compatibility identifiers. Normalisation adds repository storage status without replacing IDs, business references, historical fields, versions or files. Old business-process status is not displayed as storage status. No cloud migration has occurred. Failed metadata writes roll back new file storage; failed binary uploads do not create library records. Conflicting writes are rejected with a reload instruction.

## Security and storage boundaries

This local evaluation UI still uses browser storage and role selection. They are not permanent organisational storage or production security boundaries. Local activity entries cannot be edited through the app, but are not tamper-resistant and are not verified server view/download logs. User provisioning and revocation are not implemented in the UI.

A reviewable Supabase migration and authenticated file-broker source are provided in `supabase/migrations/20261013090000_central_repository.sql` and `supabase/functions/repository/`. They retain the existing provider and leave existing KV data untouched. The proposed bucket is private; ordinary clients have no direct file policies, and a restrictive policy protects it from broad existing storage policies. The file broker validates bytes on the server, checks authenticated document RLS before binary retrieval and records delivery events using a server-only audit function. Technical administration does not grant business-document access.

These sources are **not deployed, database-tested or connected to the frontend**. Organisational authentication, approved profile provisioning/taxonomies, live migration, malware scanning, backup/recovery, administrative configuration APIs, backend archival/removal integration and durable repository connectivity remain required. The package installer reports unresolved dependency advisories; an additional audit was declined. Browser-worker and responsive end-to-end checks need an interactive browser.

See [Architecture](SYSTEM_ARCHITECTURE.md), [Stakeholder guide](STAKEHOLDER_GUIDE.md), [Storage integration](supabase/functions/repository/README.md) and [Evaluation checklist](EVALUATION_CHECKLIST.md).
## Render hosting

The root [render.yaml](render.yaml) configures a Render Static Site with SPA routing and locally bundled OCR/PDF assets. See [Render deployment](RENDER_DEPLOYMENT.md) for Blueprint/manual setup and hosted verification. Hosting preserves the evaluation application's browser-storage and authentication limitations.

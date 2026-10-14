# EDMS rebranding report

Product: **Electronic Document Management System (EDMS)**. Subtitle: **Centralised Document Storage & Retrieval**.

## Changes

- Replaced former organisation branding in browser metadata, login, sidebar, footer, recovery screen, package identity, document-number generation, documentation and backend log/health messages.
- Centralised the product identity in product.ts. Retained the existing neutral navy/teal design, responsive navigation and document-only routes.
- Replaced fresh demonstration data with Employee Handbook, Information Security Policy, Supplier Agreement, Meeting Minutes, Project Requirements Document, Training Materials, Operational Guidelines, Service Agreement, Annual Report, Technical Documentation, Project Plan and Archived Meeting Minutes. These are clearly labelled demonstration metadata, without actual attachments.
- Default departments are Human Resources, Finance, Information Technology, Operations, Administration and Procurement. Document types and extraction patterns are industry-neutral. Region is a free-text metadata field.
- Changed areas: index.html, package files, main.tsx, EnterpriseLayout/EnterprisePages/DocumentCapture, enterprise/repository/configuration/extraction utilities, use-auth, demonstration-data, compatibility migration, legacy backend messages, repository tests and project Markdown documentation.

## Preservation and migration

Existing browser keys, binary database, session expiry and storage object paths are retained. No database reset, cloud data migration, file deletion, provider change or new business module occurred. Existing document IDs, attached versions, business history, classifications and holds remain available.

The normaliser recognises original demonstration labels by known IDs, exact old titles/numbers, timestamps, owner/creator/description and original version metadata. Attached, uploaded, indexed, tagged, linked or edited records fail those checks and retain their original labels. Matched metadata-only demonstration entries receive neutral labels and sample numbers; other metadata, historical dates, flags and business references are preserved. Default configuration is refreshed only when it matches the original defaults; custom fields, collections and taxonomies are preserved. Remaining record types/departments stay configured. Changes persist during the next normal application write; reading alone does not reset storage. For rollback, preserve the existing browser metadata value before first use, restore that value together with the previous application version, and keep the binary database intact. No live cloud seed update was executed.

User-supplied content and custom settings may legitimately retain historical names. Review these with their owners rather than rewriting documents or production records. Externally edited metadata with unchanged modification timestamps can retain its custom historical fields while matched original demonstration labels are neutralised.

## Reviewed compatibility references

- legacy-branding-compatibility.ts retains the former sample-number prefix and original sample/default fingerprints solely for safe recognition. Legacy role IDs remain accepted for saved sessions and data; login choices and displayed role labels are neutral.
- Browser keys: nbcrfli-edrms-v1, nbcrfli-session, nbcrfli-density; IndexedDB: nbcrfli-controlled-files. Renaming would strand existing data/preferences/sessions.
- Supabase migration and file broker retain nbcrfli-documents as their shared private bucket identifier. They are undeployed source, not connected to this frontend. Rename only through a reviewed bucket/object/policy migration with reconciled files and rollback.
- Legacy interchange role/category IDs remain supported by old types/helpers; there are no corresponding operational pages. The collection ID governance is retained for saved links, with a neutral default display name.

The final source and rebuilt dist audit finds old acronyms only in these identifiers and this report. Disposable rebranding helpers were removed. These are internal compatibility references, not product branding. No former logo, favicon, official endorsement or invented vendor identity is introduced.

## Verification and limits

Repository tests cover real file upload/readback, metadata search, download/preview access, versions, permissions, archive/soft removal, rollback/conflict handling, OCR and PDF/DOCX/TXT extraction. Rebranding tests cover rendered login/shell identity, neutral defaults, preservation of edited/attached records, custom configuration and legacy sessions. Completed: all 43 tests pass; Vite production build succeeds; the local app returns HTTP 200 at http://127.0.0.1:5174/ with the EDMS browser title. The Node PDF fixture emits a standard-font-path warning; text extraction assertions pass. The local OCR worker and PDF standard font return HTTP 200; library/search/capture/detail URLs serve successfully. These HTTP checks verify SPA delivery, not interactive navigation or PDF rendering. Vite reports a large lazy PDF worker chunk.

This remains a browser-storage evaluation application with role-selection sessions. Production authentication, durable shared storage and the prepared Supabase RLS/file broker are not deployed or verified. Interactive browser/responsive tests and live database/security validation remain outstanding. An additional dependency audit was previously declined; unresolved advisories are not represented as fixed.

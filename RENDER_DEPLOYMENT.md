# Deploy EDMS on Render

This deploys the existing frontend evaluation application as a **Static Site**. Render builds the React/Vite app and serves `dist`. The repository's Supabase Edge Functions and SQL migration are not deployed by this configuration.

## Blueprint deployment

1. Sign in to [Render](https://dashboard.render.com/) and connect the GitHub account with access to `MelzaSibanda/Mini-EDRMS-Prototype`.
2. Choose **New > Blueprint** and select this repository, using the `master` branch.
3. Render reads the root `render.yaml`. Review the static-site configuration and create the Blueprint.
4. Wait for the build and open the Render-provided HTTPS URL. No application secrets or database credentials are required for this frontend deployment.

## Manual Static Site deployment

If you prefer the dashboard, choose **New > Static Site**, connect the same repository, and use:

| Setting | Value |
| --- | --- |
| Branch | `master` |
| Root Directory | Leave blank |
| Build Command | `npm ci --include=dev --no-audit && npm run build` |
| Publish Directory | `dist` |
| Node version | Repository `.node-version` selects Node 22 |
| Redirects/Rewrites | Source `/*`, destination `/index.html`, action **Rewrite** |

Do not choose a Node Web Service or use `npm run dev` as a production start command. A Static Site needs no start command or listening port. Remove an existing `NODE_VERSION` dashboard override if it selects an incompatible version; it takes precedence over `.node-version`. PDF.js requires Node 22.13 or later, and package engines constrain this project to the Node 22 line.

The `prebuild` script copies OCR workers, English language data, PDF fonts, character maps and WASM from installed packages into `public`; Vite includes these in `dist`. Keep development dependencies enabled during installation because Vite and Tailwind compile the app. Generated assets and `dist` are intentionally not committed.

## Verify the deployed site

- Open the login screen and enter a demonstration role.
- Refresh `/documents`, `/documents/search` and `/documents/create`; these must show the application rather than a Render 404.
- Upload a fictional TXT/DOCX/PDF or supported image, review scanning suggestions, search the saved document and verify preview/download and version history.
- Check that `/ocr/worker.min.js`, `/ocr/lang/eng.traineddata.gz` and `/pdf/standard_fonts/LiberationSans-Regular.ttf` deliver assets, not the HTML fallback. Verify PDF preview and image OCR in the deployed browser.
- Test desktop/tablet navigation and role restrictions with fictional records.

## Storage and production boundary

Documents and metadata remain in the visitor's browser; they are not uploaded to Render or shared between users/devices. Browser storage is scoped to the exact origin. Existing localhost documents will not appear at the Render URL, and changing to a custom domain creates another storage origin. This deployment neither deletes nor migrates existing browser documents.

Role selection is an evaluation session, not organisational authentication. Use fictional documents for the hosted demonstration. Real organisational use still requires verified authentication, a connected durable backend, server-enforced permissions, malware protection, backups and live security testing. Do not add service-role keys to this static site's environment or frontend bundle. Existing undeployed Supabase sources remain separate integration work.

The build command disables npm's automatic audit report; it does not resolve previously reported dependency advisories. An additional dependency audit was previously declined.

Sources: [Render Static Sites](https://render.com/docs/static-sites), [Blueprint specification](https://render.com/docs/blueprint-spec), [SPA rewrites](https://render.com/docs/redirects-rewrites), [Node version selection](https://render.com/docs/node-version).

## Preparation checks completed

The production build succeeds on Node 22.16.0. The Blueprint YAML parses and its static publish path and SPA rewrite were checked. Local production-preview HTTP checks returned 200 for the root, search, capture and document detail URLs, plus the OCR worker, English language data and PDF standard font, with asset content rather than the HTML fallback. Render deployment and interactive hosted-browser checks still need to run in the account. The existing 43 application tests passed before this configuration-only change.

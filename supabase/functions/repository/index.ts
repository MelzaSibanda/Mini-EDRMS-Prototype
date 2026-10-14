// Deployment source only. Not connected to the local evaluation UI.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateDocumentFile } from '../../../src/app/lib/file-validation.ts';
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const allowed = Deno.env.get('REPOSITORY_ALLOWED_ORIGIN');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  };
  if (origin && origin !== allowed) return new Response(JSON.stringify({
    error: 'Origin is not authorised.'
  }), {
    status: 403,
    headers
  });
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  if (req.method === 'OPTIONS') return new Response(null, {
    status: 204,
    headers: {
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type'
    }
  });
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers
  });
  const url = Deno.env.get('SUPABASE_URL'),
    anon = Deno.env.get('SUPABASE_ANON_KEY'),
    serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !serviceKey) return reply({
    error: 'The repository service is not configured.'
  }, 503);
  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return reply({
    error: 'Sign-in is required.'
  }, 401);
  const client = createClient(url, anon, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false
    }
  });
  const {
    data: auth,
    error: authError
  } = await client.auth.getUser(token);
  if (authError || !auth.user) return reply({
    error: 'The session is not valid.'
  }, 401);
  const {
    data: profile
  } = await client.from('repository_profiles').select('user_id,display_name,department,role,permissions').eq('user_id', auth.user.id).single();
  if (!profile) return reply({
    error: 'Repository access has not been assigned.'
  }, 403);
  const can = (permission: string) => profile.permissions.includes(permission);
  // This server-only client is used for binary storage and guarded compensation.
  // Business-document reads always use the actor's authenticated, RLS-scoped client.
  const storage = createClient(url, serviceKey, {
    auth: {
      persistSession: false
    }
  });
  const path = new URL(req.url).pathname.replace(/^.*\/repository/, '');
  try {
    if (req.method === 'GET' && path === '/documents') {
      if (!can('view')) return reply({
        error: 'Document access is not authorised.'
      }, 403);
      const {
        data,
        error
      } = await client.from('repository_documents').select('*,repository_versions(*)').in('storage_status', ['Available', 'Archived']).order('upload_date', {
        ascending: false
      }).limit(100);
      return error ? reply({
        error: 'Documents could not be retrieved.'
      }, 500) : reply(data);
    }
    const fileRoute = path.match(/^\/documents\/([0-9a-f-]{36})\/versions\/([0-9a-f-]{36})\/file$/i);
    if (req.method === 'GET' && fileRoute) {
      const mode = new URL(req.url).searchParams.get('mode') === 'preview' ? 'preview' : 'download';
      if (!can(mode === 'preview' ? 'view' : 'download')) return reply({
        error: 'File access is not authorised.'
      }, 403);
      const {
        data: document
      } = await client.from('repository_documents').select('id,storage_status').eq('id', fileRoute[1]).in('storage_status', ['Available', 'Archived']).single();
      if (!document) return reply({
        error: 'Document is unavailable.'
      }, 404);
      const {
        data: version
      } = await client.from('repository_versions').select('*').eq('document_id', document.id).eq('id', fileRoute[2]).single();
      if (!version) return reply({
        error: 'Version is unavailable.'
      }, 404);
      const {
        data: blob,
        error
      } = await storage.storage.from('nbcrfli-documents').download(version.object_path);
      if (error || !blob) return reply({
        error: 'The document file could not be retrieved.'
      }, 500);
      const {
        error: auditError
      } = await storage.rpc('repository_log_delivery', {
        actor: auth.user.id,
        doc: document.id,
        event_name: mode === 'preview' ? 'File retrieved for preview' : 'File retrieved for download',
        version_id: version.id
      });
      if (auditError) return reply({
        error: 'File retrieval could not be recorded.'
      }, 503);
      const safeName = encodeURIComponent(version.file_name);
      return new Response(blob, {
        headers: {
          ...headers,
          'Content-Type': version.file_type,
          'Content-Disposition': `${mode === 'preview' ? 'inline' : 'attachment'}; filename*=UTF-8''${safeName}`,
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }
    if (req.method === 'POST' && path === '/upload') {
      if (!can('upload') || !can('edit')) return reply({
        error: 'Upload is not authorised.'
      }, 403);
      const declared = Number(req.headers.get('Content-Length') || 0);
      if (declared > 22 * 1024 * 1024) return reply({
        error: 'The upload exceeds the size limit.'
      }, 413);
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return reply({
        error: 'A document file is required.'
      }, 400);
      let info;
      try {
        info = await validateDocumentFile(file);
      } catch (error) {
        return reply({
          error: (error as Error).message
        }, 400);
      }
      const raw = String(form.get('metadata') || '{}');
      if (raw.length > 65536) return reply({
        error: 'Document metadata is too large.'
      }, 400);
      let metadata: Record<string, unknown>;
      try {
        metadata = JSON.parse(raw);
      } catch {
        return reply({
          error: 'Document metadata is invalid.'
        }, 400);
      }
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return reply({
        error: 'Document metadata is invalid.'
      }, 400);
      const description = String(form.get('description') || 'Initial document upload').trim();
      if (!description) return reply({
        error: 'Describe the version change.'
      }, 400);
      const existing = String(form.get('documentId') || '');
      const now = new Date().toISOString();
      let documentId = existing || crypto.randomUUID();
      let created = false;
      let replacementMetadata: Record<string, unknown> | undefined;
      let version = '1.0';
      const versionId = crypto.randomUUID();
      const objectPath = `${documentId}/${versionId}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      if (existing) {
        const {
          data: document
        } = await client.from('repository_documents').select('id,storage_status,department,metadata,repository_versions(version,uploaded_at)').eq('id', existing).single();
        if (!document || document.storage_status !== 'Available') return reply({
          error: 'This document does not accept a new version.'
        }, 403);
        if (!['records_manager', 'records_officer'].includes(profile.role) && document.department !== profile.department) return reply({
          error: 'The document is outside your department.'
        }, 403);
        replacementMetadata = {
          ...document.metadata,
          extractedText: typeof metadata.extractedText === 'string' ? metadata.extractedText.slice(0, 200000) : '',
          extraction: metadata.extraction || null
        };
        const prior = [...document.repository_versions].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0]?.version || '1.0';
        const [major, minor] = prior.split('.').map(Number);
        version = form.get('major') === 'true' ? `${major + 1}.0` : `${major}.${minor + 1}`;
      } else {
        const {
          data: settings
        } = await client.from('repository_settings').select('config').eq('id', true).single();
        const config = settings?.config;
        if (!config?.departments?.includes(metadata.department) || !config?.documentTypes?.includes(metadata.type)) return reply({
          error: 'The repository taxonomy is not configured for this document.'
        }, 400);
        if (!['records_manager', 'records_officer'].includes(profile.role) && metadata.department !== profile.department) return reply({
          error: 'Uploads are limited to your department.'
        }, 403);
        const required = ['title', 'type', 'department', 'owner', 'classification', ...(config.requiredFields?.[String(metadata.type)] || [])];
        if (required.some(key => !metadata[key] || typeof metadata[key] === 'string' && !String(metadata[key]).trim() || Array.isArray(metadata[key]) && !metadata[key].length)) return reply({
          error: 'Required document metadata is missing.'
        }, 400);
        const {
          error
        } = await client.from('repository_documents').insert({
          id: documentId,
          title: String(metadata.title).slice(0, 180),
          document_type: metadata.type,
          department: metadata.department,
          owner: metadata.owner,
          classification: metadata.classification,
          metadata,
          uploaded_by: auth.user.id,
          storage_status: 'Uploading'
        });
        if (error) return reply({
          error: 'The document metadata could not be staged.'
        }, 403);
        created = true;
      }
      try {
        const {
          error: uploadError
        } = await storage.storage.from('nbcrfli-documents').upload(objectPath, file, {
          contentType: info.mime,
          upsert: false
        });
        if (uploadError) throw new Error('binary upload failed');
        const {
          error: versionError
        } = await client.from('repository_versions').insert({
          id: versionId,
          document_id: documentId,
          version,
          object_path: objectPath,
          file_name: file.name,
          file_type: info.mime,
          file_size: info.size,
          uploaded_by: auth.user.id,
          change_description: description
        });
        if (versionError) throw new Error('version registration failed');
        const {
          error: updateError
        } = await client.from('repository_documents').update({
          storage_status: 'Available',
          modified_date: now,
          ...(replacementMetadata ? {
            metadata: replacementMetadata
          } : {})
        }).eq('id', documentId);
        if (updateError) throw new Error('document finalisation failed');
        return reply({
          documentId,
          versionId,
          version
        }, 201);
      } catch {
        const {
          error: removeError
        } = await storage.storage.from('nbcrfli-documents').remove([objectPath]);
        const {
          error: manifestError
        } = await storage.from('repository_versions').delete().eq('id', versionId).eq('document_id', documentId);
        if (created) await storage.from('repository_documents').update({
          storage_status: 'Deleted'
        }).eq('id', documentId).eq('uploaded_by', auth.user.id);
        return reply({
          error: removeError || manifestError ? 'Upload failed; administrator recovery is required.' : 'Upload failed and the staged file was cleaned up.'
        }, 500);
      }
    }
    const documentRoute = path.match(/^\/documents\/([0-9a-f-]{36})$/i);
    if (documentRoute && req.method === 'PATCH') {
      if (!can('edit')) return reply({
        error: 'Metadata editing is not authorised.'
      }, 403);
      const body = await req.json();
      const {
        data: document
      } = await client.from('repository_documents').select('*').eq('id', documentRoute[1]).single();
      if (!document || document.storage_status !== 'Available') return reply({
        error: 'This document cannot be edited.'
      }, 403);
      const allowed = ['title', 'document_type', 'department', 'owner', 'classification', 'metadata'];
      const fields = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
      const next = {
        ...document,
        ...fields
      };
      const {
        data: settings
      } = await client.from('repository_settings').select('config').eq('id', true).single();
      const config = settings?.config;
      if (!config?.documentTypes?.includes(next.document_type) || !config?.departments?.includes(next.department) || !String(next.owner || '').trim()) return reply({
        error: 'Document taxonomy or ownership is invalid.'
      }, 400);
      const extra = config.requiredFields?.[String(next.document_type)] || [];
      if (extra.some((key: string) => {
        const value = next.metadata?.[key];
        return !value || typeof value === 'string' && !value.trim() || Array.isArray(value) && !value.length;
      })) return reply({
        error: 'Required document metadata is missing.'
      }, 400);
      const {
        data,
        error
      } = await client.from('repository_documents').update(fields).eq('id', document.id).select().single();
      return error ? reply({
        error: 'Metadata changes were rejected.'
      }, 400) : reply(data);
    }
    return reply({
      error: 'Repository route not found.'
    }, 404);
  } catch {
    return reply({
      error: 'The repository request could not be completed.'
    }, 500);
  }
});

-- Review and test in an isolated Supabase project before applying.
-- Existing KV data and storage remain untouched. No organisational users are seeded.
begin;
create schema if not exists repository_private;
revoke all on schema repository_private from public, anon, authenticated;
create table public.repository_profiles (
 user_id uuid primary key references auth.users(id), display_name text not null,
 department text not null, role text not null, permissions text[] not null default '{}'
);
create table public.repository_settings (
 id boolean primary key default true check(id), config jsonb not null
);
insert into public.repository_settings(id,config) values (true,'{"archiveEnabled":false,"archiveReference":"","deleteEnabled":false,"deleteReference":"","requiredFields":{}}');
create table public.repository_classifications (
 name text primary key, access_level text not null check(access_level in ('public','internal','department','restricted'))
);
insert into public.repository_classifications values ('Public','public'),('Internal','internal'),('Confidential','department'),('Restricted','restricted');
create table public.repository_documents (
 id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title))>0),
 document_type text not null, department text not null, owner text not null,
 classification text not null references public.repository_classifications(name),
 metadata jsonb not null default '{}', uploaded_by uuid not null references auth.users(id),
 upload_date timestamptz not null default now(), modified_date timestamptz not null default now(),
 storage_status text not null default 'Uploading' check(storage_status in ('Uploading','Available','Archived','Deleted')),
 legal_hold boolean not null default false
);
create table public.repository_versions (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references public.repository_documents(id),
 version text not null check(version ~ '^[0-9]+\.[0-9]+$'), object_path text unique not null,
 file_name text not null, file_type text not null, file_size bigint not null check(file_size>0 and file_size<=20971520),
 uploaded_by uuid not null references auth.users(id), uploaded_at timestamptz not null default now(),
 change_description text not null check(length(trim(change_description))>0), unique(document_id,version)
);
create table public.repository_activity (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id),
 document_id uuid not null references public.repository_documents(id), action text not null,
 occurred_at timestamptz not null default now(), details jsonb not null default '{}'
);
create function repository_private.has_permission(wanted text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.repository_profiles p where p.user_id=auth.uid() and wanted=any(p.permissions));
$$;
create function repository_private.allowed_metadata(dept text, class text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select 'view'=any(p.permissions) and (c.access_level in ('public','internal') or c.access_level='department' and (p.department=dept or p.role in ('records_manager','records_officer','auditor')) or c.access_level='restricted' and p.department=dept and p.role<>'auditor') from public.repository_profiles p cross join public.repository_classifications c where p.user_id=auth.uid() and c.name=class),false);
$$;
create function repository_private.can_read(doc uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.repository_documents d where d.id=doc and repository_private.allowed_metadata(d.department,d.classification));
$$;
create function repository_private.can_edit(doc uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.repository_documents d join public.repository_profiles p on p.user_id=auth.uid() where d.id=doc and repository_private.can_read(doc) and 'edit'=any(p.permissions) and (p.department=d.department or p.role in ('records_manager','records_officer')));
$$;
revoke all on all functions in schema repository_private from public,anon;
grant usage on schema repository_private to authenticated;
grant execute on all functions in schema repository_private to authenticated;
alter table public.repository_profiles enable row level security;
alter table public.repository_settings enable row level security;
alter table public.repository_classifications enable row level security;
alter table public.repository_documents enable row level security;
alter table public.repository_versions enable row level security;
alter table public.repository_activity enable row level security;
create policy repository_profiles_read on public.repository_profiles for select to authenticated using(user_id=auth.uid() or repository_private.has_permission('manage_users'));
create policy repository_settings_read on public.repository_settings for select to authenticated using(true);
create policy repository_classifications_read on public.repository_classifications for select to authenticated using(true);
create policy repository_documents_read on public.repository_documents for select to authenticated using(repository_private.can_read(id) and (storage_status<>'Uploading' or uploaded_by=auth.uid()));
create policy repository_documents_insert on public.repository_documents for insert to authenticated with check(uploaded_by=auth.uid() and storage_status='Uploading' and not legal_hold and repository_private.has_permission('upload') and repository_private.allowed_metadata(department,classification) and exists(select 1 from public.repository_profiles p where p.user_id=auth.uid() and (p.department=repository_documents.department or p.role in ('records_manager','records_officer'))));
create policy repository_documents_update on public.repository_documents for update to authenticated using(repository_private.can_edit(id)) with check(repository_private.can_edit(id) and repository_private.allowed_metadata(department,classification));
create policy repository_versions_read on public.repository_versions for select to authenticated using(repository_private.can_read(document_id));
create policy repository_versions_insert on public.repository_versions for insert to authenticated with check(uploaded_by=auth.uid() and repository_private.can_edit(document_id) and repository_private.has_permission('upload'));
create policy repository_activity_read on public.repository_activity for select to authenticated using(repository_private.has_permission('view_audit_logs') and repository_private.can_read(document_id));
-- No authenticated INSERT/UPDATE/DELETE grant on profiles, settings, classifications or audit.
-- A trusted administrative service must provision profiles and validated configuration.
revoke insert,update,delete,truncate,references,trigger on public.repository_profiles,public.repository_settings,public.repository_classifications,public.repository_activity from authenticated;
grant select on public.repository_profiles,public.repository_settings,public.repository_classifications,public.repository_activity to authenticated;
grant select,insert,update on public.repository_documents to authenticated;
grant select,insert on public.repository_versions to authenticated;
revoke all on public.repository_profiles,public.repository_settings,public.repository_classifications,public.repository_documents,public.repository_versions,public.repository_activity from anon;
create function repository_private.guard_document() returns trigger language plpgsql security definer set search_path='' as $$
declare cfg jsonb;
begin
 if auth.uid() is null then return new; end if;
 if not exists(select 1 from public.repository_profiles p where p.user_id=auth.uid() and (p.department=new.department or p.role in ('records_manager','records_officer'))) then raise exception 'Department access is not authorised'; end if;
 if tg_op='INSERT' then new.uploaded_by:=auth.uid(); new.upload_date:=now(); new.modified_date:=now(); return new; end if;
 if new.classification<>old.classification and not repository_private.has_permission('manage_document_access') then raise exception 'Classification changes require access-management permission'; end if;
 if new.uploaded_by<>old.uploaded_by or new.upload_date<>old.upload_date or new.id<>old.id or new.legal_hold<>old.legal_hold then raise exception 'Immutable document fields cannot be changed'; end if;
 if old.storage_status in ('Archived','Deleted') and row(new.title,new.document_type,new.department,new.owner,new.classification,new.metadata) is distinct from row(old.title,old.document_type,old.department,old.owner,old.classification,old.metadata) then raise exception 'Restore before editing'; end if;
 select config into cfg from public.repository_settings where id=true;
 if new.storage_status<>old.storage_status then
  if new.storage_status='Available' and not exists(select 1 from public.repository_versions v join storage.objects o on o.bucket_id='nbcrfli-documents' and o.name=v.object_path where v.document_id=new.id) then raise exception 'Stored version is required'; end if;
  if new.storage_status='Archived' or old.storage_status='Archived' then
   if old.legal_hold or not repository_private.has_permission('archive') or not coalesce((cfg->>'archiveEnabled')::boolean,false) or coalesce(cfg->>'archiveReference','')='' then raise exception 'Archival is not authorised'; end if;
  end if;
  if new.storage_status='Deleted' then
   if old.legal_hold or not repository_private.has_permission('delete') or not coalesce((cfg->>'deleteEnabled')::boolean,false) or coalesce(cfg->>'deleteReference','')='' then raise exception 'Removal is not authorised'; end if;
  end if;
  if old.storage_status='Deleted' then raise exception 'Removed documents require trusted recovery'; end if;
 end if;
 new.modified_date:=now(); return new;
end; $$;
create trigger repository_document_guard before insert or update on public.repository_documents for each row execute function repository_private.guard_document();
create function repository_private.guard_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.repository_documents d where d.id=new.document_id and d.storage_status in ('Uploading','Available')) then raise exception 'Document does not accept versions'; end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='nbcrfli-documents' and o.name=new.object_path and new.object_path like new.document_id::text||'/%') then raise exception 'Version file is not present'; end if;
 new.uploaded_by:=coalesce(auth.uid(),new.uploaded_by);new.uploaded_at:=now();return new;
end; $$;
create trigger repository_version_guard before insert on public.repository_versions for each row execute function repository_private.guard_version();
create function repository_private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null then
  if tg_table_name='repository_versions' then insert into public.repository_activity(actor_id,document_id,action,details) values(auth.uid(),new.document_id,'New version uploaded',jsonb_build_object('version',new.version));
  else insert into public.repository_activity(actor_id,document_id,action,details) values(auth.uid(),new.id,case when tg_op='INSERT' then 'Upload staged' when new.storage_status<>old.storage_status then 'Storage status changed' when new.classification<>old.classification then 'Access classification changed' else 'Metadata updated' end,jsonb_build_object('storage_status',new.storage_status)); end if;
 end if;return new;
end; $$;
create trigger repository_document_activity after insert or update on public.repository_documents for each row execute function repository_private.audit_change();
create trigger repository_version_activity after insert on public.repository_versions for each row execute function repository_private.audit_change();
create function public.repository_log_delivery(actor uuid,doc uuid,event_name text,version_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if event_name not in ('File retrieved for preview','File retrieved for download') then raise exception 'Invalid access event'; end if;
 insert into public.repository_activity(actor_id,document_id,action,details) values(actor,doc,event_name,jsonb_build_object('version_id',version_id));
end; $$;
revoke all on function public.repository_log_delivery(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.repository_log_delivery(uuid,uuid,text,uuid) to service_role;
revoke all on function repository_private.guard_document(),repository_private.guard_version(),repository_private.audit_change() from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('nbcrfli-documents','nbcrfli-documents',false,20971520,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','image/png','image/jpeg','image/webp','image/bmp','image/gif']);
-- Deliberately no storage.objects policies for this bucket. Ordinary clients cannot
-- list, upload, overwrite or retrieve objects directly. The authenticated Edge
-- function validates bytes and document RLS before its server-only storage access.
create policy repository_binary_broker_only on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'nbcrfli-documents') with check(bucket_id<>'nbcrfli-documents');
commit;
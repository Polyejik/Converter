begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pulse-deliverables','pulse-deliverables',false,26214400,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
('pulse-contracts','pulse-contracts',false,26214400,array['application/pdf'])
on conflict(id) do nothing;
-- Object path: tenant UUID / project UUID / unique filename. All buckets remain private.
create policy pulse_file_read on storage.objects for select to authenticated using(
 bucket_id in ('pulse-deliverables','pulse-contracts') and exists(
 select 1 from public.pulse_projects p where p.tenant_id::text=(storage.foldername(name))[1] and p.id::text=(storage.foldername(name))[2]
 and pulse_private.project_access(p.tenant_id,p.id) and (bucket_id='pulse-deliverables' or pulse_private.role_for(p.tenant_id)<>'specialist')));
create policy pulse_file_insert on storage.objects for insert to authenticated with check(
 bucket_id in ('pulse-deliverables','pulse-contracts') and exists(
 select 1 from public.pulse_projects p where p.tenant_id::text=(storage.foldername(name))[1] and p.id::text=(storage.foldername(name))[2]
 and not p.archived and (pulse_private.manage_project(p.tenant_id,p.id) or bucket_id='pulse-contracts' and pulse_private.role_for(p.tenant_id)='contracts')));
commit;

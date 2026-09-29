begin;
create schema if not exists pulse_private;
revoke all on schema pulse_private from public;
grant usage on schema pulse_private to authenticated;
create table public.pulse_tenants(id uuid primary key default gen_random_uuid(), name text not null);
create table public.pulse_memberships(
 tenant_id uuid references public.pulse_tenants on delete cascade,
 user_id uuid references auth.users on delete cascade,
 role text not null check(role in ('ceo','division','coordinator','contracts','accountant','specialist')),
 division text, active boolean not null default true,
 primary key(tenant_id,user_id), check(role<>'division' or division is not null));
create table public.pulse_profiles(
 tenant_id uuid not null, user_id uuid not null, name text not null,
 discipline text, joined_on date,
 primary key(tenant_id,user_id), foreign key(tenant_id,user_id) references public.pulse_memberships);
create table public.pulse_hr(
 tenant_id uuid not null, user_id uuid not null, birthday date, private_note text,
 hourly_rate numeric(12,2) not null default 0 check(hourly_rate>=0),
 primary key(tenant_id,user_id), foreign key(tenant_id,user_id) references public.pulse_memberships);
create table public.pulse_projects(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.pulse_tenants,
 code text not null, name text not null, client text not null, division text not null,
 coordinator_id uuid, archived boolean not null default false,
 archive_outcome text check(archive_outcome in ('completed','lost','paused')),
 archive_reason text, schedule jsonb not null default '{}', version integer not null default 1,
 updated_at timestamptz not null default now(),
 unique(tenant_id,code), unique(tenant_id,id),
 foreign key(tenant_id,coordinator_id) references public.pulse_memberships,
 check(not archived or (archive_outcome is not null and length(trim(archive_reason))>=3)));
create table public.pulse_project_members(
 tenant_id uuid not null, project_id uuid not null, user_id uuid not null,
 primary key(tenant_id,project_id,user_id),
 foreign key(tenant_id,project_id) references public.pulse_projects(tenant_id,id),
 foreign key(tenant_id,user_id) references public.pulse_memberships);
create table public.pulse_invoices(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, project_id uuid not null,
 invoice_no text not null, amount numeric(16,2) not null check(amount>0), currency text not null default 'USD',
 invoice_date date not null, due_date date not null, version integer not null default 1,
 updated_at timestamptz not null default now(), unique(tenant_id,id), unique(tenant_id,invoice_no),
 foreign key(tenant_id,project_id) references public.pulse_projects(tenant_id,id));
create table public.pulse_receipts(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, invoice_id uuid not null,
 amount numeric(16,2) not null check(amount>0), kind text not null check(kind in ('receipt','refund')),
 paid_on date not null, note text, version integer not null default 1, updated_at timestamptz not null default now(),
 foreign key(tenant_id,invoice_id) references public.pulse_invoices(tenant_id,id));
create table public.pulse_time_entries(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, user_id uuid not null,
 project_id uuid, week date not null check(extract(isodow from week)=1),
 activity text not null check(activity in ('administration','coordination','technical','report_processing','client_meetings','economic','pto','vacation')),
 days numeric[] not null check(cardinality(days)=7 and array_ndims(days)=1 and 0<=all(days) and 24>=all(days)),
 note text not null check(length(trim(note))>0), status text not null default 'draft' check(status in ('draft','submitted','approved','returned')),
 rate_snapshot numeric(12,2), review_reason text, reviewed_by uuid, version integer not null default 1,
 updated_at timestamptz not null default now(),
 foreign key(tenant_id,user_id) references public.pulse_memberships,
 foreign key(tenant_id,project_id) references public.pulse_projects(tenant_id,id),
 check(activity not in ('pto','vacation') or project_id is null));
create table public.pulse_audit(
 id bigint generated always as identity primary key, tenant_id uuid not null,
 actor_id uuid, entity text not null, entity_id text not null, operation text not null,
 occurred_at timestamptz not null default now(), version integer);
create index on public.pulse_projects(tenant_id,division,archived);
create index on public.pulse_project_members(tenant_id,user_id);
create index on public.pulse_time_entries(tenant_id,user_id,week);
create index on public.pulse_invoices(tenant_id,project_id);

create function pulse_private.role_for(t uuid) returns text language sql stable security definer set search_path='' as $$
 select role from public.pulse_memberships where tenant_id=t and user_id=(select auth.uid()) and active
$$;
create function pulse_private.project_access(t uuid,p uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pulse_projects x join public.pulse_memberships m on m.tenant_id=x.tenant_id
 where x.tenant_id=t and x.id=p and m.user_id=(select auth.uid()) and m.active and
 (m.role in ('ceo','contracts','accountant') or m.role='division' and m.division=x.division
 or m.role='coordinator' and x.coordinator_id=m.user_id
 or m.role='specialist' and exists(select 1 from public.pulse_project_members a where a.tenant_id=t and a.project_id=p and a.user_id=m.user_id)))
$$;
create function pulse_private.manage_project(t uuid,p uuid) returns boolean language sql stable security definer set search_path='' as $$
 select pulse_private.role_for(t) in ('ceo','division','coordinator') and pulse_private.project_access(t,p)
$$;
create function pulse_private.bump_version() returns trigger language plpgsql set search_path='' as $$
begin
 if new.tenant_id<>old.tenant_id or new.id<>old.id then raise exception 'immutable_identity'; end if;
 if new.version<>old.version then raise exception 'invalid_version'; end if;
 new.version:=old.version+1; new.updated_at:=now(); return new;
end $$;
create function pulse_private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.pulse_audit(tenant_id,actor_id,entity,entity_id,operation,version)
 values(new.tenant_id,auth.uid(),tg_table_name,new.id::text,tg_op,new.version); return new;
end $$;
-- Membership/HR role changes are provisioned by the administrator, never by user metadata.
do $$ declare t text; begin
 foreach t in array array['pulse_tenants','pulse_memberships','pulse_profiles','pulse_hr','pulse_projects','pulse_project_members','pulse_invoices','pulse_receipts','pulse_time_entries','pulse_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
 foreach t in array array['pulse_projects','pulse_invoices','pulse_receipts','pulse_time_entries'] loop
 execute format('create trigger version_guard before update on public.%I for each row execute function pulse_private.bump_version()',t);
 execute format('create trigger audit_write after insert or update on public.%I for each row execute function pulse_private.audit_change()',t);
 end loop;
end $$;
grant select on public.pulse_tenants,public.pulse_memberships,public.pulse_profiles,public.pulse_hr,public.pulse_projects,public.pulse_project_members,public.pulse_invoices,public.pulse_receipts,public.pulse_time_entries,public.pulse_audit to authenticated;
grant insert,update on public.pulse_projects,public.pulse_project_members,public.pulse_invoices,public.pulse_receipts to authenticated;
grant update on public.pulse_hr to authenticated;
create policy tenant_read on public.pulse_tenants for select to authenticated using(pulse_private.role_for(id) is not null);
create policy membership_read on public.pulse_memberships for select to authenticated using(user_id=auth.uid() or pulse_private.role_for(tenant_id)='ceo');
create policy profile_read on public.pulse_profiles for select to authenticated using(pulse_private.role_for(tenant_id) is not null);
create policy hr_read on public.pulse_hr for select to authenticated using(pulse_private.role_for(tenant_id)='ceo');
create policy hr_update on public.pulse_hr for update to authenticated using(pulse_private.role_for(tenant_id)='ceo') with check(pulse_private.role_for(tenant_id)='ceo');
create policy project_read on public.pulse_projects for select to authenticated using(pulse_private.project_access(tenant_id,id));
create policy project_insert on public.pulse_projects for insert to authenticated with check(pulse_private.role_for(tenant_id)='ceo' or pulse_private.role_for(tenant_id)='coordinator' and coordinator_id=auth.uid() or pulse_private.role_for(tenant_id)='division' and division=(select m.division from public.pulse_memberships m where m.tenant_id=pulse_projects.tenant_id and m.user_id=auth.uid()));
create policy project_update on public.pulse_projects for update to authenticated using(pulse_private.manage_project(tenant_id,id)) with check(pulse_private.manage_project(tenant_id,id));
create policy assignment_read on public.pulse_project_members for select to authenticated using(pulse_private.project_access(tenant_id,project_id));
create policy assignment_write on public.pulse_project_members for all to authenticated using(pulse_private.manage_project(tenant_id,project_id)) with check(pulse_private.manage_project(tenant_id,project_id));
create policy invoice_read on public.pulse_invoices for select to authenticated using(pulse_private.role_for(tenant_id)<>'specialist' and pulse_private.project_access(tenant_id,project_id));
create policy invoice_write on public.pulse_invoices for all to authenticated using(pulse_private.role_for(tenant_id) in ('ceo','contracts')) with check(pulse_private.role_for(tenant_id) in ('ceo','contracts'));
create policy receipt_read on public.pulse_receipts for select to authenticated using(exists(select 1 from public.pulse_invoices i where i.tenant_id=pulse_receipts.tenant_id and i.id=invoice_id));
create policy receipt_write on public.pulse_receipts for all to authenticated using(pulse_private.role_for(tenant_id) in ('ceo','accountant')) with check(pulse_private.role_for(tenant_id) in ('ceo','accountant'));
create policy time_read on public.pulse_time_entries for select to authenticated using(pulse_private.role_for(tenant_id) is not null and (user_id=auth.uid() or pulse_private.role_for(tenant_id) in ('ceo','accountant') or status<>'draft' and pulse_private.manage_project(tenant_id,project_id)));
create policy audit_read on public.pulse_audit for select to authenticated using(pulse_private.role_for(tenant_id)='ceo');
revoke all on all functions in schema pulse_private from public,anon;
grant execute on function pulse_private.role_for(uuid),pulse_private.project_access(uuid,uuid),pulse_private.manage_project(uuid,uuid) to authenticated;
commit;

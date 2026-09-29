begin;
-- Clients cannot move projects between tenants/divisions or reassign coordinators by PATCH.
revoke update on public.pulse_projects,public.pulse_hr from authenticated;
grant update(name,client,archived,archive_outcome,archive_reason,schedule) on public.pulse_projects to authenticated;
grant update(birthday,private_note,hourly_rate) on public.pulse_hr to authenticated;
-- Personnel cost snapshots are not exposed through the normal timesheet endpoint.
revoke select on public.pulse_time_entries from authenticated;
grant select(id,tenant_id,user_id,project_id,week,activity,days,note,status,review_reason,reviewed_by,version,updated_at) on public.pulse_time_entries to authenticated;

create function public.pulse_save_time(t uuid, entry_id uuid, expected_version integer,
 p uuid, w date, a text, d numeric[], n text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old public.pulse_time_entries; saved public.pulse_time_entries;
begin
 if pulse_private.role_for(t) is null then raise exception 'access_denied'; end if;
 perform 1 from public.pulse_memberships where tenant_id=t and user_id=auth.uid() for update;
 if p is not null and not pulse_private.project_access(t,p) then raise exception 'access_denied'; end if;
 if p is not null and exists(select 1 from public.pulse_projects where tenant_id=t and id=p and archived) then raise exception 'project_closed'; end if;
 if d is null or cardinality(d)<>7 or array_ndims(d)<>1 or exists(select 1 from unnest(d) h where h is null or h<0 or h>24 or h*4<>trunc(h*4)) then raise exception 'invalid_hours'; end if;
 if expected_version is null then
 insert into public.pulse_time_entries(id,tenant_id,user_id,project_id,week,activity,days,note)
 values(coalesce(entry_id,gen_random_uuid()),t,auth.uid(),p,w,a,d,n) returning * into saved;
 else
 select * into old from public.pulse_time_entries where tenant_id=t and id=entry_id and user_id=auth.uid() for update;
 if old.id is null then raise exception 'entry_not_found'; end if;
 if old.version<>expected_version then raise exception 'version_conflict'; end if;
 if old.status not in ('draft','returned') then raise exception 'entry_locked'; end if;
 update public.pulse_time_entries set project_id=p,week=w,activity=a,days=d,note=n where id=entry_id returning * into saved;
 end if;
 if exists(select 1 from public.pulse_time_entries e cross join lateral unnest(e.days) with ordinality x(h,day)
 where e.tenant_id=t and e.user_id=auth.uid() and e.week=w group by x.day having sum(x.h)>24) then raise exception 'daily_limit'; end if;
 return to_jsonb(saved)-'rate_snapshot';
end $$;

create function public.pulse_transition_time(t uuid, entry_id uuid, expected_version integer, next_status text, reason text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.pulse_time_entries; saved public.pulse_time_entries; r text;
begin
 r:=pulse_private.role_for(t); if r is null then raise exception 'access_denied'; end if;
 select * into e from public.pulse_time_entries where tenant_id=t and id=entry_id for update;
 if e.id is null then raise exception 'entry_not_found'; end if;
 if expected_version is null or e.version<>expected_version then raise exception 'version_conflict'; end if;
 if next_status='submitted' then
 if e.user_id<>auth.uid() or e.status not in ('draft','returned') then raise exception 'invalid_transition'; end if;
 if e.project_id is not null and not pulse_private.project_access(t,e.project_id) then raise exception 'access_denied'; end if;
 if e.project_id is not null and e.status='draft' and exists(select 1 from public.pulse_projects where tenant_id=t and id=e.project_id and archived) then raise exception 'project_closed'; end if;
 update public.pulse_time_entries set status='submitted', review_reason=null, reviewed_by=null,
 rate_snapshot=coalesce((select hourly_rate from public.pulse_hr where tenant_id=t and user_id=e.user_id),0) where id=e.id returning * into saved;
 elsif next_status in ('approved','returned') then
 if e.status<>'submitted' or e.user_id=auth.uid() or not (r='ceo' or pulse_private.manage_project(t,e.project_id)) then raise exception 'access_denied'; end if;
 if next_status='returned' and length(trim(reason))<3 then raise exception 'reason_required'; end if;
 update public.pulse_time_entries set status=next_status,review_reason=reason,reviewed_by=auth.uid() where id=e.id returning * into saved;
 else raise exception 'invalid_transition'; end if;
 return to_jsonb(saved)-'rate_snapshot';
end $$;
revoke all on function public.pulse_save_time(uuid,uuid,integer,uuid,date,text,numeric[],text),public.pulse_transition_time(uuid,uuid,integer,text,text) from public,anon;
grant execute on function public.pulse_save_time(uuid,uuid,integer,uuid,date,text,numeric[],text),public.pulse_transition_time(uuid,uuid,integer,text,text) to authenticated;
commit;

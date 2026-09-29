// Configuration contains only a project URL and publishable key. Never a service_role key.
export class PulseSupabase {
 constructor({url,publishableKey,fetchImpl=fetch}) {
  const u=new URL(url);
  if(u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw new Error('invalid_supabase_url');
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey))throw new Error('publishable_key_required');
  this.url=u.origin;this.key=publishableKey;this.fetch=fetchImpl;this.session=null;
 }
 async request(path,{method='GET',body,auth=true,representation=false}={}) {
  if(auth&&!this.session)throw new Error('sign_in_required');
  const headers={apikey:this.key,'Content-Type':'application/json'};
  if(auth)headers.Authorization=`Bearer ${this.session.access_token}`;
  if(representation)headers.Prefer='return=representation';
  const response=await this.fetch(this.url+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  let data;try{data=await response.json()}catch{data=null}
  if(!response.ok){const error=new Error(data?.message||data?.error_description||`supabase_${response.status}`);error.status=response.status;error.code=data?.code;throw error}
  return data;
 }
 async signIn(email,password){const session=await this.request('/auth/v1/token?grant_type=password',{auth:false,method:'POST',body:{email,password}});if(!session?.access_token)throw new Error('invalid_session');this.session=session;return session.user}
 async refresh(){if(!this.session?.refresh_token)throw new Error('sign_in_required');const session=await this.request('/auth/v1/token?grant_type=refresh_token',{auth:false,method:'POST',body:{refresh_token:this.session.refresh_token}});if(!session?.access_token)throw new Error('invalid_session');this.session=session}
 async signOut(){try{if(this.session)await this.request('/auth/v1/logout',{method:'POST'})}finally{this.session=null}}
 async memberships(){return this.request('/rest/v1/pulse_memberships?select=tenant_id,user_id,role,division,active')}
 async projects(tenantId){return this.request(`/rest/v1/pulse_projects?tenant_id=eq.${encodeURIComponent(tenantId)}&select=*&order=code`)}
 async updateProject(project,changes){
  const allowed=['name','client','archived','archive_outcome','archive_reason','schedule'];
  if(Object.keys(changes).some(k=>!allowed.includes(k)))throw new Error('invalid_project_fields');
  const rows=await this.request(`/rest/v1/pulse_projects?id=eq.${encodeURIComponent(project.id)}&tenant_id=eq.${encodeURIComponent(project.tenant_id)}&version=eq.${project.version}`,{method:'PATCH',body:changes,representation:true});
  if(!Array.isArray(rows)||rows.length!==1)throw new Error('version_conflict_or_access_denied');return rows[0];
 }
 async saveTime(payload){return this.request('/rest/v1/rpc/pulse_save_time',{method:'POST',body:payload})}
 async transitionTime({tenantId,id,version,status,reason=''}){return this.request('/rest/v1/rpc/pulse_transition_time',{method:'POST',body:{t:tenantId,entry_id:id,expected_version:version,next_status:status,reason}})}
}

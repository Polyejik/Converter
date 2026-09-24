import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{createHandler,receiveEmail} from '../src/worker.mjs';
import {projectsFor,quota} from '../src/repository.mjs';
import {database,user,env,request,mail} from './helpers.mjs';
function fixture(id='u1') {
  const db=database(),environment=env(db);let calls=0;
  const handler=createHandler({auth:async()=>user(id),aiFactory:()=>({
    async classify(m,ps){calls++;assert.deepEqual(ps.map(p=>p.id),['p1']);return {projectId:'p1',category:'risk',summary:'Data delayed',reason:'Source',confidence:.9,match:'code',needsReview:true,evidence:[]};},
    async parseTime(t,ps,w,d,mid){calls++;return {rows:[{memberId:mid,projectId:ps[0].id,week:w,days:[2,0,0,0,0,0,0]}],issues:[],requestId:'mock'}},
    async transcribe(){calls++;return 'Two hours on Monday'}
  })});
  return {db,environment,handler,get calls(){return calls}};
}
test('default Worker fails closed without Access configuration or token',async()=>{
  const e=env(database());let r=await worker.fetch(request('/api/session'),e);assert.equal(r.status,503);
  e.ACCESS_TEAM_DOMAIN='https://team.cloudflareaccess.com';e.ACCESS_AUD='test';r=await worker.fetch(request('/api/session'),e);assert.equal(r.status,401);
  const req=request('/api/session');req.headers.set('Cf-Access-Jwt-Assertion','not.a.jwt');assert.equal((await worker.fetch(req,e)).status,401);
});
test('CORS, missing Origin and unsupported methods reject before model use',async()=>{
  const f=fixture();const denied=request('/api/inbox',mail);denied.headers.set('Origin','https://evil.test');assert.equal((await f.handler(denied,f.environment)).status,403);
  const absent=request('/api/inbox',mail);absent.headers.delete('Origin');assert.equal((await f.handler(absent,f.environment)).status,403);
  assert.equal((await f.handler(request('/api/inbox',null,'DELETE'),f.environment)).status,405);assert.equal(f.calls,0);
});
test('session derives identity and project scope from server data',async()=>{
  const f=fixture(),r=await f.handler(request('/api/session'),f.environment),body=await r.json();
  assert.equal(body.user.id,'u1');assert.deepEqual(body.projects.map(p=>p.id),['p1']);assert(!JSON.stringify(body).includes('test-not-a-real-secret'));assert.equal(r.headers.get('Cache-Control'),'no-store');
  assert.deepEqual((await projectsFor(f.db,user('u3'))).map(p=>p.id),['p3']);
});
test('email import is idempotent; duplicate creates one row and one audit event',async()=>{
  const f=fixture();let r=await f.handler(request('/api/inbox',mail),f.environment);assert.equal(r.status,201);const first=await r.json();
  r=await f.handler(request('/api/inbox',mail),f.environment);const again=await r.json();assert.equal(again.mail.id,first.mail.id);assert(again.duplicate);
  assert.equal(f.db.sql.prepare('SELECT count(*) n FROM inbox').get().n,1);assert.equal(f.db.sql.prepare('SELECT count(*) n FROM audit').get().n,1);
});
test('classification remains a proposal; manual confirm and undo are versioned and audited',async()=>{
  const f=fixture();const imported=await (await f.handler(request('/api/inbox',mail),f.environment)).json();const id=imported.mail.id;
  let r=await f.handler(request(`/api/inbox/${id}/classify`,{version:1}),f.environment);assert.equal(r.status,200);let saved=(await r.json()).mail;
  assert.equal(saved.verified,false);assert.equal(saved.projectId,'');assert.equal(saved.suggestion.projectId,'p1');
  assert.equal((await f.handler(request(`/api/inbox/${id}/confirm`,{version:2,projectId:'p2',reviewed:true}),f.environment)).status,422);
  r=await f.handler(request(`/api/inbox/${id}/confirm`,{version:2,projectId:'p1',reviewed:true}),f.environment);saved=(await r.json()).mail;assert(saved.verified);assert.equal(saved.version,3);
  assert.equal((await f.handler(request(`/api/inbox/${id}/unassign`,{version:2}),f.environment)).status,409);
  r=await f.handler(request(`/api/inbox/${id}/unassign`,{version:3}),f.environment);saved=(await r.json()).mail;assert(!saved.verified);assert.equal(saved.projectId,'');
  assert.equal(f.db.sql.prepare('SELECT count(*) n FROM audit').get().n,4);
});
test('mail content does not leak to another user or tenant; only owner/CEO can sort it',async()=>{
  const f=fixture();const {mail:m}=await (await f.handler(request('/api/inbox',mail),f.environment)).json();
  for(const who of ['u2','u3']){const h=createHandler({auth:async()=>user(who)});const result=await h(request('/api/inbox'),f.environment);assert.equal((await result.json()).mails.length,0);assert.equal((await h(request(`/api/inbox/${m.id}/confirm`,{version:1,projectId:'p1',reviewed:true}),f.environment)).status,404);}
});
test('quota is persisted and stops requests at the exact limit',async()=>{
  const f=fixture();await quota(f.db,user(),2);await quota(f.db,user(),2);await assert.rejects(()=>quota(f.db,user(),2),/daily_quota/);
  await quota(f.db,user('u2'),2);await quota(f.db,user('u3'),2);
});
test('invalid JSON, oversized mail and invalid weeks reject without an AI call',async()=>{
  const f=fixture();assert.equal((await f.handler(request('/api/inbox',{...mail,body:'a'.repeat(20001)}),f.environment)).status,400);
  assert.equal((await f.handler(request('/api/timesheets/parse',{text:'two hours',week:'2026-09-22',referenceDate:'2026-09-24'}),f.environment)).status,400);
  assert.equal((await f.handler(request('/api/timesheets/parse',{text:'two hours',week:'2026-09-21',referenceDate:'2026-02-30'}),f.environment)).status,400);
  const bad=request('/api/inbox',{});assert.equal((await f.handler(bad,f.environment)).status,400);assert.equal(f.calls,0);
});
test('timesheet proposal binds person to session and only audits metadata',async()=>{
  const f=fixture();const r=await f.handler(request('/api/timesheets/parse',{text:'Monday two hours confidential work',week:'2026-09-21',referenceDate:'2026-09-24',memberId:'ceo',role:'ceo'}),f.environment);assert.equal(r.status,200);
  const b=await r.json();assert.equal(b.memberId,'u1');assert.equal(b.rows[0].memberId,'u1');assert(!JSON.stringify(f.db.sql.prepare('SELECT * FROM audit').all()).includes('confidential'));
});
test('audio limits and MIME are validated before sending to OpenAI',async()=>{
  const f=fixture();const form=new FormData();form.set('file',new Blob(['test'],{type:'text/html'}),'bad.html');
  let r=await f.handler(new Request('https://api.test/api/audio/transcribe',{method:'POST',headers:{Origin:'https://pulse.test'},body:form}),f.environment);assert.equal(r.status,415);assert.equal(f.calls,0);
  form.set('file',new Blob(['audio-fixture'],{type:'audio/webm'}),'voice.webm');
  r=await f.handler(new Request('https://api.test/api/audio/transcribe',{method:'POST',headers:{Origin:'https://pulse.test'},body:form}),f.environment);assert.equal(r.status,200);assert.equal((await r.json()).text,'Two hours on Monday');
});
test('Email Worker parses MIME, quarantines allowlisted senders and never sends replies',async()=>{
  const f=fixture();const raw='From: Client <client@example.com>\r\nTo: inbox@example.com\r\nSubject: [PP-001] Status\r\nMessage-ID: <mail-2@example.com>\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nReport is ready';
  let rejection='';await receiveEmail({from:'client@example.com',to:'inbox@example.com',rawSize:raw.length,raw:new Blob([raw]).stream(),setReject:r=>rejection=r},f.environment);
  assert.equal(rejection,'');const row=f.db.sql.prepare('SELECT * FROM inbox').get();assert.equal(row.status,'quarantine');assert.equal(row.source,'email-allowlisted-unverified');assert.equal(row.body,'Report is ready');assert.equal(f.calls,0);
});

import PostalMime from 'postal-mime';
import { authenticate } from './auth.mjs';
import { HttpError, fail, text, dateOK, validateWeek, normalizeMail } from './domain.mjs';
import { createOpenAI } from './openai.mjs';
import { all, projectsFor, quota, canRead, publicMail, getMail, insertMail, updateMail, auditStatement } from './repository.mjs';

const MAX_AUDIO = 8 * 1024 * 1024, MAX_JSON = 64000;
const AUDIO_TYPES = new Set(['audio/webm','video/webm','audio/mp4','video/mp4','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/m4a']);
async function bytes(request, max) {
  if (Number(request.headers.get('content-length')) > max) fail(413, 'payload_too_large');
  if (!request.body) fail(400, 'empty_body');
  const reader = request.body.getReader(), chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > max) { await reader.cancel(); fail(413, 'payload_too_large'); } chunks.push(value);
  }
  const joined = new Uint8Array(size); let offset = 0;
  for (const value of chunks) { joined.set(value, offset); offset += value.length; } return joined;
}
async function json(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'json_required');
  const raw = await bytes(request, MAX_JSON);
  try { const value = JSON.parse(new TextDecoder().decode(raw)); if (!value || Array.isArray(value) || typeof value !== 'object') fail(400, 'invalid_json'); return value; }
  catch { fail(400, 'invalid_json'); }
}
function version(data, mail) { if (!Number.isInteger(data.version) || data.version !== mail.version) fail(409, 'stale_mail'); }

// Dependency injection is used by tests only. The exported Worker always verifies Access JWTs.
export function createHandler({ auth = authenticate, aiFactory = createOpenAI } = {}) {
  return async function handle(request, env) {
    const requestId = crypto.randomUUID(), origin = request.headers.get('origin'), url = new URL(request.url);
    const allowed = new Set((env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
    const headers = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'X-Request-ID':requestId, Vary:'Origin' };
    if (origin && allowed.has(origin)) Object.assign(headers, { 'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Credentials':'true', 'Access-Control-Allow-Headers':'Content-Type', 'Access-Control-Allow-Methods':'GET,POST,OPTIONS' });
    const respond = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    try {
      if (origin && !allowed.has(origin)) fail(403, 'origin_denied');
      if (request.method === 'OPTIONS') { if (!origin) fail(403, 'origin_denied'); return new Response(null, { status:204, headers }); }
      if (request.method !== 'GET' && request.method !== 'POST') fail(405, 'method_not_allowed');
      if (request.method === 'POST' && !origin) fail(403, 'origin_required');
      const user = await auth(request, env), projects = await projectsFor(env.DB, user), ai = aiFactory(env);
      if (request.method === 'GET' && url.pathname === '/api/session') return respond({ user:{ id:user.id,name:user.name,role:user.role }, projects, aiConfigured:!!env.OPENAI_API_KEY, storage:'local-ledger-server-inbox' });
      if (request.method === 'GET' && url.pathname === '/api/inbox') {
        // Pagination is by received time plus id; no unbounded mailbox export.
        const before = url.searchParams.get('before') || '9999', cursor = url.searchParams.get('cursor') || 'zzzz';
        const rows = await all(env.DB, `SELECT * FROM inbox WHERE tenant_id=? AND (received_at < ? OR (received_at=? AND id<?))
          AND (?='ceo' OR owner_id=? OR (status='assigned' AND project_id IN (SELECT project_id FROM project_members WHERE tenant_id=? AND user_id=?)))
          ORDER BY received_at DESC,id DESC LIMIT 51`, user.tenant_id,before,before,cursor,user.role,user.id,user.tenant_id,user.id);
        const mails = rows.slice(0,50).filter(m => canRead(m,user,projects)); const last=mails.at(-1);
        return respond({ mails:mails.map(publicMail), next:rows.length>50&&last?{before:last.received_at,cursor:last.id}:null });
      }
      if (request.method === 'POST' && url.pathname === '/api/inbox') {
        const mail = normalizeMail(await json(request)); await quota(env.DB,user,200,'mail:');
        return respond(await insertMail(env.DB,user,mail),201);
      }
      const route = url.pathname.match(/^\/api\/inbox\/([a-f0-9-]+)\/(classify|confirm|unassign)$/);
      if (request.method === 'POST' && route) {
        const data=await json(request), mail=await getMail(env.DB,route[1],user,projects); version(data,mail);
        if (user.role !== 'ceo' && mail.owner_id !== user.id) fail(403,'access_denied');
        if (route[2] === 'classify') {
          if (mail.status === 'assigned') fail(409,'already_confirmed');
          await quota(env.DB,user,Number(env.AI_DAILY_LIMIT)||100);
          const suggestion=await ai.classify({sender:mail.sender,subject:mail.subject,body:mail.body},projects);
          await updateMail(env.DB,user,mail,{status:mail.status,projectId:null,suggestion},'mail_classified');
        } else if (route[2] === 'confirm') {
          if (data.reviewed !== true || !projects.some(p=>p.id===data.projectId)) fail(422,'choose_project');
          await updateMail(env.DB,user,mail,{status:'assigned',projectId:data.projectId,suggestion:mail.suggestion_json?JSON.parse(mail.suggestion_json):null},'mail_match_confirmed');
        } else {
          await updateMail(env.DB,user,mail,{status:'review',projectId:null,suggestion:mail.suggestion_json?JSON.parse(mail.suggestion_json):null},'mail_match_undone');
        }
        return respond({mail:publicMail(await getMail(env.DB,mail.id,user,projects))});
      }
      if (request.method === 'POST' && url.pathname === '/api/timesheets/parse') {
        const data=await json(request), transcript=text(data.text,20000), week=validateWeek(data.week);
        if (!dateOK(data.referenceDate)) fail(400,'invalid_date');
        await quota(env.DB,user,Number(env.AI_DAILY_LIMIT)||100);
        const proposal=await ai.parseTime(transcript,projects,week,data.referenceDate,user.id);
        await auditStatement(env.DB,user,requestId,'time_proposed',{modelRequestId:proposal.requestId||null,rows:proposal.rows.length}).run();
        return respond({...proposal,memberId:user.id,week});
      }
      if (request.method === 'POST' && url.pathname === '/api/audio/transcribe') {
        const type=request.headers.get('content-type')||''; if(!type.startsWith('multipart/form-data;')) fail(415,'audio_required');
        const raw=await bytes(request,MAX_AUDIO+65536); let form;
        try { form=await new Response(raw,{headers:{'Content-Type':type}}).formData(); } catch { fail(400,'invalid_audio'); }
        const audio=form.get('file'); if(!(audio instanceof File)||!audio.size||audio.size>MAX_AUDIO||!AUDIO_TYPES.has(audio.type.split(';')[0])) fail(415,'invalid_audio');
        await quota(env.DB,user,Number(env.AI_DAILY_LIMIT)||100);
        const transcript=await ai.transcribe(audio,form.get('language'));
        await auditStatement(env.DB,user,requestId,'audio_transcribed',{bytes:audio.size}).run();
        return respond({text:transcript});
      }
      fail(404,'not_found');
    } catch(error) { return respond({error:error instanceof HttpError?error.code:'server_error',requestId},error instanceof HttpError?error.status:500); }
  };
}

export async function receiveEmail(message,env) {
  if (!env.DB || message.rawSize>1024*1024) { message.setReject('Mailbox unavailable or message exceeds 1 MB'); return; }
  const box=await env.DB.prepare('SELECT * FROM mailboxes WHERE address=?').bind(message.to.toLowerCase()).first();
  if (!box) { message.setReject('Unknown mailbox'); return; }
  const user=await env.DB.prepare('SELECT * FROM users WHERE tenant_id=? AND id=? AND active=1').bind(box.tenant_id,box.owner_id).first();
  if (!user) { message.setReject('Mailbox unavailable'); return; }
  try {
    await quota(env.DB,user,200,'mail:');
    const parsed=await PostalMime.parse(await bytes(new Request('https://email.invalid',{method:'POST',body:message.raw,duplex:'half'}),1024*1024));
    // No HTML rendering, attachment forwarding, automatic classification or SMTP replies.
    const mail=normalizeMail({sender:parsed.from?.address||message.from,subject:parsed.subject||'',body:parsed.text||'HTML-only email: review original message in your mailbox.',messageId:parsed.messageId||''});
    const allowed=await env.DB.prepare('SELECT sender FROM sender_allowlist WHERE tenant_id=? AND sender=?').bind(user.tenant_id,mail.sender).first();
    // Allowlisting is routing metadata, not proof of sender authenticity. All inbound mail needs review.
    await insertMail(env.DB,user,mail,allowed?'email-allowlisted-unverified':'email-unverified','quarantine');
  } catch { message.setReject('Message could not be stored; check format, length or quota'); }
}
export default { fetch:createHandler(), email:receiveEmail };

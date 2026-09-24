import { fail, mailKey } from './domain.mjs';
export const all = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;
export async function projectsFor(db, user) {
  return all(db, `SELECT p.id,p.code,p.client,p.name FROM projects p WHERE p.tenant_id=? AND p.active=1
    AND (?='ceo' OR EXISTS (SELECT 1 FROM project_members m WHERE m.tenant_id=p.tenant_id AND m.project_id=p.id AND m.user_id=?))`, user.tenant_id, user.role, user.id);
}
export async function quota(db, user, limit = 100, prefix = 'ai:') {
  const day = new Date().toISOString().slice(0, 10);
  const result = await db.prepare(`INSERT INTO quotas(tenant_id,actor_id,day,used) VALUES(?,?,?,1)
    ON CONFLICT(tenant_id,actor_id,day) DO UPDATE SET used=used+1 WHERE used < ? RETURNING used`)
    .bind(user.tenant_id, prefix + user.id, day, limit).first();
  if (!result) fail(429, 'daily_quota');
}
export function auditStatement(db, user, entity, action, metadata, conditional = false) {
  const values = [crypto.randomUUID(), user.tenant_id, user.id, entity, action, new Date().toISOString(), JSON.stringify(metadata)];
  return db.prepare(`INSERT INTO audit(id,tenant_id,actor_id,entity_id,action,at,metadata_json) SELECT ?,?,?,?,?,?,?${conditional ? ' WHERE changes()=1' : ''}`).bind(...values);
}
export function canRead(mail, user, projects) {
  return mail && mail.tenant_id === user.tenant_id && (user.role === 'ceo' || mail.owner_id === user.id || (mail.status === 'assigned' && projects.some(p => p.id === mail.project_id)));
}
export function publicMail(mail) {
  return { id: mail.id, sender: mail.sender, subject: mail.subject, body: mail.body, date: mail.received_at,
    source: mail.source, status: mail.status, projectId: mail.project_id || '', verified: mail.status === 'assigned',
    version: mail.version, suggestion: mail.suggestion_json ? JSON.parse(mail.suggestion_json) : null };
}
export async function getMail(db, id, user, projects) {
  const mail = await db.prepare('SELECT * FROM inbox WHERE id=? AND tenant_id=?').bind(id, user.tenant_id).first();
  if (!canRead(mail, user, projects)) fail(404, 'mail_not_found');
  return mail;
}
export async function insertMail(db, user, mail, source = 'pasted', status = 'review') {
  const id = crypto.randomUUID(), key = await mailKey(mail), now = new Date().toISOString();
  await db.batch([
    db.prepare(`INSERT INTO inbox(id,tenant_id,owner_id,dedupe_key,sender,subject,body,message_id,received_at,source,status)
      VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,dedupe_key) DO NOTHING`)
      .bind(id, user.tenant_id, user.id, key, mail.sender, mail.subject, mail.body, mail.messageId, now, source, status),
    auditStatement(db, user, id, 'mail_received', { source, status }, true)
  ]);
  const saved = await db.prepare('SELECT * FROM inbox WHERE tenant_id=? AND dedupe_key=?').bind(user.tenant_id, key).first();
  if (saved.owner_id !== user.id && user.role !== 'ceo') fail(409, 'duplicate_mail');
  return { mail: publicMail(saved), duplicate: saved.id !== id };
}
export async function updateMail(db, user, mail, patch, action) {
  const result = await db.batch([
    db.prepare('UPDATE inbox SET status=?,project_id=?,suggestion_json=?,version=version+1 WHERE id=? AND tenant_id=? AND version=?')
      .bind(patch.status, patch.projectId || null, patch.suggestion ? JSON.stringify(patch.suggestion) : null, mail.id, user.tenant_id, mail.version),
    auditStatement(db, user, mail.id, action, { from: mail.project_id, to: patch.projectId || null, version: mail.version + 1 }, true)
  ]);
  if (result[0].meta.changes !== 1) fail(409, 'stale_mail');
}

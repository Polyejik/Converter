export class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
export const fail = (status, code) => { throw new HttpError(status, code); };
export const dateOK = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
export const addDays = (s, n) => new Date(Date.parse(s + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
export function text(value, max, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, 'invalid_input');
  return value.trim();
}
export function validateWeek(week) {
  if (!dateOK(week) || new Date(week + 'T12:00:00Z').getUTCDay() !== 1) fail(400, 'invalid_week');
  return week;
}
export async function sha256(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('');
}
export async function mailKey(mail) {
  return sha256(JSON.stringify([mail.messageId || '', mail.sender.toLowerCase(), mail.subject.trim(), mail.body.normalize('NFC').replace(/\s+/g, ' ').trim()]));
}
export function normalizeMail(data) {
  const sender = text(data.sender, 254).toLowerCase();
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(sender)) fail(400, 'invalid_sender');
  return { sender, subject: text(data.subject, 500, false), body: text(data.body, 20000), messageId: text(data.messageId || '', 512, false) };
}
export const CATEGORIES = ['action', 'request', 'risk', 'payment', 'info', 'spam'];
const obj = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const mailSchema = obj({
  projectId: { type: ['string', 'null'] }, category: { type: 'string', enum: CATEGORIES },
  priority: { type: 'string', enum: ['low', 'normal', 'high'] },
  summary: { type: 'string' }, reason: { type: 'string' }, confidence: { type: 'number' },
  evidence: { type: 'array', items: { type: 'string' } }
});
export const timeSchema = obj({ entries: { type: 'array', items: obj({
  projectId: { type: ['string', 'null'] }, date: { type: ['string', 'null'] }, hours: { type: ['number', 'null'] },
  category: { type: 'string', enum: ['billable', 'nonbillable', 'rework', 'internal'] },
  note: { type: 'string' }
}) }, questions: { type: 'array', items: { type: 'string' } } });
export function subjectMatch(subject, projects) {
  const codes = [...subject.matchAll(/\bPP[-\s]?(\d{1,4})\b/gi)].map(m => Number(m[1]));
  const unique = [...new Set(codes)];
  if (!unique.length) return { kind: 'context', project: null };
  const matches = projects.filter(p => Number(p.code.replace(/\D/g, '')) === unique[0]);
  return unique.length === 1 && matches.length === 1 ? { kind: 'code', project: matches[0] } : { kind: 'unmatched', project: null };
}
export function validateClassification(value, mail, projects) {
  if (!value || !CATEGORIES.includes(value.category) || !['low', 'normal', 'high'].includes(value.priority) ||
      !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1 ||
      typeof value.summary !== 'string' || value.summary.length > 2000 || typeof value.reason !== 'string' || value.reason.length > 1000 ||
      !Array.isArray(value.evidence) || value.evidence.length > 5 || value.evidence.some(s => typeof s !== 'string' || s.length > 500) ||
      !(value.projectId === null || projects.some(p => p.id === value.projectId))) fail(502, 'invalid_ai_output');
  const match = subjectMatch(mail.subject, projects);
  const projectId = match.kind === 'code' ? match.project.id : match.kind === 'unmatched' || value.confidence < 0.7 ? null : value.projectId;
  const source = `${mail.subject}\n${mail.body}`;
  return { ...value, projectId, match: match.kind, confidence: match.kind === 'code' ? 1 : value.confidence,
    evidence: value.evidence.filter(s => source.includes(s)), needsReview: true,
    reviewReason: match.kind === 'unmatched' ? 'unknown_or_multiple_codes' : match.kind === 'code' ? 'confirm_classification' : 'context_match' };
}
export function validateTime(value, projects, week, memberId) {
  if (!value || !Array.isArray(value.entries) || value.entries.length > 30 || !Array.isArray(value.questions) || value.questions.length > 20 || value.questions.some(s => typeof s !== 'string' || s.length > 1000)) fail(502, 'invalid_ai_output');
  const rows = [], issues = value.questions.map(s => ({ code: 'clarify', text: s }));
  for (const e of value.entries) {
    if (!e || !['billable', 'nonbillable', 'rework', 'internal'].includes(e.category) || typeof e.note !== 'string' || e.note.length > 2000 ||
      !(e.projectId === null || projects.some(p => p.id === e.projectId)) ||
      !(e.date === null || dateOK(e.date)) || !(e.hours === null || Number.isFinite(e.hours))) fail(502, 'invalid_ai_output');
    if (e.hours === null || e.hours <= 0 || e.hours > 24 || Math.round(e.hours * 4) !== e.hours * 4) { issues.push({ code: 'hours', text: e.note || 'Уточните часы / Specify hours' }); continue; }
    if (e.date && (e.date < week || e.date > addDays(week, 6))) { issues.push({ code: 'date', text: `${e.date}: ${e.note}` }); continue; }
    if (e.note.trim().length < 3) { issues.push({ code: 'note', text: 'Уточните выполненную работу / Describe the work' }); continue; }
    const days = Array(7).fill(0); if (e.date) days[Math.round((Date.parse(e.date) - Date.parse(week)) / 86400000)] = e.hours;
    rows.push({ memberId, week, projectId: e.category === 'internal' ? '' : (e.projectId || ''), category: e.category, days,
      note: e.note.trim(), outputs: [], unit: 'reservoir', status: 'draft', source: 'openai', needsProject: e.category !== 'internal' && !e.projectId,
      needsDay: !e.date, unallocatedHours: e.date ? 0 : e.hours, allocated: false });
  }
  for (let i = 0; i < 7; i++) if (rows.reduce((n, r) => n + r.days[i], 0) > 24) fail(422, 'daily_limit');
  return { rows, issues };
}

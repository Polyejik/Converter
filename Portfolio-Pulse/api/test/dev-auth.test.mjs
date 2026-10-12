import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const api = fileURLToPath(new URL('../', import.meta.url));
const origin = 'http://localhost:5173';
let dir, runtime, options, db;
const fixture = `
INSERT INTO tenants VALUES ('demo', 'Isolated demo'), ('other', 'Other tenant');
INSERT INTO users(id,tenant_id,email,name,role) VALUES
 ('ceo-1','demo','db-user@demo.local','Database identity','specialist'),
 ('ceo-1','other','other@example.test','Other CEO','ceo');
INSERT INTO projects(id,tenant_id,code,client,name) VALUES
 ('allowed','demo','A','Client','Allowed project'),
 ('hidden','demo','H','Client','Hidden project'),
 ('foreign','other','F','Client','Foreign project');
INSERT INTO project_members VALUES ('demo','allowed','ceo-1');
`;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'pulse-dev-auth-'));
  await cp(join(api, 'migrations'), join(dir, 'migrations'), { recursive: true });
  await writeFile(join(dir, 'fixture.sql'), fixture);
  await build({ entryPoints: [join(api, 'src/worker.mjs')], bundle: true, format: 'esm', platform: 'browser', outfile: join(dir, 'worker.mjs') });
  options = { modules: true, modulesRoot: dir, scriptPath: join(dir, 'worker.mjs'), compatibilityDate: '2026-09-24',
    d1Databases: { DB: 'isolated-dev-auth' },
    bindings: { ALLOWED_ORIGINS: origin, DEV_AUTH: '1' } };
  runtime = new Miniflare(convertV4MiniflareOptions({ ...options, d1Persist: join(dir, 'd1') }));
  db = await runtime.getD1Database('DB');
  // Flatten comments/newlines so D1 exec keeps trigger bodies intact.
  for (const file of ['migrations/0001_ai.sql', 'migrations/0002_portfolio.sql', 'fixture.sql']) {
    const sql = await readFile(join(dir, file), 'utf8');
    await db.exec(sql.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim());
  }
});
after(async () => {
  try { await runtime?.dispose(); }
  finally { if (dir) await rm(dir, { recursive: true, force: true }); }
});
async function session(headers = {}) {
  return runtime.dispatchFetch('http://localhost/api/session', { headers: { Origin: origin, ...headers } });
}

test('local dev session uses demo D1 identity and role, ignoring caller identity headers', async () => {
  const response = await session({ 'X-User-Id': 'other', 'X-Tenant-Id': 'other', 'X-Role': 'ceo', 'Cf-Access-Jwt-Assertion': 'forged' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  const body = await response.json();
  assert.deepEqual(body.user, { id: 'ceo-1', name: 'Database identity', role: 'specialist' });
  assert.equal(body.devMode, true);
  assert.deepEqual(body.projects.map(p => p.id), ['allowed']);
});

test('local dev auth preserves Origin restrictions', async () => {
  const denied = await session({ Origin: 'https://evil.example' });
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error, 'origin_denied');
  const missing = await runtime.dispatchFetch('http://localhost/api/inbox', { method: 'POST' });
  assert.equal(missing.status, 403);
  assert.equal((await missing.json()).error, 'origin_required');
});

test('local dev auth denies inactive or missing demo user without another tenant fallback', async () => {
  try {
    await db.prepare("UPDATE users SET active=0 WHERE tenant_id='demo'").run();
    const response = await session();
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, 'access_denied');
    await db.prepare("DELETE FROM project_members WHERE tenant_id='demo'").run();
    await db.prepare("DELETE FROM users WHERE tenant_id='demo'").run();
    assert.equal((await session()).status, 403);
  } finally {
    await db.prepare("INSERT OR REPLACE INTO users(id,tenant_id,email,name,role) VALUES('ceo-1','demo','db-user@demo.local','Database identity','specialist')").run();
  }
});

test('absent DEV_AUTH and non-1 values retain auth_not_configured', async () => {
  for (const value of [undefined, '', '0', 'true', '01', '1 ']) {
    await runtime.setOptions(convertV4MiniflareOptions({ ...options, bindings: { ALLOWED_ORIGINS: origin, ...(value === undefined ? {} : { DEV_AUTH: value }) }, d1Persist: join(dir, 'd1') }));
    const response = await session();
    assert.equal(response.status, 503, `DEV_AUTH=${value}`);
    const body = await response.json();
    assert.equal(body.error, 'auth_not_configured');
    assert.equal(Object.hasOwn(body, 'devMode'), false);
  }
});

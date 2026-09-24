import { createRemoteJWKSet, jwtVerify } from 'jose';
import { fail } from './domain.mjs';
const keys = new Map();
export async function authenticate(request, env) {
  if (!env.DB || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) fail(503, 'auth_not_configured');
  const issuer = env.ACCESS_TEAM_DOMAIN.replace(/\/$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(issuer)) fail(503, 'auth_not_configured');
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) fail(401, 'sign_in_required');
  if (!keys.has(issuer)) keys.set(issuer, createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs')));
  let payload;
  try { ({ payload } = await jwtVerify(token, keys.get(issuer), { issuer, audience: env.ACCESS_AUD, algorithms: ['RS256'] })); }
  catch { fail(401, 'invalid_session'); }
  if (typeof payload.email !== 'string' || typeof payload.sub !== 'string') fail(401, 'invalid_session');
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND active = 1').bind(payload.email.toLowerCase()).first();
  if (!user || (user.access_subject && user.access_subject !== payload.sub)) fail(403, 'access_denied');
  return user;
}

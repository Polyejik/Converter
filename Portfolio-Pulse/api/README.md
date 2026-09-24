# OpenAI integration — prepared, not connected

The published GitHub Pages app remains usable without a server. v30 contains an optional Cloudflare Worker/D1 gateway for email classification and recorded-time transcription/extraction. No OpenAI key, Cloudflare account, real mailbox, deployment domain or server user database was provided during this implementation. Live model quality and microphone hardware were not tested.

## Setup

1. Use Node 24+ and run `npm ci` in `Portfolio-Pulse`.
2. Create a Cloudflare D1 database. Put its real ID in `api/wrangler.jsonc`; the all-zero ID is a placeholder. Apply `api/migrations/0001_ai.sql` with Wrangler migrations. Run locally first; then explicitly apply to the intended remote database.
3. Set up a custom API domain and a Cloudflare Access application. Configure its audience and `ACCESS_TEAM_DOMAIN`. Keep access required on all API routes; allow OPTIONS preflight through the edge because the Worker implements credentialed CORS itself. The Worker independently verifies the signed Access JWT, including issuer, audience and expiry. There is no production bypass or shared browser token.
4. Provision tenants/users and project memberships in D1 using an administrator workflow. User emails must be lowercase and unique. Pin `access_subject` when available. Use the same employee/project IDs as the client until the full data migration is implemented. Only CEO receives company-wide project access automatically.
5. Configure `ALLOWED_ORIGINS` with exact origins (comma-separated, no wildcard). GitHub Pages origin is `https://polyejik.github.io`. For production prefer frontend and API on the same site to avoid third-party cookie restrictions. If using a single origin, put the app and API behind the same Access application.
6. Install the OpenAI key as a Worker secret: `npx wrangler secret put OPENAI_API_KEY --config api/wrangler.jsonc`. Enter it in the secure CLI prompt. Never put it in frontend files, localStorage, a URL, Git, or chat. Use a dedicated OpenAI project with spend controls.
7. Text default: `gpt-4.1-mini-2025-04-14`; transcription default: `gpt-transcribe`. Both are configurable. Verify availability in your OpenAI project and run synthetic evals before enabling real data.
8. Run `npm test` and `npm run check:worker`. Deploy the Worker to the configured Access-protected domain. `workers_dev` is disabled by default; the checked-in config intentionally has no production route.
9. In the app, Secretary → Settings, enter the API origin, sign in on the server and check the connection. Public `assets/ai-config-v30.js` may contain the API origin for a managed deployment. It must never contain a secret. The selected local profile must match the real server user before AI operations are allowed.
10. For incoming email: add a dedicated address to `mailboxes`, provision its owning user, and point Cloudflare email routing at the Worker. Exact addresses in `sender_allowlist` receive a routing label; sender authenticity is still unverified and messages remain quarantined. No email is forwarded, replied to, deleted or sent by this module.

The existing public Pages demo is not a place to enter confidential production data. Configure production hosting, access and data retention before a real client pilot. A Gmail/Outlook OAuth connector is not installed by this code; the prepared ingress is a dedicated Cloudflare email address plus manual paste.

## Contract

All POST requests require an allowed Origin and a valid Access session. The server derives tenant, author and accessible projects from its own database.

| Method / path | Input | Result |
|---|---|---|
| GET `/api/session` | Session cookie through Access | User, permitted project metadata, AI configured flag |
| GET `/api/inbox` | Optional `before`, `cursor` | Up to 50 permitted emails and next cursor |
| POST `/api/inbox` | `sender, subject, body, messageId` | Persisted email or deduplicated result |
| POST `/api/inbox/:id/classify` | `version` | Validated suggestion, no automatic project change |
| POST `/api/inbox/:id/confirm` | `version, projectId, reviewed:true` | Explicit project association plus audit |
| POST `/api/inbox/:id/unassign` | `version` | Reopens review and records the previous association |
| POST `/api/audio/transcribe` | Multipart `file, language` | Transcript; audio is not persisted by this Worker |
| POST `/api/timesheets/parse` | `text, week, referenceDate` | Draft rows/questions tied to the authenticated user |

Time proposal creation records metadata in audit, not the transcript. Time entries are added to the current local ledger only after review; submission/approval does not yet use D1. Model output never sets an hourly rate, currency, accepted deliverable, employee identity or project baseline.

Limits: 20,000 text characters, 500 subject characters, 30 proposed time rows, 8 MB audio upload, 60-second browser recording, 1 MB incoming MIME, 100 AI operations per user/day by default, 200 imports per owner/day. Quotas persist in D1. A transcription and subsequent time extraction count as two operations. Provider timeout is 45 seconds; there is no hidden retry. Client errors retain the original text. Configure organisation-wide OpenAI spend limits separately.

## Operational requirements

- Frontend role switching remains demo navigation, not authentication. Only the new server endpoints have verified authorization.
- `store:false` is set for Responses requests; this does not promise zero provider retention. Agree retention and access policy before sending real email/HR content. Audio is processed in memory; email content persists in D1 until an administrator applies an agreed retention policy.
- Do not log request bodies, audio, cookies, authorization headers or secrets. Responses expose a correlation ID and a safe error code.
- D1 updates use optimistic versions and atomic update/audit batches. Native SQLite integration tests verify these SQL statements. A live Cloudflare deployment, edge Access policy and backup/restore remain deployment acceptance checks.
- Incoming emails are not automatically sent to OpenAI. An authorized user explicitly requests classification. Quarantine is not malware scanning; attachments are ignored, and HTML is never rendered.
- Classification and time extraction use no model tools. They accept only server-known project IDs. Structured output is validated again before reaching the client. Model confidence is not calibrated probability.
- Before production: complete the common project/employee database migration, source freshness indicators, per-tenant budget monitoring, storage retention, backup restore test, accessibility/mobile checks on target devices and real RU/EN evals.

## Official references checked for this implementation

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs): Responses `text.format`, strict schema.
- [OpenAI file transcription](https://developers.openai.com/api/docs/guides/speech-to-text): bounded audio requests and language hints.
- [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini): supported Responses and Structured Outputs, pinned snapshot.
- [Cloudflare Access JWT validation](https://developers.cloudflare.com/changelog/post/2025-10-03-one-click-access-for-workers/).
- [Cloudflare Email handler](https://developers.cloudflare.com/email-service/api/route-emails/email-handler/).
- [Cloudflare D1 API](https://developers.cloudflare.com/d1/worker-api/d1-database/).

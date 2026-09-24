# v30 audit and release checks

Audit date: 2026-09-24. Baseline: v29, commit `2bd5d55`.

## Fixed findings

| Finding | Change / evidence |
|---|---|
| Workforce JSON export included other employees' records and rates | Scoped export, private HR filtering, no cost/rate fields for specialist; domain + UI regression |
| Submission relied on the project selector for scope | Domain submit checks current project access independently |
| Different rate/capacity validators on two screens | Shared domain validator; quarter-hour capacity enforced for CEO/accountant |
| NaN/invalid hours could be serialized into a misleading draft | Invalid input cannot replace the last valid saved draft; inline error indication; modal actions stop cleanly |
| Totals were stale while typing | Daily totals and week coverage update immediately; valid drafts autosave |
| Dictation invented a weekday distribution when only total hours were spoken | Missing day requires explicit selection before adding the proposal |
| Repeated copy could duplicate last week's hours | Existing drafts block another copy |
| Profile switch could leave a stale voice/HR modal open | Independent modal-context guard; cancellation of pending audio/AI work |
| Secretary context/history/mail ignored project scope | Scoped context and history, owner-only unconfirmed emails, role-change reset, scope check on apply/undo |
| Spreadsheet-formula prefixes hidden behind whitespace | CSV export also guards whitespace/control-character prefixes |
| Hardcoded “updated 4 minutes ago” implied live sync | Explicit local demo/no synchronization labels |
| Email grouping lacked sender/date/source and useful recovery | Search, source details, sender/date, review labels, change-match and server error recovery |
| Voice relied entirely on browser SpeechRecognition | Optional MediaRecorder → server transcription → structured proposal, upload fallback, cancel/permission/error handling |

## Automated validation

Run `npm ci && npm test` from `Portfolio-Pulse` with Node 24+. The tests use only synthetic data.

| Suite | Checks |
|---|---:|
| Current workforce domain, HR, rates, scope, CSV | 41 |
| Secretary parser | 43 |
| Secretary application-state rules | 4 |
| Current secretary speech lifecycle | 4 |
| Current workforce SpeechRecognition lifecycle | 4 |
| Whole-app personnel regression in jsdom | 9 |
| v30 whole-app interaction flows in jsdom | 11 |
| MediaRecorder lifecycle | 4 |
| OpenAI contract, HTTP handlers, SQLite/D1 SQL and email MIME | 19 |
| **Total** | **139** |

`npm run check:worker` bundles the actual Worker with Wrangler in dry-run mode. API tests use the production route handler and real SQLite with the D1 migration; OpenAI responses are mocked. The default handler is separately tested to fail closed without Access configuration and to reject missing/malformed JWTs.

Domain/application-state tests check the compiled app's existing data model. They are not a replacement for visual browser QA. Speech tests simulate events and do not measure recognition accuracy or real device microphone permissions. Live OpenAI calls, real Cloudflare Access/D1 deployment, email delivery/DNS and mobile device QA remain activation checks.

## Architecture and activation

- [Product architecture and priorities](../docs/ARCHITECTURE_RU.md)
- [Server setup, contract and limitations](../api/README.md)

The server is not deployed by this release. The checked-in config contains no secrets and keeps the AI connection off. LocalStorage keys from v29 are retained. Old assets and `preview-people-v29.html` remain available for comparison; rollback requires restoring the previous index, not deleting stored user data.

## Browser verification

Published preview `ae00460` verified in a desktop Chromium cloud browser on 2026-09-24:

- Overview displays the local-demo/no-server-synchronization boundary and role-neutral CEO greeting.
- Personal week opens; text dictation of 8 hours without a day requests explicit day selection; selecting Thursday creates an 8-hour draft and 20% coverage.
- Editing Thursday to 7.5 hours updates the day/week totals immediately; the draft survives page reload.
- Secretary settings clearly report API and mailbox disconnected, with no API-key input.
- Three synthetic emails group by subject code; the no-code email stays in review. Search narrows to GeoAlliance; explicit confirmation moves it into PP-002.
- Inbox screenshot inspected: readable labels, sender/date, review state, project selection and actions within the scrollable panel. See [browser capture](inbox-desktop.jpg).
- Collected error logs showed browser-extension metadata errors only, no application-origin error in the returned log sample.

This is a focused desktop smoke check, not full mobile/accessibility/device certification. Live API, microphone hardware and actual email delivery remain unverified.

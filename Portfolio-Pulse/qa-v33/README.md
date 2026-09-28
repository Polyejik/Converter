# v33 AI evidence review

- A server suggestion based on context preselects a project only when at least one proposed source excerpt occurs verbatim in the subject or body. A project code found in the subject remains the deterministic match. Every suggestion still needs explicit user confirmation.
- The secretary shows validated excerpts alongside the classification; ungrounded suggestions explain why the project must be selected manually. Excerpts are escaped as text, including HTML-looking email content.
- Local demo guesses derived from email body/context are displayed as hints but no longer preselect a project in the confirmation control.
- `qa-v33/test-inbox.cjs` exercises the local context guess and server-backed UI sequence with synthetic data: import/list, classify, inspect evidence, confirm and undo. `api/test/openai.test.mjs` checks missing/fabricated evidence and explicit subject codes.
- `npm test` and `npm run check:worker` passed on 2026-09-28. The latter is a build dry run, not a deployment.

The Pages demo has no server connection or OpenAI key. Real model quality, mailbox ingress and Cloudflare Access/D1 deployment remain unverified.

Published-browser check on the canonical v33 page: a local demo mail without a project code shows a tentative PP-002 hint and an empty selection before confirmation. `inbox-review.jpg` records the visible state. Evidence excerpts were verified in the synthetic API/UI test, not against a live model.

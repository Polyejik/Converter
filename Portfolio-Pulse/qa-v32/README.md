# v32 narrow viewport and dictation follow-up

- A 376 px iframe harness in `mobile.html` exercises responsive rules in Chrome without claiming physical-device coverage.
- Personnel gives a horizontal-scroll instruction on narrow screens and keeps the employee name visible while editing rate and capacity.
- The timesheet dictation dialog explains whether audio goes through the authenticated OpenAI gateway or the browser's recognition service. Text and keyboard dictation remain available.
- `PULSE_UI_HTML=preview-v32.html node qa-v30/test-ui.cjs` checks the new affordances and existing role flows. `npm test` checks the standard UI, domain, API and simulated recording lifecycle.

The public demo still lacks a configured server and live microphone hardware validation. No real mailbox or confidential production data was used.

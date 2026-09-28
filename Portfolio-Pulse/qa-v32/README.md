# v32 narrow viewport and dictation follow-up

- A 376 px iframe harness in `mobile.html` exercises responsive rules in Chrome without claiming physical-device coverage.
- Personnel gives a horizontal-scroll instruction on narrow screens and keeps the employee name visible while editing rate and capacity.
- The floating secretary control becomes a compact icon on narrow screens to avoid covering the timesheet action and table rows; its accessible name remains explicit.
- The timesheet dictation dialog explains whether audio goes through the authenticated OpenAI gateway or the browser's recognition service. Text and keyboard dictation remain available.
- `PULSE_UI_HTML=preview-v32.html node qa-v30/test-ui.cjs` checks the new affordances and existing role flows. `npm test` checks the standard UI, domain, API and simulated recording lifecycle.

The public demo still lacks a configured server and live microphone hardware validation. No real mailbox or confidential production data was used.

Published Pages browser check: the 376 px content viewport opens the Personnel table, which scrolls horizontally while preserving the employee name; the compact secretary control measures 52 px and has an accessible name. `mobile-personnel.jpg` captures the initial narrow view. Physical phone and microphone permission prompts were not exercised.

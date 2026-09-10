# Portfolio Pulse v28 — Time & Value

Published from the current v27.1 application, preserving its original project ledger, secretary, graphics and assets.

## Added
- Personal weekly timesheets for all roles; manual entry and RU/EN dictation preview.
- Local voice profile selection (not biometric authentication).
- Editable group/individual internal hourly cost and weekly capacity.
- Submitted cost snapshots, manager acceptance/return, distinct accepted output tracking.
- Project budget hours, labor cost, billable/rework, hours per output, earned-hours efficiency and estimated labor cost at completion.
- Weekly resource booking, cross-division availability, overload warnings, Undo.
- Separate local storage, audit log, CSV export and inclusion in existing JSON export.

## Verification, 2026-09-10
- 29 workforce domain checks; 4 simulated workforce speech lifecycle checks.
- Existing secretary suites: 43 parsing, 4 application-state and 4 speech lifecycle checks passed.
- Browser: Cody profile -> 8h Monday + 6h Tuesday preview -> manual note edit -> submit -> CEO accepts output; 14h and $980, one accepted object. Reload preserves the ledger.
- Browser: resource booking, overload feedback and Undo; individual rate save.
- Mobile: responsive frame 390px outer / 375px content, no global horizontal overflow, personal screen visually inspected.
- Fixed trailing preposition in parsed work descriptions and rate search to filter as typed without discarding edited fields.

## Demo
Open Time & Value. In an empty ledger use the clearly labelled four-week demonstration dataset. Select a specialist profile, dictate/type an example, review and submit; switch to CEO to accept the output and inspect economics/resources.

## MVP limits
The ledger is local to one browser. Role scopes are UI controls, not secure multiuser authorization. Voice profile entry selects a demo identity. Browser speech recognition may use its provider's service; physical microphone and iOS recognition were not tested. The timesheet parser is deterministic; DeepSeek is not connected. Rates measure direct labor cost only, not fully loaded cost; billable hours do not create invoices. Forecast efficiency requires an explicit output target and comparable deliverables.

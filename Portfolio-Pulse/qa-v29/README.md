# Portfolio Pulse v29 — People & Value

## Changes
- Personnel now contains a searchable table of 40 existing employees, individual hourly internal cost, weekly capacity, billable hours/cost and total reported labor cost.
- CEO can edit rate and capacity per row. Submitted/approved timesheets retain their captured rates; budgets are unchanged.
- Employee cards: hire date, computed tenure, expertise, office, work contacts, birthday, reporting manager, CEO-only HR note, project links and absence calendar.
- Leave and day off reduce weekly capacity for weekdays only. Business trips remain working time. Overlaps and cyclic reporting lines are rejected.
- Existing role/project scopes remain. Personal birthday is visible to CEO and the employee; HR notes to CEO. Non-CEO JSON exports filter HR records.
- Project economics separates billable labor cost from other project labor.
- Existing Personnel analytics, Gantt, projects, payments, secretary, local persistence and exports retained. RU/EN supported. Missing personal data remains blank.

## Validation
- 37 workforce domain checks, including eight new HR/capacity/snapshot/access cases.
- 43 secretary parsing, 4 application-state, 4 secretary speech and 4 workforce speech checks pass (speech uses simulated events).
- 9 whole-app jsdom interaction checks: navigation, 40 rows, search reset, inline rate save, HR/absence save and reopen, specialist privacy, division privacy, EN switch, no runtime exceptions.
- jsdom checks behavior, not real-browser layout. At v29 release time visual verification was incomplete. v30 includes new browser verification and a repeatable test runner.

Run domain tests: `node Portfolio-Pulse/qa-v29/test-people-v29.cjs`.
The UI test requires jsdom on Node's module path: `node Portfolio-Pulse/qa-v29/test-ui-v29.cjs`.

## Deployment status
v29 was published with explicit user authorization in commit `2bd5d55f73812e5226fa621ee4e9742549951157`; GitHub Pages deployment succeeded. It is retained as a historical baseline.

## Limits
Browser-local demonstration, not server-authenticated multiuser software. Roles control UI behavior; anyone controlling this browser can inspect local data. Do not treat role switching as secure authentication. DeepSeek is not connected. Billable cost is internal labor cost, not invoiced revenue.

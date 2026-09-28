# v31 interface review

Date: 2026-09-28. Scope: the published v30 desktop flow, then v31 candidate.

- CEO brief now leads with a project decision, identifies the July 31 snapshot and per-project update date. Copy avoids implying that old demo forecasts are current.
- Personnel opens directly at the searchable rates table. Summary KPIs follow the table. The separate vertical table scroll is removed. Employee details are collapsed under an explicit edit control; projects and absences remain visible.
- Personal week places day entry before the KPI summary. The duplicate profile button is removed from the tab row; the header profile control remains.
- Specialist secretary starters now reflect available project context and avoid project creation/status actions.

Automated validation: `npm test` exercises the v31 app in jsdom and the existing API/domain suites; added order and role assertions in `qa-v30/test-ui.cjs`. Desktop published-browser verification follows preview deployment. Mobile and live microphone are not covered by this review.

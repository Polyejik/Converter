# v31 interface review

Date: 2026-09-28. Scope: the published v30 desktop flow, then v31 candidate.

- CEO brief now leads with a project decision, identifies the July 31 snapshot and per-project update date. Copy avoids implying that old demo forecasts are current.
- Personnel opens directly at the searchable rates table. Summary KPIs are collapsed above the table. The separate vertical table scroll is removed. Employee details are collapsed under an explicit edit control; projects and absences remain visible.
- Personal week places day entry before the KPI summary. The duplicate profile button is removed from the tab row; the header profile control remains.
- Specialist secretary starters now reflect available project context and avoid project creation/status actions.

The generic hours banner is omitted from the CEO overview and Personnel. A July snapshot must not be presented as today's live data; the project action is translated in the Russian view. The browser's native date input may still display according to its own locale.

Automated validation: `npm test` exercises the v31 app in jsdom and the existing API/domain suites; added order, banner absence and role assertions in `qa-v30/test-ui.cjs`. The preview desktop browser verified the personnel table, employee card, personal week, and CEO brief; the banner regression was identified there and corrected before release. Mobile and live microphone are not covered by this review.

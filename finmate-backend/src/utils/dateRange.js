// Returns the first instant of the current month and the first instant of
// next month, both anchored in UTC.
//
// Why UTC: date-only strings from the frontend (e.g. "2026-07-01" from
// <input type="date">) are parsed by JS as UTC midnight, not local midnight.
// The previous version built these boundaries with new Date(year, month, 1)
// using the server's *local* timezone (via getFullYear()/getMonth()), which
// only matches UTC if the server process happens to be running with TZ=UTC.
// On any other timezone, transactions near a month boundary could land on
// the wrong side of the gte/lt comparison in budgetController.js, causing
// spent-vs-limit totals to be wrong for anyone near month-end/month-start.
//
// Anchoring both the "now" reference and the boundaries in UTC removes that
// dependency entirely — this now works the same regardless of server TZ config.
function currentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

module.exports = { currentMonthRange };

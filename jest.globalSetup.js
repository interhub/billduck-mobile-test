// Unit tests run west of UTC, where a calendar date read by `new Date('2026-10-01')` falls on the
// previous day; set before the test workers start, so every worker inherits it.
module.exports = async () => {
  process.env.TZ = 'America/Los_Angeles';
};

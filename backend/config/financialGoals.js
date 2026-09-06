// Not exposed anywhere in the UI - used only to compute the FI Target/Progress figures.
// The real value lives in .env (gitignored), never in source, since this repo is public.
module.exports = {
  ANNUAL_EXPENSES: parseFloat(process.env.ANNUAL_EXPENSES) || 50000,
  ANNUAL_EXPENSES_CURRENCY: process.env.ANNUAL_EXPENSES_CURRENCY || 'AUD',
  FI_MULTIPLE: 25
};

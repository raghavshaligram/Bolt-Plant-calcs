// Per-cluster ongoing-value promise shown in every lead-magnet opt-in on the
// site (calculator pages via LeadMagnetForm.jsx, blog articles via
// LeadMagnet.astro), keyed by the same "<name>-cluster" tag used by
// leadMagnetCopy.ts and leadMagnetIcon.ts.
//
// 2026-09-14 opt-in copy audit: this replaces the old generic "...emailed
// once" / "One email with the PDF. No newsletter list." framing that was
// hardcoded sitewide. That copy was honest but actively pre-cancelled the
// email relationship at signup -- it told every subscriber up front that
// there would be no further contact, which makes a genuinely useful
// seasonal reminder (the main reason a gardener would want to stay on the
// list, and the main lever for return visits) impossible without
// contradicting what they were promised.
//
// Each line below is a REAL commitment, not just softer copy -- the PDF/
// guide still goes out immediately, but the subscriber is now told they'll
// also hear from us when it's actually useful. That means a matching Brevo
// automation must exist for every cluster below before this copy ships, or
// the promise is broken the first time someone expects the seasonal email
// and never gets one. See the 2026-09-14 opt-in copy audit's follow-up item:
// build the seasonal reminder sequences in Brevo for all 8 lists below.
//
// 'companion-planting-chart' (blog/companion-planting-chart.mdx's one-off
// listId 13) deliberately has NO entry here -- it's a single dedicated PDF
// with no cluster and no planned recurring content, so both components fall
// back to a plain "no spam, unsubscribe anytime" line for it rather than
// inventing an ongoing promise the site has no plan to keep.
export const leadMagnetBenefit: Record<string, string> = {
  'soil-cluster':
    "The PDF now, plus a seasonal reminder when it's time to amend and top off beds in your area.",
  'fertilizer-cluster':
    'The PDF now, plus a seasonal feeding reminder for your growing season.',
  'irrigation-cluster':
    'The PDF now, plus a seasonal reminder to adjust watering as temperatures and rainfall change.',
  'spacing-cluster':
    "The PDF now, plus timely reminders when it's time to start seeds indoors for your zone.",
  'lawn-cluster':
    'The PDF now, plus a seasonal reminder for seeding and overseeding timing in your area.',
  'indoor-plants-cluster':
    'The PDF now, plus seasonal care reminders as light and watering needs change through the year.',
  'trees-cluster':
    'The PDF now, plus seasonal pruning and feeding reminders.',
  'hydroponics-cluster':
    'The PDF now, plus seasonal reminders to adjust heating and nutrient dosing as the season changes.',
  'diagnosis-cluster':
    'The guide now, plus a heads-up when common plant problems hit their season in your zone.',
};

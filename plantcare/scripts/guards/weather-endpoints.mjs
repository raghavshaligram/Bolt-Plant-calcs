/**
 * Guard 1b's matcher: no weather provider ENDPOINT in the shipped artefact.
 *
 * ── WHAT CHANGED, AND WHY ───────────────────────────────────────────────────
 *
 * This used to match provider names as bare words, so the string "Open-Meteo"
 * anywhere in the app failed the build. The rule was doing its job and also
 * doing more than its job: it made it impossible for the settings screen to
 * tell anybody which service needs no account — which left a panel that
 * explained at length why you must supply your own address and never said where
 * anyone might get one. Correct, and useless.
 *
 * The licensing risk the brief is about comes from *calling* somebody's free
 * tier on a buyer's behalf, not from naming it in a sentence. A hostname is the
 * thing that can become a call; a brand name in prose cannot. So:
 *
 *   allowed   "Open-Meteo needs no account and no key at all."
 *   refused   api.open-meteo.com
 *   refused   https://api.open-meteo.com/v1/forecast?daily=…
 *   refused   //open-meteo.com/v1
 *
 * Two names are domains in their own right — tomorrow.io and met.no — and stay
 * refused in every form, because there is no way to write them in prose that is
 * distinguishable from writing an address. The app names Open-Meteo and nothing
 * else, so nothing is lost.
 *
 * The pasteable URLs live on harvestmath.com/plant-care/weather/, which is not
 * the artefact, can be corrected when a provider renames a JSON field, and
 * ships no capability to anybody.
 */

/** Provider labels that are safe to say aloud but never safe to address. */
const LABELS = [
  'open-meteo',
  'openweathermap',
  'weatherapi',
  'visualcrossing',
  'accuweather',
  'weatherbit',
  'climacell',
  'pirateweather',
  'darksky',
  'weatherstack',
]

/**
 * A provider label sitting inside a domain: optional subdomains, the label, and
 * a real TLD. `api.open-meteo.com` and `open-meteo.com` match; `Open-Meteo`
 * does not, because there is no dot-TLD after it.
 */
const AS_HOST = new RegExp(String.raw`\b(?:[a-z0-9-]+\.)*(?:${LABELS.join('|')})\.[a-z]{2,}\b`, 'gi')

/** Names that are themselves domains. No prose form to protect. */
const ALWAYS = /\b(?:tomorrow\.io|met\.no)\b/gi

/**
 * Every provider endpoint in `text`, de-duplicated. Empty means the artefact
 * contains no address for any of them.
 */
export function findProviderEndpoints(text) {
  return [...new Set([...(text.match(AS_HOST) ?? []), ...(text.match(ALWAYS) ?? [])])]
}

/**
 * The cases that define the rule, exercised by `npm run verify:file`.
 *
 * They live beside the matcher rather than in the test, because the pair is the
 * specification: loosening the regex without looking at these is how a guard
 * quietly stops guarding.
 */
export const CASES = [
  { text: 'Open-Meteo needs no account and no key at all.', hits: 0, why: 'a brand name in prose is not an endpoint' },
  { text: 'one service (Open-Meteo) is free for personal use', hits: 0, why: 'nor in parentheses' },
  { text: 'https://api.open-meteo.com/v1/forecast?daily=precipitation_sum', hits: 1, why: 'a full URL is' },
  { text: 'api.open-meteo.com', hits: 1, why: 'and so is a bare hostname' },
  { text: 'open-meteo.com', hits: 1, why: 'with or without a subdomain' },
  { text: '"https://api.weatherapi.com/v1/forecast.json?key="', hits: 1, why: 'any provider, not just the first' },
  { text: 'fetch("//visualcrossing.com/x")', hits: 1, why: 'protocol-relative too' },
  { text: 'tomorrow.io', hits: 1, why: 'a name that is itself a domain stays refused' },
  { text: 'met.no', hits: 1, why: 'both of them' },
  { text: 'the weather settings screen explains all of this', hits: 0, why: 'the word "weather" was never the problem' },
  { text: 'https://your-provider.example/v1/forecast?lat=', hits: 0, why: 'the placeholder in the empty field is not a provider' },
]

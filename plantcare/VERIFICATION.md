# Verification

The brief's eleven items, each with a verdict and the command that produces it.
Nothing below is a claim made by reading the code.

```
npm run verify      # all five verification scripts — 133 assertions, 0 failures
npm run verify:pwa  # the installable half, driven in a real browser — 28, 0 failures
npm run verify:demo # the demo: works, keeps nothing, is not the paid build — 22, 0 failures
npm run build       # guards 1, 1b and 2, plus emit-pwa's byte-identity assertion
npm run shots       # drives the built file over file:// and fails on a console error
npm run guide       # START-HERE.md → dist/START-HERE.pdf, refusing unsupported Markdown
```

The sales pages and the two deliveries live in the site repository one level up,
with their own checker:

```
node scripts/verify-sales.mjs   # 96 assertions, 0 failures — see DEPLOY-PLANT-CARE.md
```

## Brief verification pass, item by item

| # | Item | Verdict | How it is checked |
| --- | --- | --- | --- |
| 1 | Single-file build runs fully offline after first load, weather disabled (the default) | **PASS** | `scripts/emit.mjs` guard 1 scans the built markup, inlined CSS and JS for any external reference; guard 1b fails the build if a weather provider's address appears anywhere in it. `npm run shots` then drives `dist/PlantCare.html` over `file://` through every screen and fails on any console error. `verify:file` asserts the schedule produces 51 jobs with weather off. |
| 2 | FSA save/load round-trips — close, reopen, all data intact | **PASS, with one manual step** | `npm run verify:file` proves the data half: write → read → write is byte-identical, every plant returns field for field, fields this build has never heard of survive, a partial or hand-edited file opens, a newer-version file is refused. The browser half — does Chromium hand back the same handle after a restart — cannot be automated, because the file picker requires a real gesture by design. See "the two manual steps" below. |
| 3 | Companion planting matches the live article and Etsy PDF | **PASS** | `verify:data` check 3 — re-parses the site's own `CompanionPlantingTable.tsx`, compares row for row, asserts symmetry both ways, and asserts every reason the app can show is a literal substring of the article's own stated reasoning |
| 4 | Zone/frost data matches the live calculators | **PASS** | `verify:data` check 4 — whole-module byte comparison of `frostZones.ts` and `hardinessZoneTemps.ts` |
| 5 | Pot-size data matches the live Pot Size Calculator | **PASS** | `verify:data` check 5 — all three tables, `CATEGORY_INFO` included |
| 6 | Diagnosis branching matches the live DiagnosticQuiz for all ported conditions | **PASS** | `verify:data` check 6 — 6 trees, 19 questions, 34 outcomes; every prompt and option still present in its article, every branch reachable and terminating |
| 7 | Care scheduling differs across ≥5 real cases — not a flat default | **PASS** | `verify:schedule` — eight cases spanning 2 to 70 days (a 35× range, six distinct answers), three single-variable sweeps, and all 303 species × 3 placements × 3 dates × 7 care types = 19,089 combinations, every one a usable answer |
| 8 | Camera features degrade gracefully when permission is denied | **PASS, with one manual step** | `verify:camera` asserts that exactly one file in the app calls `getUserMedia`, that it classifies all six DOMException names by hand plus the insecure-context case, that each carries its own message, and that both tools pass a working fallback into the camera pane so it is shown *on failure*, not instead of it. Photo capture is a separate path with no permission at all — `<input type="file" capture>`, the OS picker. Actually clicking Block is the manual step below. |
| 9 | Weather OFF by default, app fully functional without it, no provider endpoint pre-wired or bundled | **PASS** | `verify:file` asserts `enabled === false` and `endpoint === ''` in the defaults, in a new file, and in the demo; that no URL of any kind appears in `weather.ts`; and that the schedule works with it off. `emit.mjs` guard 1b fails the build if a provider *address* appears in the artefact, across eleven cases run by `verify:file` that fix where the line is: `Open-Meteo` in a sentence passes, `api.open-meteo.com` and any URL containing it do not. It was narrowed from matching brand names to matching addresses so that the settings screen could name the one service that needs no account — see "the guard that was doing too much" below |
| 10 | DEMO file has realistic populated data across all features | **PASS** | `verify:file` — all seven care types appear, 8 late / 5 due today / 10 this week, an owner override, an outdoor plant, a humidified plant, a free-draining mix, owner notes, a diagnosis with its answers, care entries, free-text notes, 10 distinct species across 7 rooms, 5 of them cat-toxic |
| 11 | Report PASS/FAIL per item | **This table** | — |

## Features, against the brief

| Feature | State |
| --- | --- |
| 1. My Plants + species encyclopedia | **Built.** Add/edit/remove, name, species, pot size, indoor/outdoor, room, date acquired, photo. 303 species, searchable and browsable independently of your own plants. |
| 2. Full care scheduling | **Built.** All six care types the brief names — watering, fertilising, misting, repotting, pruning, cleaning — plus turning. Each derived from species + pot size + indoor/outdoor + season + zone, each adjustable by hand, each skippable per plant. |
| 3. Symptom diagnosis | **Built.** All six trees ported. Results and the full path of answers are written to the plant's journal automatically on arrival, not behind a prompt. |
| 4. Light meter (camera) | **Built.** Two measurement paths and an honest account of each — see below. Cross-references the species table and writes the result straight onto the plant, where the watering schedule already uses it. |
| 5. Pot measurement (camera) | **Built.** Photograph the pot beside something of known size, drag two marks, get the diameter and the nearest nursery size from the ported conversion table. Manual entry remains everywhere a pot size is asked for. |
| 6. Companion planting checker | **Built.** Pick any two of the 13, get good / avoid / neutral with the article's own sentence as the reason where it has one. |
| 7. Zone & frost dates | **Built.** ZIP entry, stored locally, feeds every schedule. |
| 8. Plant journal | **Built.** Per-plant log with date, note and photo; automatic entries from care completions and diagnoses; free text; searchable. |
| 9. Optional live weather (BYOK) | **Built, off.** See item 9 above. |

## How the light meter actually works, and what it is worth

This is the item the brief asks to be honest about, so the honesty is here as
well as in the app.

**Averaging the pixels of a camera frame does not measure light.** Auto-exposure
exists to make a dark room and a bright one produce the same well-exposed
picture — it spends the difference you were trying to measure. An app that
averages pixels and calls the result a light reading is measuring its own
auto-exposure.

So there are two paths:

- **Where the browser reports the camera's own exposure** (Chromium, through
  `ImageCapture.getPhotoSettings`), the light is computed from shutter speed,
  ISO and aperture — `E = 2.5 × 2^EV100`. That is what a light meter does; the
  exposure the camera chose *is* the measurement. It gives a figure in lux.
- **Where it does not**, the app measures pixels and reports a relative
  brightness 0–100, valid only against another reading from the same phone in
  the same session. It says that, in those words, instead of printing lux.

A third state exists and is worded differently again: the person picked a
category themselves, which is a perfectly good method and gets no accuracy
caveat at all.

`verify:camera` checks the arithmetic against real exposures rather than against
itself: sunny-16 (f/16, 1/100 s, ISO 100) must come out as full sun, a dim corner
(f/1.8, 1/30 s, ISO 1600) as low light, and doubling the shutter must exactly
halve the implied light. That test caught the constant being 250 rather than 2.5
— full sun was reading as 6,400,000 lux, which is only obviously wrong if you
know what full sun is.

## How the pot measurement works

A camera cannot tell how big anything is; a photograph of a pot is a photograph
of an angle. So the app asks for a ruler it can trust: a bank card is 85.60 mm
wide everywhere in the world, because ISO/IEC 7810 says so. Photograph it against
the pot, drag two marks, and the ratio gives the diameter — then the ported
`STANDARD_SIZES` table gives the nearest nursery size.

No edge detection and no "we found your pot". A detector that is right most of
the time produces a number that is wrong some of the time with no way to tell
which. Two fingers are both more accurate and more trustworthy.

The result carries its own tolerance — how far a one-pixel slip on each mark
moves the answer — which makes "get closer to the card" concrete rather than
vague. Eight reference objects are offered and every one cites the standard its
size comes from.

## Sales flow and dual delivery

One build, delivered twice: `PlantCare.html` to download, and the same bytes
installed from `/app/`. `npm run build` emits both and refuses to finish if they
differ, because two distributions that can drift are two products.

`node scripts/verify-sales.mjs`, in the site repository, checks the eight items
the sales brief asks for. Everything it can decide from the source it decides;
the three that need a running deployment print as steps rather than verdicts,
and are written out in `DEPLOY-PLANT-CARE.md`.

| # | Item | Verdict | How it is checked |
| --- | --- | --- | --- |
| 1 | `/plant-care/` loads with zero third-party scripts; payment scripts confined to `/buy/` | **PASS, with one recorded departure** | The sales page contains no PayPal host, SDK URL or global, and loads no external script of its own — its only `<script>` tags are JSON-LD, which is data. The SDK appears on `/buy/` alone, and only when configured **and** launched. The departure: Google Analytics is in the site's shared layout and therefore on this page too. That was a decision, not an oversight, and the checker prints it every run rather than letting it disappear. |
| 2 | The flow reaches `/plant-care/welcome/`, with both the file and the app | **PASS** | The checkout navigates to `PATHS.welcome` with a token, and only from `onApprove` after the server's capture. The welcome page offers the download, the app URL, install steps for iOS and for Android/desktop, and the START-HERE PDF. It renders per request and its default branch is the invalid one. |
| 3 | A sandbox purchase completes end to end | **MANUAL** | The static half is checked: the create-order handler takes no request object at all, so no amount can reach it; the capture route judges the sale from PayPal's own reply and mints the token only then. The sale itself is step 5 of `DEPLOY-PLANT-CARE.md`. |
| 4 | The paid file cannot be fetched directly | **PASS, plus one manual step** | `private/PlantCare.html` is outside the publish directory, no copy exists anywhere under `public/`, and the download route inlines it at build time behind a token check. The 404s are confirmed against a real deployment at step 5b. |
| 5 | An expired or forged link is refused | **PASS** | Not read — run. The checker imports the payment library and signs a token, verifies it, then re-verifies it with the wrong secret, with a tampered payload, and 31 days late, and feeds `captureIsGood` a $0.01 capture, a capture-less order and an uncaptured order. All refused. |
| 6 | The welcome page states that data does not sync | **PASS** | The sentence is present, in bold, in its own panel, and the checker asserts its position is *above* both the download button and the install section. It also says which copy to treat as the real one, which is the part that prevents the support email. |
| 7 | The app is not linked from site navigation | **PASS** | No page, layout or component outside the product references `/app/` or the subdomain — checked against the real `Header.astro` and `Footer.astro`. Only the welcome page and the updates page link to it, and `/app/*` is served `noindex`. |
| 8 | Report PASS/FAIL per item | **This table**, and the checker's own output | — |

### The demo, and the day the page nearly gave the product away

`/app/` is the product. A rewrite of the sales page pointed seven "Try the free
demo" links at it, and said so in the page description and the FAQ schema too.
Nothing in that page looked wrong — the URL was simply the wrong one, and the
effect was a page telling every visitor where to get a $29 app for nothing.

So the demo is now a different artefact. `npm run build:demo` produces
`dist/demo/index.html` with `VITE_DEMO_LOCK=1`: it opens on the demo household,
every screen works, every schedule is real — and there is no code path in it that
writes anything. No file, no IndexedDB, no export, no service worker, not
installable. `verify:demo` proves that by driving a browser: it marks a job done,
asserts the list changed, asserts the origin has no database at all, reloads, and
asserts the job is back.

Two assertions run in both directions, because either one failing is the same
failure: the demo build must not be the paid build, and the paid build must not
contain the demo's copy — if it did, the lock would be shipping inside the
product, waiting for somebody to flip it.

`verify-sales.mjs` then holds the line on the site side: if the product page
invites anybody to try it, the link has to be `DEMO_URL`, and it must not be
`APP_URL`.

**The URL is public and that is the deal.** Anyone given the `/app/` address can
install the app without paying, exactly as anyone given the HTML file can open
it. The brief rules out licence keys and accounts, so there is no gate — only the
convention that the address is handed out after a purchase and is not advertised.
The checker states this every run rather than implying a protection that is not
there.

## Still to build

Nothing in either brief. The nine features, the eleven original verification
items and the eight sales items are all built or explicitly accounted for above.
What is left is not code: the four environment variables, the sandbox sale, the
four manual checks and the launch switch, in `DEPLOY-PLANT-CARE.md`.

## The two manual steps

Both are browser behaviour that cannot be automated, and both are five minutes.

### 1. The file handle, after a restart (item 2)

In Chrome or Edge:

1. Open `dist/PlantCare.html`, press **Start a new file**, save it as `test.plants`.
2. Add a plant, mark something done, write a journal note.
3. Close the tab entirely. Reopen `PlantCare.html`.
4. It should either come straight back, or offer **"Reopen test.plants"**. Press it.
5. Everything should be there.

What must never happen is an empty plant list appearing silently — that is the
one failure this app cannot recover from, because the next autosave would write
the emptiness over the real file. `data/persistence.ts` is built around
preventing it: an unreadable handle produces a prompt, a missing file produces a
warning naming it, and nothing is written until a file has been read.

### 2. Saying no to the camera (item 8)

Serve `PlantCare.html` over https or from localhost — the camera is not offered
to a page opened straight off the disk, and the app says so in those words rather
than reporting a failure.

1. **Tools → Light meter → Use the camera.** Click **Block**.
2. The four category buttons must still be there, and the message must name the
   padlock icon in the address bar rather than saying "camera failed".
3. Pick a category. The verdict, the plant picker and "record this as its light"
   must all work exactly as they would have with a reading.
4. **Tools → Measure a pot.** Same refusal; **Use a photo instead** must still
   take any photo from the disk and measure it.
5. Open it from `file://` instead. The message should now be the one about https,
   because that is a different problem with a different fix.

## What the numbers are

```
species.ts — 303 species
  groups     foliage 53, flowering 47, vine 37, succulent 37, vegetable 37,
             tree 26, herb 23, fern 13, prayer 11, palm 10, carnivore 6, other 3
  toxicity   115 toxic, 108 non-toxic, 80 not on the ASPCA list
  companion  13 linked to the companion-planting table

companion.ts — 13 plants, 44 directed relationships, 28 carrying the article's
               own sentence as the reason; the other 16 say so rather than
               inventing one

dist/PlantCare.html         556.8 KB   (budget 900 KB)   nothing fetched, no provider
dist/Demo household.plants    8.1 KB   10 plants, 10 journal entries
```

Watering intervals across the eight verification cases:

```
Snake plant, 12 in pot, Zone 5 January, indoors                70 days
Golden pothos, 6 in, Zone 6 January, indoors                   14 days
Echeveria, 4 in, free-draining, Zone 10 December               13 days
Calathea white fusion, 6 in, slow compost, Zone 3 February     10 days
Golden pothos, same pot, dark hallway, June                    10 days
Golden pothos, 6 in, Zone 6 June, indoors                       9 days
Tomato, 15 in pot, Zone 8 August, outdoors                      2 days
Maidenhair fern, 4 in pot, Zone 9 July, outdoors                2 days
```

## Deliberate departures from the brief

**The palette.** The brief names soil brown `#5C4433`, leaf green `#4A7C59`,
cream `#F5F1E8` and sun gold `#E8A94A`. None of those four values appears
anywhere in the live HarvestMath site. The site's actual locked palette is in
`src/design/tokens.ts` — moss `#385030`, clay, sand `#faf8f3`, bark, leaf — and
that is what this app uses, because a buyer arrives here from a page they have
already been reading and a green that is nearly the site's green reads as a
different company's software.

The typeface is the one genuine compromise: the site loads Fraunces and Inter
from a font service, and this app cannot load anything, so the display face falls
back through Georgia and the body face through the system stack. Bundling
Fraunces would cost 40–70 KB to fix headings on machines that mostly have
Georgia anyway.

**Turning is a seventh care type** the brief does not name. It costs one line, it
is the reason half the houseplants in the world lean, and it is the only job on
the list that is the same for every plant.

**Pruning and dusting are derived from the plant's group**, not from per-species
columns. Adding two more columns across 303 rows would produce 606 guesses typed
quickly, which is worse data than a rule that is right about a whole group —
and the groups where the rule would give harmful advice are refused with the
reason instead. A kentia palm is never scheduled for pruning, because cutting
the crown kills it.

## Things found while building this, kept because they will recur

**The port was allowed to miss a table.** `port-data.mjs` looked for
`CATEGORY_GUIDE`; the site calls it `CATEGORY_INFO`. The optional match found
nothing, raised nothing, and the app shipped a pot tool that could list "Dwarf
fruit tree" and not say what size pot it wants. Every table the port extracts is
now required.

**A backslash inside a JavaScript template literal is not an escape.** This has
now cost two bugs in this codebase. First, an emitted `genusOf` split botanical
names on the letter "s" — coverage fell from 23 plants to 2, with no error
anywhere. Then a lookahead in the companion-reason splitter emitted an unbalanced
bracket. The splitter is now a hand-written scanner, which has no escapes to
lose, and both generators import their own output and exercise it before
reporting success.

**A backtick inside a generated comment closes the generator.** A comment saying
`type` in backticks ended the template literal carrying it; the script died
pointing at a line forty lines later that was perfectly correct. The port now
imports every file it writes and checks the exports are there — because the loud
failure was survivable and the quiet one, a stale generated file after a run
whose output was being discarded, was not.

**A tool with a model in it will invent a plant.** Three passes of fetching the
ASPCA list through a summarising tool produced the same plant under different
botanical names, drifting spellings, and entries not on the page. All discarded.
This is the one field where being wrong has a consequence in somebody's house,
so it is read from the DOM.

**An air plant wanted repotting every nine years.** One typo in one column.
`repotYears` is now bounded 0–5 with 0 meaning "not grown in compost", and every
species is run through every care type on every build.

**A guard that was doing too much read as a guard doing its job.** Guard 1b
refused to ship any weather provider's name, as a word, anywhere in the file.
That is a rule about licensing — free weather tiers are non-commercial and this
is a paid product — and it was enforced by banning the name rather than the
address. The consequence was a settings panel that explained at length why you
must supply your own weather URL and never said where anybody might get one:
correct, and useless, and it survived review because every individual sentence
in it was true. The guard now bans addresses, the panel names the service that
needs no account, and eleven cases in `verify:file` pin the difference — because
a guard that has been loosened is the one worth testing.

**A service worker that claims the page is not a service worker that updated
it.** The worker calls `clients.claim()` so that a first visit is controlled and
therefore works offline without being opened twice. That claim also fires
`controllerchange` — and the update handler reloaded on `controllerchange`. So
every buyer's first open of the installed app refreshed itself, at whatever
moment activation happened to finish, which is exactly the behaviour the file's
own comment says the design avoids. It passed two full verification runs before
showing up, because whether the reload lands before or after any given
interaction is a race. The page now records whether it was already controlled
when it started, and `verify:pwa` plants a marker on the first document and
checks it is still the same document a second later.

**The Today screen was 6,662 pixels tall.** Three lines per row and every section
expanded, for twenty-three jobs. It is 1,904 now: one line per row, the exact
date moved into a tooltip, the reasoning behind a `?`, and "This week" folded
away whenever anything is actually late or due — because a screen that answers
"what needs doing" should not open by listing next Tuesday.

## Not planned

- **AI photo identification** — an ongoing paid API call per use, or a vision
  model in the file. The good versions are built on years of proprietary data.
- **Push notifications with the app closed** — a local HTML file cannot do this.
- **Cloud sync, accounts, community** — servers, which is what this product is
  the absence of.

All three are stated plainly in `START-HERE.md` rather than left for a buyer to
discover.

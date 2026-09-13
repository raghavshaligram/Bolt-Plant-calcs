# HarvestMath Plant Care

One HTML file. No account, no subscription, no server, and nothing fetched at
runtime. The buyer's data is a `.plants` file in their own Documents folder.

```
npm install
npm run port          # regenerate the ported data from the HarvestMath site
npm run build         # -> dist/PlantCare.html  and  dist/Demo household.plants
npm run verify        # all five verification scripts (132 assertions)
npm run shots         # screenshots of the built file, driven over file://
```

`npm run port` needs the site source. It looks for it at `--site <path>`, then
`$HARVESTMATH_SITE`, then `../`, then `../Bolt-Plant-calcs`.

## What is where

| Path | What it is |
| --- | --- |
| `src/app/data/sources/species.tsv` | The species catalogue, hand-written. 303 rows. |
| `src/app/data/sources/aspca-cats.tsv` | Verbatim extract of the ASPCA cat list. 981 rows. |
| `src/app/data/ported/` | **Generated.** Do not edit — `npm run port` overwrites it. |
| `src/app/calc/` | Dates, the scheduling engine, task derivation, the light and pot-measurement maths. No React. |
| `src/app/data/` | File format, persistence, the actions that change a store. |
| `src/app/ui/` | Screens. |
| `scripts/` | Port, build, verify, screenshot. |
| `START-HERE.md` | What ships with the product. Includes how to switch live weather on. |
| `VERIFICATION.md` | PASS/FAIL against every item in the brief. |

## The three rules this codebase is built around

**1. Nothing about a plant's safety is written from memory.**

The `toxicity` field on every species is the return value of `toxicityFor()`
against the ASPCA list, resolved at build time, carrying `via` so an inference
from a sibling species is worded as an inference and a plant that is not on the
list says so rather than being assumed safe. There is deliberately no toxicity
column in `species.tsv`: the moment a person can type "non-toxic" beside a plant
name, the app is making a claim nothing checked.

The ASPCA rows were read from the live page's DOM, not through any tool that
summarises. An earlier pass used a fetching tool with a model in the loop and it
produced rows that are not on the page — plausible botanical names, drifting
spellings, plants that do not appear. All of it was discarded. For this one
field, no model in the loop.

**2. The ported data is generated, never retyped.**

Companion planting, the zone and frost tables, the pot size calculator and the
six diagnosis trees all come from the HarvestMath site source through
`scripts/port-data.mjs`. `npm run verify:data` reads both sides and fails if
they have drifted. The site, the Etsy PDF and this app answer the same question
the same way because they are the same data, not because somebody checked.

**3. The schedule shows its working.**

Every interval comes back with the factors that produced it and a sentence for
each. A schedule nobody can interrogate is a schedule nobody trusts, and the
first time it says something surprising the answer has to be on the same screen.

## The file format

Plain JSON, two-space indented, so it can be opened in a text editor. That is a
feature of owning your data, not an accident. `schemaVersion` is checked on
open: a file from a newer build is refused rather than opened and silently
downgraded, and older versions go through numbered migrations.

Unknown fields survive a round trip. Every action in `data/actions.ts` spreads
the record it changes rather than rebuilding it field by field.

## The two camera tools

Both live in `src/app/ui/`, both take their arithmetic from `src/app/calc/`, and
both work with no camera at all — the light meter offers its four categories as
buttons, the pot tool takes any existing photo.

`Camera.tsx` is the only file in the app that calls `getUserMedia`, which is what
makes the permission behaviour reviewable in one place. It names all six
DOMException cases plus the insecure-context one, because "camera failed" and
"this page needs to be served over https" have different fixes.

Read the header of `calc/light.ts` before changing anything there. The short
version: averaging camera pixels measures your own auto-exposure, not the room.

## Live weather

Ships off, with an empty endpoint, and no provider anywhere in the artefact —
`scripts/emit.mjs` fails the build if one appears. The reason is licensing: free
weather tiers are non-commercial and this is a paid product, so the buyer
supplies their own address for their own personal use. `START-HERE.md` explains
it to them; `src/app/data/weather.ts` explains it to whoever edits this next.

## Browser support

The File System Access API — open a file once, then every save writes back to it
— exists only in Chromium browsers. Safari and Firefox get the same app with a
download-to-save path instead. It is not hidden or apologised for; the welcome
screen says which one you are getting and why.

A file handle survives a reload but its permission does not, so an unreadable
handle produces a prompt, never a blank start. An empty list autosaved over
somebody's real file is the one failure this app cannot recover from.

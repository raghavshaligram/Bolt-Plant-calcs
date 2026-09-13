# Deploying HarvestMath Plant Care

Everything for this product is already in the repository and none of it is
reachable: no page links to it, nothing is in the sitemap, search engines are
told not to index it, and the checkout refuses to load a payment script. It ships
dark on purpose, so that this file can be worked through calmly rather than with
a half-live sales page in the wild.

Going live is eight steps and about an hour, most of which is PayPal's signup.
Do them in order. Step 6 is the point of no return and everything before it is
reversible.

---

## What is already here

| Path | What it is |
| --- | --- |
| `src/pages/plant-care/index.astro` | The sales page. No third-party script of its own. |
| `src/pages/plant-care/buy.astro` | The checkout. The only page that loads PayPal. |
| `src/pages/plant-care/welcome.astro` | Post-purchase. Server-rendered, token-checked. |
| `src/pages/plant-care/updates.astro` | Changelog, and the permanent route back. |
| `src/pages/api/plant-care/*.ts` | create-order, capture-order, download. |
| `src/lib/plantCarePayments.ts` | Price, tokens, capture checking. The rules live here. |
| `src/data/plantCare.ts` | `LAUNCHED`, the price, the copy, the facts. |
| `src/components/PlantCareCrossLink.astro` | Cross-promotion. Renders nothing until launch. |
| `private/PlantCare.html` | The paid build. Outside `public/` — never served directly. |
| `public/app/` | The installable app: same build, manifest, service worker, icons. |
| `public/plant-care/demo/` | The demo: a **different** build that cannot save anything. |
| `public/plant-care/START-HERE.pdf` | The buyer's guide. |
| `scripts/verify-sales.mjs` | Checks all of the above. `node scripts/verify-sales.mjs`. |

Run the checker before and after every step below:

```bash
node scripts/verify-sales.mjs
```

It exits non-zero on a failure and prints what broke. Everything it can prove
statically, it proves; the three things only a deployment can prove are printed
as `·` and are steps 5 and 7 here.

---

## 1. A PayPal business account with a live app

paypal.com → **Developer Dashboard** → **Apps & Credentials**.

Create an app under **Sandbox** first. Note the **Client ID** and the **Secret**.
Then create one under **Live** and note those too. Four values, two pairs, and
the live pair does not go anywhere near a text editor.

If your PayPal account is not a Business account yet, do that first — a personal
account cannot take card payments from people who do not have PayPal, which is
most buyers.

## 2. Generate the download secret

Any long random string. On your machine:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This one value signs every download link. Keep a copy in your password manager —
not because you will need it again, but because changing it invalidates every
link already emailed to buyers, and that is the lever to pull if it ever leaks.

## 3. Set the environment variables in Netlify

Netlify → your site → **Site configuration** → **Environment variables**.

| Variable | Value | Secret? |
| --- | --- | --- |
| `PUBLIC_PAYPAL_CLIENT_ID` | The client id | No — it is in every buyer's browser |
| `PAYPAL_CLIENT_ID` | The same client id | No |
| `PAYPAL_SECRET` | The PayPal secret | **Yes** |
| `DOWNLOAD_SECRET` | Step 2's random string | **Yes** |
| `PAYPAL_API` | `https://api-m.sandbox.paypal.com` | No — remove this at step 6 |

Use the **sandbox** pair for now, with `PAYPAL_API` pointing at the sandbox.

Three rules, and they are the whole of the security of this thing:

- **`PAYPAL_SECRET` and `DOWNLOAD_SECRET` exist only here.** Not in `.env`, not
  in `.env.example`, not in a comment, not in a commit, not in a chat window.
  `.env` is already gitignored; that is a safety net, not a place to put them.
- **Never send the price from the browser.** It is a constant in
  `src/lib/plantCarePayments.ts` and the create-order route accepts no request
  body at all. If that ever changes, somebody will buy this for one cent.
- **Never let the browser decide that payment succeeded.** `onApprove` runs in
  the buyer's browser and can be called by hand from the console. The only thing
  that mints a download token is the server reading `COMPLETED` — and the right
  amount — out of PayPal's own capture reply.

## 4. Deploy to a branch and launch it there

```bash
git checkout -b plant-care-live
# in src/data/plantCare.ts
export const LAUNCHED = true;
git commit -am "Plant Care: launch on branch for sandbox testing"
git push -u origin plant-care-live
```

Netlify builds branch deploys at `https://plant-care-live--<site>.netlify.app`.
Branch deploys are `noindex` by Netlify's own header, so this cannot be found.

**Do not merge this branch.** It exists to be tested and deleted.

## 5. The sandbox sale, and the five things to check by hand

Open the branch URL and buy the app with a sandbox buyer account (Developer
Dashboard → **Sandbox** → **Accounts** — PayPal creates a personal one for you
with a fake balance).

Then check these five. Each one is a way this can fail silently in production.

**a. The flow lands correctly.** After paying you should arrive at
`/plant-care/welcome/?t=…`, the download button should produce
`PlantCare.html`, and opening that file should run the app.

**b. The file is not fetchable without a token.** In a private window, request:

```
https://plant-care-live--<site>.netlify.app/PlantCare.html
https://plant-care-live--<site>.netlify.app/private/PlantCare.html
https://plant-care-live--<site>.netlify.app/api/plant-care/download
```

The first two must be 404. The third must be 403 — not a download.

**c. A broken link is refused.** Change one character in the `?t=` value and
reload the welcome page: it must say the link is not valid, with no download
button rendered in the HTML at all (view source and search for `download` —
there should be nothing to find). The same token against
`/api/plant-care/download?t=…` must return 403.

**d. The demo cannot save.** Open `/plant-care/demo/`, mark a job done, reload.
It must come back exactly as it was, and the browser must have no database for
the site — devtools, Application, Storage. `npm run verify:demo` checks this
locally, and it is worth confirming once on the deployed copy, because this is
the difference between a demo and a free product.

**e. The app installs and works offline.** On a phone, open `/app/` and install
it — Safari's Share → *Add to Home Screen* on iOS, the install prompt on Android.
Open it, add a plant, turn on airplane mode, close it, open it again: the plant
is still there and the app still runs. Then open the light meter and confirm the
camera is offered, which is the whole reason the installed version exists.

If any of these five is wrong, stop. None of them is a cosmetic problem.

## 6. Go live

In this order:

1. **Netlify variables:** swap the sandbox client id and secret for the live
   pair, and **delete `PAYPAL_API`** so it falls back to the live endpoint.
2. **`src/data/plantCare.ts`:** `export const LAUNCHED = true;`
3. **`astro.config.mjs`:** in the `sitemap({ filter })` block, delete the two
   lines marked *delete these two lines at launch*, so `/plant-care/` and
   `/plant-care/updates/` enter the sitemap. The buy and welcome pages stay out
   permanently.
4. **Cross-promotion**, one line near the end of the content on each of the
   three pages where somebody is already doing what the app does:

   | Page | Prop |
   | --- | --- |
   | Pot Size Calculator | `<PlantCareCrossLink context="pot-size" />` |
   | Plant Problem Diagnosis | `<PlantCareCrossLink context="diagnosis" />` |
   | Companion Planting Chart | `<PlantCareCrossLink context="companion" />` |

   with `import PlantCareCrossLink from '../../components/PlantCareCrossLink.astro';`
   in the frontmatter — adjust the depth to the page. Nowhere else: on any other
   page it reads as an advertisement rather than a suggestion.
5. `node scripts/verify-sales.mjs`, then commit and push to `main`.
6. Delete the `plant-care-live` branch.

## 7. Buy it yourself, for real, then refund it

One real sale with a real card. It is the only test of the live credentials, and
it costs about a pound in fees.

Confirm the money arrives in PayPal, the welcome page works, the file downloads,
and the app installs. Then refund yourself from the PayPal dashboard. A refund
does not invalidate the download link — there is no mechanism for that and
deliberately so; nobody is building account revocation for a thirty-day URL.

## 8. Nothing else

There is no mailing list to set up, no licence server, no account system, no
analytics event to add to the checkout. The product is finished. If a buyer
emails, the answer to almost everything is on `/plant-care/updates/`.

---

## Shipping an update later

The app and the site are separate builds. An update to the app is four commands
and a changelog entry:

```bash
cd plantcare
npm run build            # dist/PlantCare.html, dist/app/ and dist/demo/
npm run verify           # data, species, schedule, file, camera
npm run verify:pwa       # manifest, service worker, offline, camera, IndexedDB
npm run verify:demo      # the demo works, keeps nothing, and is not the paid build
npm run guide            # regenerates dist/START-HERE.pdf from START-HERE.md

cp dist/PlantCare.html            ../private/PlantCare.html
cp -r dist/app/.                  ../public/app/
cp dist/demo/index.html           ../public/plant-care/demo/index.html
cp dist/START-HERE.pdf            ../public/plant-care/START-HERE.pdf
```

Copy all four. The demo is built from the same source, so a release that updates
the app and forgets the demo leaves the thing every visitor tries a version
behind the thing they are being sold.

Then add an entry at the top of `RELEASES` in
`src/pages/plant-care/updates.astro`, written in terms of what changed for the
person using it, and push.

Buyers who installed the app get it automatically — the service worker is served
with `must-revalidate` precisely so that it can replace itself, which is what
makes "free updates forever" true rather than aspirational. Buyers who took the
file use the link in their purchase email, or the updates page.

Do not change `DOWNLOAD_SECRET` when you ship an update. It would invalidate
every link already sent, and the file those links return is read fresh from
`private/` at build time anyway.

## If something goes wrong after launch

Set `LAUNCHED = false` and push. Within a couple of minutes the product page
returns to noindex, the cross-promotion blocks disappear from the three
calculator pages, and the checkout stops loading PayPal entirely — so no further
sale can start. Buyers who already have a token keep working: the welcome page
and the download route do not consult `LAUNCHED`, on purpose, because somebody
who has paid should not be caught by a switch meant for somebody who has not.

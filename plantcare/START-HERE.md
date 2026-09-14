# HarvestMath Plant Care — start here

You bought one app and you got it twice: a file you download and keep, and a
version you can install on a phone. They are the same build. No installer, no
account, no subscription, and after the first open neither one needs the
internet again.

This guide is mostly about the file, because that is the part with a choice in
it — where your data lives. The section near the end covers the installed app,
which has no such choice and therefore no such instructions.

## The one thing to know before you start

**The file and the installed app keep separate data, and they do not sync.**

The downloaded file keeps your plants in a `.plants` file on that computer. The
installed app keeps them inside that browser, on that device. Nothing joins the
two, because joining them would need a server and this product deliberately does
not have one.

So pick one as your real record. Most people install it on the phone, because
that is where they are standing when they notice the leaf, and keep the file as
a backup. Moving between them is an export and an import and takes about ten
seconds — but it is something you do, not something that happens.

## The two-minute version

1. **Double-click `PlantCare.html`.** It opens in your browser like any page.
2. **Press "Look around the demo first".** Ten plants, eight months of history.
   Nothing you do in there is saved anywhere; it is for looking.
3. When you are ready, press **"Start a new file"** and choose where to keep it.
   Your Documents folder is a good place. That file is your data.

Keep `PlantCare.html` wherever you like — a bookmark works, so does a shortcut
on the desktop. It does not need to sit next to your plant file.

## Your data is a file

Everything lives in one `.plants` file that you chose the location of. It is
plain text — you can open it in Notepad or TextEdit and read it.

- **Back it up** by copying it. That is the whole backup procedure.
- **Move it** by moving it. Put it in a Dropbox or iCloud folder and it follows
  you between machines, as long as you only have it open in one place at a time.
- **Nothing is uploaded.** Not your plants, not your photos, not your notes.

In Chrome and Edge the app writes straight back to your file as you go. In
Safari and Firefox — which do not have the browser feature that allows this —
saving produces a download instead, and you press **Save a copy** yourself. The
app tells you which one you are getting on the welcome screen.

If you open the app and it asks permission to reopen your file, that is normal:
browsers forget file permissions when they restart. Press the button and it
comes straight back.

## What it does

**Today** is the screen you will live in. What is late, what is due, what is
coming this week. Press **Done** and the clock restarts.

Every job has a **?** beside it. Press it and the app shows its working — the
plant's own base figure, and what your pot size, season, zone, light and soil did
to it. If a number ever looks wrong, that is where to look first, and if you
disagree you can set your own interval and the app will stop arguing.

**My plants** is your list. **Plants A–Z** is a reference book of 303 species
whether you own them or not. **Diagnose** walks the same decision trees as the
problem guides on harvestmath.com. **Tools** has the light meter, the pot
measurer, zone and frost dates, companion planting, and the pot size conversions
from the site's calculators.
**Journal** is everything that has happened, and it is the part that gets more
valuable every year you keep it.

## The light meter

**Tools → Light meter.** Hold the phone where the plant would sit, facing the way
the plant faces, and take a reading. Then pick one of your plants and it tells
you whether that plant will be happy there — and if it is darker than the plant
likes, that watering it less is the thing that matters, not moving it.

Be realistic about the number. A phone camera is not a light meter, and the app
says so on the same screen as every reading. On Chrome and Edge it works the
reading out from the exposure your camera chose, which is genuinely how a light
meter does it. On other browsers it can only give you a relative brightness —
useful for comparing two spots one after the other, not as an absolute figure.

If you would rather just say "that's a bright windowsill", there are four buttons
for exactly that and the advice is identical.

## Measuring a pot

**Tools → Measure a pot.** Lean a bank card against the pot, photograph the two
together, and drag the two markers — one across the card, one across the widest
part of the pot. A bank card is 85.60 mm everywhere in the world, so the ratio
gives you the diameter, and the app tells you the nearest nursery size.

Two things decide whether it works: the card has to be at the same distance from
the lens as the pot rim (leaning on the pot, not flat on the table in front of
it), and keep both near the middle of the frame, because phone lenses stretch the
edges.

Worth doing once per plant: pot size moves a watering interval by about a factor
of two, which is more than almost anything else the app takes into account.

## Pets

Plants that are toxic to cats carry a badge, and every verdict comes from the
ASPCA's published list — the app names the exact row it read. Where a plant is
not on that list, it says "not on the list" rather than implying it is safe, and
where the answer is inferred from related species it says that too.

Please treat it as a starting point rather than the last word. If you have a cat
that chews things and a plant you are unsure about, look it up yourself as well.

## Live weather (optional, off, and yours to switch on)

The app can use real rainfall and temperature to fine-tune watering: rain pushes
an outdoor plant back, a heat wave pulls everything forward.

**It ships switched off with an empty field, and there is no weather service
built in.** That is deliberate, and here is the reason, because it affects you.

Weather services that offer a free tier almost always license it for personal,
non-commercial use only. Open-Meteo is the best known and its free access is
explicitly non-commercial. This app is a paid product — so if we bundled a call
to their service, every buyer's use of it would be a commercial use of their
free tier, on their behalf, without anyone asking. That is not a risk we are
willing to put on you or on them.

So the capability ships, and the address is yours to supply. The full
instructions — including a service that needs no account and no key at all, the
exact URL to paste, and what to do when a provider refuses the request — are at
**harvestmath.com/plant-care/weather**, which is kept up to date as providers
change their APIs. The short version:

1. Sign up with a weather API for **your own personal use**. Open-Meteo is free
   for personal and home use and needs no key at all; WeatherAPI, Visual
   Crossing, Tomorrow.io and others have free personal tiers that use a key.
   Read whichever one's terms and decide for yourself.
2. In the app: **Tools → Live weather**, tick the box, and paste the URL that
   returns your forecast as JSON.
3. Tell it where in that JSON the two numbers live. The defaults
   (`daily.precipitation_sum.0` and `daily.temperature_2m_max.0`) match the
   shape Open-Meteo returns. If your provider differs, change them.
4. Press **Check the weather now**. Nothing is fetched until you do — not on
   start-up, not in the background, not ever.

The app is completely usable with this off, forever. The zone and season data it
already ships with covers most of the same ground.

Two practical notes. Your URL is stored inside your plant file, so if it contains
a personal key, bear that in mind before sharing the file. And a browser opening
a local file cannot call every server — some reject requests from a page like
this one. If it fails, the app says so and everything else keeps working.

## The installed app

The address for it is on your welcome page, and in the email that brought you
here. Open that address on the device you want the app on.

**On an iPhone or iPad**, open it in **Safari** — this does not work in Chrome on
iOS, which is Apple's rule rather than ours. Tap the **Share** button, scroll
down, tap **Add to Home Screen**, then **Add**. It arrives as an icon like any
other app, opens without a browser bar, and works with no signal.

**On Android or a computer**, open it in Chrome, Edge or Brave and either accept
the **Install** prompt or press the install icon in the address bar — a small
screen with a downward arrow. On Android it is also under the ⋮ menu as
**Install app**.

Three differences from the file, and no others:

- **It stores your plants inside that browser**, not in a file you chose. There
  is a **Download a copy** button for backups, and that copy is the same
  `.plants` format the file version uses.
- **The camera tools work properly.** Browsers only allow the camera on a secure
  connection, which a file opened from your own disk is not. If you want the
  light meter and the pot measurer, use the installed app.
- **It updates itself.** When you open it with a connection it checks for a
  newer version and tells you when one is ready, rather than changing underneath
  you mid-sentence.

Clearing your browser's site data will delete its plants, the same way it would
delete anything else a site has stored. Press **Download a copy** now and then,
and keep it somewhere you keep things.

## Photos and the camera

Plant photos and journal photos are resized before they are stored and kept
inside your file. On a phone the button opens the camera; on a computer it opens
the file picker. Nothing is uploaded, ever.

If you say no when the browser asks for the camera, nothing breaks: the light
meter still has its four buttons and the pot measurer still takes a photo you
already have. You can change your mind later from the padlock icon in the
address bar.

Photos are the one thing that will make your file big. A few hundred is fine; a
few thousand will start to feel slow.

## What this app does not do, and why

- **No AI plant identification from a photo.** Doing it properly means either an
  ongoing paid API call for every buyer — which breaks "works offline forever"
  and costs money per use — or shipping a vision model inside the file. The good
  versions of this are built on years of proprietary data we do not have. We
  would rather say so than ship a bad one.
- **No push notifications when the app is closed.** A local HTML file genuinely
  cannot do this reliably. The due and overdue lists work; background alerts do
  not exist. If you need a nudge, a recurring calendar reminder to open the app
  works well.
- **No cloud sync, no account, no community.** Those need servers, and servers
  need a subscription, and the absence of one is the point of this product.

## If something goes wrong

The app never deletes your file and never writes an empty one over it. If it
cannot find or read your file it says so and stops rather than starting fresh.

If a screen looks broken, close the tab and open `PlantCare.html` again — your
file is on disk and nothing is lost. If it still looks wrong, the file itself is
readable text, so nothing is ever trapped inside the app.

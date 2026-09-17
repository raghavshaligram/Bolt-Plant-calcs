# Calculator Page Template — Copy Rules

Structural conventions for calculator pages (sticky layout, card spacing, the
Share/Embed/Cite block) live in `CALC_ROLLOUT_PATTERN.md` and
`CALC_SPACING_PATTERN.md`. This file covers the writing.

## The keyword rule

**Keyword variants get distributed across the page. They never get stacked in
one sentence, and they never get inserted with an "also called" aside.**

This has now been caught twice — once on `/blog/4x8-raised-bed-soil/`, where
five variants were stacked into a single sentence, and once across the
calculator set, where the intro paragraphs had the same problem. Both times the
fix was the same: keep every phrase, move it somewhere it belongs. Hence this
rule living here instead of being re-litigated each time.

### What stuffing looks like

These are the four tells. All four were found live on this site:

1. **The "also called" aside.**
   `This frost dates calculator — also called a frost date calculator — does more than hand you a date.`
   The em-dash aside carries no information a reader wants. It exists to get a
   second phrasing onto the page, and it reads that way.

2. **The variant list.**
   `Searching for a soil cubic yard calculator, a cubic yard calculator soil conversion, a calculator for soil yardage, or a dirt calculator cubic yards conversion?`
   Four query strings in one sentence, one of them not even grammatical.

3. **The sentence that exists only to carry a phrase.**
   `Think of it as a volume calculator for soil that also converts straight to cubic yards and liters in the same pass, whatever the shape.`
   Delete it and the paragraph loses nothing — the next sentence already made
   the point.

4. **The shoehorned clause.**
   `so how to measure the height of a tree without climbing it comes down to three practical methods`
   A search query wedged in as a sentence subject, where a person would have
   written "so measuring one comes down to".

### Where displaced variants go instead

Do not delete them — they are real targeted terms. Give each one its own home,
one phrase per location:

- **FAQ questions.** The best home by far. People genuinely phrase the same
  question several ways, so a query-shaped string reads natural as a question
  in a way it never does mid-paragraph. `Can I use this as a soil cubic yard
  calculator?` is a fine FAQ heading and a terrible intro clause.
- **FAQ answers**, where the phrase describes what the tool is doing at that
  moment.
- **H2 headings**, when the variant is genuinely the section's topic.
- **Section transitions and the Common Mistakes section.**

One variant per location. Relocating all four of a page's variants into a
single FAQ answer is the same stuffing with a new address.

### Writing the intro

The intro is the one place a reader judges whether the page was written for
them. Write it as a single clear paragraph a person would actually write, then
check: does any sentence exist only to carry a phrase? If yes, cut it and
re-home the phrase.

One instance of the page's primary term in the intro is normal and expected
("This mulch calculator…"). A second phrasing of the same term is the problem.

## Legitimate term disclosure is not stuffing

Don't over-apply this. These are fine and should stay:

- **Acronym expansion the reader needs**: `This DLI calculator (daily light
  integral)…`
- **A real alternate industry term, explained**: the Growing Degree Days page
  says `Growing degree days — also called GDU, for Growing Degree Units` and
  then explains that the two terms mean the same thing and which industries use
  which. That's a reader service; the "also called" is doing real work.
- **Defining a term of art**: `Between-row spacing (also called row spacing) is
  the distance between one row and the next.`

The test: **would a knowledgeable human writer have included it?** If the
alternate name teaches the reader something — an acronym, an industry synonym,
a term of art — keep it. If it only restates the same words in a different
order, it's stuffing.

## Before shipping a calculator page

- Read the intro out loud. Anything you stumble over is usually a keyword.
- Grep the page for `also called` and `also known as` and justify each hit
  against the test above.
- Check no sentence contains two phrasings of the same thing.
- Confirm every targeted variant appears verbatim exactly once, somewhere it
  belongs.

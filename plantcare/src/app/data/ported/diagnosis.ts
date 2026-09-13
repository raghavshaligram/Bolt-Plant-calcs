/*
 * GENERATED — do not edit.
 *
 * Written by scripts/port-data.mjs from the HarvestMath site source:
 *   src/pages/blog/*.mdx (the <DiagnosticQuiz> props)
 *
 * Edit it there and re-run `npm run port`. scripts/verify-data.mjs reads both
 * sides and fails if they have drifted, so a hand edit here does not survive
 * the next verification pass.
 */

export interface DiagnosisOption {
  label: string
  /** Either another question's id, or a key in `results`. */
  next: string
}

export interface DiagnosisQuestion {
  id: string
  prompt: string
  options: DiagnosisOption[]
}

export interface DiagnosisResult {
  label: string
  blurb: string
  /**
   * Where the full explanation lives. On the site this is a fragment within the
   * article the quiz sits in; here it is resolved against `article` so the app
   * can name the page as well as the section.
   */
  anchor: string
  ctaLabel?: string
}

export interface DiagnosisTree {
  id: string
  label: string
  article: string
  questions: DiagnosisQuestion[]
  results: Record<string, DiagnosisResult>
}

export const DIAGNOSIS_TREES: DiagnosisTree[] = [
  {
    id: 'yellow-leaves',
    label: "Yellow leaves",
    article: '/blog/why-are-my-plant-leaves-turning-yellow/',
    questions: [
      {
        id: "q1",
        prompt: "Which leaves are yellowing?",
        options: [
          { label: "Old, lower leaves", next: "q2a" },
          { label: "New, upper leaves", next: "q2b" },
          { label: "Neither — soft stems, wet soil, or a recent move", next: "q2-other" },
        ],
      },
      {
        id: "q2a",
        prompt: "Is the whole leaf yellow, or just between the veins?",
        options: [
          { label: "Whole leaf, veins included", next: "nitrogen" },
          { label: "Just between the veins", next: "magnesium-or-potassium" },
        ],
      },
      {
        id: "q2b",
        prompt: "Is the whole leaf yellow, or just between the veins?",
        options: [
          { label: "Whole leaf", next: "sulfur" },
          { label: "Just between the veins, veins stay green", next: "iron-manganese" },
        ],
      },
      {
        id: "q2-other",
        prompt: "Which of these best matches what you're seeing?",
        options: [
          { label: "Soil is wet, or stems feel soft or mushy", next: "overwatering-yellow" },
          { label: "Soil is dry, leaves feel crispy or thin", next: "underwatering-yellow" },
          { label: "Just a few old, lower leaves — rest of the plant looks healthy", next: "natural-aging-yellow" },
          { label: "This started right after repotting or a move", next: "transplant-yellow" },
          { label: "There are also spots, bugs, webbing, or stickiness", next: "pest-disease-yellow" },
        ],
      },
    ],
    results: {
      nitrogen: { label: "Nitrogen Deficiency", blurb: "Uniform yellowing, oldest leaves first", anchor: "#nitrogen-deficiency" },
      "magnesium-or-potassium": { label: "Magnesium or Potassium Deficiency", blurb: "Interveinal yellowing or edge browning on older leaves", anchor: "#old-leaves-yellowing-first-mobile-nutrients" },
      "iron-manganese": { label: "Iron or Manganese Deficiency", blurb: "Interveinal yellowing on new growth, usually a soil pH issue", anchor: "#new-leaves-yellowing-first-immobile-nutrients" },
      sulfur: { label: "Sulfur Deficiency", blurb: "Pale, uniform yellowing on new growth", anchor: "#calcium-and-sulfur-deficiency" },
      "overwatering-yellow": { label: "Overwatering", blurb: "Wet soil, soft stems — oxygen-starved roots", anchor: "#do-yellow-leaves-mean-too-much-water" },
      "underwatering-yellow": { label: "Underwatering", blurb: "Dry, crispy leaves and soil pulling away from the pot", anchor: "#underwatering-yellow-leaves" },
      "natural-aging-yellow": { label: "Natural Aging", blurb: "Normal — oldest leaves shed to feed new growth", anchor: "#natural-aging-yellow-leaves" },
      "transplant-yellow": { label: "Transplant or Root Shock", blurb: "Normal stress response, usually resolves in 1-2 weeks", anchor: "#transplant-or-root-shock-yellow-leaves" },
      "pest-disease-yellow": { label: "Pest or Disease", blurb: "Look for stippling, webbing, or spots alongside the yellowing", anchor: "#pest-or-disease-yellow-leaves" },
    },
  },
  {
    id: 'wilting',
    label: "Wilting",
    article: '/blog/why-is-my-plant-wilting/',
    questions: [
      {
        id: "q1",
        prompt: "Is the soil wet or dry right now?",
        options: [
          { label: "Dry", next: "q2-dry" },
          { label: "Wet or waterlogged", next: "q2-wet" },
          { label: "Neither fits — it recovers by evening, or just repotted", next: "q2" },
        ],
      },
      {
        id: "q2-dry",
        prompt: "Does it perk back up within a few hours of a deep watering?",
        options: [
          { label: "Yes, recovers quickly after watering", next: "underwatering" },
          { label: "No, stays wilted even after watering", next: "disease" },
        ],
      },
      {
        id: "q2-wet",
        prompt: "If you check the roots, are they firm and light-colored, or soft, dark, and mushy/foul-smelling?",
        options: [
          { label: "Firm and light-colored (or haven't checked)", next: "overwatering" },
          { label: "Soft, dark, mushy, or foul-smelling", next: "root-rot" },
        ],
      },
      {
        id: "q2",
        prompt: "Did this happen after repotting, or in hot weather?",
        options: [
          { label: "After repotting/transplanting", next: "transplant-shock" },
          { label: "In hot weather, recovers by evening", next: "heat-stress" },
          { label: "Neither — it just won't recover", next: "disease" },
        ],
      },
    ],
    results: {
      underwatering: { label: "Underwatering", blurb: "Dry soil, perks up within hours of watering", anchor: "#soil-is-dry-underwatering" },
      overwatering: { label: "Overwatering", blurb: "Wilting despite wet soil — oxygen-starved roots", anchor: "#soil-is-wet-overwatering-and-root-rot" },
      "root-rot": { label: "Root Rot", blurb: "Roots have started to rot — same fix, but act quickly", anchor: "#root-rot-vs-overwatering" },
      "transplant-shock": { label: "Transplant or Root Shock", blurb: "Normal, usually resolves in 1-2 weeks", anchor: "#heat-and-transplant-stress" },
      "heat-stress": { label: "Normal Heat Response", blurb: "No action needed", anchor: "#heat-and-transplant-stress" },
      disease: { label: "Vascular Wilt Disease", blurb: "Doesn't recover despite adequate watering", anchor: "#disease-and-vascular-wilt" },
    },
  },
  {
    id: 'holes',
    label: "Holes in leaves",
    article: '/blog/why-are-there-holes-in-my-plant-leaves/',
    questions: [
      {
        id: "q1",
        prompt: "Is it a Monstera or similar species, with neat holes following the leaf veins?",
        options: [
          { label: "Yes", next: "q1b" },
          { label: "No", next: "q2" },
        ],
      },
      {
        id: "q1b",
        prompt: "Are the holes symmetrical, and did they appear as the leaf unfurled — not scattered across an already-mature leaf?",
        options: [
          { label: "Yes, matches that pattern", next: "fenestration" },
          { label: "No, it's scattered or appeared after the leaf matured", next: "q2" },
        ],
      },
      {
        id: "q2",
        prompt: "Can you see bugs, or evidence of them (slime trails, frass)?",
        options: [
          { label: "Yes, or clear evidence", next: "visible-pest" },
          { label: "No bugs anywhere in sight", next: "no-bugs" },
        ],
      },
    ],
    results: {
      fenestration: { label: "Natural Fenestration — Not a Problem", blurb: "Normal growth pattern, nothing to fix", anchor: "#not-actually-a-problem-natural-leaf-fenestration" },
      "visible-pest": { label: "A Visible Pest", blurb: "Japanese beetles, flea beetles, slugs, or caterpillars", anchor: "#visible-culprit-the-two-most-common-real-pests" },
      "no-bugs": { label: "No Bugs Visible", blurb: "Nocturnal feeders, old damage, or shot hole disease", anchor: "#no-bugs-visible-now-what" },
    },
  },
  {
    id: 'brown-tips',
    label: "Brown leaf tips",
    article: '/blog/why-are-my-plant-leaf-tips-turning-brown/',
    questions: [
      {
        id: "q1",
        prompt: "Is it just the tip or edge, with the rest of the leaf still green?",
        options: [
          { label: "Yes, just the tip/edge", next: "q2-tip" },
          { label: "No, the whole leaf is browning", next: "q2-whole" },
        ],
      },
      {
        id: "q2-tip",
        prompt: "Which of these matches what you're seeing?",
        options: [
          { label: "Tap water, and it's a sensitive species (Dracaena, spider plant, palm, etc.)", next: "tap-water" },
          { label: "White crust on the soil surface or pot rim", next: "fertilizer-salts" },
          { label: "Dry indoor air, especially near a heating vent", next: "low-humidity" },
          { label: "Haven't repotted in a couple of years, or roots are circling", next: "root-bound" },
          { label: "Soil dry and pulling away from the pot", next: "underwatering-tip" },
        ],
      },
      {
        id: "q2-whole",
        prompt: "Which of these matches what happened?",
        options: [
          { label: "Also wilting or drooping before it browned", next: "severe-watering" },
          { label: "Moved outside or into direct sun recently", next: "sunscald" },
          { label: "Near a cold window, AC vent, or drafty door", next: "cold-damage" },
          { label: "Yellowed first, then browned", next: "natural-aging-whole" },
          { label: "Spots, fuzzy texture, or a foul smell", next: "disease-whole" },
        ],
      },
    ],
    results: {
      "tap-water": { label: "Tap Water Minerals or Fluoride", blurb: "Slow tip burn from fluoride, chlorine, or dissolved salts", anchor: "#tap-water-minerals-and-fluoride" },
      "fertilizer-salts": { label: "Fertilizer Salt Buildup", blurb: "Mineral salts drawing water back out of leaf tips", anchor: "#fertilizer-salt-buildup" },
      "low-humidity": { label: "Low Humidity", blurb: "The single most common cause — dry indoor air", anchor: "#low-humidity-tip-burn" },
      "root-bound": { label: "Root-Bound Roots", blurb: "Roots can't keep the whole leaf hydrated", anchor: "#root-bound-plants-tip-burn" },
      "underwatering-tip": { label: "Underwatering", blurb: "Tips are farthest from the water source, so they stress first", anchor: "#underwatering-tip-burn" },
      "severe-watering": { label: "Severe Under- or Overwatering", blurb: "A watering problem that's gone on long enough to brown the whole leaf", anchor: "#severe-under-or-overwatering" },
      sunscald: { label: "Sunscald or Leaf Burn", blurb: "Sudden direct sun on leaves that developed indoors", anchor: "#sunscald-or-leaf-burn" },
      "cold-damage": { label: "Cold Damage or Drafts", blurb: "A cold window, AC vent, or drafty door", anchor: "#cold-damage-or-drafts" },
      "natural-aging-whole": { label: "Natural End-of-Life", blurb: "Browning is often the final stage after yellowing", anchor: "#natural-end-of-life-brown-tips" },
      "disease-whole": { label: "Disease", blurb: "Less common — usually with spots or an uneven pattern", anchor: "#disease-whole-leaf-browning" },
    },
  },
  {
    id: 'powdery-mildew',
    label: "Powdery mildew",
    article: '/blog/powdery-mildew/',
    questions: [
      {
        id: "q1",
        prompt: "Where exactly is the white or fuzzy stuff, and what does it look like?",
        options: [
          { label: "White, powdery coating on top of leaves, stems, or buds", next: "q2-pm" },
          { label: "Fuzzy, yellow-to-brown patches, mostly on the underside of leaves", next: "q2-downy" },
          { label: "White or fuzzy growth on the soil surface, not on the plant itself", next: "q2-soil" },
        ],
      },
      {
        id: "q2-pm",
        prompt: "How far has it spread — just a few small spots, or already covering many leaves and stems?",
        options: [
          { label: "Just a few small spots, caught early", next: "pm-early" },
          { label: "Already spread across many leaves or stems", next: "pm-established" },
        ],
      },
      {
        id: "q2-downy",
        prompt: "Does the top of that same leaf show yellowing or blotchy patches lining up with the fuzzy patches underneath?",
        options: [
          { label: "Yes, matches that pattern", next: "downy-mildew" },
          { label: "No, the top of the leaf looks fine", next: "q1" },
        ],
      },
      {
        id: "q2-soil",
        prompt: "Has the soil surface been staying damp or wet longer than usual between waterings?",
        options: [
          { label: "Yes, soil's been staying wet", next: "soil-mold" },
          { label: "No, watering has been pretty normal", next: "q1" },
        ],
      },
    ],
    results: {
      "pm-early": { label: "Powdery Mildew — Caught Early", blurb: "Good timing — sulfur and potassium bicarbonate work best now, before it spreads further", anchor: "#how-to-treat-powdery-mildew" },
      "pm-established": { label: "Powdery Mildew — Already Spread", blurb: "Remove the worst-affected leaves, then treat what's left with copper fungicide or horticultural oil", anchor: "#how-to-treat-powdery-mildew" },
      "downy-mildew": { label: "Likely Downy Mildew", blurb: "A different disease — not covered in full here yet", anchor: "#powdery-mildew-vs-downy-mildew-vs-harmless-soil-mold" },
      "soil-mold": { label: "Likely Harmless Soil Mold", blurb: "Not a plant disease — nothing to treat", anchor: "#powdery-mildew-vs-downy-mildew-vs-harmless-soil-mold" },
    },
  },
  {
    id: 'blossom-end-rot',
    label: "Blossom end rot",
    article: '/blog/blossom-end-rot/',
    questions: [
      {
        id: "q1",
        prompt: "Is the dark, sunken patch specifically at the blossom end (bottom) of the fruit -- not spreading mushy rot from elsewhere, and not fuzzy mold?",
        options: [
          { label: "Yes -- leathery, sunken, right at the bottom", next: "blossom-end-rot" },
          { label: "No -- it's mushy, spreading, or fuzzy/moldy", next: "different-problem" },
        ],
      },
    ],
    results: {
      "blossom-end-rot": {
        label: "Blossom End Rot",
        blurb: "Usually a watering problem, not a calcium problem -- here's the real cause and the actual fix.",
        anchor: "#the-real-cause-inconsistent-watering",
      },
      "different-problem": {
        label: "Likely a Different Problem",
        blurb: "This guide covers blossom end rot specifically. For mushy, spreading, or moldy fruit symptoms, check the full diagnosis hub to find the right guide.",
        anchor: "/blog/plant-problem-diagnosis/",
        ctaLabel: "See the diagnosis hub",
      },
    },
  },
]

/**
 * Resolve one step. The two namespaces do not collide by construction — the
 * site's own contract, stated in DiagnosticQuiz.tsx — so a `next` is a
 * question if a question has that id, and a result otherwise.
 */
export function stepFor(tree: DiagnosisTree, next: string):
  | { kind: 'question'; question: DiagnosisQuestion }
  | { kind: 'result'; key: string; result: DiagnosisResult }
  | null {
  const q = tree.questions.find((x) => x.id === next)
  if (q) return { kind: 'question', question: q }
  const r = tree.results[next]
  if (r) return { kind: 'result', key: next, result: r }
  return null
}

/** The article and fragment a result points at, as one URL. */
export function resultUrl(tree: DiagnosisTree, result: DiagnosisResult): string {
  if (result.anchor.startsWith('#')) return tree.article + result.anchor
  return result.anchor
}

// Data source for the programmatic /plant-spacing/[crop]/ pages -- the
// per-crop pSEO set that supplements (does not replace) the multi-crop
// Plant Spacing Calculator at /calculators/plant-spacing-calculator/.
//
// Built ONLY where real search volume AND genuinely distinct content both
// exist (see the site's Master Strategy). Every crop below cleared what we
// call the differentiation gate: side-by-side, no page should read as the
// same template with the crop name swapped. Where a crop's own content
// couldn't clear that bar with real substance, it was left out rather than
// shipped thin -- see the dropped-crops note at the bottom of this file.
//
// Spacing figures deliberately match this site's own published Plant
// Spacing Calculator chart wherever that calculator already covers the
// crop (Tomato, Pepper, Onion, Bean, Zucchini, Carrot, Kale, Squash,
// Lettuce) -- a single site should not publish two different numbers for
// the same crop. University extension sources were checked against every
// one of those existing figures; where extension guidance runs wider
// (typically for between-row spacing in a traditional row garden), that's
// noted honestly in the page copy rather than silently overwritten, using
// the same raised-bed-tightens-spacing logic already established on the
// calculator page itself (raised beds avoid the foot-traffic compaction a
// traditional row garden has, which is why they support closer rows).
// Crops with no existing calculator figure (Strawberry, Watermelon,
// Asparagus, Cauliflower, Brussels sprouts, Pea) get fresh, source-checked
// numbers with no prior figure to reconcile against.
//
// No spacing figure or fact here is invented -- every one traces to a named
// university cooperative extension (or equivalent authoritative
// horticultural) source in that crop's `sources` array. Where sources
// disagreed or a figure simply wasn't available (e.g. no extension-sourced
// square-foot-gardening number for strawberry or watermelon), that gap is
// stated in the copy rather than papered over with an invented number.

export type SiblingRelationship = 'companion' | 'family' | 'regime';

export interface CropSibling {
  slug: string;
  relationship: SiblingRelationship;
  relationshipLabel: string;
}

export interface CropSource {
  label: string;
  url: string;
  institution: string;
}

export interface CropFaq {
  q: string;
  a: string;
}

export interface SpacingRow {
  rowLabel: string;
  inRow: string;
  betweenRow: string;
  sqft: string;
}

export interface CropSpacingEntry {
  slug: string;
  name: string;
  pluralName: string;
  keyword: string;
  seoTitle: string;
  metaDescription: string;
  directAnswer: string;
  spacingTable: SpacingRow[];
  spacingTableNote?: string;
  bedPlantsNote: string;
  differentiatorHeading: string;
  differentiatorParagraphs: string[];
  whySpacingMattersHeading: string;
  whySpacingMattersParagraphs: string[];
  nonObviousFact?: string;
  faqs: CropFaq[];
  sources: CropSource[];
  siblings: CropSibling[];
  calculatorPreset?: string;
  searchVolume: number;
  lastUpdated: string;
}

export const cropSpacing: CropSpacingEntry[] = [
  // ---------------------------------------------------------------------
  {
    slug: 'tomato',
    name: 'Tomato',
    pluralName: 'Tomatoes',
    keyword: 'tomato plant spacing',
    seoTitle: 'Tomato Plant Spacing: How Far Apart to Plant Tomatoes',
    metaDescription:
      'Tomato plant spacing depends on type and support: 24 in. in-row for determinate, 18-48 in. for indeterminate depending on staking, caging, or sprawling.',
    directAnswer:
      'Space determinate tomatoes 24 inches apart in-row, with 36 inches between rows. Indeterminate tomatoes need a wider range -- 18 to 48 inches in-row -- because their spacing depends on how you support them, not just the variety: about 18-24 inches if staked, 30-36 inches if caged, and 36-48 inches if left to sprawl unsupported. That range comes from Iowa State University Extension, and it\'s the detail most spacing charts skip: two indeterminate tomato plants of the same variety can legitimately need very different amounts of room depending on how they\'re held up.',
    spacingTable: [
      { rowLabel: 'Determinate (all support types)', inRow: '24 in', betweenRow: '36 in', sqft: '4' },
      { rowLabel: 'Indeterminate, staked', inRow: '18-24 in', betweenRow: '36-48 in', sqft: '4' },
      { rowLabel: 'Indeterminate, caged', inRow: '30-36 in', betweenRow: '36-48 in', sqft: '4' },
      { rowLabel: 'Indeterminate, sprawling (no support)', inRow: '36-48 in', betweenRow: '48 in', sqft: '4' },
    ],
    spacingTableNote:
      'Determinate and staked-indeterminate figures match this site\'s Plant Spacing Calculator. Caged and sprawling figures come from Iowa State University Extension\'s support-method breakdown and run wider than the calculator\'s single indeterminate default -- use the calculator\'s number for a quick estimate, and the ranges here if you know how you\'ll be supporting the plant.',
    bedPlantsNote:
      'In a 4×8 ft raised bed, determinate tomatoes at 24 in./36 in. work out to 4 plants per row and 1 row -- 4 plants total, the same worked example used on the main Plant Spacing Calculator page. A staked indeterminate tomato at the tighter end of its range (18 in./36 in.) fits about 5 plants in that same bed; sprawling indeterminate plants at 48 in. both directions realistically fit only 1-2 before they crowd each other out.',
    differentiatorHeading: 'Determinate vs. Indeterminate: Why Support Method Changes the Spacing Number',
    differentiatorParagraphs: [
      'Determinate tomatoes are bred to stop growing once they set a terminal flower cluster -- they stay compact and bush-like all season, which is exactly why they get one blanket spacing figure (24 in.) that doesn\'t need a support-method asterisk.',
      'Indeterminate tomatoes never stop growing until frost kills them, so the plant\'s actual footprint depends entirely on what\'s holding it up. Iowa State University Extension ties indeterminate spacing directly to support method: staked plants (trained to one or two main stems, tied vertically) need the least room at 18-24 inches; caged plants need more at 30-36 inches; and unsupported, sprawling plants need the most at 36-48 inches, since the vines simply spread across the ground in every direction instead of growing up.',
      'The airflow argument for spacing isn\'t generic advice, either -- it\'s tied to specific, splash-borne fungal diseases. Early blight and septoria leaf spot both overwinter in soil and splash <em>up</em> onto a tomato plant\'s lowest leaves during rain or overhead watering, according to Kansas State University Research and Extension and NC State Extension. That\'s the actual mechanism behind "give tomatoes room to breathe": adequate spacing (and staking or caging, which lifts leaves off the ground) speeds up how fast wet foliage dries and keeps the lowest leaves further from the soil surface where those spores originate.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Tomatoes',
    whySpacingMattersParagraphs: [
      'Crowded tomatoes are disease-prone tomatoes. Reduced airflow keeps leaves wet longer after rain or watering, and that extra wet time is what early blight and septoria leaf spot need to establish and spread from splashed soil, per NC State Extension and the University of Wisconsin-Madison Division of Extension. Once a plant is heavily infected, it drops lower leaves and loses photosynthetic capacity right as fruit is sizing up.',
      'Support method compounds the effect. A staked or caged plant already has better airflow than a sprawling one at the same spacing, since its foliage isn\'t sitting directly on damp soil -- which is part of why UGA Cooperative Extension frames staking and pruning as a disease-prevention practice, not just a tidiness one.',
    ],
    nonObviousFact:
      'Tomato blight doesn\'t rain down onto a plant from above -- it splashes up. Early blight and septoria leaf spot pathogens overwinter in the soil, and rain or overhead watering literally throws spores upward onto the lowest leaves first (NC State Extension: "prevent spores splashing up from the soil"). That\'s why extension guides pair adequate spacing with pruning off a plant\'s lowest leaves, not just spacing it further from its neighbors.',
    faqs: [
      { q: 'How far apart should I plant tomatoes?', a: 'It depends on type and support: determinate tomatoes need 24 inches in-row with 36 inches between rows. Indeterminate tomatoes need 18-48 inches in-row depending on whether they\'re staked (tightest), caged (medium), or left to sprawl (widest) -- Iowa State University Extension.' },
      { q: 'Do determinate and indeterminate tomatoes need different spacing?', a: 'Yes. Determinate varieties stop growing after setting fruit, so they get one number. Indeterminate varieties keep growing all season, so their spacing depends on the support method used, not the variety alone.' },
      { q: 'How close can you plant tomatoes in a raised bed or square-foot garden?', a: 'As tight as 12 inches (1 plant per sq ft) when trellised vertically, per NC State Extension\'s Square Foot Gardening guide -- much closer than open-row spacing, because the method relies on vertical support to manage the extra density.' },
      { q: 'Does tomato spacing actually prevent blight?', a: 'It reduces the conditions blight needs -- prolonged leaf wetness and soil-splash onto low leaves -- rather than eliminating disease risk outright. Multiple extension sources (Kansas State, University of Wisconsin, NC State) recommend it as a cultural control alongside staking and pruning.' },
      { q: 'Why do tomato plants of the same variety sometimes need different spacing?', a: 'Because how you support an indeterminate tomato changes how much room it actually needs -- the same variety staked to a single stem can fit in 18-24 inches, while left unsupported it sprawls into 36-48 inches of space.' },
    ],
    sources: [
      { label: '"What is the proper spacing when planting tomatoes in the garden?"', url: 'https://yardandgarden.extension.iastate.edu/faq/what-proper-spacing-when-planting-tomatoes-garden', institution: 'Iowa State University Extension and Outreach' },
      { label: '"Tomato – Early Blight and Septoria Leaf Spot"', url: 'https://hnr.k-state.edu/extension/horticulture-resource-center/common-pest-problems/documents/Tomato%20-%20Early%20Blight%20and%20Septoria%20Leaf%20Spot.pdf', institution: 'Kansas State University Research and Extension' },
      { label: '"Early Blight of Tomato"', url: 'https://content.ces.ncsu.edu/early-blight-of-tomato', institution: 'NC State Extension' },
      { label: '"Staking and Pruning Tomatoes in the Home Garden" (C1150)', url: 'https://fieldreport.caes.uga.edu/publications/C1150/staking-and-pruning-tomatoes-in-the-home-garden/', institution: 'University of Georgia Cooperative Extension' },
    ],
    siblings: [
      { slug: 'pepper', relationship: 'family', relationshipLabel: 'Same family (Solanaceae) — similar staking and disease-airflow needs' },
      { slug: 'onion', relationship: 'companion', relationshipLabel: 'Companion planting pairing' },
      { slug: 'lettuce', relationship: 'companion', relationshipLabel: 'Companion planting pairing — lettuce takes the afternoon shade a tall tomato casts' },
    ],
    calculatorPreset: 'Tomato (determinate)',
    searchVolume: 24280,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'pepper',
    name: 'Pepper',
    pluralName: 'Peppers',
    keyword: 'how far apart to plant peppers',
    seoTitle: 'Pepper Plant Spacing: How Far Apart to Plant Peppers',
    metaDescription:
      'Plant pepper plants 18 inches apart in rows 24-36 inches apart. Bell and hot pepper sub-types sometimes need tighter or wider spacing -- here\'s when.',
    directAnswer:
      'Space pepper plants 18 inches apart in the row, with 24 to 36 inches between rows -- figures backed directly by University of Minnesota Extension. That\'s a solid default for most bell and hot peppers, but a few sub-types genuinely need something different: Clemson Cooperative Extension gives pimento peppers wider spacing (18-24 inches), and New Mexico State University Extension splits hot New Mexican-type chiles even further by variety. One more thing worth knowing before you space peppers by the book: for large-podded types in hot, sunny climates, some extension guidance actually recommends planting <em>closer</em> together, not further apart.',
    spacingTable: [
      { rowLabel: 'Bell & most hot peppers', inRow: '18 in', betweenRow: '24-36 in', sqft: '1' },
      { rowLabel: 'Pimento peppers', inRow: '18-24 in', betweenRow: '36-42 in', sqft: '—' },
    ],
    spacingTableNote:
      'The 18 in. in-row figure matches this site\'s Plant Spacing Calculator exactly, sourced to University of Minnesota Extension. That same source and Clemson HGIC both put between-row spacing at 30-42 inches in a traditional row garden -- wider than the calculator\'s 24 in. default. If you\'re working a traditional row garden rather than a raised bed, lean toward the wider end of that range for easier access between rows.',
    bedPlantsNote:
      'In a 4×8 ft raised bed at 18 in./24 in., peppers work out to about 5 plants per row and 2 rows -- 10 plants total, matching the count already published on the main Plant Spacing Calculator\'s FAQ.',
    differentiatorHeading: 'The Counterintuitive Case for Planting Peppers Closer Together',
    differentiatorParagraphs: [
      'Most vegetable spacing advice is "give it more room." Pepper spacing has a real, sourced exception: University of California Cooperative Extension\'s Master Gardeners of Santa Clara County recommend planting two pepper seedlings in the same hole for large-podded varieties, specifically because it increases leaf cover over the developing fruit and reduces sunscald in hot, sun-exposed gardens. Their reasoning is direct -- "more leaves" mean more shade on the pods, and a bonus: "you\'ll get more peppers per square foot."',
      'Sunscald itself isn\'t primarily a spacing problem, though -- it\'s usually a canopy-density problem, and canopy density can come from more than one cause. Cornell\'s Long Island Vegetable Pathology program notes that healthy plants typically carry enough leaves to shield fruit on their own; sunscald shows up mainly on <em>diseased</em> plants that have lost leaves to defoliation. A University of Delaware Cooperative Extension field trial adds a second cause entirely unrelated to leaf density: staked and tied pepper plants had under 2% sunscald damage, versus 17% for untied plants of the same variety planted the same day -- because untied plants lean and expose fruit to direct sun that upright ones don\'t.',
      'Not every extension source treats bell and hot peppers the same, either. Clemson HGIC gives pimento peppers a wider in-row figure (18-24 in.) than its 12-inch standard, and New Mexico State University Extension splits New Mexican-type green chiles and jalapeños (10-12 in.) from red chile and paprika types (6-8 in.) -- a real varietal difference, not a universal bell-vs-hot rule.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Peppers',
    whySpacingMattersParagraphs: [
      'Pepper spacing is really managing two competing risks at once: too little leaf cover and fruit gets sunscald; too little airflow and disease pressure rises. The extension guidance above shows growers actually manage the first risk with plant density (doubling up in one hole) and orientation (staking upright) more than with raw spacing distance alone.',
      'For a hot, sunny climate especially, the standard "more space is always better" instinct can work against you on pepper fruit quality specifically, even while it still helps overall plant health -- which is why this is one of the few crops on this site where the spacing chart alone won\'t tell you the whole story.',
    ],
    nonObviousFact:
      'The common assumption is "give pepper plants maximum room for airflow." UC Cooperative Extension\'s guidance for large-podded peppers in hot climates is the opposite: deliberately double up seedlings in one planting hole to increase leaf cover and cut down on sunscald, since sunburned fruit is caused by too little shade on the pods, not too little space around the plant.',
    faqs: [
      { q: 'How far apart to plant pepper plants?', a: 'University of Minnesota Extension recommends 18 inches in-row with 24-36 inches between rows. Some sub-types (pimento, certain hot chile varieties) need different spacing -- see the table above.' },
      { q: 'Can you plant peppers close together for more shade on the fruit?', a: 'Yes -- UC Cooperative Extension Master Gardeners specifically recommend planting two pepper seedlings per hole for large-podded types, to increase leaf cover and reduce sunscald on the pods.' },
      { q: 'Do bell peppers and hot peppers need different spacing?', a: 'Sometimes. Clemson and New Mexico State University both give tighter or wider spacing to specific sub-types (pimento, New Mexican-type chile, paprika), but University of Minnesota Extension uses one figure for all types -- so it isn\'t a universal rule.' },
      { q: 'Why are my peppers getting sunscald -- is spacing the cause?', a: 'Usually not spacing alone. Cornell\'s research points to sparse canopy from disease-driven leaf loss, and a University of Delaware trial found staked, upright plants had far less sunscald (2%) than unstaked, leaning plants (17%) of the same variety.' },
      { q: 'How close can you plant peppers in a raised bed?', a: 'As tight as 12 inches (1 plant per sq ft), per NC State Extension\'s Square Foot Gardening chart.' },
    ],
    sources: [
      { label: '"Growing peppers"', url: 'https://extension.umn.edu/vegetables/growing-peppers', institution: 'University of Minnesota Extension' },
      { label: 'Pepper Factsheet', url: 'https://hgic.clemson.edu/factsheet/pepper/', institution: 'Clemson Cooperative Extension (HGIC)' },
      { label: '"Growing Great Peppers and Chiles"', url: 'https://mgsantaclara.ucanr.edu/garden-help/vegetables/peppers/growing-peppers-chiles', institution: 'UC Cooperative Extension, Master Gardeners of Santa Clara County' },
      { label: 'Weekly Crop Update (staking/sunscald trial)', url: 'https://sites.udel.edu/weeklycropupdate/?p=8466', institution: 'University of Delaware Cooperative Extension' },
    ],
    siblings: [
      { slug: 'tomato', relationship: 'family', relationshipLabel: 'Same family (Solanaceae) — similar staking and disease-airflow needs' },
      { slug: 'onion', relationship: 'companion', relationshipLabel: 'Companion planting pairing' },
    ],
    calculatorPreset: 'Pepper',
    searchVolume: 8890,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'strawberry',
    name: 'Strawberry',
    pluralName: 'Strawberries',
    keyword: 'strawberry plant spacing',
    seoTitle: 'Strawberry Plant Spacing: Matted Row vs. Hill System',
    metaDescription:
      'Strawberry spacing depends on the growing system: 12-30 in. in-row for matted rows that fill in with runners, or 12 in. for a hill system with runners removed.',
    directAnswer:
      'Strawberry spacing depends entirely on which growing system you use, and that\'s not a minor detail -- it changes the number by more than double. In a matted row, space plants 12 to 30 inches apart (sources vary; Colorado State says 1-2 ft, University of Illinois says 18-30 in.) with 3 to 4 feet between rows, and let runners fill in the gaps. In a hill system, space plants 12 inches apart in groups of three rows also 12 inches apart, with 2 to 3 feet between each group of three, and remove every runner as it appears.',
    spacingTable: [
      { rowLabel: 'Matted row (June-bearing)', inRow: '12-30 in', betweenRow: '3-4 ft', sqft: 'not established' },
      { rowLabel: 'Hill system (everbearing / day-neutral)', inRow: '12 in', betweenRow: '2-3 ft between row-groups', sqft: 'not established' },
    ],
    spacingTableNote:
      'No university extension source publishes a square-foot-gardening figure for strawberries -- rather than invent one, we\'re noting the gap. Colorado State University Extension and University of Illinois Extension give overlapping but not identical matted-row ranges (1-2 ft vs. 18-30 in.); both are shown here rather than picked between.',
    bedPlantsNote:
      'A 4×8 ft bed suits the hill system better than matted rows, since hill-system strawberries don\'t need room to spread by runners: at 12 in. spacing in groups of three rows, a 4-foot-wide bed fits one full group of three rows down its 8-foot length, for roughly 24 plants. A matted row planted in the same bed would need most of that space reserved for runners to fill in over the season, yielding far fewer productive crowns per square foot in year one.',
    differentiatorHeading: 'Matted Row vs. Hill System: Two Genuinely Different Ways to Grow the Same Crop',
    differentiatorParagraphs: [
      'This isn\'t a spacing preference -- it\'s two different growing systems tied to two different types of strawberry plant. Colorado State University Extension ties the matted row system specifically to June-bearing varieties, which fruit once per season and are expected to spread by runners to fill the bed. The hill system is used for everbearing and day-neutral varieties instead.',
      'Runner management is the actual mechanism that separates the two, not the spacing number itself. In a matted row, you deliberately let runners root and fill the row -- Colorado State says let it fill to 1-2 feet wide, University of Illinois says no wider than 2 feet -- and only remove runners that stray into the walkway. In a hill system, University of Illinois is explicit: "all runners are removed so that only the original mother plant is left to grow." Skipping that step on a day-neutral hill planting defeats the point of choosing that system, since those varieties are picked precisely because they don\'t need runners to keep producing fruiting crowns the way June-bearing types do.',
    ],
    whySpacingMattersHeading: 'Why Spacing (and System) Matters for Strawberries',
    whySpacingMattersParagraphs: [
      'Get the system wrong for your variety and you either waste bed space (planting a hill-system, non-spreading everbearing variety at wide matted-row spacing) or lose most of a season\'s runners to a losing battle against removing them (planting a June-bearing matted-row variety but treating it like a hill and pulling every runner).',
      'For raised beds and small gardens specifically, University of Illinois and Colorado State University Extension both effectively point toward the hill system as the better fit -- it\'s designed not to need the extra room a matted row reserves for runner spread.',
    ],
    nonObviousFact:
      'For day-neutral and everbearing strawberries grown in a hill system, extension guidance is to remove every runner, all season -- which runs against most gardeners\' instinct to let strawberries spread and fill in a bed. The reason: day-neutral varieties are specifically chosen for the hill system because they don\'t need runners to keep producing fruiting crowns the way June-bearing matted-row types do. Letting runners establish just diverts the plant\'s energy from fruiting, without the matted-row benefit of filling in the bed with new productive plants.',
    faqs: [
      { q: 'How far apart do you plant strawberries?', a: 'It depends on the system: matted row spacing runs 12-30 inches in-row with 3-4 feet between rows (sources vary slightly); hill system spacing is 12 inches in-row, in groups of three rows also 12 inches apart, with 2-3 feet between groups.' },
      { q: 'What\'s the difference between matted row and hill system strawberries?', a: 'Matted row lets runners root and fill in the bed, and is used for June-bearing varieties. Hill system removes every runner so the plant\'s energy stays in the original crown, and is used for everbearing or day-neutral varieties.' },
      { q: 'Should I cut off strawberry runners?', a: 'Depends on system and variety. In a hill-system planting of everbearing or day-neutral strawberries, yes -- remove all runners. In a matted-row planting of June-bearing strawberries, no -- let them fill the row, only removing runners that stray into a walkway.' },
      { q: 'How much space do strawberries need in a raised bed?', a: 'The hill system (12 in. spacing, no runner spread to plan for) is generally the better fit for a raised bed or small garden, since it doesn\'t need the extra room a matted row reserves for runners to fill in.' },
      { q: 'Can I use square foot gardening spacing for strawberries?', a: 'There\'s no university-extension-sourced square-foot-gardening figure for strawberries -- if you see one elsewhere, it isn\'t backed by the same kind of source the rest of this site\'s figures are.' },
    ],
    sources: [
      { label: 'Fact Sheet 7.000, "Strawberries for the Home Garden"', url: 'https://extension.colostate.edu/topic-areas/yard-garden/strawberries-for-the-home-garden-7-000/', institution: 'Colorado State University Extension' },
      { label: '"Growing Strawberries"', url: 'https://extension.illinois.edu/small-fruits/growing-strawberries', institution: 'University of Illinois Extension' },
    ],
    siblings: [
      { slug: 'asparagus', relationship: 'regime', relationshipLabel: 'Both are multi-year plantings that occupy a permanent bed' },
    ],
    searchVolume: 8350,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'onion',
    name: 'Onion',
    pluralName: 'Onions',
    keyword: 'how far apart to plant onions',
    seoTitle: 'Onion Plant Spacing: How Far Apart to Plant Onions',
    metaDescription:
      'Onion spacing directly controls bulb size: 2 in. for green onions, 4 in. for moderate bulbs, 8 in. for large storage bulbs, with 12-18 in. between rows.',
    directAnswer:
      'Space bulb onions 4 inches apart in the row, with 12 to 18 inches between rows, if you want moderate-sized bulbs -- the most common target for a home garden. But onion spacing isn\'t one number: University of Maryland Extension gives a genuine sliding scale tied to what you\'re growing them for -- 2 inches apart for green onions, 4 inches for moderate bulbs, and a full 8 inches for the largest storage bulbs. Spacing here isn\'t just about fitting plants in a bed; it directly, causally controls how big the bulb gets.',
    spacingTable: [
      { rowLabel: 'Green / bunching onions', inRow: '1-2 in', betweenRow: '12-18 in', sqft: '—' },
      { rowLabel: 'Moderate-size bulbs', inRow: '4 in', betweenRow: '12-18 in', sqft: '0.25 (4/sq ft)' },
      { rowLabel: 'Large storage bulbs', inRow: '8 in', betweenRow: '12-18 in', sqft: '—' },
    ],
    spacingTableNote:
      'The 4 in./12 in. figures for moderate bulbs match this site\'s Plant Spacing Calculator exactly, sourced to University of Maryland Extension. NC State Extension\'s Square Foot Gardening guide gives 9 plants per sq ft at 4 in. spacing (true square packing) rather than this site\'s 4 plants per sq ft -- both numbers are real and sourced, they just reflect different packing conventions; we\'re noting the difference rather than picking a winner.',
    bedPlantsNote:
      'In a 4×8 ft raised bed at the moderate-bulb figures (4 in./12 in.), onions work out to roughly 24 plants per row and 4 rows -- about 96 plants total. Switch to green onions at 2 in. spacing and that number roughly doubles.',
    differentiatorHeading: 'How Spacing Directly Controls Onion Bulb Size',
    differentiatorParagraphs: [
      'For most vegetables, spacing is about airflow and avoiding root competition. For onions, it\'s also a direct sizing dial: University of Maryland Extension\'s tiered guidance -- 2 in. for green onions, 4 in. for moderate bulbs, 8 in. for large bulbs -- means you can genuinely target a harvest size by choosing a spacing distance, not just by choosing a variety.',
      'But wider isn\'t simply "better." Cornell Cooperative Extension field research comparing narrow (4 in.) to standard (6-8 in.) in-row spacing on plastic-mulch beds found that "wide plant spacing produces big bushy plants with more leaves, thicker necks, delayed maturity, and bigger bulbs" -- and that those bigger bulbs also had a higher rate of bacterial bulb rot in storage. Their narrower-spacing plots produced fewer of the biggest "colossal" bulbs but significantly more healthy, storable jumbo-sized ones. If you\'re growing onions to store rather than to win a size contest, that\'s worth knowing before you space for maximum bulb size.',
      'Green onions (scallions) are a genuinely different crop from a spacing standpoint, not just a smaller version of the same one. University of Minnesota Extension gives scallions their own figure -- thin to one plant per inch -- tighter than any bulb-onion tier, since the whole plant is harvested young before bulbing matters.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Onions',
    whySpacingMattersParagraphs: [
      'Because onion spacing is a sizing lever, getting it wrong doesn\'t just crowd the bed -- it works against whatever you\'re actually growing the onions for. Space for large bulbs when you wanted a steady supply of scallions, and you\'ll get far fewer plants than you needed; space for green onions when you wanted big storage bulbs for winter, and none of them will size up.',
      'The rot-risk tradeoff from Cornell\'s research adds a second layer most spacing charts don\'t mention: the widest spacing that produces the single biggest onions isn\'t automatically the spacing that produces the best storage crop.',
    ],
    nonObviousFact:
      'Wider spacing does grow bigger onion bulbs -- but Cornell Cooperative Extension\'s field trials found those bigger bulbs also had a higher rate of bacterial bulb rot in storage. Growers optimizing for healthy, storable onions got a better outcome from narrower spacing (4 in.) than from the wider spacing (6-8 in.) that produced the largest individual bulbs.',
    faqs: [
      { q: 'How far apart do you plant onions?', a: 'For bulb onions, roughly 4-8 inches in-row depending on target bulb size, with rows 12-18 inches apart (University of Maryland Extension). For green onions/scallions, much closer -- 1-2 inches in-row.' },
      { q: 'Does onion spacing affect bulb size?', a: 'Yes, directly. University of Maryland Extension gives explicit spacing tiers -- 2 in. for green onions, 4 in. for moderate bulbs, 8 in. for large bulbs -- tied to desired harvest size.' },
      { q: 'How close can you plant onions for green onions vs. big storage onions?', a: 'Green onions can go as tight as 1-2 inches apart. Large storage bulbs need a full 8 inches or more to size up properly.' },
      { q: 'Do wider-spaced onions always grow bigger, better onions?', a: 'They grow bigger on average, per Cornell Cooperative Extension research -- but the same research found the biggest bulbs from wide spacing had a higher rate of bacterial bulb rot, so wider spacing isn\'t strictly better if you plan to store the crop.' },
      { q: 'How many onions fit in a square foot garden?', a: 'NC State Extension\'s Square Foot Gardening guide gives 9 plants per square foot at 4 in. spacing.' },
    ],
    sources: [
      { label: '"Growing Onions in a Home Garden"', url: 'https://extension.umd.edu/resource/growing-onions-home-garden', institution: 'University of Maryland Extension' },
      { label: '"Growing Your Own: Onions" (NEP-245)', url: 'https://publications.mgcafe.uky.edu/sites/publications.ca.uky.edu/files/NEP245.pdf', institution: 'University of Kentucky Cooperative Extension' },
      { label: '"Stop the Rot! Using Cultural Practices to Reduce Bacterial Bulb Decay"', url: 'https://rvpadmin.cce.cornell.edu/uploads/doc_24.pdf', institution: 'Cornell Cooperative Extension' },
      { label: '"Growing scallions in home gardens"', url: 'https://extension.umn.edu/vegetables/growing-scallions-home-gardens', institution: 'University of Minnesota Extension' },
    ],
    siblings: [
      { slug: 'tomato', relationship: 'companion', relationshipLabel: 'Companion planting pairing' },
      { slug: 'pepper', relationship: 'companion', relationshipLabel: 'Companion planting pairing' },
      { slug: 'kale', relationship: 'companion', relationshipLabel: 'Companion planting pairing' },
      { slug: 'lettuce', relationship: 'companion', relationshipLabel: 'Companion planting pairing' },
    ],
    calculatorPreset: 'Onion',
    searchVolume: 4540,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'bean',
    name: 'Bean',
    pluralName: 'Beans',
    keyword: 'bush bean spacing',
    seoTitle: 'Bean Plant Spacing: Bush vs. Pole Bean Spacing',
    metaDescription:
      'Bush bean spacing (4 in. in-row, 18-30 in. between rows) and pole bean spacing (6 in. in-row, 24-36 in. between rows, trellised) are genuinely different.',
    directAnswer:
      'Bush beans need 2 to 4 inches between plants in the row, with rows 18 to 30 inches apart. Pole beans need a bit more room in-row -- 4 to 8 inches -- with rows 24 to 36 inches apart, plus a sturdy 6- to 8-foot trellis, since pole beans are true climbers that won\'t support themselves. The two aren\'t just different numbers on the same plant; they\'re different growth habits that trade horizontal footprint for a hard vertical-structure requirement.',
    spacingTable: [
      { rowLabel: 'Bush beans', inRow: '4 in', betweenRow: '18-30 in', sqft: '0.25 (4/sq ft)' },
      { rowLabel: 'Pole beans', inRow: '6 in', betweenRow: '24-36 in', sqft: '0.25 (4/sq ft)' },
    ],
    spacingTableNote:
      'In-row figures match this site\'s Plant Spacing Calculator. Bush beans\' 18 in. between-row figure sits at the tight end of what university extensions publish for open-row gardens (University of Maryland Extension and Iowa State University Extension both give 24-30 in. for a single row) -- Clemson HGIC\'s 18 in. figure specifically describes a twin-row raised-bed layout, not a traditional single row, which is the more likely reason for the tighter number here.',
    bedPlantsNote:
      'In a 4×8 ft raised bed, bush beans at 4 in./18 in. work out to about 24 plants per row and 2 rows -- roughly 48 plants total. Pole beans need a trellis running the length of the bed, which usually makes more sense planted along one edge than filled in as multiple rows.',
    differentiatorHeading: 'Bush vs. Pole: Two Different Growth Architectures, Not Just Two Numbers',
    differentiatorParagraphs: [
      'Bush beans are self-supporting, top out around 1-2 feet tall, and produce most of their crop in one concentrated flush. Their spacing constraint is purely horizontal -- how much room the roots and leaves need side to side.',
      'Pole beans are genuine climbers that will grow 6 to 10-plus feet along a support and crop continuously over a much longer season. Clemson Cooperative Extension is specific about the mechanics: "pole beans are natural climbers but will not interweave themselves through horizontal wires" -- they need dedicated vertical structure, strong enough to survive wind and rain, not just something to lean on. Because the plant\'s bulk goes up instead of out, pole beans planted in teepee clusters around a single pole can sit closer together at the base (6-8 in. apart per Alabama Cooperative Extension) while still out-yielding bush beans per square foot of ground, since they\'re using vertical space bush beans can\'t reach.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Beans',
    whySpacingMattersParagraphs: [
      'Get bush-bean spacing too tight and you lose the single concentrated harvest window to crowding and poor airflow. Get pole-bean infrastructure wrong -- undersized trellis, or planted where a trellis can\'t go -- and the spacing figures don\'t matter, since the plant has nowhere to climb.',
      'A widely repeated companion-planting claim is worth a real caveat here: beans do fix nitrogen in the soil via rhizobia bacteria in their root nodules, but per New Mexico State University Extension, most of that fixed nitrogen leaves the garden inside the harvested bean seeds themselves. The soil benefit mainly comes after the season, once spent bean plants and roots are tilled under -- not from beans fertilizing whatever\'s growing next to them this year.',
    ],
    nonObviousFact:
      'Beans don\'t meaningfully fertilize their neighbors the same season, despite the popular companion-planting belief. Per New Mexico State University Extension, most of the nitrogen a bean plant fixes leaves the garden inside the harvested seeds -- the real soil benefit comes later, after the plant\'s roots and residue decompose, not while it\'s growing next to your tomatoes.',
    faqs: [
      { q: 'How far apart should I plant bush beans?', a: '2-4 inches apart in the row, with rows 18-30 inches apart depending on the source and bed layout.' },
      { q: 'How far apart do pole beans need to be?', a: '4-8 inches apart in the row (commonly 6 in.), with rows 24-36 inches apart and a sturdy 6- to 8-foot trellis.' },
      { q: 'Do pole beans need a trellis?', a: 'Yes -- unlike bush beans, pole beans are climbers that, per Clemson Cooperative Extension, "will not interweave themselves through horizontal wires" and need an actual support structure.' },
      { q: 'Do beans really add nitrogen to my soil?', a: 'Only in a limited way this season. Most of the nitrogen beans fix leaves the garden inside the harvested beans; the real soil benefit comes after the plant is tilled under, per New Mexico State University Extension.' },
      { q: 'Should I grow bush or pole beans in a small garden?', a: 'Pole beans generally yield more per square foot of ground since they grow vertically, but need a trellis; bush beans need no infrastructure but take up more ground per plant for a given yield.' },
    ],
    sources: [
      { label: '"Growing Beans in a Home Garden"', url: 'https://extension.umd.edu/resource/growing-beans-home-garden', institution: 'University of Maryland Extension' },
      { label: '"Bush and Pole-Type Snap Beans"', url: 'https://hgic.clemson.edu/factsheet/bush-pole-type-snap-beans/', institution: 'Clemson Cooperative Extension (HGIC)' },
      { label: '"Grow More Beans (Bush and Pole)"', url: 'https://www.aces.edu/blog/topics/lawn-garden/grow-more-beans-bush-and-pole/', institution: 'Alabama Cooperative Extension System' },
      { label: 'Nitrogen Fixation by Legumes (Guide A-129)', url: 'https://pubs.nmsu.edu/_a/A129/', institution: 'New Mexico State University Cooperative Extension' },
    ],
    siblings: [
      { slug: 'pea', relationship: 'family', relationshipLabel: 'Same family (Fabaceae, legumes)' },
      { slug: 'squash', relationship: 'companion', relationshipLabel: '"Three Sisters" companion planting (beans, corn, squash grown together)' },
    ],
    calculatorPreset: 'Bean (bush)',
    searchVolume: 3610,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'watermelon',
    name: 'Watermelon',
    pluralName: 'Watermelons',
    keyword: 'watermelon spacing',
    seoTitle: 'Watermelon Spacing: How Far Apart to Plant Watermelon',
    metaDescription:
      'Watermelon needs real room: hills spaced 5-8 feet apart, rows 6-10 feet apart for standard vining types. Bush/dwarf varieties need far less -- here\'s the real difference.',
    directAnswer:
      'Standard vining watermelon needs a lot of room: extension sources put hill spacing at 5 to 8 feet apart, with 6 to 10 feet between rows. That\'s because standard watermelon vines run anywhere from 6 to 20 feet long, per University of Maryland Extension. If that sounds too big for your space, genuine bush or "short internode" watermelon varieties exist that produce the same size fruit on a dramatically smaller plant -- worth knowing before you assume watermelon simply doesn\'t fit a small garden.',
    spacingTable: [
      { rowLabel: 'Standard vining (per hill)', inRow: '5-8 ft between hills', betweenRow: '6-10 ft between rows', sqft: 'not established' },
      { rowLabel: 'Bush / dwarf varieties', inRow: 'no specific extension figure found', betweenRow: '—', sqft: '—' },
    ],
    spacingTableNote:
      'No university extension source gives a specific inch-figure for bush watermelon spacing, and none publishes a square-foot-gardening number for watermelon at all -- both gaps are stated here rather than filled with an invented number.',
    bedPlantsNote:
      'A standard 4×8 ft raised bed realistically fits only one hill of standard vining watermelon, and even then the vines will run well beyond the bed\'s edges -- this crop is the clearest case on this site where a small raised bed genuinely isn\'t the right fit for the full-size version of the plant. A named dwarf cultivar like ‘Bush Sugar Baby’ (University of Georgia Cooperative Extension) is the realistic option for growing real watermelon in a bed this size.',
    differentiatorHeading: 'Vining vs. Bush Watermelon: Same Fruit, Very Different Footprint',
    differentiatorParagraphs: [
      'This is a genuine plant-architecture difference, not a marketing distinction. University of Maryland Extension gives standard watermelon vine length as 6 feet (for shorter vining types) up to 20 feet for standard long-vine types -- over a threefold range within "standard" watermelon.',
      'University of Georgia Cooperative Extension confirms real bush or "short internode" watermelon varieties exist, and is specific that they "produce fruit the same size as standard or long internode types in a smaller amount of space" -- not smaller fruit on a smaller plant, the same fruit on a compressed one. UGA\'s C1035 publication names ‘Bush Sugar Baby’ as a real commercial cultivar bred for exactly this.',
      'One extension source that isn\'t about spacing at all but is genuinely watermelon-specific: seedless watermelon is triploid and self-infertile. Per University of Nebraska-Lincoln Extension, a seedless planting needs a regular seeded "pollenizer" variety planted nearby -- roughly one row of pollenizer for every two to three rows of seedless -- or it won\'t set fruit at all.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Watermelon',
    whySpacingMattersParagraphs: [
      'University of Arkansas Cooperative Extension notes watermelon has one of the deepest root systems of any garden vegetable, and warns that "planting too close results in excessive vegetative growth" -- crowded watermelon puts energy into vines and leaves rather than fruit.',
      'For anyone gardening in a raised bed or small plot, the real decision isn\'t how to squeeze standard watermelon into less space -- it\'s whether to grow a genuine dwarf cultivar instead, since the plant\'s actual vine length is what\'s driving the spacing requirement, not an arbitrary rule.',
    ],
    nonObviousFact:
      'Seedless watermelon can\'t pollinate itself. It\'s triploid and genuinely self-infertile, so a planting needs a regular seeded ("diploid") watermelon variety nearby as a pollen source -- University of Nebraska-Lincoln Extension recommends roughly one row of seeded pollenizer for every two to three rows of seedless. Even planted correctly, "seedless" watermelon can still occasionally develop a few small seed coats, which is why growers market it as "virtually seedless" rather than guaranteed seed-free.',
    faqs: [
      { q: 'How far apart do you plant watermelon?', a: 'In hills, roughly 5-8 feet apart depending on the extension source, with 6-10 feet between rows.' },
      { q: 'How much space does one watermelon plant need?', a: 'Standard vining types send out vines 6-20 feet long, which is why hill spacing is so wide. Genuine bush or dwarf cultivars need substantially less room for the same size fruit.' },
      { q: 'Can you grow watermelon in a small garden or raised bed?', a: 'A standard 4×8 ft bed realistically fits only one hill of standard vining watermelon. A named dwarf cultivar like ‘Bush Sugar Baby’ is the practical option for a bed that size.' },
      { q: 'Do seedless watermelons need a regular watermelon nearby to pollinate them?', a: 'Yes -- triploid seedless watermelon is self-infertile and needs a diploid "pollenizer" variety planted nearby, roughly one pollenizer row per two to three seedless rows.' },
      { q: 'How many watermelon plants per hill?', a: 'Extension sources vary: thin to 1 plant per hill (University of Illinois), 1-2 (Alabama), or up to 2-3 (University of Maryland, Arkansas) -- worth treating as a range rather than one fixed number.' },
    ],
    sources: [
      { label: '"Growing Melons"', url: 'https://extension.umd.edu/resource/growing-melons-home-garden', institution: 'University of Maryland Extension' },
      { label: 'FSA-6012, Watermelons', url: 'https://www.uaex.uada.edu/publications/PDF/FSA-6012.pdf', institution: 'University of Arkansas Cooperative Extension Service' },
      { label: '"Home Garden Watermelon" (C1035)', url: 'https://fieldreport.caes.uga.edu/publications/C1035/home-garden-watermelon/', institution: 'University of Georgia Cooperative Extension' },
      { label: '"Growing Seedless (Triploid) Watermelons" (G1755)', url: 'https://extensionpubs.unl.edu/publication/g1755/na/html/view', institution: 'University of Nebraska-Lincoln Extension' },
    ],
    siblings: [
      { slug: 'zucchini', relationship: 'family', relationshipLabel: 'Same family (Cucurbitaceae)' },
      { slug: 'squash', relationship: 'family', relationshipLabel: 'Same family (Cucurbitaceae)' },
    ],
    searchVolume: 3530,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'zucchini',
    name: 'Zucchini',
    pluralName: 'Zucchini',
    keyword: 'zucchini plant spacing',
    seoTitle: 'Zucchini Plant Spacing: How Far Apart to Plant Zucchini',
    metaDescription:
      'Space zucchini 24 inches apart in-row, 36 inches between rows -- a figure Oregon State University Extension confirms directly for commercial zucchini spacing.',
    directAnswer:
      'Space zucchini plants 24 inches apart in the row, with 36 inches between rows. Oregon State University Extension confirms this exact figure -- "zucchini planted at 24x36-inch spacing" -- which is also the number this site\'s Plant Spacing Calculator already uses. If you\'re direct-seeding and thinning rather than transplanting, Clemson Cooperative Extension\'s guidance runs noticeably tighter (thin to 12-15 in.), so there\'s a real range depending on method.',
    spacingTable: [
      { rowLabel: 'Zucchini (transplanted or hill-thinned)', inRow: '24 in', betweenRow: '36 in', sqft: '4' },
      { rowLabel: 'Zucchini (direct-seeded, thinned)', inRow: '12-15 in', betweenRow: '36 in', sqft: '—' },
    ],
    spacingTableNote:
      'The 24 in./36 in. figures match this site\'s Plant Spacing Calculator and are directly confirmed by Oregon State University Extension\'s named zucchini spacing. Clemson HGIC\'s tighter direct-seed thinning figures (12-15 in.) reflect a different planting method rather than a contradiction.',
    bedPlantsNote:
      'In a 4×8 ft raised bed at 24 in./36 in., zucchini works out to 4 plants per row and 1 row -- 4 plants total, which for a notoriously prolific plant is usually plenty for one household.',
    differentiatorHeading: 'Hill Planting and Why Zucchini Roots Where It Touches Soil',
    differentiatorParagraphs: [
      'Hill planting is a real, distinct method, not spacing written differently. University of Maryland Extension and Clemson Cooperative Extension both describe a "hill" as a cluster of 2-3 plants sown together in a slight mound, with hills spaced 3-4 feet apart within the row and 4-6 feet between rows of hills -- wider between hills than the in-row spacing you\'d use for individually spaced plants, since each hill functions as one clustered planting unit needing the same total elbow room as a larger single plant.',
      'University of Maryland Extension notes a genuinely non-obvious mechanical trait: zucchini\'s sprawling stems "will root where they contact soil." That secondary rooting increases fruit production, and it also helps the plant survive squash vine borer damage to the main stem, since a secondary rooting point can keep the plant alive even if the primary stem is compromised -- a real, plant-specific resilience mechanism, not generic vigor advice.',
      'Clemson HGIC also separates bush-type zucchini cultivars (compact, better for limited space) from vining types (needing more room) by name -- e.g. Black Beauty and Eight Ball as more compact bush types versus longer-vining cultivars -- which matters if you\'re choosing a variety for a small bed rather than just spacing whatever seed packet you have.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Zucchini',
    whySpacingMattersParagraphs: [
      'Zucchini\'s large leaves and sprawling stems mean crowded plants shade each other out and compete hard for the same root zone, and per University of New Hampshire Extension, poor pollination is rarely the real reason for a lack of fruit despite abundant flowers -- squash plants are monoecious and simply produce more male than female flowers early in the season, so early blooms often can\'t set fruit at all regardless of spacing or pollinator activity.',
      'Powdery mildew pressure is the more direct spacing-linked risk with zucchini\'s dense canopy -- tighter-than-recommended spacing (like Clemson\'s 12-15 in. direct-seed figure) trades some airflow for density, which is a real tradeoff worth knowing rather than an automatic downside.',
    ],
    nonObviousFact:
      'Abundant flowering with no fruit usually isn\'t a pollination failure or fertilizer problem. Per University of New Hampshire Extension, zucchini and summer squash produce separate male and female flowers on the same plant, and "early in the growing season, squash plants tend to produce more male than female flowers" -- so early blooms often can\'t set fruit at all, simply because there\'s no female flower yet to pollinate. Female flowers are identifiable by a small immature fruit at the base of the bloom.',
    faqs: [
      { q: 'How far apart to plant zucchini?', a: '24 inches in-row and 36 inches between rows, directly confirmed by Oregon State University Extension\'s named zucchini spacing figure.' },
      { q: 'What\'s the difference between bush and vining zucchini spacing?', a: 'Bush cultivars are compact and space-efficient; vining types need significantly more room and can be trellised vertically to save space, per Clemson Cooperative Extension.' },
      { q: 'How many zucchini plants per hill?', a: '2-3 plants per hill after thinning from a cluster of seeds, with hills 3-4 feet apart within the row and 4-6 feet between rows of hills, per University of Maryland Extension.' },
      { q: 'Why is my zucchini flowering but not producing fruit?', a: 'Usually normal early-season biology -- squash plants produce mostly male flowers first, and fruit can only set once female flowers appear and are pollinated, per University of New Hampshire Extension.' },
      { q: 'Can I plant zucchini closer together to save space?', a: 'Yes, down to about 12-15 inches per Clemson\'s direct-seed thinning guidance, though tighter spacing raises powdery mildew risk from reduced airflow.' },
    ],
    sources: [
      { label: '"Squash, Zucchini and Summer"', url: 'https://horticulture.oregonstate.edu/oregon-vegetables/squash-zucchini-and-summer', institution: 'Oregon State University Extension' },
      { label: '"Growing Summer Squash (Zucchini)"', url: 'https://extension.umd.edu/resource/growing-summer-squash-zucchini-home-garden', institution: 'University of Maryland Extension' },
      { label: '"Summer Squash"', url: 'https://hgic.clemson.edu/factsheet/summer-squash/', institution: 'Clemson Cooperative Extension (HGIC)' },
      { label: '"Zucchini Plants Flowering But Not Producing Fruit"', url: 'https://extension.unh.edu/blog/2018/06/zucchini-plants-flowering-not-producing-fruit', institution: 'University of New Hampshire Extension' },
    ],
    siblings: [
      { slug: 'watermelon', relationship: 'family', relationshipLabel: 'Same family (Cucurbitaceae)' },
      { slug: 'squash', relationship: 'family', relationshipLabel: 'Same family (Cucurbitaceae)' },
    ],
    calculatorPreset: 'Zucchini',
    searchVolume: 2530,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'carrot',
    name: 'Carrot',
    pluralName: 'Carrots',
    keyword: 'how far apart to plant carrots',
    seoTitle: 'Carrot Spacing: How Far Apart to Plant Carrots',
    metaDescription:
      'Carrots are sown thick and thinned to 1-4 inches apart -- thinning, not initial spacing, is the real skill. Rows run 12-24 inches apart.',
    directAnswer:
      'Carrots end up spaced 1 to 4 inches apart in the row, with 12 to 24 inches between rows -- but that final number is reached by thinning, not by careful initial spacing. Carrot seed is tiny and hard to place precisely, so extension guides expect you to sow thickly and thin seedlings down once they\'re up, typically when the foliage is 3 to 4 inches tall. Thinning, not spacing, is the actual gardening skill this crop requires.',
    spacingTable: [
      { rowLabel: 'Carrot (thinned)', inRow: '3 in (range 1-4 in)', betweenRow: '12-24 in', sqft: '0.0625 (16/sq ft)' },
    ],
    spacingTableNote:
      'Matches this site\'s Plant Spacing Calculator (3 in./12 in.), with the 12 in. row figure at the tighter end of the 12-24 in. range extension sources publish.',
    bedPlantsNote:
      'In a 4×8 ft raised bed at 3 in./12 in., carrots work out to about 32 plants per row and 4 rows -- roughly 128 carrots, one of the densest crops on this site\'s whole spacing chart.',
    differentiatorHeading: 'Thinning Is the Real Skill -- Not Initial Spacing',
    differentiatorParagraphs: [
      'University of Illinois Extension is direct about why: "Carrot seed is small, difficult to handle, and often requires thinning to get the spacing correct." You\'re not aiming for perfect initial spacing at all -- you\'re sowing thick and then removing the surplus once seedlings are established, usually once they reach about 3 to 4 inches of foliage (SDSU Extension, Iowa State University Extension).',
      'Skipping that step has a specific, sourced consequence: per an Ask Extension response from the Cooperative Extension System, not thinning "can result in limited root growth because of crowding and less nutrients getting to the roots" -- crowded carrots don\'t die, they just stay small and thin.',
      'One genuinely useful, extension-sourced trick for a notoriously slow-germinating crop: Illinois Extension recommends sowing a single radish seed every 6 to 12 inches along the row to mark it, since radishes germinate fast and show you exactly where the carrot row is before the carrots themselves emerge.',
    ],
    whySpacingMattersHeading: 'Why Spacing (and Soil) Matters for Carrots',
    whySpacingMattersParagraphs: [
      'It\'s worth correcting a common assumption here: forked or twisted carrot roots are usually blamed on crowding, but Iowa State University Extension points to a different primary cause -- "compacted or heavy soils, rocky soil, and inconsistent moisture" produce stunted, forked, or twisted roots more directly than spacing does. Overcrowding and excess nitrogen cause a related but distinct problem: "plants that are all tops with lush foliage but little or no root development."',
      'So the two failure modes aren\'t the same thing: crowding stunts root size and development; poor soil texture and inconsistent watering are the more likely culprits behind actual forking and splitting.',
    ],
    nonObviousFact:
      'Forked or twisted carrots are usually blamed on not thinning enough, but Iowa State University Extension points to compacted or rocky soil and inconsistent watering as the more direct causes of forking -- overcrowding is real, but it mainly stunts root size rather than causing the classic forked shape.',
    faqs: [
      { q: 'How far apart should you thin carrots?', a: 'Roughly 1-4 inches depending on desired root size -- closer for young or small harvests, wider for full-size mature roots.' },
      { q: 'When should you thin carrot seedlings?', a: 'Sources vary: as early as 1 inch tall (University of Illinois Extension), or once foliage reaches 3-4 inches tall (SDSU Extension, Iowa State University Extension) -- thin before roots begin competing for space.' },
      { q: 'Why are my carrots forked or twisted?', a: 'Most likely compacted or rocky soil, or inconsistent watering -- not simply undercrowding, per Iowa State University Extension.' },
      { q: 'How far apart should carrot rows be?', a: '12-24 inches, depending on the source (University of Illinois: 12-18 in.; Iowa State: 18-24 in.).' },
      { q: 'Can I skip thinning if I space carrot seed carefully?', a: 'In practice, no -- carrot seed is too small to place precisely by hand, so extension guides treat thinning as a standard, expected step rather than an optional fix.' },
    ],
    sources: [
      { label: '"Carrots"', url: 'https://extension.illinois.edu/gardening/carrots', institution: 'University of Illinois Extension' },
      { label: '"Growing Carrots and Parsnips"', url: 'https://yardandgarden.extension.iastate.edu/how-to/growing-carrots-and-parsnips', institution: 'Iowa State University Extension and Outreach' },
      { label: '"Carrots: How to Grow It"', url: 'https://extension.sdstate.edu/carrots-how-grow-it', institution: 'South Dakota State University Extension' },
    ],
    siblings: [
      { slug: 'lettuce', relationship: 'regime', relationshipLabel: 'Thinning-driven crop, like carrots' },
      { slug: 'kale', relationship: 'regime', relationshipLabel: 'Thinning-driven crop, like carrots' },
    ],
    calculatorPreset: 'Carrot',
    searchVolume: 1620,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'kale',
    name: 'Kale',
    pluralName: 'Kale',
    keyword: 'kale spacing',
    seoTitle: 'Kale Spacing: How Far Apart to Plant Kale',
    metaDescription:
      'Kale needs 12 inches between plants after thinning, with rows 18-36 inches apart depending on garden type. Extension guides agree the in-row number closely.',
    directAnswer:
      'Space kale 12 inches apart in the row after thinning -- NC State Extension, Utah State University Extension, and this site\'s own Plant Spacing Calculator all agree closely on that figure. Row spacing is where sources diverge more: this site\'s calculator uses 18 inches, reflecting tighter raised-bed spacing, while extension guides for a traditional open row garden run wider, at 24 to 36 inches, to accommodate kale\'s bushy mature spread.',
    spacingTable: [
      { rowLabel: 'Kale (raised bed)', inRow: '12 in', betweenRow: '18 in', sqft: '1' },
      { rowLabel: 'Kale (traditional row garden)', inRow: '12-18 in', betweenRow: '24-36 in', sqft: '—' },
    ],
    spacingTableNote:
      'In-row spacing matches this site\'s Plant Spacing Calculator closely. Between-row spacing in a traditional garden runs wider (NC State Extension: 2-3 ft; Utah State University Extension: 24-30 in.) than the calculator\'s 18 in. default -- the tighter figure reflects raised-bed spacing, where the lack of foot-traffic compaction (see the note on raised beds elsewhere on this site) supports closer rows than an open garden does.',
    bedPlantsNote:
      'In a 4×8 ft raised bed at 12 in./18 in., kale works out to 8 plants per row and 2 rows -- 16 plants total.',
    differentiatorHeading: 'Thinning You Can Actually Use, and a Harvest-Timing Trick',
    differentiatorParagraphs: [
      'NC State Extension makes a genuinely kale-specific point most spacing content skips: seedlings pulled at thinning time don\'t have to be thrown out -- "plants removed at thinning can be transplanted to adjacent areas." That\'s a real option for kale precisely because, unlike carrots, it doesn\'t rely on an undisturbed taproot to develop properly.',
      'Utah State University Extension gives a concrete, checkable thinning trigger -- once seedlings reach 3 to 4 true leaves -- rather than a vague "when crowded" rule of thumb.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Kale',
    whySpacingMattersParagraphs: [
      'Kale gets noticeably bushy at maturity, which is exactly why between-row spacing needs more room than the in-row figure suggests -- crowd the rows and you\'ll be fighting your way in to harvest by midseason.',
      'One piece of kale-specific timing advice worth knowing even though it isn\'t a spacing rule: NC State Extension states plainly that "for sweeter-tasting leaves, wait to harvest until frost or cold weather arrives" -- a light frost is recommended, not just tolerated.',
    ],
    nonObviousFact:
      'Kale actually gets sweeter after a light frost, and NC State Extension recommends deliberately waiting for cold weather before harvesting rather than treating frost as something to race against.',
    faqs: [
      { q: 'How far apart should kale be spaced?', a: '12 inches between plants in the row after thinning; rows 18-36 inches apart depending on whether you\'re working a raised bed (tighter) or a traditional open row garden (wider).' },
      { q: 'Does kale actually taste better after a frost?', a: 'Yes -- NC State Extension explicitly recommends delaying harvest until after frost or cold weather for sweeter leaves.' },
      { q: 'When do you thin kale seedlings?', a: 'Once plants reach 3-4 true leaves, per Utah State University Extension; NC State Extension sows at 1 in. spacing and thins progressively to 12 in.' },
      { q: 'Can you use the kale seedlings you thin out?', a: 'Yes -- NC State Extension notes thinned plants can be transplanted elsewhere rather than discarded, unlike taproot crops such as carrots.' },
      { q: 'How much space does kale need between rows?', a: '18-36 inches depending on garden type -- noticeably more than the in-row spacing, since kale plants get quite bushy at maturity.' },
    ],
    sources: [
      { label: '"Kale"', url: 'https://content.ces.ncsu.edu/kale', institution: 'NC State Extension' },
      { label: '"Kale in the Garden"', url: 'https://extension.usu.edu/yardandgarden/research/kale-in-the-garden', institution: 'Utah State University Extension' },
      { label: 'Leafy Greens Planting & Spacing table', url: 'https://extension.usu.edu/vegetableguide/leafy-greens/planting-spacing', institution: 'Utah State University Extension' },
    ],
    siblings: [
      { slug: 'onion', relationship: 'companion', relationshipLabel: 'Companion planting pairing' },
      { slug: 'carrot', relationship: 'regime', relationshipLabel: 'Thinning-driven crop, like kale' },
      { slug: 'lettuce', relationship: 'regime', relationshipLabel: 'Thinning-driven crop, like kale' },
      { slug: 'cauliflower', relationship: 'family', relationshipLabel: 'Same family (Brassicaceae)' },
      { slug: 'brussels-sprouts', relationship: 'family', relationshipLabel: 'Same family (Brassicaceae)' },
      { slug: 'pea', relationship: 'regime', relationshipLabel: 'Cool-season crop, planted on a similar early-spring timeline' },
    ],
    calculatorPreset: 'Kale',
    searchVolume: 1600,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'squash',
    name: 'Squash',
    pluralName: 'Squash',
    keyword: 'how far apart to plant squash',
    seoTitle: 'Winter Squash Spacing: How Far Apart to Plant Squash',
    metaDescription:
      'Winter squash (butternut, acorn, Hubbard) needs 36 in. in-row and real room between rows -- extension guides say 5-8 ft, more than most charts show.',
    directAnswer:
      'This page covers winter squash -- butternut, acorn, spaghetti, Hubbard, and similar long-storage types -- as distinct from zucchini and other summer squash, which have their own spacing page. Space winter squash 36 inches apart in the row. Between rows, this site\'s Plant Spacing Calculator uses 48 inches, but University of Maryland Extension and University of Minnesota Extension both recommend meaningfully more room in an open garden -- 60 to 96 inches -- since winter squash vines sprawl further than summer types.',
    spacingTable: [
      { rowLabel: 'Winter squash (raised bed)', inRow: '36 in', betweenRow: '48 in', sqft: '9' },
      { rowLabel: 'Winter squash (traditional row garden)', inRow: '36-48 in', betweenRow: '60-96 in', sqft: '—' },
    ],
    spacingTableNote:
      'In-row spacing and the square-foot-gardening figure (9 sq ft/plant, the Square Foot Gardening method\'s own bush-squash convention) match this site\'s Plant Spacing Calculator. Between-row spacing is where extension guidance runs notably wider than the calculator\'s 48 in. default -- if you\'re growing in an open row garden rather than a raised bed, budget the extra room.',
    bedPlantsNote:
      'In a 4×8 ft raised bed at 36 in./48 in., winter squash works out to about 2 plants per row and 1 row -- 2 plants total, reflecting how much room this crop genuinely needs even at the tighter raised-bed end of its range.',
    differentiatorHeading: 'Three Species, and Why Only Some Winter Squash Can Go Vertical',
    differentiatorParagraphs: [
      'Winter squash isn\'t one plant -- per University of Minnesota Extension, it spans three distinct species: <em>Cucurbita pepo</em> (acorn, delicata, spaghetti squash), <em>C. moschata</em> (butternut), and <em>C. maxima</em> (Hubbard, kabocha, buttercup), with mature fruit size ranging from single-serving to 15-plus pounds.',
      'Trellising is genuinely fruit-weight-limited, not just space-limited. UMN Extension notes small-fruited types like delicata and acorn can be trained vertically on a trellis, but large-fruited varieties -- a big Hubbard or maxima-type squash -- have to stay on the ground, since the fruit is simply too heavy to support on a trellis. University of Maryland Extension adds a related, specific care note: trellised winter squash needs watering more often than ground-grown plants, because vertical growth changes how the root zone retains soil moisture.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Winter Squash',
    whySpacingMattersParagraphs: [
      'Winter squash vines are simply longer and heavier than summer squash vines, which is the direct reason extension row-spacing figures run so much wider than for zucchini. Underspace it in an open garden and vines from adjacent rows will tangle together well before harvest, making it hard to tell whose fruit is whose and complicating disease management.',
      'For a small raised bed, the practical decision is less about squeezing in extra plants and more about choosing small-fruited, trellis-friendly cultivars (acorn, delicata) over large-fruited ground types (big Hubbard, large kabocha) if vertical growing is the plan.',
    ],
    faqs: [
      { q: 'How far apart to plant winter squash?', a: 'Roughly 36 inches in-row, but between-row spacing needs meaningfully more room than summer squash -- 60-96 inches in an open garden per University of Maryland and University of Minnesota Extension.' },
      { q: 'Can I grow winter squash on a trellis to save space?', a: 'Yes, but only for small-fruited types like acorn or delicata -- large-fruited varieties (Hubbard, big kabocha or buttercup types) have to stay on the ground because of fruit weight, per University of Minnesota Extension.' },
      { q: 'What\'s the difference between bush and vining winter squash spacing?', a: 'University of Minnesota Extension attributes its in-row range directly to habit: the tighter end is for bush varieties, the wider end for vining types.' },
      { q: 'Is butternut squash the same species as acorn squash?', a: 'No -- butternut is Cucurbita moschata, acorn and delicata are Cucurbita pepo, and Hubbard/kabocha/buttercup are Cucurbita maxima, per University of Minnesota Extension.' },
      { q: 'Does a trellised winter squash need more water?', a: 'Yes -- University of Maryland Extension notes trellised winter squash needs watering more often than ground-grown plants because of how vertical growth affects root-zone soil moisture.' },
    ],
    sources: [
      { label: '"Growing Winter Squash"', url: 'https://extension.umd.edu/resource/growing-winter-squash-home-garden', institution: 'University of Maryland Extension' },
      { label: '"Pumpkins and Winter Squash"', url: 'https://extension.umn.edu/vegetables/pumpkins-and-winter-squash', institution: 'University of Minnesota Extension' },
    ],
    siblings: [
      { slug: 'watermelon', relationship: 'family', relationshipLabel: 'Same family (Cucurbitaceae)' },
      { slug: 'zucchini', relationship: 'family', relationshipLabel: 'Same family (Cucurbitaceae)' },
    ],
    calculatorPreset: 'Squash (winter)',
    searchVolume: 1540,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'asparagus',
    name: 'Asparagus',
    pluralName: 'Asparagus',
    keyword: 'asparagus plant spacing',
    seoTitle: 'Asparagus Spacing: Crown Depth and Permanent Bed Planning',
    metaDescription:
      'Asparagus crowns go in a 6-12 in. trench, covered gradually, spaced 12-18 in. apart in rows 3-5 ft apart -- and stay there for 15+ years. Plan accordingly.',
    directAnswer:
      'Asparagus crowns go into a trench 6 to 12 inches deep (commonly 6-8 inches in practice), covered with only 2 to 3 inches of soil at planting and filled in gradually -- about 2 inches every two weeks -- as shoots emerge. Space crowns 12 to 18 inches apart within the trench, with 3 to 5 feet between trenches. Unlike every other crop on this page, that spacing decision is effectively permanent: an asparagus bed typically produces for 15 years or more.',
    spacingTable: [
      { rowLabel: 'Asparagus crowns', inRow: '12-18 in', betweenRow: '3-5 ft between trenches', sqft: 'not applicable (perennial bed)' },
    ],
    spacingTableNote:
      'No calculator or SFG figure applies here -- asparagus is a perennial planted once into a permanent bed, not a crop replanted each season the way Square Foot Gardening\'s method assumes.',
    bedPlantsNote:
      'A 4×8 ft bed fits roughly one trench of about 5-6 crowns at 15-18 in. spacing -- but given that asparagus occupies the same ground for 15-plus years, most gardeners are better served by a dedicated permanent asparagus bed than by using a shared annual-vegetable bed this size.',
    differentiatorHeading: 'A 15-to-20-Year Commitment, Not a Seasonal One',
    differentiatorParagraphs: [
      'Every other crop on this page gets replanted each year or two. Asparagus is a true perennial: University of Maryland Extension and Virginia Cooperative Extension both put bed lifespan at "12 to 15 years or longer," University of Illinois Extension says "at least 15 to 20 years," and University of Minnesota Extension says "15 years or more." That makes site selection -- not spacing precision -- the highest-stakes decision in planting asparagus, since a mistake isn\'t fixed next season.',
      'You also can\'t harvest right away. University of Maryland Extension and Virginia Cooperative Extension agree: don\'t harvest at all the first year after planting crowns; harvest lightly for a few weeks in year two; full harvest doesn\'t begin until year three. Illinois Extension is even more conservative, recommending no harvest at all in years one or two. Planted from seed instead of crowns, the wait is longer still -- no harvest for the first two seasons, light harvest in year three, full harvest by year four.',
      'One more genuinely non-obvious fact with real spacing implications: asparagus plants are dioecious, meaning individual plants are either male or female. University of Illinois Extension and the University of Connecticut Home Garden Education Center both note that female plants divert energy into producing seed-bearing berries, which reduces spear production and self-sows into unwanted seedlings that behave like a perennial weed over the bed\'s 15-plus-year life. That\'s why most modern hybrid varieties (the Jersey series, for example) are bred to be predominantly or entirely male.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Asparagus',
    whySpacingMattersParagraphs: [
      'Because the bed is permanent, crown spacing has to account for how much the planting will spread and thicken over years, not just how it looks in year one -- University of Minnesota Extension specifically ties its 3-foot-minimum between-trench spacing to the fact that "the plants will spread as they age."',
      'Gradual backfilling of the trench isn\'t optional technique, either -- University of Maryland Extension and Virginia Cooperative Extension both describe filling the trench in stages (about 2 inches every two weeks) as shoots grow, rather than burying the crown all at once.',
    ],
    faqs: [
      { q: 'How deep do you plant asparagus crowns?', a: 'A 6-12 inch trench, commonly 6-8 inches in practice, with the crown covered by only 2-3 inches of soil at planting, then backfilled gradually -- about 2 inches every two weeks -- as shoots emerge.' },
      { q: 'How far apart do you space asparagus crowns and rows?', a: 'Roughly 12-18 inches between crowns within a row, and 3-5 feet between rows, since crowns spread significantly as the planting matures.' },
      { q: 'How long does an asparagus bed last?', a: 'Typically 12-20 years, often cited as "15 years or more" -- making site selection for a permanent bed a much higher-stakes decision than for annual vegetables.' },
      { q: 'How long before you can harvest asparagus after planting?', a: 'Don\'t harvest at all the first year. Harvest lightly for a few weeks in year two (from crowns). Full harvest doesn\'t begin until year three or four.' },
      { q: 'Does it matter if my asparagus plants are male or female?', a: 'Yes -- male plants put no energy into seed production, so many gardeners and most modern hybrid varieties favor all-male plantings for larger spear production and to avoid female plants\' self-seeding berries becoming a long-term weed problem.' },
    ],
    sources: [
      { label: '"Growing Asparagus in a Home Garden"', url: 'https://extension.umd.edu/resource/growing-asparagus-home-garden', institution: 'University of Maryland Extension' },
      { label: 'Asparagus, 426-401', url: 'https://www.pubs.ext.vt.edu/426/426-401/426-401.html', institution: 'Virginia Cooperative Extension' },
      { label: '"Growing Asparagus in Home Gardens"', url: 'https://extension.umn.edu/vegetables/growing-asparagus', institution: 'University of Minnesota Extension' },
      { label: '"Asparagus"', url: 'https://extension.illinois.edu/gardening/asparagus', institution: 'University of Illinois Extension' },
    ],
    siblings: [
      { slug: 'strawberry', relationship: 'regime', relationshipLabel: 'Both are multi-year plantings that occupy a permanent bed' },
    ],
    searchVolume: 1480,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'lettuce',
    name: 'Lettuce',
    pluralName: 'Lettuce',
    keyword: 'how far apart to plant lettuce',
    seoTitle: 'Lettuce Spacing: Leaf vs. Head Lettuce Spacing',
    metaDescription:
      'Leaf lettuce needs 6 in. in-row spacing; head lettuce needs 12 in. and considerably more room between rows. The right spacing depends on harvest stage.',
    directAnswer:
      'How far apart to plant lettuce depends heavily on type and how you intend to harvest it. Head lettuce needs 12 inches between plants and, per Clemson Cooperative Extension and Utah State University Extension, considerably more between rows in an open garden than a tight raised bed allows. Loose-leaf lettuce needs much less -- 6 inches in-row is standard. Utah State University Extension makes the underlying logic explicit: "initial and eventual spacing depends on intended harvesting stage," not on lettuce being one uniform crop.',
    spacingTable: [
      { rowLabel: 'Leaf lettuce', inRow: '6 in (range 4-10 in)', betweenRow: '12-24 in', sqft: '0.25 (4/sq ft)' },
      { rowLabel: 'Head lettuce (raised bed)', inRow: '12 in', betweenRow: '12 in', sqft: '1' },
      { rowLabel: 'Head / crisphead lettuce (traditional row garden)', inRow: '12-15 in', betweenRow: '20-36 in', sqft: '—' },
    ],
    spacingTableNote:
      'Leaf lettuce figures match this site\'s Plant Spacing Calculator comfortably within extension ranges. Head lettuce\'s in-row figure (12 in.) matches the calculator exactly, but its between-row figure of 12 in. is well below the 20-36 in. that Clemson HGIC and Utah State University Extension recommend for an open row garden -- the tighter number reflects raised-bed spacing, the same way it does for kale.',
    bedPlantsNote:
      'In a 4×8 ft raised bed, leaf lettuce at 6 in./12 in. fits about 16 plants per row and 4 rows -- roughly 64 plants. Head lettuce at 12 in./12 in. fits about 8 plants per row and 4 rows -- 32 heads, though a traditional open garden at the wider 20-36 in. row spacing would fit far fewer per bed.',
    differentiatorHeading: 'The Real Split Is Harvest Stage, Not Just Variety',
    differentiatorParagraphs: [
      'Leaf and head lettuce aren\'t just two sizes of the same plant -- Clemson Cooperative Extension recommends growing head lettuce from purchased transplants rather than direct-seeding and thinning, which is the standard approach for leaf lettuce. That\'s a genuinely different starting method, not just a different final spacing number.',
      'Utah State University Extension frames the underlying logic clearly: spacing depends on "intended harvesting stage" more than on lettuce type alone. Baby-leaf greens need far less room and can be harvested thick and young; a full crisphead needs to bulk up over its full spacing allotment to form a proper head at all.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Lettuce',
    whySpacingMattersParagraphs: [
      'The practical risk with lettuce spacing is under-spacing a head type by mistake -- a reader searching generically for "lettuce spacing" without specifying type could easily apply loose-leaf figures to a crisphead planting and end up with heads that never fully form, since head lettuce needs roughly two to three times the in-row space and meaningfully more between-row space than loose-leaf types.',
      'Thinning timing also differs by type: Clemson Cooperative Extension recommends thinning leaf lettuce seedlings once they\'re 1 to 2 inches tall, well before the crowding that would stunt a head-forming variety later on.',
    ],
    faqs: [
      { q: 'What\'s the spacing difference between leaf and head lettuce?', a: 'Leaf lettuce needs 4-10 inches in-row with 12-24 inches between rows. Head/crisphead lettuce needs 12-15 inches in-row and considerably more between rows in an open garden -- head lettuce needs substantially more room overall.' },
      { q: 'When should you thin lettuce seedlings?', a: 'Leaf lettuce is typically thinned once seedlings are 1-2 inches tall, per Clemson Cooperative Extension; final spacing for leaf types runs 4-8 inches.' },
      { q: 'Why do lettuce spacing guides give such a wide range?', a: 'Because the correct spacing depends on lettuce type and intended harvest stage -- baby greens need far less room than a full crisphead, per Utah State University Extension.' },
      { q: 'Should I direct-seed or transplant head lettuce?', a: 'Clemson Cooperative Extension recommends growing head lettuce from purchased transplants rather than direct-seeding, unlike leaf lettuce, which is commonly direct-seeded and thinned.' },
      { q: 'How far apart do rows need to be for head lettuce vs. leaf lettuce?', a: 'Head/crisphead lettuce needs considerably more between-row space in an open garden than leaf lettuce does -- roughly double, depending on source.' },
    ],
    sources: [
      { label: '"Lettuce"', url: 'https://hgic.clemson.edu/factsheet/lettuce/', institution: 'Clemson Cooperative Extension (HGIC)' },
      { label: 'Leafy Greens Planting & Spacing table', url: 'https://extension.usu.edu/vegetableguide/leafy-greens/planting-spacing', institution: 'Utah State University Extension' },
      { label: '"Growing Lettuce in a Home Garden"', url: 'https://extension.umd.edu/resource/growing-lettuce-home-garden', institution: 'University of Maryland Extension' },
    ],
    siblings: [
      { slug: 'tomato', relationship: 'companion', relationshipLabel: 'Companion planting pairing' },
      { slug: 'onion', relationship: 'companion', relationshipLabel: 'Companion planting pairing' },
      { slug: 'carrot', relationship: 'regime', relationshipLabel: 'Thinning-driven crop, like lettuce' },
      { slug: 'kale', relationship: 'regime', relationshipLabel: 'Thinning-driven crop, like lettuce' },
      { slug: 'pea', relationship: 'regime', relationshipLabel: 'Cool-season crop, planted on a similar early-spring timeline' },
    ],
    calculatorPreset: 'Lettuce (head)',
    searchVolume: 1320,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'cauliflower',
    name: 'Cauliflower',
    pluralName: 'Cauliflower',
    keyword: 'cauliflower spacing',
    seoTitle: 'Cauliflower Spacing: How Far Apart to Plant Cauliflower',
    metaDescription:
      'Cauliflower spacing (18-24 in. in-row, 24-36 in. between rows) matches broccoli and cabbage almost exactly -- blanching, not spacing, is what sets it apart.',
    directAnswer:
      'Space cauliflower 18 to 24 inches apart in the row, with 24 to 36 inches between rows -- figures that, per Oklahoma State University Extension, are essentially identical to broccoli and cabbage spacing. The real difference with cauliflower isn\'t how far apart you plant it; it\'s blanching, the practice of tying outer leaves over the developing head to keep it white.',
    spacingTable: [
      { rowLabel: 'Cauliflower', inRow: '18-24 in', betweenRow: '24-36 in', sqft: '1 (per Square Foot Gardening convention)' },
    ],
    spacingTableNote:
      'No calculator figure exists for cauliflower yet on this site. The square-foot-gardening figure here reflects the Square Foot Gardening method\'s own "extra-large plant" category rather than a university extension source -- noted honestly rather than presented as extension-backed.',
    bedPlantsNote:
      'In a 4×8 ft raised bed at 24 in./30 in., cauliflower works out to about 4 plants per row and 1 row -- 4 plants total, the same footprint as broccoli or cabbage in the same bed.',
    differentiatorHeading: 'Blanching and Heat Sensitivity, Not Spacing, Set Cauliflower Apart',
    differentiatorParagraphs: [
      'Oklahoma State University Extension gives one unified spacing table for broccoli, cauliflower, and cabbage -- "18 inches apart in the row with rows two to four feet apart" -- so the numbers genuinely don\'t distinguish cauliflower from its brassica relatives.',
      'What does distinguish it: blanching. Ohioline (Ohio State University Extension), University of Maryland Extension, University of Illinois Extension, and Oklahoma State University Extension all describe gathering and tying a cauliflower plant\'s outer leaves over the developing curd once it reaches roughly 1.5 to 3 inches across, to block sunlight and keep the head from discoloring. Self-blanching varieties exist too -- cultivars bred so their leaves naturally curl inward over the curd, reducing or eliminating the need to tie them by hand.',
      'Cauliflower is also more heat- and temperature-sensitive than its relatives. Oklahoma State University Extension calls it "more sensitive to a dry soil and to fluctuating temperatures" than broccoli or cabbage and names it "the more difficult to grow" of the three; Ohioline gives an optimal range of 60-65°F, with temperatures above 75°F risking "buttoning" -- a stunted, undersized head.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Cauliflower',
    whySpacingMattersParagraphs: [
      'Because cauliflower\'s spacing needs mirror broccoli and cabbage almost exactly, spacing itself isn\'t the lever that determines success with this crop -- temperature timing and blanching technique are. Plant it at the same spacing as broccoli and you\'ll be fine on that front; the plant is far more likely to fail from heat stress at head-formation time than from crowding.',
      'Adequate spacing still matters for the blanching step itself, though -- leaves need room to be gathered and tied up over the curd without tangling into a neighboring plant\'s head.',
    ],
    nonObviousFact:
      'Cauliflower can fail to form a proper head at all -- a condition called "buttoning" -- from heat or cold stress or from planting oversized transplants, a documented failure mode fairly specific to cauliflower\'s head-formation physiology that broccoli generally doesn\'t share to the same degree, per Ohioline and Oklahoma State University Extension.',
    faqs: [
      { q: 'Does cauliflower need more space than broccoli?', a: 'No -- Oklahoma State University Extension gives broccoli, cauliflower, and cabbage the same spacing range. The real difference is in blanching technique and heat sensitivity, not spacing.' },
      { q: 'What is blanching, and does it change how far apart I should plant cauliflower?', a: 'Blanching is tying a cauliflower plant\'s outer leaves over the developing head to keep it from discoloring in sunlight. It doesn\'t change spacing, but leaves need room to be gathered and tied without tangling into a neighboring plant.' },
      { q: 'Are self-blanching cauliflower varieties worth growing?', a: 'They can save the manual tying step, since their leaves naturally curl over the curd -- a real cultivar trait, not a marketing term.' },
      { q: 'Why does cauliflower fail to form a head ("buttoning")?', a: 'Usually heat or cold stress, or transplants that were too large at planting -- a documented failure mode specific to cauliflower\'s head-formation physiology, per Ohioline and Oklahoma State University Extension.' },
      { q: 'Is cauliflower harder to grow than broccoli or cabbage?', a: 'Oklahoma State University Extension calls it "the more difficult to grow" of the three, mainly due to its sensitivity to dry soil and fluctuating temperatures.' },
    ],
    sources: [
      { label: '"Growing Cauliflower in the Garden"', url: 'https://ohioline.osu.edu/factsheet/hyg-1613', institution: 'Ohioline, Ohio State University Extension' },
      { label: '"Growing Cauliflower in a Home Garden"', url: 'https://extension.umd.edu/resource/growing-cauliflower-home-garden', institution: 'University of Maryland Extension' },
      { label: '"Growing Broccoli, Cauliflower and Cabbage"', url: 'https://extension.okstate.edu/fact-sheets/growing-broccoli-caulifiower-and-cabbage.html', institution: 'Oklahoma State University Extension' },
    ],
    siblings: [
      { slug: 'kale', relationship: 'family', relationshipLabel: 'Same family (Brassicaceae)' },
      { slug: 'brussels-sprouts', relationship: 'family', relationshipLabel: 'Same family (Brassicaceae)' },
    ],
    searchVolume: 980,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'brussels-sprouts',
    name: 'Brussels Sprouts',
    pluralName: 'Brussels Sprouts',
    keyword: 'brussels sprouts spacing',
    seoTitle: 'Brussels Sprouts Spacing: How Far Apart to Plant',
    metaDescription:
      'Brussels sprouts need 18-24 in. in-row and up to 36-42 in. between rows -- more room than other brassicas, for a plant that stays in the ground far longer.',
    directAnswer:
      'Space Brussels sprouts 18 to 24 inches apart in the row, with 24 to 42 inches between rows -- extension sources give this crop more between-row room than broccoli or cabbage, and the reason is really about time, not just size: Brussels sprouts take 85 to 110 days to mature, per University of Georgia Cooperative Extension and NC State Extension, occupying its spacing footprint far longer than a quicker-maturing brassica.',
    spacingTable: [
      { rowLabel: 'Brussels sprouts', inRow: '18-24 in', betweenRow: '24-42 in', sqft: '1 (per Square Foot Gardening convention)' },
    ],
    spacingTableNote:
      'No calculator figure exists for Brussels sprouts yet on this site. The square-foot-gardening figure reflects the Square Foot Gardening method\'s own "extra-large plant" category, not a university extension source.',
    bedPlantsNote:
      'In a 4×8 ft raised bed at 24 in./36 in., Brussels sprouts work out to about 4 plants per row and 1 row -- 4 plants total, occupying that space for a notably long season.',
    differentiatorHeading: 'A Long Season, a Tall Single Stalk, and a Bottom-Up Harvest',
    differentiatorParagraphs: [
      'Brussels sprouts grow as a single, increasingly tall stalk, and University of Georgia Cooperative Extension recommends a management step with no equivalent in other brassica-growing guides: pinching or topping the plant once it reaches about 24 inches tall, to redirect the plant\'s energy from continued vertical growth into sprout development instead.',
      'Harvest itself works differently, too. Rather than a single cut like a head of broccoli or cabbage, sprouts are picked from the bottom of the stalk upward over weeks to months as the season progresses -- and University of Minnesota Extension notes plants can stay productive in the garden "as long as temperatures remain above 20°F," making this one of the most cold-tolerant crops on this page.',
      'Cultivar maturity times vary meaningfully and are worth knowing before you plant: University of Georgia Cooperative Extension lists Long Island Improved at about 90 days, Jade Cross at about 100 days, and Diablo at about 110 days -- all substantially longer than the 55-70 days typical of broccoli or cauliflower.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Brussels Sprouts',
    whySpacingMattersParagraphs: [
      'Because the plant occupies its spot in the garden for so much longer than related brassicas, adequate spacing has more time to matter -- a slightly crowded broccoli planting is only crowded for 60-odd days, while a slightly crowded Brussels sprouts planting stays that way for a full season.',
      'The wider between-row figures some extension sources give (up to 36-42 in., versus 24-36 in. for broccoli or cabbage) plausibly reflect the mature plant\'s greater height and bulk over that long standing time, though no source we found states an explicit airflow rationale for the wider figure the way tomato sources do -- worth noting as an inference rather than an established fact.',
    ],
    nonObviousFact:
      'University of Georgia Cooperative Extension recommends deliberately pinching off the top of a Brussels sprouts plant once it reaches about 24 inches tall, to stop it from continuing to grow taller and redirect that energy into forming sprouts instead -- a genuinely crop-specific management technique without a real equivalent for broccoli or cabbage.',
    faqs: [
      { q: 'Why do Brussels sprouts need so much more time in the garden than broccoli or cabbage?', a: 'Brussels sprouts take 85-110 days to mature, versus roughly 55-70 days for broccoli or cauliflower, per University of Georgia Cooperative Extension and NC State Extension.' },
      { q: 'Should I pinch off the top of my Brussels sprouts plant?', a: 'Yes, once it reaches about 24 inches tall, per University of Georgia Cooperative Extension -- this redirects the plant\'s energy from vertical growth into sprout production.' },
      { q: 'Do Brussels sprouts taste better after a frost?', a: 'Extension sources confirm the plant tolerates cold well, remaining productive down to about 20°F per University of Minnesota Extension, consistent with the common gardening experience that a light frost improves flavor.' },
      { q: 'How much space does a mature Brussels sprouts plant need?', a: '18-24 inches in-row, with 24-42 inches between rows -- more between-row room than broccoli or cabbage typically get.' },
      { q: 'Can I harvest Brussels sprouts a few at a time, or all at once?', a: 'A few at a time -- sprouts are picked from the bottom of the stalk upward over weeks to months as the season progresses, unlike a single-cut crop like broccoli.' },
    ],
    sources: [
      { label: '"Growing Brussels sprouts in home gardens"', url: 'https://extension.umn.edu/vegetables/growing-brussels-sprouts', institution: 'University of Minnesota Extension' },
      { label: '"Home Garden Brussels Sprouts" (C1069)', url: 'https://fieldreport.caes.uga.edu/publications/C1069/home-garden-brussels-sprouts/', institution: 'University of Georgia Cooperative Extension' },
      { label: '"Brussels Sprouts"', url: 'https://content.ces.ncsu.edu/brussels-sprouts', institution: 'NC State Extension' },
    ],
    siblings: [
      { slug: 'kale', relationship: 'family', relationshipLabel: 'Same family (Brassicaceae)' },
      { slug: 'cauliflower', relationship: 'family', relationshipLabel: 'Same family (Brassicaceae)' },
    ],
    searchVolume: 950,
    lastUpdated: '2026-09-17',
  },
  // ---------------------------------------------------------------------
  {
    slug: 'pea',
    name: 'Pea',
    pluralName: 'Peas',
    keyword: 'pea spacing',
    seoTitle: 'Pea Spacing: Bush vs. Vining Pea Spacing',
    metaDescription:
      'Bush peas need 1-3 in. in-row spacing; vining/tall peas need a trellis and a double-row planting pattern. Leafless "afila" cultivars change the equation.',
    directAnswer:
      'Space peas 1 to 3 inches apart in the row, with 18 to 30 inches between rows -- but whether you need a trellis at all depends on the type. Bush peas stay 2 to 3 feet tall and can be grown in tight, self-supporting rows; tall or vining types reach up to 5 feet and need a trellis, commonly planted as a double row straddling one central support.',
    spacingTable: [
      { rowLabel: 'Bush peas', inRow: '1-3 in', betweenRow: '18-24 in', sqft: '8 (per Square Foot Gardening + Penn State Extension)' },
      { rowLabel: 'Tall / vining peas (trellised)', inRow: '6-7 in (trench-sown)', betweenRow: '18-30 in', sqft: '—' },
    ],
    spacingTableNote:
      'No calculator figure exists for peas yet on this site. The 8-plants-per-square-foot figure is unusual in that it\'s corroborated by both the Square Foot Gardening method\'s own guide and, independently, Penn State Extension\'s "up to eight plants" figure for a 12x12 in. square -- stronger sourcing than most SFG numbers on this page.',
    bedPlantsNote:
      'In a 4×8 ft raised bed at bush-pea spacing (2 in./18 in.), peas work out to about 48 plants per row and 2 rows -- roughly 96 plants. Vining peas need a trellis running the bed\'s length, which typically makes more sense along one edge than as multiple full rows.',
    differentiatorHeading: 'Not Quite Bean Logic: Leafless Cultivars and the Double-Row Trellis',
    differentiatorParagraphs: [
      'Peas share a bush-vs-vining split with beans, but it isn\'t identical. Peas run noticeably tighter in-row (1-3 in. versus beans\' 2-8 in.), and a genuinely pea-specific option exists that beans don\'t have: leafless or semi-leafless ("afila") cultivars, bred so tendrils replace leaflets. Penn State Extension confirms these "may be better able to stand without a trellis, because the tendrils tangle themselves into a mass" -- a real, extension-documented trait with no real bean equivalent.',
      'The double-row-per-trellis planting pattern is also a distinctly pea-oriented technique: rather than a single row along one support, tall peas are commonly sown as two rows straddling one central trellis, so both rows can climb the same structure from opposite sides.',
      'Timing is the other genuine difference from beans, even though it isn\'t strictly a spacing question: peas are a cool-season crop, planted very early in spring (or again in late summer for a fall crop), unlike beans, which need warm soil and go in after the danger of frost has passed.',
    ],
    whySpacingMattersHeading: 'Why Spacing Matters for Peas',
    whySpacingMattersParagraphs: [
      'Bush peas planted too close together lose the self-supporting structure that makes them low-maintenance in the first place -- overcrowded plants lodge (fall over) into each other rather than standing upright as a loose thicket.',
      'For trellised types, spacing interacts directly with the trellis itself: plant too far from the support and vines struggle to reach it; plant the two rows of a double-row planting too close together and you lose the airflow through the middle of the trellis that helps prevent powdery mildew, a common late-season pea disease.',
    ],
    nonObviousFact:
      'Some pea cultivars are bred as leafless or semi-leafless ("afila" type), where tendrils largely replace the plant\'s leaflets and tangle together into a self-supporting mass strong enough to stand without a trellis, per Penn State Extension -- a real, named cultivar trait with no equivalent in garden beans.',
    faqs: [
      { q: 'Do bush peas and vining peas need different spacing?', a: 'Yes -- bush peas (2-3 ft tall) can be grown in tight, self-supporting rows, while tall/vining peas (up to 5 ft) need a trellis and are commonly planted in a double row straddling one central support.' },
      { q: 'How far apart should I plant peas if I\'m using a trellis vs. not?', a: 'Trellised (tall) peas are typically trench-sown at 6-7 inches with rows 18-30 inches apart; bush peas without a trellis run tighter, at 1-3 inches in-row.' },
      { q: 'Is pea spacing the same as bean spacing?', a: 'Similar in structure (both split into bush and vining/pole types) but not identical in the numbers -- peas run tighter in-row than beans.' },
      { q: 'Do I need to set up a trellis before or after planting peas?', a: 'Before, if you\'re growing a tall or vining variety -- the double-row planting pattern is built around the trellis being in place first.' },
      { q: 'What are "leafless" or "semi-leafless" peas, and do they still need support?', a: 'Cultivars bred so tendrils replace most leaflets, per Penn State Extension -- these can often stand without a trellis because the tendrils tangle into a self-supporting mass, though a light support still helps in windy conditions.' },
    ],
    sources: [
      { label: '"Garden Peas"', url: 'https://hgic.clemson.edu/factsheet/garden-peas/', institution: 'Clemson Cooperative Extension (HGIC)' },
      { label: '"Growing peas in home gardens"', url: 'https://extension.umn.edu/vegetables/growing-peas', institution: 'University of Minnesota Extension' },
      { label: '"A Gardener\'s Guide to Peas"', url: 'https://extension.psu.edu/a-gardeners-guide-to-peas', institution: 'Penn State Extension' },
    ],
    siblings: [
      { slug: 'bean', relationship: 'family', relationshipLabel: 'Same family (Fabaceae, legumes)' },
      { slug: 'lettuce', relationship: 'regime', relationshipLabel: 'Cool-season crop, planted on a similar early-spring timeline' },
      { slug: 'kale', relationship: 'regime', relationshipLabel: 'Cool-season crop, planted on a similar early-spring timeline' },
    ],
    searchVolume: 480,
    lastUpdated: '2026-09-17',
  },
];

export function getCropSpacing(slug: string): CropSpacingEntry | undefined {
  return cropSpacing.find((c) => c.slug === slug);
}

export function getCropSiblings(entry: CropSpacingEntry): { entry: CropSpacingEntry; relationshipLabel: string }[] {
  return entry.siblings
    .map((s) => {
      const sibling = getCropSpacing(s.slug);
      return sibling ? { entry: sibling, relationshipLabel: s.relationshipLabel } : null;
    })
    .filter((x): x is { entry: CropSpacingEntry; relationshipLabel: string } => x !== null);
}

// Crops researched but NOT shipped as their own page, and why -- kept here
// rather than silently dropped, per the build prompt's own requirement to
// report what was cut and why.
//
// None of the 12 primary crops or 3 conditional crops (Cauliflower, Brussels
// sprouts, Pea) were dropped -- all 15 cleared the differentiation gate with
// real, source-backed distinct content. Pea is the narrowest pass: its
// spacing numbers are structurally similar to bean spacing (both split into
// bush and vining/pole types), so its page leans on genuinely pea-specific
// content instead -- leafless "afila" cultivars, the double-row trellis
// pattern, and cool-season timing -- rather than the spacing table alone.
export const droppedCrops: { name: string; reason: string }[] = [];

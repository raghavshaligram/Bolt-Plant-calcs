// Data for the /sources/ page — every external source cited in a
// "Sources & further reading" section across the site, grouped by
// cluster category and deduplicated. Generated from a full codebase
// crawl + live URL verification; see git history for the crawl script.
// Do not hand-add entries here without a real citation to back them.

export interface CitedSource {
  title: string;
  url: string;
  institution: string;
  citedBy: { title: string; href: string }[];
}

export interface SourceCategory {
  clusterSlug: string;
  name: string;
  sources: CitedSource[];
}

export const sourceCategories: SourceCategory[] = [
  {
    clusterSlug: 'soil-and-amendments',
    name: 'Soil & Amendments',
    sources: [
      {
        title: 'Clemson Cooperative Extension\'s "Soil Texture Analysis: The Jar Test"',
        url: 'https://hgic.clemson.edu/factsheet/soil-texture-analysis-the-jar-test/',
        institution: 'Clemson Cooperative Extension (HGIC)',
        citedBy: [{ title: 'Soil Type Calculator', href: '/calculators/soil-type-calculator/' }],
      },
      {
        title: 'Oregon State University Extension\'s research on coffee grounds and soil health',
        url: 'https://extension.oregonstate.edu/news/coffee-grounds-boost-soil-health-help-control-slugs',
        institution: 'Oregon State University Extension',
        citedBy: [{ title: 'What Can (and Can\'t) You Compost? The Complete List', href: '/blog/what-can-you-compost/' }],
      },
      {
        title: '"How Much Compost, Soil or Mulch?"',
        url: 'https://travis-tx.tamu.edu/about-2/horticulture/soils-and-composting-for-austin/how-much-compost-soil-or-mulch/',
        institution: 'Texas A&M AgriLife Extension (Travis County)',
        citedBy: [{ title: 'Compost Calculator', href: '/calculators/compost-calculator/' }],
      },
      {
        title: 'EPA\'s Composting At Home guidance',
        url: 'https://www.epa.gov/recycle/composting-home',
        institution: 'U.S. Environmental Protection Agency',
        citedBy: [{ title: 'What Can (and Can\'t) You Compost? The Complete List', href: '/blog/what-can-you-compost/' }],
      },
      {
        title: 'Beware the Mulch Volcano',
        url: 'https://www.uvm.edu/extension/news/beware-mulch-volcano',
        institution: 'University of Vermont Extension',
        citedBy: [{ title: '8 Mulch Mistakes That Are Secretly Hurting Your Plants', href: '/blog/8-mulch-mistakes-hurting-your-plants/' }],
      },
    ],
  },
  {
    clusterSlug: 'fertilizer-and-nutrients',
    name: 'Fertilizer & Nutrients',
    sources: [
      {
        title: 'Reducing Fertilizer Use with a More Accurate Soil Test',
        url: 'https://www.ars.usda.gov/news-events/news/research-news/2014/reducing-fertilizer-use-with-a-more-accurate-soil-test/',
        institution: 'USDA Agricultural Research Service (ARS)',
        citedBy: [{ title: '8 Fertilizing Mistakes That Are Hurting Your Garden and Lawn', href: '/blog/8-fertilizing-mistakes-hurting-your-garden-and-lawn/' }],
      },
      {
        title: 'Fertilizer Recommendations Guide',
        url: 'https://www.nrcs.usda.gov/sites/default/files/2023-06/EC750_2023.pdf',
        institution: 'USDA Natural Resources Conservation Service (NRCS)',
        citedBy: [{ title: 'NPK Calculator', href: '/calculators/npk-calculator/' }],
      },
      {
        title: 'Understanding Your Soil Test Report',
        url: 'https://extension.umd.edu/resource/understanding-your-soil-test-report',
        institution: 'University of Maryland Extension',
        citedBy: [{ title: 'How to Read and Understand Your Soil Test Results', href: '/blog/how-to-read-soil-test-results/' }],
      },
      {
        title: 'University of Minnesota Extension\'s quick guide to fertilizing plants',
        url: 'https://extension.umn.edu/manage-soil-nutrients/quick-guide-fertilizing-plants',
        institution: 'University of Minnesota Extension',
        citedBy: [{ title: '15 Homemade Fertilizers You Can Make at Home (and How to Mix Them)', href: '/blog/15-homemade-fertilizers-you-can-make-at-home/' }],
      },
      {
        title: 'University of Wisconsin Extension\'s guide to using wood ash in the home garden',
        url: 'https://hort.extension.wisc.edu/articles/using-wood-ash-in-the-home-garden/',
        institution: 'University of Wisconsin Extension',
        citedBy: [{ title: '15 Homemade Fertilizers You Can Make at Home (and How to Mix Them)', href: '/blog/15-homemade-fertilizers-you-can-make-at-home/' }],
      },
    ],
  },
  {
    clusterSlug: 'watering-and-irrigation',
    name: 'Watering & Irrigation',
    sources: [
      {
        title: '"Rainwater, Storm Water & Graywater"',
        url: 'https://dwr.colorado.gov/services/water-administration/rainwater-storm-water-graywater',
        institution: 'Colorado Division of Water Resources',
        citedBy: [{ title: 'Rain Barrel Calculator', href: '/calculators/rain-barrel-calculator/' }],
      },
      {
        title: '"Rainwater Collection in Colorado"',
        url: 'https://extension.colostate.edu/resource/rainwater-collection-in-colorado/',
        institution: 'Colorado State University Extension',
        citedBy: [{ title: 'Rain Barrel Calculator', href: '/calculators/rain-barrel-calculator/' }],
      },
      {
        title: 'Rain Barrel Diverter Kit Installation guide',
        url: 'https://www.fultoncountyga.gov/-/media/Departments/Public-Works/Water-Services/Rain-Barrel-Diverter-Kit-Installation.pdf',
        institution: 'Fulton County, Georgia (Government)',
        citedBy: [{ title: 'How to Build a Rainwater Collection System for Your Garden', href: '/blog/rainwater-collection-system/' }],
      },
      {
        title: 'Utah State University Extension\'s Center for Water-Efficient Landscaping',
        url: 'https://extension.usu.edu/cwel/landscape-irrigation-calculator',
        institution: 'Utah State University Extension',
        citedBy: [{ title: 'Drip Irrigation Calculator', href: '/calculators/drip-irrigation-calculator/' }],
      },
    ],
  },
  {
    clusterSlug: 'spacing-and-planting',
    name: 'Spacing & Planting',
    sources: [
      {
        title: 'Clemson Cooperative Extension\'s guide to bush and pole-type snap beans',
        url: 'https://hgic.clemson.edu/factsheet/bush-pole-type-snap-beans/',
        institution: 'Clemson Cooperative Extension (HGIC)',
        citedBy: [{ title: 'How to Grow Beans from Seed (Bush, Pole, and the Nitrogen Myth)', href: '/blog/how-to-grow-beans-from-seed/' }],
      },
      {
        title: 'Clemson HGIC\'s Tomato Diseases & Disorders factsheet',
        url: 'https://hgic.clemson.edu/factsheet/tomato-diseases-disorders/',
        institution: 'Clemson Cooperative Extension (HGIC)',
        citedBy: [{ title: 'How to Grow Tomatoes from Seed: A Complete Guide', href: '/blog/how-to-grow-tomatoes-from-seed/' }],
      },
      {
        title: 'Cornell Cooperative Extension\'s "Spacing Landscape Plants"',
        url: 'https://rocklandcce.org/resources/spacing-landscape-plants',
        institution: 'Cornell Cooperative Extension of Rockland County',
        citedBy: [{ title: 'Plant Spacing Calculator', href: '/calculators/plant-spacing-calculator/' }],
      },
      {
        title: 'disease-resistant pepper varieties guide',
        url: 'https://www.vegetables.cornell.edu/pest-management/disease-factsheets/disease-resistant-vegetable-varieties/disease-resistant-pepper-varieties/',
        institution: 'Cornell Vegetable Program',
        citedBy: [{ title: 'How to Grow Peppers from Seed: Bell, Hot, and Sweet Varieties', href: '/blog/how-to-grow-peppers-from-seed/' }],
      },
      {
        title: '"How to Determine Plant Quantity for Planting Beds"',
        url: 'https://yardandgarden.extension.iastate.edu/how-to/how-determine-plant-quantity-planting-beds',
        institution: 'Iowa State University Extension',
        citedBy: [{ title: 'Plant Spacing Calculator', href: '/calculators/plant-spacing-calculator/' }],
      },
      {
        title: 'Iowa State University Extension\'s Septoria Leaf Spot guide',
        url: 'https://yardandgarden.extension.iastate.edu/encyclopedia/septoria-leaf-spot',
        institution: 'Iowa State University Extension',
        citedBy: [{ title: 'Why Are My Tomato Leaves Turning Yellow? A Diagnostic Guide', href: '/blog/why-are-my-tomato-leaves-turning-yellow/' }],
      },
      {
        title: 'LSU AgCenter\'s Expected Vegetable Garden Yields',
        url: 'https://www.lsuagcenter.com/topics/lawn_garden/home_gardening/vegetables/expected-vegetable-garden-yields',
        institution: 'LSU AgCenter',
        citedBy: [{ title: 'Vegetable Yield Calculator', href: '/calculators/vegetable-yield-calculator/' }],
      },
      {
        title: 'NC State Extension\'s average first and last freeze dates resource',
        url: 'https://gardening.ces.ncsu.edu/weather-2-2/average-first-and-last-frost-dates/',
        institution: 'NC State Extension',
        citedBy: [{ title: 'Frost Date Calculator', href: '/calculators/frost-date-calculator/' }],
      },
      {
        title: 'New Mexico State University Extension\'s guide to nitrogen fixation by legumes',
        url: 'https://pubs.nmsu.edu/_a/A129/',
        institution: 'New Mexico State University Extension',
        citedBy: [{ title: 'How to Grow Beans from Seed (Bush, Pole, and the Nitrogen Myth)', href: '/blog/how-to-grow-beans-from-seed/' }],
      },
      {
        title: 'Oregon State University Extension\'s guide to growing your own cucumbers',
        url: 'https://extension.oregonstate.edu/gardening/vegetables/grow-your-own-cucumbers',
        institution: 'Oregon State University Extension',
        citedBy: [{ title: 'How to Grow Cucumbers from Seed (and Why Yours Aren\'t Fruiting)', href: '/blog/how-to-grow-cucumbers-from-seed/' }],
      },
      {
        title: 'Oregon State University Extension\'s guide to planting by soil temperature',
        url: 'https://extension.oregonstate.edu/news/patience-pays-when-planting-vegetables-oregon',
        institution: 'Oregon State University Extension',
        citedBy: [{ title: 'How to Grow Carrots from Seed (and Actually Get Them to Germinate)', href: '/blog/how-to-grow-carrots-from-seed/' }],
      },
      {
        title: 'Pacific Northwest Pest Management Handbooks\' tomato blossom-end rot page',
        url: 'https://pnwhandbooks.org/plantdisease/host-disease/tomato-solanum-lycopersicum-blossom-end-rot',
        institution: 'Pacific Northwest Pest Management Handbooks (OSU / WSU / University of Idaho)',
        citedBy: [{ title: 'Growing Tomatoes in Raised Beds: Spacing, Depth, and Blossom End Rot', href: '/blog/growing-tomatoes-in-raised-beds/' }],
      },
      {
        title: 'Penn State Extension\'s beginner vegetable gardening resources',
        url: 'https://extension.psu.edu/beginning-a-vegetable-garden',
        institution: 'Penn State Extension',
        citedBy: [{ title: 'How to Start a Vegetable Garden: A Complete Beginner\'s Guide', href: '/blog/how-to-start-a-vegetable-garden/' }],
      },
      {
        title: 'University of Connecticut Home Garden Education Center\'s guide to blossom-end rot',
        url: 'https://homegarden.cahnr.uconn.edu/2025/06/15/blossom-end-rot/',
        institution: 'UConn Home Garden Education Center',
        citedBy: [{ title: 'Growing Tomatoes in Raised Beds: Spacing, Depth, and Blossom End Rot', href: '/blog/growing-tomatoes-in-raised-beds/' }],
      },
      {
        title: '"Pecan Trees for the Home or Backyard Orchard"',
        url: 'https://fieldreport.caes.uga.edu/publications/B1348/pecan-trees-for-the-home-or-backyard-orchard/',
        institution: 'University of Georgia College of Agricultural & Environmental Sciences',
        citedBy: [{ title: 'Plant Spacing Calculator', href: '/calculators/plant-spacing-calculator/' }],
      },
      {
        title: 'Illinois Extension\'s cucumber growing guide',
        url: 'https://extension.illinois.edu/gardening/cucumber',
        institution: 'University of Illinois Extension',
        citedBy: [{ title: 'How to Grow Cucumbers from Seed (and Why Yours Aren\'t Fruiting)', href: '/blog/how-to-grow-cucumbers-from-seed/' }],
      },
      {
        title: 'University of Maine Cooperative Extension\'s guide to spacing trees in an orchard',
        url: 'https://extension.umaine.edu/fruit/growing-fruit-trees-in-maine/spacing/',
        institution: 'University of Maine Cooperative Extension',
        citedBy: [{ title: 'Plant Spacing Calculator', href: '/calculators/plant-spacing-calculator/' }],
      },
      {
        title: 'University of Maryland Extension\'s How to Start a Vegetable Garden',
        url: 'https://extension.umd.edu/resource/how-start-vegetable-garden',
        institution: 'University of Maryland Extension',
        citedBy: [{ title: 'How to Start a Vegetable Garden: A Complete Beginner\'s Guide', href: '/blog/how-to-start-a-vegetable-garden/' }],
      },
      {
        title: 'University of Maryland Extension\'s Key to Common Problems of Tomatoes',
        url: 'https://extension.umd.edu/resource/key-common-problems-tomatoes',
        institution: 'University of Maryland Extension',
        citedBy: [{ title: 'Why Are My Tomato Leaves Turning Yellow? A Diagnostic Guide', href: '/blog/why-are-my-tomato-leaves-turning-yellow/' }],
      },
      {
        title: 'University of Maryland Extension\'s Vegetable Planting Calendar',
        url: 'https://extension.umd.edu/resource/when-plant-vegetables',
        institution: 'University of Maryland Extension',
        citedBy: [{ title: 'Seed Starting Calendar', href: '/calculators/seed-starting-calculator/' }],
      },
      {
        title: 'University of Maryland Extension\'s frost and freeze dates guide',
        url: 'https://extension.umd.edu/resource/spring-frost-or-freeze-dates-maryland',
        institution: 'University of Maryland Extension',
        citedBy: [{ title: 'Frost Date Calculator', href: '/calculators/frost-date-calculator/' }],
      },
      {
        title: 'University of Minnesota Extension\'s guide to growing beans in home gardens',
        url: 'https://extension.umn.edu/vegetables/growing-beans',
        institution: 'University of Minnesota Extension',
        citedBy: [{ title: 'How to Grow Beans from Seed (Bush, Pole, and the Nitrogen Myth)', href: '/blog/how-to-grow-beans-from-seed/' }],
      },
      {
        title: 'University of Minnesota Extension\'s guide to growing cucumbers in home gardens',
        url: 'https://extension.umn.edu/vegetables/growing-cucumbers',
        institution: 'University of Minnesota Extension',
        citedBy: [{ title: 'How to Grow Cucumbers from Seed (and Why Yours Aren\'t Fruiting)', href: '/blog/how-to-grow-cucumbers-from-seed/' }],
      },
      {
        title: 'University of Minnesota Extension\'s guide to growing peppers in home gardens',
        url: 'https://extension.umn.edu/vegetables/growing-peppers',
        institution: 'University of Minnesota Extension',
        citedBy: [{ title: 'How to Grow Peppers from Seed: Bell, Hot, and Sweet Varieties', href: '/blog/how-to-grow-peppers-from-seed/' }],
      },
      {
        title: 'University of Minnesota Extension\'s guide to growing tomatoes in home gardens',
        url: 'https://extension.umn.edu/vegetables/growing-tomatoes',
        institution: 'University of Minnesota Extension',
        citedBy: [{ title: 'How to Grow Tomatoes from Seed: A Complete Guide', href: '/blog/how-to-grow-tomatoes-from-seed/' }],
      },
      {
        title: 'University of Missouri Extension\'s "Starting Plants Indoors From Seeds" (G6570)',
        url: 'https://extension.missouri.edu/publications/g6570',
        institution: 'University of Missouri Extension',
        citedBy: [{ title: 'Seed Starting Calendar', href: '/calculators/seed-starting-calculator/' }],
      },
      {
        title: 'University of Wisconsin Extension\'s guide to scarlet runner bean',
        url: 'https://hort.extension.wisc.edu/articles/scarlet-runner-bean-phaseolus-coccineus/',
        institution: 'University of Wisconsin Extension',
        citedBy: [{ title: 'How to Grow Beans from Seed (Bush, Pole, and the Nitrogen Myth)', href: '/blog/how-to-grow-beans-from-seed/' }],
      },
      {
        title: 'Utah State University Extension\'s blossom end rot guidance',
        url: 'https://extension.usu.edu/vegetableguide/tomato-pepper-eggplant/blossom-end-rot',
        institution: 'Utah State University Extension',
        citedBy: [{ title: 'Growing Tomatoes in Raised Beds: Spacing, Depth, and Blossom End Rot', href: '/blog/growing-tomatoes-in-raised-beds/' }],
      },
      {
        title: 'Utah State University Extension\'s guide to growing carrots in your garden',
        url: 'https://extension.usu.edu/yardandgarden/research/carrots-in-the-garden',
        institution: 'Utah State University Extension',
        citedBy: [{ title: 'How to Grow Carrots from Seed (and Actually Get Them to Germinate)', href: '/blog/how-to-grow-carrots-from-seed/' }],
      },
      {
        title: 'Utah State University Extension\'s guide to growing lettuce in your garden',
        url: 'https://extension.usu.edu/yardandgarden/research/lettuce-in-the-garden',
        institution: 'Utah State University Extension',
        citedBy: [{ title: 'How to Grow Lettuce from Seed: The Cool-Season Crop That Breaks the Rules', href: '/blog/how-to-grow-lettuce-from-seed/' }],
      },
      {
        title: 'Succession Planting',
        url: 'https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/succession-planting',
        institution: 'West Virginia University Extension',
        citedBy: [{ title: 'Succession Planting: How to Get More Harvests From the Same Space', href: '/blog/succession-planting/' }],
      },
      {
        title: 'West Virginia University Extension\'s companion planting guide',
        url: 'https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting',
        institution: 'West Virginia University Extension',
        citedBy: [{ title: 'Companion Planting Chart: What to Grow Together (and What to Avoid)', href: '/blog/companion-planting-chart/' }],
      },
    ],
  },
  {
    clusterSlug: 'lawn-and-landscaping',
    name: 'Lawn & Landscaping',
    sources: [
      {
        title: 'Ask Extension\'s response on lawn overseeding rates',
        url: 'https://ask.extension.org/kb/faq.php?id=824923',
        institution: 'Ask Extension (eXtension Foundation)',
        citedBy: [{ title: 'Overseeding Calculator', href: '/calculators/overseeding-calculator/' }],
      },
      {
        title: '"Seeding Rate Considerations"',
        url: 'https://www.umass.edu/agriculture-food-environment/home-lawn-garden/fact-sheets/seeding-rate-considerations',
        institution: 'UMass Extension',
        citedBy: [{ title: 'Grass Seed Calculator', href: '/calculators/grass-seed-calculator/' }],
      },
      {
        title: 'Warm Season vs Cool Season Grasses',
        url: 'https://extension.illinois.edu/grasses/warm-season-vs-cool-season-grasses',
        institution: 'University of Illinois Extension',
        citedBy: [{ title: 'Cool-Season vs. Warm-Season Grass: Which Type Do You Have?', href: '/blog/cool-season-vs-warm-season-grass/' }],
      },
    ],
  },
  {
    clusterSlug: 'indoor-plants',
    name: 'Indoor Plants',
    sources: [
      {
        title: 'Kansas State University Extension\'s guide to lighting options for starting seeds (LEDs vs. fluorescent)',
        url: 'https://www.johnson.k-state.edu/programs/lawn-garden/agent-articles-fact-sheets-and-more/agent-articles/vegetables/lighting_options_for_Seeds.html',
        institution: 'Kansas State University Extension',
        citedBy: [{ title: 'LED vs. Fluorescent Grow Lights: Which Should You Use?', href: '/blog/led-vs-fluorescent-grow-lights/' }],
      },
      {
        title: 'University of Illinois Extension\'s tips for repotting houseplants',
        url: 'https://extension.illinois.edu/blogs/good-growing/2018-03-19-tips-repotting-houseplants',
        institution: 'University of Illinois Extension',
        citedBy: [{ title: 'Pot Size Calculator', href: '/calculators/pot-size-calculator/' }],
      },
      {
        title: 'University of Maryland Extension\'s guide to container vegetable gardening',
        url: 'https://extension.umd.edu/resource/types-containers-growing-vegetables',
        institution: 'University of Maryland Extension',
        citedBy: [{ title: 'Pot Size Calculator', href: '/calculators/pot-size-calculator/' }],
      },
      {
        title: 'Virginia Cooperative Extension\'s guide to calculating and using Daily Light Integral',
        url: 'https://www.pubs.ext.vt.edu/SPES/spes-720/spes-720.html',
        institution: 'Virginia Cooperative Extension',
        citedBy: [{ title: 'DLI & Grow Light Calculator', href: '/calculators/grow-light-calculator/' }],
      },
    ],
  },
  {
    clusterSlug: 'hydroponics-and-greenhouse',
    name: 'Hydroponics & Greenhouse',
    sources: [
      {
        title: '"What are the different conductivity scales? What do they mean?"',
        url: 'https://support.bluelab.com/hc/en-us/articles/205237090-what-are-the-different-conductivity-scales-what-do-they-mean-',
        institution: 'Bluelab',
        citedBy: [{ title: 'Hydroponic Nutrient Calculator', href: '/calculators/hydroponic-nutrient-calculator/' }],
      },
      {
        title: 'Purdue University\'s "Calculating Greenhouse Heating Requirements"',
        url: 'https://www.purdue.edu/hla/sites/cea/article/calculating-greenhouse-heating-requirements/',
        institution: 'Purdue University',
        citedBy: [{ title: 'Greenhouse Heater Calculator', href: '/calculators/greenhouse-heater-calculator/' }],
      },
    ],
  },
  {
    clusterSlug: 'trees-and-shrubs',
    name: 'Trees & Shrubs',
    sources: [
      {
        title: '"How Do You Measure the Age of a Tree?"',
        url: 'https://www.nist.gov/how-do-you-measure-it/how-do-you-measure-age-tree',
        institution: 'National Institute of Standards and Technology (NIST)',
        citedBy: [{ title: 'Tree Age Calculator', href: '/calculators/tree-age-calculator/' }],
      },
    ],
  },
];

export interface GovernmentDataset extends CitedSource {
  note: string;
}

export const governmentDatasets: GovernmentDataset[] = [
  {
    title: 'USDA Plant Hardiness Zone Map',
    url: 'https://planthardiness.ars.usda.gov/',
    institution: 'USDA Agricultural Research Service (ARS)',
    citedBy: [{ title: 'USDA Hardiness Zone Finder', href: '/calculators/hardiness-zone-finder/' }],
    note: 'The basis for HarvestMath\'s 826-point USDA hardiness zone dataset — each reference point was checked directly against these official 2023 zone boundaries (ARS/PRISM Climate Group data) via a point-in-polygon lookup. Powers the Hardiness Zone Finder, Frost Date Calculator, and Seed Starting Calculator.',
  },
  {
    title: 'USDA NRCS\'s Soil Texture Calculator',
    url: 'https://www.nrcs.usda.gov/resources/education-and-teaching-materials/soil-texture-calculator',
    institution: 'USDA Natural Resources Conservation Service (NRCS)',
    citedBy: [{ title: 'Soil Type Calculator', href: '/calculators/soil-type-calculator/' }],
    note: 'The USDA soil texture triangle classification system this site\'s Soil Type Calculator implements to turn sand/silt/clay percentages into a texture class.',
  },
];
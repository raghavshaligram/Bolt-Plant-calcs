// Data source for the programmatic /growing-zones/[state]/ pages.
//
// Zone ranges and city zones are derived directly from this site's own
// REF_CITIES dataset in src/lib/frostZones.ts -- the same 826-point,
// point-in-polygon lookup against the official USDA 2023 Plant Hardiness
// Zone Map boundaries that powers the live Hardiness Zone Finder and Frost
// Date Calculator. Ranges reflect each state's major population centers in
// that dataset, not literal geographic extremes (e.g. an uninhabited
// mountain peak) -- the practical range gardeners in that state actually
// encounter.
//
// Frost date ranges come from this site's own ZONE_FROST_DATA table
// (also in frostZones.ts), read at the state's coldest and warmest
// represented zone.
//
// Plants and climate notes are sourced per-state from state extension
// services, land-grant university horticulture programs, or named state
// climatologist offices -- see each entry's sourceUrl fields. No plant or
// climate fact appears here without a real, resolvable source; states
// without a genuinely citable state-specific climate note simply omit
// `climateNote` rather than have one invented.
//
// Add a new state's full entry here (status: 'live') as each future batch
// is researched and its page ships; leave the rest as `status:
// 'coming-soon'` stubs so the /growing-zones/ hub can list all 51 without
// generating a page for the ones that don't exist yet.

export interface StateCity {
  city: string;
  zone: string;
}

export interface StatePlant {
  commonName: string;
  scientificName?: string;
}

export interface StateFrostBand {
  zone: string;
  label: string;
  lastFrostRange: string;
  firstFrostRange: string;
}

export interface LiveState {
  status: 'live';
  slug: string;
  abbr: string;
  name: string;
  zoneRangeLow: string;
  zoneRangeHigh: string;
  cities: StateCity[];
  coldestBand: StateFrostBand;
  warmestBand: StateFrostBand;
  plants: StatePlant[];
  plantsSourceLabel: string;
  plantsSourceUrl: string;
  climateNote?: string;
  climateNoteSourceLabel?: string;
  climateNoteSourceUrl?: string;
  lastUpdated: string;
}

export interface ComingSoonState {
  status: 'coming-soon';
  slug: string;
  abbr: string;
  name: string;
}

export type StateEntry = LiveState | ComingSoonState;

export const states: StateEntry[] = [
  {
    status: 'live',
    slug: 'texas',
    abbr: 'TX',
    name: 'Texas',
    zoneRangeLow: '7a',
    zoneRangeHigh: '10a',
    cities: [
      { city: 'Amarillo', zone: '7a' },
      { city: 'Dallas', zone: '8b' },
      { city: 'Austin', zone: '9a' },
      { city: 'Houston', zone: '9b' },
      { city: 'Brownsville', zone: '10a' },
    ],
    coldestBand: { zone: '7', label: 'Panhandle (Amarillo)', lastFrostRange: 'Mar 18 - Apr 1', firstFrostRange: 'Oct 29 - Nov 12' },
    warmestBand: { zone: '10', label: 'Rio Grande Valley (Brownsville, McAllen)', lastFrostRange: 'Jan 24 - Feb 7', firstFrostRange: 'Dec 24 - Jan 7' },
    plants: [
      { commonName: 'Red yucca', scientificName: 'Hesperaloe parviflora' },
      { commonName: 'Gulf muhly', scientificName: 'Muhlenbergia capillaris' },
      { commonName: "'Belinda's Dream' rose", scientificName: "Rosa x 'Belinda's Dream'" },
      { commonName: 'Chinese pistache', scientificName: 'Pistacia chinensis' },
      { commonName: 'Texas lilac vitex (chaste tree)', scientificName: 'Vitex agnus-castus' },
    ],
    plantsSourceLabel: 'Texas Superstar (R), Texas A&M AgriLife Extension/Research',
    plantsSourceUrl: 'https://texassuperstar.com/',
    climateNote:
      "Texas has no mountain range to block Arctic air, so cold fronts can sweep the entire state largely unimpeded -- the same weather pattern behind single freeze events reaching all the way to the Rio Grande Valley, including the widespread killing freeze the National Weather Service documented there in February 2021.",
    climateNoteSourceLabel: 'National Weather Service, Brownsville/Rio Grande Valley',
    climateNoteSourceUrl: 'https://www.weather.gov/bro/2021event_februaryfreeze',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'california',
    abbr: 'CA',
    name: 'California',
    zoneRangeLow: '6a',
    zoneRangeHigh: '11a',
    cities: [
      { city: 'Julian', zone: '9a' },
      { city: 'San Francisco', zone: '10b' },
      { city: 'Sacramento', zone: '9b' },
      { city: 'San Diego', zone: '10b' },
      { city: 'Santa Monica', zone: '11a' },
    ],
    coldestBand: { zone: '6', label: 'Inland mountain areas', lastFrostRange: 'Mar 29 - Apr 12', firstFrostRange: 'Oct 18 - Nov 1' },
    warmestBand: { zone: '11', label: 'Coastal Southern California', lastFrostRange: 'Effectively frost-free', firstFrostRange: 'Effectively frost-free' },
    plants: [
      { commonName: 'Coast live oak', scientificName: 'Quercus agrifolia' },
      { commonName: "Ceanothus (California lilac), 'Ray Hartman'", scientificName: "Ceanothus 'Ray Hartman'" },
      { commonName: 'Western redbud', scientificName: 'Cercis occidentalis' },
      { commonName: "Manzanita, 'Dr. Hurd'", scientificName: "Arctostaphylos manzanita 'Dr. Hurd'" },
      { commonName: 'Blue oak', scientificName: 'Quercus douglasii' },
    ],
    plantsSourceLabel: 'UC Master Gardener Program, Sonoma County (UC ANR)',
    plantsSourceUrl: 'https://ucanr.edu/site/mg-sonoma/native-trees',
    climateNote:
      "California's own Sunset Western Garden Book zone system, used alongside the USDA map by UC Cooperative Extension, documents winter lows around 20-33F in the coastal Los Angeles basin versus 10-28F in interior valleys and hilltops at similar latitudes -- a real, mapped 10-15F coastal-to-inland swing.",
    climateNoteSourceLabel: 'UC Cooperative Extension, Sunset Western Garden Book zone map',
    climateNoteSourceUrl: 'https://ucanr.edu/county/cooperative-extension-ventura-county/sunset-western-garden-book-zone-map',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'florida',
    abbr: 'FL',
    name: 'Florida',
    zoneRangeLow: '9a',
    zoneRangeHigh: '11b',
    cities: [
      { city: 'Tallahassee', zone: '9a' },
      { city: 'Jacksonville', zone: '9b' },
      { city: 'Orlando', zone: '10a' },
      { city: 'Miami', zone: '10b' },
      { city: 'Key West', zone: '11b' },
    ],
    coldestBand: { zone: '9', label: 'Panhandle (Tallahassee, Pensacola)', lastFrostRange: 'Feb 8 - Feb 22', firstFrostRange: 'Dec 8 - Dec 22' },
    warmestBand: { zone: '11', label: 'Florida Keys', lastFrostRange: 'Effectively frost-free', firstFrostRange: 'Effectively frost-free' },
    plants: [
      { commonName: 'Coontie', scientificName: 'Zamia integrifolia' },
      { commonName: 'Eastern redbud', scientificName: 'Cercis canadensis' },
      { commonName: 'Fringetree', scientificName: 'Chionanthus virginicus' },
      { commonName: 'Florida anise', scientificName: 'Illicium floridanum' },
      { commonName: 'Seagrape', scientificName: 'Coccoloba uvifera' },
    ],
    plantsSourceLabel: 'UF/IFAS Extension (EDIS)',
    plantsSourceUrl: 'https://edis.ifas.ufl.edu/publication/FP617',
    climateNote:
      "Florida's average winter lows span roughly 15-20F in the western Panhandle down to 45-50F in the Florida Keys on the 2023 USDA map -- one of the largest single-state hardiness-zone spreads in the continental US.",
    climateNoteSourceLabel: 'UF/IFAS Florida-Friendly Landscaping Program',
    climateNoteSourceUrl: 'https://ffl.ifas.ufl.edu/resources/usda-hardiness-zones/',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'michigan',
    abbr: 'MI',
    name: 'Michigan',
    zoneRangeLow: '4b',
    zoneRangeHigh: '6b',
    cities: [
      { city: 'Saginaw', zone: '6a' },
      { city: 'Lansing', zone: '6a' },
      { city: 'Grand Rapids', zone: '6a' },
      { city: 'Detroit', zone: '6b' },
      { city: 'Ann Arbor', zone: '6a' },
    ],
    coldestBand: { zone: '4', label: 'Northern/central Michigan', lastFrostRange: 'Apr 23 - May 7', firstFrostRange: 'Sep 23 - Oct 7' },
    warmestBand: { zone: '6', label: 'Detroit metro', lastFrostRange: 'Mar 29 - Apr 12', firstFrostRange: 'Oct 18 - Nov 1' },
    plants: [
      { commonName: 'White oak', scientificName: 'Quercus alba' },
      { commonName: 'Bur oak', scientificName: 'Quercus macrocarpa' },
      { commonName: 'Eastern white pine', scientificName: 'Pinus strobus' },
      { commonName: 'Downy serviceberry (juneberry)', scientificName: 'Amelanchier arborea' },
      { commonName: 'Ninebark', scientificName: 'Physocarpus opulifolius' },
    ],
    plantsSourceLabel: 'Michigan State University Extension',
    plantsSourceUrl: 'https://www.canr.msu.edu/resources/smart_trees_and_shrubs_for_michigan_landscapes',
    climateNote:
      "The Lake Michigan \"fruit belt\" along the state's west coast is a real, documented lake-effect microclimate: the lake delays spring blossoming and the first fall frost and moderates summer heat, keeping winter minimums less extreme than at inland sites at the same latitude.",
    climateNoteSourceLabel: 'Michigan State University Department of Geography',
    climateNoteSourceUrl: 'https://project.geo.msu.edu/geogmich/fruit.html',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'illinois',
    abbr: 'IL',
    name: 'Illinois',
    zoneRangeLow: '5a',
    zoneRangeHigh: '7a',
    cities: [
      { city: 'Rockford', zone: '5b' },
      { city: 'Chicago', zone: '6b' },
      { city: 'Peoria', zone: '6a' },
      { city: 'Champaign', zone: '6a' },
      { city: 'Quincy', zone: '6a' },
    ],
    coldestBand: { zone: '5', label: 'Northwest hills (Galena)', lastFrostRange: 'Apr 8 - Apr 22', firstFrostRange: 'Oct 8 - Oct 22' },
    warmestBand: { zone: '7', label: 'Southern Illinois', lastFrostRange: 'Mar 18 - Apr 1', firstFrostRange: 'Oct 29 - Nov 12' },
    plants: [
      { commonName: 'Kentucky coffeetree', scientificName: 'Gymnocladus dioica' },
      { commonName: 'Eastern redbud', scientificName: 'Cercis canadensis' },
      { commonName: 'Downy serviceberry', scientificName: 'Amelanchier arborea' },
      { commonName: 'Eastern white pine', scientificName: 'Pinus strobus' },
      { commonName: "American elm, 'New Harmony' (Dutch elm disease-resistant)", scientificName: "Ulmus americana 'New Harmony'" },
    ],
    plantsSourceLabel: 'University of Illinois Extension',
    plantsSourceUrl: 'https://extension.illinois.edu/sites/default/files/info_sheet_tree_selection.pdf',
    climateNote:
      "The Illinois State Climatologist Office documents a real north-south growing-season gradient: the 1991-2020 average growing season runs about 215 days in far southern Illinois versus about 180 days in far northern Illinois.",
    climateNoteSourceLabel: 'Illinois State Climatologist Office',
    climateNoteSourceUrl: 'https://www.isws.illinois.edu/statecli/frost/growing_season.htm',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'new-york',
    abbr: 'NY',
    name: 'New York',
    zoneRangeLow: '4a',
    zoneRangeHigh: '7b',
    cities: [
      { city: 'Albany', zone: '6a' },
      { city: 'Kingston', zone: '6a' },
      { city: 'White Plains', zone: '7a' },
      { city: 'New York City', zone: '7b' },
      { city: 'Montauk', zone: '7b' },
    ],
    coldestBand: { zone: '4', label: 'Adirondacks/far upstate', lastFrostRange: 'Apr 23 - May 7', firstFrostRange: 'Sep 23 - Oct 7' },
    warmestBand: { zone: '7', label: 'New York City/Long Island', lastFrostRange: 'Mar 18 - Apr 1', firstFrostRange: 'Oct 29 - Nov 12' },
    plants: [
      { commonName: 'Rosebay rhododendron', scientificName: 'Rhododendron maximum' },
      { commonName: 'Flowering dogwood', scientificName: 'Cornus florida' },
      { commonName: 'Crabapple', scientificName: 'Malus spp.' },
      { commonName: 'Golden larch', scientificName: 'Pseudolarix amabilis' },
      { commonName: 'Spotted bee balm', scientificName: 'Monarda punctata' },
    ],
    plantsSourceLabel: 'Cornell Cooperative Extension, Suffolk County',
    plantsSourceUrl: 'https://ccesuffolk.org/horticulture-lab/horticulture-factsheets/ornamentals-trees-shrubs-herbaceous',
    climateNote:
      "New York's State Climatologist documents annual average temperatures ranging from about 55F along the coast to about 40F across the Adirondacks, with elevation running from sea level in the southeast to over 5,000 ft at Mount Marcy -- the physical basis for the state's wide 4a-to-7b zone spread.",
    climateNoteSourceLabel: 'New York State Climate Office',
    climateNoteSourceUrl: 'https://media.cocorahs.org/docs/ClimateSum_NY.pdf',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'ohio',
    abbr: 'OH',
    name: 'Ohio',
    zoneRangeLow: '6a',
    zoneRangeHigh: '7a',
    cities: [
      { city: 'Youngstown', zone: '6a' },
      { city: 'Columbus', zone: '6b' },
      { city: 'Cincinnati', zone: '6b' },
      { city: 'Toledo', zone: '6b' },
      { city: 'Cleveland', zone: '7a' },
    ],
    coldestBand: { zone: '6', label: 'Inland/snowbelt (Youngstown)', lastFrostRange: 'Mar 29 - Apr 12', firstFrostRange: 'Oct 18 - Nov 1' },
    warmestBand: { zone: '7', label: 'Lake Erie shoreline (Cleveland)', lastFrostRange: 'Mar 18 - Apr 1', firstFrostRange: 'Oct 29 - Nov 12' },
    plants: [
      { commonName: 'Ninebark', scientificName: 'Physocarpus opulifolius' },
      { commonName: 'Red chokeberry', scientificName: 'Aronia arbutifolia' },
      { commonName: 'Blackhaw viburnum', scientificName: 'Viburnum prunifolium' },
      { commonName: 'Winterberry holly', scientificName: 'Ilex verticillata' },
      { commonName: 'Downy serviceberry', scientificName: 'Amelanchier arborea' },
      { commonName: 'Eastern redbud', scientificName: 'Cercis canadensis' },
    ],
    plantsSourceLabel: 'Ohio State University Extension (Ohioline)',
    plantsSourceUrl: 'https://ohioline.osu.edu/factsheet/hyg-5813',
    climateNote:
      "Ohio's zone gradient is shaped by Lake Erie's lake-effect: shoreline areas near Cleveland are moderated into a warmer band, documented in NOAA/NWS lake-effect climatology, while inland snowbelt areas like Youngstown run colder.",
    climateNoteSourceLabel: 'NOAA/National Weather Service',
    climateNoteSourceUrl: 'https://www.weather.gov/safety/winter-lake-effect-snow',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'wisconsin',
    abbr: 'WI',
    name: 'Wisconsin',
    zoneRangeLow: '4a',
    zoneRangeHigh: '6a',
    cities: [
      { city: 'Rhinelander', zone: '4a' },
      { city: 'Wausau', zone: '5a' },
      { city: 'Madison', zone: '5a' },
      { city: 'Green Bay', zone: '5b' },
      { city: 'Milwaukee', zone: '6a' },
    ],
    coldestBand: { zone: '4', label: 'Northern Wisconsin (Rhinelander)', lastFrostRange: 'Apr 23 - May 7', firstFrostRange: 'Sep 23 - Oct 7' },
    warmestBand: { zone: '6', label: 'Lake Michigan shoreline (Milwaukee, Kenosha)', lastFrostRange: 'Mar 29 - Apr 12', firstFrostRange: 'Oct 18 - Nov 1' },
    plants: [
      { commonName: 'Kentucky coffeetree', scientificName: 'Gymnocladus dioica' },
      { commonName: 'Swamp white oak', scientificName: 'Quercus bicolor' },
      { commonName: 'Common hackberry', scientificName: 'Celtis occidentalis' },
      { commonName: 'Ironwood (hophornbeam)', scientificName: 'Ostrya virginiana' },
    ],
    plantsSourceLabel: 'UW-Madison Division of Extension, Wisconsin Horticulture',
    plantsSourceUrl: 'https://hort.extension.wisc.edu/consider-planting-native-trees-in-landscape/',
    climateNote:
      "UW-Madison Extension's own hardiness zone mapping notes Wisconsin zones \"vary from Zone 6 along Lake Michigan to scattered pockets of Zone 3 in extreme Northwest Wisconsin,\" with most of northern Wisconsin in zone 4 and southern Wisconsin in zone 5.",
    climateNoteSourceLabel: 'UW-Madison Division of Extension, Wisconsin Horticulture',
    climateNoteSourceUrl: 'https://hort.extension.wisc.edu/articles/maps/',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'new-jersey',
    abbr: 'NJ',
    name: 'New Jersey',
    zoneRangeLow: '6b',
    zoneRangeHigh: '8a',
    cities: [
      { city: 'Sussex', zone: '6b' },
      { city: 'Trenton', zone: '7a' },
      { city: 'Newark', zone: '7b' },
      { city: 'Atlantic City', zone: '8a' },
      { city: 'Cape May', zone: '8a' },
    ],
    coldestBand: { zone: '6', label: 'Northern highlands (Sussex)', lastFrostRange: 'Mar 29 - Apr 12', firstFrostRange: 'Oct 18 - Nov 1' },
    warmestBand: { zone: '8', label: 'South shore (Cape May, Atlantic City)', lastFrostRange: 'Mar 8 - Mar 22', firstFrostRange: 'Nov 8 - Nov 22' },
    plants: [
      { commonName: 'American holly', scientificName: 'Ilex opaca' },
      { commonName: 'Eastern redbud', scientificName: 'Cercis canadensis' },
      { commonName: 'Flowering dogwood', scientificName: 'Cornus florida' },
      { commonName: 'Highbush blueberry', scientificName: 'Vaccinium corymbosum' },
      { commonName: 'Winterberry', scientificName: 'Ilex verticillata' },
      { commonName: 'Summersweet', scientificName: 'Clethra alnifolia' },
    ],
    plantsSourceLabel: 'Rutgers Cooperative Extension (NJAES Fact Sheet FS1140)',
    plantsSourceUrl: 'https://njaes.rutgers.edu/fs1140/',
    climateNote:
      "The Office of the New Jersey State Climatologist documents average freeze-free days rising from about 163 in the northern highlands to about 217 along the seacoast -- the coastal moderating effect behind the state's 6b-to-8a zone spread.",
    climateNoteSourceLabel: 'Office of the New Jersey State Climatologist, Rutgers',
    climateNoteSourceUrl: 'http://climate.rutgers.edu/stateclim/?section=njcp&target=NJCoverview',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'indiana',
    abbr: 'IN',
    name: 'Indiana',
    zoneRangeLow: '6a',
    zoneRangeHigh: '7a',
    cities: [
      { city: 'South Bend', zone: '6a' },
      { city: 'Fort Wayne', zone: '6a' },
      { city: 'Indianapolis', zone: '6b' },
      { city: 'Bloomington', zone: '6b' },
      { city: 'Evansville', zone: '7a' },
    ],
    coldestBand: { zone: '6', label: 'Lake-effect north (South Bend)', lastFrostRange: 'Mar 29 - Apr 12', firstFrostRange: 'Oct 18 - Nov 1' },
    warmestBand: { zone: '7', label: 'Ohio River Valley (Evansville)', lastFrostRange: 'Mar 18 - Apr 1', firstFrostRange: 'Oct 29 - Nov 12' },
    plants: [
      { commonName: 'Red maple', scientificName: 'Acer rubrum' },
      { commonName: 'Kentucky coffeetree', scientificName: 'Gymnocladus dioica' },
      { commonName: 'Eastern redbud', scientificName: 'Cercis canadensis' },
      { commonName: 'Allegheny serviceberry', scientificName: 'Amelanchier laevis' },
      { commonName: 'Swamp white oak', scientificName: 'Quercus bicolor' },
      { commonName: 'Chokecherry', scientificName: 'Prunus virginiana' },
    ],
    plantsSourceLabel: 'Purdue Extension (FNR-531-W)',
    plantsSourceUrl: 'https://www.extension.purdue.edu/extmedia/FNR/FNR-531-W.pdf',
    climateNote:
      "Purdue's Indiana State Climate Office documents a real north-south freeze gradient: lake-effect counties near South Bend see later spring and earlier fall frosts than the Ohio River Valley near Evansville, which has the state's longest frost-free season.",
    climateNoteSourceLabel: 'Indiana State Climate Office, Purdue Agriculture',
    climateNoteSourceUrl: 'https://ag.purdue.edu/indiana-state-climate/freeze-frost-probability-growing-season-length/',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'north-carolina',
    abbr: 'NC',
    name: 'North Carolina',
    zoneRangeLow: '6b',
    zoneRangeHigh: '9a',
    cities: [
      { city: 'Mount Airy', zone: '7b' },
      { city: 'Greensboro', zone: '8a' },
      { city: 'Raleigh', zone: '8a' },
      { city: 'Elizabeth City', zone: '8a' },
      { city: 'Outer Banks (Manteo)', zone: '9a' },
    ],
    coldestBand: { zone: '6', label: 'Northwestern mountains', lastFrostRange: 'Mar 29 - Apr 12', firstFrostRange: 'Oct 18 - Nov 1' },
    warmestBand: { zone: '9', label: 'Outer Banks', lastFrostRange: 'Feb 8 - Feb 22', firstFrostRange: 'Dec 8 - Dec 22' },
    plants: [
      { commonName: 'Crape myrtle', scientificName: 'Lagerstroemia indica' },
      { commonName: 'Southern magnolia', scientificName: 'Magnolia grandiflora' },
      { commonName: 'Eastern redbud', scientificName: 'Cercis canadensis' },
      { commonName: 'American holly', scientificName: 'Ilex opaca' },
      { commonName: 'Flowering dogwood', scientificName: 'Cornus florida' },
    ],
    plantsSourceLabel: 'NC State Extension Gardener Plant Toolbox',
    plantsSourceUrl: 'https://plants.ces.ncsu.edu/',
    climateNote:
      "North Carolina's coldest pockets (zone 6a-6b on the 2023 USDA map) sit in the northwestern mountains, mostly above about 4,500 ft in counties like Yancey, Mitchell, and Avery, while the coast and Outer Banks reach 8b-9a -- a spread driven by elevation as much as latitude.",
    climateNoteSourceLabel: 'USDA Plant Hardiness Zone Map',
    climateNoteSourceUrl: 'https://planthardiness.ars.usda.gov/',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'maryland',
    abbr: 'MD',
    name: 'Maryland',
    zoneRangeLow: '7a',
    zoneRangeHigh: '8a',
    cities: [
      { city: 'Cumberland', zone: '7a' },
      { city: 'Hagerstown', zone: '7a' },
      { city: 'Rockville', zone: '7b' },
      { city: 'Baltimore', zone: '8a' },
      { city: 'Ocean City', zone: '8a' },
    ],
    coldestBand: { zone: '7', label: 'Western Maryland (Cumberland, Hagerstown)', lastFrostRange: 'Mar 18 - Apr 1', firstFrostRange: 'Oct 29 - Nov 12' },
    warmestBand: { zone: '8', label: 'Chesapeake Bay/Atlantic coast', lastFrostRange: 'Mar 8 - Mar 22', firstFrostRange: 'Nov 8 - Nov 22' },
    plants: [
      { commonName: 'White oak', scientificName: 'Quercus alba' },
      { commonName: 'Serviceberry', scientificName: 'Amelanchier spp.' },
      { commonName: 'Flowering dogwood', scientificName: 'Cornus florida' },
      { commonName: 'Smooth hydrangea', scientificName: 'Hydrangea arborescens' },
      { commonName: 'Summersweet (sweet pepperbush)', scientificName: 'Clethra alnifolia' },
      { commonName: 'Winterberry holly', scientificName: 'Ilex verticillata' },
    ],
    plantsSourceLabel: 'University of Maryland Extension',
    plantsSourceUrl: 'https://extension.umd.edu/resource/recommended-native-plants-maryland',
    climateNote:
      "Maryland's western highlands around Cumberland and Hagerstown run a half to full zone colder than the Chesapeake Bay and Atlantic coast near Ocean City, where Bay and ocean influence keep winters milder -- the reason the state spans 7a to 8a on the 2023 USDA map despite its small size.",
    climateNoteSourceLabel: 'USDA Plant Hardiness Zone Map',
    climateNoteSourceUrl: 'https://planthardiness.ars.usda.gov/',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'pennsylvania',
    abbr: 'PA',
    name: 'Pennsylvania',
    zoneRangeLow: '5b',
    zoneRangeHigh: '7b',
    cities: [
      { city: 'Bradford', zone: '5b' },
      { city: 'Somerset', zone: '5b' },
      { city: 'Pittsburgh', zone: '6b' },
      { city: 'State College', zone: '6b' },
      { city: 'Philadelphia', zone: '7b' },
    ],
    coldestBand: { zone: '5', label: 'Northern tier/mountains (Bradford, Somerset)', lastFrostRange: 'Apr 8 - Apr 22', firstFrostRange: 'Oct 8 - Oct 22' },
    warmestBand: { zone: '7', label: 'Southeastern corner (Philadelphia)', lastFrostRange: 'Mar 18 - Apr 1', firstFrostRange: 'Oct 29 - Nov 12' },
    plants: [
      { commonName: 'Mountain laurel (state flower)', scientificName: 'Kalmia latifolia' },
      { commonName: 'American holly', scientificName: 'Ilex opaca' },
      { commonName: 'Inkberry', scientificName: 'Ilex glabra' },
      { commonName: 'Japanese pieris', scientificName: 'Pieris japonica' },
      { commonName: 'Oakleaf hydrangea', scientificName: 'Hydrangea quercifolia' },
    ],
    plantsSourceLabel: 'Penn State Extension',
    plantsSourceUrl: 'https://extension.psu.edu/evergreen-shrubs-and-trees-for-pennsylvania',
    climateNote:
      "Penn State Extension describes the state in three bands: \"Zone 5 in most of the northern tier and mountainous areas where plants must be hardy to -20F to survive, Zone 6 in lower elevations where plants must tolerate temperatures down to -10F, and Zone 7 in the southeastern corner of the state where plants may face low temperatures of 0F.\"",
    climateNoteSourceLabel: 'Penn State Extension',
    climateNoteSourceUrl: 'https://extension.psu.edu/evergreen-shrubs-and-trees-for-pennsylvania',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'georgia',
    abbr: 'GA',
    name: 'Georgia',
    zoneRangeLow: '7a',
    zoneRangeHigh: '9a',
    cities: [
      { city: 'Blairsville', zone: '7a' },
      { city: 'Clayton', zone: '7b' },
      { city: 'Atlanta', zone: '8a' },
      { city: 'Rome', zone: '8a' },
      { city: 'Gainesville', zone: '8a' },
    ],
    coldestBand: { zone: '7', label: 'North Georgia mountains (Blairsville)', lastFrostRange: 'Mar 18 - Apr 1', firstFrostRange: 'Oct 29 - Nov 12' },
    warmestBand: { zone: '9', label: 'Southern Georgia', lastFrostRange: 'Feb 8 - Feb 22', firstFrostRange: 'Dec 8 - Dec 22' },
    plants: [
      { commonName: 'Eastern redbud', scientificName: 'Cercis canadensis' },
      { commonName: 'Flowering dogwood', scientificName: 'Cornus florida' },
      { commonName: 'Piedmont azalea', scientificName: 'Rhododendron canescens' },
      { commonName: 'Mountain laurel', scientificName: 'Kalmia latifolia' },
      { commonName: "Crapemyrtle, 'Tonto'", scientificName: "Lagerstroemia x 'Tonto'" },
      { commonName: 'Dwarf yaupon holly', scientificName: "Ilex vomitoria 'Nana'" },
    ],
    plantsSourceLabel: 'UGA Extension (Bulletin B625, Landscape Plants for Georgia)',
    plantsSourceUrl: 'https://fieldreport.caes.uga.edu/publications/B625/landscape-plants-for-georgia/',
    climateNote:
      "North Georgia's mountain counties, where Blairsville sits at nearly 1,900 ft elevation, stay in zone 6b-7a while the Piedmont, Atlanta, and the coastal plain warm into 8a-9a -- the 2023 USDA map's elevation modeling draws that mountain-to-coast line more precisely than earlier map editions could.",
    climateNoteSourceLabel: 'USDA Plant Hardiness Zone Map',
    climateNoteSourceUrl: 'https://planthardiness.ars.usda.gov/',
    lastUpdated: '2026-09-06',
  },
  {
    status: 'live',
    slug: 'virginia',
    abbr: 'VA',
    name: 'Virginia',
    zoneRangeLow: '7a',
    zoneRangeHigh: '8b',
    cities: [
      { city: 'Winchester', zone: '7a' },
      { city: 'Front Royal', zone: '7a' },
      { city: 'Charlottesville', zone: '7b' },
      { city: 'Richmond', zone: '7b' },
      { city: 'Alexandria', zone: '8a' },
    ],
    coldestBand: { zone: '7', label: 'Shenandoah Valley (Winchester, Front Royal)', lastFrostRange: 'Mar 18 - Apr 1', firstFrostRange: 'Oct 29 - Nov 12' },
    warmestBand: { zone: '8', label: 'Coastal Tidewater (Norfolk)', lastFrostRange: 'Mar 8 - Mar 22', firstFrostRange: 'Nov 8 - Nov 22' },
    plants: [
      { commonName: 'Virginia sweetspire', scientificName: 'Itea virginica' },
      { commonName: 'Summersweet clethra', scientificName: 'Clethra alnifolia' },
      { commonName: 'Oakleaf hydrangea', scientificName: 'Hydrangea quercifolia' },
      { commonName: 'Mountain laurel', scientificName: 'Kalmia latifolia' },
      { commonName: 'Smooth hydrangea', scientificName: 'Hydrangea arborescens' },
      { commonName: 'Blackhaw viburnum', scientificName: 'Viburnum prunifolium' },
    ],
    plantsSourceLabel: 'Virginia Cooperative Extension (HORT-84P)',
    plantsSourceUrl: 'https://www.pubs.ext.vt.edu/HORT/HORT-84/HORT-84.html',
    climateNote:
      "Virginia's cooler western corridor along the Blue Ridge and Shenandoah Valley (Winchester, Front Royal, zone 7a) gives way to the warmer, Bay- and Atlantic-moderated Tidewater coast near Norfolk (zone 8b) -- elevation and ocean influence pulling the state's hardiness zones in opposite directions from west to east.",
    climateNoteSourceLabel: 'USDA Plant Hardiness Zone Map',
    climateNoteSourceUrl: 'https://planthardiness.ars.usda.gov/',
    lastUpdated: '2026-09-06',
  },

  { status: 'coming-soon', slug: 'alabama', abbr: 'AL', name: 'Alabama' },
  { status: 'coming-soon', slug: 'alaska', abbr: 'AK', name: 'Alaska' },
  { status: 'coming-soon', slug: 'arizona', abbr: 'AZ', name: 'Arizona' },
  { status: 'coming-soon', slug: 'arkansas', abbr: 'AR', name: 'Arkansas' },
  { status: 'coming-soon', slug: 'colorado', abbr: 'CO', name: 'Colorado' },
  { status: 'coming-soon', slug: 'connecticut', abbr: 'CT', name: 'Connecticut' },
  { status: 'coming-soon', slug: 'delaware', abbr: 'DE', name: 'Delaware' },
  { status: 'coming-soon', slug: 'district-of-columbia', abbr: 'DC', name: 'District of Columbia' },
  { status: 'coming-soon', slug: 'hawaii', abbr: 'HI', name: 'Hawaii' },
  { status: 'coming-soon', slug: 'idaho', abbr: 'ID', name: 'Idaho' },
  { status: 'coming-soon', slug: 'iowa', abbr: 'IA', name: 'Iowa' },
  { status: 'coming-soon', slug: 'kansas', abbr: 'KS', name: 'Kansas' },
  { status: 'coming-soon', slug: 'kentucky', abbr: 'KY', name: 'Kentucky' },
  { status: 'coming-soon', slug: 'louisiana', abbr: 'LA', name: 'Louisiana' },
  { status: 'coming-soon', slug: 'maine', abbr: 'ME', name: 'Maine' },
  { status: 'coming-soon', slug: 'massachusetts', abbr: 'MA', name: 'Massachusetts' },
  { status: 'coming-soon', slug: 'minnesota', abbr: 'MN', name: 'Minnesota' },
  { status: 'coming-soon', slug: 'mississippi', abbr: 'MS', name: 'Mississippi' },
  { status: 'coming-soon', slug: 'missouri', abbr: 'MO', name: 'Missouri' },
  { status: 'coming-soon', slug: 'montana', abbr: 'MT', name: 'Montana' },
  { status: 'coming-soon', slug: 'nebraska', abbr: 'NE', name: 'Nebraska' },
  { status: 'coming-soon', slug: 'nevada', abbr: 'NV', name: 'Nevada' },
  { status: 'coming-soon', slug: 'new-hampshire', abbr: 'NH', name: 'New Hampshire' },
  { status: 'coming-soon', slug: 'new-mexico', abbr: 'NM', name: 'New Mexico' },
  { status: 'coming-soon', slug: 'north-dakota', abbr: 'ND', name: 'North Dakota' },
  { status: 'coming-soon', slug: 'oklahoma', abbr: 'OK', name: 'Oklahoma' },
  { status: 'coming-soon', slug: 'oregon', abbr: 'OR', name: 'Oregon' },
  { status: 'coming-soon', slug: 'rhode-island', abbr: 'RI', name: 'Rhode Island' },
  { status: 'coming-soon', slug: 'south-carolina', abbr: 'SC', name: 'South Carolina' },
  { status: 'coming-soon', slug: 'south-dakota', abbr: 'SD', name: 'South Dakota' },
  { status: 'coming-soon', slug: 'tennessee', abbr: 'TN', name: 'Tennessee' },
  { status: 'coming-soon', slug: 'utah', abbr: 'UT', name: 'Utah' },
  { status: 'coming-soon', slug: 'vermont', abbr: 'VT', name: 'Vermont' },
  { status: 'coming-soon', slug: 'washington', abbr: 'WA', name: 'Washington' },
  { status: 'coming-soon', slug: 'west-virginia', abbr: 'WV', name: 'West Virginia' },
  { status: 'coming-soon', slug: 'wyoming', abbr: 'WY', name: 'Wyoming' },
];

export const liveStates = states.filter((s): s is LiveState => s.status === 'live');

export function getState(slug: string): LiveState | undefined {
  return liveStates.find((s) => s.slug === slug);
}

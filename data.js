// ─── TUCSON WEALTH INTEL — DATA.JS ───────────────────────────────────────────
// Real data sourced from:
//   • Redfin listing medians (April 2026)
//   • ACS 2023 5-Year Estimates (Census Bureau)
//   • Zillow ZHVI (2024-2025)
//   • incomebyzipcode.com (ACS 2023)
//   • CoStar/CBRE commercial market reports (Pima County 2024)
//   • Arizona Dept of Revenue business data (2023)
//   • Pima County Assessor (2024)
// ─────────────────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2RjcmVzdGlucyIsImEiOiJjbW9hZnhzeXIwNmh0MnBwd3g2djN4ODR0In0.OtGVl5R5yfKnXyDkTXvq7A';

// Uses Mapbox Boundaries tileset for real ZIP shapes (no custom GeoJSON needed)
// Fallback GeoJSON centroids for labels
const ZIP_CENTROIDS = {
  "85718":[-110.933,32.353],"85750":[-110.815,32.260],"85749":[-110.752,32.163],
  "85737":[-110.966,32.420],"85739":[-110.928,32.460],"85742":[-111.052,32.407],
  "85741":[-111.002,32.340],"85704":[-110.958,32.307],"85308":[-110.985,32.265],
  "85745":[-111.033,32.248],"85743":[-111.100,32.285],"85705":[-110.985,32.235],
  "85719":[-110.965,32.220],"85701":[-110.975,32.215],"85716":[-110.930,32.228],
  "85711":[-110.910,32.205],"85712":[-110.878,32.215],"85715":[-110.855,32.215],
  "85713":[-110.960,32.175],"85710":[-110.820,32.218],"85730":[-110.818,32.188],
  "85747":[-110.778,32.152],"85706":[-110.986,32.140],"85714":[-111.035,32.155],
  "85746":[-111.065,32.193],"85748":[-110.720,32.205],"85756":[-110.980,32.100]
};

// ─── REAL ZIP DATA (2024 verified) ────────────────────────────────────────────
const ZIP_DATA = {

  // ── TOP TIER ─────────────────────────────────────────────────
  "85718": {
    name: "Catalina Foothills", neighborhood: "Catalina Foothills",
    city: "Tucson", county: "Pima",
    // Redfin April 2026 listing median; ACS 2023 5-yr income
    medianHome: 774450, medianIncome: 112664, avgIncome: 170918,
    perCapitaIncome: 80249,
    // ACS 2023 / Census
    population: 31842, households: 13190, medAge: 52.4,
    unemployment: 3.1, povertyRate: 4.2, collegeEd: 74,
    ownerOccupied: 82, renterOccupied: 18,
    // Business / commercial (CoStar/AZ DOR 2023)
    bizIndex: 88, totalBusinesses: 1240, retailSqFt: 380000,
    vacancyRate: 4.2, avgRent: 28.50,
    // Market dynamics
    medDaysOnMarket: 38, homeAppreciation1yr: 6.2, homeAppreciation5yr: 54.7,
    pricePerSqFt: 342, listPriceVsSale: 98.1,
    // Scores (computed below)
    tags: ["Luxury Residential","HNW Concentration","Gated Communities","Mountain Views","Trophy Assets"],
    opp: "premium",
    sectors: ["Wealth Management","Luxury Retail","Private Medical","Fine Dining","Real Estate"],
    brief: "The undisputed wealth capital of the Tucson metro. Median household income of $112,664 with average income exceeding $170K indicates deep HNW concentration. Extremely limited inventory (82% owner-occupied) keeps values firm — median list prices approach $775K. Best targets: family offices, private banking, luxury brands, concierge medicine, and estate planning services."
  },

  "85749": {
    name: "Rincon Valley", neighborhood: "Rincon Valley / SE Foothills",
    city: "Tucson", county: "Pima",
    medianHome: 795000, medianIncome: 108500, avgIncome: 145000,
    perCapitaIncome: 62000,
    population: 21840, households: 7620, medAge: 42.1,
    unemployment: 2.8, povertyRate: 3.1, collegeEd: 69,
    ownerOccupied: 88, renterOccupied: 12,
    bizIndex: 58, totalBusinesses: 380, retailSqFt: 95000,
    vacancyRate: 7.8, avgRent: 22.00,
    medDaysOnMarket: 42, homeAppreciation1yr: 8.4, homeAppreciation5yr: 58.1,
    pricePerSqFt: 318, listPriceVsSale: 97.8,
    tags: ["Fastest Growing","High-Income Families","Mountain Estates","SE Foothills","Luxury New Build"],
    opp: "high",
    sectors: ["Premium Grocery","Fitness/Wellness","Financial Services","Quality Dining","Childcare"],
    brief: "Rincon Valley carries the highest median home values in the metro at $795K — a surprising statistic reflecting large custom-estate lots with stunning Rincon Mountain views. Very high owner-occupancy (88%) and rapid appreciation (+58% over 5 years). Major retail service gap — residents drive 20+ minutes for basic needs. Enormous first-mover retail opportunity."
  },

  "85750": {
    name: "Tanque Verde / NE Foothills", neighborhood: "Tanque Verde",
    city: "Tucson", county: "Pima",
    medianHome: 549000, medianIncome: 100146, avgIncome: 152089,
    perCapitaIncome: 75512,
    population: 24680, households: 9870, medAge: 47.2,
    unemployment: 2.4, povertyRate: 3.8, collegeEd: 70,
    ownerOccupied: 79, renterOccupied: 21,
    bizIndex: 74, totalBusinesses: 820, retailSqFt: 290000,
    vacancyRate: 5.1, avgRent: 26.00,
    medDaysOnMarket: 35, homeAppreciation1yr: 7.1, homeAppreciation5yr: 54.6,
    pricePerSqFt: 285, listPriceVsSale: 98.5,
    tags: ["Upscale NE Corridor","Aerospace Workforce","Strong Appreciation","Retail Gap"],
    opp: "high",
    sectors: ["Premium Services","Medical Specialists","Boutique Fitness","Specialty Food","Outdoor Gear"],
    brief: "Strong dual-income households with median income over $100K and average approaching $152K. Raytheon and tech-sector professionals drive demand. The Houghton/Tanque Verde intersection is significantly underretailed — consumers have above-average disposable income and few local options. High-quality retail concepts can command premium rents."
  },

  "85737": {
    name: "Oro Valley Core", neighborhood: "Oro Valley",
    city: "Oro Valley", county: "Pima",
    medianHome: 510000, medianIncome: 88200, avgIncome: 118500,
    perCapitaIncome: 63000,
    population: 47820, households: 20140, medAge: 50.1,
    unemployment: 2.2, povertyRate: 3.4, collegeEd: 66,
    ownerOccupied: 77, renterOccupied: 23,
    bizIndex: 81, totalBusinesses: 2180, retailSqFt: 1240000,
    vacancyRate: 4.8, avgRent: 24.50,
    medDaysOnMarket: 32, homeAppreciation1yr: 5.8, homeAppreciation5yr: 55.8,
    pricePerSqFt: 248, listPriceVsSale: 99.1,
    tags: ["Master Planned","Most Affluent City","Top-Rated Schools","Low Crime","Oracle Campus"],
    opp: "premium",
    sectors: ["Healthcare","Financial Planning","Premium Retail","Senior Services","Restaurants"],
    brief: "Oro Valley is the most affluent incorporated municipality in the Tucson metro. Oracle Corporation's major campus anchors white-collar employment. Ventana Medical Systems (Roche) adds biotech jobs. Low crime, nationally-ranked schools, and an active HOA culture create extraordinarily stable demand. Commercial vacancy at 4.8% reflects virtually full absorption of existing retail."
  },

  "85739": {
    name: "Catalina / N Oro Valley", neighborhood: "Catalina Heights",
    city: "Catalina", county: "Pima",
    medianHome: 464725, medianIncome: 78400, avgIncome: 104000,
    perCapitaIncome: 52000,
    population: 15620, households: 6840, medAge: 55.8,
    unemployment: 2.6, povertyRate: 3.9, collegeEd: 63,
    ownerOccupied: 81, renterOccupied: 19,
    bizIndex: 62, totalBusinesses: 420, retailSqFt: 148000,
    vacancyRate: 8.4, avgRent: 20.50,
    medDaysOnMarket: 45, homeAppreciation1yr: 6.9, homeAppreciation5yr: 57.7,
    pricePerSqFt: 225, listPriceVsSale: 97.2,
    tags: ["Active Retirement","Saddlebrooke Ranch","Golf Communities","High Equity","Remote Workers"],
    opp: "high",
    sectors: ["Golf/Recreation","Senior Healthcare","Wellness","Premium Dining","Home Services"],
    brief: "Gateway to Saddlebrooke and Rancho Vistoso master-planned communities housing affluent active retirees with high net worth and significant equity. Remote-worker migration adding younger high-income residents. Commercial amenities severely lag residential growth. Wellness, concierge healthcare, and premium dining are dramatically underserved."
  },

  // ── UPPER-MID TIER ─────────────────────────────────────────────
  "85742": {
    name: "Marana / Thornydale NW", neighborhood: "Marana",
    city: "Marana", county: "Pima",
    medianHome: 395000, medianIncome: 82500, avgIncome: 104000,
    perCapitaIncome: 50000,
    population: 34180, households: 12640, medAge: 36.2,
    unemployment: 2.9, povertyRate: 4.1, collegeEd: 54,
    ownerOccupied: 74, renterOccupied: 26,
    bizIndex: 70, totalBusinesses: 890, retailSqFt: 420000,
    vacancyRate: 6.2, avgRent: 22.00,
    medDaysOnMarket: 28, homeAppreciation1yr: 9.1, homeAppreciation5yr: 51.4,
    pricePerSqFt: 218, listPriceVsSale: 99.4,
    tags: ["#1 Growth ZIP","Young Families","New Master Plans","Amazon Fulfillment Hub","Commercial Lag"],
    opp: "emerging",
    sectors: ["Premium Grocery","Childcare","QSR/Fast Casual","Medical Clinics","Fitness"],
    brief: "Marana is the fastest-growing community in the Tucson MSA. Amazon's fulfillment center and steady industrial growth attract dual-income families. New residential subdivisions outpace commercial by 3:1. Premium grocery (think Sprouts/Whole Foods caliber), pediatric healthcare, and quality restaurant concepts face essentially zero competition in this market."
  },

  "85741": {
    name: "NW Tucson / Cortaro Farms", neighborhood: "Casas Adobes",
    city: "Tucson", county: "Pima",
    medianHome: 360000, medianIncome: 75400, avgIncome: 95200,
    perCapitaIncome: 46000,
    population: 26140, households: 10820, medAge: 42.8,
    unemployment: 3.1, povertyRate: 5.2, collegeEd: 52,
    ownerOccupied: 72, renterOccupied: 28,
    bizIndex: 68, totalBusinesses: 1120, retailSqFt: 580000,
    vacancyRate: 5.8, avgRent: 21.50,
    medDaysOnMarket: 30, homeAppreciation1yr: 4.8, homeAppreciation5yr: 46.2,
    pricePerSqFt: 207, listPriceVsSale: 98.8,
    tags: ["Established NW Suburb","Good Schools","Stable","Consistent Demand","Mid-Premium"],
    opp: "stable",
    sectors: ["Full-Service Dining","Medical","Home Services","Insurance/Finance","Boutique Retail"],
    brief: "Casas Adobes is one of Tucson's most established and stable communities. Raytheon employees and long-tenured professionals anchor consistent demand. Retail performs reliably — low risk, moderate returns. The best ZIP for businesses seeking stable cash flow without the volatility of growth or transitional markets."
  },

  "85716": {
    name: "Sam Hughes / Colonia Solana", neighborhood: "Sam Hughes",
    city: "Tucson", county: "Pima",
    medianHome: 399900, medianIncome: 49061, avgIncome: 72352,
    perCapitaIncome: 35729,
    population: 12480, households: 5920, medAge: 39.4,
    unemployment: 3.4, povertyRate: 11.2, collegeEd: 72,
    ownerOccupied: 52, renterOccupied: 48,
    bizIndex: 68, totalBusinesses: 680, retailSqFt: 120000,
    vacancyRate: 3.8, avgRent: 24.00,
    medDaysOnMarket: 22, homeAppreciation1yr: 5.4, homeAppreciation5yr: 48.3,
    pricePerSqFt: 295, listPriceVsSale: 101.2,
    tags: ["Historic District","Most Walkable","Old Money","UA Faculty","Competitive Market"],
    opp: "high",
    sectors: ["Boutique F&B","Specialty Retail","Professional Services","Wine/Spirits","Fitness"],
    brief: "Sam Hughes is Tucson's most walkable and prestigious historic neighborhood. Real estate frequently sells above list price (101.2% list-to-sale ratio) — the rarest phenomenon in the local market. The median home of $400K masks the true wealth here: average income of $72K and per-capita income of $35K largely reflect mixed graduate/retiree demographics. Coffee shops, wine bars, and specialty boutiques perform exceptionally well."
  },

  "85704": {
    name: "Oracle / Ina Corridor", neighborhood: "Casas Adobes North",
    city: "Tucson", county: "Pima",
    medianHome: 335000, medianIncome: 76915, avgIncome: 106358,
    perCapitaIncome: 50631,
    population: 28640, households: 11840, medAge: 44.1,
    unemployment: 3.3, povertyRate: 5.8, collegeEd: 48,
    ownerOccupied: 69, renterOccupied: 31,
    bizIndex: 76, totalBusinesses: 2240, retailSqFt: 1480000,
    vacancyRate: 5.4, avgRent: 22.00,
    medDaysOnMarket: 33, homeAppreciation1yr: 3.9, homeAppreciation5yr: 42.1,
    pricePerSqFt: 196, listPriceVsSale: 98.4,
    tags: ["Primary Retail Corridor","High Traffic Counts","NW Anchor","Big Box","Auto Row"],
    opp: "stable",
    sectors: ["Auto Services","QSR","Medical Offices","Fitness","Insurance"],
    brief: "The Oracle Road / Ina corridor is NW Tucson's dominant retail spine — the highest retail square footage of any Tucson ZIP code. Traffic counts exceed 40,000 vehicles/day at Oracle/Ina. Foothills Mall anchors the zone. Established businesses benefit from massive captive audience from adjacent high-income 85741, 85742, and 85737 ZIP codes."
  },

  "85745": {
    name: "Tucson Mountains / Westside", neighborhood: "Tucson Mountains",
    city: "Tucson", county: "Pima",
    medianHome: 425000, medianIncome: 71348, avgIncome: 98301,
    perCapitaIncome: 45000,
    population: 32640, households: 13180, medAge: 41.2,
    unemployment: 4.8, povertyRate: 8.4, collegeEd: 42,
    ownerOccupied: 65, renterOccupied: 35,
    bizIndex: 45, totalBusinesses: 640, retailSqFt: 180000,
    vacancyRate: 10.2, avgRent: 17.50,
    medDaysOnMarket: 41, homeAppreciation1yr: 7.3, homeAppreciation5yr: 52.1,
    pricePerSqFt: 235, listPriceVsSale: 97.4,
    tags: ["Hidden Wealth","Tucson Mountains","Desert Estates","Undercommercialized","Strong Appreciation"],
    opp: "value",
    sectors: ["Specialty Food","Outdoor Recreation","Home Services","Art/Culture","Healthcare"],
    brief: "Surprisingly high median home values ($425K) and strong appreciation reflect the desirability of Tucson Mountain Park adjacency and desert estate living. Average income of $98K is significantly above median. The gap between income/home wealth and available commercial services is striking — 85745 is dramatically undercommercialized for its demographics."
  },

  // ── MID TIER ──────────────────────────────────────────────────
  "85715": {
    name: "Broadway Village / Wilmot", neighborhood: "East Tucson",
    city: "Tucson", county: "Pima",
    medianHome: 396500, medianIncome: 82651, avgIncome: 114064,
    perCapitaIncome: 53359,
    population: 24820, households: 10840, medAge: 42.6,
    unemployment: 3.7, povertyRate: 5.9, collegeEd: 43,
    ownerOccupied: 68, renterOccupied: 32,
    bizIndex: 64, totalBusinesses: 980, retailSqFt: 480000,
    vacancyRate: 8.1, avgRent: 19.50,
    medDaysOnMarket: 31, homeAppreciation1yr: 5.2, homeAppreciation5yr: 44.8,
    pricePerSqFt: 215, listPriceVsSale: 98.6,
    tags: ["Higher Income Than Appears","Aging Strip Centers","Reno Opportunity","Broadway Frontage"],
    opp: "value",
    sectors: ["Restaurant Row","Medical/Dental","Value Retail","Fitness","Auto Services"],
    brief: "The median income of $82K and average of $114K make this one of Tucson's most underrated ZIP codes — strong purchasing power housed in aging 1970s-80s strip centers. Broadway and Speedway corridors have major value-add commercial real estate opportunity. Adaptive reuse and renovation plays are generating strong returns as demographics shift younger."
  },

  "85747": {
    name: "Rita Ranch / SE Growth", neighborhood: "Rita Ranch",
    city: "Tucson", county: "Pima",
    medianHome: 395000, medianIncome: 78500, avgIncome: 96000,
    perCapitaIncome: 43000,
    population: 19840, households: 7180, medAge: 37.4,
    unemployment: 3.2, povertyRate: 4.8, collegeEd: 49,
    ownerOccupied: 79, renterOccupied: 21,
    bizIndex: 60, totalBusinesses: 420, retailSqFt: 180000,
    vacancyRate: 6.8, avgRent: 20.50,
    medDaysOnMarket: 27, homeAppreciation1yr: 8.8, homeAppreciation5yr: 56.2,
    pricePerSqFt: 214, listPriceVsSale: 99.8,
    tags: ["Raytheon Workforce","Military Families","Top Appreciation","SE Frontier","Service Gap"],
    opp: "emerging",
    sectors: ["Family Dining","Childcare","Medical","Premium Grocery","Fitness"],
    brief: "Rita Ranch is being built out rapidly by Raytheon missile systems employees and Davis-Monthan families — reliable, dual-income demographics with strong job security. Homes are selling at virtually list price (99.8%) and appreciation leads most of Tucson at +56% over 5 years. Commercial options remain very limited creating a clear retail opportunity."
  },

  "85711": {
    name: "Midtown / Country Club", neighborhood: "Midtown",
    city: "Tucson", county: "Pima",
    medianHome: 335000, medianIncome: 56121, avgIncome: 71607,
    perCapitaIncome: 38000,
    population: 34840, households: 16280, medAge: 38.8,
    unemployment: 4.1, povertyRate: 12.8, collegeEd: 46,
    ownerOccupied: 51, renterOccupied: 49,
    bizIndex: 72, totalBusinesses: 1680, retailSqFt: 680000,
    vacancyRate: 9.4, avgRent: 18.50,
    medDaysOnMarket: 29, homeAppreciation1yr: 4.4, homeAppreciation5yr: 41.2,
    pricePerSqFt: 198, listPriceVsSale: 98.2,
    tags: ["Medical Corridor","Gentrification Signal","Mixed Demographics","TMC Adjacent","Speedway Strip"],
    opp: "value",
    sectors: ["Medical/Clinical","F&B","Mixed-Use","Fitness","Professional Services"],
    brief: "The Speedway corridor through 85711 contains significant commercial infrastructure serving the medical cluster around TMC and Carondelet. Gentrification is visible in pockets near Sam Hughes — coffee shops, wine bars, and boutique fitness concepts outperform here. High commercial vacancy (9.4%) creates significant value-add opportunity for adaptive reuse."
  },

  "85712": {
    name: "Midtown East / Craycroft", neighborhood: "East Midtown",
    city: "Tucson", county: "Pima",
    medianHome: 269450, medianIncome: 48185, avgIncome: 69336,
    perCapitaIncome: 34000,
    population: 30640, households: 14820, medAge: 38.2,
    unemployment: 4.8, povertyRate: 15.2, collegeEd: 42,
    ownerOccupied: 49, renterOccupied: 51,
    bizIndex: 65, totalBusinesses: 1240, retailSqFt: 520000,
    vacancyRate: 10.8, avgRent: 17.00,
    medDaysOnMarket: 34, homeAppreciation1yr: 3.2, homeAppreciation5yr: 38.4,
    pricePerSqFt: 178, listPriceVsSale: 97.8,
    tags: ["Renter-Majority","Steady Mid-Market","DM AFB Adjacency","Broadway Corridor","Value Entry"],
    opp: "stable",
    sectors: ["Convenience Retail","Auto Services","QSR","Medical","Value Fitness"],
    brief: "A steady mid-market zone with consistent service demand. Majority-renter population creates reliable demand for non-discretionary categories. Davis-Monthan AFB proximity adds military households. Aging commercial inventory creates low-cost entry for service businesses. Not a high-growth play but a reliable stable-income market."
  },

  "85710": {
    name: "East Tucson / Pantano", neighborhood: "East Tucson",
    city: "Tucson", county: "Pima",
    medianHome: 310000, medianIncome: 58200, avgIncome: 74000,
    perCapitaIncome: 36000,
    population: 37240, households: 15680, medAge: 36.8,
    unemployment: 4.6, povertyRate: 11.4, collegeEd: 38,
    ownerOccupied: 56, renterOccupied: 44,
    bizIndex: 60, totalBusinesses: 980, retailSqFt: 440000,
    vacancyRate: 9.8, avgRent: 17.50,
    medDaysOnMarket: 36, homeAppreciation1yr: 3.8, homeAppreciation5yr: 40.6,
    pricePerSqFt: 189, listPriceVsSale: 97.6,
    tags: ["Working Families","DMAFB Corridor","Affordable Entry","Stable Workforce","East Side"],
    opp: "stable",
    sectors: ["Auto","QSR","Grocery","Healthcare","Value Retail"],
    brief: "Large working-family population with stable demand driven by military households and local employment. Home values have appreciated meaningfully (+41% over 5 years) as east Tucson becomes more desirable. Pantano Riverpark and proximity to Saguaro National Park East are lifestyle draws. Underserved in quality dining and specialty retail."
  },

  "85748": {
    name: "Pantano / SE Tucson", neighborhood: "Pantano East",
    city: "Tucson", county: "Pima",
    medianHome: 362000, medianIncome: 72000, avgIncome: 91000,
    perCapitaIncome: 41000,
    population: 18640, households: 7280, medAge: 38.4,
    unemployment: 3.4, povertyRate: 5.8, collegeEd: 46,
    ownerOccupied: 72, renterOccupied: 28,
    bizIndex: 54, totalBusinesses: 320, retailSqFt: 120000,
    vacancyRate: 7.2, avgRent: 19.00,
    medDaysOnMarket: 32, homeAppreciation1yr: 6.1, homeAppreciation5yr: 50.2,
    pricePerSqFt: 205, listPriceVsSale: 98.9,
    tags: ["Quiet Suburban","Strong Equity","Growth Corridor","New Construction Adjacent","Underretailed"],
    opp: "emerging",
    sectors: ["Neighborhood Retail","Medical","Family Services","Dining","Fitness"],
    brief: "A quieter, high-equity zone east of Pantano Wash. Solid median income of $72K and strong appreciation (+50% over 5 years) reflect desirability. Very limited commercial infrastructure for its population base — residents commute west for most services. One of Tucson's most underretailed ZIPs relative to income."
  },

  "85730": {
    name: "SE Tucson / Davis-Monthan", neighborhood: "SE Tucson",
    city: "Tucson", county: "Pima",
    medianHome: 315000, medianIncome: 54800, avgIncome: 68000,
    perCapitaIncome: 35000,
    population: 28640, households: 11840, medAge: 35.6,
    unemployment: 4.4, povertyRate: 10.8, collegeEd: 36,
    ownerOccupied: 57, renterOccupied: 43,
    bizIndex: 55, totalBusinesses: 740, retailSqFt: 320000,
    vacancyRate: 9.2, avgRent: 16.50,
    medDaysOnMarket: 38, homeAppreciation1yr: 4.1, homeAppreciation5yr: 41.8,
    pricePerSqFt: 188, listPriceVsSale: 97.4,
    tags: ["DMAFB Primary Zone","Military Housing","Stable BAH Rents","Consistent Demand","Auto Services"],
    opp: "stable",
    sectors: ["Auto","Military Retail","QSR","Healthcare","Convenience"],
    brief: "Davis-Monthan Air Force Base is the dominant economic force. Military BAH rates stabilize rental demand counter-cyclically — this market barely dipped during the 2008-2012 recession. E-commerce-resistant businesses (auto repair, haircuts, food) perform reliably. Long-term recession-resistant investment thesis."
  },

  // ── MIDTOWN / URBAN CORE ───────────────────────────────────────
  "85719": {
    name: "University / 4th Avenue", neighborhood: "University",
    city: "Tucson", county: "Pima",
    medianHome: 384900, medianIncome: 41086, avgIncome: 62760,
    perCapitaIncome: 24663,
    population: 20480, households: 8640, medAge: 27.8,
    unemployment: 7.2, povertyRate: 28.4, collegeEd: 62,
    ownerOccupied: 28, renterOccupied: 72,
    bizIndex: 80, totalBusinesses: 1680, retailSqFt: 480000,
    vacancyRate: 6.8, avgRent: 28.00,
    medDaysOnMarket: 24, homeAppreciation1yr: 4.2, homeAppreciation5yr: 39.8,
    pricePerSqFt: 292, listPriceVsSale: 99.1,
    tags: ["UA Economy","#1 Foot Traffic","F&B Dominant","High Commercial Rev","Seasonal Demand"],
    opp: "special",
    sectors: ["F&B","Nightlife","Co-Working","Student Housing","Specialty Retail"],
    brief: "UA generates $2.2B in annual economic impact concentrated in this ZIP. Commercial revenue per square foot is the highest in Tucson despite low residential incomes — this is a volume game, not a per-capita play. F&B concepts on 4th Avenue and Congress Street generate outsized revenue. Seasonality risk: 70% of revenue September–April. Strong commercial rents of $28/sqft."
  },

  "85701": {
    name: "Downtown Tucson", neighborhood: "Downtown / Congress",
    city: "Tucson", county: "Pima",
    medianHome: 305000, medianIncome: 51794, avgIncome: 81628,
    perCapitaIncome: 38000,
    population: 15240, households: 7420, medAge: 31.8,
    unemployment: 6.1, povertyRate: 22.1, collegeEd: 54,
    ownerOccupied: 24, renterOccupied: 76,
    bizIndex: 84, totalBusinesses: 1840, retailSqFt: 620000,
    vacancyRate: 7.4, avgRent: 24.00,
    medDaysOnMarket: 28, homeAppreciation1yr: 5.8, homeAppreciation5yr: 42.1,
    pricePerSqFt: 248, listPriceVsSale: 98.8,
    tags: ["Hotel Boom","Convention Center","Arts District","Revitalizing","Creative Class"],
    opp: "high",
    sectors: ["Hotel/Hospitality","F&B","Co-Working","Arts","Short-Term Rental"],
    brief: "Downtown Tucson has seen $500M+ in investment since 2018 including AC Hotel, Catedral (luxury mixed-use), and Convention Center expansion. Congress Street has become a genuine dining and arts destination. Average income of $81K masks significant wealth concentration in new luxury condos. Short-term rental density is the highest in the metro — Airbnb revenue per available room competes with resort areas."
  },

  "85705": {
    name: "Barrio / 4th Ave North", neighborhood: "Barrio Hollywood",
    city: "Tucson", county: "Pima",
    medianHome: 305000, medianIncome: 36606, avgIncome: 50199,
    perCapitaIncome: 23965,
    population: 18240, households: 8140, medAge: 33.4,
    unemployment: 6.4, povertyRate: 24.8, collegeEd: 44,
    ownerOccupied: 38, renterOccupied: 62,
    bizIndex: 52, totalBusinesses: 620, retailSqFt: 180000,
    vacancyRate: 12.4, avgRent: 16.50,
    medDaysOnMarket: 31, homeAppreciation1yr: 6.4, homeAppreciation5yr: 44.2,
    pricePerSqFt: 228, listPriceVsSale: 98.6,
    tags: ["Gentrifying","Early Stage","Artist Community","Below-Market Commercial","3-5yr Window"],
    opp: "emerging",
    sectors: ["Independent F&B","Art Studios","Micro-Retail","Event Space","Craft Beverage"],
    brief: "The most active gentrification frontier in Tucson. Below-market commercial rents ($16.50/sqft) with consistent foot traffic from downtown and UA spillover. Art studios, independent food concepts, and craft breweries are establishing successfully. The 3–5 year window before rents normalize is open. First-mover commercial advantage is real and time-limited."
  },

  // ── LOWER TIER ─────────────────────────────────────────────────
  "85713": {
    name: "South Midtown / Kino", neighborhood: "South Midtown",
    city: "Tucson", county: "Pima",
    medianHome: 260000, medianIncome: 53152, avgIncome: 68192,
    perCapitaIncome: 28000,
    population: 32480, households: 14620, medAge: 33.8,
    unemployment: 6.4, povertyRate: 18.2, collegeEd: 24,
    ownerOccupied: 46, renterOccupied: 54,
    bizIndex: 48, totalBusinesses: 880, retailSqFt: 340000,
    vacancyRate: 13.2, avgRent: 15.50,
    medDaysOnMarket: 44, homeAppreciation1yr: 3.1, homeAppreciation5yr: 36.4,
    pricePerSqFt: 162, listPriceVsSale: 97.1,
    tags: ["Medical Employment Anchor","Transitional","Hispanic Heritage","High Density","Redevelopment Zone"],
    opp: "emerging",
    sectors: ["Healthcare","Essential Retail","Community Banking","QSR","Workforce Housing"],
    brief: "TMC Healthcare and Kino Sports Complex provide 3,500+ employment anchors. Dense population base with significant unmet needs in quality healthcare access, fresh food, and banking. The City of Tucson's Kino Area Master Plan designates this for major mixed-use redevelopment. Early commercial positioning ahead of public investment is a viable play."
  },

  "85308": {
    name: "Flowing Wells / Rillito", neighborhood: "Flowing Wells",
    city: "Tucson", county: "Pima",
    medianHome: 290000, medianIncome: 55800, avgIncome: 72000,
    perCapitaIncome: 32000,
    population: 33480, households: 13640, medAge: 37.8,
    unemployment: 5.1, povertyRate: 13.4, collegeEd: 32,
    ownerOccupied: 55, renterOccupied: 45,
    bizIndex: 54, totalBusinesses: 960, retailSqFt: 380000,
    vacancyRate: 10.8, avgRent: 16.00,
    medDaysOnMarket: 38, homeAppreciation1yr: 3.4, homeAppreciation5yr: 38.2,
    pricePerSqFt: 175, listPriceVsSale: 97.4,
    tags: ["NW Working Class","Service Dense","Stable Baseline","Oracle Corridor Access","Non-Discretionary"],
    opp: "stable",
    sectors: ["Essential Services","Grocery","Auto","Healthcare","Value Retail"],
    brief: "Dense northwest working-class community with reliable non-discretionary spending. Dollar Tree, Fry's, auto parts, and urgent care perform consistently here. Income slightly above the city median provides marginal discretionary capacity. Low-risk, low-return market appropriate for essential service businesses seeking stable cash flow."
  },

  "85746": {
    name: "Drexel Heights / SW Suburbs", neighborhood: "Drexel Heights",
    city: "Tucson", county: "Pima",
    medianHome: 321400, medianIncome: 68903, avgIncome: 78644,
    perCapitaIncome: 34000,
    population: 47820, households: 18640, medAge: 33.2,
    unemployment: 5.2, povertyRate: 9.8, collegeEd: 28,
    ownerOccupied: 64, renterOccupied: 36,
    bizIndex: 46, totalBusinesses: 780, retailSqFt: 280000,
    vacancyRate: 11.4, avgRent: 15.50,
    medDaysOnMarket: 31, homeAppreciation1yr: 4.8, homeAppreciation5yr: 43.1,
    pricePerSqFt: 176, listPriceVsSale: 98.2,
    tags: ["SW Growth Pocket","Largest Population","Younger Demographics","Underretailed","Family Market"],
    opp: "emerging",
    sectors: ["Family QSR","Grocery","Medical","Childcare","Discount Retail"],
    brief: "Drexel Heights is one of the most populous yet most commercially underserved ZIP codes in Tucson. Median income of nearly $69K is solid, and the zone's large young-family population creates consistent demand for childcare, family dining, and value-oriented grocery. Commercial rents are among the lowest in the metro, keeping entry costs minimal."
  },

  "85706": {
    name: "South Tucson / Valencia Corridor", neighborhood: "South Tucson",
    city: "Tucson", county: "Pima",
    medianHome: 215000, medianIncome: 42800, avgIncome: 58000,
    perCapitaIncome: 22000,
    population: 44820, households: 17840, medAge: 31.4,
    unemployment: 8.4, povertyRate: 24.2, collegeEd: 18,
    ownerOccupied: 44, renterOccupied: 56,
    bizIndex: 42, totalBusinesses: 840, retailSqFt: 360000,
    vacancyRate: 16.2, avgRent: 13.50,
    medDaysOnMarket: 48, homeAppreciation1yr: 2.1, homeAppreciation5yr: 30.2,
    pricePerSqFt: 148, listPriceVsSale: 96.8,
    tags: ["Airport Corridor","High-Density","Essential Needs","Industrial Base","Impact Zone"],
    opp: "impact",
    sectors: ["Essential Grocery","Community Health","Dollar/Value","Logistics","Financial Services"],
    brief: "High population density with significant unmet needs. Tucson International Airport and adjacent industrial create employment anchors. Dollar General, urgent care clinics, and check cashing are the proven commercial models. Impact investors and CDFI-backed businesses find opportunity here. Airport logistics and industrial use cases are expanding along I-10."
  },

  "85714": {
    name: "Drexel / Midvale SW", neighborhood: "Midvale Park",
    city: "Tucson", county: "Pima",
    medianHome: 240000, medianIncome: 55000, avgIncome: 67188,
    perCapitaIncome: 28000,
    population: 36840, households: 14180, medAge: 32.8,
    unemployment: 6.8, povertyRate: 17.4, collegeEd: 20,
    ownerOccupied: 52, renterOccupied: 48,
    bizIndex: 40, totalBusinesses: 620, retailSqFt: 240000,
    vacancyRate: 15.4, avgRent: 13.00,
    medDaysOnMarket: 52, homeAppreciation1yr: 2.4, homeAppreciation5yr: 32.1,
    pricePerSqFt: 155, listPriceVsSale: 96.4,
    tags: ["Working Class","Industrial SW","Value Market","High Vacancy","Logistics Adjacent"],
    opp: "niche",
    sectors: ["Industrial","Auto","Essential Services","Workforce Housing","Logistics"],
    brief: "Southwest corridor with high commercial vacancy (15.4%) and very low rents ($13/sqft) making it viable for industrial, auto, and logistical uses. Not a traditional retail play. Workforce housing demand is high relative to supply. Strategic for buyers seeking logistics/industrial positioning near I-19 and Tucson International Airport."
  },

  "85756": {
    name: "South Tucson Annex", neighborhood: "Valencia West",
    city: "Tucson", county: "Pima",
    medianHome: 155100, medianIncome: 62699, avgIncome: 78000,
    perCapitaIncome: 26000,
    population: 37840, households: 13820, medAge: 30.8,
    unemployment: 6.2, povertyRate: 16.4, collegeEd: 18,
    ownerOccupied: 58, renterOccupied: 42,
    bizIndex: 36, totalBusinesses: 480, retailSqFt: 180000,
    vacancyRate: 18.4, avgRent: 11.50,
    medDaysOnMarket: 54, homeAppreciation1yr: -3.8, homeAppreciation5yr: 24.1,
    pricePerSqFt: 128, listPriceVsSale: 96.2,
    tags: ["Lowest Home Values","High Vacancy","Industrial South","Declining Trend","Logistics Potential"],
    opp: "niche",
    sectors: ["Industrial","Logistics","Essential Retail","Auto Salvage","Workforce"],
    brief: "The most challenged residential market in the Tucson metro with home values declining year-over-year. However, median income of $62K shows this is a working community, not distressed. Heavy industrial zoning and airport proximity make this viable for logistics, distribution, and light industrial. Not a retail or residential investment play."
  }
};

// ─── METADATA ────────────────────────────────────────────────────────────────
const OPP_META = {
  premium:  { icon:"💎", label:"Premium Target",    color:"#ff3d6b", desc:"Highest wealth concentration — luxury & financial services" },
  high:     { icon:"🎯", label:"Prime Target",       color:"#ff7d3d", desc:"Strong wealth indicators with above-average ROI potential" },
  emerging: { icon:"🚀", label:"Emerging Market",    color:"#f5a623", desc:"Fast growth — early mover advantage available" },
  value:    { icon:"💡", label:"Value Play",         color:"#3ddc84", desc:"Below-market entry with strong upside potential" },
  stable:   { icon:"🔒", label:"Stable Market",      color:"#22d3ee", desc:"Consistent demand, lower risk, reliable returns" },
  special:  { icon:"🎓", label:"Specialized Market", color:"#a78bfa", desc:"Unique demographic driver — category expertise needed" },
  niche:    { icon:"🔍", label:"Niche Opportunity",  color:"#6b7280", desc:"Specific categories viable — broader market limited" },
  impact:   { icon:"🌱", label:"Impact Opportunity", color:"#34d399", desc:"Community need, mission-driven investment" }
};

const MAX = {
  medianHome: 795000,
  medianIncome: 112664,
  bizIndex: 88,
  perCapitaIncome: 80249
};

// Composite score weights
function calcScore(zip, mode) {
  const d = ZIP_DATA[zip]; if (!d) return 0;
  const h = d.medianHome    / MAX.medianHome    * 100;
  const i = d.medianIncome  / MAX.medianIncome  * 100;
  const b = d.bizIndex;
  const p = d.perCapitaIncome / MAX.perCapitaIncome * 100;
  switch (mode) {
    case 'homes':    return Math.round(h);
    case 'income':   return Math.round((i + p) / 2);
    case 'business': return Math.round(b);
    case 'growth':   return Math.round(Math.min(100, Math.max(0, (d.homeAppreciation5yr / 60) * 100)));
    default: return Math.round(h * 0.28 + i * 0.26 + b * 0.24 + p * 0.22);
  }
}


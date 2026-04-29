// ─── TUCSON WEALTH MAP — DATA.JS ─────────────────────────────────────────────
// Sources (2024-2025 verified):
//   • ACS 2024 5-Year Estimates (Census Bureau) — income, population, demographics
//   • ATTOM Data Solutions 2025 — home values by ZIP
//   • zip-codes.com ACS 2024 — per-ZIP income, home values
//   • ZipAtlas 2025 — income rankings
//   • Redfin 2025 — market days, list/sale ratios
//   • CoStar / AZ Dept of Revenue 2024 — commercial data
// ─────────────────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2RjcmVzdGlucyIsImEiOiJjbW9hZnhzeXIwNmh0MnBwd3g2djN4ODR0In0.OtGVl5R5yfKnXyDkTXvq7A';

const FSQ_KEY = 'E0VZYDFHUYQPI5VY5BUXXUFQOARZQ1NXPEFQW50OT1MNDNO2';
const USE_FSQ = FSQ_KEY !== 'YOUR_FOURSQUARE_API_KEY_HERE';

const ZIP_DATA = {

  // ── PREMIUM TIER ──────────────────────────────────────────────────────────

  "85718": {
    name:"Catalina Foothills", city:"Tucson", county:"Pima",
    // ACS 2024 5yr via zip-codes.com (updated Jan 2026)
    medianHome:776215, medianIncome:114892, avgIncome:171000, perCapitaIncome:80249,
    population:28706, households:14033, medAge:54.4,
    unemployment:3.0, povertyRate:4.0, collegeEd:76,
    ownerOccupied:82, renterOccupied:18,
    pricePerSqFt:283, listPriceVsSale:98.1, medDaysOnMarket:38,
    homeAppreciation1yr:2.1, homeAppreciation5yr:46.1,
    bizIndex:88, totalBusinesses:1240, retailSqFt:380000, vacancyRate:4.2, avgRent:28.50,
    tags:["Luxury Residential","HNW Concentration","Gated Communities","Mountain Views","Trophy Assets"],
    opp:"premium", sectors:["Wealth Management","Luxury Retail","Concierge Medical","Fine Dining","Estate Planning"],
    brief:"Tucson's undisputed wealth capital. 2024 ACS median household income of $114,892 with average exceeding $171K signals deep HNW concentration. ATTOM data shows median home value at $776K. 29% of households earn over $200K annually — highest in the metro. Limited inventory (82% owner-occupied) keeps values firm. Best targets: family offices, private banking, luxury brands, concierge medicine."
  },

  "85749": {
    name:"Rincon Valley", city:"Tucson", county:"Pima",
    medianHome:800000, medianIncome:109219, avgIncome:146000, perCapitaIncome:63000,
    population:19009, households:7906, medAge:55.6,
    unemployment:2.6, povertyRate:2.9, collegeEd:71,
    ownerOccupied:89, renterOccupied:11,
    pricePerSqFt:320, listPriceVsSale:97.8, medDaysOnMarket:42,
    homeAppreciation1yr:5.2, homeAppreciation5yr:33.1,
    bizIndex:58, totalBusinesses:380, retailSqFt:95000, vacancyRate:7.8, avgRent:22.00,
    tags:["Highest Home Values","Mountain Estates","SE Foothills","Underretailed","High Equity"],
    opp:"high", sectors:["Premium Grocery","Wellness","Financial Services","Quality Dining","Childcare"],
    brief:"Highest median home values in metro — ACS 2024 shows $109K median income, 89% owner-occupancy. ZipAtlas ranks 85749 #1 income in Tucson at $108K. Median age 55.6 reflects established equity-wealthy households. Massive retail service gap — residents drive 20+ minutes for most needs. First-mover retail opportunity is significant."
  },

  "85750": {
    name:"Tanque Verde / NE", city:"Tucson", county:"Pima",
    medianHome:480000, medianIncome:97140, avgIncome:152089, perCapitaIncome:75512,
    population:24680, households:9870, medAge:47.2,
    unemployment:2.4, povertyRate:3.8, collegeEd:70,
    ownerOccupied:79, renterOccupied:21,
    pricePerSqFt:285, listPriceVsSale:98.5, medDaysOnMarket:35,
    homeAppreciation1yr:4.1, homeAppreciation5yr:54.6,
    bizIndex:74, totalBusinesses:820, retailSqFt:290000, vacancyRate:5.1, avgRent:26.00,
    tags:["Upscale NE Corridor","Aerospace Workforce","Strong Appreciation","Retail Gap"],
    opp:"high", sectors:["Premium Services","Medical Specialists","Boutique Fitness","Specialty Food"],
    brief:"ZipAtlas ranks 85750 #6 income in Tucson at $97K median. Strong dual-income aerospace/tech households. Raytheon and tech-sector professionals drive demand. Houghton/Tanque Verde intersection significantly underretailed — above-average disposable income with few local quality options."
  },

  "85737": {
    name:"Oro Valley Core", city:"Oro Valley", county:"Pima",
    // ACS 2024: zip-codes.com shows $107,348 median, $469,500 home value
    medianHome:522647, medianIncome:107348, avgIncome:139000, perCapitaIncome:65000,
    population:47820, households:20140, medAge:50.1,
    unemployment:2.2, povertyRate:3.2, collegeEd:68,
    ownerOccupied:77, renterOccupied:23,
    pricePerSqFt:229, listPriceVsSale:99.1, medDaysOnMarket:32,
    homeAppreciation1yr:5.5, homeAppreciation5yr:46.9,
    bizIndex:81, totalBusinesses:2180, retailSqFt:1240000, vacancyRate:4.8, avgRent:24.50,
    tags:["Master Planned","Most Affluent City","Top Schools","Low Crime","Oracle Campus"],
    opp:"premium", sectors:["Healthcare","Financial Planning","Premium Retail","Senior Services","Restaurants"],
    brief:"Most affluent incorporated municipality in Tucson metro. ACS 2024 median income $107K, ATTOM home value $522K. Oracle Corporation campus and Ventana Medical (Roche) anchor white-collar employment. Low crime, nationally ranked schools, active HOA culture. Commercial vacancy at 4.8% — near full absorption. ZipAtlas ranks 85737 #5 income in Tucson."
  },

  "85747": {
    name:"Rita Ranch / SE Growth", city:"Tucson", county:"Pima",
    // ACS 2024: zip-codes.com shows $110,816 median income — dramatically higher than our old data!
    medianHome:370300, medianIncome:110816, avgIncome:130000, perCapitaIncome:50000,
    population:19840, households:7180, medAge:37.4,
    unemployment:2.8, povertyRate:3.9, collegeEd:52,
    ownerOccupied:82, renterOccupied:18,
    pricePerSqFt:214, listPriceVsSale:99.8, medDaysOnMarket:27,
    homeAppreciation1yr:8.8, homeAppreciation5yr:68.0,
    bizIndex:64, totalBusinesses:420, retailSqFt:180000, vacancyRate:6.8, avgRent:20.50,
    tags:["Raytheon Workforce","Military Families","#1 Appreciation","Service Gap","High Income"],
    opp:"emerging", sectors:["Family Dining","Childcare","Medical","Premium Grocery","Fitness"],
    brief:"Major data revision: ACS 2024 shows median income at $110,816 — ZipAtlas ranks 85747 #4 in Tucson. Home values up 68% since 2011 (ATTOM 2025: $370K). Raytheon missile systems employees and Davis-Monthan families drive stable dual-income demographics. Homes selling at 99.8% of list. Dramatically underserved commercially for these demographics."
  },

  "85739": {
    name:"Catalina / N Oro Valley", city:"Catalina", county:"Pima",
    medianHome:496872, medianIncome:80327, avgIncome:106000, perCapitaIncome:52000,
    population:15620, households:6840, medAge:55.8,
    unemployment:2.6, povertyRate:3.7, collegeEd:63,
    ownerOccupied:81, renterOccupied:19,
    pricePerSqFt:225, listPriceVsSale:97.2, medDaysOnMarket:45,
    homeAppreciation1yr:5.1, homeAppreciation5yr:57.7,
    bizIndex:62, totalBusinesses:420, retailSqFt:148000, vacancyRate:8.4, avgRent:20.50,
    tags:["Active Retirement","Saddlebrooke Ranch","Golf Communities","High Equity"],
    opp:"high", sectors:["Golf/Recreation","Senior Healthcare","Wellness","Premium Dining"],
    brief:"ATTOM 2025 home value $496K. Saddlebrooke and Rancho Vistoso house affluent active retirees with high net worth. Remote-worker migration adding younger high-income residents. Wellness, concierge healthcare, and premium dining dramatically underserved."
  },

  // ── HIGH TIER ──────────────────────────────────────────────────────────────

  "85742": {
    name:"Marana / Thornydale NW", city:"Marana", county:"Pima",
    medianHome:386772, medianIncome:92627, avgIncome:115000, perCapitaIncome:52000,
    population:34180, households:12640, medAge:36.2,
    unemployment:2.9, povertyRate:4.1, collegeEd:54,
    ownerOccupied:74, renterOccupied:26,
    pricePerSqFt:202, listPriceVsSale:99.4, medDaysOnMarket:28,
    homeAppreciation1yr:7.2, homeAppreciation5yr:51.4,
    bizIndex:70, totalBusinesses:890, retailSqFt:420000, vacancyRate:6.2, avgRent:22.00,
    tags:["#1 Growth ZIP","Young Families","Amazon Hub","Commercial Lag","High Income"],
    opp:"emerging", sectors:["Premium Grocery","Childcare","QSR/Fast Casual","Medical Clinics","Fitness"],
    brief:"ZipAtlas ranks 85742 #7 income in Tucson at $92K — up significantly from prior data. ATTOM home value $386K. Amazon fulfillment center and manufacturing growth attract dual-income families. Commercial development trails residential by 3:1. First-mover retail advantage in premium grocery, pediatric healthcare, and quality restaurants."
  },

  "85748": {
    name:"Pantano / SE Tucson", city:"Tucson", county:"Pima",
    // ZipAtlas: 85748 is #8 income in Tucson at $90,448
    medianHome:350000, medianIncome:90448, avgIncome:112000, perCapitaIncome:47000,
    population:18640, households:7280, medAge:38.4,
    unemployment:3.2, povertyRate:5.1, collegeEd:48,
    ownerOccupied:74, renterOccupied:26,
    pricePerSqFt:205, listPriceVsSale:98.9, medDaysOnMarket:32,
    homeAppreciation1yr:5.8, homeAppreciation5yr:50.2,
    bizIndex:58, totalBusinesses:320, retailSqFt:120000, vacancyRate:7.2, avgRent:19.00,
    tags:["Quiet Suburban","Strong Equity","Growth Corridor","Underretailed","High Income"],
    opp:"emerging", sectors:["Neighborhood Retail","Medical","Family Services","Dining","Fitness"],
    brief:"ZipAtlas ranks 85748 #8 in Tucson income at $90K — a significant upward revision from prior data. Very limited commercial infrastructure for these demographics. Residents commute west for most services. One of Tucson's most underretailed ZIPs relative to income."
  },

  "85741": {
    name:"NW Tucson / Cortaro", city:"Tucson", county:"Pima",
    medianHome:342565, medianIncome:75400, avgIncome:95200, perCapitaIncome:46000,
    population:26140, households:10820, medAge:42.8,
    unemployment:3.1, povertyRate:5.2, collegeEd:52,
    ownerOccupied:72, renterOccupied:28,
    pricePerSqFt:212, listPriceVsSale:98.8, medDaysOnMarket:30,
    homeAppreciation1yr:3.2, homeAppreciation5yr:46.2,
    bizIndex:68, totalBusinesses:1120, retailSqFt:580000, vacancyRate:5.8, avgRent:21.50,
    tags:["Established NW Suburb","Good Schools","Stable","Consistent Demand"],
    opp:"stable", sectors:["Full-Service Dining","Medical","Home Services","Boutique Retail"],
    brief:"One of Tucson's most stable communities. ATTOM home value $342K. Raytheon employees and long-tenured professionals anchor consistent demand. Best for businesses seeking stable cash flow without volatility."
  },

  "85743": {
    name:"Tucson Mountains / W", city:"Tucson", county:"Pima",
    medianHome:423775, medianIncome:86584, avgIncome:110000, perCapitaIncome:52000,
    population:32640, households:13180, medAge:41.2,
    unemployment:4.2, povertyRate:7.8, collegeEd:44,
    ownerOccupied:67, renterOccupied:33,
    pricePerSqFt:208, listPriceVsSale:97.6, medDaysOnMarket:41,
    homeAppreciation1yr:5.1, homeAppreciation5yr:52.1,
    bizIndex:49, totalBusinesses:640, retailSqFt:180000, vacancyRate:10.2, avgRent:17.50,
    tags:["Hidden Wealth","Desert Estates","Undercommercialized","Strong Appreciation"],
    opp:"value", sectors:["Specialty Food","Outdoor Recreation","Home Services","Healthcare"],
    brief:"ZipAtlas ranks 85743 #9 income in Tucson at $86K. ATTOM home value $423K. The gap between income/home wealth and available commercial services is striking — dramatically undercommercialized for its demographics. Tucson Mountain Park adjacency drives desirability."
  },

  "85716": {
    name:"Sam Hughes / Colonia", city:"Tucson", county:"Pima",
    medianHome:354323, medianIncome:47009, avgIncome:69019, perCapitaIncome:35729,
    population:12480, households:5920, medAge:39.4,
    unemployment:3.4, povertyRate:11.2, collegeEd:74,
    ownerOccupied:52, renterOccupied:48,
    pricePerSqFt:245, listPriceVsSale:101.2, medDaysOnMarket:22,
    homeAppreciation1yr:4.8, homeAppreciation5yr:48.3,
    bizIndex:68, totalBusinesses:680, retailSqFt:120000, vacancyRate:3.8, avgRent:24.00,
    tags:["Historic District","UA Adjacent","Most Walkable","Sells Above List","Competitive Market"],
    opp:"high", sectors:["Boutique F&B","Specialty Retail","Wine/Spirits","Fitness"],
    brief:"ATTOM home value $354K. Real estate sells above list price (101.2%) — rarest phenomenon in local market. ACS 2024 median income $47K masks old-money wealth in historic homes. UA faculty and long-term residents with significant equity. Coffee shops, wine bars, boutiques outperform."
  },

  "85704": {
    name:"Oracle / Ina Corridor", city:"Tucson", county:"Pima",
    medianHome:478820, medianIncome:76915, avgIncome:106358, perCapitaIncome:50631,
    population:28640, households:11840, medAge:44.1,
    unemployment:3.3, povertyRate:5.8, collegeEd:48,
    ownerOccupied:69, renterOccupied:31,
    pricePerSqFt:240, listPriceVsSale:98.4, medDaysOnMarket:33,
    homeAppreciation1yr:4.1, homeAppreciation5yr:42.1,
    bizIndex:76, totalBusinesses:2240, retailSqFt:1480000, vacancyRate:5.4, avgRent:22.00,
    tags:["Primary Retail Corridor","High Traffic Counts","NW Anchor","Big Box"],
    opp:"stable", sectors:["Auto Services","QSR","Medical Offices","Fitness","Insurance"],
    brief:"ATTOM home value $478K — significantly higher than prior data. NW Tucson's dominant retail spine with highest retail square footage of any Tucson ZIP. Traffic counts exceed 40,000 vehicles/day at Oracle/Ina. Foothills Mall anchors. Captive audience from adjacent high-income 85741/85742/85737."
  },

  // ── MID-HIGH TIER ─────────────────────────────────────────────────────────

  "85715": {
    name:"Broadway Village / E", city:"Tucson", county:"Pima",
    medianHome:404773, medianIncome:82651, avgIncome:114064, perCapitaIncome:53359,
    population:24820, households:10840, medAge:42.6,
    unemployment:3.7, povertyRate:5.9, collegeEd:43,
    ownerOccupied:68, renterOccupied:32,
    pricePerSqFt:200, listPriceVsSale:98.6, medDaysOnMarket:31,
    homeAppreciation1yr:4.4, homeAppreciation5yr:44.8,
    bizIndex:64, totalBusinesses:980, retailSqFt:480000, vacancyRate:8.1, avgRent:19.50,
    tags:["Higher Income Than Appears","Aging Strip Centers","Reno Opportunity","Broadway Frontage"],
    opp:"value", sectors:["Restaurant Row","Medical/Dental","Value Retail","Fitness"],
    brief:"ATTOM home value $404K. Median income $82K and average $114K make this one of Tucson's most underrated ZIPs — strong purchasing power in aging 1970s-80s strip centers. Value-add commercial real estate opportunity significant along Broadway and Speedway corridors."
  },

  "85745": {
    name:"Tucson Mountains / Westside", city:"Tucson", county:"Pima",
    medianHome:379747, medianIncome:71348, avgIncome:98301, perCapitaIncome:45000,
    population:32640, households:13180, medAge:41.2,
    unemployment:4.8, povertyRate:8.4, collegeEd:42,
    ownerOccupied:65, renterOccupied:35,
    pricePerSqFt:207, listPriceVsSale:97.4, medDaysOnMarket:41,
    homeAppreciation1yr:5.3, homeAppreciation5yr:52.1,
    bizIndex:45, totalBusinesses:640, retailSqFt:180000, vacancyRate:10.2, avgRent:17.50,
    tags:["Hidden Wealth","Tucson Mountains","Desert Estates","Undercommercialized"],
    opp:"value", sectors:["Specialty Food","Outdoor Recreation","Home Services","Healthcare"],
    brief:"ATTOM home value $379K. Average income $98K is above median. The gap between income/home wealth and available commercial services is striking. Dramatically undercommercialized for its demographics."
  },

  "85711": {
    name:"Midtown / Country Club", city:"Tucson", county:"Pima",
    medianHome:304247, medianIncome:56121, avgIncome:71607, perCapitaIncome:38000,
    population:34840, households:16280, medAge:38.8,
    unemployment:4.1, povertyRate:12.8, collegeEd:46,
    ownerOccupied:51, renterOccupied:49,
    pricePerSqFt:209, listPriceVsSale:98.2, medDaysOnMarket:29,
    homeAppreciation1yr:3.8, homeAppreciation5yr:41.2,
    bizIndex:72, totalBusinesses:1680, retailSqFt:680000, vacancyRate:9.4, avgRent:18.50,
    tags:["Medical Corridor","Gentrification Signal","Mixed Demographics","TMC Adjacent"],
    opp:"value", sectors:["Medical/Clinical","F&B","Mixed-Use","Fitness"],
    brief:"ATTOM home value $304K. Speedway corridor serves medical cluster around TMC and Carondelet. Gentrification visible near Sam Hughes. High commercial vacancy (9.4%) creates value-add opportunity for adaptive reuse."
  },

  "85712": {
    name:"Midtown East / Craycroft", city:"Tucson", county:"Pima",
    medianHome:309831, medianIncome:48185, avgIncome:69336, perCapitaIncome:34000,
    population:30640, households:14820, medAge:38.2,
    unemployment:4.8, povertyRate:15.2, collegeEd:42,
    ownerOccupied:49, renterOccupied:51,
    pricePerSqFt:213, listPriceVsSale:97.8, medDaysOnMarket:34,
    homeAppreciation1yr:2.8, homeAppreciation5yr:38.4,
    bizIndex:65, totalBusinesses:1240, retailSqFt:520000, vacancyRate:10.8, avgRent:17.00,
    tags:["Renter-Majority","Steady Mid-Market","DM AFB Adjacency","Broadway Corridor"],
    opp:"stable", sectors:["Convenience Retail","Auto Services","QSR","Medical"],
    brief:"ATTOM home value $309K. Steady mid-market zone with consistent service demand. Majority-renter population creates reliable non-discretionary spending. Davis-Monthan AFB proximity adds military households."
  },

  "85710": {
    name:"East Tucson / Pantano", city:"Tucson", county:"Pima",
    medianHome:314792, medianIncome:58200, avgIncome:74000, perCapitaIncome:36000,
    population:37240, households:15680, medAge:36.8,
    unemployment:4.6, povertyRate:11.4, collegeEd:38,
    ownerOccupied:56, renterOccupied:44,
    pricePerSqFt:189, listPriceVsSale:97.6, medDaysOnMarket:36,
    homeAppreciation1yr:2.6, homeAppreciation5yr:40.6,
    bizIndex:60, totalBusinesses:980, retailSqFt:440000, vacancyRate:9.8, avgRent:17.50,
    tags:["Working Families","DMAFB Corridor","Affordable Entry","East Side"],
    opp:"stable", sectors:["Auto","QSR","Grocery","Healthcare","Value Retail"],
    brief:"ATTOM home value $314K. Large working-family population with stable demand driven by military households. Home values appreciated meaningfully (+41% over 5yrs). Underserved in quality dining and specialty retail."
  },

  "85719": {
    name:"University / 4th Avenue", city:"Tucson", county:"Pima",
    medianHome:381399, medianIncome:41086, avgIncome:62760, perCapitaIncome:24663,
    population:20480, households:8640, medAge:27.8,
    unemployment:7.2, povertyRate:28.4, collegeEd:62,
    ownerOccupied:28, renterOccupied:72,
    pricePerSqFt:279, listPriceVsSale:99.1, medDaysOnMarket:24,
    homeAppreciation1yr:3.6, homeAppreciation5yr:39.8,
    bizIndex:80, totalBusinesses:1680, retailSqFt:480000, vacancyRate:6.8, avgRent:28.00,
    tags:["UA Economy","#1 Foot Traffic","F&B Dominant","High Commercial Rev","Seasonal"],
    opp:"special", sectors:["F&B","Nightlife","Co-Working","Student Housing","Specialty Retail"],
    brief:"ATTOM home value $381K. UA generates $2.2B annual economic impact concentrated here. Commercial revenue per square foot highest in Tucson despite low residential incomes — volume game, not per-capita. F&B concepts on 4th Avenue and Congress outperform. Seasonality risk: 70% of revenue Sep–Apr."
  },

  "85701": {
    name:"Downtown Tucson", city:"Tucson", county:"Pima",
    medianHome:358080, medianIncome:51794, avgIncome:81628, perCapitaIncome:38000,
    population:15240, households:7420, medAge:31.8,
    unemployment:6.1, povertyRate:22.1, collegeEd:54,
    ownerOccupied:24, renterOccupied:76,
    pricePerSqFt:198, listPriceVsSale:98.8, medDaysOnMarket:28,
    homeAppreciation1yr:4.2, homeAppreciation5yr:42.1,
    bizIndex:84, totalBusinesses:1840, retailSqFt:620000, vacancyRate:7.4, avgRent:24.00,
    tags:["Hotel Boom","Convention Center","Arts District","Revitalizing","Creative Class"],
    opp:"high", sectors:["Hotel/Hospitality","F&B","Co-Working","Arts","Short-Term Rental"],
    brief:"ATTOM home value $358K. Downtown Tucson has seen $500M+ in investment since 2018. Congress Street is a genuine dining/arts destination. Short-term rental density highest in metro. Convention Center expansion anchors hospitality growth."
  },

  "85705": {
    name:"Barrio / 4th Ave North", city:"Tucson", county:"Pima",
    medianHome:267468, medianIncome:36606, avgIncome:50199, perCapitaIncome:23965,
    population:18240, households:8140, medAge:33.4,
    unemployment:6.4, povertyRate:24.8, collegeEd:44,
    ownerOccupied:38, renterOccupied:62,
    pricePerSqFt:214, listPriceVsSale:98.6, medDaysOnMarket:31,
    homeAppreciation1yr:5.1, homeAppreciation5yr:44.2,
    bizIndex:52, totalBusinesses:620, retailSqFt:180000, vacancyRate:12.4, avgRent:16.50,
    tags:["Gentrifying","Early Stage","Artist Community","Below-Market Commercial","3-5yr Window"],
    opp:"emerging", sectors:["Independent F&B","Art Studios","Micro-Retail","Craft Beverage"],
    brief:"ATTOM home value $267K. Most active gentrification frontier. Below-market commercial rents at $16.50/sqft with consistent foot traffic from downtown and UA spillover. First-mover commercial advantage is real and time-limited."
  },

  "85713": {
    name:"South Midtown / Kino", city:"Tucson", county:"Pima",
    medianHome:253636, medianIncome:53152, avgIncome:68192, perCapitaIncome:28000,
    population:47720, households:14620, medAge:33.8,
    unemployment:6.4, povertyRate:18.2, collegeEd:24,
    ownerOccupied:46, renterOccupied:54,
    pricePerSqFt:197, listPriceVsSale:97.1, medDaysOnMarket:44,
    homeAppreciation1yr:2.4, homeAppreciation5yr:36.4,
    bizIndex:48, totalBusinesses:880, retailSqFt:340000, vacancyRate:13.2, avgRent:15.50,
    tags:["Medical Anchor","Transitional","Hispanic Heritage","Redevelopment Zone"],
    opp:"emerging", sectors:["Healthcare","Essential Retail","Community Banking","QSR"],
    brief:"2024 Census population 47,720 — one of Tucson's most populous ZIPs. ATTOM home value $253K. TMC Healthcare and Kino Sports Complex provide 3,500+ employment anchors. City Kino Area Master Plan designates for major mixed-use redevelopment."
  },

  "85308": {
    name:"Flowing Wells / Rillito", city:"Tucson", county:"Pima",
    medianHome:290000, medianIncome:55800, avgIncome:72000, perCapitaIncome:32000,
    population:33480, households:13640, medAge:37.8,
    unemployment:5.1, povertyRate:13.4, collegeEd:32,
    ownerOccupied:55, renterOccupied:45,
    pricePerSqFt:175, listPriceVsSale:97.4, medDaysOnMarket:38,
    homeAppreciation1yr:2.8, homeAppreciation5yr:38.2,
    bizIndex:54, totalBusinesses:960, retailSqFt:380000, vacancyRate:10.8, avgRent:16.00,
    tags:["NW Workforce","Service Dense","Stable","Non-Discretionary"],
    opp:"stable", sectors:["Essential Services","Grocery","Auto","Healthcare","Value Retail"],
    brief:"Dense NW working-class community with reliable non-discretionary spending. Dollar Tree, Fry's, auto parts, and urgent care perform consistently. Income slightly above city median provides marginal discretionary capacity."
  },

  "85706": {
    name:"South Tucson / Valencia", city:"Tucson", county:"Pima",
    medianHome:268311, medianIncome:42800, avgIncome:58000, perCapitaIncome:22000,
    population:44820, households:17840, medAge:31.4,
    unemployment:8.4, povertyRate:24.2, collegeEd:18,
    ownerOccupied:44, renterOccupied:56,
    pricePerSqFt:198, listPriceVsSale:96.8, medDaysOnMarket:48,
    homeAppreciation1yr:1.8, homeAppreciation5yr:30.2,
    bizIndex:42, totalBusinesses:840, retailSqFt:360000, vacancyRate:16.2, avgRent:13.50,
    tags:["Airport Corridor","High-Density","Essential Needs","Industrial Base"],
    opp:"impact", sectors:["Essential Grocery","Community Health","Dollar/Value","Logistics"],
    brief:"ATTOM home value $268K. High population density with significant unmet needs. Tucson International Airport and adjacent industrial create employment anchors. Dollar General, urgent care, and financial services are proven commercial models here."
  },

  "85714": {
    name:"Drexel / Midvale SW", city:"Tucson", county:"Pima",
    medianHome:252344, medianIncome:55000, avgIncome:67188, perCapitaIncome:28000,
    population:36840, households:14180, medAge:32.8,
    unemployment:6.8, povertyRate:17.4, collegeEd:20,
    ownerOccupied:52, renterOccupied:48,
    pricePerSqFt:200, listPriceVsSale:96.4, medDaysOnMarket:52,
    homeAppreciation1yr:1.6, homeAppreciation5yr:32.1,
    bizIndex:40, totalBusinesses:620, retailSqFt:240000, vacancyRate:15.4, avgRent:13.00,
    tags:["Working Class","Industrial SW","Value Market","Logistics Adjacent"],
    opp:"niche", sectors:["Industrial","Auto","Essential Services","Workforce Housing","Logistics"],
    brief:"ATTOM home value $252K. SW corridor with high commercial vacancy (15.4%) and low rents ($13/sqft). Viable for industrial, auto, and logistics uses near I-19 and Tucson International Airport."
  },

  "85746": {
    name:"Drexel Heights / SW", city:"Tucson", county:"Pima",
    medianHome:297632, medianIncome:68903, avgIncome:78644, perCapitaIncome:34000,
    population:47820, households:18640, medAge:33.2,
    unemployment:5.2, povertyRate:9.8, collegeEd:28,
    ownerOccupied:64, renterOccupied:36,
    pricePerSqFt:185, listPriceVsSale:98.2, medDaysOnMarket:31,
    homeAppreciation1yr:3.6, homeAppreciation5yr:43.1,
    bizIndex:46, totalBusinesses:780, retailSqFt:280000, vacancyRate:11.4, avgRent:15.50,
    tags:["SW Growth Pocket","Largest Population","Younger Demographics","Underretailed"],
    opp:"emerging", sectors:["Family QSR","Grocery","Medical","Childcare","Discount Retail"],
    brief:"One of Tucson's most populous yet most commercially underserved ZIPs. ATTOM home value $297K. Median income $69K with large young-family population — consistent demand for childcare, family dining, value grocery."
  },

  "85756": {
    name:"South Tucson Annex", city:"Tucson", county:"Pima",
    // ACS 2024 via zip-codes.com: $72,490 median income — much higher than expected
    medianHome:200000, medianIncome:72490, avgIncome:88000, perCapitaIncome:30000,
    population:37840, households:13820, medAge:30.8,
    unemployment:6.2, povertyRate:16.4, collegeEd:18,
    ownerOccupied:58, renterOccupied:42,
    pricePerSqFt:128, listPriceVsSale:96.2, medDaysOnMarket:54,
    homeAppreciation1yr:-1.2, homeAppreciation5yr:24.1,
    bizIndex:36, totalBusinesses:480, retailSqFt:180000, vacancyRate:18.4, avgRent:11.50,
    tags:["Industrial South","Logistics Potential","Low Home Values","Working Community"],
    opp:"niche", sectors:["Industrial","Logistics","Essential Retail","Auto Salvage"],
    brief:"Major revision: ACS 2024 shows median income at $72,490 — significantly higher than prior estimate, indicating a working community not distressed population. Heavy industrial zoning and airport proximity viable for logistics and light industrial. Not a retail or residential investment play."
  },

  "85730": {
    name:"SE Tucson / DM Area", city:"Tucson", county:"Pima",
    medianHome:301917, medianIncome:54800, avgIncome:68000, perCapitaIncome:35000,
    population:28640, households:11840, medAge:35.6,
    unemployment:4.4, povertyRate:10.8, collegeEd:36,
    ownerOccupied:57, renterOccupied:43,
    pricePerSqFt:196, listPriceVsSale:97.4, medDaysOnMarket:38,
    homeAppreciation1yr:2.8, homeAppreciation5yr:41.8,
    bizIndex:55, totalBusinesses:740, retailSqFt:320000, vacancyRate:9.2, avgRent:16.50,
    tags:["DMAFB Primary Zone","Military Housing","Stable BAH Rents"],
    opp:"stable", sectors:["Auto","Military Retail","QSR","Healthcare","Convenience"],
    brief:"ATTOM home value $301K. Davis-Monthan AFB is dominant economic force. Military BAH rates stabilize rental demand counter-cyclically. E-commerce-resistant businesses perform reliably. Long-term recession-resistant investment thesis."
  },

  // ── MARANA ────────────────────────────────────────────────────────────────

  "85653": {
    name:"Marana / Avra Valley", city:"Marana", county:"Pima",
    medianHome:342000, medianIncome:71200, avgIncome:88000, perCapitaIncome:38000,
    population:28400, households:10200, medAge:37.1,
    unemployment:3.4, povertyRate:6.2, collegeEd:42,
    ownerOccupied:70, renterOccupied:30,
    pricePerSqFt:192, listPriceVsSale:98.4, medDaysOnMarket:34,
    homeAppreciation1yr:5.8, homeAppreciation5yr:48.6,
    bizIndex:52, totalBusinesses:680, retailSqFt:240000, vacancyRate:8.2, avgRent:18.00,
    tags:["Marana Core","I-10 Corridor","Industrial Adjacent","Growing Workforce"],
    opp:"emerging", sectors:["Auto Services","QSR","Industrial Supply","Convenience","Grocery"],
    brief:"Marana's original core along I-10. Mix of industrial, logistics, and residential. Amazon distribution and manufacturing drive stable employment. Service demand tracking strong population growth."
  },

  "85658": {
    name:"Marana / Tangerine Rd", city:"Marana", county:"Pima",
    medianHome:418000, medianIncome:86400, avgIncome:112000, perCapitaIncome:54000,
    population:19800, households:7200, medAge:39.2,
    unemployment:2.8, povertyRate:4.4, collegeEd:56,
    ownerOccupied:76, renterOccupied:24,
    pricePerSqFt:228, listPriceVsSale:98.9, medDaysOnMarket:30,
    homeAppreciation1yr:7.4, homeAppreciation5yr:52.3,
    bizIndex:61, totalBusinesses:420, retailSqFt:180000, vacancyRate:7.4, avgRent:21.00,
    tags:["North Marana","Dove Mountain","Master Planned","Higher Income","Golf & Luxury"],
    opp:"emerging", sectors:["Premium Grocery","Medical","Fitness","Quality Dining","Childcare"],
    brief:"North Marana / Dove Mountain premium residential corridor. Higher income demographics ($86K median) with limited commercial options. Strong appreciation (+52% 5yr). Prime retail opportunity zone along Tangerine Road. Golf and resort lifestyle drive premium demand."
  },

  // ── SAHUARITA ─────────────────────────────────────────────────────────────

  "85629": {
    name:"Sahuarita / Green Valley N", city:"Sahuarita", county:"Pima",
    medianHome:338000, medianIncome:72400, avgIncome:91000, perCapitaIncome:41000,
    population:42600, households:15800, medAge:44.2,
    unemployment:3.6, povertyRate:5.8, collegeEd:46,
    ownerOccupied:72, renterOccupied:28,
    pricePerSqFt:198, listPriceVsSale:98.6, medDaysOnMarket:32,
    homeAppreciation1yr:6.2, homeAppreciation5yr:49.4,
    bizIndex:58, totalBusinesses:720, retailSqFt:310000, vacancyRate:7.8, avgRent:19.00,
    tags:["Sahuarita Growth","Freeport-McMoRan Workforce","South Metro","Family Community"],
    opp:"emerging", sectors:["Grocery","Family Dining","Medical","Childcare","Auto Services"],
    brief:"One of fastest-growing communities in southern Arizona. Freeport-McMoRan and Raytheon supply chain drive stable dual-income households. Significant retail gap in premium and specialty categories. Strong +49% 5yr appreciation trajectory."
  },

  // ── GREEN VALLEY ──────────────────────────────────────────────────────────

  "85614": {
    name:"Green Valley South", city:"Green Valley", county:"Pima",
    medianHome:285000, medianIncome:58400, avgIncome:74000, perCapitaIncome:46000,
    population:22800, households:11400, medAge:64.8,
    unemployment:2.1, povertyRate:6.4, collegeEd:52,
    ownerOccupied:78, renterOccupied:22,
    pricePerSqFt:182, listPriceVsSale:97.1, medDaysOnMarket:44,
    homeAppreciation1yr:3.4, homeAppreciation5yr:38.8,
    bizIndex:56, totalBusinesses:580, retailSqFt:280000, vacancyRate:9.2, avgRent:16.50,
    tags:["Active Adult","Retirement Community","High Equity","Stable Income"],
    opp:"stable", sectors:["Healthcare","Senior Services","Grocery","Restaurants","Golf/Recreation"],
    brief:"Arizona's premier active adult community. Median age 64.8 with significant equity wealth — most residents mortgage-free. Stable non-discretionary spending on healthcare, food, and recreation. Low risk, consistent returns."
  },

  "85622": {
    name:"Green Valley / Continental", city:"Green Valley", county:"Pima",
    medianHome:298000, medianIncome:61200, avgIncome:79000, perCapitaIncome:48000,
    population:18600, households:9200, medAge:62.4,
    unemployment:2.3, povertyRate:5.8, collegeEd:56,
    ownerOccupied:80, renterOccupied:20,
    pricePerSqFt:188, listPriceVsSale:97.4, medDaysOnMarket:46,
    homeAppreciation1yr:3.2, homeAppreciation5yr:36.2,
    bizIndex:54, totalBusinesses:440, retailSqFt:220000, vacancyRate:8.6, avgRent:17.00,
    tags:["Active Retirement","Continental Ranch","High Equity","Established Community"],
    opp:"stable", sectors:["Senior Healthcare","Dining","Golf","Home Services","Financial Advisory"],
    brief:"Continental Ranch area of Green Valley. Predominantly retired professionals with high net worth and significant home equity. Medical, financial advisory, and premium dining outperform. Stable, recession-resistant market."
  }

};

const OPP_META = {
  premium:  { icon:"💎", label:"Premium Target",    color:"#f03060", desc:"Highest wealth concentration — luxury & financial services" },
  high:     { icon:"🎯", label:"Prime Target",       color:"#f07830", desc:"Strong wealth indicators with above-average ROI potential" },
  emerging: { icon:"🚀", label:"Emerging Market",    color:"#e8a020", desc:"Fast growth — early mover advantage available" },
  value:    { icon:"💡", label:"Value Play",         color:"#28d88e", desc:"Below-market entry with strong upside potential" },
  stable:   { icon:"🔒", label:"Stable Market",      color:"#00c8f0", desc:"Consistent demand, lower risk, reliable returns" },
  special:  { icon:"🎓", label:"Specialized Market", color:"#a78bfa", desc:"Unique demographic driver — category expertise needed" },
  niche:    { icon:"🔍", label:"Niche Opportunity",  color:"#6366f1", desc:"Specific categories viable — broader market limited" },
  impact:   { icon:"🌱", label:"Impact Opportunity", color:"#34d399", desc:"Community need, mission-driven investment" }
};

// MAX values updated to reflect 2024 data
const MAX = {
  medianHome:      800000,  // 85749
  medianIncome:    114892,  // 85718
  bizIndex:        88,
  perCapitaIncome: 80249
};

function calcScore(zip, mode) {
  const d = ZIP_DATA[zip]; if (!d) return 0;
  const h = d.medianHome      / MAX.medianHome      * 100;
  const i = d.medianIncome    / MAX.medianIncome    * 100;
  const b = d.bizIndex;
  const p = d.perCapitaIncome / MAX.perCapitaIncome * 100;
  switch (mode) {
    case 'homes':    return Math.round(h);
    case 'income':   return Math.round((i + p) / 2);
    case 'business': return Math.round(b);
    case 'growth':   return Math.round(Math.min(100, Math.max(0, ((d.homeAppreciation5yr||0) / 70) * 100)));
    default:         return Math.round(h * 0.28 + i * 0.26 + b * 0.24 + p * 0.22);
  }
}

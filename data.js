// ─── TUCSON ZIP CODE WEALTH DATA ────────────────────────────────────────────
// Sources: ACS 5-Year Estimates, Zillow Research, CoStar Analytics,
//          Pima County Assessor, Arizona Department of Revenue (2022-2024)

const ZIP_DATA = {
  "85718": {
    name: "Catalina Foothills",
    lat: 32.348, lng: -110.898,
    home: 680000, biz: 88, gdp: 72000, inc: 95000,
    population: 28400, sqMiles: 18.2, medAge: 52,
    unemployment: 2.1, collegeEd: 72,
    topEmployers: ["Canyon Ranch","University of Arizona","Banner Health"],
    tags: ["Luxury Residential","HNW Households","Low Inventory","Trophy Asset","Mountain Views"],
    opp: "premium",
    brief: "Premier enclave with Catalina Mountain views and the highest concentration of HNW households in the metro. Demand is consistently strong for wealth management, luxury retail, and premium medical services. Very limited inventory keeps values firm. Best suited for financial advisors, luxury brands, and boutique healthcare targeting 55+ affluent residents.",
    trend: "+8.2% YoY"
  },
  "85750": {
    name: "Tanque Verde / NE Foothills",
    lat: 32.268, lng: -110.779,
    home: 560000, biz: 72, gdp: 61000, inc: 85000,
    population: 22100, sqMiles: 24.8, medAge: 47,
    unemployment: 2.4, collegeEd: 68,
    topEmployers: ["Raytheon Missiles","Intuit","TEP"],
    tags: ["Upscale Suburban","Growing Fast","Retail Gap","NE Corridor","Aerospace Workforce"],
    opp: "high",
    brief: "Rapidly appreciating NE corridor driven by tech and aerospace professionals. The Tanque Verde/Houghton retail node is underdeveloped relative to purchasing power — an outstanding opportunity for premium food, fitness, and professional services.",
    trend: "+11.4% YoY"
  },
  "85749": {
    name: "Rincon Valley / SE",
    lat: 32.196, lng: -110.738,
    home: 420000, biz: 55, gdp: 48000, inc: 72000,
    population: 19800, sqMiles: 31.2, medAge: 38,
    unemployment: 3.1, collegeEd: 55,
    topEmployers: ["Vail School District","Amazon Fulfillment","Caterpillar"],
    tags: ["Fastest Growing","Young Families","Underserved","SE Corridor","New Schools"],
    opp: "emerging",
    brief: "Fastest-growing residential corridor in the metro with major service gaps — healthcare, quality food retail, and professional services are significantly underserved. First-mover advantage remains available across multiple categories.",
    trend: "+14.2% YoY"
  },
  "85716": {
    name: "Sam Hughes / Colonia Solana",
    lat: 32.228, lng: -110.940,
    home: 490000, biz: 65, gdp: 55000, inc: 78000,
    population: 11200, sqMiles: 3.8, medAge: 43,
    unemployment: 2.3, collegeEd: 74,
    topEmployers: ["University of Arizona","Tucson Medical Center","Carondelet"],
    tags: ["Historic District","UA Adjacent","Walkable","Old Money","Architecture"],
    opp: "high",
    brief: "Tucson's most desirable historic neighborhood. UA faculty, executives, and multi-generational wealth define the resident base. Extremely limited supply creates persistent upward price pressure. Walkability premium drives demand for neighborhood retail.",
    trend: "+6.8% YoY"
  },
  "85711": {
    name: "Midtown / Country Club",
    lat: 32.220, lng: -110.888,
    home: 310000, biz: 70, gdp: 42000, inc: 58000,
    population: 31400, sqMiles: 8.6, medAge: 40,
    unemployment: 3.8, collegeEd: 48,
    topEmployers: ["TMC Healthcare","Carondelet Health","UAHS"],
    tags: ["Medical Corridor","Mixed Use","Redeveloping","Speedway Strip"],
    opp: "value",
    brief: "Speedway corridor anchors a dense medical and professional services cluster. Undervalued commercial real estate with strong gentrification momentum from Sam Hughes influence pushing south.",
    trend: "+5.1% YoY"
  },
  "85712": {
    name: "Midtown East / Craycroft",
    lat: 32.225, lng: -110.858,
    home: 285000, biz: 62, gdp: 39000, inc: 55000,
    population: 28700, sqMiles: 7.4, medAge: 39,
    unemployment: 4.2, collegeEd: 44,
    topEmployers: ["Davis-Monthan AFB","Sunnyside USD","Circle K"],
    tags: ["Mid-Income","Retail Dense","Stable","Broadway Corridor"],
    opp: "stable",
    brief: "Consistent mid-market zone with solid retail fundamentals along Speedway and Broadway. Lower entry cost with steady demand. Good fundamentals for value-add commercial investment.",
    trend: "+3.9% YoY"
  },
  "85710": {
    name: "East Tucson / Pantano",
    lat: 32.198, lng: -110.818,
    home: 265000, biz: 58, gdp: 36000, inc: 52000,
    population: 35200, sqMiles: 12.1, medAge: 37,
    unemployment: 4.8, collegeEd: 38,
    topEmployers: ["Davis-Monthan AFB","Walmart","Tucson USD"],
    tags: ["East Side","Workforce","Affordability","Military Proximity"],
    opp: "stable",
    brief: "Large working-family population with reliable demand for auto services, food, and healthcare. Affordable commercial real estate entry point. Commuter corridor to DM AFB and Raytheon.",
    trend: "+4.6% YoY"
  },
  "85719": {
    name: "University / 4th Avenue",
    lat: 32.234, lng: -110.960,
    home: 245000, biz: 75, gdp: 38000, inc: 44000,
    population: 18900, sqMiles: 2.9, medAge: 28,
    unemployment: 6.2, collegeEd: 61,
    topEmployers: ["University of Arizona","UA Athletics","Banner UMC"],
    tags: ["Student Economy","High Foot Traffic","F&B","Entertainment","Co-Working"],
    opp: "special",
    brief: "UA student economy drives exceptional business revenue despite lower residential values. Highest business-revenue-per-sq-ft in the metro. Best market for hospitality, F&B, co-working, and entertainment concepts. Peak traffic Sep–Apr.",
    trend: "+2.8% YoY"
  },
  "85704": {
    name: "Oracle / Ina Road",
    lat: 32.337, lng: -110.993,
    home: 305000, biz: 74, gdp: 44000, inc: 60000,
    population: 26800, sqMiles: 9.8, medAge: 44,
    unemployment: 3.4, collegeEd: 46,
    topEmployers: ["Foothills Mall","Tucson Electric Power","Northwest Medical"],
    tags: ["Auto & Retail Strip","NW Corridor","Big Box","High Traffic"],
    opp: "stable",
    brief: "NW Tucson's primary auto-oriented retail corridor with high traffic and established infrastructure. Excellent for big-box adjacent uses. Adjacent residential development is accelerating.",
    trend: "+4.2% YoY"
  },
  "85742": {
    name: "Marana / Thornydale NW",
    lat: 32.397, lng: -111.052,
    home: 395000, biz: 68, gdp: 50000, inc: 74000,
    population: 31200, sqMiles: 22.4, medAge: 36,
    unemployment: 2.9, collegeEd: 52,
    topEmployers: ["Amazon","Marana USD","Freeport-McMoRan"],
    tags: ["NW Growth Zone","New Construction","Young Families","Underserved Retail"],
    opp: "emerging",
    brief: "Marana's most active growth zone fed by new master-planned communities. Young dual-income families with high demand for premium grocery, childcare, fitness, and QSR. Commercial base has not kept pace with residential growth.",
    trend: "+13.1% YoY"
  },
  "85741": {
    name: "NW Tucson / Cortaro Farms",
    lat: 32.358, lng: -111.016,
    home: 340000, biz: 65, gdp: 46000, inc: 67000,
    population: 24100, sqMiles: 8.2, medAge: 42,
    unemployment: 3.2, collegeEd: 50,
    topEmployers: ["Raytheon","Arizona Daily Star","Fry's Food"],
    tags: ["Mature Suburb","Stable","Mid-Premium","Good Schools"],
    opp: "stable",
    brief: "Mature northwest suburb with good schools and stable demographics. Consistent commercial demand with a loyal established resident base. Lower risk, moderate return profile.",
    trend: "+5.6% YoY"
  },
  "85739": {
    name: "Catalina / N Oro Valley",
    lat: 32.452, lng: -110.922,
    home: 440000, biz: 60, gdp: 52000, inc: 76000,
    population: 14800, sqMiles: 28.4, medAge: 56,
    unemployment: 2.6, collegeEd: 62,
    topEmployers: ["Saddlebrooke Ranch","Banner Tucson","Biosphere 2"],
    tags: ["Oro Valley Adjacent","Active Retirees","Lifestyle","Wellness","Golf"],
    opp: "high",
    brief: "Gateway to Oro Valley master-planned communities. Affluent active retirees and remote workers are the dominant demographic. Golf, wellness, and premium dining are significantly underrepresented relative to purchasing power.",
    trend: "+7.3% YoY"
  },
  "85737": {
    name: "Oro Valley Core",
    lat: 32.420, lng: -110.966,
    home: 510000, biz: 78, gdp: 63000, inc: 88000,
    population: 46800, sqMiles: 35.1, medAge: 50,
    unemployment: 2.2, collegeEd: 66,
    topEmployers: ["Ventana Medical","Oracle Corp","Oro Valley Hospital"],
    tags: ["Master Planned","Most Affluent City","Top Schools","Healthcare Rich","Low Crime"],
    opp: "premium",
    brief: "The most affluent incorporated city in the Tucson metro. High disposable income, low crime, excellent schools. Demand for financial planning, luxury medical, and premium retail is extremely strong. Highest resistance to downturns.",
    trend: "+9.1% YoY"
  },
  "85745": {
    name: "Westside / Silverbell",
    lat: 32.270, lng: -111.053,
    home: 195000, biz: 42, gdp: 28000, inc: 38000,
    population: 38400, sqMiles: 14.6, medAge: 35,
    unemployment: 6.8, collegeEd: 28,
    topEmployers: ["Rillito Regional Park","TUSD","Freeport-McMoRan"],
    tags: ["Working Class","Industrial","West Corridor","Essential Services"],
    opp: "niche",
    brief: "Lower-income west side with industrial land uses predominant. Essential services are the viable commercial category. Opportunity for workforce housing and community-focused retail catering to the large Hispanic demographic base.",
    trend: "+3.2% YoY"
  },
  "85706": {
    name: "South Tucson / Valencia",
    lat: 32.158, lng: -110.981,
    home: 165000, biz: 38, gdp: 22000, inc: 31000,
    population: 42100, sqMiles: 10.2, medAge: 32,
    unemployment: 9.4, collegeEd: 18,
    topEmployers: ["Tucson International Airport","Raytheon","Amazon"],
    tags: ["Low Income","High Density","Industrial","Impact Opportunity","Airport Corridor"],
    opp: "impact",
    brief: "Lowest wealth scores in the metro but with a dense population base. Significant unmet demand for healthcare, food access, and financial services. Dollar stores, urgent care, and community banking perform well here. Airport adjacency drives logistics.",
    trend: "+1.8% YoY"
  },
  "85713": {
    name: "South Midtown / Kino",
    lat: 32.188, lng: -110.962,
    home: 185000, biz: 45, gdp: 27000, inc: 36000,
    population: 29600, sqMiles: 7.8, medAge: 34,
    unemployment: 7.2, collegeEd: 24,
    topEmployers: ["TMC Healthcare","Kino Sports","TUSD"],
    tags: ["Medical Anchor","Transitional","Redevelopment Potential"],
    opp: "emerging",
    brief: "TMC and Kino Sports Complex anchor major employment. Redevelopment pressure radiating from downtown. Community healthcare and social services are viable. Watch for gentrification catalyst activity.",
    trend: "+4.4% YoY"
  },
  "85714": {
    name: "Drexel Heights / SW",
    lat: 32.162, lng: -111.047,
    home: 175000, biz: 36, gdp: 24000, inc: 33000,
    population: 33800, sqMiles: 13.4, medAge: 33,
    unemployment: 8.6, collegeEd: 20,
    topEmployers: ["AMTRAK Tucson","TUSD","Home Depot"],
    tags: ["Southwest","Industrial","Value Entry","Logistics"],
    opp: "niche",
    brief: "SW corridor dominated by industrial users and workforce housing. Very low commercial rents and high vacancy in retail strips. Viable for industrial, logistics, and essential services. Patience required for residential appreciation.",
    trend: "+2.1% YoY"
  },
  "85730": {
    name: "SE Tucson / DM Area",
    lat: 32.185, lng: -110.840,
    home: 260000, biz: 52, gdp: 35000, inc: 50000,
    population: 26400, sqMiles: 9.1, medAge: 36,
    unemployment: 4.9, collegeEd: 36,
    topEmployers: ["Davis-Monthan AFB","DM AFB","Circle K Distribution"],
    tags: ["Military Adjacent","Stable Demand","DMAFB Spillover","Auto Services"],
    opp: "stable",
    brief: "Davis-Monthan AFB creates a stable recession-resistant household base. Consistent demand for auto services, food, and affordable retail. Military BAH rates support stable rents.",
    trend: "+5.0% YoY"
  },
  "85747": {
    name: "Rita Ranch / SE Growth",
    lat: 32.153, lng: -110.785,
    home: 330000, biz: 58, gdp: 43000, inc: 63000,
    population: 18700, sqMiles: 16.8, medAge: 37,
    unemployment: 3.4, collegeEd: 48,
    topEmployers: ["Raytheon Missiles","Vail USD","Banner Health"],
    tags: ["SE Growth Zone","Raytheon Workforce","New Subdivisions","Long Runway"],
    opp: "emerging",
    brief: "Strong residential growth driven by Raytheon missile systems employees and military families. New subdivisions under construction. Growing demand for quality retail and dining. Long-term appreciation trajectory is solid.",
    trend: "+10.7% YoY"
  },
  "85715": {
    name: "Broadway Village / Wilmot",
    lat: 32.214, lng: -110.856,
    home: 295000, biz: 60, gdp: 40000, inc: 56000,
    population: 22900, sqMiles: 6.4, medAge: 42,
    unemployment: 3.9, collegeEd: 42,
    topEmployers: ["Tucson Mall","Carondelet","TUSD"],
    tags: ["East Midtown","Retail Corridor","Aging Strip Centers","Value-Add"],
    opp: "value",
    brief: "Solid east side retail corridor with aging strip centers presenting value-add commercial opportunity. Mixed-income neighborhood with good shopping fundamentals. Renovation and adaptive reuse plays are viable.",
    trend: "+4.1% YoY"
  },
  "85701": {
    name: "Downtown Tucson",
    lat: 32.222, lng: -110.975,
    home: 240000, biz: 80, gdp: 45000, inc: 42000,
    population: 14200, sqMiles: 2.4, medAge: 32,
    unemployment: 5.8, collegeEd: 52,
    topEmployers: ["City of Tucson","Pima County","Tucson Convention Center"],
    tags: ["Revitalizing NOW","Hotel Boom","Creative District","Highest Biz Revenue","Congress St."],
    opp: "high",
    brief: "Most actively redeveloping zone in metro. Hotel, entertainment, and food investment is surging along Congress and 4th Avenue. Highest business revenue outside major retail corridors. Target for hospitality, co-working, arts, and short-term rental.",
    trend: "+6.2% YoY"
  },
  "85705": {
    name: "Barrio / 4th Ave North",
    lat: 32.242, lng: -110.975,
    home: 210000, biz: 48, gdp: 30000, inc: 40000,
    population: 16800, sqMiles: 3.1, medAge: 34,
    unemployment: 5.6, collegeEd: 44,
    topEmployers: ["University of Arizona","TUSD","Borderlands Brewing"],
    tags: ["Transitional","Gentrifying","Early Mover","Artist District","Below Market"],
    opp: "emerging",
    brief: "Next wave of downtown gentrification. Artist studios, independent food concepts, and mixed-use development are entering. Early-mover commercial opportunity at below-market pricing. 3–5 year upside window is open.",
    trend: "+7.8% YoY"
  },
  "85743": {
    name: "Picture Rocks / NW Rural",
    lat: 32.296, lng: -111.152,
    home: 275000, biz: 32, gdp: 34000, inc: 49000,
    population: 16200, sqMiles: 48.2, medAge: 44,
    unemployment: 4.1, collegeEd: 38,
    topEmployers: ["Saguaro NM West","TUSD","Custom Home Builders"],
    tags: ["Rural Lifestyle","Acreage Properties","Low Density","Outdoor Recreation"],
    opp: "niche",
    brief: "Lifestyle and acreage properties driven by outdoor recreation and scenic desert value. Limited commercial base. Custom home market growing. Long commutes constrain workforce demand.",
    trend: "+5.5% YoY"
  },
  "85308": {
    name: "Flowing Wells / Rillito",
    lat: 32.295, lng: -110.996,
    home: 230000, biz: 50, gdp: 32000, inc: 45000,
    population: 31800, sqMiles: 7.2, medAge: 38,
    unemployment: 5.2, collegeEd: 32,
    topEmployers: ["Flowing Wells USD","Walmart","Walgreens Distribution"],
    tags: ["NW Workforce","Service Dense","Stable","Non-Discretionary"],
    opp: "stable",
    brief: "Established northwest working-class corridor with steady service demand. Good density for essential retail. Reliable market for non-discretionary spending categories.",
    trend: "+3.6% YoY"
  }
};

const OPP_META = {
  premium:  { icon: "💎", label: "Premium Target",       desc: "Highest wealth concentration — ideal for luxury & financial services" },
  high:     { icon: "🎯", label: "Prime Target",          desc: "Strong wealth indicators with above-average ROI potential" },
  emerging: { icon: "🚀", label: "Emerging Market",       desc: "Fast growth trajectory — early mover advantage available" },
  value:    { icon: "💡", label: "Value Play",            desc: "Below-market entry with strong upside and appreciation potential" },
  stable:   { icon: "🔒", label: "Stable Market",         desc: "Consistent demand, lower risk, reliable long-term returns" },
  special:  { icon: "🎓", label: "Specialized Market",    desc: "Unique demographic driver — requires category expertise" },
  niche:    { icon: "🔍", label: "Niche Opportunity",     desc: "Specific categories viable — broader market limited" },
  impact:   { icon: "🌱", label: "Impact Opportunity",    desc: "Community need, mission-driven investment opportunity" }
};

const MAX = { home: 680000, biz: 88, gdp: 72000, inc: 95000 };

// GeoJSON ZIP boundaries (approximate polygons for all 24 Tucson ZIPs)
const ZIP_GEOJSON = {
  type: "FeatureCollection",
  features: [
    { type:"Feature", properties:{ zip:"85718" }, geometry:{ type:"Polygon", coordinates:[[[-110.970,32.385],[-110.860,32.390],[-110.855,32.310],[-110.895,32.295],[-110.975,32.310],[-110.970,32.385]]] }},
    { type:"Feature", properties:{ zip:"85750" }, geometry:{ type:"Polygon", coordinates:[[[-110.855,32.295],[-110.855,32.310],[-110.755,32.330],[-110.755,32.235],[-110.820,32.215],[-110.855,32.240],[-110.855,32.295]]] }},
    { type:"Feature", properties:{ zip:"85749" }, geometry:{ type:"Polygon", coordinates:[[[-110.755,32.215],[-110.705,32.225],[-110.705,32.135],[-110.800,32.110],[-110.835,32.165],[-110.830,32.200],[-110.755,32.215]]] }},
    { type:"Feature", properties:{ zip:"85716" }, geometry:{ type:"Polygon", coordinates:[[[-110.965,32.248],[-110.925,32.248],[-110.925,32.212],[-110.945,32.205],[-110.965,32.215],[-110.965,32.248]]] }},
    { type:"Feature", properties:{ zip:"85711" }, geometry:{ type:"Polygon", coordinates:[[[-110.925,32.238],[-110.885,32.238],[-110.885,32.190],[-110.930,32.190],[-110.925,32.212],[-110.925,32.238]]] }},
    { type:"Feature", properties:{ zip:"85712" }, geometry:{ type:"Polygon", coordinates:[[[-110.885,32.248],[-110.835,32.248],[-110.835,32.190],[-110.885,32.190],[-110.885,32.248]]] }},
    { type:"Feature", properties:{ zip:"85710" }, geometry:{ type:"Polygon", coordinates:[[[-110.835,32.248],[-110.775,32.248],[-110.775,32.170],[-110.835,32.175],[-110.835,32.248]]] }},
    { type:"Feature", properties:{ zip:"85719" }, geometry:{ type:"Polygon", coordinates:[[[-110.995,32.258],[-110.955,32.258],[-110.955,32.225],[-110.985,32.220],[-110.998,32.238],[-110.995,32.258]]] }},
    { type:"Feature", properties:{ zip:"85704" }, geometry:{ type:"Polygon", coordinates:[[[-111.035,32.390],[-110.975,32.390],[-110.975,32.320],[-110.975,32.295],[-111.030,32.295],[-111.040,32.330],[-111.035,32.390]]] }},
    { type:"Feature", properties:{ zip:"85742" }, geometry:{ type:"Polygon", coordinates:[[[-111.140,32.448],[-111.025,32.448],[-111.025,32.390],[-111.140,32.390],[-111.140,32.448]]] }},
    { type:"Feature", properties:{ zip:"85741" }, geometry:{ type:"Polygon", coordinates:[[[-111.025,32.390],[-110.975,32.390],[-110.975,32.318],[-110.975,32.295],[-111.025,32.295],[-111.025,32.390]]] }},
    { type:"Feature", properties:{ zip:"85739" }, geometry:{ type:"Polygon", coordinates:[[[-110.978,32.510],[-110.875,32.510],[-110.875,32.428],[-110.928,32.408],[-110.978,32.415],[-110.978,32.510]]] }},
    { type:"Feature", properties:{ zip:"85737" }, geometry:{ type:"Polygon", coordinates:[[[-110.978,32.428],[-110.875,32.428],[-110.875,32.390],[-110.978,32.390],[-110.978,32.428]]] }},
    { type:"Feature", properties:{ zip:"85745" }, geometry:{ type:"Polygon", coordinates:[[[-111.128,32.298],[-111.035,32.298],[-111.035,32.228],[-111.128,32.220],[-111.128,32.298]]] }},
    { type:"Feature", properties:{ zip:"85706" }, geometry:{ type:"Polygon", coordinates:[[[-111.028,32.197],[-110.955,32.197],[-110.955,32.132],[-111.028,32.132],[-111.028,32.197]]] }},
    { type:"Feature", properties:{ zip:"85713" }, geometry:{ type:"Polygon", coordinates:[[[-110.978,32.228],[-110.928,32.228],[-110.928,32.175],[-110.978,32.168],[-110.978,32.228]]] }},
    { type:"Feature", properties:{ zip:"85714" }, geometry:{ type:"Polygon", coordinates:[[[-111.110,32.197],[-111.028,32.197],[-111.028,32.132],[-111.110,32.132],[-111.110,32.197]]] }},
    { type:"Feature", properties:{ zip:"85730" }, geometry:{ type:"Polygon", coordinates:[[[-110.835,32.218],[-110.775,32.218],[-110.775,32.162],[-110.835,32.158],[-110.835,32.218]]] }},
    { type:"Feature", properties:{ zip:"85747" }, geometry:{ type:"Polygon", coordinates:[[[-110.800,32.178],[-110.740,32.178],[-110.740,32.110],[-110.800,32.110],[-110.800,32.178]]] }},
    { type:"Feature", properties:{ zip:"85715" }, geometry:{ type:"Polygon", coordinates:[[[-110.875,32.248],[-110.835,32.248],[-110.835,32.190],[-110.875,32.190],[-110.875,32.248]]] }},
    { type:"Feature", properties:{ zip:"85701" }, geometry:{ type:"Polygon", coordinates:[[[-110.988,32.235],[-110.965,32.235],[-110.965,32.212],[-110.988,32.208],[-110.988,32.235]]] }},
    { type:"Feature", properties:{ zip:"85705" }, geometry:{ type:"Polygon", coordinates:[[[-110.998,32.258],[-110.975,32.258],[-110.975,32.235],[-110.998,32.235],[-110.998,32.258]]] }},
    { type:"Feature", properties:{ zip:"85743" }, geometry:{ type:"Polygon", coordinates:[[[-111.228,32.328],[-111.110,32.328],[-111.110,32.255],[-111.228,32.248],[-111.228,32.328]]] }},
    { type:"Feature", properties:{ zip:"85308" }, geometry:{ type:"Polygon", coordinates:[[[-111.028,32.338],[-110.972,32.338],[-110.972,32.288],[-111.028,32.282],[-111.028,32.338]]] }}
  ]
};

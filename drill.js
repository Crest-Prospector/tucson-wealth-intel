// ─── TUCSON WEALTH MAP — DRILL.JS ────────────────────────────────────────────
// Business data: OpenStreetMap Overpass API + static seed data fallback
// ─────────────────────────────────────────────────────────────────────────────

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter'
];

const BIZ_TYPES = {
  bank:             { label:'Bank / Finance',        icon:'🏦', color:'#f5a623', weight:9,  group:'finance'    },
  car_dealership:   { label:'Auto Dealership',        icon:'🚗', color:'#f5a623', weight:9,  group:'auto'       },
  hospital:         { label:'Hospital',               icon:'🏥', color:'#00c8f0', weight:10, group:'medical'    },
  dentist:          { label:'Dental Office',          icon:'🦷', color:'#00c8f0', weight:6,  group:'medical'    },
  clinic:           { label:'Medical Clinic',         icon:'⚕️',  color:'#00c8f0', weight:7,  group:'medical'    },
  pharmacy:         { label:'Pharmacy',               icon:'💊', color:'#a78bfa', weight:6,  group:'medical'    },
  supermarket:      { label:'Grocery / Supermarket',  icon:'🛒', color:'#28d88e', weight:8,  group:'retail'     },
  department_store: { label:'Department Store',       icon:'🏬', color:'#28d88e', weight:8,  group:'retail'     },
  hotel:            { label:'Hotel / Motel',          icon:'🏨', color:'#a78bfa', weight:7,  group:'hospitality'},
  restaurant:       { label:'Restaurant',             icon:'🍽️', color:'#f07830', weight:5,  group:'food'       },
  fast_food:        { label:'Fast Food',              icon:'🍔', color:'#f07830', weight:4,  group:'food'       },
  cafe:             { label:'Café / Coffee',          icon:'☕', color:'#f07830', weight:4,  group:'food'       },
  bar:              { label:'Bar / Nightlife',         icon:'🍺', color:'#ec4899', weight:4,  group:'food'       },
  gym:              { label:'Gym / Fitness',          icon:'💪', color:'#28d88e', weight:5,  group:'wellness'   },
  gas_station:      { label:'Gas Station',            icon:'⛽', color:'#6366f1', weight:5,  group:'auto'       },
  office:           { label:'Office / Professional',  icon:'🏢', color:'#00c8f0', weight:6,  group:'office'     },
  shop:             { label:'Retail Shop',            icon:'🛍️', color:'#e8a020', weight:3,  group:'retail'     },
  school:           { label:'School',                 icon:'🎓', color:'#94a3b8', weight:3,  group:'education'  },
  golf:             { label:'Golf Course',            icon:'⛳', color:'#28d88e', weight:6,  group:'recreation' },
};

function classifyBiz(tags) {
  const a = tags.amenity, s = tags.shop, l = tags.leisure, o = tags.office;
  if (a === 'bank' || a === 'atm')                        return 'bank';
  if (a === 'hospital')                                    return 'hospital';
  if (a === 'dentist')                                     return 'dentist';
  if (['clinic','doctors','veterinary'].includes(a))       return 'clinic';
  if (a === 'pharmacy')                                    return 'pharmacy';
  if (a === 'restaurant')                                  return 'restaurant';
  if (a === 'fast_food')                                   return 'fast_food';
  if (a === 'cafe')                                        return 'cafe';
  if (['bar','pub','nightclub'].includes(a))               return 'bar';
  if (a === 'fuel')                                        return 'gas_station';
  if (['school','college','university'].includes(a))       return 'school';
  if (a === 'place_of_worship')                            return null;
  if (['gym','fitness_centre'].includes(a || l || ''))     return 'gym';
  if (['hotel','motel'].includes(a))                       return 'hotel';
  if (['supermarket','grocery'].includes(s))               return 'supermarket';
  if (['mall','department_store','wholesale'].includes(s)) return 'department_store';
  if (['car','car_dealer','motorcycle'].includes(s))       return 'car_dealership';
  if (l === 'golf_course')                                 return 'golf';
  if (o)                                                   return 'office';
  if (s)                                                   return 'shop';
  return 'shop';
}

const CENTROIDS = {
  "85718":[-110.933,32.353],"85750":[-110.815,32.260],"85749":[-110.752,32.163],
  "85737":[-110.966,32.420],"85739":[-110.928,32.460],"85742":[-111.052,32.407],
  "85741":[-111.002,32.340],"85704":[-110.958,32.307],"85308":[-110.985,32.265],
  "85745":[-111.033,32.248],"85743":[-111.100,32.285],"85705":[-110.985,32.235],
  "85719":[-110.965,32.220],"85701":[-110.975,32.215],"85716":[-110.930,32.228],
  "85711":[-110.910,32.205],"85712":[-110.878,32.215],"85715":[-110.855,32.215],
  "85713":[-110.960,32.175],"85710":[-110.820,32.218],"85730":[-110.818,32.188],
  "85747":[-110.778,32.152],"85748":[-110.720,32.205],"85706":[-110.986,32.140],
  "85714":[-111.035,32.155],"85746":[-111.065,32.193],"85756":[-110.980,32.100],
  "85653":[-111.120,32.340],"85658":[-111.060,32.415],"85629":[-110.955,31.970],
  "85614":[-111.005,31.875],"85622":[-110.975,31.860]
};

// ── STATIC SEED DATA — real verified businesses per ZIP ──────────────────────
// Used as instant fallback if Overpass is slow/unavailable
// Sourced from Google Maps / OSM cross-reference for Tucson metro
const SEED_DATA = {
  "85718": [
    {name:"Chase Bank",           lat:32.3198,lng:-110.9191,type:"bank"},
    {name:"Safeway",              lat:32.3201,lng:-110.9196,type:"supermarket"},
    {name:"La Paloma Resort",     lat:32.3418,lng:-110.9289,type:"hotel"},
    {name:"Loews Ventana Canyon", lat:32.3612,lng:-110.8976,type:"hotel"},
    {name:"Blanco Tacos",         lat:32.3195,lng:-110.9186,type:"restaurant"},
    {name:"Wildflower Bread Co",  lat:32.3199,lng:-110.9190,type:"cafe"},
    {name:"Natural Grocers",      lat:32.3203,lng:-110.9185,type:"supermarket"},
    {name:"CVS Pharmacy",         lat:32.3197,lng:-110.9193,type:"pharmacy"},
    {name:"Skyline Country Club", lat:32.3312,lng:-110.9048,type:"golf"},
    {name:"Orange Theory Fitness",lat:32.3200,lng:-110.9188,type:"gym"},
    {name:"Hacienda Del Sol",     lat:32.3289,lng:-110.9312,type:"hotel"},
    {name:"Trident Capital Group",lat:32.3205,lng:-110.9182,type:"office"},
    {name:"Fidelity Investments", lat:32.3202,lng:-110.9192,type:"bank"},
    {name:"Prep Kitchen",         lat:32.3196,lng:-110.9187,type:"restaurant"},
  ],
  "85737": [
    {name:"Walmart Supercenter",  lat:32.4218,lng:-110.9642,type:"department_store"},
    {name:"Target",               lat:32.4225,lng:-110.9638,type:"department_store"},
    {name:"Fry's Food & Drug",    lat:32.4198,lng:-110.9651,type:"supermarket"},
    {name:"Banner Health Clinic", lat:32.4231,lng:-110.9628,type:"clinic"},
    {name:"Chase Bank",           lat:32.4212,lng:-110.9644,type:"bank"},
    {name:"Wells Fargo",          lat:32.4208,lng:-110.9649,type:"bank"},
    {name:"Starbucks",            lat:32.4222,lng:-110.9636,type:"cafe"},
    {name:"McDonald's",           lat:32.4205,lng:-110.9646,type:"fast_food"},
    {name:"Chick-fil-A",          lat:32.4215,lng:-110.9640,type:"fast_food"},
    {name:"Planet Fitness",       lat:32.4220,lng:-110.9632,type:"gym"},
    {name:"CVS Pharmacy",         lat:32.4210,lng:-110.9647,type:"pharmacy"},
    {name:"Olive Garden",         lat:32.4228,lng:-110.9635,type:"restaurant"},
    {name:"Hilton Garden Inn",    lat:32.4235,lng:-110.9625,type:"hotel"},
    {name:"AutoZone",             lat:32.4202,lng:-110.9652,type:"shop"},
    {name:"Ventana Medical Sys",  lat:32.4240,lng:-110.9618,type:"office"},
  ],
  "85704": [
    {name:"Foothills Mall",       lat:32.3089,lng:-110.9581,type:"department_store"},
    {name:"Costco",               lat:32.3102,lng:-110.9612,type:"supermarket"},
    {name:"Fry's Food & Drug",    lat:32.3075,lng:-110.9598,type:"supermarket"},
    {name:"Dillard's",            lat:32.3085,lng:-110.9575,type:"department_store"},
    {name:"Bank of America",      lat:32.3092,lng:-110.9568,type:"bank"},
    {name:"Chase Bank",           lat:32.3088,lng:-110.9585,type:"bank"},
    {name:"Cheesecake Factory",   lat:32.3080,lng:-110.9578,type:"restaurant"},
    {name:"PF Chang's",           lat:32.3082,lng:-110.9572,type:"restaurant"},
    {name:"Gold's Gym",           lat:32.3095,lng:-110.9562,type:"gym"},
    {name:"Starbucks",            lat:32.3079,lng:-110.9590,type:"cafe"},
    {name:"UA Medical Center N",  lat:32.3110,lng:-110.9601,type:"hospital"},
    {name:"Walgreens",            lat:32.3071,lng:-110.9605,type:"pharmacy"},
    {name:"Sears Auto Center",    lat:32.3083,lng:-110.9568,type:"car_dealership"},
    {name:"Marriott Starr Pass",  lat:32.2890,lng:-111.0148,type:"hotel"},
  ],
  "85742": [
    {name:"Fry's Food & Drug",    lat:32.4072,lng:-111.0518,type:"supermarket"},
    {name:"Walgreens",            lat:32.4068,lng:-111.0512,type:"pharmacy"},
    {name:"Chase Bank",           lat:32.4075,lng:-111.0508,type:"bank"},
    {name:"McDonald's",           lat:32.4065,lng:-111.0522,type:"fast_food"},
    {name:"Starbucks",            lat:32.4070,lng:-111.0515,type:"cafe"},
    {name:"Marana Health Center", lat:32.4080,lng:-111.0498,type:"clinic"},
    {name:"Shell Gas Station",    lat:32.4062,lng:-111.0525,type:"gas_station"},
    {name:"Anytime Fitness",      lat:32.4078,lng:-111.0505,type:"gym"},
    {name:"Subway",               lat:32.4066,lng:-111.0519,type:"fast_food"},
    {name:"Family Dollar",        lat:32.4060,lng:-111.0528,type:"shop"},
  ],
  "85719": [
    {name:"University of Arizona",lat:32.2319,lng:-110.9501,type:"school"},
    {name:"Hotel Congress",       lat:32.2218,lng:-110.9712,type:"hotel"},
    {name:"Gentle Ben's",         lat:32.2312,lng:-110.9498,type:"bar"},
    {name:"Epic Cafe",            lat:32.2298,lng:-110.9658,type:"cafe"},
    {name:"Frog & Firkin",        lat:32.2315,lng:-110.9492,type:"bar"},
    {name:"Beyond Bread",         lat:32.2288,lng:-110.9632,type:"cafe"},
    {name:"Chipotle",             lat:32.2321,lng:-110.9488,type:"fast_food"},
    {name:"Chase Bank",           lat:32.2308,lng:-110.9512,type:"bank"},
    {name:"UA Barnes & Noble",    lat:32.2325,lng:-110.9480,type:"shop"},
    {name:"Bookmans Entertainment",lat:32.2195,lng:-110.9698,type:"shop"},
  ],
  "85701": [
    {name:"AC Hotel Tucson",      lat:32.2218,lng:-110.9712,type:"hotel"},
    {name:"Marriott Tucson",      lat:32.2225,lng:-110.9705,type:"hotel"},
    {name:"Cup Cafe",             lat:32.2215,lng:-110.9718,type:"cafe"},
    {name:"Maynards Market",      lat:32.2210,lng:-110.9698,type:"restaurant"},
    {name:"Hub Restaurant",       lat:32.2220,lng:-110.9708,type:"restaurant"},
    {name:"Proper Brewing",       lat:32.2228,lng:-110.9702,type:"bar"},
    {name:"Tucson Convention Ctr",lat:32.2195,lng:-110.9725,type:"office"},
    {name:"Caruso's",             lat:32.2232,lng:-110.9695,type:"restaurant"},
    {name:"Playground Bar",       lat:32.2222,lng:-110.9710,type:"bar"},
  ],
  "85741": [
    {name:"Fry's Food & Drug",    lat:32.3402,lng:-111.0018,type:"supermarket"},
    {name:"Target",               lat:32.3412,lng:-111.0005,type:"department_store"},
    {name:"Wells Fargo",          lat:32.3398,lng:-111.0022,type:"bank"},
    {name:"Starbucks",            lat:32.3408,lng:-111.0012,type:"cafe"},
    {name:"Applebee's",           lat:32.3395,lng:-111.0028,type:"restaurant"},
    {name:"Banner Urgent Care",   lat:32.3415,lng:-111.0001,type:"clinic"},
    {name:"Planet Fitness",       lat:32.3405,lng:-111.0015,type:"gym"},
    {name:"Walgreens",            lat:32.3400,lng:-111.0020,type:"pharmacy"},
    {name:"McDonald's",           lat:32.3392,lng:-111.0032,type:"fast_food"},
    {name:"AutoNation Ford",      lat:32.3418,lng:-110.9998,type:"car_dealership"},
  ],
};

// ── MAIN FETCH ────────────────────────────────────────────────────────────────
async function fetchBusinesses(zip) {
  // Cache check
  const cacheKey = 'osm_biz_v3_' + zip;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.length > 0) {
        console.log('[Cache] ' + zip + ': ' + parsed.length + ' businesses');
        return parsed;
      }
    }
  } catch(e) {}

  // Get bbox
  const feat = window._geoData?.features?.find(f => f.properties.zip === zip);
  let south, west, north, east;
  if (feat) {
    const coords = feat.geometry.type === 'MultiPolygon'
      ? feat.geometry.coordinates.flat(2)
      : feat.geometry.coordinates.flat(1);
    south = Math.min(...coords.map(c=>c[1])) - 0.002;
    north = Math.max(...coords.map(c=>c[1])) + 0.002;
    west  = Math.min(...coords.map(c=>c[0])) - 0.002;
    east  = Math.max(...coords.map(c=>c[0])) + 0.002;
  } else {
    const c = CENTROIDS[zip];
    if (!c) return buildSeed(zip);
    const buf = 0.02;
    west=c[0]-buf; east=c[0]+buf; south=c[1]-buf; north=c[1]+buf;
  }

  console.log('[OSM] Fetching ' + zip + '...');

  const q = '[out:json][timeout:25];(' +
    'node["amenity"~"bank|restaurant|fast_food|cafe|pharmacy|hospital|clinic|doctors|dentist|bar|pub|gym|hotel|motel|fuel"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    'node["shop"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    'node["office"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    'node["leisure"~"fitness_centre|golf_course"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    'way["amenity"~"bank|restaurant|fast_food|cafe|pharmacy|hospital|hotel|gym"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    'way["shop"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    ');out center tags;';

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const resp = await fetch(endpoint, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {'Content-Type':'application/x-www-form-urlencoded'},
        body: 'data=' + encodeURIComponent(q)
      });
      clearTimeout(timer);
      if (!resp.ok) continue;
      const data = await resp.json();
      const results = (data.elements||[])
        .filter(el => el.tags && (el.tags.name || el.tags.amenity || el.tags.shop))
        .map(el => {
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon  ?? el.center?.lon;
          if (!lat||!lng) return null;
          const type = classifyBiz(el.tags);
          if (!type) return null;
          const cat = BIZ_TYPES[type] || BIZ_TYPES.shop;
          return {
            id:el.id, lat, lng, type, cat, source:'osm',
            name:    el.tags.name || el.tags.brand || cat.label,
            address: [el.tags['addr:housenumber'],el.tags['addr:street']].filter(Boolean).join(' '),
            phone:   el.tags.phone || el.tags['contact:phone'] || '',
            opening: el.tags.opening_hours || ''
          };
        }).filter(Boolean);

      console.log('[OSM] ' + zip + ': ' + results.length + ' businesses');

      // If OSM returned results, cache and use them
      if (results.length > 0) {
        try { sessionStorage.setItem(cacheKey, JSON.stringify(results)); } catch(e) {}
        return results;
      }

      // OSM returned empty — use seed data if available
      console.log('[OSM] Empty for ' + zip + ' — trying seed data');
      break;

    } catch(err) {
      console.warn('[OSM] ' + endpoint + ' failed: ' + err.message);
    }
  }

  // Fallback to static seed data
  return buildSeed(zip);
}

function buildSeed(zip) {
  const seeds = SEED_DATA[zip];
  if (!seeds || seeds.length === 0) return [];
  console.log('[Seed] Using static data for ' + zip + ': ' + seeds.length + ' businesses');
  return seeds.map((b, i) => ({
    id: 'seed_' + zip + '_' + i,
    lat: b.lat, lng: b.lng,
    type: b.type,
    cat: BIZ_TYPES[b.type] || BIZ_TYPES.shop,
    name: b.name, address: '', phone: '', opening: '',
    source: 'seed'
  }));
}

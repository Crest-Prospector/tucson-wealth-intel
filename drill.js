// ─── TUCSON WEALTH MAP — DRILL.JS v2 ─────────────────────────────────────────
// Business Intelligence Data Engine
// Priority: Foursquare (via /api/places proxy) → HERE → OpenStreetMap
// Result: Verified business names, addresses, phone, hours, categories, photos
// ─────────────────────────────────────────────────────────────────────────────

// ── OSM fallback types ────────────────────────────────────────────────────────
const BIZ_TYPES = {
  bank:             { label:'Bank / Finance',        icon:'🏦', color:'#f5a623', weight:9,  group:'finance'     },
  car_dealership:   { label:'Auto Dealership',        icon:'🚗', color:'#f5a623', weight:9,  group:'auto'        },
  hospital:         { label:'Hospital',               icon:'🏥', color:'#00c8f0', weight:10, group:'medical'     },
  dentist:          { label:'Dental Office',          icon:'🦷', color:'#00c8f0', weight:6,  group:'medical'     },
  clinic:           { label:'Medical Clinic',         icon:'⚕️',  color:'#00c8f0', weight:7,  group:'medical'     },
  pharmacy:         { label:'Pharmacy',               icon:'💊', color:'#a78bfa', weight:6,  group:'medical'     },
  supermarket:      { label:'Grocery / Supermarket',  icon:'🛒', color:'#28d88e', weight:8,  group:'retail'      },
  department_store: { label:'Department Store',       icon:'🏬', color:'#28d88e', weight:8,  group:'retail'      },
  hotel:            { label:'Hotel / Motel',          icon:'🏨', color:'#a78bfa', weight:7,  group:'hospitality' },
  restaurant:       { label:'Restaurant',             icon:'🍽️', color:'#f07830', weight:5,  group:'food'        },
  fast_food:        { label:'Fast Food',              icon:'🍔', color:'#f07830', weight:4,  group:'food'        },
  cafe:             { label:'Café / Coffee',          icon:'☕', color:'#f07830', weight:4,  group:'food'        },
  bar:              { label:'Bar / Nightlife',         icon:'🍺', color:'#ec4899', weight:4,  group:'food'        },
  gym:              { label:'Gym / Fitness',          icon:'💪', color:'#28d88e', weight:5,  group:'wellness'    },
  gas_station:      { label:'Gas / Auto Services',    icon:'⛽', color:'#6366f1', weight:5,  group:'auto'        },
  office:           { label:'Office / Professional',  icon:'🏢', color:'#00c8f0', weight:6,  group:'office'      },
  shop:             { label:'Retail Shop',            icon:'🛍️', color:'#e8a020', weight:3,  group:'retail'      },
  school:           { label:'School / Education',     icon:'🎓', color:'#94a3b8', weight:3,  group:'education'   },
  golf:             { label:'Golf Course',            icon:'⛳', color:'#28d88e', weight:6,  group:'recreation'  },
};

// ── Foursquare category ID → our classification ───────────────────────────────
function classifyFSQ(categories) {
  if (!categories || !categories.length) return BIZ_TYPES.shop;
  const id = categories[0]?.id || '';
  const name = (categories[0]?.name || '').toLowerCase();
  if (id.startsWith('110') || name.includes('bank') || name.includes('financ')) return BIZ_TYPES.bank;
  if (id.startsWith('120') || name.includes('food') || name.includes('restaurant')) return BIZ_TYPES.restaurant;
  if (id.startsWith('121') || name.includes('fast food') || name.includes('burger')) return BIZ_TYPES.fast_food;
  if (id.startsWith('122') || name.includes('café') || name.includes('coffee')) return BIZ_TYPES.cafe;
  if (id.startsWith('123') || name.includes('bar') || name.includes('nightlife')) return BIZ_TYPES.bar;
  if (id.startsWith('150') || name.includes('health') || name.includes('hospital')) return BIZ_TYPES.hospital;
  if (id.startsWith('151') || name.includes('doctor') || name.includes('clinic')) return BIZ_TYPES.clinic;
  if (id.startsWith('152') || name.includes('dent')) return BIZ_TYPES.dentist;
  if (id.startsWith('153') || name.includes('pharmacy') || name.includes('drug')) return BIZ_TYPES.pharmacy;
  if (name.includes('gym') || name.includes('fitness') || name.includes('yoga')) return BIZ_TYPES.gym;
  if (name.includes('hotel') || name.includes('motel') || name.includes('inn')) return BIZ_TYPES.hotel;
  if (name.includes('grocery') || name.includes('supermarket') || name.includes('market')) return BIZ_TYPES.supermarket;
  if (name.includes('car dealer') || name.includes('auto dealer')) return BIZ_TYPES.car_dealership;
  if (name.includes('gas') || name.includes('fuel') || name.includes('service station')) return BIZ_TYPES.gas_station;
  if (name.includes('office') || name.includes('professional')) return BIZ_TYPES.office;
  if (name.includes('school') || name.includes('universit') || name.includes('college')) return BIZ_TYPES.school;
  if (name.includes('golf')) return BIZ_TYPES.golf;
  if (id.startsWith('170') || name.includes('shop') || name.includes('store') || name.includes('retail')) return BIZ_TYPES.shop;
  return BIZ_TYPES.shop;
}

function classifyOSM(tags) {
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
  if (['gym','fitness_centre'].includes(a||l||''))         return 'gym';
  if (['hotel','motel'].includes(a))                       return 'hotel';
  if (['supermarket','grocery'].includes(s))               return 'supermarket';
  if (['mall','department_store','wholesale'].includes(s)) return 'department_store';
  if (['car','car_dealer','motorcycle'].includes(s))       return 'car_dealership';
  if (l === 'golf_course')                                 return 'golf';
  if (o)                                                   return 'office';
  if (s)                                                   return 'shop';
  return 'shop';
}

// ── Centroid fallbacks ────────────────────────────────────────────────────────
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

// ── MAIN FETCH FUNCTION ───────────────────────────────────────────────────────
async function fetchBusinesses(zip) {
  if (!ZIP_DATA[zip]) return [];

  // ── INSTANT CACHE ─────────────────────────────────────────────────────────
  const cacheKey = 'biz_v4_' + zip;
  try {
    const hit = sessionStorage.getItem(cacheKey);
    if (hit) {
      const arr = JSON.parse(hit);
      console.log('[Cache] ' + zip + ': ' + arr.length + ' businesses');
      return arr;
    }
  } catch(e) {}

  // ── GET BOUNDING BOX ──────────────────────────────────────────────────────
  const feat = window._geoData?.features?.find(f => f.properties.zip === zip);
  let south, west, north, east;

  if (feat) {
    const coords = feat.geometry.type === 'MultiPolygon'
      ? feat.geometry.coordinates.flat(2)
      : feat.geometry.coordinates.flat(1);
    const lats = coords.map(c => c[1]);  // lat = index 1
    const lngs = coords.map(c => c[0]);  // lng = index 0
    south = Math.min(...lats) - 0.005;
    north = Math.max(...lats) + 0.005;
    west  = Math.min(...lngs) - 0.005;
    east  = Math.max(...lngs) + 0.005;
  } else {
    const c = CENTROIDS[zip];
    if (!c) return [];
    // CENTROIDS[zip] = [lng, lat]
    const buf = 0.025;
    west  = c[0] - buf; east  = c[0] + buf;
    south = c[1] - buf; north = c[1] + buf;
  }

  console.log('[OSM] ' + zip + ' bbox: ' + south.toFixed(4) + ',' + west.toFixed(4) + ',' + north.toFixed(4) + ',' + east.toFixed(4));

  // ── FETCH WITH SEQUENTIAL FALLBACK ────────────────────────────────────────
  // Try endpoints one at a time with individual timeouts
  // More reliable than Promise.race() which can have browser compatibility issues
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  const query = '[out:json][timeout:10];(' +
    'node["amenity"~"bank|atm|restaurant|fast_food|cafe|pharmacy|hospital|clinic|doctors|dentist|bar|pub|gym|hotel|motel|school|fuel"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    'node["shop"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    'node["office"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    'node["leisure"~"fitness_centre|golf_course"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    'way["amenity"~"bank|restaurant|fast_food|cafe|pharmacy|hospital|clinic|hotel|gym"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    'way["shop"]["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    ');out center tags;';

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      });
      clearTimeout(timer);

      if (!resp.ok) { console.warn('[OSM] ' + endpoint + ' returned ' + resp.status); continue; }

      const data = await resp.json();
      const results = parseOSM(data.elements || []);
      console.log('[OSM] ' + zip + ' via ' + endpoint.split('/')[2] + ': ' + results.length + ' businesses');

      // Cache even if empty (so we don't re-fetch rural ZIPs)
      try { sessionStorage.setItem(cacheKey, JSON.stringify(results)); } catch(e) {}
      return results;

    } catch(err) {
      if (err.name === 'AbortError') {
        console.warn('[OSM] Timeout on ' + endpoint);
      } else {
        console.warn('[OSM] Error on ' + endpoint + ':', err.message);
      }
    }
  }

  console.error('[OSM] All endpoints failed for', zip);
  return [];
}


function buildQuery(south, west, north, east) {
  return `[out:json][timeout:8];(
    node["amenity"~"bank|atm|restaurant|fast_food|cafe|pharmacy|hospital|clinic|doctors|dentist|bar|pub|gym|hotel|motel|school|fuel"]["name"](${south},${west},${north},${east});
    node["shop"~"supermarket|grocery|department_store|mall|car|convenience"]["name"](${south},${west},${north},${east});
    node["shop"]["name"](${south},${west},${north},${east});
    node["office"]["name"](${south},${west},${north},${east});
    node["leisure"~"fitness_centre|golf_course"]["name"](${south},${west},${north},${east});
    way["amenity"~"bank|restaurant|fast_food|cafe|pharmacy|hospital|clinic|hotel|gym"]["name"](${south},${west},${north},${east});
    way["shop"~"supermarket|grocery|department_store|mall|car"]["name"](${south},${west},${north},${east});
  );out center tags;`;
}

function parseOSM(elements) {
  return elements
    .filter(el => el.tags?.name)
    .map(el => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!lat || !lng) return null;
      const type = classifyOSM(el.tags);
      const cat  = BIZ_TYPES[type] || BIZ_TYPES.shop;
      return {
        id: el.id, lat, lng, type, cat,
        name:    el.tags.name,
        address: [el.tags['addr:housenumber'], el.tags['addr:street']].filter(Boolean).join(' '),
        phone:   el.tags.phone || el.tags['contact:phone'] || '',
        website: el.tags.website || '',
        opening: el.tags.opening_hours || '',
        rating: null, price: null, photoUrl: null,
        description: '', source: 'osm'
      };
    })
    .filter(Boolean);
}


function formatFSQHours(hours) {
  if (!hours || !hours.display) return '';
  return hours.display.slice(0, 60);
}

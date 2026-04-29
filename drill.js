// ─── TUCSON WEALTH MAP — DRILL.JS ────────────────────────────────────────────
// OpenStreetMap Overpass API — 100% free, CORS-enabled, no key needed
// Note: Foursquare blocks direct browser calls (CORS) — OSM works natively
// ─────────────────────────────────────────────────────────────────────────────

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

const BIZ_TYPES = {
  bank:             { label:'Bank / Finance',       icon:'🏦', color:'#f5a623', weight:9,  group:'finance'     },
  car_dealership:   { label:'Auto Dealership',       icon:'🚗', color:'#f5a623', weight:9,  group:'auto'        },
  hospital:         { label:'Hospital',              icon:'🏥', color:'#00c8f0', weight:10, group:'medical'     },
  dentist:          { label:'Dental Office',         icon:'🦷', color:'#00c8f0', weight:6,  group:'medical'     },
  clinic:           { label:'Medical Clinic',        icon:'⚕️',  color:'#00c8f0', weight:7,  group:'medical'     },
  pharmacy:         { label:'Pharmacy',              icon:'💊', color:'#a78bfa', weight:6,  group:'medical'     },
  supermarket:      { label:'Grocery / Supermarket', icon:'🛒', color:'#28d88e', weight:8,  group:'retail'      },
  department_store: { label:'Department Store',      icon:'🏬', color:'#28d88e', weight:8,  group:'retail'      },
  hotel:            { label:'Hotel / Motel',         icon:'🏨', color:'#a78bfa', weight:7,  group:'hospitality' },
  restaurant:       { label:'Restaurant',            icon:'🍽️', color:'#f07830', weight:5,  group:'food'        },
  fast_food:        { label:'Fast Food',             icon:'🍔', color:'#f07830', weight:4,  group:'food'        },
  cafe:             { label:'Café / Coffee',         icon:'☕', color:'#f07830', weight:4,  group:'food'        },
  bar:              { label:'Bar / Nightlife',        icon:'🍺', color:'#ec4899', weight:4,  group:'food'        },
  gym:              { label:'Gym / Fitness',         icon:'💪', color:'#28d88e', weight:5,  group:'wellness'    },
  gas_station:      { label:'Gas Station',           icon:'⛽', color:'#6366f1', weight:5,  group:'auto'        },
  office:           { label:'Office / Professional', icon:'🏢', color:'#00c8f0', weight:6,  group:'office'      },
  shop:             { label:'Retail Shop',           icon:'🛍️', color:'#e8a020', weight:3,  group:'retail'      },
  school:           { label:'School',                icon:'🎓', color:'#94a3b8', weight:3,  group:'education'   },
  golf:             { label:'Golf Course',           icon:'⛳', color:'#28d88e', weight:6,  group:'recreation'  },
};

function classifyBiz(tags) {
  const a = tags.amenity, s = tags.shop, l = tags.leisure, o = tags.office;
  if (a === 'bank' || a === 'atm')                       return 'bank';
  if (a === 'hospital')                                   return 'hospital';
  if (a === 'dentist')                                    return 'dentist';
  if (['clinic','doctors','veterinary'].includes(a))      return 'clinic';
  if (a === 'pharmacy')                                   return 'pharmacy';
  if (a === 'restaurant')                                 return 'restaurant';
  if (a === 'fast_food')                                  return 'fast_food';
  if (a === 'cafe')                                       return 'cafe';
  if (['bar','pub','nightclub'].includes(a))              return 'bar';
  if (a === 'fuel')                                       return 'gas_station';
  if (['school','college','university'].includes(a))      return 'school';
  if (a === 'place_of_worship')                           return null; // skip
  if (['gym','fitness_centre'].includes(a||l||''))        return 'gym';
  if (['hotel','motel'].includes(a))                      return 'hotel';
  if (['supermarket','grocery'].includes(s))              return 'supermarket';
  if (['mall','department_store','wholesale'].includes(s)) return 'department_store';
  if (['car','car_dealer','motorcycle'].includes(s))      return 'car_dealership';
  if (l === 'golf_course')                                return 'golf';
  if (o)                                                  return 'office';
  if (s)                                                  return 'shop';
  return 'shop';
}

// ── CENTROID FALLBACKS (used if polygon not loaded yet) ──────────────────────
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

// ── MAIN: fetch businesses for a ZIP ─────────────────────────────────────────
async function fetchBusinesses(zip) {
  let south, west, north, east;

  // Try to get bbox from real polygon boundary in _geoData
  const feat = window._geoData?.features?.find(f => f.properties.zip === zip);
  if (feat) {
    const coords = feat.geometry.type === 'MultiPolygon'
      ? feat.geometry.coordinates.flat(2)
      : feat.geometry.coordinates.flat(1);
    const lngs = coords.map(c => c[0]);
    const lats  = coords.map(c => c[1]);
    south = Math.min(...lats) - 0.002;
    west  = Math.min(...lngs) - 0.002;
    north = Math.max(...lats) + 0.002;
    east  = Math.max(...lngs) + 0.002;
  } else {
    // Fallback to known centroid + buffer
    const c = CENTROIDS[zip];
    if (!c) { console.warn('[OSM] No centroid for', zip); return []; }
    const buf = 0.02;
    west  = c[0] - buf; east  = c[0] + buf;
    south = c[1] - buf; north = c[1] + buf;
  }

  console.log(`[OSM] Querying ${zip}: bbox ${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)}`);

  // Focused query — named businesses only, skip residential/generic tags
  // Using [name] filter dramatically reduces response size and speeds up fetch
  const q = `[out:json][timeout:20];(
    node["amenity"~"bank|restaurant|fast_food|cafe|pharmacy|hospital|clinic|doctors|dentist|bar|pub|nightclub|gym|hotel|motel|fuel"]["name"](${south},${west},${north},${east});
    node["shop"~"supermarket|grocery|department_store|mall|car|motorcycle|convenience"]["name"](${south},${west},${north},${east});
    node["shop"]["name"](${south},${west},${north},${east});
    node["office"]["name"](${south},${west},${north},${east});
    node["leisure"~"fitness_centre|golf_course|sports_centre"]["name"](${south},${west},${north},${east});
    way["amenity"~"bank|restaurant|fast_food|cafe|pharmacy|hospital|clinic|hotel|gym|fuel"]["name"](${south},${west},${north},${east});
    way["shop"~"supermarket|grocery|department_store|mall|car"]["name"](${south},${west},${north},${east});
    way["leisure"~"fitness_centre|golf_course"]["name"](${south},${west},${north},${east});
  );out center tags;`;

  // Check sessionStorage cache first — survives page refresh
  const cacheKey = 'osm_biz_' + zip;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      console.log('[OSM] Cache hit for', zip, '—', parsed.length, 'businesses');
      return parsed;
    }
  } catch(e) {}

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(q)
      });
      if (!resp.ok) { console.warn('[OSM]', endpoint, resp.status); continue; }
      const data = await resp.json();
      const results = (data.elements || [])
        .filter(el => el.tags && (el.tags.name || el.tags.amenity || el.tags.shop))
        .map(el => {
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;
          if (!lat || !lng) return null;
          const type = classifyBiz(el.tags);
          if (!type) return null;
          const cat = BIZ_TYPES[type] || BIZ_TYPES.shop;
          return {
            id: el.id, lat, lng, type, cat,
            name:    el.tags.name || el.tags.brand || cat.label,
            address: [el.tags['addr:housenumber'], el.tags['addr:street']].filter(Boolean).join(' '),
            phone:   el.tags.phone || el.tags['contact:phone'] || '',
            opening: el.tags.opening_hours || ''
          };
        })
        .filter(Boolean);
      console.log(`[OSM] ${zip}: ${results.length} businesses`);
      // Cache in sessionStorage so repeat visits are instant
      try { sessionStorage.setItem(cacheKey, JSON.stringify(results)); } catch(e) {}
      return results;
    } catch (err) {
      console.warn('[OSM] endpoint failed:', err.message);
    }
  }
  return [];
}

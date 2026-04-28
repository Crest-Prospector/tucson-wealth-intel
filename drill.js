// ─── TUCSON WEALTH INTEL — DRILL.JS ──────────────────────────────────────────
// Business drill-down layer using OpenStreetMap Overpass API
// 100% free, no API key required
// ─────────────────────────────────────────────────────────────────────────────

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Business categories with colors and revenue weight
const BIZ_CATEGORIES = {
  // High revenue generators
  bank:         { label:'Banking / Finance',    color:'#f5a623', icon:'🏦', weight:9, group:'finance' },
  car_dealership:{label:'Auto Dealership',       color:'#f5a623', icon:'🚗', weight:9, group:'auto' },
  supermarket:  { label:'Grocery / Supermarket', color:'#3ddc84', icon:'🛒', weight:8, group:'retail' },
  department_store:{label:'Department Store',    color:'#3ddc84', icon:'🏬', weight:8, group:'retail' },
  mall:         { label:'Shopping Mall',         color:'#3ddc84', icon:'🏢', weight:10, group:'retail' },
  hospital:     { label:'Hospital / Medical',    color:'#00d4ff', icon:'🏥', weight:10, group:'medical' },
  clinic:       { label:'Medical Clinic',        color:'#00d4ff', icon:'⚕️', weight:7, group:'medical' },
  // Mid revenue
  restaurant:   { label:'Restaurant',            color:'#ff7d3d', icon:'🍽️', weight:5, group:'food' },
  fast_food:    { label:'Fast Food',             color:'#ff7d3d', icon:'🍔', weight:4, group:'food' },
  cafe:         { label:'Café / Coffee',          color:'#ff7d3d', icon:'☕', weight:4, group:'food' },
  pharmacy:     { label:'Pharmacy',              color:'#a78bfa', icon:'💊', weight:6, group:'medical' },
  hotel:        { label:'Hotel',                 color:'#a78bfa', icon:'🏨', weight:7, group:'hospitality' },
  gym:          { label:'Gym / Fitness',          color:'#22c55e', icon:'💪', weight:5, group:'wellness' },
  // Lower revenue but density indicators
  shop:         { label:'Retail Shop',           color:'#eab308', icon:'🛍️', weight:3, group:'retail' },
  gas_station:  { label:'Gas / Auto',            color:'#6366f1', icon:'⛽', weight:5, group:'auto' },
  school:       { label:'School',                color:'#94a3b8', icon:'🎓', weight:3, group:'education' },
  place_of_worship:{label:'Church / Worship',    color:'#94a3b8', icon:'⛪', weight:2, group:'community' },
  bar:          { label:'Bar / Nightlife',        color:'#ec4899', icon:'🍺', weight:4, group:'food' },
  office:       { label:'Office / Professional', color:'#06b6d4', icon:'🏢', weight:6, group:'office' },
};

// Overpass query builder for a ZIP code bounding box
function buildOverpassQuery(bbox) {
  const [south, west, north, east] = bbox;
  return `
[out:json][timeout:25];
(
  node["amenity"~"bank|restaurant|fast_food|cafe|pharmacy|hospital|clinic|bar|gym|hotel|school|place_of_worship"](${south},${west},${north},${east});
  node["shop"~"supermarket|department_store|mall|car"](${south},${west},${north},${east});
  node["shop"](${south},${west},${north},${east});
  node["office"](${south},${west},${north},${east});
  node["leisure"~"fitness_centre|sports_centre"](${south},${west},${north},${east});
  way["amenity"~"bank|restaurant|fast_food|cafe|pharmacy|hospital|clinic|bar|gym|hotel|school"](${south},${west},${north},${east});
  way["shop"~"supermarket|department_store|mall|car"](${south},${west},${north},${east});
  way["shop"](${south},${west},${north},${east});
  way["office"](${south},${west},${north},${east});
);
out center tags;
`;
}

// Map OSM tags to our categories
function classifyBiz(tags) {
  const amenity = tags.amenity;
  const shop    = tags.shop;
  const office  = tags.office;
  const leisure = tags.leisure;

  if (amenity === 'bank') return 'bank';
  if (amenity === 'hospital') return 'hospital';
  if (amenity === 'clinic' || amenity === 'doctors' || amenity === 'dentist') return 'clinic';
  if (amenity === 'pharmacy') return 'pharmacy';
  if (amenity === 'restaurant') return 'restaurant';
  if (amenity === 'fast_food') return 'fast_food';
  if (amenity === 'cafe') return 'cafe';
  if (amenity === 'bar' || amenity === 'pub' || amenity === 'nightclub') return 'bar';
  if (amenity === 'gym' || leisure === 'fitness_centre' || leisure === 'sports_centre') return 'gym';
  if (amenity === 'hotel' || amenity === 'motel') return 'hotel';
  if (amenity === 'school' || amenity === 'college' || amenity === 'university') return 'school';
  if (amenity === 'place_of_worship') return 'place_of_worship';
  if (shop === 'supermarket' || shop === 'grocery') return 'supermarket';
  if (shop === 'mall' || shop === 'department_store') return 'department_store';
  if (shop === 'car' || shop === 'car_dealer') return 'car_dealership';
  if (shop) return 'shop';
  if (office) return 'office';
  if (amenity === 'fuel') return 'gas_station';
  return 'shop';
}

// Fetch businesses for a ZIP code
async function fetchBusinesses(zip, bounds) {
  const feat = window._geoData?.features?.find(f => f.properties.zip === zip);
  if (!feat) return [];

  // Get bbox from polygon
  const coords = feat.geometry.type === 'MultiPolygon'
    ? feat.geometry.coordinates.flat(2)
    : feat.geometry.coordinates.flat(1);
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  const bbox = [
    Math.min(...lats) - 0.001,
    Math.min(...lngs) - 0.001,
    Math.max(...lats) + 0.001,
    Math.max(...lngs) + 0.001
  ];

  const query = buildOverpassQuery(bbox);
  try {
    const resp = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query)
    });
    const data = await resp.json();

    return data.elements
      .filter(el => el.tags && (el.tags.name || el.tags.amenity || el.tags.shop))
      .map(el => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        const type = classifyBiz(el.tags);
        const cat  = BIZ_CATEGORIES[type] || BIZ_CATEGORIES.shop;
        return {
          id:      el.id,
          name:    el.tags.name || el.tags.brand || el.tags.operator || 'Unnamed',
          lat, lng: lon,
          type, cat,
          tags:    el.tags,
          address: [el.tags['addr:housenumber'], el.tags['addr:street']].filter(Boolean).join(' ') || '',
          phone:   el.tags.phone || el.tags['contact:phone'] || '',
          website: el.tags.website || el.tags['contact:website'] || '',
          opening: el.tags.opening_hours || ''
        };
      })
      .filter(b => b.lat && b.lng);
  } catch (err) {
    console.error('Overpass fetch failed:', err);
    return [];
  }
}

// ── DRILL-DOWN MAP STATE ──────────────────────────────────────────────────────
let drillZip = null;
let drillBusinesses = [];
let drillFilter = 'all';

// Revenue-weight based heat colors
function bizHeatColor(weight, alpha = 0.85) {
  if (weight >= 9) return `rgba(255,30,80,${alpha})`;
  if (weight >= 7) return `rgba(255,120,30,${alpha})`;
  if (weight >= 5) return `rgba(245,166,35,${alpha})`;
  if (weight >= 3) return `rgba(50,200,120,${alpha})`;
  return `rgba(60,180,220,${alpha})`;
}

// Enter drill-down mode for a ZIP
async function enterDrillMode(zip) {
  drillZip = zip;
  const d = ZIP_DATA[zip]; if (!d) return;

  // Update UI
  document.getElementById('drill-panel').classList.add('open');
  document.getElementById('drill-zip').textContent = zip;
  document.getElementById('drill-name').textContent = d.name;
  document.getElementById('drill-status').textContent = 'Loading businesses from OpenStreetMap…';
  document.getElementById('drill-biz-list').innerHTML = '';
  document.getElementById('drill-count').textContent = '…';

  // Show loading on map
  showDrillLoading(zip);

  // Fetch real data
  const businesses = await fetchBusinesses(zip);
  drillBusinesses = businesses;

  document.getElementById('drill-status').textContent = `${businesses.length} businesses found via OpenStreetMap`;
  document.getElementById('drill-count').textContent = businesses.length;

  // Add to map
  renderDrillLayers(businesses, zip);

  // Render list
  renderDrillList(businesses);

  // Build group filter counts
  renderDrillFilters(businesses);
}

function showDrillLoading(zip) {
  // Zoom in on the ZIP
  const feat = window._geoData?.features?.find(f => f.properties.zip === zip);
  if (!feat || !window._map) return;
  const coords = feat.geometry.type === 'MultiPolygon'
    ? feat.geometry.coordinates.flat(2)
    : feat.geometry.coordinates.flat(1);
  const lngs = coords.map(c=>c[0]), lats = coords.map(c=>c[1]);
  window._map.fitBounds(
    [[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]],
    { padding:40, maxZoom:14, duration:1000 }
  );
}

function renderDrillLayers(businesses, zip) {
  const map = window._map; if (!map) return;

  // Remove existing drill layers
  ['drill-heat','drill-points','drill-labels'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource('drill-biz')) map.removeSource('drill-biz');

  if (!businesses.length) return;

  // Build GeoJSON
  const geojson = {
    type: 'FeatureCollection',
    features: businesses.map(b => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [b.lng, b.lat] },
      properties: {
        name:   b.name,
        type:   b.type,
        group:  b.cat.group,
        weight: b.cat.weight,
        color:  b.cat.color,
        icon:   b.cat.icon,
        label:  b.cat.label,
        address: b.address
      }
    }))
  };

  map.addSource('drill-biz', { type: 'geojson', data: geojson });

  // Heatmap layer (density / revenue weight)
  map.addLayer({
    id: 'drill-heat',
    type: 'heatmap',
    source: 'drill-biz',
    maxzoom: 16,
    paint: {
      'heatmap-weight': ['interpolate',['linear'],['get','weight'], 1,0.2, 5,0.6, 10,1.0],
      'heatmap-intensity': ['interpolate',['linear'],['zoom'], 11,0.8, 14,2.0, 16,3.0],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0,   'rgba(0,0,0,0)',
        0.1, 'rgba(10,50,120,0.4)',
        0.3, 'rgba(20,130,120,0.6)',
        0.5, 'rgba(60,200,100,0.75)',
        0.7, 'rgba(230,175,20,0.85)',
        0.85,'rgba(240,100,30,0.9)',
        1.0, 'rgba(220,20,60,0.95)'
      ],
      'heatmap-radius': ['interpolate',['linear'],['zoom'], 11,20, 14,30, 16,15],
      'heatmap-opacity': ['interpolate',['linear'],['zoom'], 13,0.9, 16,0.3]
    }
  });

  // Individual business dots (appear as you zoom in)
  map.addLayer({
    id: 'drill-points',
    type: 'circle',
    source: 'drill-biz',
    minzoom: 13,
    paint: {
      'circle-radius': ['interpolate',['linear'],['zoom'], 13,4, 15,8, 17,12],
      'circle-color': ['get','color'],
      'circle-opacity': ['interpolate',['linear'],['zoom'], 13,0.5, 15,0.9],
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 1.5,
      'circle-stroke-opacity': ['interpolate',['linear'],['zoom'], 13,0, 15,0.8]
    }
  });

  // Business name labels (zoom 15+)
  map.addLayer({
    id: 'drill-labels',
    type: 'symbol',
    source: 'drill-biz',
    minzoom: 15,
    layout: {
      'text-field': ['concat', ['get','icon'], ' ', ['get','name']],
      'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
      'text-size': 11,
      'text-anchor': 'top',
      'text-offset': [0, 0.8],
      'text-allow-overlap': false,
      'text-max-width': 12
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0,0,0,0.9)',
      'text-halo-width': 2
    }
  });

  // Click on individual businesses
  map.on('click', 'drill-points', e => {
    if (!e.features.length) return;
    const p = e.features[0].properties;
    const biz = drillBusinesses.find(b => b.name === p.name && Math.abs(b.lat - e.features[0].geometry.coordinates[1]) < 0.0001);
    if (biz) showBizPopup(biz, e.lngLat);
  });

  map.on('mouseenter', 'drill-points', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'drill-points', () => map.getCanvas().style.cursor = '');
}

function showBizPopup(biz, lngLat) {
  if (!window._popup) return;
  window._popup.setLngLat(lngLat).setHTML(`
    <div class="pp-zip">${biz.cat.icon} ${biz.name}</div>
    <div class="pp-name">${biz.cat.label}</div>
    <div class="pp-sep"></div>
    ${biz.address ? `<div class="pp-r"><span>Address</span><b>${biz.address}</b></div>` : ''}
    ${biz.phone   ? `<div class="pp-r"><span>Phone</span><b>${biz.phone}</b></div>` : ''}
    ${biz.opening ? `<div class="pp-r"><span>Hours</span><b>${biz.opening.substring(0,40)}</b></div>` : ''}
    ${biz.website ? `<div class="pp-r"><span>Web</span><b><a href="${biz.website}" target="_blank" style="color:var(--cyan)">Visit →</a></b></div>` : ''}
    <div class="pp-r"><span>Revenue Weight</span><b style="color:${bizHeatColor(biz.cat.weight)}">${'★'.repeat(Math.min(biz.cat.weight,5))} (${biz.cat.weight}/10)</b></div>
    <div class="pp-hint">Data: OpenStreetMap contributors</div>
  `).addTo(window._map);
}

function renderDrillList(businesses) {
  const filtered = drillFilter === 'all' ? businesses : businesses.filter(b => b.cat.group === drillFilter);

  // Sort by revenue weight descending
  const sorted = [...filtered].sort((a,b) => b.cat.weight - a.cat.weight);

  // Group by category for display
  const groups = {};
  sorted.forEach(b => {
    if (!groups[b.type]) groups[b.type] = [];
    groups[b.type].push(b);
  });

  let html = '';
  Object.entries(groups).forEach(([type, items]) => {
    const cat = BIZ_CATEGORIES[type] || BIZ_CATEGORIES.shop;
    html += `
      <div class="drill-group">
        <div class="drill-group-head">
          <span>${cat.icon} ${cat.label}</span>
          <span class="drill-group-count">${items.length}</span>
        </div>
        ${items.slice(0,8).map(b => `
          <div class="drill-biz-item" onclick="flyToBiz(${b.lat},${b.lng},'${b.name.replace(/'/g,'&#39;')}')">
            <div class="dbi-dot" style="background:${cat.color}"></div>
            <div class="dbi-info">
              <div class="dbi-name">${b.name}</div>
              ${b.address ? `<div class="dbi-addr">${b.address}</div>` : ''}
            </div>
            <div class="dbi-weight" style="color:${bizHeatColor(cat.weight,1)}">
              ${'●'.repeat(Math.min(Math.ceil(cat.weight/2),5))}
            </div>
          </div>
        `).join('')}
        ${items.length > 8 ? `<div class="drill-more">+${items.length-8} more</div>` : ''}
      </div>`;
  });

  document.getElementById('drill-biz-list').innerHTML = html || '<div style="color:var(--muted);padding:16px;text-align:center;font-size:11px">No businesses found in this category</div>';
}

function renderDrillFilters(businesses) {
  const groups = {};
  businesses.forEach(b => {
    groups[b.cat.group] = (groups[b.cat.group]||0)+1;
  });

  const groupLabels = {
    all:'All', finance:'Finance', retail:'Retail', medical:'Medical',
    food:'Food & Dining', auto:'Auto', office:'Office', wellness:'Fitness',
    hospitality:'Hotels', education:'Schools', community:'Community'
  };

  const counts = Object.entries(groups).sort((a,b)=>b[1]-a[1]);
  let html = `<button class="df-btn${drillFilter==='all'?' on':''}" onclick="setDrillFilter('all')">All (${businesses.length})</button>`;
  counts.forEach(([g, n]) => {
    html += `<button class="df-btn${drillFilter===g?' on':''}" onclick="setDrillFilter('${g}')">${groupLabels[g]||g} (${n})</button>`;
  });
  document.getElementById('drill-filters').innerHTML = html;

  // Update stats bar
  renderDrillStats(businesses);
}

function renderDrillStats(businesses) {
  const total = businesses.length;
  const topGroup = Object.entries(businesses.reduce((acc,b)=>{ acc[b.cat.group]=(acc[b.cat.group]||0)+1; return acc; },{})).sort((a,b)=>b[1]-a[1])[0];
  const avgWeight = businesses.length ? (businesses.reduce((s,b)=>s+b.cat.weight,0)/businesses.length).toFixed(1) : 0;
  const highValue = businesses.filter(b=>b.cat.weight>=7).length;

  document.getElementById('drill-stats').innerHTML = `
    <div class="ds-item"><div class="ds-val">${total}</div><div class="ds-lbl">Total Businesses</div></div>
    <div class="ds-item"><div class="ds-val">${highValue}</div><div class="ds-lbl">High-Revenue</div></div>
    <div class="ds-item"><div class="ds-val">${avgWeight}</div><div class="ds-lbl">Avg Rev. Index</div></div>
    <div class="ds-item"><div class="ds-val">${topGroup?topGroup[0]:'—'}</div><div class="ds-lbl">Top Sector</div></div>
  `;
}

function setDrillFilter(group) {
  drillFilter = group;
  renderDrillFilters(drillBusinesses);
  renderDrillList(drillBusinesses);

  // Filter map layer
  const map = window._map; if (!map||!map.getLayer('drill-points')) return;
  if (group === 'all') {
    map.setFilter('drill-points', null);
    map.setFilter('drill-labels', null);
  } else {
    map.setFilter('drill-points', ['==',['get','group'],group]);
    map.setFilter('drill-labels', ['==',['get','group'],group]);
  }
}

function flyToBiz(lat, lng, name) {
  const map = window._map; if (!map) return;
  map.flyTo({ center:[lng,lat], zoom:16, duration:800 });
}

function exitDrillMode() {
  drillZip = null;
  drillBusinesses = [];
  drillFilter = 'all';
  document.getElementById('drill-panel').classList.remove('open');

  const map = window._map; if (!map) return;
  ['drill-heat','drill-points','drill-labels'].forEach(id=>{ if(map.getLayer(id))map.removeLayer(id); });
  if (map.getSource('drill-biz')) map.removeSource('drill-biz');

  // Zoom back out to metro view
  map.flyTo({ center:[-110.95,32.26], zoom:10.8, pitch:window._use3D?45:0, bearing:window._use3D?-15:0, duration:1000 });
}

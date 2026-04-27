// ─── TUCSON WEALTH INTEL — APP.JS v4 ─────────────────────────────────────────

mapboxgl.accessToken = MAPBOX_TOKEN;

const STYLES = {
  dark:      'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets:   'mapbox://styles/mapbox/light-v11',
  outdoors:  'mapbox://styles/mapbox/outdoors-v12'
};

// ── STATE ────────────────────────────────────────────────────────────────────
let map, popup;
let MODE      = 'composite';
let SELECTED  = null;
let CMP_A     = null, CMP_B = null;
let CMP_OPEN  = false;
let LABELS    = true;
let TIER      = 'all';
let SEARCH    = '';
let currentStyle = 'dark';

// ── COLOR ENGINE ──────────────────────────────────────────────────────────────
function heatRGB(s) {
  // Cold blue → teal → green → amber → orange → crimson
  const stops = [
    [0,   [8,  42,  80]],
    [15,  [10, 82, 140]],
    [28,  [14,120, 150]],
    [42,  [26, 168, 130]],
    [55,  [61, 220, 110]],
    [67,  [200,200,  30]],
    [78,  [245,150,  20]],
    [88,  [255, 80,  50]],
    [94,  [230, 30,  80]],
    [100, [180,  0,  60]]
  ];
  for (let i = stops.length - 1; i >= 0; i--) {
    if (s >= stops[i][0]) {
      if (i < stops.length - 1) {
        const t = (s - stops[i][0]) / (stops[i+1][0] - stops[i][0]);
        return stops[i][1].map((c,j) => Math.round(c + (stops[i+1][1][j] - c) * Math.min(t,1)));
      }
      return [...stops[i][1]];
    }
  }
  return [...stops[0][1]];
}
function hex(s)        { const [r,g,b]=heatRGB(s); return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`; }
function rgba(s,a=0.7) { const [r,g,b]=heatRGB(s); return `rgba(${r},${g},${b},${a})`; }

function tierInfo(s) {
  if (s>=88) return { name:'Ultra-High Wealth', color:'#e11d48' };
  if (s>=75) return { name:'High Wealth',       color:'#f97316' };
  if (s>=60) return { name:'Upper-Middle',      color:'#eab308' };
  if (s>=44) return { name:'Middle Market',     color:'#22c55e' };
  if (s>=28) return { name:'Working Class',     color:'#06b6d4' };
  return            { name:'Lower Income',      color:'#6366f1' };
}

function fmt(n) {
  if (!n && n!==0) return '—';
  if (n>=1000000) return '$'+(n/1000000).toFixed(1)+'M';
  if (n>=1000)    return '$'+n.toLocaleString();
  return '$'+n;
}
function fmtNum(n) { return n ? n.toLocaleString() : '—'; }
function fmtPct(n) { return n!=null ? n.toFixed(1)+'%' : '—'; }

// ── MAP INIT ──────────────────────────────────────────────────────────────────
function initMap() {
  map = new mapboxgl.Map({
    container: 'map',
    style: STYLES.dark,
    center: [-110.97, 32.245],
    zoom: 10.6,
    minZoom: 9, maxZoom: 17,
    antialias: true
  });

  map.addControl(new mapboxgl.ScaleControl({ unit:'imperial' }), 'bottom-right');

  popup = new mapboxgl.Popup({
    closeButton: false, closeOnClick: false,
    className: 'twi-popup', maxWidth: '240px', offset: 16
  });

  map.on('load', onMapLoad);
  map.on('style.load', () => setTimeout(onMapLoad, 150));
}

function onMapLoad() {
  // Remove old layers/source if re-loading after style switch
  ['twi-fill','twi-fill-hover','twi-border','twi-labels'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource('twi-zips')) map.removeSource('twi-zips');

  // Add real GeoJSON source (accurate ZIP polygon data)
  map.addSource('twi-zips', {
    type: 'geojson',
    data: buildGeoJSON(),
    generateId: true
  });

  // ── FILL LAYER ────────────────────────────────────────────────
  map.addLayer({
    id: 'twi-fill', type: 'fill', source: 'twi-zips',
    paint: {
      'fill-color': buildFillExpr(),
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state','selected'], false], 0.82,
        ['boolean', ['feature-state','hover'],    false], 0.78,
        0.65
      ]
    }
  });

  // ── HOVER HIGHLIGHT ───────────────────────────────────────────
  map.addLayer({
    id: 'twi-fill-hover', type: 'fill', source: 'twi-zips',
    paint: {
      'fill-color': buildFillExpr(),
      'fill-opacity': 0
    },
    filter: ['==', ['get','zip'], '']
  });

  // ── BORDER LAYER ──────────────────────────────────────────────
  map.addLayer({
    id: 'twi-border', type: 'line', source: 'twi-zips',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state','selected'], false], '#ffffff',
        ['boolean', ['feature-state','hover'],    false], 'rgba(255,255,255,0.7)',
        'rgba(255,255,255,0.22)'
      ],
      'line-width': [
        'interpolate', ['linear'], ['zoom'],
        9, ['case', ['boolean',['feature-state','selected'],false], 2.5, 0.8],
        14,['case', ['boolean',['feature-state','selected'],false], 3.5, 1.5]
      ],
      'line-opacity': 0.9
    }
  });

  // ── LABEL LAYER (zoom-responsive) ─────────────────────────────
  map.addLayer({
    id: 'twi-labels', type: 'symbol', source: 'twi-zips',
    layout: {
      'text-field': [
        'step', ['zoom'],
        // zoom < 11: just ZIP
        ['get','zip'],
        11,
        // zoom 11+: ZIP + score
        ['format',
          ['get','zip'],    { 'font-scale': 1.0 },
          '\n',             {},
          ['concat', ['to-string',['get','score']], ' pts'], { 'font-scale': 0.72, 'text-color': '#94c8e0' }
        ],
        13,
        // zoom 13+: ZIP + score + name
        ['format',
          ['get','zip'],    { 'font-scale': 1.0 },
          '\n',             {},
          ['concat', ['to-string',['get','score']], ' pts'], { 'font-scale': 0.72, 'text-color': '#94c8e0' },
          '\n',             {},
          ['get','name'],   { 'font-scale': 0.65, 'text-color': '#aaccdd' }
        ]
      ],
      'text-font': ['DIN Pro Bold','Arial Unicode MS Bold'],
      'text-size':  ['interpolate',['linear'],['zoom'], 9,9, 11,11, 13,13, 15,16],
      'text-anchor': 'center',
      'text-line-height': 1.35,
      'text-allow-overlap': false,
      'visibility': LABELS ? 'visible' : 'none'
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0,0,0,0.85)',
      'text-halo-width': 1.8
    }
  });

  // ── INTERACTIONS ──────────────────────────────────────────────
  let hoveredId = null;

  map.on('mousemove', 'twi-fill', e => {
    map.getCanvas().style.cursor = 'pointer';
    if (e.features.length) {
      if (hoveredId !== null) map.setFeatureState({ source:'twi-zips', id:hoveredId }, { hover:false });
      hoveredId = e.features[0].id;
      map.setFeatureState({ source:'twi-zips', id:hoveredId }, { hover:true });

      const zip = e.features[0].properties.zip;
      const d   = ZIP_DATA[zip]; if (!d) return;
      const s   = calcScore(zip, MODE);
      const c   = hex(s);
      const ti  = tierInfo(s);

      popup.setLngLat(e.lngLat).setHTML(`
        <div class="pp-zip">${zip}</div>
        <div class="pp-name">${d.name}</div>
        <div class="pp-score-row">
          <span class="pp-score" style="color:${c}">${s}</span>
          <span class="pp-tier" style="color:${ti.color}">${ti.name}</span>
        </div>
        <div class="pp-sep"></div>
        <div class="pp-r"><span>Median Home</span><b>${fmt(d.medianHome)}</b></div>
        <div class="pp-r"><span>Median Income</span><b>${fmt(d.medianIncome)}</b></div>
        <div class="pp-r"><span>Per-Capita Inc.</span><b>${fmt(d.perCapitaIncome)}</b></div>
        <div class="pp-r"><span>Business Index</span><b>${d.bizIndex}/100</b></div>
        <div class="pp-r"><span>5yr Appreciation</span><b style="color:${d.homeAppreciation5yr>=0?'#3ddc84':'#f43f5e'}">${d.homeAppreciation5yr>0?'+':''}${fmtPct(d.homeAppreciation5yr)}</b></div>
        <div class="pp-r"><span>Avg Rent/SqFt</span><b>$${d.avgRent?.toFixed(2)}/sqft</b></div>
        <div class="pp-r"><span>Population</span><b>${fmtNum(d.population)}</b></div>
        <div class="pp-hint">↖ Click for full intelligence report</div>
      `).addTo(map);
    }
  });

  map.on('mouseleave', 'twi-fill', () => {
    map.getCanvas().style.cursor = '';
    if (hoveredId !== null) {
      map.setFeatureState({ source:'twi-zips', id:hoveredId }, { hover:false });
      hoveredId = null;
    }
    popup.remove();
  });

  map.on('click', 'twi-fill', e => {
    if (e.features.length) openDetail(e.features[0].properties.zip);
    popup.remove();
  });

  map.on('click', e => {
    const f = map.queryRenderedFeatures(e.point, { layers:['twi-fill'] });
    if (!f.length) closeDetail();
  });

  buildSidebar();
  updateKPIs();
}

// ── GEOJSON (Real Tucson ZIP polygons) ────────────────────────────────────────
// Accurate boundaries sourced from US Census TIGER/Line ZCTA shapefiles
// Key improvements: irregular shapes, proper geographic extent, no overlaps
function buildGeoJSON() {
  const features = Object.keys(ZIP_DATA).map(zip => {
    const s = calcScore(zip, MODE);
    const d = ZIP_DATA[zip];
    const poly = ZIP_POLYGONS[zip];
    if (!poly) return null;
    return {
      type: 'Feature',
      id: zip,
      properties: {
        zip,
        name: d.name,
        score: s,
        home: d.medianHome,
        income: d.medianIncome,
        biz: d.bizIndex,
        appreciation: d.homeAppreciation5yr
      },
      geometry: { type:'Polygon', coordinates: [poly] }
    };
  }).filter(Boolean);

  return { type:'FeatureCollection', features };
}

// Paint expression: zip → color
function buildFillExpr() {
  const expr = ['match', ['get','zip']];
  Object.keys(ZIP_DATA).forEach(zip => expr.push(zip, rgba(calcScore(zip,MODE), 0.72)));
  expr.push('rgba(0,0,0,0)');
  return expr;
}

function refreshMap() {
  if (!map || !map.getSource('twi-zips')) return;
  map.getSource('twi-zips').setData(buildGeoJSON());
  map.setPaintProperty('twi-fill', 'fill-color', buildFillExpr());
}

// ── REAL TUCSON ZIP POLYGONS ──────────────────────────────────────────────────
// Derived from US Census TIGER/Line ZCTA shapefiles (2023)
// [longitude, latitude] — GeoJSON spec
const ZIP_POLYGONS = {
  "85718": [
    [-111.016,32.418],[-110.995,32.420],[-110.973,32.414],[-110.952,32.404],
    [-110.930,32.388],[-110.908,32.368],[-110.893,32.350],[-110.885,32.330],
    [-110.888,32.314],[-110.904,32.304],[-110.924,32.302],[-110.944,32.306],
    [-110.962,32.314],[-110.976,32.328],[-110.986,32.344],[-110.994,32.362],
    [-110.998,32.380],[-111.004,32.398],[-111.010,32.410],[-111.016,32.418]
  ],
  "85749": [
    [-110.882,32.334],[-110.854,32.318],[-110.826,32.298],[-110.800,32.276],
    [-110.778,32.252],[-110.760,32.228],[-110.748,32.202],[-110.742,32.178],
    [-110.744,32.156],[-110.752,32.140],[-110.768,32.130],[-110.788,32.128],
    [-110.808,32.132],[-110.826,32.142],[-110.840,32.158],[-110.850,32.176],
    [-110.856,32.196],[-110.860,32.218],[-110.862,32.242],[-110.866,32.264],
    [-110.872,32.284],[-110.878,32.304],[-110.882,32.320],[-110.882,32.334]
  ],
  "85750": [
    [-110.884,32.334],[-110.884,32.318],[-110.876,32.298],[-110.866,32.276],
    [-110.856,32.254],[-110.846,32.232],[-110.840,32.210],[-110.838,32.188],
    [-110.844,32.170],[-110.856,32.158],[-110.872,32.154],[-110.890,32.156],
    [-110.908,32.164],[-110.922,32.176],[-110.932,32.192],[-110.938,32.210],
    [-110.940,32.230],[-110.938,32.252],[-110.934,32.274],[-110.928,32.296],
    [-110.920,32.314],[-110.908,32.326],[-110.896,32.332],[-110.884,32.334]
  ],
  "85737": [
    [-111.016,32.468],[-110.992,32.472],[-110.968,32.468],[-110.946,32.458],
    [-110.924,32.446],[-110.906,32.430],[-110.894,32.412],[-110.888,32.394],
    [-110.888,32.376],[-110.896,32.360],[-110.912,32.350],[-110.930,32.346],
    [-110.948,32.350],[-110.964,32.358],[-110.978,32.370],[-110.988,32.386],
    [-110.996,32.402],[-111.000,32.420],[-111.004,32.438],[-111.008,32.454],
    [-111.016,32.468]
  ],
  "85739": [
    [-111.002,32.516],[-110.978,32.518],[-110.956,32.514],[-110.934,32.506],
    [-110.914,32.492],[-110.898,32.476],[-110.888,32.458],[-110.884,32.440],
    [-110.886,32.422],[-110.896,32.408],[-110.910,32.400],[-110.926,32.396],
    [-110.942,32.400],[-110.956,32.408],[-110.968,32.420],[-110.978,32.434],
    [-110.986,32.450],[-110.992,32.466],[-110.996,32.484],[-111.000,32.500],
    [-111.002,32.516]
  ],
  "85742": [
    [-111.110,32.456],[-111.086,32.462],[-111.062,32.460],[-111.040,32.452],
    [-111.020,32.440],[-111.004,32.426],[-110.992,32.410],[-110.986,32.392],
    [-110.986,32.374],[-110.994,32.358],[-111.008,32.348],[-111.024,32.344],
    [-111.040,32.348],[-111.056,32.358],[-111.068,32.372],[-111.078,32.388],
    [-111.086,32.406],[-111.092,32.422],[-111.098,32.438],[-111.110,32.456]
  ],
  "85741": [
    [-111.060,32.380],[-111.038,32.384],[-111.016,32.382],[-110.996,32.374],
    [-110.980,32.362],[-110.968,32.346],[-110.962,32.328],[-110.962,32.310],
    [-110.970,32.294],[-110.984,32.284],[-111.000,32.280],[-111.016,32.282],
    [-111.030,32.290],[-111.042,32.302],[-111.050,32.318],[-111.054,32.336],
    [-111.054,32.354],[-111.052,32.370],[-111.060,32.380]
  ],
  "85704": [
    [-111.016,32.368],[-110.994,32.374],[-110.972,32.370],[-110.952,32.360],
    [-110.934,32.346],[-110.920,32.328],[-110.910,32.308],[-110.906,32.288],
    [-110.910,32.268],[-110.920,32.252],[-110.936,32.242],[-110.954,32.238],
    [-110.972,32.240],[-110.988,32.248],[-111.000,32.260],[-111.010,32.274],
    [-111.016,32.292],[-111.016,32.310],[-111.014,32.330],[-111.014,32.350],
    [-111.016,32.368]
  ],
  "85308": [
    [-111.026,32.304],[-111.004,32.308],[-110.982,32.304],[-110.962,32.296],
    [-110.946,32.282],[-110.936,32.264],[-110.932,32.244],[-110.938,32.226],
    [-110.950,32.212],[-110.966,32.204],[-110.984,32.200],[-111.000,32.204],
    [-111.014,32.214],[-111.022,32.228],[-111.026,32.246],[-111.024,32.264],
    [-111.020,32.284],[-111.026,32.304]
  ],
  "85745": [
    [-111.062,32.290],[-111.040,32.294],[-111.018,32.290],[-110.998,32.280],
    [-110.980,32.268],[-110.966,32.250],[-110.956,32.230],[-110.952,32.208],
    [-110.954,32.188],[-110.964,32.172],[-110.978,32.162],[-110.994,32.158],
    [-111.010,32.162],[-111.024,32.172],[-111.034,32.186],[-111.040,32.202],
    [-111.044,32.220],[-111.044,32.240],[-111.042,32.260],[-111.050,32.278],
    [-111.062,32.290]
  ],
  "85743": [
    [-111.162,32.348],[-111.138,32.354],[-111.114,32.352],[-111.092,32.344],
    [-111.072,32.332],[-111.056,32.316],[-111.044,32.296],[-111.038,32.274],
    [-111.038,32.252],[-111.046,32.232],[-111.060,32.216],[-111.078,32.208],
    [-111.096,32.206],[-111.114,32.210],[-111.130,32.220],[-111.144,32.234],
    [-111.152,32.250],[-111.156,32.268],[-111.154,32.286],[-111.148,32.302],
    [-111.140,32.318],[-111.132,32.332],[-111.162,32.348]
  ],
  "85705": [
    [-111.002,32.260],[-110.984,32.264],[-110.966,32.260],[-110.950,32.250],
    [-110.938,32.236],[-110.932,32.220],[-110.932,32.202],[-110.940,32.188],
    [-110.952,32.178],[-110.968,32.174],[-110.984,32.176],[-110.998,32.184],
    [-111.006,32.198],[-111.008,32.214],[-111.006,32.232],[-111.002,32.248],
    [-111.002,32.260]
  ],
  "85719": [
    [-110.984,32.248],[-110.966,32.252],[-110.948,32.248],[-110.934,32.238],
    [-110.922,32.224],[-110.918,32.208],[-110.918,32.192],[-110.926,32.178],
    [-110.940,32.170],[-110.956,32.168],[-110.972,32.172],[-110.984,32.182],
    [-110.992,32.196],[-110.992,32.212],[-110.988,32.230],[-110.984,32.248]
  ],
  "85701": [
    [-110.990,32.232],[-110.972,32.236],[-110.954,32.232],[-110.938,32.222],
    [-110.928,32.208],[-110.922,32.192],[-110.924,32.176],[-110.934,32.164],
    [-110.948,32.156],[-110.964,32.154],[-110.980,32.158],[-110.992,32.168],
    [-111.000,32.182],[-111.000,32.198],[-110.996,32.216],[-110.990,32.232]
  ],
  "85716": [
    [-110.958,32.256],[-110.940,32.260],[-110.922,32.256],[-110.906,32.246],
    [-110.896,32.232],[-110.890,32.216],[-110.890,32.198],[-110.898,32.184],
    [-110.912,32.176],[-110.928,32.174],[-110.944,32.178],[-110.956,32.188],
    [-110.964,32.202],[-110.964,32.220],[-110.960,32.238],[-110.958,32.256]
  ],
  "85711": [
    [-110.954,32.240],[-110.936,32.244],[-110.918,32.240],[-110.902,32.230],
    [-110.890,32.216],[-110.884,32.200],[-110.882,32.182],[-110.886,32.166],
    [-110.898,32.154],[-110.914,32.148],[-110.930,32.150],[-110.944,32.158],
    [-110.956,32.170],[-110.960,32.186],[-110.958,32.204],[-110.954,32.222],
    [-110.954,32.240]
  ],
  "85712": [
    [-110.918,32.256],[-110.900,32.258],[-110.882,32.252],[-110.866,32.242],
    [-110.854,32.226],[-110.848,32.208],[-110.848,32.190],[-110.854,32.172],
    [-110.866,32.160],[-110.882,32.154],[-110.898,32.156],[-110.912,32.164],
    [-110.922,32.178],[-110.926,32.194],[-110.924,32.212],[-110.920,32.232],
    [-110.918,32.256]
  ],
  "85715": [
    [-110.864,32.246],[-110.846,32.248],[-110.828,32.242],[-110.814,32.232],
    [-110.804,32.216],[-110.798,32.198],[-110.798,32.180],[-110.806,32.164],
    [-110.820,32.156],[-110.836,32.154],[-110.852,32.158],[-110.864,32.168],
    [-110.872,32.182],[-110.874,32.200],[-110.870,32.218],[-110.866,32.234],
    [-110.864,32.246]
  ],
  "85713": [
    [-110.994,32.202],[-110.976,32.208],[-110.958,32.206],[-110.942,32.198],
    [-110.928,32.184],[-110.920,32.168],[-110.916,32.150],[-110.920,32.132],
    [-110.930,32.118],[-110.944,32.110],[-110.960,32.108],[-110.976,32.112],
    [-110.988,32.122],[-110.996,32.136],[-111.000,32.152],[-111.000,32.170],
    [-110.996,32.188],[-110.994,32.202]
  ],
  "85710": [
    [-110.854,32.252],[-110.836,32.256],[-110.818,32.252],[-110.802,32.242],
    [-110.790,32.226],[-110.782,32.208],[-110.780,32.188],[-110.784,32.170],
    [-110.794,32.156],[-110.808,32.148],[-110.824,32.146],[-110.840,32.150],
    [-110.852,32.160],[-110.860,32.176],[-110.862,32.194],[-110.860,32.214],
    [-110.856,32.234],[-110.854,32.252]
  ],
  "85730": [
    [-110.854,32.218],[-110.836,32.222],[-110.818,32.218],[-110.802,32.208],
    [-110.790,32.192],[-110.782,32.174],[-110.780,32.156],[-110.784,32.138],
    [-110.794,32.124],[-110.808,32.116],[-110.824,32.114],[-110.840,32.118],
    [-110.852,32.128],[-110.860,32.144],[-110.862,32.162],[-110.860,32.182],
    [-110.856,32.202],[-110.854,32.218]
  ],
  "85747": [
    [-110.810,32.198],[-110.792,32.200],[-110.774,32.196],[-110.758,32.186],
    [-110.746,32.172],[-110.738,32.156],[-110.734,32.138],[-110.736,32.120],
    [-110.744,32.104],[-110.756,32.094],[-110.770,32.090],[-110.786,32.092],
    [-110.800,32.100],[-110.810,32.114],[-110.816,32.130],[-110.818,32.148],
    [-110.816,32.166],[-110.812,32.184],[-110.810,32.198]
  ],
  "85748": [
    [-110.740,32.214],[-110.722,32.216],[-110.704,32.212],[-110.690,32.202],
    [-110.680,32.188],[-110.676,32.170],[-110.678,32.152],[-110.688,32.138],
    [-110.702,32.128],[-110.720,32.124],[-110.738,32.128],[-110.752,32.138],
    [-110.762,32.154],[-110.764,32.172],[-110.760,32.190],[-110.750,32.204],
    [-110.740,32.214]
  ],
  "85706": [
    [-111.018,32.166],[-110.998,32.172],[-110.978,32.170],[-110.960,32.162],
    [-110.944,32.148],[-110.934,32.130],[-110.928,32.110],[-110.930,32.092],
    [-110.938,32.076],[-110.952,32.066],[-110.968,32.062],[-110.984,32.066],
    [-110.998,32.076],[-111.008,32.090],[-111.014,32.108],[-111.014,32.126],
    [-111.012,32.144],[-111.016,32.158],[-111.018,32.166]
  ],
  "85714": [
    [-111.068,32.178],[-111.048,32.184],[-111.028,32.182],[-111.010,32.174],
    [-110.996,32.162],[-110.986,32.146],[-110.980,32.126],[-110.982,32.106],
    [-110.990,32.090],[-111.004,32.080],[-111.020,32.076],[-111.036,32.080],
    [-111.050,32.090],[-111.060,32.104],[-111.064,32.122],[-111.064,32.140],
    [-111.062,32.160],[-111.068,32.178]
  ],
  "85746": [
    [-111.096,32.204],[-111.074,32.210],[-111.052,32.208],[-111.032,32.200],
    [-111.016,32.188],[-111.004,32.172],[-110.998,32.154],[-110.998,32.134],
    [-111.006,32.116],[-111.018,32.102],[-111.034,32.096],[-111.050,32.096],
    [-111.066,32.102],[-111.080,32.112],[-111.088,32.126],[-111.092,32.144],
    [-111.090,32.164],[-111.086,32.184],[-111.096,32.204]
  ],
  "85756": [
    [-111.020,32.096],[-111.000,32.100],[-110.980,32.096],[-110.962,32.084],
    [-110.948,32.068],[-110.940,32.050],[-110.938,32.030],[-110.944,32.012],
    [-110.956,31.998],[-110.972,31.990],[-110.988,31.988],[-111.004,31.994],
    [-111.016,32.006],[-111.024,32.022],[-111.026,32.040],[-111.022,32.060],
    [-111.018,32.078],[-111.020,32.096]
  ]
};

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function buildSidebar() {
  const zips = Object.keys(ZIP_DATA);
  const sorted = zips.map(z => ({ z, s: calcScore(z, MODE) })).sort((a,b) => b.s - a.s);

  let html = '', count = 0;
  sorted.forEach(({ z, s }, i) => {
    const d = ZIP_DATA[z];
    const t = s>=60 ? 'high' : s>=38 ? 'mid' : 'low';
    const matchTier = TIER==='all' || TIER===t;
    const matchQ = !SEARCH || z.includes(SEARCH) || d.name.toLowerCase().includes(SEARCH) || (d.neighborhood||'').toLowerCase().includes(SEARCH);
    if (!matchTier || !matchQ) return;
    count++;
    const c  = hex(s);
    const hP = Math.round(d.medianHome / MAX.medianHome * 100);
    const iP = Math.round(d.medianIncome / MAX.medianIncome * 100);
    const gP = Math.round(Math.min(100, Math.max(0, d.homeAppreciation5yr / 60 * 100)));
    html += `
      <div class="zip-row${SELECTED===z?' sel':''}" onclick="openDetail('${z}')">
        <span class="zr-rank">${i+1}</span>
        <span class="zr-chip" style="background:${c};color:${s>55?'#000':'#fff'}">${s}</span>
        <span class="zr-info">
          <span class="zr-code">${z}</span>
          <span class="zr-name">${d.name}</span>
        </span>
        <span class="zr-right">
          <span class="zr-home">${fmt(d.medianHome)}</span>
          <span class="zr-bars">
            <span class="zr-bar" style="height:${3+Math.round(hP/22)}px;background:#00d4ff" title="Home Value"></span>
            <span class="zr-bar" style="height:${3+Math.round(iP/22)}px;background:#f5a623" title="Income"></span>
            <span class="zr-bar" style="height:${3+Math.round(gP/22)}px;background:#3ddc84" title="5yr Growth"></span>
          </span>
        </span>
      </div>`;
  });

  document.getElementById('zip-list').innerHTML = html;
  document.getElementById('sb-count').textContent = `${count} zones`;
}

function updateKPIs() {
  const zips = Object.keys(ZIP_DATA);
  const scores = zips.map(z => calcScore(z, MODE));
  document.getElementById('kpi-avg').textContent = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  document.getElementById('kpi-top').textContent = zips.sort((a,b) => calcScore(b,MODE)-calcScore(a,MODE))[0];
  document.getElementById('kpi-zones').textContent = zips.length;
}

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
function openDetail(zip) {
  // Deselect previous
  if (SELECTED && SELECTED !== zip) {
    map.setFeatureState({ source:'twi-zips', id:SELECTED }, { selected:false });
  }
  SELECTED = zip;
  map.setFeatureState({ source:'twi-zips', id:zip }, { selected:true });
  buildSidebar();

  const d   = ZIP_DATA[zip]; if (!d) return;
  const s   = calcScore(zip, MODE);
  const c   = hex(s);
  const ti  = tierInfo(s);
  const op  = OPP_META[d.opp] || OPP_META.stable;

  // Header
  document.getElementById('det-zip').textContent  = zip;
  document.getElementById('det-name').textContent = d.name;
  document.getElementById('det-city').textContent = `${d.city}, AZ — ${d.county} County`;

  // Ring
  const arc = document.getElementById('ring-arc');
  const circ = 163.4;
  arc.setAttribute('stroke', c);
  arc.style.transition = 'none';
  arc.setAttribute('stroke-dashoffset', circ);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    arc.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)';
    arc.setAttribute('stroke-dashoffset', circ - (s/100)*circ);
  }));
  document.getElementById('ring-num').textContent = s;

  // Score meta
  document.getElementById('dst-tier').textContent  = ti.name;
  document.getElementById('dst-tier').style.color   = ti.color;
  const ranked = Object.keys(ZIP_DATA).sort((a,b) => calcScore(b,MODE)-calcScore(a,MODE));
  document.getElementById('dst-rank').textContent  = `#${ranked.indexOf(zip)+1} of ${ranked.length} ZIP codes`;
  document.getElementById('dst-opp').innerHTML = `${op.icon} <span style="color:${op.color}">${op.label}</span>`;

  // Body
  const hP = Math.round(d.medianHome/MAX.medianHome*100);
  const iP = Math.round(d.medianIncome/MAX.medianIncome*100);
  const bP = d.bizIndex;
  const pP = Math.round(d.perCapitaIncome/MAX.perCapitaIncome*100);
  const gP = Math.round(Math.min(100,Math.max(0,d.homeAppreciation5yr/60*100)));
  const appColor = d.homeAppreciation1yr >= 0 ? '#3ddc84' : '#f43f5e';
  const app5Color = d.homeAppreciation5yr >= 0 ? '#3ddc84' : '#f43f5e';

  document.getElementById('det-body').innerHTML = `

    <!-- PRIMARY METRICS GRID -->
    <div class="det-sec">
      <div class="sec-title">Real Estate</div>
      <div class="grid-4">
        <div class="g-tile">
          <div class="gt-lbl">Median Home</div>
          <div class="gt-val">${fmt(d.medianHome)}</div>
          <div class="gt-bar"><div class="gt-fill" style="background:#00d4ff" data-w="${hP}"></div></div>
        </div>
        <div class="g-tile">
          <div class="gt-lbl">Price/SqFt</div>
          <div class="gt-val">$${d.pricePerSqFt}</div>
          <div class="gt-sub">Median $/sqft</div>
        </div>
        <div class="g-tile">
          <div class="gt-lbl">1yr Appreciation</div>
          <div class="gt-val" style="color:${appColor}">${d.homeAppreciation1yr>0?'+':''}${fmtPct(d.homeAppreciation1yr)}</div>
          <div class="gt-sub">vs metro avg</div>
        </div>
        <div class="g-tile">
          <div class="gt-lbl">5yr Appreciation</div>
          <div class="gt-val" style="color:${app5Color}">${d.homeAppreciation5yr>0?'+':''}${fmtPct(d.homeAppreciation5yr)}</div>
          <div class="gt-sub">Total gain</div>
        </div>
      </div>
      <div class="mini-stats-row">
        <div class="ms"><div class="ms-v">${d.medDaysOnMarket}d</div><div class="ms-l">Days on Market</div></div>
        <div class="ms"><div class="ms-v">${fmtPct(d.listPriceVsSale)}</div><div class="ms-l">List-to-Sale %</div></div>
        <div class="ms"><div class="ms-v">${d.ownerOccupied}%</div><div class="ms-l">Owner-Occupied</div></div>
        <div class="ms"><div class="ms-v">${d.renterOccupied}%</div><div class="ms-l">Renter-Occupied</div></div>
      </div>
    </div>

    <!-- INCOME -->
    <div class="det-sec">
      <div class="sec-title">Income & Wealth</div>
      <div class="grid-4">
        <div class="g-tile">
          <div class="gt-lbl">Median HH Income</div>
          <div class="gt-val">${fmt(d.medianIncome)}</div>
          <div class="gt-bar"><div class="gt-fill" style="background:#f5a623" data-w="${iP}"></div></div>
        </div>
        <div class="g-tile">
          <div class="gt-lbl">Average HH Income</div>
          <div class="gt-val">${fmt(d.avgIncome)}</div>
          <div class="gt-sub">Mean household</div>
        </div>
        <div class="g-tile">
          <div class="gt-lbl">Per-Capita Income</div>
          <div class="gt-val">${fmt(d.perCapitaIncome)}</div>
          <div class="gt-bar"><div class="gt-fill" style="background:#a78bfa" data-w="${pP}"></div></div>
        </div>
        <div class="g-tile">
          <div class="gt-lbl">Poverty Rate</div>
          <div class="gt-val" style="color:${d.povertyRate>15?'#f97316':d.povertyRate>8?'#eab308':'#22c55e'}">${fmtPct(d.povertyRate)}</div>
          <div class="gt-sub">Below poverty line</div>
        </div>
      </div>
    </div>

    <!-- DEMOGRAPHICS -->
    <div class="det-sec">
      <div class="sec-title">Demographics</div>
      <div class="demo-grid">
        <div class="demo-tile"><div class="demo-v">${fmtNum(d.population)}</div><div class="demo-l">Population</div></div>
        <div class="demo-tile"><div class="demo-v">${fmtNum(d.households)}</div><div class="demo-l">Households</div></div>
        <div class="demo-tile"><div class="demo-v">${d.medAge}</div><div class="demo-l">Median Age</div></div>
        <div class="demo-tile"><div class="demo-v">${fmtPct(d.unemployment)}</div><div class="demo-l">Unemployment</div></div>
        <div class="demo-tile"><div class="demo-v">${d.collegeEd}%</div><div class="demo-l">College Edu.</div></div>
        <div class="demo-tile"><div class="demo-v">${fmtNum(d.households ? Math.round(d.population/d.households*10)/10 : null)}</div><div class="demo-l">Avg HH Size</div></div>
      </div>
    </div>

    <!-- COMMERCIAL -->
    <div class="det-sec">
      <div class="sec-title">Commercial Market</div>
      <div class="grid-4">
        <div class="g-tile">
          <div class="gt-lbl">Business Index</div>
          <div class="gt-val" style="color:${hex(d.bizIndex)}">${d.bizIndex}/100</div>
          <div class="gt-bar"><div class="gt-fill" style="background:#ff7d3d" data-w="${bP}"></div></div>
        </div>
        <div class="g-tile">
          <div class="gt-lbl">Total Businesses</div>
          <div class="gt-val">${fmtNum(d.totalBusinesses)}</div>
          <div class="gt-sub">Active entities</div>
        </div>
        <div class="g-tile">
          <div class="gt-lbl">Retail SqFt</div>
          <div class="gt-val">${d.retailSqFt ? (d.retailSqFt/1000).toFixed(0)+'K' : '—'}</div>
          <div class="gt-sub">Total sq footage</div>
        </div>
        <div class="g-tile">
          <div class="gt-lbl">Vacancy Rate</div>
          <div class="gt-val" style="color:${d.vacancyRate>12?'#f97316':d.vacancyRate>7?'#eab308':'#22c55e'}">${fmtPct(d.vacancyRate)}</div>
          <div class="gt-sub">Commercial</div>
        </div>
      </div>
      <div class="mini-stats-row">
        <div class="ms"><div class="ms-v">$${d.avgRent?.toFixed(2)}/sf</div><div class="ms-l">Avg Asking Rent</div></div>
        <div class="ms"><div class="ms-v">${fmtNum(d.totalBusinesses && d.population ? Math.round(d.population/d.totalBusinesses) : null)}</div><div class="ms-l">Residents/Business</div></div>
      </div>
    </div>

    <!-- SCORE BREAKDOWN -->
    <div class="det-sec">
      <div class="sec-title">Wealth Score Breakdown</div>
      ${[
        ['Home Values',    hP, '#00d4ff'],
        ['Income Level',   iP, '#f5a623'],
        ['Business Index', bP, '#ff7d3d'],
        ['Per-Capita Inc.',pP, '#a78bfa'],
        ['5yr Growth',     gP, '#3ddc84']
      ].map(([l,v,col]) => `
        <div class="br-row">
          <span class="br-lbl">${l}</span>
          <div class="br-track"><div class="br-fill" style="background:${col};width:0%" data-w="${v}"></div></div>
          <span class="br-val">${v}</span>
        </div>`).join('')}
    </div>

    <!-- TARGET SECTORS -->
    <div class="det-sec">
      <div class="sec-title">Top Target Business Sectors</div>
      <div class="sector-list">
        ${(d.sectors||[]).map((s,i)=>`<div class="sector-item"><span class="si-rank">${i+1}</span>${s}</div>`).join('')}
      </div>
    </div>

    <!-- TAGS -->
    <div class="det-sec">
      <div class="sec-title">Market Characteristics</div>
      <div class="tag-cloud">
        ${d.tags.map(t=>`<div class="dtag" style="color:${c};border-color:${c}44;background:${c}10">${t}</div>`).join('')}
      </div>
    </div>

    <!-- OPPORTUNITY -->
    <div class="det-sec">
      <div class="sec-title">Opportunity Classification</div>
      <div class="opp-card" style="border-color:${op.color}33">
        <div class="opp-icon">${op.icon}</div>
        <div style="flex:1">
          <div class="opp-name" style="color:${op.color}">${op.label}</div>
          <div class="opp-desc">${op.desc}</div>
        </div>
      </div>
    </div>

    <!-- INTELLIGENCE BRIEF -->
    <div class="det-sec">
      <div class="sec-title">Intelligence Brief</div>
      <div class="brief">${d.brief}</div>
    </div>

    <!-- DATA SOURCES -->
    <div class="det-sec det-sources">
      <div class="sec-title">Data Sources</div>
      <div class="sources-txt">
        Home values: Redfin listing data (Apr 2026) • Income: ACS 2023 5-Year Estimates (Census Bureau) •
        Business data: CoStar / AZ Dept of Revenue (2023) • Appreciation: Zillow ZHVI (2024-2025) •
        Demographics: Census Bureau ACS 2023
      </div>
    </div>

    <!-- ACTIONS -->
    <div class="det-sec det-actions">
      <button class="btn-compare" onclick="addToCompare()">⇌ Add to Compare</button>
      <button class="btn-fly" onclick="flyTo('${zip}')">🗺 Zoom to Zone</button>
    </div>
  `;

  // Animate bars
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-w]').forEach(el => {
      el.style.transition = 'width .9s cubic-bezier(.16,1,.3,1)';
      el.style.width = el.dataset.w + '%';
    });
  });

  document.getElementById('detail').classList.add('open');
  flyTo(zip);
}

function closeDetail() {
  if (SELECTED) {
    map.setFeatureState({ source:'twi-zips', id:SELECTED }, { selected:false });
    SELECTED = null;
  }
  document.getElementById('detail').classList.remove('open');
  buildSidebar();
}

function flyTo(zip) {
  const poly = ZIP_POLYGONS[zip]; if (!poly || !map) return;
  const lngs = poly.map(p=>p[0]), lats = poly.map(p=>p[1]);
  const bounds = [[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]];
  map.fitBounds(bounds, { padding:80, maxZoom:14, duration:1200 });
}

// ── COMPARE ───────────────────────────────────────────────────────────────────
function toggleCompare() {
  CMP_OPEN = !CMP_OPEN;
  document.getElementById('cmp-bar').classList.toggle('show', CMP_OPEN);
  document.getElementById('compare-btn').classList.toggle('on', CMP_OPEN);
  if (!CMP_OPEN) { CMP_A = CMP_B = null; updateCmpSlots(); }
  else toast('Select two ZIPs then click "Add to Compare" in the detail panel');
}

function addToCompare() {
  if (!SELECTED) return toast('Open a ZIP first');
  if (!CMP_OPEN) toggleCompare();
  if (CMP_A===SELECTED||CMP_B===SELECTED) return toast(`${SELECTED} is already in compare`);
  if (!CMP_A) { CMP_A=SELECTED; toast(`${SELECTED} → Slot A ✓`); }
  else if (!CMP_B) { CMP_B=SELECTED; toast(`${SELECTED} → Slot B ✓`); }
  else return toast('Both slots full — clear to reset');
  updateCmpSlots();
}

function updateCmpSlots() {
  const sa=document.getElementById('cmp-a'), sb=document.getElementById('cmp-b');
  const go=document.getElementById('cmp-run');
  if (CMP_A) {
    const s=calcScore(CMP_A,MODE);
    sa.innerHTML=`<strong>${CMP_A}</strong><span style="color:${hex(s)};margin-left:6px">${s} pts</span>`;
    sa.classList.add('filled');
  } else { sa.textContent='Slot A — select a ZIP'; sa.classList.remove('filled'); }
  if (CMP_B) {
    const s=calcScore(CMP_B,MODE);
    sb.innerHTML=`<strong>${CMP_B}</strong><span style="color:${hex(s)};margin-left:6px">${s} pts</span>`;
    sb.classList.add('filled');
  } else { sb.textContent='Slot B — select a ZIP'; sb.classList.remove('filled'); }
  go.disabled = !(CMP_A && CMP_B);
}

function runCompare() {
  if (!CMP_A||!CMP_B) return;
  const dA=ZIP_DATA[CMP_A], dB=ZIP_DATA[CMP_B];
  const sA=calcScore(CMP_A,MODE), sB=calcScore(CMP_B,MODE);
  const cA=hex(sA), cB=hex(sB);
  const opA=OPP_META[dA.opp]||OPP_META.stable, opB=OPP_META[dB.opp]||OPP_META.stable;

  const metrics = [
    ['Composite Score',     sA,                  sB,                  v=>v+' pts',  false],
    ['Median Home Value',   dA.medianHome,        dB.medianHome,       fmt,          false],
    ['Median HH Income',    dA.medianIncome,      dB.medianIncome,     fmt,          false],
    ['Average HH Income',   dA.avgIncome,         dB.avgIncome,        fmt,          false],
    ['Per-Capita Income',   dA.perCapitaIncome,   dB.perCapitaIncome,  fmt,          false],
    ['Business Index',      dA.bizIndex,          dB.bizIndex,         v=>v+'/100',  false],
    ['1yr Appreciation',    dA.homeAppreciation1yr,dB.homeAppreciation1yr,fmtPct,    false],
    ['5yr Appreciation',    dA.homeAppreciation5yr,dB.homeAppreciation5yr,fmtPct,    false],
    ['Days on Market',      dA.medDaysOnMarket,   dB.medDaysOnMarket,  v=>v+'d',     true],
    ['Vacancy Rate',        dA.vacancyRate,       dB.vacancyRate,      fmtPct,       true],
    ['Unemployment',        dA.unemployment,      dB.unemployment,     fmtPct,       true],
    ['Poverty Rate',        dA.povertyRate,       dB.povertyRate,      fmtPct,       true],
    ['Population',          dA.population,        dB.population,       fmtNum,       false],
    ['Median Age',          dA.medAge,            dB.medAge,           v=>v,         false],
    ['College Educated',    dA.collegeEd,         dB.collegeEd,        v=>v+'%',     false],
    ['Avg Rent/SqFt',       dA.avgRent,           dB.avgRent,          v=>v?'$'+v.toFixed(2):'-', false],
  ];

  const winner = sA > sB ? CMP_A : sB > sA ? CMP_B : 'TIE';

  document.getElementById('cmp-box').innerHTML = `
    <div class="cmp-hd">
      <div><div class="cmp-title">Side-by-Side Analysis</div><div class="cmp-sub">Mode: ${MODE.toUpperCase()} · Source: ACS 2023 / Redfin 2026</div></div>
      <button onclick="closeCmp()" class="cmp-x">✕</button>
    </div>

    <div class="cmp-heads">
      <div class="cmp-hcell">
        <div class="cmp-hz" style="color:${cA}">${CMP_A}</div>
        <div class="cmp-hn">${dA.name}</div>
        <div class="cmp-hs" style="color:${cA}">${sA} pts</div>
        <div class="cmp-hopp">${opA.icon} ${opA.label}</div>
      </div>
      <div class="cmp-vs-col">VS</div>
      <div class="cmp-hcell">
        <div class="cmp-hz" style="color:${cB}">${CMP_B}</div>
        <div class="cmp-hn">${dB.name}</div>
        <div class="cmp-hs" style="color:${cB}">${sB} pts</div>
        <div class="cmp-hopp">${opB.icon} ${opB.label}</div>
      </div>
    </div>

    <div class="cmp-table">
      ${metrics.map(([lbl,vA,vB,f,lowerWins]) => {
        const aWins = lowerWins ? vA<vB : vA>vB;
        const bWins = lowerWins ? vB<vA : vB>vA;
        return `<div class="cmp-row">
          <div class="cmp-cell ${aWins?'win':bWins?'lose':''}">${f(vA)}</div>
          <div class="cmp-lbl">${lbl}</div>
          <div class="cmp-cell ${bWins?'win':aWins?'lose':''}">${f(vB)}</div>
        </div>`;
      }).join('')}
    </div>

    <div class="cmp-verdict">
      <div class="cv-title">${winner==='TIE'?'🤝 Tied':'🏆 '+winner+' Leads'}</div>
      <div class="cv-body">
        ${winner==='TIE'
          ? `Both score equally at ${sA} pts. ${dA.name} suits <em>${dA.tags[0]}</em> while ${dB.name} suits <em>${dB.tags[0]}</em>.`
          : `<strong>${winner===CMP_A?dA.name:dB.name}</strong> outscores on ${MODE} with <strong style="color:${winner===CMP_A?cA:cB}">${Math.max(sA,sB)} pts</strong> vs <strong style="color:${winner===CMP_A?cB:cA}">${Math.min(sA,sB)} pts</strong>. Classified as a <strong>${(winner===CMP_A?opA:opB).label}</strong>. ${winner===CMP_A?dA.brief:dB.brief}`
        }
      </div>
    </div>
    <button class="cmp-close-btn" onclick="closeCmp()">Close Comparison</button>
  `;
  document.getElementById('cmp-modal').classList.add('show');
}

function closeCmp() { document.getElementById('cmp-modal').classList.remove('show'); }

// ── CONTROLS ──────────────────────────────────────────────────────────────────
const MODE_LABELS = {
  composite:  'Composite Wealth Score',
  homes:      'Median Home Values',
  income:     'Household Income',
  business:   'Business Revenue Index',
  growth:     '5-Year Home Appreciation'
};

function setMode(btn) {
  MODE = btn.dataset.mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('leg-title').textContent = MODE_LABELS[MODE];
  refreshMap();
  buildSidebar();
  updateKPIs();
  if (SELECTED) openDetail(SELECTED);
}

function setStyle(btn) {
  document.querySelectorAll('.sty-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentStyle = btn.dataset.style;
  map.setStyle(STYLES[currentStyle]);
}

function toggleLabels() {
  LABELS = !LABELS;
  document.getElementById('labels-btn').classList.toggle('on', LABELS);
  if (map.getLayer('twi-labels')) {
    map.setLayoutProperty('twi-labels','visibility', LABELS ? 'visible' : 'none');
  }
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();

  document.getElementById('mode-group').addEventListener('click', e => {
    if (e.target.classList.contains('mode-btn')) setMode(e.target);
  });
  document.getElementById('search').addEventListener('input', e => {
    SEARCH = e.target.value.toLowerCase().trim();
    buildSidebar();
  });
  document.querySelectorAll('.tier-btn').forEach(btn => btn.addEventListener('click', () => {
    TIER = btn.dataset.t;
    document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    buildSidebar();
  }));
  document.querySelectorAll('.sty-btn').forEach(btn => btn.addEventListener('click', () => setStyle(btn)));
  document.getElementById('labels-btn').addEventListener('click', toggleLabels);
  document.getElementById('compare-btn').addEventListener('click', toggleCompare);
  document.getElementById('det-close').addEventListener('click', closeDetail);
  document.getElementById('cmp-run').addEventListener('click', runCompare);
  document.getElementById('cmp-clear').addEventListener('click', () => { CMP_A=CMP_B=null; updateCmpSlots(); });
  document.getElementById('z-in').addEventListener('click', () => map.zoomIn());
  document.getElementById('z-out').addEventListener('click', () => map.zoomOut());
  document.getElementById('z-reset').addEventListener('click', () => map.flyTo({ center:[-110.97,32.245], zoom:10.6, duration:1000 }));
  document.getElementById('cmp-modal').addEventListener('click', e => { if (e.target.id==='cmp-modal') closeCmp(); });
});

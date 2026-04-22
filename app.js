// ─── TUCSON WEALTH INTEL — APP.JS ───────────────────────────────────────────
// Mapbox GL JS powered interactive wealth heat map

// ── CONFIG ──────────────────────────────────────────────────────────────────
// Replace with your own Mapbox token from https://account.mapbox.com
const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2RjcmVzdGlucyIsImEiOiJjbW9hZnhzeXIwNmh0MnBwd3g2djN4ODR0In0.OtGVl5R5yfKnXyDkTXvq7A';

const MAP_STYLES = {
  dark:      'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets:   'mapbox://styles/mapbox/streets-v12',
  outdoors:  'mapbox://styles/mapbox/outdoors-v12'
};

// ── STATE ────────────────────────────────────────────────────────────────────
let map, popup;
let MODE = 'composite';
let SELECTED_ZIP = null;
let CMP_A = null, CMP_B = null;
let COMPARE_OPEN = false;
let LABELS_ON = true;
let TIER_FILTER = 'all';
let SEARCH_Q = '';
let currentStyle = 'dark';

// ── SCORE & COLOR ────────────────────────────────────────────────────────────
function calcScore(zip, mode) {
  const d = ZIP_DATA[zip];
  if (!d) return 0;
  const h = d.home / MAX.home * 100;
  const b = d.biz;
  const g = d.gdp  / MAX.gdp  * 100;
  const i = d.inc  / MAX.inc  * 100;
  switch (mode) {
    case 'homes':    return Math.round(h);
    case 'business': return Math.round(b);
    case 'gdp':      return Math.round((g + i) / 2);
    default:         return Math.round(h * 0.30 + b * 0.25 + g * 0.25 + i * 0.20);
  }
}

function heatColor(s) {
  const stops = [
    [0,  [10,  37,  64]],
    [20, [14,  94, 138]],
    [38, [26, 158, 127]],
    [52, [61, 220, 132]],
    [65, [245, 166, 35]],
    [78, [255, 125, 61]],
    [88, [255,  61, 107]],
    [100,[194,   0,  74]]
  ];
  for (let i = stops.length - 1; i >= 0; i--) {
    if (s >= stops[i][0]) {
      if (i < stops.length - 1) {
        const t = (s - stops[i][0]) / (stops[i+1][0] - stops[i][0]);
        return stops[i][1].map((c, j) => Math.round(c + (stops[i+1][1][j] - c) * Math.min(t, 1)));
      }
      return stops[i][1];
    }
  }
  return stops[0][1];
}

function heatColorHex(s) {
  const [r,g,b] = heatColor(s);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function heatColorRGBA(s, a=0.65) {
  const [r,g,b] = heatColor(s);
  return `rgba(${r},${g},${b},${a})`;
}

function tierInfo(s) {
  if (s >= 85) return { name: 'Ultra-High Wealth', color: '#ff3d6b' };
  if (s >= 70) return { name: 'High Wealth',       color: '#ff7d3d' };
  if (s >= 55) return { name: 'Upper-Middle',      color: '#f5a623' };
  if (s >= 40) return { name: 'Middle Market',     color: '#3ddc84' };
  if (s >= 25) return { name: 'Working Class',     color: '#1a9e7f' };
  return              { name: 'Lower Income',      color: '#0e5e8a' };
}

function fmt(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return '$' + Math.round(n / 1000) + 'K';
  return '$' + n;
}

// ── MAPBOX COLOR EXPRESSION ──────────────────────────────────────────────────
function buildColorExpression() {
  const expr = ['match', ['get', 'zip']];
  Object.keys(ZIP_DATA).forEach(zip => {
    const s = calcScore(zip, MODE);
    expr.push(zip, heatColorRGBA(s, 0.72));
  });
  expr.push('rgba(0,0,0,0)');
  return expr;
}

function buildBorderExpression() {
  const expr = ['match', ['get', 'zip']];
  Object.keys(ZIP_DATA).forEach(zip => {
    expr.push(zip, SELECTED_ZIP === zip ? '#ffffff' : 'rgba(255,255,255,0.25)');
  });
  expr.push('rgba(0,0,0,0)');
  return expr;
}

function buildBorderWidthExpression() {
  return ['match', ['get', 'zip'], SELECTED_ZIP || '', 2.5, 1];
}

// ── MAP INIT ─────────────────────────────────────────────────────────────────
function initMap() {
  mapboxgl.accessToken = MAPBOX_TOKEN;

  map = new mapboxgl.Map({
    container: 'map',
    style: MAP_STYLES.dark,
    center: [-110.97, 32.24],
    zoom: 10.5,
    minZoom: 9,
    maxZoom: 16,
    pitch: 0,
    bearing: 0,
    antialias: true
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new mapboxgl.ScaleControl({ unit: 'imperial' }), 'bottom-right');

  popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'wealth-popup',
    maxWidth: '200px',
    offset: 12
  });

  map.on('load', () => {
    addZipLayers();
    buildSidebar();
    updateKPIs();
  });

  map.on('style.load', () => {
    // Re-add layers after style change
    if (map.getSource('zips')) {
      map.removeLayer('zip-fill');
      map.removeLayer('zip-border');
      map.removeLayer('zip-hover');
      map.removeLayer('zip-labels');
      map.removeSource('zips');
    }
    addZipLayers();
  });
}

function addZipLayers() {
  // Annotate GeoJSON with scores
  const geoData = JSON.parse(JSON.stringify(ZIP_GEOJSON));
  geoData.features.forEach(f => {
    const zip = f.properties.zip;
    const d = ZIP_DATA[zip];
    if (d) {
      f.properties.score = calcScore(zip, MODE);
      f.properties.name  = d.name;
      f.properties.home  = d.home;
      f.properties.biz   = d.biz;
      f.properties.inc   = d.inc;
    }
  });

  map.addSource('zips', { type: 'geojson', data: geoData });

  // Fill layer
  map.addLayer({
    id: 'zip-fill',
    type: 'fill',
    source: 'zips',
    paint: {
      'fill-color': buildColorExpression(),
      'fill-opacity': [
        'interpolate', ['linear'], ['zoom'],
        9, 0.7,
        13, 0.55
      ]
    }
  });

  // Border layer
  map.addLayer({
    id: 'zip-border',
    type: 'line',
    source: 'zips',
    paint: {
      'line-color': buildBorderExpression(),
      'line-width': buildBorderWidthExpression(),
      'line-opacity': 0.9
    }
  });

  // Hover highlight
  map.addLayer({
    id: 'zip-hover',
    type: 'fill',
    source: 'zips',
    paint: {
      'fill-color': 'rgba(255,255,255,0)',
      'fill-opacity': 0
    },
    filter: ['==', 'zip', '']
  });

  // ZIP labels
  map.addLayer({
    id: 'zip-labels',
    type: 'symbol',
    source: 'zips',
    layout: {
      'text-field': [
        'format',
        ['get', 'zip'], { 'font-scale': 1.0 },
        '\n', {},
        ['concat', ['to-string', ['get', 'score']], ''], { 'font-scale': 0.75, 'text-color': '#aac8e0' }
      ],
      'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      'text-size': [
        'interpolate', ['linear'], ['zoom'],
        9, 10,
        12, 13,
        14, 16
      ],
      'text-anchor': 'center',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'visibility': 'visible'
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0,0,0,0.75)',
      'text-halo-width': 2
    }
  });

  // Interactions
  map.on('mouseenter', 'zip-fill', e => {
    map.getCanvas().style.cursor = 'pointer';
    const f = e.features[0];
    const zip = f.properties.zip;
    const d = ZIP_DATA[zip];
    if (!d) return;

    const s = calcScore(zip, MODE);
    const col = heatColorHex(s);
    const ti = tierInfo(s);

    map.setFilter('zip-hover', ['==', 'zip', zip]);
    map.setPaintProperty('zip-hover', 'fill-color', `${col}22`);
    map.setPaintProperty('zip-hover', 'fill-opacity', 1);

    popup.setLngLat(e.lngLat)
      .setHTML(`
        <div class="pp-zip">${zip}</div>
        <div class="pp-name">${d.name}</div>
        <div class="pp-score" style="color:${col}">${s}</div>
        <div class="pp-tier" style="color:${ti.color}">${ti.name}</div>
        <div class="pp-divider"></div>
        <div class="pp-row"><span>Median Home</span><strong>${fmt(d.home)}</strong></div>
        <div class="pp-row"><span>Biz Index</span><strong>${d.biz}/100</strong></div>
        <div class="pp-row"><span>GDP/Capita</span><strong>${fmt(d.gdp)}</strong></div>
        <div class="pp-row"><span>Household Inc</span><strong>${fmt(d.inc)}</strong></div>
        <div class="pp-row"><span>YoY Trend</span><strong style="color:#3ddc84">${d.trend}</strong></div>
        <div class="pp-hint">Click to open full analysis</div>
      `)
      .addTo(map);
  });

  map.on('mouseleave', 'zip-fill', () => {
    map.getCanvas().style.cursor = '';
    map.setFilter('zip-hover', ['==', 'zip', '']);
    popup.remove();
  });

  map.on('click', 'zip-fill', e => {
    const zip = e.features[0].properties.zip;
    openDetail(zip);
  });

  map.on('click', e => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['zip-fill'] });
    if (!features.length) closeDetail();
  });
}

function refreshMapColors() {
  if (!map.getLayer('zip-fill')) return;
  map.setPaintProperty('zip-fill', 'fill-color', buildColorExpression());
  map.setPaintProperty('zip-border', 'line-color', buildBorderExpression());
  map.setPaintProperty('zip-border', 'line-width', buildBorderWidthExpression());

  // Update GeoJSON scores for labels
  const geoData = JSON.parse(JSON.stringify(ZIP_GEOJSON));
  geoData.features.forEach(f => {
    f.properties.score = calcScore(f.properties.zip, MODE);
  });
  map.getSource('zips').setData(geoData);
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function buildSidebar() {
  const list = document.getElementById('zip-list');
  const sorted = Object.keys(ZIP_DATA)
    .map(z => ({ zip: z, s: calcScore(z, MODE) }))
    .sort((a, b) => b.s - a.s);

  let html = '', count = 0;
  sorted.forEach(({ zip, s }, i) => {
    const d = ZIP_DATA[zip];
    const tier = s >= 65 ? 'high' : s >= 40 ? 'mid' : 'low';
    const matchTier = TIER_FILTER === 'all' || TIER_FILTER === tier;
    const matchQ = !SEARCH_Q || zip.includes(SEARCH_Q) || d.name.toLowerCase().includes(SEARCH_Q);
    if (!matchTier || !matchQ) return;
    count++;
    const col = heatColorHex(s);
    const hPct = Math.round(d.home / MAX.home * 100);
    const bPct = d.biz;
    const gPct = Math.round(d.gdp / MAX.gdp * 100);
    html += `
      <div class="zip-row${SELECTED_ZIP === zip ? ' sel' : ''}" data-zip="${zip}" onclick="openDetail('${zip}')">
        <div class="zr-rank">${i + 1}</div>
        <div class="zr-chip" style="background:${col};color:${s>55?'#000':'#fff'}">${s}</div>
        <div class="zr-info">
          <div class="zr-code">${zip}</div>
          <div class="zr-name">${d.name}</div>
        </div>
        <div class="zr-right">
          <div class="zr-trend" style="color:#3ddc84">${d.trend}</div>
          <div class="zr-bars">
            <div class="zr-bar" style="height:${4 + Math.round(hPct / 20)}px;background:#00d4ff"></div>
            <div class="zr-bar" style="height:${4 + Math.round(bPct / 20)}px;background:#f5a623"></div>
            <div class="zr-bar" style="height:${4 + Math.round(gPct / 20)}px;background:#3ddc84"></div>
          </div>
        </div>
      </div>`;
  });
  list.innerHTML = html;
  document.getElementById('sb-count').textContent = `${count} zones`;
}

function updateKPIs() {
  const scores = Object.keys(ZIP_DATA).map(z => calcScore(z, MODE));
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  document.getElementById('avg-kpi').textContent = avg;
  const topZip = Object.keys(ZIP_DATA).sort((a, b) => calcScore(b, MODE) - calcScore(a, MODE))[0];
  document.getElementById('top-zip-kpi').textContent = topZip;
}

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
function openDetail(zip) {
  SELECTED_ZIP = zip;
  refreshMapColors();
  buildSidebar();

  const d = ZIP_DATA[zip];
  const s = calcScore(zip, MODE);
  const col = heatColorHex(s);
  const ti = tierInfo(s);
  const op = OPP_META[d.opp] || OPP_META.stable;

  document.getElementById('det-zip').textContent = zip;
  document.getElementById('det-name').textContent = d.name;
  document.getElementById('det-score-num').textContent = s;

  // Animate arc
  const arc = document.getElementById('score-arc');
  const circ = 163.4;
  arc.setAttribute('stroke', col);
  arc.style.transition = 'none';
  arc.setAttribute('stroke-dashoffset', circ);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    arc.style.transition = 'stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)';
    arc.setAttribute('stroke-dashoffset', circ - (s / 100) * circ);
  }));

  document.getElementById('det-tier-name').textContent = ti.name;
  document.getElementById('det-tier-name').style.color = ti.color;

  const ranked = Object.keys(ZIP_DATA).sort((a, b) => calcScore(b, MODE) - calcScore(a, MODE));
  document.getElementById('det-rank').textContent = `#${ranked.indexOf(zip) + 1} of ${ranked.length} ZIP codes`;

  const hPct = Math.round(d.home / MAX.home * 100);
  const bPct = d.biz;
  const gPct = Math.round(d.gdp / MAX.gdp * 100);
  const iPct = Math.round(d.inc  / MAX.inc  * 100);

  document.getElementById('det-body').innerHTML = `
    <div class="det-sec">
      <div class="det-sec-title">Key Metrics</div>
      <div class="metrics-2col">
        <div class="metric-tile">
          <div class="mt-lbl">Median Home</div>
          <div class="mt-val">${fmt(d.home)}</div>
          <div class="mt-sub">Residential</div>
          <div class="mt-bar"><div class="mt-fill" style="background:#00d4ff;width:0%" data-w="${hPct}"></div></div>
        </div>
        <div class="metric-tile">
          <div class="mt-lbl">Biz Revenue</div>
          <div class="mt-val">${d.biz}/100</div>
          <div class="mt-sub">Index</div>
          <div class="mt-bar"><div class="mt-fill" style="background:#f5a623;width:0%" data-w="${bPct}"></div></div>
        </div>
        <div class="metric-tile">
          <div class="mt-lbl">GDP/Capita</div>
          <div class="mt-val">${fmt(d.gdp)}</div>
          <div class="mt-sub">Annual Est.</div>
          <div class="mt-bar"><div class="mt-fill" style="background:#3ddc84;width:0%" data-w="${gPct}"></div></div>
        </div>
        <div class="metric-tile">
          <div class="mt-lbl">Household Inc</div>
          <div class="mt-val">${fmt(d.inc)}</div>
          <div class="mt-sub">Median</div>
          <div class="mt-bar"><div class="mt-fill" style="background:#ff7d3d;width:0%" data-w="${iPct}"></div></div>
        </div>
      </div>
    </div>

    <div class="det-sec">
      <div class="det-sec-title">Demographics</div>
      <div class="demo-grid">
        <div class="demo-item"><div class="demo-val">${d.population.toLocaleString()}</div><div class="demo-lbl">Population</div></div>
        <div class="demo-item"><div class="demo-val">${d.medAge}</div><div class="demo-lbl">Median Age</div></div>
        <div class="demo-item"><div class="demo-val">${d.unemployment}%</div><div class="demo-lbl">Unemployment</div></div>
        <div class="demo-item"><div class="demo-val">${d.collegeEd}%</div><div class="demo-lbl">College Edu.</div></div>
      </div>
    </div>

    <div class="det-sec">
      <div class="det-sec-title">Score Breakdown</div>
      ${[
        ['Home Prices',    hPct, '#00d4ff'],
        ['Business Rev.',  bPct, '#f5a623'],
        ['GDP/Capita',     gPct, '#3ddc84'],
        ['Household Inc.', iPct, '#ff7d3d']
      ].map(([lbl,val,clr]) => `
        <div class="breakdown-row">
          <span class="br-lbl">${lbl}</span>
          <div class="br-track"><div class="br-fill" style="background:${clr};width:0%" data-w="${val}"></div></div>
          <span class="br-val">${val}</span>
        </div>`).join('')}
    </div>

    <div class="det-sec">
      <div class="det-sec-title">Top Employers</div>
      <div class="employer-list">
        ${d.topEmployers.map(e => `<div class="employer-item">🏢 ${e}</div>`).join('')}
      </div>
    </div>

    <div class="det-sec">
      <div class="det-sec-title">Market Characteristics</div>
      <div class="tag-cloud">
        ${d.tags.map(t => `<div class="dtag" style="color:${col};border-color:${col}44;background:${col}12">${t}</div>`).join('')}
      </div>
    </div>

    <div class="det-sec">
      <div class="det-sec-title">Opportunity Classification</div>
      <div class="opp-card">
        <div class="opp-icon">${op.icon}</div>
        <div>
          <div class="opp-lbl">Target Class</div>
          <div class="opp-name" style="color:${col}">${op.label}</div>
          <div class="opp-desc">${op.desc}</div>
        </div>
        <div class="opp-trend">
          <div class="opp-trend-val" style="color:#3ddc84">${d.trend}</div>
          <div class="opp-trend-lbl">Price Trend</div>
        </div>
      </div>
    </div>

    <div class="det-sec">
      <div class="det-sec-title">Intelligence Brief</div>
      <div class="insight">${d.brief}</div>
    </div>

    <div class="det-sec">
      <button class="btn-add-compare" onclick="addToCompare()">⇌ Add to Compare</button>
      <button class="btn-fly" onclick="flyToZip('${zip}')">🗺 Zoom to Zone</button>
    </div>
  `;

  // Animate bars
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-w]').forEach(el => {
      el.style.transition = 'width .9s cubic-bezier(.16,1,.3,1)';
      el.style.width = el.dataset.w + '%';
    });
  });

  document.getElementById('detail-panel').classList.add('open');
  flyToZip(zip);
}

function closeDetail() {
  SELECTED_ZIP = null;
  document.getElementById('detail-panel').classList.remove('open');
  refreshMapColors();
  buildSidebar();
}

function flyToZip(zip) {
  const d = ZIP_DATA[zip];
  if (!d || !map) return;
  map.flyTo({
    center: [d.lng, d.lat],
    zoom: Math.max(map.getZoom(), 12.5),
    duration: 1200,
    essential: true
  });
}

// ── COMPARE ───────────────────────────────────────────────────────────────────
function toggleCompare() {
  COMPARE_OPEN = !COMPARE_OPEN;
  document.getElementById('compare-bar').classList.toggle('show', COMPARE_OPEN);
  document.getElementById('compare-btn').classList.toggle('active', COMPARE_OPEN);
  if (!COMPARE_OPEN) { CMP_A = CMP_B = null; updateCompareSlots(); }
  else toast('Select two ZIPs and click "Add to Compare" in the detail panel');
}

function addToCompare() {
  if (!SELECTED_ZIP) return toast('Open a ZIP first');
  if (!COMPARE_OPEN) { toggleCompare(); }
  if (CMP_A === SELECTED_ZIP || CMP_B === SELECTED_ZIP) return toast(`${SELECTED_ZIP} already in compare`);
  if (!CMP_A) { CMP_A = SELECTED_ZIP; toast(`${SELECTED_ZIP} → Slot A`); }
  else if (!CMP_B) { CMP_B = SELECTED_ZIP; toast(`${SELECTED_ZIP} → Slot B`); }
  else return toast('Both slots full — clear to reset');
  updateCompareSlots();
}

function updateCompareSlots() {
  const sa = document.getElementById('cmp-slot-a');
  const sb = document.getElementById('cmp-slot-b');
  const go = document.getElementById('cmp-run');
  if (CMP_A) {
    const s = calcScore(CMP_A, MODE);
    sa.innerHTML = `<strong>${CMP_A}</strong> <span style="color:${heatColorHex(s)}">${s}</span>`;
    sa.classList.add('filled');
  } else { sa.textContent = 'Slot A'; sa.classList.remove('filled'); }
  if (CMP_B) {
    const s = calcScore(CMP_B, MODE);
    sb.innerHTML = `<strong>${CMP_B}</strong> <span style="color:${heatColorHex(s)}">${s}</span>`;
    sb.classList.add('filled');
  } else { sb.textContent = 'Slot B'; sb.classList.remove('filled'); }
  go.disabled = !(CMP_A && CMP_B);
}

function runCompare() {
  if (!CMP_A || !CMP_B) return;
  const dA = ZIP_DATA[CMP_A], dB = ZIP_DATA[CMP_B];
  const sA = calcScore(CMP_A, MODE), sB = calcScore(CMP_B, MODE);
  const cA = heatColorHex(sA), cB = heatColorHex(sB);

  const metrics = [
    ['Composite Score',  sA,    sB,    v => v],
    ['Median Home',      dA.home, dB.home, fmt],
    ['Biz Revenue',      dA.biz,  dB.biz,  v => v+'/100'],
    ['GDP/Capita',       dA.gdp,  dB.gdp,  fmt],
    ['Household Inc.',   dA.inc,  dB.inc,  fmt],
    ['Population',       dA.population, dB.population, v => v.toLocaleString()],
    ['Median Age',       dA.medAge, dB.medAge, v => v],
    ['College Edu.',     dA.collegeEd, dB.collegeEd, v => v+'%'],
    ['Unemployment',     dA.unemployment, dB.unemployment, v => v+'%'],
    ['YoY Trend',        parseFloat(dA.trend), parseFloat(dB.trend), v => v+'%']
  ];

  const winner = sA > sB ? CMP_A : sB > sA ? CMP_B : 'TIED';
  const oppA = OPP_META[dA.opp], oppB = OPP_META[dB.opp];

  document.getElementById('cmp-modal-box').innerHTML = `
    <div class="cmp-modal-head">
      <div>
        <div class="cmp-modal-title">ZIP Code Comparison</div>
        <div class="cmp-modal-sub">Side-by-side market analysis · Mode: ${MODE.toUpperCase()}</div>
      </div>
      <button class="modal-close" onclick="closeCmpModal()">✕</button>
    </div>

    <div class="cmp-headers">
      <div class="cmp-header-cell">
        <div class="cmp-h-zip" style="color:${cA}">${CMP_A}</div>
        <div class="cmp-h-name">${dA.name}</div>
        <div class="cmp-h-score" style="color:${cA}">${sA}</div>
        <div class="cmp-h-opp">${oppA.icon} ${oppA.label}</div>
      </div>
      <div class="cmp-vs-col">VS</div>
      <div class="cmp-header-cell">
        <div class="cmp-h-zip" style="color:${cB}">${CMP_B}</div>
        <div class="cmp-h-name">${dB.name}</div>
        <div class="cmp-h-score" style="color:${cB}">${sB}</div>
        <div class="cmp-h-opp">${oppB.icon} ${oppB.label}</div>
      </div>
    </div>

    <div class="cmp-metrics-table">
      ${metrics.map(([lbl, vA, vB, f]) => {
        const isUnemployment = lbl === 'Unemployment';
        const aWins = isUnemployment ? vA < vB : vA > vB;
        const bWins = isUnemployment ? vB < vA : vB > vA;
        return `
        <div class="cmp-metric-row">
          <div class="cmp-m-val ${aWins ? 'win' : bWins ? 'lose' : ''}">${f(vA)}</div>
          <div class="cmp-m-lbl">${lbl}</div>
          <div class="cmp-m-val ${bWins ? 'win' : aWins ? 'lose' : ''}">${f(vB)}</div>
        </div>`;
      }).join('')}
    </div>

    <div class="cmp-verdict">
      <div class="verdict-title">
        ${winner === 'TIED'
          ? '🤝 Verdict: Tied — Different Strengths'
          : `🏆 Verdict: <span style="color:${winner===CMP_A?cA:cB}">${winner}</span> leads overall`}
      </div>
      <div class="verdict-body">
        ${winner === 'TIED'
          ? `Both ZIPs score equally at <strong>${sA}</strong>. ${dA.name} favors <em>${dA.tags[0]}</em> while ${dB.name} suits <em>${dB.tags[0]}</em>. Choose based on your investment category.`
          : `<strong>${winner === CMP_A ? dA.name : dB.name}</strong> leads with a score of <strong>${Math.max(sA,sB)}</strong> vs <strong>${Math.min(sA,sB)}</strong>. It is classified as a <strong>${(winner===CMP_A?oppA:oppB).label}</strong>. ${winner===CMP_A?dA.brief:dB.brief}`
        }
      </div>
    </div>

    <button class="cmp-close-btn" onclick="closeCmpModal()">Close Comparison</button>
  `;

  document.getElementById('cmp-modal').classList.add('show');
}

function closeCmpModal() {
  document.getElementById('cmp-modal').classList.remove('show');
}

// ── CONTROLS ──────────────────────────────────────────────────────────────────
function setMode(btn) {
  MODE = btn.dataset.mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  const labels = {
    composite: 'Composite Wealth Score',
    homes:     'Median Home Price Index',
    business:  'Business Revenue Index',
    gdp:       'GDP / Capita Index'
  };
  document.getElementById('leg-title').textContent = labels[MODE];
  refreshMapColors();
  buildSidebar();
  updateKPIs();
  if (SELECTED_ZIP) openDetail(SELECTED_ZIP);
}

function setMapStyle(btn) {
  const style = btn.dataset.style;
  currentStyle = style;
  document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  map.setStyle(MAP_STYLES[style]);
}

function toggleLabels() {
  LABELS_ON = !LABELS_ON;
  const vis = LABELS_ON ? 'visible' : 'none';
  if (map.getLayer('zip-labels')) map.setLayoutProperty('zip-labels', 'visibility', vis);
  document.getElementById('labels-btn').classList.toggle('active', LABELS_ON);
}

// ── TOAST ────────────────────────────────────────────────────────────────────
let toastT;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();

  // Mode buttons
  document.getElementById('mode-group').addEventListener('click', e => {
    if (e.target.classList.contains('mode-btn')) setMode(e.target);
  });

  // Search
  document.getElementById('search').addEventListener('input', e => {
    SEARCH_Q = e.target.value.toLowerCase().trim();
    buildSidebar();
  });

  // Tier tabs
  document.querySelectorAll('.tier-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      TIER_FILTER = btn.dataset.t;
      document.querySelectorAll('.tier-tab').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      buildSidebar();
    });
  });

  // Map controls
  document.getElementById('labels-btn').addEventListener('click', toggleLabels);
  document.getElementById('compare-btn').addEventListener('click', toggleCompare);
  document.getElementById('det-close').addEventListener('click', closeDetail);
  document.getElementById('cmp-run').addEventListener('click', runCompare);
  document.getElementById('cmp-clear').addEventListener('click', () => {
    CMP_A = CMP_B = null;
    updateCompareSlots();
  });

  // Zoom buttons
  document.getElementById('zoom-in').addEventListener('click',  () => map.zoomIn());
  document.getElementById('zoom-out').addEventListener('click', () => map.zoomOut());
  document.getElementById('reset-view').addEventListener('click', () => {
    map.flyTo({ center: [-110.97, 32.24], zoom: 10.5, duration: 1000 });
  });

  // Style switcher
  document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => setMapStyle(btn));
  });

  // Modal backdrop close
  document.getElementById('cmp-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('cmp-modal')) closeCmpModal();
  });
});

// ─── TUCSON WEALTH INTEL v3 ──────────────────────────────────────────────────


const MAP_STYLES = {
  dark:      'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets:   'mapbox://styles/mapbox/light-v11',
  outdoors:  'mapbox://styles/mapbox/outdoors-v12'
};

let map, popup;
let MODE = 'composite';
let SELECTED = null;
let CMP_A = null, CMP_B = null;
let COMPARE_OPEN = false;
let TIER = 'all';
let SEARCH = '';
let LABELS = true;

// ── SCORE ────────────────────────────────────────────────────────────────────
function score(zip, mode) {
  const d = ZIP_DATA[zip]; if (!d) return 0;
  const h = d.home/MAX.home*100, b = d.biz, g = d.gdp/MAX.gdp*100, i = d.inc/MAX.inc*100;
  if (mode==='homes')    return Math.round(h);
  if (mode==='business') return Math.round(b);
  if (mode==='gdp')      return Math.round((g+i)/2);
  return Math.round(h*.30 + b*.25 + g*.25 + i*.20);
}

function heatColor(s) {
  const stops = [
    [0,  [8,  42,  72]],
    [20, [14, 94, 138]],
    [38, [26,158,127]],
    [52, [61,220,132]],
    [65, [245,166, 35]],
    [78, [255,125, 61]],
    [88, [255, 61,107]],
    [100,[194,  0, 74]]
  ];
  for (let i=stops.length-1;i>=0;i--) {
    if (s>=stops[i][0]) {
      if (i<stops.length-1) {
        const t=(s-stops[i][0])/(stops[i+1][0]-stops[i][0]);
        return stops[i][1].map((c,j)=>Math.round(c+(stops[i+1][1][j]-c)*Math.min(t,1)));
      }
      return stops[i][1];
    }
  }
  return stops[0][1];
}

function hex(s) {
  const [r,g,b]=heatColor(s);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function rgba(s,a=0.7) {
  const [r,g,b]=heatColor(s);
  return `rgba(${r},${g},${b},${a})`;
}

function tier(s) {
  if (s>=85) return { name:'Ultra-High Wealth', color:'#ff3d6b' };
  if (s>=70) return { name:'High Wealth',       color:'#ff7d3d' };
  if (s>=55) return { name:'Upper-Middle',      color:'#f5a623' };
  if (s>=40) return { name:'Middle Market',     color:'#3ddc84' };
  if (s>=25) return { name:'Working Class',     color:'#1a9e7f' };
  return            { name:'Lower Income',      color:'#0e5e8a' };
}

function fmt(n) {
  if (n>=1000000) return '$'+(n/1000000).toFixed(1)+'M';
  if (n>=1000)    return '$'+Math.round(n/1000)+'K';
  return '$'+n;
}

// ── MAP ───────────────────────────────────────────────────────────────────────
function initMap() {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  map = new mapboxgl.Map({
    container: 'map',
    style: MAP_STYLES.dark,
    center: [-110.97, 32.24],
    zoom: 10.8,
    minZoom: 9, maxZoom: 17,
    antialias: true
  });

  map.addControl(new mapboxgl.ScaleControl({ unit:'imperial' }), 'bottom-right');

  popup = new mapboxgl.Popup({
    closeButton: false, closeOnClick: false,
    className: 'wealth-popup', maxWidth: '220px', offset: 14
  });

  map.on('load', () => {
    addLayers();
    buildSidebar();
    updateKPIs();
  });

  map.on('style.load', () => {
    // Re-add after style switch
    setTimeout(() => {
      if (!map.getSource('zips')) addLayers();
    }, 100);
  });
}

function buildGeoData() {
  const gd = JSON.parse(JSON.stringify(ZIP_GEOJSON));
  gd.features.forEach(f => {
    const z = f.properties.zip;
    const d = ZIP_DATA[z];
    if (d) {
      f.properties.score       = score(z, MODE);
      f.properties.home        = d.home;
      f.properties.biz         = d.biz;
      f.properties.inc         = d.inc;
      f.properties.trend       = d.trend;
      f.properties.selected    = z === SELECTED ? 1 : 0;
    }
  });
  return gd;
}

function colorExpr() {
  const e = ['match', ['get','zip']];
  Object.keys(ZIP_DATA).forEach(z => {
    e.push(z, rgba(score(z,MODE), z===SELECTED ? 0.88 : 0.72));
  });
  e.push('rgba(0,0,0,0)');
  return e;
}

function borderColorExpr() {
  const e = ['match', ['get','zip']];
  Object.keys(ZIP_DATA).forEach(z => {
    e.push(z, z===SELECTED ? '#ffffff' : 'rgba(255,255,255,0.3)');
  });
  e.push('rgba(0,0,0,0)');
  return e;
}

function borderWidthExpr() {
  return ['match', ['get','zip'], SELECTED||'__none__', 3, 1.2];
}

function addLayers() {
  map.addSource('zips', { type:'geojson', data: buildGeoData() });

  // Main fill
  map.addLayer({
    id: 'zip-fill', type: 'fill', source: 'zips',
    paint: {
      'fill-color': colorExpr(),
      'fill-opacity': ['interpolate',['linear'],['zoom'], 9,0.78, 14,0.60]
    }
  });

  // Glow effect for selected (blurred duplicate)
  map.addLayer({
    id: 'zip-glow', type: 'fill', source: 'zips',
    paint: {
      'fill-color': colorExpr(),
      'fill-opacity': 0
    },
    filter: ['==','zip','__none__']
  });

  // Border
  map.addLayer({
    id: 'zip-border', type: 'line', source: 'zips',
    paint: {
      'line-color': borderColorExpr(),
      'line-width': borderWidthExpr(),
      'line-opacity': 0.9
    }
  });

  // Score labels
  map.addLayer({
    id: 'zip-labels', type: 'symbol', source: 'zips',
    layout: {
      'text-field': ['concat', ['get','zip'], '\n', ['to-string',['get','score']]],
      'text-font': ['DIN Pro Bold','Arial Unicode MS Bold'],
      'text-size': ['interpolate',['linear'],['zoom'], 9,9, 12,12, 14,15],
      'text-anchor': 'center', 'text-line-height': 1.3,
      'text-allow-overlap': false,
      'visibility': 'visible'
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0,0,0,0.8)',
      'text-halo-width': 1.5
    }
  });

  // Interactions
  map.on('mouseenter', 'zip-fill', e => {
    map.getCanvas().style.cursor = 'pointer';
    const z = e.features[0].properties.zip;
    const d = ZIP_DATA[z]; if (!d) return;
    const s = score(z,MODE), c = hex(s), ti = tier(s);

    popup.setLngLat(e.lngLat).setHTML(`
      <div class="pp-zip">${z}</div>
      <div class="pp-name">${d.name}</div>
      <div class="pp-score-row">
        <div class="pp-score" style="color:${c}">${s}</div>
        <div class="pp-tier" style="color:${ti.color}">${ti.name}</div>
      </div>
      <div class="pp-sep"></div>
      <div class="pp-row"><span>Median Home</span><b>${fmt(d.home)}</b></div>
      <div class="pp-row"><span>Biz Index</span><b>${d.biz}/100</b></div>
      <div class="pp-row"><span>GDP/Capita</span><b>${fmt(d.gdp)}</b></div>
      <div class="pp-row"><span>Household Inc</span><b>${fmt(d.inc)}</b></div>
      <div class="pp-row"><span>YoY Trend</span><b style="color:#3ddc84">${d.trend}</b></div>
      <div class="pp-row"><span>Population</span><b>${d.population.toLocaleString()}</b></div>
      <div class="pp-hint">Click for full analysis →</div>
    `).addTo(map);
  });

  map.on('mousemove', 'zip-fill', e => popup.setLngLat(e.lngLat));

  map.on('mouseleave', 'zip-fill', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });

  map.on('click', 'zip-fill', e => {
    const z = e.features[0].properties.zip;
    openDetail(z);
    popup.remove();
  });

  map.on('click', e => {
    const f = map.queryRenderedFeatures(e.point, {layers:['zip-fill']});
    if (!f.length) closeDetail();
  });
}

function refreshMap() {
  if (!map.getSource('zips')) return;
  map.getSource('zips').setData(buildGeoData());
  map.setPaintProperty('zip-fill',   'fill-color',    colorExpr());
  map.setPaintProperty('zip-border', 'line-color',    borderColorExpr());
  map.setPaintProperty('zip-border', 'line-width',    borderWidthExpr());
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function buildSidebar() {
  const sorted = Object.keys(ZIP_DATA)
    .map(z => ({z, s:score(z,MODE)}))
    .sort((a,b) => b.s-a.s);

  let html='', count=0;
  sorted.forEach(({z,s},i) => {
    const d = ZIP_DATA[z];
    const t = s>=65?'high':s>=40?'mid':'low';
    const matchTier = TIER==='all'||TIER===t;
    const matchQ = !SEARCH || z.includes(SEARCH)||d.name.toLowerCase().includes(SEARCH);
    if (!matchTier||!matchQ) return;
    count++;
    const c = hex(s);
    const hP = Math.round(d.home/MAX.home*100);
    const bP = d.biz;
    const gP = Math.round(d.gdp/MAX.gdp*100);
    html += `
      <div class="zip-row${SELECTED===z?' sel':''}" onclick="openDetail('${z}')">
        <span class="zr-rank">${i+1}</span>
        <span class="zr-chip" style="background:${c};color:${s>55?'#000':'#fff'}">${s}</span>
        <span class="zr-info">
          <span class="zr-code">${z}</span>
          <span class="zr-name">${d.name}</span>
        </span>
        <span class="zr-right">
          <span class="zr-trend" style="color:#3ddc84">${d.trend}</span>
          <span class="zr-bars">
            <span class="zr-bar" style="height:${4+Math.round(hP/20)}px;background:#00d4ff"></span>
            <span class="zr-bar" style="height:${4+Math.round(bP/20)}px;background:#f5a623"></span>
            <span class="zr-bar" style="height:${4+Math.round(gP/20)}px;background:#3ddc84"></span>
          </span>
        </span>
      </div>`;
  });
  document.getElementById('zip-list').innerHTML = html;
  document.getElementById('sb-count').textContent = `${count} zones`;
}

function updateKPIs() {
  const scores = Object.keys(ZIP_DATA).map(z=>score(z,MODE));
  document.getElementById('avg-kpi').textContent = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  const top = Object.keys(ZIP_DATA).sort((a,b)=>score(b,MODE)-score(a,MODE))[0];
  document.getElementById('top-zip-kpi').textContent = top;
}

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
function openDetail(zip) {
  SELECTED = zip;
  refreshMap();
  buildSidebar();

  const d = ZIP_DATA[zip]; if (!d) return;
  const s = score(zip,MODE), c = hex(s), ti = tier(s), op = OPP_META[d.opp]||OPP_META.stable;

  document.getElementById('det-zip').textContent = zip;
  document.getElementById('det-name').textContent = d.name;
  document.getElementById('det-score-num').textContent = s;

  const arc = document.getElementById('score-arc');
  const circ = 163.4;
  arc.setAttribute('stroke', c);
  arc.style.transition = 'none';
  arc.setAttribute('stroke-dashoffset', circ);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    arc.style.transition = 'stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)';
    arc.setAttribute('stroke-dashoffset', circ-(s/100)*circ);
  }));

  document.getElementById('det-tier-name').textContent = ti.name;
  document.getElementById('det-tier-name').style.color = ti.color;
  const ranked = Object.keys(ZIP_DATA).sort((a,b)=>score(b,MODE)-score(a,MODE));
  document.getElementById('det-rank').textContent = `#${ranked.indexOf(zip)+1} of ${ranked.length} ZIPs`;

  const hP = Math.round(d.home/MAX.home*100);
  const bP = d.biz;
  const gP = Math.round(d.gdp/MAX.gdp*100);
  const iP = Math.round(d.inc/MAX.inc*100);

  document.getElementById('det-body').innerHTML = `
    <div class="det-sec">
      <div class="det-sec-title">Key Metrics</div>
      <div class="metrics-2col">
        <div class="metric-tile"><div class="mt-lbl">Median Home</div><div class="mt-val">${fmt(d.home)}</div><div class="mt-sub">Residential</div><div class="mt-bar"><div class="mt-fill" style="background:#00d4ff;width:0%" data-w="${hP}"></div></div></div>
        <div class="metric-tile"><div class="mt-lbl">Biz Revenue</div><div class="mt-val">${d.biz}/100</div><div class="mt-sub">Index</div><div class="mt-bar"><div class="mt-fill" style="background:#f5a623;width:0%" data-w="${bP}"></div></div></div>
        <div class="metric-tile"><div class="mt-lbl">GDP/Capita</div><div class="mt-val">${fmt(d.gdp)}</div><div class="mt-sub">Annual</div><div class="mt-bar"><div class="mt-fill" style="background:#3ddc84;width:0%" data-w="${gP}"></div></div></div>
        <div class="metric-tile"><div class="mt-lbl">Household Inc</div><div class="mt-val">${fmt(d.inc)}</div><div class="mt-sub">Median</div><div class="mt-bar"><div class="mt-fill" style="background:#ff7d3d;width:0%" data-w="${iP}"></div></div></div>
      </div>
    </div>
    <div class="det-sec">
      <div class="det-sec-title">Demographics</div>
      <div class="demo-grid">
        <div class="demo-item"><div class="demo-val">${d.population.toLocaleString()}</div><div class="demo-lbl">Population</div></div>
        <div class="demo-item"><div class="demo-val">${d.medAge}</div><div class="demo-lbl">Median Age</div></div>
        <div class="demo-item"><div class="demo-val">${d.unemployment}%</div><div class="demo-lbl">Unemployed</div></div>
        <div class="demo-item"><div class="demo-val">${d.collegeEd}%</div><div class="demo-lbl">College Edu.</div></div>
      </div>
    </div>
    <div class="det-sec">
      <div class="det-sec-title">Score Breakdown</div>
      ${[['Home Prices',hP,'#00d4ff'],['Business Rev.',bP,'#f5a623'],['GDP/Capita',gP,'#3ddc84'],['Household Inc.',iP,'#ff7d3d']].map(([l,v,col])=>`
        <div class="breakdown-row"><span class="br-lbl">${l}</span><div class="br-track"><div class="br-fill" style="background:${col};width:0%" data-w="${v}"></div></div><span class="br-val">${v}</span></div>`).join('')}
    </div>
    <div class="det-sec">
      <div class="det-sec-title">Top Employers</div>
      <div class="employer-list">${d.topEmployers.map(e=>`<div class="employer-item">🏢 ${e}</div>`).join('')}</div>
    </div>
    <div class="det-sec">
      <div class="det-sec-title">Market Characteristics</div>
      <div class="tag-cloud">${d.tags.map(t=>`<div class="dtag" style="color:${c};border-color:${c}44;background:${c}12">${t}</div>`).join('')}</div>
    </div>
    <div class="det-sec">
      <div class="det-sec-title">Opportunity</div>
      <div class="opp-card">
        <div class="opp-icon">${op.icon}</div>
        <div style="flex:1"><div class="opp-lbl">Target Class</div><div class="opp-name" style="color:${c}">${op.label}</div><div class="opp-desc">${op.desc}</div></div>
        <div class="opp-trend"><div class="opp-trend-val" style="color:#3ddc84">${d.trend}</div><div class="opp-trend-lbl">YoY</div></div>
      </div>
    </div>
    <div class="det-sec">
      <div class="det-sec-title">Intelligence Brief</div>
      <div class="insight">${d.brief}</div>
    </div>
    <div class="det-sec" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-add-compare" onclick="addToCompare()">⇌ Add to Compare</button>
      <button class="btn-fly" onclick="flyTo('${zip}')">🗺 Zoom to Zone</button>
    </div>
  `;

  requestAnimationFrame(()=>{
    document.querySelectorAll('[data-w]').forEach(el=>{
      el.style.transition='width .9s cubic-bezier(.16,1,.3,1)';
      el.style.width=el.dataset.w+'%';
    });
  });

  document.getElementById('detail-panel').classList.add('open');
  flyTo(zip);
}

function closeDetail() {
  SELECTED = null;
  document.getElementById('detail-panel').classList.remove('open');
  refreshMap();
  buildSidebar();
}

function flyTo(zip) {
  const d = ZIP_DATA[zip]; if (!d||!map) return;
  map.flyTo({ center:[d.lng||(-110.97), d.lat||(32.24)], zoom: Math.max(map.getZoom(), 12.5), duration:1000, essential:true });
  // Find centroid from GeoJSON
  const feat = ZIP_GEOJSON.features.find(f=>f.properties.zip===zip);
  if (feat) {
    const coords = feat.geometry.coordinates[0];
    const lng = coords.reduce((s,c)=>s+c[0],0)/coords.length;
    const lat = coords.reduce((s,c)=>s+c[1],0)/coords.length;
    map.flyTo({ center:[lng,lat], zoom:Math.max(map.getZoom(),12.5), duration:1000, essential:true });
  }
}

// ── COMPARE ───────────────────────────────────────────────────────────────────
function toggleCompare() {
  COMPARE_OPEN = !COMPARE_OPEN;
  document.getElementById('compare-bar').classList.toggle('show', COMPARE_OPEN);
  document.getElementById('compare-btn').classList.toggle('active', COMPARE_OPEN);
  if (!COMPARE_OPEN) { CMP_A=CMP_B=null; updateCmpSlots(); }
  else toast('Open two ZIPs and click "Add to Compare"');
}

function addToCompare() {
  if (!SELECTED) return toast('Open a ZIP first');
  if (!COMPARE_OPEN) toggleCompare();
  if (CMP_A===SELECTED||CMP_B===SELECTED) return toast(`${SELECTED} already added`);
  if (!CMP_A) { CMP_A=SELECTED; toast(`${SELECTED} → Slot A`); }
  else if (!CMP_B) { CMP_B=SELECTED; toast(`${SELECTED} → Slot B`); }
  else return toast('Both slots full — clear first');
  updateCmpSlots();
}

function updateCmpSlots() {
  const sa=document.getElementById('cmp-slot-a'), sb=document.getElementById('cmp-slot-b');
  const go=document.getElementById('cmp-run');
  if (CMP_A) { const s=score(CMP_A,MODE); sa.innerHTML=`<strong>${CMP_A}</strong> <span style="color:${hex(s)}">${s}</span>`; sa.classList.add('filled'); }
  else { sa.textContent='Slot A'; sa.classList.remove('filled'); }
  if (CMP_B) { const s=score(CMP_B,MODE); sb.innerHTML=`<strong>${CMP_B}</strong> <span style="color:${hex(s)}">${s}</span>`; sb.classList.add('filled'); }
  else { sb.textContent='Slot B'; sb.classList.remove('filled'); }
  go.disabled=!(CMP_A&&CMP_B);
}

function runCompare() {
  if (!CMP_A||!CMP_B) return;
  const dA=ZIP_DATA[CMP_A],dB=ZIP_DATA[CMP_B];
  const sA=score(CMP_A,MODE),sB=score(CMP_B,MODE);
  const cA=hex(sA),cB=hex(sB);
  const opA=OPP_META[dA.opp]||OPP_META.stable;
  const opB=OPP_META[dB.opp]||OPP_META.stable;

  const rows=[
    ['Composite Score', sA,sB,v=>v],
    ['Median Home', dA.home,dB.home,fmt],
    ['Biz Revenue', dA.biz,dB.biz,v=>v+'/100'],
    ['GDP/Capita', dA.gdp,dB.gdp,fmt],
    ['Household Inc.', dA.inc,dB.inc,fmt],
    ['Population', dA.population,dB.population,v=>v.toLocaleString()],
    ['Median Age', dA.medAge,dB.medAge,v=>v],
    ['College Edu.', dA.collegeEd,dB.collegeEd,v=>v+'%'],
    ['Unemployment', dA.unemployment,dB.unemployment,v=>v+'%'],
    ['YoY Trend', parseFloat(dA.trend),parseFloat(dB.trend),v=>v+'%'],
  ];

  const winner=sA>sB?CMP_A:sB>sA?CMP_B:'TIE';

  document.getElementById('cmp-modal-box').innerHTML=`
    <div class="cmp-modal-head">
      <div><div class="cmp-modal-title">ZIP Comparison</div><div class="cmp-modal-sub">${MODE.toUpperCase()} mode analysis</div></div>
      <button class="modal-close" onclick="closeCmp()">✕</button>
    </div>
    <div class="cmp-headers">
      <div class="cmp-header-cell">
        <div class="cmp-h-zip" style="color:${cA}">${CMP_A}</div>
        <div class="cmp-h-name">${dA.name}</div>
        <div class="cmp-h-score" style="color:${cA}">${sA}</div>
        <div class="cmp-h-opp">${opA.icon} ${opA.label}</div>
      </div>
      <div class="cmp-vs-col">VS</div>
      <div class="cmp-header-cell">
        <div class="cmp-h-zip" style="color:${cB}">${CMP_B}</div>
        <div class="cmp-h-name">${dB.name}</div>
        <div class="cmp-h-score" style="color:${cB}">${sB}</div>
        <div class="cmp-h-opp">${opB.icon} ${opB.label}</div>
      </div>
    </div>
    <div class="cmp-metrics-table">
      ${rows.map(([lbl,vA,vB,f])=>{
        const isUnemp=lbl==='Unemployment';
        const aW=isUnemp?vA<vB:vA>vB, bW=isUnemp?vB<vA:vB>vA;
        return `<div class="cmp-metric-row">
          <div class="cmp-m-val ${aW?'win':bW?'lose':''}">${f(vA)}</div>
          <div class="cmp-m-lbl">${lbl}</div>
          <div class="cmp-m-val ${bW?'win':aW?'lose':''}">${f(vB)}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="cmp-verdict">
      <div class="verdict-title">${winner==='TIE'?'🤝 Tied — Different Strengths':`🏆 ${winner} leads overall`}</div>
      <div class="verdict-body">${
        winner==='TIE'
          ? `Both ZIPs score equally at <strong>${sA}</strong>. Choose based on your investment category.`
          : `<strong>${winner===CMP_A?dA.name:dB.name}</strong> scores <strong style="color:${winner===CMP_A?cA:cB}">${Math.max(sA,sB)}</strong> vs <strong style="color:${winner===CMP_A?cB:cA}">${Math.min(sA,sB)}</strong>. Classified as: <strong>${(winner===CMP_A?opA:opB).label}</strong>. ${winner===CMP_A?dA.brief:dB.brief}`
      }</div>
    </div>
    <button class="cmp-close-btn" onclick="closeCmp()">Close</button>
  `;
  document.getElementById('cmp-modal').classList.add('show');
}

function closeCmp() { document.getElementById('cmp-modal').classList.remove('show'); }

// ── MODE / CONTROLS ───────────────────────────────────────────────────────────
function setMode(btn) {
  MODE=btn.dataset.mode;
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  const labels={composite:'Composite Wealth Score',homes:'Median Home Price Index',business:'Business Revenue Index',gdp:'GDP / Capita Index'};
  document.getElementById('leg-title').textContent=labels[MODE];
  refreshMap(); buildSidebar(); updateKPIs();
  if (SELECTED) openDetail(SELECTED);
}

function setMapStyle(btn) {
  document.querySelectorAll('.style-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  map.setStyle(MAP_STYLES[btn.dataset.style]);
}

function toggleLabels() {
  LABELS=!LABELS;
  document.getElementById('labels-btn').classList.toggle('active',LABELS);
  if (map.getLayer('zip-labels')) map.setLayoutProperty('zip-labels','visibility',LABELS?'visible':'none');
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
let toastT;
function toast(msg) {
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),2800);
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();

  document.getElementById('mode-group').addEventListener('click', e=>{
    if (e.target.classList.contains('mode-btn')) setMode(e.target);
  });
  document.getElementById('search').addEventListener('input', e=>{
    SEARCH=e.target.value.toLowerCase().trim(); buildSidebar();
  });
  document.querySelectorAll('.tier-tab').forEach(btn=>btn.addEventListener('click',()=>{
    TIER=btn.dataset.t;
    document.querySelectorAll('.tier-tab').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on'); buildSidebar();
  }));
  document.querySelectorAll('.style-btn').forEach(btn=>btn.addEventListener('click',()=>setMapStyle(btn)));
  document.getElementById('labels-btn').addEventListener('click', toggleLabels);
  document.getElementById('compare-btn').addEventListener('click', toggleCompare);
  document.getElementById('det-close').addEventListener('click', closeDetail);
  document.getElementById('cmp-run').addEventListener('click', runCompare);
  document.getElementById('cmp-clear').addEventListener('click',()=>{ CMP_A=CMP_B=null; updateCmpSlots(); });
  document.getElementById('zoom-in').addEventListener('click',()=>map.zoomIn());
  document.getElementById('zoom-out').addEventListener('click',()=>map.zoomOut());
  document.getElementById('reset-view').addEventListener('click',()=>map.flyTo({center:[-110.97,32.24],zoom:10.8,duration:1000}));
  document.getElementById('cmp-modal').addEventListener('click',e=>{ if(e.target===document.getElementById('cmp-modal')) closeCmp(); });
});

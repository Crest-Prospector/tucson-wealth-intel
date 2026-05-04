// ─── CREST PROSPECTOR — APP.JS v1.0 ─────────────────────────────────────────
// Professional market intelligence platform for Tucson, AZ
// ─────────────────────────────────────────────────────────────────────────────

mapboxgl.accessToken = MAPBOX_TOKEN;

const MAP_STYLES = {
  dark:      'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets:   'mapbox://styles/mapbox/light-v11',
  outdoors:  'mapbox://styles/mapbox/outdoors-v12'
};

const GEO_URL = 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/az_arizona_zip_codes_geo.min.json';
const TARGET  = new Set(Object.keys(ZIP_DATA));

// ── STATE ─────────────────────────────────────────────────────────────────────
let map, popup, geoData = null;
let MODE = 'composite', SELECTED = null, CMP_A = null, CMP_B = null;
let CMP_OPEN = false, LABELS = true, USE_3D = true, TIER = 'all', SEARCH = '';

window._use3D = true;

// ── UTILS ─────────────────────────────────────────────────────────────────────
function heatRGB(s) {
  const t = [[0,[10,30,62]],[12,[12,58,110]],[24,[14,92,140]],[36,[20,138,128]],[48,[40,190,100]],[60,[160,200,40]],[72,[230,175,20]],[82,[240,110,30]],[90,[230,50,60]],[100,[180,0,50]]];
  for (let i=t.length-1;i>=0;i--) { if(s>=t[i][0]){if(i<t.length-1){const x=(s-t[i][0])/(t[i+1][0]-t[i][0]);return t[i][1].map((c,j)=>Math.round(c+(t[i+1][1][j]-c)*Math.min(x,1)));} return[...t[i][1]];} }
  return[...t[0][1]];
}
function hex(s)       { const[r,g,b]=heatRGB(s);return`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`; }
function rgba(s,a=.7) { const[r,g,b]=heatRGB(s);return`rgba(${r},${g},${b},${a})`; }

function tierInfo(s) {
  if(s>=88)return{name:'Ultra-High Wealth',color:'#f03060'};
  if(s>=75)return{name:'High Wealth',color:'#f07830'};
  if(s>=60)return{name:'Upper-Middle',color:'#e8a020'};
  if(s>=44)return{name:'Middle Market',color:'#28d88e'};
  if(s>=28)return{name:'Working Class',color:'#00c8f0'};
  return           {name:'Lower Income',color:'#6366f1'};
}

function fmt(n)    { if(!n&&n!==0)return'—'; if(n>=1e6)return'$'+(n/1e6).toFixed(1)+'M'; if(n>=1000)return'$'+n.toLocaleString(); return'$'+n; }
function fmtNum(n) { return n!=null?n.toLocaleString():'—'; }
function fmtPct(n) { return n!=null?n.toFixed(1)+'%':'—'; }

// ── LOADING PROGRESS ──────────────────────────────────────────────────────────
function setLoadProgress(pct, msg) {
  const bar = document.getElementById('load-bar');
  const status = document.getElementById('loading-status');
  if (bar) bar.style.width = pct + '%';
  if (status) status.textContent = msg;
}

// ── MAP INIT ──────────────────────────────────────────────────────────────────
async function initMap() {
  setLoadProgress(20, 'Initializing map engine…');

  window._map = map = new mapboxgl.Map({
    container: 'map',
    style: MAP_STYLES.dark,
    center: [-110.97, 32.21],
    zoom: 9.8,
    minZoom: 9, maxZoom: 17,
    pitch: USE_3D ? 45 : 0,
    bearing: USE_3D ? -15 : 0,
    antialias: true
  });

  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new mapboxgl.ScaleControl({ unit: 'imperial' }), 'bottom-right');

  window._popup = popup = new mapboxgl.Popup({
    closeButton: false, closeOnClick: false,
    className: 'twi-popup', maxWidth: '260px', offset: 16
  });

  setLoadProgress(40, 'Loading Census boundaries…');
  const boundaries = await loadBoundaries();

  map.on('load', () => {
    setLoadProgress(80, 'Rendering wealth zones…');
    if (boundaries) addLayers(boundaries);
    buildSidebar();
    updateKPIs();
    initZoomDrill();
    initGeolocation();
    setLoadProgress(100, 'Ready');
    setTimeout(hideLoading, 400);
  });

  map.on('style.load', () => {
    setTimeout(() => {
      window._map = map;
      window._geoData = geoData;
      if (geoData && !map.getSource('twi-zips')) addLayers(geoData);
      initZoomDrill();
      if (drillActive && drillZip && drillCache[drillZip]) setTimeout(()=>paintDrill(drillCache[drillZip]),300);
      // If we were in drill mode, re-render after style change
      if (zoomDrillActive && zoomDrillZip && zoomDrillCache[zoomDrillZip]) {
        setTimeout(() => renderDrillLayers(zoomDrillCache[zoomDrillZip], zoomDrillZip), 400);
      }
    }, 200);
  });
}

async function loadBoundaries() {
  const CACHE_KEY = 'twi_az_geo_v3';
  try {
    // Check sessionStorage cache first — skips the 350KB download on reload
    let rawFeatures = null;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        rawFeatures = JSON.parse(cached);
        setLoadProgress(60, `Using cached boundaries (${rawFeatures.length} zones)…`);
      }
    } catch(e) { /* sessionStorage unavailable */ }

    if (!rawFeatures) {
      setLoadProgress(45, 'Downloading Census TIGER/Line boundaries…');
      const resp = await fetch(GEO_URL);
      const all  = await resp.json();
      setLoadProgress(55, `Processing ${all.features.length} Arizona zones…`);

      // Store only the Tucson subset for fast future loads
      const tucsonFeatures = all.features.filter(f => TARGET.has(f.properties.ZCTA5CE10));
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(tucsonFeatures));
      } catch(e) { /* storage full, no problem */ }
      rawFeatures = tucsonFeatures;
    }

    const features = rawFeatures.map(f => {
      const zip = f.properties.ZCTA5CE10 || f.properties.zip;
      const d   = ZIP_DATA[zip];
      return {
        ...f, id: zip,
        properties: {
          ...f.properties, zip,
          name: d ? d.name : zip,
          score: calcScore(zip, MODE),
          medianHome:   d ? d.medianHome : 0,
          medianIncome: d ? d.medianIncome : 0,
          bizIndex:     d ? d.bizIndex : 0
        }
      };
    });

    geoData = { type: 'FeatureCollection', features }; window._geoData = geoData;
    return geoData;
  } catch (err) {
    console.error('GeoJSON load failed:', err);
    document.getElementById('loading-status').textContent = 'Error loading — check console';
    return null;
  }
}

function hideLoading() {
  const el = document.getElementById('loading');
  el.classList.add('fade');
  setTimeout(() => el.style.display = 'none', 600);
}

// ── MAP LAYERS ────────────────────────────────────────────────────────────────
function addLayers(geo) {
  ['twi-extrusion','twi-fill','twi-border','twi-border-sel','twi-labels'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource('twi-zips')) map.removeSource('twi-zips');

  map.addSource('twi-zips', { type: 'geojson', data: geo });

  // 3D extrusion
  if (USE_3D) {
    const hE = ['match',['get','zip']], cE = ['match',['get','zip']];
    Object.keys(ZIP_DATA).forEach(z => { const s=calcScore(z,MODE); hE.push(z,s*80); cE.push(z,hex(s)); });
    hE.push(0); cE.push('#111');
    map.addLayer({ id:'twi-extrusion', type:'fill-extrusion', source:'twi-zips',
      paint: { 'fill-extrusion-color':cE, 'fill-extrusion-height':hE, 'fill-extrusion-base':0, 'fill-extrusion-opacity':0.78, 'fill-extrusion-vertical-gradient':true }
    });
  }

  // Flat fill
  const fc = buildFillExpr();
  map.addLayer({ id:'twi-fill', type:'fill', source:'twi-zips',
    paint: { 'fill-color':fc, 'fill-opacity':['case',['boolean',['feature-state','hover'],false],0.88,USE_3D?0.35:0.68] }
  });

  // Borders — crisp and clean
  map.addLayer({ id:'twi-border', type:'line', source:'twi-zips',
    paint: {
      'line-color': ['case',['boolean',['feature-state','hover'],false],'rgba(255,255,255,0.8)','rgba(255,255,255,0.28)'],
      'line-width': ['interpolate',['linear'],['zoom'], 9,0.7, 12,1.3, 15,2.2],
      'line-opacity': 0.9
    }
  });

  // Selected border
  map.addLayer({ id:'twi-border-sel', type:'line', source:'twi-zips',
    paint: { 'line-color':'#00c8f0', 'line-width':2.8, 'line-opacity':1 },
    filter: ['==',['get','zip'],'']
  });

  // Labels
  map.addLayer({ id:'twi-labels', type:'symbol', source:'twi-zips',
    layout: {
      'text-field': ['step',['zoom'],
        ['get','zip'], 11,
        ['format',['get','zip'],{'font-scale':1},'\n',{},['concat',['to-string',['get','score']],' pts'],{'font-scale':.72,'text-color':'#7ac8e0'}], 13,
        ['format',['get','zip'],{'font-scale':1},'\n',{},['concat',['to-string',['get','score']],' pts'],{'font-scale':.72,'text-color':'#7ac8e0'},'\n',{},['get','name'],{'font-scale':.6,'text-color':'#5a90a8'}]
      ],
      'text-font': ['DIN Pro Bold','Arial Unicode MS Bold'],
      'text-size':  ['interpolate',['linear'],['zoom'],9,9,12,12,14,15],
      'text-anchor':'center','text-line-height':1.35,'text-allow-overlap':false,
      'visibility': LABELS ? 'visible' : 'none'
    },
    paint: { 'text-color':'#fff','text-halo-color':'rgba(0,0,0,.88)','text-halo-width':2 }
  });

  // ── INTERACTIONS ──
  let hov = null;
  map.on('mousemove','twi-fill', e => {
    if (drillActive) { map.getCanvas().style.cursor = ''; popup.remove(); return; }
    map.getCanvas().style.cursor = 'pointer';
    if (e.features.length) {
      if (hov!==null) map.setFeatureState({source:'twi-zips',id:hov},{hover:false});
      hov = e.features[0].id;
      map.setFeatureState({source:'twi-zips',id:hov},{hover:true});
      const z=e.features[0].properties.zip, d=ZIP_DATA[z]; if(!d)return;
      const s=calcScore(z,MODE), c=hex(s), ti=tierInfo(s);
      popup.setLngLat(e.lngLat).setHTML(`
        <div class="pp-zip">${z}</div>
        <div class="pp-name">${d.name}</div>
        <div class="pp-score-row"><span class="pp-score" style="color:${c}">${s}</span><span class="pp-tier" style="color:${ti.color}">${ti.name}</span></div>
        <div class="pp-sep"></div>
        <div class="pp-r"><span>Median Home</span><b>${fmt(d.medianHome)}</b></div>
        <div class="pp-r"><span>Median Income</span><b>${fmt(d.medianIncome)}</b></div>
        <div class="pp-r"><span>Per Capita</span><b>${fmt(d.perCapitaIncome)}</b></div>
        <div class="pp-r"><span>Business Index</span><b>${d.bizIndex}/100</b></div>
        <div class="pp-r"><span>5yr Growth</span><b style="color:${d.homeAppreciation5yr>=0?'#28d88e':'#f03060'}">${d.homeAppreciation5yr>0?'+':''}${fmtPct(d.homeAppreciation5yr)}</b></div>
        <div class="pp-r"><span>Population</span><b>${fmtNum(d.population)}</b></div>
        <div class="pp-hint">Click for full analysis →</div>
      `).addTo(map);
    }
  });
  map.on('mouseleave','twi-fill', () => {
    if (drillActive) return;
    map.getCanvas().style.cursor = '';
    if(hov!==null){map.setFeatureState({source:'twi-zips',id:hov},{hover:false});hov=null;}
    popup.remove();
  });
  map.on('click','twi-fill', e => { if(drillActive) return; if(e.features.length){openDetail(e.features[0].properties.zip);popup.remove();} });
  map.on('click', e => {
    if (drillActive) return; // don't interfere with business dot clicks during drill mode
    const f = map.queryRenderedFeatures(e.point, { layers:['twi-fill'] });
    if (!f.length) closeDetail();
  });
}

function buildFillExpr() {
  const e = ['match',['get','zip']];
  Object.keys(ZIP_DATA).forEach(z => e.push(z, rgba(calcScore(z,MODE), USE_3D ? 0.4 : 0.7)));
  e.push('rgba(0,0,0,0)'); return e;
}

function refreshMap() {
  if(!map||!geoData||!map.getSource('twi-zips')) return;
  geoData.features.forEach(f => { f.properties.score = calcScore(f.properties.zip,MODE); });
  map.getSource('twi-zips').setData(geoData);
  map.setPaintProperty('twi-fill','fill-color',buildFillExpr());
  if(USE_3D&&map.getLayer('twi-extrusion')) {
    const hE=['match',['get','zip']],cE=['match',['get','zip']];
    Object.keys(ZIP_DATA).forEach(z=>{const s=calcScore(z,MODE);hE.push(z,s*80);cE.push(z,hex(s));});
    hE.push(0);cE.push('#111');
    map.setPaintProperty('twi-extrusion','fill-extrusion-height',hE);
    map.setPaintProperty('twi-extrusion','fill-extrusion-color',cE);
  }
  map.setFilter('twi-border-sel',['==',['get','zip'],SELECTED||'']);
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function buildSidebar() {
  const sorted = Object.keys(ZIP_DATA).map(z=>({z,s:calcScore(z,MODE)})).sort((a,b)=>b.s-a.s);
  let html='', count=0;
  sorted.forEach(({z,s},i) => {
    const d=ZIP_DATA[z], t=s>=60?'high':s>=38?'mid':'low';
    if((TIER!=='all'&&TIER!==t)||(SEARCH&&!z.includes(SEARCH)&&!d.name.toLowerCase().includes(SEARCH)))return;
    count++;
    const c=hex(s);
    html+=`<div class="zip-row${SELECTED===z?' sel':''}" onmouseenter="prefetchBiz('${z}')" onclick="openDetail('${z}')">
      <span class="zr-rank">${i+1}</span>
      <span class="zr-badge" style="background:${c};color:${s>55?'#000':'#fff'}">${s}</span>
      <span class="zr-info">
        <span class="zr-zip">${z}</span>
        <span class="zr-name">${d.name}</span>
      </span>
      <span class="zr-right">
        <span class="zr-price">${fmt(d.medianHome)}</span>
        <span class="zr-income">${fmt(d.medianIncome)}</span>
      </span>
    </div>`;
  });
  document.getElementById('zip-list').innerHTML=html;
  document.getElementById('sb-count').textContent=`${count} zones`;
}

function updateKPIs() {
  const zips=Object.keys(ZIP_DATA),scores=zips.map(z=>calcScore(z,MODE));
  document.getElementById('kpi-avg').textContent=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  document.getElementById('kpi-top').textContent=zips.sort((a,b)=>calcScore(b,MODE)-calcScore(a,MODE))[0];
  document.getElementById('kpi-zones').textContent=zips.length;
}

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
function openDetail(zip) {
  SELECTED=zip; refreshMap(); buildSidebar();
  const d=ZIP_DATA[zip]; if(!d) return;
  const s=calcScore(zip,MODE), c=hex(s), ti=tierInfo(s), op=OPP_META[d.opp]||OPP_META.stable;

  document.getElementById('det-zip').textContent=zip;
  document.getElementById('det-name').textContent=d.name;
  document.getElementById('det-city').textContent=`${d.city}, Arizona · ${d.county} County`;

  // Ring animation
  const arc=document.getElementById('ring-arc'), circ=163.4;
  arc.setAttribute('stroke',c); arc.style.transition='none'; arc.setAttribute('stroke-dashoffset',circ);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    arc.style.transition='stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)';
    arc.setAttribute('stroke-dashoffset',circ-(s/100)*circ);
  }));
  document.getElementById('ring-num').textContent=s;
  document.getElementById('dst-tier').textContent=ti.name; document.getElementById('dst-tier').style.color=ti.color;
  const ranked=Object.keys(ZIP_DATA).sort((a,b)=>calcScore(b,MODE)-calcScore(a,MODE));
  document.getElementById('dst-rank').textContent=`#${ranked.indexOf(zip)+1} of ${ranked.length} ZIP codes`;
  document.getElementById('dst-opp').innerHTML=`${op.icon} <span style="color:${op.color}">${op.label}</span>`;

  const hP=Math.round(d.medianHome/MAX.medianHome*100);
  const iP=Math.round(d.medianIncome/MAX.medianIncome*100);
  const bP=d.bizIndex;
  const pP=Math.round(d.perCapitaIncome/MAX.perCapitaIncome*100);
  const gP=Math.round(Math.min(100,Math.max(0,(d.homeAppreciation5yr||0)/60*100)));
  const ac=d.homeAppreciation1yr>=0?'#28d88e':'#f03060';

  document.getElementById('det-body').innerHTML=`
    <div class="dp-sec">
      <div class="dp-sec-title">Real Estate</div>
      <div class="g4">
        <div class="g-card"><div class="gc-label">Median Home</div><div class="gc-value">${fmt(d.medianHome)}</div><div class="gc-bar"><div class="gc-fill" style="background:#00c8f0" data-w="${hP}"></div></div></div>
        <div class="g-card"><div class="gc-label">$/SqFt</div><div class="gc-value">$${d.pricePerSqFt}</div><div class="gc-sub">Median listing</div></div>
        <div class="g-card"><div class="gc-label">1yr Change</div><div class="gc-value" style="color:${ac}">${d.homeAppreciation1yr>0?'+':''}${fmtPct(d.homeAppreciation1yr)}</div></div>
        <div class="g-card"><div class="gc-label">5yr Growth</div><div class="gc-value" style="color:#28d88e">+${fmtPct(d.homeAppreciation5yr)}</div></div>
      </div>
      <div class="mini-row">
        <div class="mini-card"><div class="mc-v">${d.medDaysOnMarket}d</div><div class="mc-l">Days on Market</div></div>
        <div class="mini-card"><div class="mc-v">${fmtPct(d.listPriceVsSale)}</div><div class="mc-l">List/Sale Ratio</div></div>
        <div class="mini-card"><div class="mc-v">${d.ownerOccupied}%</div><div class="mc-l">Owner-Occupied</div></div>
      </div>
    </div>

    <div class="dp-sec">
      <div class="dp-sec-title">Income & Wealth</div>
      <div class="g4">
        <div class="g-card"><div class="gc-label">Median HH</div><div class="gc-value">${fmt(d.medianIncome)}</div><div class="gc-bar"><div class="gc-fill" style="background:#e8a020" data-w="${iP}"></div></div></div>
        <div class="g-card"><div class="gc-label">Average HH</div><div class="gc-value">${fmt(d.avgIncome)}</div><div class="gc-sub">Mean household</div></div>
        <div class="g-card"><div class="gc-label">Per Capita</div><div class="gc-value">${fmt(d.perCapitaIncome)}</div><div class="gc-bar"><div class="gc-fill" style="background:#a78bfa" data-w="${pP}"></div></div></div>
        <div class="g-card"><div class="gc-label">Poverty Rate</div><div class="gc-value" style="color:${d.povertyRate>15?'#f07830':'#28d88e'}">${fmtPct(d.povertyRate)}</div></div>
      </div>
    </div>

    <div class="dp-sec">
      <div class="dp-sec-title">Demographics</div>
      <div class="demo-g">
        <div class="demo-card"><div class="demo-v">${fmtNum(d.population)}</div><div class="demo-l">Population</div></div>
        <div class="demo-card"><div class="demo-v">${fmtNum(d.households)}</div><div class="demo-l">Households</div></div>
        <div class="demo-card"><div class="demo-v">${d.medAge}</div><div class="demo-l">Median Age</div></div>
        <div class="demo-card"><div class="demo-v">${fmtPct(d.unemployment)}</div><div class="demo-l">Unemploy.</div></div>
        <div class="demo-card"><div class="demo-v">${d.collegeEd}%</div><div class="demo-l">College Ed.</div></div>
        <div class="demo-card"><div class="demo-v">${d.households?Math.round(d.population/d.households*10)/10:'—'}</div><div class="demo-l">HH Size</div></div>
      </div>
    </div>

    <div class="dp-sec">
      <div class="dp-sec-title">Commercial Market</div>
      <div class="g4">
        <div class="g-card"><div class="gc-label">Business Index</div><div class="gc-value" style="color:${hex(d.bizIndex)}">${d.bizIndex}/100</div><div class="gc-bar"><div class="gc-fill" style="background:#f07830" data-w="${bP}"></div></div></div>
        <div class="g-card"><div class="gc-label">Businesses</div><div class="gc-value">${fmtNum(d.totalBusinesses)}</div></div>
        <div class="g-card"><div class="gc-label">Vacancy Rate</div><div class="gc-value" style="color:${d.vacancyRate>12?'#f07830':'#28d88e'}">${fmtPct(d.vacancyRate)}</div></div>
        <div class="g-card"><div class="gc-label">Avg Rent/SF</div><div class="gc-value">$${d.avgRent?.toFixed(2)}</div></div>
      </div>
    </div>

    <div class="dp-sec">
      <div class="dp-sec-title">Score Breakdown</div>
      ${[['Home Values',hP,'#00c8f0'],['Household Income',iP,'#e8a020'],['Business Index',bP,'#f07830'],['Per-Capita Income',pP,'#a78bfa'],['5yr Appreciation',gP,'#28d88e']].map(([l,v,col])=>`
        <div class="br"><span class="br-label">${l}</span><div class="br-track"><div class="br-fill" style="background:${col}" data-w="${v}"></div></div><span class="br-num">${v}</span></div>`).join('')}
    </div>

    <div class="dp-sec">
      <div class="dp-sec-title">Top Target Sectors</div>
      <div class="sector-list">${(d.sectors||[]).map((s,i)=>`<div class="sector-item"><span class="sector-num">${i+1}</span>${s}</div>`).join('')}</div>
    </div>

    <div class="dp-sec">
      <div class="dp-sec-title">Market Characteristics</div>
      <div class="tag-wrap">${d.tags.map(t=>`<div class="tag" style="color:${c};border-color:${c}44;background:${c}10">${t}</div>`).join('')}</div>
    </div>

    <div class="dp-sec">
      <div class="dp-sec-title">Opportunity Classification</div>
      <div class="opp-card" style="border-color:${op.color}33">
        <div class="opp-icon">${op.icon}</div>
        <div><div class="opp-name" style="color:${op.color}">${op.label}</div><div class="opp-desc">${op.desc}</div></div>
      </div>
    </div>

    <div class="dp-sec">
      <div class="dp-sec-title">Intelligence Brief</div>
      <div class="intel-brief">${d.brief}</div>
    </div>

    <div class="dp-sec">
      <div class="dp-sec-title">Data Sources</div>
      <div class="data-src">Home values: Redfin listing data (Apr 2026) · Income: ACS 2023 5-Year Estimates · Business data: CoStar / AZ Dept of Revenue (2023) · Appreciation: Zillow ZHVI (2024-2025) · ZIP Boundaries: Census TIGER/Line ZCTA (2023)</div>
    </div>

    <div class="dp-sec">
      <div class="action-row">
        <button class="dp-action-btn cyan" onclick="addToCompare()">⇌ Add to Compare</button>
        <button class="dp-action-btn gold" onclick="flyToZip('${zip}')">⊙ Zoom to Zone</button>
      </div>
    </div>
  `;

  requestAnimationFrame(()=>{
    document.querySelectorAll('[data-w]').forEach(el=>{
      el.style.transition='width .9s cubic-bezier(.16,1,.3,1)';
      el.style.width=el.dataset.w+'%';
    });
  });

  // Wire drill button
  const btn=document.getElementById('drill-btn');
  if(btn) btn.onclick=()=>{ btn.classList.add('active'); enterDrillMode(zip); };

  document.getElementById('detail-panel').classList.add('open');
  flyToZip(zip);

  // Pre-fetch business data in background so it's instant when user zooms in
  if (!drillCache[zip]) {
    setTimeout(() => {
      if (!drillCache[zip]) {
        console.log('[Prefetch] Loading businesses for', zip);
        fetchBusinesses(zip).then(biz => {
          drillCache[zip] = biz || [];
          console.log('[Prefetch] Cached', drillCache[zip].length, 'businesses for', zip);
        }).catch(() => { drillCache[zip] = []; });
      }
    }, 800); // small delay so it doesn't compete with map animation
  }
}

function closeDetail() {
  SELECTED=null; document.getElementById('detail-panel').classList.remove('open');
  const b=document.getElementById('drill-btn'); if(b)b.classList.remove('active');
  refreshMap(); buildSidebar();
}

function flyToZip(zip) {
  if(!geoData||!map) return;
  const feat=geoData.features.find(f=>f.properties.zip===zip); if(!feat) return;
  const coords=feat.geometry.type==='MultiPolygon'?feat.geometry.coordinates.flat(2):feat.geometry.coordinates.flat(1);
  const lngs=coords.map(c=>c[0]),lats=coords.map(c=>c[1]);
  map.fitBounds([[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]],{padding:80,maxZoom:14,duration:1200});
}

// ── COMPARE ───────────────────────────────────────────────────────────────────
function toggleCompare() {
  CMP_OPEN=!CMP_OPEN;
  document.getElementById('cmp-bar').classList.toggle('show',CMP_OPEN);
  document.getElementById('compare-btn').classList.toggle('on',CMP_OPEN);
  if(!CMP_OPEN){CMP_A=CMP_B=null;updateCmpSlots();}
  else toast('Select two zones and click "Add to Compare" in the detail panel');
}

function addToCompare() {
  if(!SELECTED)return toast('Open a ZIP first');
  if(!CMP_OPEN)toggleCompare();
  if(CMP_A===SELECTED||CMP_B===SELECTED)return toast(`${SELECTED} already in comparison`);
  if(!CMP_A){CMP_A=SELECTED;toast(`${SELECTED} → Slot A ✓`);}
  else if(!CMP_B){CMP_B=SELECTED;toast(`${SELECTED} → Slot B ✓`);}
  else return toast('Both slots filled — clear to reset');
  updateCmpSlots();
}

function updateCmpSlots() {
  const sa=document.getElementById('cmp-a'),sb=document.getElementById('cmp-b'),go=document.getElementById('cmp-run');
  if(CMP_A){const s=calcScore(CMP_A,MODE);sa.innerHTML=`<strong style="font-family:var(--font-display);font-size:16px;letter-spacing:.5px">${CMP_A}</strong><span style="color:${hex(s)};font-family:var(--font-mono);font-size:12px;margin-left:8px">${s}</span>`;sa.classList.add('filled');}
  else{sa.textContent='Select Zone A';sa.classList.remove('filled');}
  if(CMP_B){const s=calcScore(CMP_B,MODE);sb.innerHTML=`<strong style="font-family:var(--font-display);font-size:16px;letter-spacing:.5px">${CMP_B}</strong><span style="color:${hex(s)};font-family:var(--font-mono);font-size:12px;margin-left:8px">${s}</span>`;sb.classList.add('filled');}
  else{sb.textContent='Select Zone B';sb.classList.remove('filled');}
  go.disabled=!(CMP_A&&CMP_B);
}

function runCompare() {
  if(!CMP_A||!CMP_B)return;
  const dA=ZIP_DATA[CMP_A],dB=ZIP_DATA[CMP_B],sA=calcScore(CMP_A,MODE),sB=calcScore(CMP_B,MODE);
  const cA=hex(sA),cB=hex(sB),opA=OPP_META[dA.opp],opB=OPP_META[dB.opp];
  const rows=[
    ['Composite Score',sA,sB,v=>v+' pts',false],
    ['Median Home Value',dA.medianHome,dB.medianHome,fmt,false],
    ['Median HH Income',dA.medianIncome,dB.medianIncome,fmt,false],
    ['Average HH Income',dA.avgIncome,dB.avgIncome,fmt,false],
    ['Per-Capita Income',dA.perCapitaIncome,dB.perCapitaIncome,fmt,false],
    ['Business Index',dA.bizIndex,dB.bizIndex,v=>v+'/100',false],
    ['5yr Appreciation',dA.homeAppreciation5yr,dB.homeAppreciation5yr,fmtPct,false],
    ['Vacancy Rate',dA.vacancyRate,dB.vacancyRate,fmtPct,true],
    ['Unemployment',dA.unemployment,dB.unemployment,fmtPct,true],
    ['Population',dA.population,dB.population,fmtNum,false],
    ['Avg Rent/SF',dA.avgRent,dB.avgRent,v=>'$'+v?.toFixed(2),false],
  ];
  const w=sA>sB?CMP_A:sB>sA?CMP_B:'TIE';

  document.getElementById('cmp-box').innerHTML=`
    <div class="cmp-modal-hd">
      <div><div class="cmp-modal-title">Market Comparison</div><div class="cmp-modal-sub">${MODE.toUpperCase()} analysis · ACS 2023 / Redfin 2026</div></div>
      <button onclick="closeCmp()" class="modal-x"><svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    </div>
    <div class="cmp-heads">
      <div class="cmp-hcell"><div class="cmp-hz" style="color:${cA}">${CMP_A}</div><div class="cmp-hn">${dA.name}</div><div class="cmp-hs" style="color:${cA}">${sA}</div><div class="cmp-hopp">${opA.icon} ${opA.label}</div></div>
      <div class="cmp-vs-mid">VS</div>
      <div class="cmp-hcell"><div class="cmp-hz" style="color:${cB}">${CMP_B}</div><div class="cmp-hn">${dB.name}</div><div class="cmp-hs" style="color:${cB}">${sB}</div><div class="cmp-hopp">${opB.icon} ${opB.label}</div></div>
    </div>
    <div class="cmp-table">
      ${rows.map(([lbl,vA,vB,f,lw])=>{
        const aW=lw?vA<vB:vA>vB,bW=lw?vB<vA:vB>vA;
        return`<div class="cmp-row">
          <div class="cmp-val-cell ${aW?'win':bW?'lose':''}">${f(vA)}</div>
          <div class="cmp-lbl-cell">${lbl}</div>
          <div class="cmp-val-cell ${bW?'win':aW?'lose':''}">${f(vB)}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="cmp-verdict">
      <div class="cv-title">${w==='TIE'?'🤝 Analysis: Tied — Different Strengths':`🏆 ${w} Leads This Comparison`}</div>
      <div class="cv-body">${w==='TIE'?`Both zones score equally at ${sA}. Evaluate based on your specific investment category.`:`<strong>${w===CMP_A?dA.name:dB.name}</strong> outperforms with a composite score of <strong style="color:${w===CMP_A?cA:cB}">${Math.max(sA,sB)}</strong> vs <strong style="color:${w===CMP_A?cB:cA}">${Math.min(sA,sB)}</strong>. Classified as <strong>${(w===CMP_A?opA:opB).label}</strong>. ${w===CMP_A?dA.brief:dB.brief}`}</div>
    </div>
    <button class="modal-close-btn" onclick="closeCmp()">Close Comparison</button>
  `;
  document.getElementById('cmp-modal').classList.add('show');
}
function closeCmp(){document.getElementById('cmp-modal').classList.remove('show');}

// ── CONTROLS ──────────────────────────────────────────────────────────────────
const MODE_LABELS={composite:'Composite Wealth Score',homes:'Median Home Values',income:'Household Income',business:'Business Revenue Index',growth:'5-Year Appreciation'};

function setMode(btn) {
  MODE=btn.dataset.mode;
  document.querySelectorAll('.ltab').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('leg-title').textContent=MODE_LABELS[MODE];
  refreshMap(); buildSidebar(); updateKPIs();
  if(SELECTED)openDetail(SELECTED);
}

function setStyle(btn) {
  document.querySelectorAll('.sty').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  map.setStyle(MAP_STYLES[btn.dataset.style]);
}

function toggleLabels() {
  LABELS=!LABELS;
  document.getElementById('labels-btn').classList.toggle('on',LABELS);
  if(map.getLayer('twi-labels'))map.setLayoutProperty('twi-labels','visibility',LABELS?'visible':'none');
}

function toggle3D() {
  USE_3D=!USE_3D; window._use3D=USE_3D;
  document.getElementById('threed-btn').classList.toggle('on',USE_3D);
  map.easeTo({pitch:USE_3D?45:0,bearing:USE_3D?-15:0,duration:1000});
  if(geoData)addLayers(geoData);
}

let toastT;
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),2600);}


// ── ZOOM-TRIGGERED DRILL-DOWN ─────────────────────────────────────────────────
// Auto-triggers when user zooms past 13.5 with one ZIP dominating the viewport.
// Fades out wealth heatmap → overlays live OSM business revenue heat map.
// Hot red streets = high revenue business clusters. Empty streets = transparent.

const DRILL_ZOOM = 12.0;
let drillActive = false, drillZip = null;
const drillCache = {};       // zip → businesses (persists per session)
let drillTimer = null, drillClicksReady = false;

function rwColor(w){if(w>=9)return'#f03060';if(w>=7)return'#f07830';if(w>=5)return'#e8a020';if(w>=3)return'#28d88e';return'#00c8f0';}
function rwStars(w){return'★'.repeat(Math.min(Math.ceil(w/2),5))+'☆'.repeat(5-Math.min(Math.ceil(w/2),5));}

function initZoomDrill() {
  map.on('zoomend', () => {
    clearTimeout(drillTimer);
    // Always check on zoom — this is how we exit drill when zooming out
    drillTimer = setTimeout(checkDrill, 150);
  });
  map.on('moveend', () => {
    // Only check on move if NOT already in drill (panning within drill is fine)
    // Exception: if zoom is below threshold, always check so we can exit
    if (drillActive && map.getZoom() >= DRILL_ZOOM) return;
    clearTimeout(drillTimer);
    drillTimer = setTimeout(checkDrill, 150);
  });

  // Hover tooltip — show business info on dot hover
  const hoverPop = new mapboxgl.Popup({
    closeButton: false, closeOnClick: false,
    className: 'hover-popup', maxWidth: '220px', offset: 12
  });

  map.on('mouseenter', 'drill-dots', e => {
    if (!drillActive || !e.features.length) return;
    map.getCanvas().style.cursor = 'pointer';
    const p = e.features[0].properties;
    const clr = rwColor(p.weight);
    const stars = rwStars(p.weight);
    hoverPop.setLngLat(e.features[0].geometry.coordinates).setHTML(
      '<div class="hp-icon-name"><span class="hp-icon">' + p.icon + '</span>' +
      '<div><div class="hp-name">' + p.name + '</div>' +
      '<div class="hp-cat">' + p.label + '</div></div></div>' +
      '<div class="hp-stars" style="color:' + clr + '">' + stars + '</div>' +
      '<div class="hp-rev" style="color:' + clr + '">Revenue Index: ' + p.weight + '/10</div>' +
      (p.address ? '<div class="hp-addr">📍 ' + p.address + '</div>' : '') +
      (p.phone   ? '<div class="hp-addr">📞 ' + p.phone   + '</div>' : '') +
      (p.hours   ? '<div class="hp-addr">🕐 ' + p.hours.substring(0,45) + '</div>' : '') +
      '<div class="hp-hint">Click for full details →</div>'
    ).addTo(map);
  });

  map.on('mouseleave', 'drill-dots', () => {
    map.getCanvas().style.cursor = '';
    hoverPop.remove();
  });

  // RELIABLE CLICK: use general map click + queryRenderedFeatures
  // This works regardless of minzoom or layer rendering state
  map.on('click', e => {
    if (!drillActive) return;

    // Query a small box around the click point for better hit detection
    const bbox = [
      [e.point.x - 10, e.point.y - 10],
      [e.point.x + 10, e.point.y + 10]
    ];

    const features = map.queryRenderedFeatures(bbox, { layers: ['drill-dots'] });

    if (features.length > 0) {
      // Hit a business dot
      e.originalEvent.stopPropagation();
      hoverPop.remove();
      const p = features[0].properties;
      const coords = features[0].geometry.coordinates;
      openBizDetail(p, coords[1], coords[0]);
    }
  });
}
function checkDrill() {
  const zoom = map.getZoom();
  if (zoom < DRILL_ZOOM) {
    // Always clean up drill layers even if drillActive flag is wrong
    if (drillActive) leaveDrill(false);
    // Belt-and-suspenders: remove layers directly even if leaveDrill missed them
    ['drill-heat','drill-dots','drill-labels'].forEach(id => {
      try { if (map.getLayer(id)) map.removeLayer(id); } catch(e) {}
    });
    try { if (map.getSource('drill-src')) map.removeSource('drill-src'); } catch(e) {}
    return;
  }

  // Sample 5 points across viewport — need 3+ on same ZIP to trigger
  const W = map.getCanvas().clientWidth;
  const H = map.getCanvas().clientHeight;
  const hits = {};
  [[W/2,H/2],[W*0.35,H*0.35],[W*0.65,H*0.35],[W*0.35,H*0.65],[W*0.65,H*0.65]]
    .forEach(pt => {
      const f = map.queryRenderedFeatures(pt, { layers:['twi-fill'] });
      if (f.length && f[0].properties.zip) {
        const z = f[0].properties.zip;
        hits[z] = (hits[z]||0) + 1;
      }
    });

  const winner = Object.entries(hits).sort((a,b)=>b[1]-a[1])[0];
  if (!winner || winner[1] < 3) return;
  const [zip] = winner;
  if (drillActive && drillZip === zip) return; // already showing this ZIP
  enterDrill(zip);
}

async function enterDrill(zip) {
  drillActive = true;
  drillZip = zip;
  window.drillZip = zip;
  const d = ZIP_DATA[zip]; if (!d) return;

  // Immediately kill the ZIP hover popup so it doesn't block dot interactions
  if (popup) popup.remove();

  // Show badge
  const badge = document.getElementById('zoom-mode-badge');
  if (badge) {
    badge.classList.remove('hidden');
    document.getElementById('zb-zip').textContent = zip + ' · ' + d.name;
  }

  // Remove any lingering ZIP hover popup
  if (popup) popup.remove();

  // Fade out wealth heatmap — streets from dark-v11 show through naturally at zoom 13+
  if (map.getLayer('twi-extrusion')) map.setPaintProperty('twi-extrusion','fill-extrusion-opacity',0.03);
  if (map.getLayer('twi-fill'))      map.setPaintProperty('twi-fill','fill-opacity',0.03);
  if (map.getLayer('twi-border'))    map.setPaintProperty('twi-border','line-opacity',0.12);
  if (map.getLayer('twi-labels'))    map.setLayoutProperty('twi-labels','visibility','none');

  // Close ZIP wealth panel and business detail panel so they don't block the street view
  document.getElementById('detail-panel')?.classList.remove('open');
  document.getElementById('biz-detail-panel')?.classList.remove('open');

  // Update badge with loading state
  const zbEl = document.getElementById('zb-zip');

  // Use cache if we already fetched this ZIP
  if (drillCache[zip]) {
    paintDrill(drillCache[zip]);
    if (zbEl) zbEl.textContent = zip + ' · ' + d.name + ' (' + drillCache[zip].length + ' businesses)';
    return;
  }

  if (zbEl) zbEl.textContent = zip + ' · Loading businesses…';

  // Make sure geoData is available before fetching
  // (drill.js uses window._geoData for the polygon bbox)
  if (!window._geoData && geoData) window._geoData = geoData;

  try {
    const businesses = await fetchBusinesses(zip);
    drillCache[zip] = businesses;
    paintDrill(businesses);
    if (zbEl) {
    if (businesses.length === 0) {
      zbEl.textContent = zip + ' · ' + d.name + ' — No commercial businesses in OSM data (residential zone)';
    } else {
      zbEl.textContent = zip + ' · ' + d.name + ' (' + businesses.length + ' businesses found)';
    }
  }
  } catch(err) {
    console.error('[Drill] fetch failed:', err);
    drillCache[zip] = [];
    if (zbEl) zbEl.textContent = zip + ' · Could not load data';
  }
}

function paintDrill(businesses) {
  // Remove existing drill layers
  ['drill-heat','drill-dots','drill-labels'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource('drill-src')) map.removeSource('drill-src');

  if (!businesses || !businesses.length) {
    console.warn('[Drill] No businesses to render');
    return;
  }

  const geojson = {
    type:'FeatureCollection',
    features: businesses.filter(b => b.lat && b.lng).map(b => ({
      type:'Feature',
      geometry:{ type:'Point', coordinates:[b.lng, b.lat] },
      properties:{
        name:    b.name    || 'Unknown',
        weight:  b.cat?.weight || 3,
        color:   b.cat?.color  || '#28d88e',
        icon:    b.cat?.icon   || '🏪',
        label:   b.cat?.label  || 'Business',
        group:   b.cat?.group  || 'retail',
        address: b.address || '',
        phone:   b.phone   || '',
        hours:   (b.opening||'').substring(0,60)
      }
    }))
  };

  console.log('[Drill] Rendering', geojson.features.length, 'business points');
  map.addSource('drill-src', { type:'geojson', data:geojson });

  // ── LAYER 1: Revenue density heatmap ──────────────────────────────────────
  // High-revenue businesses (banks, hospitals, car dealers) cluster → RED
  // Low-revenue (schools, churches) → cool blue
  // Empty streets → fully transparent (base map shows through)
  map.addLayer({
    id:'drill-heat', type:'heatmap', source:'drill-src',
    paint:{
      'heatmap-weight':['interpolate',['linear'],['get','weight'],
        1,0.10, 3,0.30, 5,0.55, 7,0.78, 10,1.0],
      'heatmap-intensity':['interpolate',['linear'],['zoom'],
        13,1.0, 14,1.8, 15,3.0, 16,5.0, 17,7.0],
      'heatmap-radius':['interpolate',['linear'],['zoom'],
        13,50, 14,38, 15,26, 16,16, 17,10],
      'heatmap-color':['interpolate',['linear'],['heatmap-density'],
        0,    'rgba(0,0,0,0)',
        0.03, 'rgba(4,15,55,0.50)',
        0.12, 'rgba(8,65,140,0.68)',
        0.28, 'rgba(12,140,110,0.76)',
        0.46, 'rgba(35,190,65,0.83)',
        0.62, 'rgba(200,175,10,0.88)',
        0.76, 'rgba(232,88,12,0.93)',
        0.88, 'rgba(212,15,38,0.97)',
        1.00, 'rgba(155,0,28,1.0)'
      ],
      'heatmap-opacity':['interpolate',['linear'],['zoom'],
        13,0.90, 14,0.86, 15,0.75, 16,0.55, 17,0.30]
    }
  });

  // ── LAYER 2: Business dots (zoom 14+, sized by revenue) ──────────────────
  map.addLayer({
    id:'drill-dots', type:'circle', source:'drill-src', minzoom:14,
    paint:{
      'circle-radius':['interpolate',['linear'],['zoom'],
        14,['interpolate',['linear'],['get','weight'],1,3, 5,5, 10,7],
        16,['interpolate',['linear'],['get','weight'],1,5, 5,11,10,16],
        18,['interpolate',['linear'],['get','weight'],1,8, 5,16,10,22]
      ],
      'circle-color':['get','color'],
      'circle-opacity':['interpolate',['linear'],['zoom'],14,0.20,15,0.82,17,0.95],
      'circle-stroke-color':'#ffffff',
      'circle-stroke-width':['interpolate',['linear'],['zoom'],14,0.5,16,2.0],
      'circle-stroke-opacity':['interpolate',['linear'],['zoom'],14,0.1,15,0.6,17,0.9]
    }
  });

  // ── LAYER 3: Business name labels (zoom 15.5+) ────────────────────────────
  map.addLayer({
    id:'drill-labels', type:'symbol', source:'drill-src', minzoom:15.5,
    layout:{
      'text-field':['concat',['get','icon'],' ',['get','name']],
      'text-font':['DIN Pro Regular','Arial Unicode MS Regular'],
      'text-size':['interpolate',['linear'],['zoom'],15.5,10,17,13,18,15],
      'text-anchor':'top','text-offset':[0,0.9],
      'text-allow-overlap':false,'text-max-width':12
    },
    paint:{ 'text-color':'#fff','text-halo-color':'rgba(0,0,0,0.92)','text-halo-width':2.2 }
  });

  // Interactions registered once in initZoomDrill() below
}

// ── BUSINESS INTELLIGENCE PANEL ──────────────────────────────────────────────
// Slides in from the right on business dot click
// Shows verified name, category, contact info, photo, revenue intelligence,
// market context, and direct action links

function openBizDetail(p, lat, lng) {
  const panel = document.getElementById('biz-detail-panel');
  if (!panel) return;

  const clr   = rwColor(p.weight);
  const stars  = rwStars(p.weight);
  const zip   = drillZip || '';
  const zipD  = ZIP_DATA[zip] || {};

  // Revenue tier
  const tier = p.weight>=9 ? 'Ultra High Revenue Category' :
               p.weight>=7 ? 'High Revenue Category' :
               p.weight>=5 ? 'Mid Revenue Category' :
               p.weight>=3 ? 'Lower Revenue Category' : 'Low Revenue Category';

  // Market context — how does this biz fit this ZIP?
  const zipScore = zip ? calcScore(zip,'composite') : 0;
  const marketFit = getMarketFit(p.group, zip, zipD);

  // Data source badge
  const srcBadge = p.source === 'foursquare'
    ? '<span class="src-badge src-fsq">Foursquare Verified</span>'
    : '<span class="src-badge src-osm">OpenStreetMap</span>';

  // Photo — use Foursquare photo, or Mapbox satellite fallback
  const mapImg = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},17,0/380x200?access_token=${MAPBOX_TOKEN}`;
  const photoSrc = p.photoUrl || mapImg;

  // Rating display
  const ratingHtml = p.rating
    ? `<div class="bdp-rating"><span class="bdp-rating-num">${(p.rating/2).toFixed(1)}</span><span class="bdp-rating-stars">${'★'.repeat(Math.round(p.rating/2))}${'☆'.repeat(5-Math.round(p.rating/2))}</span><span class="bdp-rating-src">Foursquare</span></div>`
    : '';

  // Price display
  const priceMap = {1:'$', 2:'$$', 3:'$$$', 4:'$$$$'};
  const priceHtml = p.price
    ? `<span class="bdp-price">${priceMap[p.price] || ''}</span>`
    : '';

  panel.innerHTML = `
    <div class="bdp-topbar">
      <div class="bdp-back" onclick="closeBizDetail()">
        <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Back to ${zip} Businesses
      </div>
      ${srcBadge}
    </div>

    <div class="bdp-photo-wrap">
      <img class="bdp-photo" src="${photoSrc}"
           onerror="this.src='${mapImg}'"
           alt="${p.name}">
      <div class="bdp-photo-overlay">
        <span class="bdp-photo-type">${p.icon} ${p.label}</span>
        ${priceHtml}
      </div>
    </div>

    <div class="bdp-content">

      <div class="bdp-name-block">
        <div class="bdp-biz-name">${p.name}</div>
        <div class="bdp-biz-sub">${p.label} · ${zip ? zip + ' ' + (zipD.name||'') : ''}</div>
        ${ratingHtml}
        ${p.description ? `<div class="bdp-description">${p.description}</div>` : ''}
      </div>

      <!-- REVENUE INTELLIGENCE CARD -->
      <div class="bdp-intel-card" style="border-color:${clr}22">
        <div class="bdp-intel-header">
          <div class="bdp-intel-title">Revenue Intelligence</div>
          <div class="bdp-intel-score" style="color:${clr}">${p.weight}<span>/10</span></div>
        </div>
        <div class="bdp-intel-stars" style="color:${clr}">${stars}</div>
        <div class="bdp-intel-tier" style="color:${clr}">${tier}</div>
        <div class="bdp-intel-bar">
          <div class="bdp-intel-fill" style="width:${p.weight*10}%;background:${clr}"></div>
        </div>
        <div class="bdp-intel-desc">${getRevenueDesc(p.label, p.weight)}</div>
      </div>

      <!-- MARKET CONTEXT CARD -->
      ${zip ? `
      <div class="bdp-context-card">
        <div class="bdp-context-title">Market Context — ZIP ${zip}</div>
        <div class="bdp-context-grid">
          <div class="bdp-ctx-item">
            <div class="bdp-ctx-val">${zipScore}</div>
            <div class="bdp-ctx-lbl">Zone Score</div>
          </div>
          <div class="bdp-ctx-item">
            <div class="bdp-ctx-val">${zipD.medianIncome ? '$'+Math.round(zipD.medianIncome/1000)+'K' : '—'}</div>
            <div class="bdp-ctx-lbl">Median Income</div>
          </div>
          <div class="bdp-ctx-item">
            <div class="bdp-ctx-val">${zipD.population ? Math.round(zipD.population/1000)+'K' : '—'}</div>
            <div class="bdp-ctx-lbl">Population</div>
          </div>
          <div class="bdp-ctx-item">
            <div class="bdp-ctx-val">${zipD.vacancyRate ? zipD.vacancyRate+'%' : '—'}</div>
            <div class="bdp-ctx-lbl">Vacancy Rate</div>
          </div>
        </div>
        <div class="bdp-fit-label">Market Fit Analysis</div>
        <div class="bdp-fit-text">${marketFit}</div>
      </div>` : ''}

      <!-- CONTACT INFORMATION -->
      <div class="bdp-contact-card">
        <div class="bdp-card-title">Contact & Hours</div>
        ${p.address ? `
        <div class="bdp-contact-row">
          <span class="bdp-contact-icon">📍</span>
          <div>
            <div class="bdp-contact-label">Address</div>
            <div class="bdp-contact-val">${p.address}</div>
          </div>
        </div>` : ''}
        ${p.phone ? `
        <div class="bdp-contact-row">
          <span class="bdp-contact-icon">📞</span>
          <div>
            <div class="bdp-contact-label">Phone</div>
            <div class="bdp-contact-val"><a href="tel:${p.phone}" style="color:var(--cyan)">${p.phone}</a></div>
          </div>
        </div>` : ''}
        ${p.opening ? `
        <div class="bdp-contact-row">
          <span class="bdp-contact-icon">🕐</span>
          <div>
            <div class="bdp-contact-label">Hours</div>
            <div class="bdp-contact-val">${p.opening}</div>
          </div>
        </div>` : ''}
        ${p.website ? `
        <div class="bdp-contact-row">
          <span class="bdp-contact-icon">🌐</span>
          <div>
            <div class="bdp-contact-label">Website</div>
            <div class="bdp-contact-val"><a href="${p.website}" target="_blank" style="color:var(--cyan)">${p.website.replace(/https?:\/\//,'').substring(0,35)}${p.website.length>40?'…':''}</a></div>
          </div>
        </div>` : ''}
        ${!p.address && !p.phone && !p.opening && !p.website ? '<div style="color:var(--text-3);font-size:11px;text-align:center;padding:8px">Contact details not available in data source</div>' : ''}
      </div>

      <!-- ACTION BUTTONS -->
      <div class="bdp-actions">
        <a class="bdp-action-btn bdp-action-primary"
           href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + (p.address ? ' ' + p.address : ' Tucson AZ'))}"
           target="_blank">
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><circle cx="8" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M8 2C5.2 2 3 4.2 3 7c0 3.5 5 9 5 9s5-5.5 5-9c0-2.8-2.2-5-5-5z" stroke="currentColor" stroke-width="1.5"/></svg>
          Open in Google Maps
        </a>
        <a class="bdp-action-btn bdp-action-secondary"
           href="https://www.google.com/maps/@${lat},${lng},19z"
           target="_blank">
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 6h12M6 2v12" stroke="currentColor" stroke-width="1.5"/></svg>
          Street View
        </a>
        ${p.website ? `
        <a class="bdp-action-btn bdp-action-secondary"
           href="${p.website}" target="_blank">
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 2s-3 2-3 6 3 6 3 6M8 2s3 2 3 6-3 6-3 6M2 8h12" stroke="currentColor" stroke-width="1.5"/></svg>
          Website
        </a>` : ''}
      </div>

      <div class="bdp-data-src">${srcBadge} · Data via ${p.source === 'foursquare' ? 'Foursquare Places' : 'OpenStreetMap'}</div>
    </div>
  `;

  panel.classList.add('open');
}

function closeBizDetail() {
  const panel = document.getElementById('biz-detail-panel');
  if (panel) panel.classList.remove('open');
}

function getMarketFit(group, zip, d) {
  if (!d || !zip) return 'No market data available for this zone.';
  const income = d.medianIncome || 0;
  const score  = calcScore(zip, 'composite');
  const sectors = d.sectors || [];
  const isTargetSector = sectors.some(s => s.toLowerCase().includes(group));

  if (income >= 90000 && ['food','retail','wellness','hospitality'].includes(group)) {
    return `Strong fit. ${d.name} median income of $${income.toLocaleString()} indicates substantial discretionary spending capacity for ${group} businesses. Wealth score ${score}/100 confirms premium positioning viability.`;
  }
  if (group === 'medical' && income >= 60000) {
    return `Excellent fit. Medical and healthcare businesses perform consistently across income levels. ${d.name} (score: ${score}) offers a stable patient base with ${d.population?.toLocaleString() || 'significant'} residents within the zone.`;
  }
  if (group === 'finance' && income >= 80000) {
    return `High fit. Financial services businesses thrive in ${d.name} given the $${income.toLocaleString()} median income. This zone shows ${score >= 70 ? 'premium' : 'solid'} wealth concentration making it viable for wealth management, banking, and advisory services.`;
  }
  if (group === 'auto' && income >= 55000) {
    return `Solid fit. Auto services and dealerships have consistent demand across income levels. ${d.name} vacancy rate of ${d.vacancyRate || '?'}% and population of ${d.population?.toLocaleString() || '?'} support steady auto-related traffic.`;
  }
  return `${d.name} has a composite wealth score of ${score}/100 with ${d.population?.toLocaleString() || '?'} residents and median income of $${income.toLocaleString()}. Evaluate ${group} category demand against local competition density.`;
}

function getRevenueDesc(label, weight) {
  if (weight >= 9) return `${label} businesses are among the highest revenue-generating categories in any commercial zone. Anchors retail corridors and drives significant foot traffic and economic activity.`;
  if (weight >= 7) return `${label} businesses generate strong, consistent revenue with broad customer bases. Typically recession-resistant with repeat patronage patterns.`;
  if (weight >= 5) return `${label} operations produce solid mid-tier revenue serving a reliable local customer base. Performance is closely tied to surrounding demographics and income levels.`;
  if (weight >= 3) return `${label} businesses contribute stable community-level revenue. Success depends heavily on local foot traffic, population density, and disposable income.`;
  return `${label} operations serve community infrastructure roles with lower direct revenue impact. Value is in supporting ecosystem and foot traffic generation for adjacent businesses.`;
}


function leaveDrill(fly=true) {
  drillActive = false; drillZip = null;
  const badge = document.getElementById('zoom-mode-badge');
  if (badge) badge.classList.add('hidden');
  ['drill-heat','drill-dots','drill-labels'].forEach(id=>{if(map.getLayer(id))map.removeLayer(id);});
  if (map.getSource('drill-src')) map.removeSource('drill-src');
  if (window._drillPop) { window._drillPop.remove(); window._drillPop=null; }
  document.getElementById('biz-detail-panel')?.classList.remove('open');
  if (map.getLayer('twi-extrusion')) map.setPaintProperty('twi-extrusion','fill-extrusion-opacity',0.78);
  if (map.getLayer('twi-fill'))      map.setPaintProperty('twi-fill','fill-opacity',['case',['boolean',['feature-state','hover'],false],0.88,USE_3D?0.35:0.68]);
  if (map.getLayer('twi-border'))    map.setPaintProperty('twi-border','line-opacity',0.9);
  if (map.getLayer('twi-labels'))    map.setLayoutProperty('twi-labels','visibility','visible');
  if (fly) map.flyTo({center:[-110.97,32.21],zoom:9.8,pitch:USE_3D?45:0,bearing:USE_3D?-15:0,duration:1000});
}

// Global alias for HTML button onclick
window.exitZoomDrill = () => leaveDrill(true);



// ── GEOLOCATION — show user position as a star on the map ────────────────────
let geoMarker = null;
let geoWatchId = null;

function initGeolocation() {
  if (!navigator.geolocation) return;

  // Add geolocate control (built-in Mapbox button)
  const geoControl = new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true,
    showAccuracyCircle: true
  });

  map.addControl(geoControl, 'bottom-right');

  // Custom star marker that shows on map when location is found
  geoControl.on('geolocate', e => {
    const { longitude, latitude } = e.coords;

    // Remove old custom marker if exists
    if (geoMarker) geoMarker.remove();

    // Create a star marker element
    const el = document.createElement('div');
    el.className = 'geo-star-marker';
    el.innerHTML = '★';
    el.title = 'Your location';

    geoMarker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(
        '<div class="sp-name">⭐ You Are Here</div>' +
        '<div class="sp-cat">Your current location</div><div class="sp-sep"></div>' +
        '<div class="sp-row"><span>Lat</span><b>' + latitude.toFixed(5) + '</b></div>' +
        '<div class="sp-row"><span>Lng</span><b>' + longitude.toFixed(5) + '</b></div>'
      ))
      .addTo(map);
  });
}


// ── PREFETCH ─────────────────────────────────────────────────────────────────
function prefetchBiz(zip) {
  if (drillCache[zip] !== undefined) return; // already fetched or fetching
  drillCache[zip] = null; // mark as in-progress
  fetchBusinesses(zip).then(biz => {
    drillCache[zip] = biz || [];
  }).catch(() => { drillCache[zip] = []; });
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();

  document.getElementById('mode-group').addEventListener('click',e=>{if(e.target.classList.contains('ltab')||e.target.closest('.ltab')){const b=e.target.closest('.ltab');setMode(b);}});
  document.getElementById('search').addEventListener('input',e=>{SEARCH=e.target.value.toLowerCase().trim();buildSidebar();});
  document.querySelectorAll('.f-chip').forEach(btn=>btn.addEventListener('click',()=>{
    TIER=btn.dataset.t; document.querySelectorAll('.f-chip').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); buildSidebar();
  }));
  document.querySelectorAll('.sty').forEach(btn=>btn.addEventListener('click',()=>setStyle(btn)));
  document.getElementById('labels-btn').addEventListener('click',toggleLabels);
  document.getElementById('threed-btn').addEventListener('click',toggle3D);
  document.getElementById('compare-btn').addEventListener('click',toggleCompare);
  document.getElementById('det-close').addEventListener('click',closeDetail);
  document.getElementById('cmp-run').addEventListener('click',runCompare);
  document.getElementById('cmp-clear').addEventListener('click',()=>{CMP_A=CMP_B=null;updateCmpSlots();});
  document.getElementById('z-in').addEventListener('click',()=>map.zoomIn());
  document.getElementById('z-out').addEventListener('click',()=>map.zoomOut());
  document.getElementById('z-reset').addEventListener('click',()=>map.flyTo({center:[-110.97,32.21],zoom:9.8,pitch:USE_3D?45:0,bearing:USE_3D?-15:0,duration:1000}));
  document.getElementById('cmp-modal').addEventListener('click',e=>{if(e.target.id==='cmp-modal')closeCmp();});
});

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
  document.getElementById('load-bar').style.width = pct + '%';
  document.getElementById('loading-status').textContent = msg;
}

// ── MAP INIT ──────────────────────────────────────────────────────────────────
async function initMap() {
  setLoadProgress(15, 'Connecting to Mapbox…');

  window._map = map = new mapboxgl.Map({
    container: 'map',
    style: MAP_STYLES.dark,
    center: [-110.95, 32.26],
    zoom: 10.8,
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

  setLoadProgress(35, 'Loading Census TIGER/Line boundaries…');
  const boundaries = await loadBoundaries();

  map.on('load', () => {
    setLoadProgress(75, 'Rendering wealth zones…');
    if (boundaries) addLayers(boundaries);
    buildSidebar();
    updateKPIs();
    setLoadProgress(100, 'Ready');
    setTimeout(hideLoading, 400);
  });

  map.on('style.load', () => {
    setTimeout(() => {
      window._map = map;
      window._geoData = geoData;
      if (geoData && !map.getSource('twi-zips')) addLayers(geoData);
    }, 200);
  });
}

async function loadBoundaries() {
  try {
    const resp = await fetch(GEO_URL);
    const all  = await resp.json();
    setLoadProgress(60, `Processing ${all.features.length} Arizona ZIP codes…`);

    const features = all.features
      .filter(f => TARGET.has(f.properties.ZCTA5CE10))
      .map(f => {
        const zip = f.properties.ZCTA5CE10;
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

    geoData = window._geoData = { type: 'FeatureCollection', features };
    return geoData;
  } catch (err) {
    console.error('GeoJSON load failed:', err);
    document.getElementById('loading-status').textContent = 'Error loading boundaries';
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
    map.getCanvas().style.cursor = '';
    if(hov!==null){map.setFeatureState({source:'twi-zips',id:hov},{hover:false});hov=null;}
    popup.remove();
  });
  map.on('click','twi-fill', e => { if(e.features.length){openDetail(e.features[0].properties.zip);popup.remove();} });
  map.on('click', e => { const f=map.queryRenderedFeatures(e.point,{layers:['twi-fill']});if(!f.length)closeDetail(); });
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
    html+=`<div class="zip-row${SELECTED===z?' sel':''}" onclick="openDetail('${z}')">
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
  document.getElementById('z-reset').addEventListener('click',()=>map.flyTo({center:[-110.95,32.26],zoom:10.8,pitch:USE_3D?45:0,bearing:USE_3D?-15:0,duration:1000}));
  document.getElementById('cmp-modal').addEventListener('click',e=>{if(e.target.id==='cmp-modal')closeCmp();});
});

// ─── TUCSON WEALTH INTEL v5 — Real Census TIGER Boundaries + 3D ──────────────

mapboxgl.accessToken = MAPBOX_TOKEN;

const STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/light-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12'
};

// Real Census TIGER/Line ZCTA GeoJSON (loaded at runtime by browser)
const GEOJSON_URL = 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/az_arizona_zip_codes_geo.min.json';
const TARGET_ZIPS = new Set(Object.keys(ZIP_DATA));

let map, popup, geoData = null; window._use3D = true;
let MODE = 'composite', SELECTED = null, CMP_A = null, CMP_B = null;
let CMP_OPEN = false, LABELS = true, TIER = 'all', SEARCH = '', USE_3D = true;

// ── COLOR ─────────────────────────────────────────────────────────────────
function heatRGB(s) {
  const st = [[0,[10,30,62]],[12,[12,58,110]],[24,[14,92,140]],[36,[20,138,128]],[48,[40,190,100]],[60,[160,200,40]],[72,[230,175,20]],[82,[240,110,30]],[90,[230,50,60]],[100,[180,0,50]]];
  for (let i=st.length-1;i>=0;i--) { if (s>=st[i][0]) { if(i<st.length-1){const t=(s-st[i][0])/(st[i+1][0]-st[i][0]);return st[i][1].map((c,j)=>Math.round(c+(st[i+1][1][j]-c)*Math.min(t,1)));} return[...st[i][1]]; } }
  return[...st[0][1]];
}
function hex(s){const[r,g,b]=heatRGB(s);return`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;}
function rgba(s,a=.7){const[r,g,b]=heatRGB(s);return`rgba(${r},${g},${b},${a})`;}
function tierInfo(s){if(s>=88)return{name:'Ultra-High Wealth',color:'#e11d48'};if(s>=75)return{name:'High Wealth',color:'#f97316'};if(s>=60)return{name:'Upper-Middle',color:'#eab308'};if(s>=44)return{name:'Middle Market',color:'#22c55e'};if(s>=28)return{name:'Working Class',color:'#06b6d4'};return{name:'Lower Income',color:'#6366f1'};}
function fmt(n){if(!n&&n!==0)return'—';if(n>=1e6)return'$'+(n/1e6).toFixed(1)+'M';if(n>=1000)return'$'+n.toLocaleString();return'$'+n;}
function fmtNum(n){return n!=null?n.toLocaleString():'—';}
function fmtPct(n){return n!=null?n.toFixed(1)+'%':'—';}

// ── LOAD REAL BOUNDARIES ──────────────────────────────────────────────────
async function loadBoundaries(){
  document.getElementById('loading-status').textContent='Loading Census TIGER/Line ZIP boundaries…';
  try{
    const resp=await fetch(GEOJSON_URL);
    const allAZ=await resp.json();
    document.getElementById('loading-status').textContent='Filtering Tucson metro…';
    const features=allAZ.features.filter(f=>TARGET_ZIPS.has(f.properties.ZCTA5CE10)).map(f=>{
      const zip=f.properties.ZCTA5CE10;const d=ZIP_DATA[zip];const s=calcScore(zip,MODE);
      return{...f,id:zip,properties:{...f.properties,zip,name:d?d.name:zip,score:s,medianHome:d?d.medianHome:0,medianIncome:d?d.medianIncome:0,bizIndex:d?d.bizIndex:0}};
    });
    geoData={type:'FeatureCollection',features}; window._geoData=geoData;
    document.getElementById('loading-status').textContent=`${features.length} real ZIP boundaries loaded ✓`;
    return geoData;
  }catch(err){console.error('Boundary load failed:',err);document.getElementById('loading-status').textContent='Error loading — retrying…';return null;}
}

// ── MAP INIT ──────────────────────────────────────────────────────────────
async function initMap(){
  window._use3D = USE_3D;
  window._map=map=new mapboxgl.Map({container:'map',style:STYLES.dark,center:[-110.95,32.26],zoom:10.8,minZoom:9,maxZoom:17,pitch:USE_3D?45:0,bearing:USE_3D?-15:0,antialias:true});
  map.addControl(new mapboxgl.NavigationControl({visualizePitch:true}),'top-right');
  map.addControl(new mapboxgl.ScaleControl({unit:'imperial'}),'bottom-right');
  window._popup=popup=new mapboxgl.Popup({closeButton:false,closeOnClick:false,className:'twi-popup',maxWidth:'260px',offset:16});
  const boundaries=await loadBoundaries();
  map.on("load",()=>{ window._map=map; if(boundaries){addLayers(boundaries); window._geoData=geoData;} buildSidebar();updateKPIs();hideLoading(); });
  map.on('style.load',()=>{setTimeout(()=>{ window._map=map; window._geoData=geoData; if(geoData&&!map.getSource('twi-zips'))addLayers(geoData);},200);});
}

function hideLoading(){const el=document.getElementById('loading');el.style.opacity='0';el.style.transition='opacity 0.5s';setTimeout(()=>el.style.display='none',500);}

// ── LAYERS ────────────────────────────────────────────────────────────────
function addLayers(geojson){
  ['twi-extrusion','twi-fill','twi-border','twi-border-sel','twi-labels'].forEach(id=>{if(map.getLayer(id))map.removeLayer(id);});
  if(map.getSource('twi-zips'))map.removeSource('twi-zips');
  map.addSource('twi-zips',{type:'geojson',data:geojson});

  // 3D Extrusion
  if(USE_3D){
    const hExpr=['match',['get','zip']],cExpr=['match',['get','zip']];
    Object.keys(ZIP_DATA).forEach(z=>{const s=calcScore(z,MODE);hExpr.push(z,s*80);cExpr.push(z,hex(s));});
    hExpr.push(0);cExpr.push('#111');
    map.addLayer({id:'twi-extrusion',type:'fill-extrusion',source:'twi-zips',paint:{'fill-extrusion-color':cExpr,'fill-extrusion-height':hExpr,'fill-extrusion-base':0,'fill-extrusion-opacity':0.78,'fill-extrusion-vertical-gradient':true}});
  }

  // Flat fill
  const fcExpr=['match',['get','zip']];
  Object.keys(ZIP_DATA).forEach(z=>{fcExpr.push(z,rgba(calcScore(z,MODE),USE_3D?.4:.7));});
  fcExpr.push('rgba(0,0,0,0)');
  map.addLayer({id:'twi-fill',type:'fill',source:'twi-zips',paint:{'fill-color':fcExpr,'fill-opacity':['case',['boolean',['feature-state','hover'],false],0.9,USE_3D?0.35:0.65]}});

  // Border
  map.addLayer({id:'twi-border',type:'line',source:'twi-zips',paint:{'line-color':['case',['boolean',['feature-state','hover'],false],'#ffffff','rgba(255,255,255,0.35)'],'line-width':['interpolate',['linear'],['zoom'],9,0.6,12,1.2,15,2.0],'line-opacity':0.85}});

  // Selected border
  map.addLayer({id:'twi-border-sel',type:'line',source:'twi-zips',paint:{'line-color':'#00d4ff','line-width':3,'line-opacity':1},filter:['==',['get','zip'],'']});

  // Labels
  map.addLayer({id:'twi-labels',type:'symbol',source:'twi-zips',
    layout:{'text-field':['step',['zoom'],['get','zip'],11,['format',['get','zip'],{'font-scale':1},'\n',{},['concat',['to-string',['get','score']],' pts'],{'font-scale':.72,'text-color':'#aad4ef'}],13,['format',['get','zip'],{'font-scale':1},'\n',{},['concat',['to-string',['get','score']],' pts'],{'font-scale':.72,'text-color':'#aad4ef'},'\n',{},['get','name'],{'font-scale':.6,'text-color':'#8ab8d4'}]],'text-font':['DIN Pro Bold','Arial Unicode MS Bold'],'text-size':['interpolate',['linear'],['zoom'],9,9,12,12,14,15],'text-anchor':'center','text-line-height':1.35,'text-allow-overlap':false,'visibility':LABELS?'visible':'none'},
    paint:{'text-color':'#fff','text-halo-color':'rgba(0,0,0,.88)','text-halo-width':2}
  });

  // Interactions
  let hov=null;
  map.on('mousemove','twi-fill',e=>{
    map.getCanvas().style.cursor='pointer';
    if(e.features.length){
      if(hov!==null)map.setFeatureState({source:'twi-zips',id:hov},{hover:false});
      hov=e.features[0].id;map.setFeatureState({source:'twi-zips',id:hov},{hover:true});
      const z=e.features[0].properties.zip,d=ZIP_DATA[z];if(!d)return;
      const s=calcScore(z,MODE),c=hex(s),ti=tierInfo(s);
      popup.setLngLat(e.lngLat).setHTML(`<div class="pp-zip">${z}</div><div class="pp-name">${d.name}</div><div class="pp-score-row"><span class="pp-score" style="color:${c}">${s}</span><span class="pp-tier" style="color:${ti.color}">${ti.name}</span></div><div class="pp-sep"></div><div class="pp-r"><span>Median Home</span><b>${fmt(d.medianHome)}</b></div><div class="pp-r"><span>Median Income</span><b>${fmt(d.medianIncome)}</b></div><div class="pp-r"><span>Per Capita</span><b>${fmt(d.perCapitaIncome)}</b></div><div class="pp-r"><span>Biz Index</span><b>${d.bizIndex}/100</b></div><div class="pp-r"><span>5yr Growth</span><b style="color:${d.homeAppreciation5yr>=0?'#3ddc84':'#f43f5e'}">${d.homeAppreciation5yr>0?'+':''}${fmtPct(d.homeAppreciation5yr)}</b></div><div class="pp-r"><span>Population</span><b>${fmtNum(d.population)}</b></div><div class="pp-hint">Click for full report →</div>`).addTo(map);
    }
  });
  map.on('mouseleave','twi-fill',()=>{map.getCanvas().style.cursor='';if(hov!==null){map.setFeatureState({source:'twi-zips',id:hov},{hover:false});hov=null;}popup.remove();});
  map.on('click','twi-fill',e=>{if(e.features.length){openDetail(e.features[0].properties.zip);popup.remove();}});
  map.on('click',e=>{const f=map.queryRenderedFeatures(e.point,{layers:['twi-fill']});if(!f.length)closeDetail();});
}

function refreshMap(){
  if(!map||!geoData||!map.getSource('twi-zips'))return;
  geoData.features.forEach(f=>{f.properties.score=calcScore(f.properties.zip,MODE);});
  map.getSource('twi-zips').setData(geoData);
  const fc=['match',['get','zip']];Object.keys(ZIP_DATA).forEach(z=>{fc.push(z,rgba(calcScore(z,MODE),USE_3D?.4:.7));});fc.push('rgba(0,0,0,0)');
  map.setPaintProperty('twi-fill','fill-color',fc);
  if(USE_3D&&map.getLayer('twi-extrusion')){
    const hE=['match',['get','zip']],cE=['match',['get','zip']];
    Object.keys(ZIP_DATA).forEach(z=>{const s=calcScore(z,MODE);hE.push(z,s*80);cE.push(z,hex(s));});hE.push(0);cE.push('#111');
    map.setPaintProperty('twi-extrusion','fill-extrusion-height',hE);map.setPaintProperty('twi-extrusion','fill-extrusion-color',cE);
  }
  map.setFilter('twi-border-sel',['==',['get','zip'],SELECTED||'']);
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────
function buildSidebar(){
  const sorted=Object.keys(ZIP_DATA).map(z=>({z,s:calcScore(z,MODE)})).sort((a,b)=>b.s-a.s);
  let html='',count=0;
  sorted.forEach(({z,s},i)=>{
    const d=ZIP_DATA[z],t=s>=60?'high':s>=38?'mid':'low';
    if((TIER!=='all'&&TIER!==t)||SEARCH&&!z.includes(SEARCH)&&!d.name.toLowerCase().includes(SEARCH))return;
    count++;const c=hex(s);
    html+=`<div class="zip-row${SELECTED===z?' sel':''}" onclick="openDetail('${z}')"><span class="zr-rank">${i+1}</span><span class="zr-chip" style="background:${c};color:${s>55?'#000':'#fff'}">${s}</span><span class="zr-info"><span class="zr-code">${z}</span><span class="zr-name">${d.name}</span></span><span class="zr-right"><span class="zr-home">${fmt(d.medianHome)}</span><span class="zr-inc">${fmt(d.medianIncome)}</span></span></div>`;
  });
  document.getElementById('zip-list').innerHTML=html;document.getElementById('sb-count').textContent=`${count} zones`;
}

function updateKPIs(){
  const zips=Object.keys(ZIP_DATA),scores=zips.map(z=>calcScore(z,MODE));
  document.getElementById('kpi-avg').textContent=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  document.getElementById('kpi-top').textContent=zips.sort((a,b)=>calcScore(b,MODE)-calcScore(a,MODE))[0];
  document.getElementById('kpi-zones').textContent=zips.length;
}

// ── DETAIL ────────────────────────────────────────────────────────────────
function openDetail(zip){
  SELECTED=zip;refreshMap();buildSidebar();
  const d=ZIP_DATA[zip];if(!d)return;
  const s=calcScore(zip,MODE),c=hex(s),ti=tierInfo(s),op=OPP_META[d.opp]||OPP_META.stable;
  document.getElementById('det-zip').textContent=zip;
  document.getElementById('det-name').textContent=d.name;
  document.getElementById('det-city').textContent=`${d.city}, AZ · ${d.county} County`;
  const arc=document.getElementById('ring-arc'),circ=163.4;
  arc.setAttribute('stroke',c);arc.style.transition='none';arc.setAttribute('stroke-dashoffset',circ);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{arc.style.transition='stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)';arc.setAttribute('stroke-dashoffset',circ-(s/100)*circ);}));
  document.getElementById('ring-num').textContent=s;
  document.getElementById('dst-tier').textContent=ti.name;document.getElementById('dst-tier').style.color=ti.color;
  const ranked=Object.keys(ZIP_DATA).sort((a,b)=>calcScore(b,MODE)-calcScore(a,MODE));
  document.getElementById('dst-rank').textContent=`#${ranked.indexOf(zip)+1} of ${ranked.length}`;
  document.getElementById('dst-opp').innerHTML=`${op.icon} <span style="color:${op.color}">${op.label}</span>`;

  const hP=Math.round(d.medianHome/MAX.medianHome*100),iP=Math.round(d.medianIncome/MAX.medianIncome*100),bP=d.bizIndex,pP=Math.round(d.perCapitaIncome/MAX.perCapitaIncome*100),gP=Math.round(Math.min(100,Math.max(0,d.homeAppreciation5yr/60*100)));
  const ac=d.homeAppreciation1yr>=0?'#3ddc84':'#f43f5e';

  document.getElementById('det-body').innerHTML=`
    <div class="det-sec"><div class="sec-title">Real Estate</div><div class="grid-4"><div class="g-tile"><div class="gt-lbl">Median Home</div><div class="gt-val">${fmt(d.medianHome)}</div><div class="gt-bar"><div class="gt-fill" style="background:#00d4ff" data-w="${hP}"></div></div></div><div class="g-tile"><div class="gt-lbl">$/SqFt</div><div class="gt-val">$${d.pricePerSqFt}</div></div><div class="g-tile"><div class="gt-lbl">1yr Change</div><div class="gt-val" style="color:${ac}">${d.homeAppreciation1yr>0?'+':''}${fmtPct(d.homeAppreciation1yr)}</div></div><div class="g-tile"><div class="gt-lbl">5yr Growth</div><div class="gt-val" style="color:#3ddc84">+${fmtPct(d.homeAppreciation5yr)}</div></div></div><div class="mini-stats-row"><div class="ms"><div class="ms-v">${d.medDaysOnMarket}d</div><div class="ms-l">Days on Market</div></div><div class="ms"><div class="ms-v">${fmtPct(d.listPriceVsSale)}</div><div class="ms-l">List/Sale</div></div><div class="ms"><div class="ms-v">${d.ownerOccupied}%</div><div class="ms-l">Owner Occ.</div></div></div></div>

    <div class="det-sec"><div class="sec-title">Income & Wealth</div><div class="grid-4"><div class="g-tile"><div class="gt-lbl">Median HH</div><div class="gt-val">${fmt(d.medianIncome)}</div><div class="gt-bar"><div class="gt-fill" style="background:#f5a623" data-w="${iP}"></div></div></div><div class="g-tile"><div class="gt-lbl">Average HH</div><div class="gt-val">${fmt(d.avgIncome)}</div></div><div class="g-tile"><div class="gt-lbl">Per Capita</div><div class="gt-val">${fmt(d.perCapitaIncome)}</div><div class="gt-bar"><div class="gt-fill" style="background:#a78bfa" data-w="${pP}"></div></div></div><div class="g-tile"><div class="gt-lbl">Poverty</div><div class="gt-val" style="color:${d.povertyRate>15?'#f97316':'#22c55e'}">${fmtPct(d.povertyRate)}</div></div></div></div>

    <div class="det-sec"><div class="sec-title">Demographics</div><div class="demo-grid"><div class="demo-tile"><div class="demo-v">${fmtNum(d.population)}</div><div class="demo-l">Population</div></div><div class="demo-tile"><div class="demo-v">${fmtNum(d.households)}</div><div class="demo-l">Households</div></div><div class="demo-tile"><div class="demo-v">${d.medAge}</div><div class="demo-l">Med. Age</div></div><div class="demo-tile"><div class="demo-v">${fmtPct(d.unemployment)}</div><div class="demo-l">Unemploy.</div></div><div class="demo-tile"><div class="demo-v">${d.collegeEd}%</div><div class="demo-l">College</div></div><div class="demo-tile"><div class="demo-v">${d.households?Math.round(d.population/d.households*10)/10:'—'}</div><div class="demo-l">HH Size</div></div></div></div>

    <div class="det-sec"><div class="sec-title">Commercial</div><div class="grid-4"><div class="g-tile"><div class="gt-lbl">Biz Index</div><div class="gt-val" style="color:${hex(d.bizIndex)}">${d.bizIndex}/100</div><div class="gt-bar"><div class="gt-fill" style="background:#ff7d3d" data-w="${bP}"></div></div></div><div class="g-tile"><div class="gt-lbl">Businesses</div><div class="gt-val">${fmtNum(d.totalBusinesses)}</div></div><div class="g-tile"><div class="gt-lbl">Vacancy</div><div class="gt-val" style="color:${d.vacancyRate>12?'#f97316':'#22c55e'}">${fmtPct(d.vacancyRate)}</div></div><div class="g-tile"><div class="gt-lbl">Rent/SF</div><div class="gt-val">$${d.avgRent?.toFixed(2)}</div></div></div></div>

    <div class="det-sec"><div class="sec-title">Score Breakdown</div>${[['Home Values',hP,'#00d4ff'],['Income',iP,'#f5a623'],['Business',bP,'#ff7d3d'],['Per Capita',pP,'#a78bfa'],['5yr Growth',gP,'#3ddc84']].map(([l,v,col])=>`<div class="br-row"><span class="br-lbl">${l}</span><div class="br-track"><div class="br-fill" style="background:${col}" data-w="${v}"></div></div><span class="br-val">${v}</span></div>`).join('')}</div>

    <div class="det-sec"><div class="sec-title">Target Sectors</div><div class="sector-list">${(d.sectors||[]).map((s,i)=>`<div class="sector-item"><span class="si-rank">${i+1}</span>${s}</div>`).join('')}</div></div>

    <div class="det-sec"><div class="sec-title">Characteristics</div><div class="tag-cloud">${d.tags.map(t=>`<div class="dtag" style="color:${c};border-color:${c}44;background:${c}10">${t}</div>`).join('')}</div></div>

    <div class="det-sec"><div class="sec-title">Opportunity</div><div class="opp-card" style="border-color:${op.color}33"><div class="opp-icon">${op.icon}</div><div style="flex:1"><div class="opp-name" style="color:${op.color}">${op.label}</div><div class="opp-desc">${op.desc}</div></div></div></div>

    <div class="det-sec"><div class="sec-title">Intel Brief</div><div class="brief">${d.brief}</div></div>

    <div class="det-sec det-sources"><div class="sec-title">Sources</div><div class="sources-txt">Home: Redfin Apr 2026 · Income: ACS 2023 5yr · Business: CoStar/AZ DOR · Growth: Zillow ZHVI · Boundaries: Census TIGER/Line ZCTA</div></div>

    <div class="det-sec det-actions"><button class="btn-compare" onclick="addToCompare()">⇌ Compare</button><button class="btn-fly" onclick="flyToZip('${zip}')">🗺 Zoom</button></div>
  `;

  requestAnimationFrame(()=>{document.querySelectorAll('[data-w]').forEach(el=>{el.style.transition='width .9s cubic-bezier(.16,1,.3,1)';el.style.width=el.dataset.w+'%';});});
  document.getElementById('detail').classList.add('open');
  // Wire drill button
  const drillBtn = document.getElementById('drill-btn');
  if(drillBtn) {
    drillBtn.onclick = () => {
      drillBtn.classList.add('active');
      enterDrillMode(zip);
    };
  }
  flyToZip(zip);
}

function closeDetail(){SELECTED=null;document.getElementById('detail').classList.remove('open');refreshMap();buildSidebar();}

function flyToZip(zip){
  if(!geoData||!map)return;
  const feat=geoData.features.find(f=>f.properties.zip===zip);if(!feat)return;
  const coords=feat.geometry.type==='MultiPolygon'?feat.geometry.coordinates.flat(2):feat.geometry.coordinates.flat(1);
  const lngs=coords.map(c=>c[0]),lats=coords.map(c=>c[1]);
  map.fitBounds([[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]],{padding:80,maxZoom:14,duration:1200});
}

// ── COMPARE ───────────────────────────────────────────────────────────────
function toggleCompare(){CMP_OPEN=!CMP_OPEN;document.getElementById('cmp-bar').classList.toggle('show',CMP_OPEN);document.getElementById('compare-btn').classList.toggle('on',CMP_OPEN);if(!CMP_OPEN){CMP_A=CMP_B=null;updateCmpSlots();}else toast('Open two ZIPs & click Compare');}

function addToCompare(){if(!SELECTED)return toast('Open a ZIP first');if(!CMP_OPEN)toggleCompare();if(CMP_A===SELECTED||CMP_B===SELECTED)return toast(`${SELECTED} already added`);if(!CMP_A){CMP_A=SELECTED;toast(`${SELECTED} → Slot A ✓`);}else if(!CMP_B){CMP_B=SELECTED;toast(`${SELECTED} → Slot B ✓`);}else return toast('Both slots full');updateCmpSlots();}

function updateCmpSlots(){const sa=document.getElementById('cmp-a'),sb=document.getElementById('cmp-b'),go=document.getElementById('cmp-run');if(CMP_A){const s=calcScore(CMP_A,MODE);sa.innerHTML=`<strong>${CMP_A}</strong><span style="color:${hex(s)};margin-left:6px">${s}</span>`;sa.classList.add('filled');}else{sa.textContent='Slot A';sa.classList.remove('filled');}if(CMP_B){const s=calcScore(CMP_B,MODE);sb.innerHTML=`<strong>${CMP_B}</strong><span style="color:${hex(s)};margin-left:6px">${s}</span>`;sb.classList.add('filled');}else{sb.textContent='Slot B';sb.classList.remove('filled');}go.disabled=!(CMP_A&&CMP_B);}

function runCompare(){if(!CMP_A||!CMP_B)return;const dA=ZIP_DATA[CMP_A],dB=ZIP_DATA[CMP_B],sA=calcScore(CMP_A,MODE),sB=calcScore(CMP_B,MODE),cA=hex(sA),cB=hex(sB),opA=OPP_META[dA.opp],opB=OPP_META[dB.opp];const rows=[['Composite',sA,sB,v=>v+' pts',false],['Median Home',dA.medianHome,dB.medianHome,fmt,false],['Median Income',dA.medianIncome,dB.medianIncome,fmt,false],['Per Capita',dA.perCapitaIncome,dB.perCapitaIncome,fmt,false],['Biz Index',dA.bizIndex,dB.bizIndex,v=>v+'/100',false],['5yr Growth',dA.homeAppreciation5yr,dB.homeAppreciation5yr,fmtPct,false],['Vacancy',dA.vacancyRate,dB.vacancyRate,fmtPct,true],['Unemployment',dA.unemployment,dB.unemployment,fmtPct,true],['Population',dA.population,dB.population,fmtNum,false],['Avg Rent',dA.avgRent,dB.avgRent,v=>'$'+v?.toFixed(2),false]];const w=sA>sB?CMP_A:sB>sA?CMP_B:'TIE';document.getElementById('cmp-box').innerHTML=`<div class="cmp-hd"><div><div class="cmp-title">ZIP Comparison</div><div class="cmp-sub">${MODE.toUpperCase()} mode</div></div><button onclick="closeCmp()" class="cmp-x">✕</button></div><div class="cmp-heads"><div class="cmp-hcell"><div class="cmp-hz" style="color:${cA}">${CMP_A}</div><div class="cmp-hn">${dA.name}</div><div class="cmp-hs" style="color:${cA}">${sA}</div></div><div class="cmp-vs-col">VS</div><div class="cmp-hcell"><div class="cmp-hz" style="color:${cB}">${CMP_B}</div><div class="cmp-hn">${dB.name}</div><div class="cmp-hs" style="color:${cB}">${sB}</div></div></div><div class="cmp-table">${rows.map(([l,vA,vB,f,lw])=>{const aW=lw?vA<vB:vA>vB,bW=lw?vB<vA:vB>vA;return`<div class="cmp-row"><div class="cmp-cell ${aW?'win':bW?'lose':''}">${f(vA)}</div><div class="cmp-lbl">${l}</div><div class="cmp-cell ${bW?'win':aW?'lose':''}">${f(vB)}</div></div>`;}).join('')}</div><div class="cmp-verdict"><div class="cv-title">${w==='TIE'?'🤝 Tied':'🏆 '+w+' Leads'}</div><div class="cv-body">${w==='TIE'?`Both score ${sA}.`:`<strong>${w===CMP_A?dA.name:dB.name}</strong> leads at <b style="color:${w===CMP_A?cA:cB}">${Math.max(sA,sB)}</b> vs <b style="color:${w===CMP_A?cB:cA}">${Math.min(sA,sB)}</b>.`}</div></div><button class="cmp-close-btn" onclick="closeCmp()">Close</button>`;document.getElementById('cmp-modal').classList.add('show');}
function closeCmp(){document.getElementById('cmp-modal').classList.remove('show');}

// ── CONTROLS ──────────────────────────────────────────────────────────────
const ML={composite:'Composite Wealth Score',homes:'Median Home Values',income:'Household Income',business:'Business Revenue Index',growth:'5-Year Appreciation'};
function setMode(btn){MODE=btn.dataset.mode;document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');document.getElementById('leg-title').textContent=ML[MODE];refreshMap();buildSidebar();updateKPIs();if(SELECTED)openDetail(SELECTED);}
function setStyle(btn){document.querySelectorAll('.sty-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');map.setStyle(STYLES[btn.dataset.style]);}
function toggleLabels(){LABELS=!LABELS;document.getElementById('labels-btn').classList.toggle('on',LABELS);if(map.getLayer('twi-labels'))map.setLayoutProperty('twi-labels','visibility',LABELS?'visible':'none');}
function toggle3D(){USE_3D=!USE_3D; window._use3D=USE_3D;document.getElementById('threed-btn').classList.toggle('on',USE_3D);map.easeTo({pitch:USE_3D?45:0,bearing:USE_3D?-15:0,duration:1000});if(geoData)addLayers(geoData);}

let toastT;function toast(m){const el=document.getElementById('toast');el.textContent=m;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),2600);}

// ── BOOT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  initMap();
  document.getElementById('mode-group').addEventListener('click',e=>{if(e.target.classList.contains('mode-btn'))setMode(e.target);});
  document.getElementById('search').addEventListener('input',e=>{SEARCH=e.target.value.toLowerCase().trim();buildSidebar();});
  document.querySelectorAll('.tier-btn').forEach(btn=>btn.addEventListener('click',()=>{TIER=btn.dataset.t;document.querySelectorAll('.tier-btn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');buildSidebar();}));
  document.querySelectorAll('.sty-btn').forEach(btn=>btn.addEventListener('click',()=>setStyle(btn)));
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

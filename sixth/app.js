/* 115工科賽 — 離線可用的七場域互動導覽。無外部套件、無資料傳輸。 */
(() => {
  'use strict';
  const DATA = window.GK_DATA;
  const FOCUS = window.GK_FOCUS || {};
  const BEACONS = window.GK_DESTINATION_BEACONS || {registration:{},theory:{}};
  const V12_PATCH = window.GK_V12_MAP_PATCH || {serviceDesk:null,destinationOverrides:{}};
  // A separate, non-numbered service point; the official A3 item 01–28 is preserved.
  if(V12_PATCH.serviceDesk && !DATA.services.some(s=>s.id===V12_PATCH.serviceDesk.id))
    DATA.services.push({...V12_PATCH.serviceDesk,displayId:'服'});
  // 加在原有地圖服務點資料之後；官方 01–28 的圖面資料完全不變。
  if(V12_PATCH.serviceDeskPin && !DATA.servicePins.some(p=>p.serviceId==='desk'))
    DATA.servicePins.push({...V12_PATCH.serviceDeskPin});
  const DIAGRAMS = window.GK_DIAGRAMS?.items || {};
  const IS_EDITOR = document.body.dataset.mode === 'editor';
  if (!DATA || !Array.isArray(DATA.programs)) { document.body.textContent='導覽資料未載入，請確認 data.js 是否與 index.html 放在同一資料夾。'; return; }
  const $ = id => document.getElementById(id);
  const byId = id => DATA.programs.find(p => p.id === id);
  // 已確認外場職種的館舍與報到時間，與「座標非實測入口」分開處理。
  const isExteriorVenue = program => Boolean(program && program.site !== '北科附工');
  const isExteriorMapReference = pin => Boolean(pin && pin.verification === 'pending' && !pin.edited && isExteriorVenue(byId(pin.programId)));
  const usableVenuePin = pin => Boolean(pin && (pin.verification !== 'pending' || isExteriorMapReference(pin)));
  const locationPinStatus = pin => pin?.verification==='source_map_reference'
    ? (pin.sourceKind==='classroom_diagram'?'教室配置圖格位（非實測入口）':pin.sourceKind==='registration_symbol'?'報到圖原印位置（非實測桌位）':'館舍圖面示意（非實測入口）')
    : isExteriorMapReference(pin) ? '館舍位置示意（非實測入口或教室）' : (pin?.status || '圖面定位');
  const isParkingService = item => Boolean(item && ['17','20','23'].includes(item.id));
  const isTruckService = item => Boolean(item && ['21','22'].includes(item.id));
  const servicePinSymbol = item => isParkingService(item) ? 'P' : isTruckService(item) ? '卸' : item?.id || '';
  const sites = DATA.sites;
  const STORAGE_KEY = 'gk115-map-corrections-v2';
  const PREVIOUS_STORAGE_KEY = 'gk115-map-corrections-v1';
  let site = '北科附工', mapId = 'map-03', current = '01', currentService='01', currentDestination='practical', zoom = 1, editMode = false, mapMode='focus';
  let loadSequence=0, pendingFocus=false;
  let currentPublicShareUrl='';
  let routeReady=false;
  let editAction='move', editIndex=0, currentCluster=null, cardType='program';
  let corrections = {};
  const elements = {
    siteTabs:$('siteTabs'),globalProgram:$('globalProgram'),programSearch:$('programSearch'),programList:$('programList'),siteProgramCount:$('siteProgramCount'),
    mapSelect:$('mapSelect'),mapTitle:$('mapTitle'),mapSubtitle:$('mapSubtitle'),originalLink:$('originalLink'),downloadOriginal:$('downloadOriginal'),mapImage:$('mapImage'),mapLoading:$('mapLoading'),focusMode:$('focusMode'),fullMode:$('fullMode'),
    mapStage:$('mapStage'),mapViewport:$('mapViewport'),mapStatus:$('mapStatus'),pinLayer:$('pinLayer'),pinCount:$('pinCount'),
    zoomLabel:$('zoomLabel'),detailNumber:$('detailNumber'),detailTitle:$('detail-title'),detailSite:$('detailSite'),
    detailRegistration:$('detailRegistration'),detailTheory:$('detailTheory'),detailPractical:$('detailPractical'),detailMeeting:$('detailMeeting'),
    detailRegistrationDate:$('detailRegistrationDate'),detailRegistrationTime:$('detailRegistrationTime'),registrationTag:$('registrationTag'),registrationTasksBox:$('registrationTasksBox'),registrationTasksList:$('registrationTasksList'),
    detailNotes:$('detailNotes'),detailVerification:$('detailVerification'),locateBtn:$('locateBtn'),mapNotes:$('mapNotes'),editToggle:$('editToggle'),editStatus:$('editStatus'),toast:$('toast'),
    serviceSection:$('serviceSection'),disciplineDetails:$('disciplineDetails'),serviceList:$('serviceList'),serviceSearch:$('serviceSearch'),serviceDetail:$('serviceDetail'),serviceLocateBtn:$('serviceLocateBtn'),serviceDeskBeacon:$('serviceDeskBeacon'),serviceDeskAction:$('serviceDeskAction'),adminPanel:$('adminPanel'),
    mapShortcutBox:$('mapShortcutBox'),mapShortcutHeading:$('mapShortcutHeading'),mapShortcutExplain:$('mapShortcutExplain'),mapShortcutList:$('mapShortcutList'),clusterChooser:$('clusterChooser'),clusterTitle:$('clusterTitle'),clusterItems:$('clusterItems'),
    mobileCard:$('mobileCard'),mobileCardTitle:$('mobileCardTitle'),mobileCardText:$('mobileCardText'),mobileCardLabel:$('mobileCardLabel'),pinIndex:$('pinIndex'),movePinMode:$('movePinMode'),addPinMode:$('addPinMode'),removePin:$('removePin'),
    venueGuideSummary:$('venueGuideSummary'),venueGuideBtn:$('venueGuideBtn'),venueGuideOriginal:$('venueGuideOriginal'),indoorDiagramStatus:$('indoorDiagramStatus'),indoorDiagramList:$('indoorDiagramList'),indoorDiagramPending:$('indoorDiagramPending'),
    shareUrlText:$('shareUrlText'),shareHelp:$('shareHelp'),copyProgramLink:$('copyProgramLink'),copyProgramSummary:$('copyProgramSummary'),
    destinationSite:$('destinationSite'),destinationProgram:$('destinationProgram'),destinationPlace:$('destinationPlace'),destinationStatus:$('destinationStatus'),destinationFloorLink:$('destinationFloorLink'),destinationTabs:document.querySelector('.destination-tabs'),returnSkillDetails:$('returnSkillDetails'),
  };
  function toast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => elements.toast.classList.remove('show'), 2600);
  }
  function readCorrections() {
    try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(PREVIOUS_STORAGE_KEY) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
    catch (error) { return {}; }
  }
  function storeCorrections() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(corrections)); elements.editStatus.textContent='已保存於本機瀏覽器；請匯出 JSON 才能帶到其他電腦。'; }
    catch (error) { elements.editStatus.textContent='瀏覽器無法保留本機資料，請立刻使用「匯出定位 JSON」。'; }
  }
  function create(tag,className,text) {
    const el=document.createElement(tag); if(className)el.className=className; if(text!=null)el.textContent=String(text); return el;
  }
  function getMap() { return DATA.maps.find(m=>m.id===mapId); }
  function forSite(name) { return DATA.programs.filter(p=>p.site===name); }
  function availableMaps(name) { return DATA.maps.filter(m=>m.site===name); }
  function defaultProgramMap(program){
    if(!program)return null;
    return program.site==='北科附工'?'map-03':availableMaps(program.site)[0]?.id;
  }
  function destinationMap(program,purpose){
    if(!program)return null;
    if(program.site==='北科附工')return ({registration:'map-01',theory:'map-02',practical:'map-03'})[purpose]||'map-03';
    return availableMaps(program.site)[0]?.id||null;
  }
  function destinationLabel(purpose){return ({registration:'報到地點',theory:'學科試場',practical:'術科試場'})[purpose]||'術科試場';}
  function destinationValue(program,purpose){return program?.[purpose]||'依職種公告';}
  function currentShareUrl(programId){
    const url=new URL(window.location.href);
    url.searchParams.set('program',programId);
    url.searchParams.set('destination',currentDestination);
    url.searchParams.delete('service');
    url.searchParams.delete('view');
    url.searchParams.delete('venue');
    url.hash='explorer';
    return url.href;
  }
  function isPublicWebUrl(){
    return location.protocol==='https:' && !['localhost','127.0.0.1'].includes(location.hostname);
  }
  function syncUrl(programId,{push=false}={}){
    if(!routeReady || IS_EDITOR || location.protocol==='file:')return;
    try{
      const dest=currentShareUrl(programId);
      if(dest===location.href)return;
      window.history[push?'pushState':'replaceState']({program:programId},'',dest);
    }catch(err){/* 本機或受限網頁不修改網址列 */}
  }
  // 服務為獨立模式，不計入七個場域；保留既有 map-00 的資料及地圖引擎。
  function serviceUrl(id=null){
    const url=new URL(window.location.href);
    url.searchParams.delete('program');url.searchParams.delete('skill');
    url.searchParams.delete('destination');url.searchParams.delete('venue');
    url.searchParams.set('view','services');
    if(id && serviceById(id))url.searchParams.set('service',id);
    else url.searchParams.delete('service');
    url.hash='explorer';
    return url.href;
  }
  function syncServiceUrl(id=null,{push=false}={}){
    if(!routeReady || IS_EDITOR || location.protocol==='file:')return;
    try{
      const dest=serviceUrl(id);
      if(dest===location.href)return;
      window.history[push?'pushState':'replaceState']({service:id||null},'',dest);
    }catch(err){/* 本機或受限網頁不修改網址列 */}
  }
  function renderProgramExtra(){
    const p=byId(current);
    if(!p || !elements.shareUrlText)return;
    const map=DATA.maps.find(m=>m.id===defaultProgramMap(p));
    const pending=DATA.pins.some(pin=>pin.programId===p.id&&pin.verification==='pending');
    elements.venueGuideSummary.textContent=map
      ?`${p.site}｜${map.title}；${pending&&isExteriorVenue(p)?'競賽館舍已確認，所示定位僅代表圖面館舍方向':pending?'部分位置仍須核對':'地圖位置依原圖對位'}，不代表實測入口。`
      :'此職種沒有對應的場域導覽圖。';
    elements.venueGuideBtn.disabled=!map;
    elements.venueGuideOriginal.hidden=!map;
    if(map)elements.venueGuideOriginal.href=map.original||map.preview;
    const rawDiagrams=DIAGRAMS[p.id];
    const possible=Array.isArray(rawDiagrams)?rawDiagrams:(rawDiagrams?[rawDiagrams]:[]);
    const validDiagrams=possible.filter(d=>d && typeof d.path==='string' && /^assets\/diagrams\/[\w\-.]+\.(png|jpg|jpeg|webp|svg|pdf)$/i.test(d.path));
    elements.indoorDiagramStatus.textContent=validDiagrams.length?'此職種有獨立配置圖，請依圖面標示及現場指示確認。':'目前沒有此職種的獨立室內崗位配置圖。';
    elements.indoorDiagramList.hidden=!validDiagrams.length;
    elements.indoorDiagramPending.hidden=!!validDiagrams.length;
    elements.indoorDiagramList.replaceChildren();
    for(const d of validDiagrams){
      const a=create('a','feature-link',`${d.title||'職種崗位配置圖'} ↗`);
      a.href=d.path;a.target='_blank';a.rel='noopener';elements.indoorDiagramList.append(a);
    }
    const publicWeb=isPublicWebUrl();
    let unifiedUrl='';try{unifiedUrl=new URL('../individual.html?skill='+encodeURIComponent(p.id),window.location.href).href;}catch(err){/* 無網址的預覽環境不產生公開分享連結 */}
    currentPublicShareUrl=publicWeb?unifiedUrl:'';
    elements.shareUrlText.textContent=publicWeb?currentPublicShareUrl:'請在正式網站開啟此頁後複製職種連結。';
    elements.shareHelp.textContent=publicWeb?'複製連結後，開啟即可查看這個職種。':'請在正式網站開啟此頁後再複製職種連結。';
    elements.copyProgramLink.disabled=!publicWeb;
  }
  async function copyText(textValue){
    try{
      if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(textValue);return true;}
    }catch(err){/* fallback */}
    const ta=create('textarea');ta.value=textValue;ta.readOnly=true;ta.style.position='fixed';ta.style.left='-9999px';document.body.append(ta);ta.focus();ta.select();
    let copied=false;try{copied=document.execCommand('copy');}catch(err){}ta.remove();return copied;
  }
  const prefersReducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const mapScrollBehavior=()=>prefersReducedMotion.matches?'auto':'smooth';
  function scrollToProgramLocation(){
    const pin=mapId===destinationMap(byId(current),currentDestination)?shownPins().find(x=>x.programId===current&&usableVenuePin(x)):null;
    if(!pin){elements.mapViewport.scrollIntoView({block:'center',behavior:mapScrollBehavior()});toast('已顯示正式場館文字資訊；此目的地沒有可用的圖面標記，請依現場指示');return;}
    if(!elements.mapImage.complete||!elements.mapImage.naturalWidth){pendingFocus=true;return;}
    pendingFocus=false;
    if(zoom<1.4)setZoom(1.4,false);
    elements.mapViewport.scrollIntoView({behavior:mapScrollBehavior(),block:'center'});
    requestAnimationFrame(()=>locateSelected());
  }

  function renderDestinationCard(){
    const p=byId(current);if(!p||!elements.destinationProgram)return;
    elements.destinationSite.textContent=p.site;
    elements.destinationProgram.textContent=`${p.id} ${p.name}`;
    elements.destinationPlace.textContent=`${destinationLabel(currentDestination)}：${destinationValue(p,currentDestination)}`;
    const expectedMap=destinationMap(p,currentDestination);
    const candidates=mapId===expectedMap?destinationPins().filter(pin=>pin.programId===p.id):[];
    const localReferences=candidates.filter(pin=>pin.verification==='source_map_reference');
    const mapped=candidates.some(pin=>pin.verification!=='pending' && pin.verification!=='source_map_reference');
    const externalReferences=candidates.some(isExteriorMapReference);
    const hasPurposePin=candidates.some(usableVenuePin);
    elements.destinationStatus.textContent=localReferences.length
      ?localReferences.some(pin=>pin.sourceKind==='classroom_diagram')
        ?'教室位置示意：藍色「學」標記對應學科圖配置格位，非教室門口；請依現場標示入場。'
        :localReferences.some(pin=>pin.sourceKind==='registration_symbol')
          ?'報到區域參考：橘色「報」標記對應來源報到圖，實際桌位請依現場指引。'
          :`地圖僅標示館舍區域，並非${destinationLabel(currentDestination)}的精確門口或桌位；請依現場指示。`
      :externalReferences
        ?`地圖僅標示已公布的競賽館舍區域，非${destinationLabel(currentDestination)}的精確教室／報到桌。`
        :mapped
          ?'已標示圖面參考位置；不是現場實測門口。'
          :hasPurposePin?'此位置仍須核對；請以正式文字與現場指引為準。'
          :'詳細位置尚待核對；請依上方已公布地點文字與現場指引，地圖不猜測精確位置。';
    const hasAdminRoom=p.site==='北科附工'&&currentDestination==='theory'&&/行政大樓/.test(p.theory||'');
    elements.destinationFloorLink.hidden=!hasAdminRoom;
    if(hasAdminRoom)elements.destinationFloorLink.href=`../floor.html?skill=${p.id}`;
    if(elements.returnSkillDetails)elements.returnSkillDetails.href=`../skills.html?skill=${p.id}`;
    elements.destinationTabs?.querySelectorAll('[data-purpose]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.purpose===currentDestination));button.setAttribute('aria-label',`${destinationLabel(button.dataset.purpose)}，${button.dataset.purpose===currentDestination?'目前選取':'點選切換地圖'}`);});
  }

  function navigateDestination(purpose,{updateUrl=true,scroll=true}={}){
    if(!['registration','theory','practical'].includes(purpose))return;
    const p=byId(current);if(!p)return;
    currentDestination=purpose;
    const targetMap=destinationMap(p,purpose);if(!targetMap)return;
    const hasConfirmed=destinationPinsFor(targetMap,purpose).some(pin=>pin.programId===p.id&&usableVenuePin(pin));
    const changed=mapId!==targetMap;
    mapId=targetMap;site=p.site;zoom=hasConfirmed?1.4:1;
    closeCluster();hideMobileCard();
    renderAll();
    if(updateUrl)syncUrl(current);
    if(scroll){requestAnimationFrame(()=>{if(hasConfirmed)scrollToProgramLocation();else elements.mapViewport.scrollIntoView({behavior:mapScrollBehavior(),block:'center'});});}
  }

  function selectedPins() {
    const grouped=new Map();
    for(const p of DATA.pins.filter(x=>x.mapId===mapId)) {
      if(!grouped.has(p.programId)) grouped.set(p.programId,[]);
      grouped.get(p.programId).push(p);
    }
    for(const [key,pins] of Object.entries(corrections)) {
      const [m,program]=key.split(':');
      if(m===mapId && Array.isArray(pins)) grouped.set(program,pins.map(o=>({...o,mapId:m,programId:program,edited:true})));
    }
    return [...grouped.values()].flat().filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100);
  }
  function filterDestinationBuildingPins(pins,purpose,targetMap){
    const result=[];
    for(const pin of pins){
      const cfg=V12_PATCH.destinationOverrides?.[pin.programId];
      if(!cfg || cfg.mapId!==targetMap || !cfg.placeByPurpose?.[purpose]){result.push(pin);continue;}
      const expected=cfg.pointByPlace[cfg.placeByPurpose[purpose]];
      // Exact comparison of existing recorded coordinates; no inferred map point.
      if(expected && Math.abs(pin.x-expected.x)<.002 && Math.abs(pin.y-expected.y)<.002)
        result.push({...pin,purposeReference:true,placeReference:cfg.placeByPurpose[purpose]});
    }
    return result;
  }
  // Regular map-03 coordinates remain untouched. Non-practical external choices reuse
  // an explicitly labelled campus-building reference (never an invented classroom/desk).
  function destinationPinsFor(targetMap,purpose){
    const original=(targetMap===mapId?selectedPins():DATA.pins.filter(pin=>pin.mapId===targetMap));
    if(purpose==='practical')return filterDestinationBuildingPins(original,purpose,targetMap);
    const map=DATA.maps.find(m=>m.id===targetMap);
    if(!map)return [];
    if(map.site!=='北科附工'){
      // 29 機器手臂技術：依正式館舍分流，不再將兩棟建築同時當成當前目的地。
      const external=original.map(pin=>({...pin,purposeReference:true}));
      return filterDestinationBuildingPins(external,purpose,targetMap);
    }
    const refs=(BEACONS[purpose]||{});
    return Object.entries(refs).flatMap(([programId,pins])=>pins.map(pin=>({
      mapId:targetMap,programId,...pin,purposeReference:true,
      status:pin.source||'來源導覽圖館舍／教室格位示意'
    })));
  }
  function destinationPins(){return destinationPinsFor(mapId,currentDestination);}
  const destinationSymbol=()=>({registration:'報',theory:'學',practical:'術'})[currentDestination];
  function selectedVisiblePin(p){return p.programId===current&&usableVenuePin(p)&&
    mapId===destinationMap(byId(current),currentDestination);}
  // Coordinates in DATA.pins and exported JSON always refer to the un-cropped original full image.
  function activeFocus() { return mapMode==='focus' ? (FOCUS[mapId] || null) : null; }
  function screenPoint(p) {
    const f=activeFocus();
    return f ? {...p, x:p.x, y:(p.y/100*f.sourceHeight-f.top)/f.height*100} : {...p};
  }
  function originalPointFromScreen(x,y) {
    const f=activeFocus();
    return {x, y:f ? (f.top+y/100*f.height)/f.sourceHeight*100 : y};
  }
  function shownPins(){return destinationPins().map(screenPoint).filter(p=>p.y>=0&&p.y<=100);}
  function shownServicePins(){return DATA.servicePins.filter(p=>p.mapId===mapId).map(screenPoint).filter(p=>p.y>=0&&p.y<=100);}
  function displayedAspect(){const f=activeFocus();const m=getMap();return f?f.height/f.width:m.height/m.width;}
  function updateModeButtons(){
    elements.focusMode.setAttribute('aria-pressed',String(mapMode==='focus'));
    elements.fullMode.setAttribute('aria-pressed',String(mapMode==='full'));
  }
  function siteButtons() {
    elements.siteTabs.replaceChildren();
    for (const venue of sites) {
      const btn=create('button','site-tab');btn.type='button';btn.dataset.site=venue.name;btn.setAttribute('aria-pressed',String(site===venue.name));
      btn.append(create('span','',String(forSite(venue.name).length).padStart(2,'0')),document.createTextNode(venue.name));
      btn.addEventListener('click',()=>chooseSite(venue.name));elements.siteTabs.append(btn);
    }
  }
  function globalSelect() {
    const optFrag=document.createDocumentFragment();
    for(const p of [...DATA.programs].sort((a,b)=>a.id.localeCompare(b.id))) {const opt=create('option','',`${p.id}｜${p.name} · ${p.site}`); opt.value=p.id;optFrag.append(opt);}
    elements.globalProgram.append(optFrag);
  }
  function enterServiceMode({serviceId=null,updateUrl=true,scroll=false,push=false}={}){
    site='北科附工';mapId='map-00';zoom=1;mapMode='focus';
    currentService=serviceId&&serviceById(serviceId)?serviceId:'desk';
    hideMobileCard();closeCluster();renderAll();
    if(updateUrl)syncServiceUrl(serviceId,{push});
    if(scroll)requestAnimationFrame(()=>elements.mapViewport.scrollIntoView({behavior:mapScrollBehavior(),block:'start'}));
  }
  function chooseSite(name) {
    if(!sites.some(x=>x.name===name))return;
    site=name;
    elements.programSearch.value='';
    const maps=availableMaps(site);
    mapId=site==='北科附工'?'map-03':maps[0].id;
    current=forSite(site)[0]?.id||'';currentDestination='practical';
    zoom=1;
    hideMobileCard();closeCluster();renderAll();
    if(current)syncUrl(current,{push:true});
  }
  function chooseProgram(id,{focus=true,preserveMap=false,updateUrl=true}={}) {
    const p=byId(id);if(!p)return;
    if(!preserveMap)currentDestination='practical';
    const targetMap=destinationMap(p,currentDestination);
    const shouldChange=site!==p.site || mapId==='map-00' || (!preserveMap && mapId!==targetMap);
    site=p.site;current=id;
    if(shouldChange){
      mapId=targetMap;zoom=1;
      elements.programSearch.value='';
      closeCluster();renderAll();
    }else{
      closeCluster();renderProgramList();renderDetails();renderPins();renderShortcuts();renderEditorUI();
    }
    elements.globalProgram.value=id;
    if(updateUrl)syncUrl(id,{push:true});
    if(focus)hideMobileCard();else showMobileCard('program');
    if(focus){requestAnimationFrame(scrollToProgramLocation);}
  }
  function renderMapSelect(){
    const options=availableMaps(site);elements.mapSelect.replaceChildren();
    for(const m of options){const opt=create('option','',m.title);opt.value=m.id;elements.mapSelect.append(opt);}
    elements.mapSelect.value=mapId;
  }
  function renderProgramList() {
    const q=elements.programSearch.value.trim().toLocaleLowerCase();
    const programs=forSite(site);
    const shared=window.GK_SKILL_SEARCH, guide=window.GK_GUIDE_DATA;
    let filtered=programs;
    if(q && shared && guide){
      const ids=new Set(programs.map(p=>p.id));
      const ranked=shared.find(guide.skills.filter(p=>ids.has(p.id)),q);
      const byProgramId=new Map(programs.map(p=>[p.id,p]));
      filtered=ranked.map(result=>byProgramId.get(result.skill.id)).filter(Boolean);
      // Keep existing searches for registration, practical venue and meeting text.
      const included=new Set(filtered.map(p=>p.id));
      filtered.push(...programs.filter(p=>!included.has(p.id)&&[p.id,p.name,p.theory,p.practical,p.registration,p.meeting,p.registrationTime,...(p.aliases||[])].join(' ').toLocaleLowerCase().includes(q)));
    }else if(q){
      filtered=programs.filter(p=>[p.id,p.name,p.theory,p.practical,p.registration,p.meeting,p.registrationTime,...(p.aliases||[])].join(' ').toLocaleLowerCase().includes(q));
    }
    elements.siteProgramCount.textContent=`${filtered.length} / ${forSite(site).length} 項`;
    elements.programList.replaceChildren();
    if(!filtered.length) {elements.programList.append(create('p','list-empty','查無符合的職種；請嘗試其他名稱或編號。'));return;}
    for(const p of filtered) {
      const btn=create('button','program-item');btn.type='button';btn.setAttribute('role','listitem');btn.setAttribute('aria-pressed',String(current===p.id));
      const lbl=create('span','program-label');lbl.append(create('span','program-label-name',p.name),create('span','program-mini-time',`11/24 報到 ${p.registrationTime||'待確認'}`));
      btn.append(create('span','program-no',p.id),lbl);
      const unconfirmed=DATA.pins.some(pin=>pin.programId===p.id&&pin.verification==='pending'&&!isExteriorMapReference(pin));
      const edited=Object.keys(corrections).some(k=>k.endsWith(`:${p.id}`));
      if(unconfirmed||edited)btn.append(create('span','program-review','位置待核對'));
      else if(DATA.pins.some(pin=>pin.programId===p.id&&isExteriorMapReference(pin)))btn.append(create('span','program-review venue-reference-tag','館舍示意'));
      btn.append(create('span','program-arrow','›'));
      btn.addEventListener('click',()=>chooseProgram(p.id));elements.programList.append(btn);
    }
  }
  function renderDetails(){
    const p=byId(current);if(!p)return;
    elements.detailNumber.textContent=p.id;elements.detailTitle.textContent=p.name;elements.detailSite.textContent=`所屬場域：${p.site}`;
    elements.detailRegistrationDate.textContent=p.registrationDateLabel||'待確認';
    elements.detailRegistrationTime.textContent=p.registrationTime||'待確認';
    const special=Boolean(p.registrationTime&&p.registrationTime!=='13:00–14:00');
    elements.registrationTag.textContent=special?'特別報到時段 · 請留意':'依個別職種報到表';
    elements.registrationTag.className=special?'special-time-tag':'standard-time-tag';
    elements.registrationTasksBox.hidden=!p.registrationTasks?.length;
    elements.registrationTasksList.replaceChildren();
    for(const item of p.registrationTasks||[]) elements.registrationTasksList.append(create('li','',item));
    elements.detailRegistration.textContent=p.registration||'依職種公告';elements.detailTheory.textContent=p.theory||'依職種公告';
    elements.detailPractical.textContent=p.practical||'依職種公告';elements.detailMeeting.textContent=p.meeting||'依職種公告';
    elements.detailNotes.hidden=!p.notes?.length;
    elements.detailNotes.textContent=(p.notes||[]).join(' ');
    elements.globalProgram.value=p.id;
    const uncertain=DATA.pins.filter(pin=>pin.programId===p.id&&pin.verification==='pending'&&!isExteriorMapReference(pin));
    const outsideReference=DATA.pins.some(pin=>pin.programId===p.id&&isExteriorMapReference(pin));
    const changed=Object.entries(corrections).filter(([key])=>key.endsWith(`:${p.id}`));
    const editedCount=changed.reduce((n,[key,points])=>n+(Array.isArray(points)?Math.max(1,points.filter(point=>point.verification==='pending').length):1),0);
    const verify=elements.detailVerification;
    verify.replaceChildren();
    verify.className='verify-banner '+(uncertain.length||editedCount?'verify-pending':'verify-source');
    if(uncertain.length||editedCount){
      verify.append(create('strong','','⚠ 此職種有圖面定位需再核對'),create('span','','未核對的座標不代表已確認入口、樓層或動線；請依現場人員指示。'));
    }else if(outsideReference){
      verify.append(create('strong','','正式競賽館舍及報到時間已確認'),create('span','','選取職種後，橘色呼吸標記提示館舍方向；座標並非入口實測，請依現場指示通行。'));
    }else{
      verify.append(create('strong','','依場域圖面標示'),create('span','','圖面標點僅供辨識場地相對位置，不代表現場入口實測。'));
    }
    renderProgramExtra();
    renderDestinationCard();
    window.dispatchEvent(new CustomEvent('gk:programchange',{detail:{id:p.id}}));
  }
  function renderServices(){
    const isService=mapId==='map-00';
    document.body.classList.toggle('v13-service-mode',isService);
    const entry=$('serviceModeButton');
    if(entry){
      entry.setAttribute('aria-pressed',String(isService));
      entry.textContent=isService?'目前顯示大會服務互動圖 ✓':'開啟大會服務互動圖 ↗';
    }
    const tabs=elements.siteTabs.querySelectorAll('[data-site]');
    tabs.forEach(tab=>tab.setAttribute('aria-pressed',String(!isService&&tab.dataset.site===site)));
    const heading=$('explorer-title');
    if(heading)heading.textContent=isService?'北科附工大會服務互動圖':'互動校園地圖';
    const sidebar=$('mapWorkspace')?.querySelector('.sidebar');
    if(sidebar)sidebar.hidden=isService;
    elements.destinationTabs?.closest('.destination-card')?.toggleAttribute('hidden',isService);
    elements.serviceSection.hidden=!isService;
    if(elements.serviceDeskBeacon)elements.serviceDeskBeacon.hidden=true;
    elements.disciplineDetails.hidden=isService;
    if(elements.adminPanel)elements.adminPanel.hidden=isService;
    if(!isService)return;
    renderServiceList();
  }
  function serviceById(id){return DATA.services.find(s=>s.id===id);}
  function chooseService(id,{focus=true}={}){
    if(!serviceById(id))return;
    currentService=id;closeCluster();renderServiceList();renderPins();showMobileCard('service');
    if(focus)requestAnimationFrame(()=>{
      elements.mapViewport.scrollIntoView({behavior:mapScrollBehavior(),block:'center'});
      requestAnimationFrame(locateSelected);
    });
    syncServiceUrl(id);

  }
  function renderServiceList(){
    const q=elements.serviceSearch.value.trim().toLocaleLowerCase();
    elements.serviceList.replaceChildren();
    const hits=DATA.services.filter(s=>!q||`${s.id} ${s.name} ${s.place}`.toLocaleLowerCase().includes(q));
    for(const svc of hits){
      const btn=create('button','service-item');btn.type='button';btn.setAttribute('aria-pressed',String(svc.id===currentService));
      btn.append(create('span','service-no',svc.displayId||svc.id),create('span','service-item-name',svc.name));
      if(svc.pending){btn.classList.add('pending-service');btn.append(create('span','service-review','待公告'));}
      btn.addEventListener('click',()=>chooseService(svc.id));elements.serviceList.append(btn);
    }
    if(!hits.length)elements.serviceList.append(create('p','list-empty','找不到符合的服務項目。'));
    const s=serviceById(currentService);if(!s)return;
    elements.serviceDetail.replaceChildren();
    elements.serviceDetail.append(create('h4','',s.id==='desk'?s.name:`${s.id}｜${s.name}`),create('p','',`場地／位置：${s.place}`));
    const status=create('div',`service-status ${s.pending?'is-pending':''}`,
      s.pending?'⚠ 尚待正式公告；請勿將候選日期或場地視為實際指引':s.locationUnmapped?'服務台在穿堂；目前僅提供醒目呼吸提示，不是地圖座標，現場位置待核對':s.hasPin?'圖上有編號定位（非實測入口／車位）':s.referencePinServiceId?'無固定停車位置點；可參考校門入口':'無固定定位點，請參考文字說明');
    elements.serviceDetail.append(status);
    if(s.statusNote) elements.serviceDetail.append(create('p','service-clarification',s.statusNote));
    if(s.id==='desk'){
      const link=create('a','feature-link','開啟穿堂服務台專屬連結 ↗');
      const url=new URL(location.href);
      url.searchParams.delete('program');url.searchParams.delete('destination');
      url.searchParams.set('service','desk');url.hash='explorer';
      link.href=url.href;
      elements.serviceDetail.append(link);
    }
    if(isParkingService(s)){
      elements.serviceDetail.append(create('p','service-clarification',s.hasPin
        ?'P 圖示表示官方導覽圖中的停車區域，不代表每個車格皆可使用；請依停車證及現場指揮。'
        :'本類停車資訊依正式交通圖及文字指引呈現，沒有經確認的精確停車格座標。'));
    }
    const hasPoint=DATA.servicePins.some(p=>p.mapId===mapId&&p.serviceId===currentService);
    const hasReference=Boolean(s.referencePinServiceId&&DATA.servicePins.some(p=>p.mapId===mapId&&p.serviceId===s.referencePinServiceId));
    elements.serviceLocateBtn.disabled=!(hasPoint||hasReference);
    elements.serviceLocateBtn.textContent=s.id==='desk'&&hasPoint?'⌖ 查看地圖中「服」定位點':hasPoint?'⌖ 在圖上定位此服務項目':hasReference?`⌖ 查看${s.referenceLabel||'入口'}`:'⌖ 本項目沒有圖面定位';
  }
  function clusteringGroups(all){
    const map=getMap(),stageW=elements.mapStage.getBoundingClientRect().width||elements.mapViewport.clientWidth||720;
    const stageH=stageW*displayedAspect();
    const threshold=(window.innerWidth<=520?42:34);
    if(editMode) return all.map(p=>[p]); // 校正時每一處必須能單獨選取
    const groups=[];
    for(const point of all){
      let winner=null,best=Infinity;
      for(const group of groups){
        const cx=group.reduce((n,p)=>n+p.x,0)/group.length;
        const cy=group.reduce((n,p)=>n+p.y,0)/group.length;
        const d=Math.hypot((point.x-cx)*stageW/100,(point.y-cy)*stageH/100);
        if(d<threshold && d<best){winner=group;best=d;}
      }
      if(winner)winner.push(point);else groups.push([point]);
    }
    return groups;
  }
  function closeCluster(){elements.clusterChooser.hidden=true;currentCluster=null;}
  function openCluster(points,isService){
    hideMobileCard();currentCluster=points;
    elements.clusterTitle.textContent=`此處有 ${points.length} 個定位點`;
    elements.clusterItems.replaceChildren();
    for(const p of points){
      const id=isService?p.serviceId:p.programId,datum=isService?serviceById(id):byId(id);
      const button=create('button','');button.type='button';
      const sameItems=points.filter(q=>(isService?q.serviceId:q.programId)===id);
      const ordinal=sameItems.indexOf(p)+1;
      const idTag=create('b','',id);const content=create('span','',datum?.name||id);
      if(sameItems.length>1)content.append(create('small','',`第 ${ordinal} 處定位`));
      if(isExteriorMapReference(p))content.append(create('small','','已確認競賽館舍｜圖面方向示意'));
      else if(p.verification==='pending'||datum?.pending)content.append(create('small','','圖面座標待核對／待公告'));
      button.append(idTag,content);
      button.addEventListener('click',()=>{
        closeCluster();
        if(isService)chooseService(id,{focus:false});
        else {
          chooseProgram(id,{focus:false,preserveMap:true});
          if(usableVenuePin(p)){
            const stage=elements.mapStage.getBoundingClientRect(),view=elements.mapViewport.getBoundingClientRect();
            const x=stage.left+stage.width*p.x/100,y=stage.top+stage.height*p.y/100;
            elements.mapViewport.scrollTo({left:elements.mapViewport.scrollLeft+x-(view.left+view.width/2),top:elements.mapViewport.scrollTop+y-(view.top+view.height/2),behavior:mapScrollBehavior()});
          }
        }
      });elements.clusterItems.append(button);
    }
    elements.clusterChooser.hidden=false;
  }
  function positionSelectedLabel(marker,point){
    if(point.x<23)marker.classList.add('label-near-left');
    else if(point.x>77)marker.classList.add('label-near-right');
    if(point.y<20)marker.classList.add('label-below');
  }
  function renderPins(){
    const isService=mapId==='map-00';
    const all=isService?shownServicePins():shownPins();
    // 服務台永遠獨立成「服」呼吸燈；鄰近 14/16 交由群組按鈕展開。
    const deskPoint=isService?all.find(p=>p.serviceId==='desk'):null;
    const clustered=isService?all.filter(p=>p.serviceId!=='desk'):all;
    const groups=clusteringGroups(clustered);
    elements.pinLayer.replaceChildren();
    for(const group of groups){
      if(group.length>1){
        const x=group.reduce((a,p)=>a+p.x,0)/group.length,y=group.reduce((a,p)=>a+p.y,0)/group.length;
        const nearDesk=isService&&deskPoint&&Math.hypot((x-deskPoint.x)*(elements.mapStage.getBoundingClientRect().width||720)/100,(y-deskPoint.y)*(elements.mapStage.getBoundingClientRect().width||720)*displayedAspect()/100)<80;
        const btn=create('button',`map-pin pin-cluster ${nearDesk?'near-desk-cluster':''}`,`+${group.length}`);btn.type='button';
        btn.style.left=`${x}%`;btn.style.top=`${y}%`;
        btn.title=`${group.length} 處位置重疊，點選展開`;
        btn.setAttribute('aria-label',`此處有 ${group.length} 個定位點，點選展開清單`);
        btn.dataset.cluster=String(group.length);
        btn.addEventListener('click',e=>{e.stopPropagation();openCluster(group,isService);});
        elements.pinLayer.append(btn);
        // The chosen point remains at its original coordinate even inside a cluster.
        const selected=isService?group.find(p=>p.serviceId===currentService):group.find(selectedVisiblePin);
        if(selected && !nearDesk){
          const selectedId=isService?selected.serviceId:selected.programId;
          const info=isService?serviceById(selectedId):byId(selectedId);
          const externalReference=!isService&&isExteriorMapReference(selected);
          const parking=isService&&isParkingService(info);
          const truck=isService&&isTruckService(info);
          const marker=create('button',`map-pin is-active selected-target selected-cluster-pin ${externalReference?'venue-illustrative':''} ${selected.purposeReference?'destination-reference':''} ${isService?'':'destination-'+currentDestination} ${parking?'parking-marker':''} ${truck?'unloading-marker':''}`,isService?servicePinSymbol(info):destinationSymbol());
          marker.type='button';marker.style.left=`${selected.x}%`;marker.style.top=`${selected.y}%`;positionSelectedLabel(marker,selected);
          marker.setAttribute('aria-label',`${selectedId} ${info?.name||''}，點選展開附近位置`);
          marker.title=`${selectedId} ${info?.name||''}｜${locationPinStatus(selected)}`;
          const skill=byId(selectedId),place=skill?destinationValue(skill,currentDestination):'';
          const label=create('span','selected-pin-label',isService?`${info?.name||''}｜${info?.place||''}`:`${selectedId} ${info?.name||''}｜${place.replace(/\s+/g,' ').trim()}${externalReference?'（館舍示意）':''}`);marker.append(label);
          marker.addEventListener('click',e=>{e.stopPropagation();openCluster(group,isService);});
          elements.pinLayer.append(marker);
        }
        continue;
      }
      const p=group[0],id=isService?p.serviceId:p.programId,datum=isService?serviceById(id):byId(id);
      if(!datum)continue;
      const active=isService?(id===currentService):(id===current);
      const externalReference=!isService&&isExteriorMapReference(p);
      const needsReview=isService?Boolean(datum.pending):(p.verification==='pending'&&!externalReference);
      const within=all.filter(q=>(isService?q.serviceId:q.programId)===id),index=within.indexOf(p);
      const editorTarget=editMode&&!isService&&active&&index===editIndex;
      const highlight=active&&!needsReview&&(isService||mapId===destinationMap(byId(id),currentDestination));
      const parking=isService&&isParkingService(datum);
      const truck=isService&&isTruckService(datum);
      const btn=create('button',`map-pin ${highlight?'is-active selected-target':''} ${externalReference?'venue-illustrative':''} ${p.purposeReference?'destination-reference':''} ${highlight&&!isService?'destination-'+currentDestination:''} ${parking?'parking-marker':''} ${truck?'unloading-marker':''} ${p.edited?'is-edited':''} ${needsReview?'needs-review':''} ${editorTarget?'is-editor-target':''}`,isService?servicePinSymbol(datum):highlight?destinationSymbol():id);
      btn.type='button';btn.style.left=`${p.x}%`;btn.style.top=`${p.y}%`;if(highlight)positionSelectedLabel(btn,p);
      if(isService)btn.dataset.service=id;else btn.dataset.program=id;
      btn.title=`${id} ${datum.name}${within.length>1?`（第 ${index+1} 處）`:''}｜${locationPinStatus(p)}`;
      btn.setAttribute('aria-label',`${id} ${datum.name}${within.length>1?`第 ${index+1} 處`:''}，${externalReference?'館舍方向示意，':needsReview?'座標待核對／待公告，':''}點選查看`);
      if(highlight){
        const place=destinationValue(datum,currentDestination);
        const label=create('span','selected-pin-label',isService?`${datum.name}｜${datum.place}`:`${id} ${datum.name}｜${place.replace(/\s+/g,' ').trim()}${externalReference?'（館舍示意）':''}`);
        btn.append(label);
      }
      btn.addEventListener('click',ev=>{
        ev.stopPropagation();closeCluster();
        if(isService) chooseService(id,{focus:false});
        else if(editMode){current=id;editIndex=index;renderProgramList();renderDetails();renderEditorUI();renderPins();toast(`已選擇 ${id} 第 ${index+1} 處，點地圖可移動此點`);}
        else chooseProgram(id,{focus:false,preserveMap:true});
      });elements.pinLayer.append(btn);
    }
    if(deskPoint){
      const deskInfo=serviceById('desk');
      const marker=create('button',`map-pin service-desk-pin ${currentService==='desk'?'is-active selected-target':''}`,'服');
      marker.type='button';
      marker.dataset.service='desk';
      marker.style.left=`${deskPoint.x}%`;
      marker.style.top=`${deskPoint.y}%`;
      marker.title='服務台｜行政大樓穿堂（14、16 號之間；圖面示意）';
      marker.setAttribute('aria-label','服務台，行政大樓穿堂，位於原圖14與16號之間，點選查看資訊');
      marker.append(create('span','service-desk-pin-label','服務台'));
      marker.addEventListener('click',ev=>{ev.stopPropagation();closeCluster();chooseService('desk',{focus:false});});
      elements.pinLayer.append(marker);
    }
    elements.pinCount.textContent=`定位點 ${all.length} 處 · 分為 ${groups.length+(deskPoint?1:0)} 組`;
    if(isService){
      const selected=all.filter(x=>x.serviceId===currentService),svc=serviceById(currentService);
      if(svc?.pending)elements.mapStatus.textContent=`⚠ ${currentService} ${svc.name}：日期／場地尚待公告，請勿依候選資訊前往。`;
      else if(selected.length)elements.mapStatus.textContent=`${currentService}｜${svc?.name||''}（${selected.length} 處）。若點位重疊，請點「＋數量」展開；非實測入口。`;
      else if(svc?.referencePinServiceId)elements.mapStatus.textContent=`${currentService} 未提供固定點位；可參考 ${svc.referencePinServiceId} 校門入口，但不是停車位。`;
      else elements.mapStatus.textContent='本項目沒有固定地圖定位，請參考服務對照表。';
      return;
    }
    const selected=all.filter(x=>x.programId===current);
    elements.locateBtn.disabled=!selected.some(usableVenuePin);
    elements.locateBtn.textContent=selected.some(usableVenuePin)?`⌖ 查看${destinationLabel(currentDestination)}標記`:'⌖ 位置待核對';
    if(selected.length){
      const highlighted=selected.filter(usableVenuePin);
      const reference=selected.some(p=>p.purposeReference);
      elements.mapStatus.textContent=highlighted.length
        ?`${current} ${byId(current)?.name||''}｜${destinationLabel(currentDestination)}：${highlighted.length} 處${reference?'圖面示意／教室格位':'圖面定位'}。呼吸燈不是實測門口；請依現場指引。`
        :`${current} ${byId(current)?.name||''}：此圖面點位待核對，無已確認定位，請依正式地點文字。`;
    }else{
      elements.mapStatus.textContent=`${current} ${byId(current)?.name||''}｜${destinationLabel(currentDestination)}：本圖尚無可靠定位座標，請依正式地點文字及現場指引。`;
    }
  }
  function renderShortcuts(){
    const map=getMap(),isIndexed=mapId==='map-01'||mapId==='map-02';
    elements.mapShortcutBox.hidden=!isIndexed;
    if(!isIndexed)return;
    const registration=mapId==='map-01';
    elements.mapShortcutHeading.textContent=registration?'報到圖互動索引｜點選職種查看報到／會議資訊':'學科圖互動索引｜點選職種查看學科教室';
    elements.mapShortcutExplain.textContent='點選職種可查看報到／學科地點；未確認的教室座標不會以定位點顯示。';
    elements.mapShortcutList.replaceChildren();
    for(const p of forSite(site)){
      const btn=create('button','shortcut-item');btn.type='button';btn.setAttribute('aria-pressed',String(p.id===current));
      btn.append(create('b','',`${p.id} ${p.name}`),create('span','',registration?`11/24 ${p.registrationTime||'待確認'}｜${p.registration||'未填'}`:`學科：${p.theory||'未填'}`));
      btn.addEventListener('click',()=>chooseProgram(p.id,{focus:false,preserveMap:true}));elements.mapShortcutList.append(btn);
    }
  }
  function hideMobileCard(){elements.mobileCard.hidden=true;}
  function showMobileCard(kind){
    cardType=kind;
    if(window.innerWidth>520 || editMode)return;
    const datum=kind==='service'?serviceById(currentService):byId(current);
    if(!datum)return;
    elements.mobileCardTitle.textContent=datum.locationUnmapped?datum.name:`${datum.id}｜${datum.name}`;
    elements.mobileCardLabel.textContent=kind==='service'?'北科附工大會服務':'職種快速資訊';
    const area=kind==='service'?datum.place:destinationValue(datum,currentDestination);
    const note=kind==='service'&&datum.pending?'【待公告】'
      :kind==='program'&&DATA.pins.some(x=>x.programId===datum.id&&x.verification==='pending'&&!isExteriorMapReference(x))?'【圖面點位待核對】'
      :kind==='program'&&isExteriorVenue(datum)?'【競賽館舍已確認・圖面方向示意】':'';
    elements.mobileCardText.textContent=kind==='service'?`${note}位置：${area||'未提供'}${datum.locationUnmapped?'；地圖精確位置待核對':''}`:`${note}${destinationLabel(currentDestination)}：${area||'未提供'}`;
    const mobileLocate=$('mobileCardLocate');
    if(mobileLocate)mobileLocate.textContent=datum.locationUnmapped?'查看呼吸提示':'在圖上定位';
    elements.mobileCard.hidden=false;
  }
  function renderEditorUI(){
    if(!elements.pinIndex)return;
    const points=selectedPins().filter(p=>p.programId===current);
    if(editIndex>=points.length)editIndex=Math.max(0,points.length-1);
    elements.pinIndex.replaceChildren();
    if(!points.length){const o=create('option','','目前無定位點（可新增）');o.value='0';elements.pinIndex.append(o);}
    else for(let i=0;i<points.length;i++){
      const p=points[i],o=create('option','',`第 ${i+1} 處 · x ${p.x.toFixed(2)}%／y ${p.y.toFixed(2)}%`);
      o.value=String(i);elements.pinIndex.append(o);
    }
    elements.pinIndex.value=String(editIndex);
    elements.movePinMode.disabled=!points.length;
    elements.removePin.disabled=!editMode||!points.length;
    elements.pinIndex.disabled=!editMode||!points.length;
    elements.movePinMode.setAttribute('aria-pressed',String(editAction==='move'));
    elements.addPinMode.setAttribute('aria-pressed',String(editAction==='add'));
  }
  function renderMap(){
    const map=getMap();if(!map)return;
    // 報到或學科格位可能位於重點裁切範圍之外。必要時自動顯示完整圖，避免定位燈消失。
    if(mapMode==='focus'&&FOCUS[mapId]){
      const frame=FOCUS[mapId];
      const pinSet=destinationPinsFor(mapId,currentDestination)
        .filter(p=>p.programId===current&&usableVenuePin(p));
      const outside=pinSet.some(p=>{
        const y=(p.y/100)*frame.sourceHeight;
        return y<frame.top || y>frame.top+frame.height;
      });
      if(outside)mapMode='full';
    }
    const focus=activeFocus(); updateModeButtons();
    elements.mapViewport.style.setProperty('--map-aspect',String(1/displayedAspect()));
    elements.mapTitle.textContent=mapId==='map-00'?'北科附工｜大會服務互動圖':site;elements.mapSubtitle.textContent='';
    elements.originalLink.href=map.original||map.preview;
    elements.downloadOriginal.hidden=!map.original; if(map.original){elements.downloadOriginal.href=map.original;elements.downloadOriginal.download=map.sourceName;}
    elements.originalLink.textContent=map.original?'開啟原始高解析圖 ↗':'開啟完整網頁版圖面 ↗';
    elements.originalLink.removeAttribute('download');
    elements.mapImage.alt=`${site} ${map.title}｜${focus?'重點地圖':'完整導覽圖'}`;
    const selectedSrc=focus?focus.src:map.preview;
    const seq=++loadSequence;
    elements.mapLoading.hidden=false;
    elements.mapImage.style.opacity='0.42';
    elements.mapImage.onload=()=>{if(seq!==loadSequence)return;elements.mapLoading.hidden=true;elements.mapImage.style.opacity='1';
      requestAnimationFrame(()=>{renderPins();if(pendingFocus){pendingFocus=false;scrollToProgramLocation();}});
    };
    elements.mapImage.onerror=()=>{if(seq!==loadSequence)return;pendingFocus=false;elements.mapLoading.hidden=true;elements.mapImage.style.opacity='1';elements.mapStatus.textContent='地圖暫時無法載入，請開啟上方原始圖或稍後重新整理。';};
    pendingFocus=false;elements.mapImage.src=selectedSrc;
    elements.mapSelect.value=mapId;
    setZoom(zoom,false);
    closeCluster();hideMobileCard();renderServices();renderShortcuts();renderPins();renderEditorUI();
    if(elements.mapImage.complete&&elements.mapImage.naturalWidth>0){elements.mapLoading.hidden=true;elements.mapImage.style.opacity='1';requestAnimationFrame(renderPins);}
  }
  function renderNotes(){
    const venue=sites.find(x=>x.name===site);
    elements.mapNotes.replaceChildren();
    for(const n of venue?.mapNotes||[])elements.mapNotes.append(create('li','',n));
  }
  function renderAll() {
    siteButtons();renderMapSelect();renderProgramList();renderDetails();renderDestinationCard();renderNotes();renderMap();
  }
  function setZoom(value, focus=true){
    const old=zoom;zoom=Math.min(3.75,Math.max(1,Math.round(value*100)/100));
    elements.mapStage.style.width=`${Math.round(zoom*100)}%`;
    elements.zoomLabel.textContent=`${Math.round(zoom*100)}%`;
    requestAnimationFrame(renderPins);
    if(focus) requestAnimationFrame(()=>setTimeout(locateSelected,65));
  }
  function locateSelected(){
    const targetServiceId=(mapId==='map-00'&&serviceById(currentService)?.referencePinServiceId)||currentService;
    const pin=mapId==='map-00'?shownServicePins().find(x=>x.serviceId===targetServiceId):shownPins().find(selectedVisiblePin);
    if(!pin)return;
    const stage=elements.mapStage.getBoundingClientRect(),view=elements.mapViewport.getBoundingClientRect();
    const x=stage.left+stage.width*pin.x/100,y=stage.top+stage.height*pin.y/100;
    elements.mapViewport.scrollTo({left:elements.mapViewport.scrollLeft+x-(view.left+view.width/2),top:elements.mapViewport.scrollTop+y-(view.top+view.height/2),behavior:mapScrollBehavior()});
  }
  function clickOnMap(ev){
    if(!editMode||mapId==='map-00')return;
    if(!current){toast('請先選擇職種');return;}
    const box=elements.mapStage.getBoundingClientRect();if(!box.width||!box.height)return;
    const xView=Math.max(0,Math.min(100,((ev.clientX-box.left)/box.width)*100));
    const yView=Math.max(0,Math.min(100,((ev.clientY-box.top)/box.height)*100));
    const {x,y}=originalPointFromScreen(xView,yView);
    const key=`${mapId}:${current}`;
    const arr=selectedPins().filter(p=>p.programId===current).map(p=>({...p}));
    const newPoint={x:Number(x.toFixed(3)),y:Number(y.toFixed(3)),verification:'pending',source:'本機校正（未現場核定）',status:'本機自訂位置，待核定'};
    if(editAction==='add'){arr.push(newPoint);editIndex=arr.length-1;}
    else if(arr.length){arr[editIndex]={...arr[editIndex],...newPoint};}
    else{toast('目前沒有可移動的點，請先選擇「新增一處」');return;}
    corrections[key]=arr;
    storeCorrections();renderPins();renderEditorUI();renderDetails();renderProgramList();
    toast(editAction==='add'?`已新增第 ${arr.length} 處（不影響其他點）`:`已移動第 ${editIndex+1} 處（其他位置保留）`);
  }
  function exportCorrections(){
    const content=JSON.stringify({format:'GK115-map-overrides-v2',created:new Date().toISOString(),changes:corrections},null,2);
    const blob=new Blob([content],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='115工科賽_互動地圖_校正座標.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);toast('已匯出定位座標檔');
  }
  async function importCorrections(file){
    if(!file)return;
    try{
      const json=JSON.parse(await file.text());
      if(!['GK115-map-overrides-v1','GK115-map-overrides-v2'].includes(json.format)||!json.changes||typeof json.changes!=='object') throw Error('座標檔格式不符');
      const clean={};
      for(const [key,values] of Object.entries(json.changes)){
        if(!/^map-\d{2}:\d{2}$/.test(key)||!Array.isArray(values))continue;
        if(!DATA.maps.some(m=>m.id===key.slice(0,6))||!byId(key.slice(7)))continue;
        const positions=values.filter(v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=0&&v.y>=0&&v.x<=100&&v.y<=100);
        clean[key]=positions.map(v=>({...v,x:v.x,y:v.y,verification:'pending',source:'匯入座標（未現場核定）',status:'人工校正草稿，待核定'}));
      }
      corrections={...corrections,...clean};storeCorrections();renderPins();renderEditorUI();renderDetails();renderProgramList();toast(`已匯入 ${Object.keys(clean).length} 項座標`);
    } catch(err){toast(`匯入失敗：${err.message}`);}
  }
  function setup(){
    corrections=IS_EDITOR?readCorrections():{};
    const params=new URLSearchParams(location.search);
    const requested=params.get('program');
    const requestedService=params.get('service');
    const requestedDestination=params.get('destination');
    if(['registration','theory','practical'].includes(requestedDestination))currentDestination=requestedDestination;
    const venueNames={nkh:'北科附工',division:'桃竹苗分署',vanung:'萬能科大',nangang:'南港高工',sanchong:'三重商工',taishan:'泰山高中',xinxing:'新興高中'};
    const requestedVenue=venueNames[params.get('venue')];
    // 職種指定優先；單獨提供 venue 時直接載入該場域，而非假裝使用者已選擇首個職種。
    if(requested && byId(requested)){
      current=requested;site=byId(requested).site;mapId=destinationMap(byId(requested),currentDestination);
    }else if(requestedVenue && sites.some(x=>x.name===requestedVenue)){
      site=requestedVenue;current=forSite(site)[0]?.id||'01';currentDestination='practical';
      mapId=destinationMap(byId(current),currentDestination)||'map-03';
    }
    // 已知職種參數優先於服務參數；服務模式允許單獨的 ?view=services。
    if(!(requested&&byId(requested)) &&
      (params.get('view')==='services' || (requestedService&&serviceById(requestedService)))){
      site='北科附工';mapId='map-00';
      currentService=requestedService&&serviceById(requestedService)?requestedService:'desk';
    }
    globalSelect();renderAll();routeReady=true;
    if(requested && byId(requested) && !IS_EDITOR){
      requestAnimationFrame(()=>setTimeout(scrollToProgramLocation,340));
    }
    elements.globalProgram.addEventListener('change',e=>{if(e.target.value)chooseProgram(e.target.value);});
    elements.venueGuideBtn.addEventListener('click',()=>chooseProgram(current,{focus:true,preserveMap:false,updateUrl:false}));
    elements.copyProgramLink.addEventListener('click',async()=>{
      if(!currentPublicShareUrl){toast('請在正式網站開啟此頁後複製職種連結');return;}
      toast(await copyText(currentPublicShareUrl)?'已複製職種專屬網址':'複製失敗，請手動複製網址列');
    });
    elements.copyProgramSummary.addEventListener('click',async()=>{
      const p=byId(current);if(!p)return;
      const src=`115工科賽｜${p.id} ${p.name}\n場域：${p.site}\n11/24 報到：${p.registrationTime||'待確認'}｜${p.registration||'待確認'}\n學科：${p.theory||'待確認'}\n術科：${p.practical||'待確認'}\n領隊／檢討：${p.meeting||'待確認'}\n${currentPublicShareUrl?'導覽：'+currentPublicShareUrl+'\n':''}圖面位置非現場入口實測；以主辦單位最新公告為準。`;
      toast(await copyText(src)?'已複製職種資訊':'無法自動複製，請改用瀏覽器選取文字');
    });

    elements.programSearch.addEventListener('input',renderProgramList);
    $('clearSearch').addEventListener('click',()=>{elements.programSearch.value='';renderProgramList();});
    elements.mapSelect.addEventListener('change',e=>{
      const next=e.target.value;
      if(next==='map-00'){enterServiceMode({updateUrl:true,push:true});return;}
      mapId=next;zoom=1;editIndex=0;
      const matching={registration:'map-01',theory:'map-02',practical:'map-03'};
      if(site==='北科附工'){
        const purpose=Object.keys(matching).find(k=>matching[k]===next);
        if(purpose)currentDestination=purpose;
      }
      renderAll();syncUrl(current,{push:true});
    });
    elements.destinationTabs?.addEventListener('click',e=>{const b=e.target.closest('[data-purpose]');if(b)navigateDestination(b.dataset.purpose);});
    window.GK_OPEN_DESTINATION=purpose=>navigateDestination(purpose);
    elements.focusMode.addEventListener('click',()=>{if(mapMode==='focus')return;mapMode='focus';zoom=1;renderMap();elements.mapViewport.scrollTop=0;});
    elements.fullMode.addEventListener('click',()=>{if(mapMode==='full')return;mapMode='full';zoom=1;renderMap();elements.mapViewport.scrollTop=0;});
    $('zoomIn').addEventListener('click',()=>setZoom(zoom+.3));
    $('zoomOut').addEventListener('click',()=>setZoom(zoom-.3));
    $('zoomReset').addEventListener('click',()=>{setZoom(1);elements.mapViewport.scrollLeft=0;});
    elements.locateBtn.addEventListener('click',()=>{if(!elements.locateBtn.disabled){scrollToProgramLocation();}else chooseProgram(current,{focus:true,preserveMap:false,updateUrl:false});});
    elements.serviceLocateBtn.addEventListener('click',()=>{
      const s=serviceById(currentService);
      if(s?.id==='desk'){
        elements.mapViewport.scrollIntoView({behavior:mapScrollBehavior(),block:'center'});
        requestAnimationFrame(locateSelected);
        return;
      }
      if(s?.referencePinServiceId) toast('僅參考校門入口，不是停車位或裝卸位置');
      locateSelected();
    });
    elements.serviceSearch.addEventListener('input',renderServiceList);
    $('serviceModeButton')?.addEventListener('click',()=>enterServiceMode({serviceId:null,updateUrl:true,scroll:true,push:true}));
    // 服務台現已在圖中有明確的獨立點位，透過地圖標記直接選取。
    if(IS_EDITOR){
    elements.editToggle.addEventListener('click',()=>{editMode=!editMode;editAction='move';editIndex=0;closeCluster();hideMobileCard();elements.editToggle.setAttribute('aria-pressed',String(editMode));elements.editToggle.textContent=editMode?'結束校正模式':'開啟校正模式';elements.mapStage.classList.toggle('edit-mode',editMode);elements.editStatus.textContent=editMode?'先選擇要移動的第幾處點位，再在地圖點新位置；也可切換新增模式。變更僅存於本機。':'校正模式已關閉。';renderEditorUI();renderPins();});
    elements.mapStage.addEventListener('click',clickOnMap);
    elements.pinIndex.addEventListener('change',e=>{editIndex=Number(e.target.value)||0;renderPins();});
    elements.movePinMode.addEventListener('click',()=>{if(!editMode)return;editAction='move';renderEditorUI();});
    elements.addPinMode.addEventListener('click',()=>{if(!editMode)return;editAction='add';renderEditorUI();});
    elements.removePin.addEventListener('click',()=>{if(!editMode)return;const key=`${mapId}:${current}`,arr=selectedPins().filter(p=>p.programId===current).map(p=>({...p}));if(!arr.length)return;if(!confirm(`確定刪除 ${current} 第 ${editIndex+1} 處本機定位點？其他位置將保留。`))return;arr.splice(editIndex,1);corrections[key]=arr;storeCorrections();renderPins();renderEditorUI();renderDetails();renderProgramList();toast('已刪除指定一處；其他定位保留');});
    }
    elements.mapViewport.addEventListener('pointerdown',()=>{pendingFocus=false;},{passive:true});
    elements.mapViewport.addEventListener('wheel',()=>{pendingFocus=false;},{passive:true});
    $('clusterClose').addEventListener('click',closeCluster);
    $('mobileCardClose').addEventListener('click',hideMobileCard);
    $('mobileCardLocate').addEventListener('click',()=>{
      const desk=cardType==='service'&&currentService==='desk';
      hideMobileCard();
      if(desk){
        elements.mapViewport.scrollIntoView({behavior:mapScrollBehavior(),block:'center'});
        requestAnimationFrame(locateSelected);
        return;
      }
      elements.mapViewport.scrollIntoView({behavior:mapScrollBehavior(),block:'center'});
      requestAnimationFrame(locateSelected);
    });
    $('mobileCardDetails').addEventListener('click',()=>{hideMobileCard();(cardType==='service'?elements.serviceSection:elements.disciplineDetails).scrollIntoView({behavior:'smooth',block:'start'});});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCluster();hideMobileCard();}});
    window.addEventListener('resize',()=>requestAnimationFrame(renderPins));
    // 閱讀完整資訊時自動收起手機快捷卡，避免擋住配置圖。
    window.addEventListener('scroll',()=>{
      if(window.innerWidth>520 || elements.mobileCard.hidden || elements.disciplineDetails.hidden)return;
      const rect=elements.disciplineDetails.getBoundingClientRect();
      if(rect.top < window.innerHeight*0.7) hideMobileCard();
    },{passive:true});
    window.addEventListener('popstate',()=>{
      const params=new URLSearchParams(location.search);
      const id=params.get('program')||params.get('skill'),purpose=params.get('destination'),serviceId=params.get('service');
      // 優先序：有效 program > service / view=services > 場域預設。
      if(byId(id)){
        currentDestination=['registration','theory','practical'].includes(purpose)?purpose:'practical';
        site=byId(id).site;current=id;mapId=destinationMap(byId(id),currentDestination);zoom=1;
        renderAll();return;
      }
      if(params.get('view')==='services'||(serviceId&&serviceById(serviceId))){
        enterServiceMode({serviceId,updateUrl:false});return;
      }
      const byVenue={nkh:'北科附工',division:'桃竹苗分署',vanung:'萬能科大',nangang:'南港高工',sanchong:'三重商工',taishan:'泰山高中',xinxing:'新興高中'};
      site=byVenue[params.get('venue')]||'北科附工';current=forSite(site)[0]?.id||'01';
      currentDestination='practical';mapId=destinationMap(byId(current),currentDestination);zoom=1;
      renderAll();
    });
    if(IS_EDITOR){
    $('exportPins').addEventListener('click',exportCorrections);
    $('importPins').addEventListener('change',async ev=>{await importCorrections(ev.target.files?.[0]);ev.target.value='';});
    $('clearPin').addEventListener('click',()=>{if(!editMode){toast('請先開啟校正模式');return;}const key=`${mapId}:${current}`;if(Object.prototype.hasOwnProperty.call(corrections,key)){if(!confirm('確定還原本職種在此圖上的全部原始位置？'))return;delete corrections[key];editIndex=0;storeCorrections();renderPins();renderEditorUI();renderDetails();renderProgramList();toast('已還原本職種原始定位點');}else toast('目前沒有本職種自訂座標');});
    }
  }
  setup();
})();

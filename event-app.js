/* 115 工科賽大會資訊專區 v1.0 - 無第三方依賴，可離線使用 */
(() => {
'use strict';
const page=document.body.dataset.page;
const DATA=window.GK_EVENT_DATA;
if(!DATA){document.body.insertAdjacentHTML('afterbegin','<p role="alert">活動資料載入失敗。</p>');return;}
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=new URL(location.href);
function setQuery(k,v){try{const u=new URL(location.href);u.searchParams.set(k,v);history.replaceState({},'',u.pathname+u.search+u.hash)}catch(e){}}
const labels={checkin:'報到／點名',meeting:'會議',contest:'競賽',rest:'休息',press:'記者會',ceremony:'典禮',other:'其他'};
const titleDays={'24':['11 月 24 日','星期二',''], '25':['11 月 25 日','星期三',''], '26':['11 月 26 日','星期四',''], '27':['11 月 27 日','星期五','']};
function initHeader(){
 const nav=$(`[data-nav="${page}"]`);if(nav)nav.classList.add('active');
 const menu=$('#menuButton'),mn=$('#mobileNav');if(menu){menu.addEventListener('click',()=>{const open=mn.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))})}
}
function startAgenda(){
 const A=DATA.agenda;
 const params=new URLSearchParams(location.search);
 let day=A.days.includes(params.get('day'))?params.get('day'):'24';
 let venue=params.get('venue')||'all';
 const venueBox=$('#agendaVenue');
 venueBox.innerHTML='<option value="all">全部場域（查看分流）</option>'+Object.entries(A.venues).map(([key,v])=>`<option value="${key}">${esc(v.name)} (${v.count} 職種)</option>`).join('');
 if(!A.venues[venue] || day==='27')venue='all';venueBox.value=venue;
 const fmt=(t)=>/^\d\d:\d\d/.exec(t)?.[0]||t;
 const dayRender=()=>{
  $('#dayTabs').innerHTML=A.days.map(d=>`<button type="button" role="tab" data-day="${d}" aria-selected="${d===day}" class="${d===day?'active':''}"><small>星期${{'24':'二','25':'三','26':'四','27':'五'}[d]}</small><strong>11/${d}</strong></button>`).join('');
  $('#agendaDateEn').textContent=titleDays[day][2];$('#agendaDateTitle').innerHTML=`${titleDays[day][0]} <small>${titleDays[day][1]}</small>`;
  // 11/27 的22個程序以典禮詳細表 p.122–123 為主要來源。原大會概覽留在頁面差異說明。
  const dayEvents=day==='27'?[...DATA.ceremony.events.map(x=>({id:'detail-'+x.id,date:'27',time:x.time,title:x.title,kind:x.kind==='registration'?'checkin':'ceremony',who:['all'],place:DATA.ceremony.venue,detail:x.id==='c05'?'典禮正式開始 08:30（最新確定）':'原手冊 p.122–123 舊版細項時段；尚待新版核對',source:x.source,flag:null,venues:[]})),...A.events.filter(e=>e.id==='27-20')]:A.events.filter(ev=>ev.date===day);
  if($('#agendaCeremonyPriority'))$('#agendaCeremonyPriority').hidden=day!=='27';
  if($('#agendaLegacy'))$('#agendaLegacy').hidden=day!=='27';
  venueBox.disabled=day==='27';
  venueBox.title=day==='27'?'11/27 典禮地點為桃園市立綜合體育館，不適用七場域篩選。':'';
  const venueSide=$('#agendaVenueSidebar');if(venueSide)venueSide.hidden=day==='27';
  const specialRegistration=$('#agendaSpecialRegistration');if(specialRegistration)specialRegistration.hidden=day!=='24';
  const venueLabel=$('#agendaVenueLabel');if(venueLabel)venueLabel.textContent=day==='27'?'11/27 典禮於桃園市立綜合體育館（不適用七場域篩選）':'會議場域';
  if(day==='27'){venue='all';venueBox.value='all';setQuery('venue','all');}
  const shown=dayEvents.filter(ev=>{
   if(venue!=='all'&&ev.venues.length&&!ev.venues.includes(venue))return false;
   return true;
  }).sort((a,b)=>fmt(a.time).localeCompare(fmt(b.time)));
  $('#agendaSummary').textContent=day==='27'?`典禮詳細表 22 項程序＋賦歸 1 項；目前顯示 ${shown.length} 項。以 08:30 正式開始（確定）為準；報到入席 07:40–08:10 為原手冊時段，其他細項尚待新版確認。`: `本日大會概覽 ${dayEvents.length} 項；目前顯示 ${shown.length} 項。個別職種仍以專屬日程為準。`;
  $('#agendaList').innerHTML=shown.length?shown.map(ev=>{
   const hasVenue=venue!=='all'&&!ev.venues.length&&ev.who.includes('judge');
   const place=hasVenue?A.venues[venue].name+'（依該場域安排）':ev.place;
   return `<article class="agenda-item"><time class="agenda-time">${esc(ev.time)}</time><div class="agenda-card"><div class="agenda-main"><span class="kind-chip kind-${esc(ev.kind)}">${esc(labels[ev.kind]||'活動')}</span><h3>${esc(ev.title)}</h3><div class="agenda-place">⌖ ${esc(place)}</div>${ev.detail?`<p style="margin-top:11px">${esc(ev.detail)}</p>`:''}${ev.flag?`<p class="agenda-flags">⚠ ${esc(ev.flag)}</p>`:''}<p class="source-tiny" style="font-size:10px;color:#8ba1a8;margin-top:9px">來源：大會手冊 ${esc(ev.source)}</p></div></div></article>`
  }).join(''):'<div class="no-records">此日期與場域條件下，原始大會日程未列出活動；請改選其他場域，或參閱個別職種日程與原始 PDF。</div>';
  $('#venueCards').innerHTML=Object.entries(A.venues).map(([key,v])=>`<div><button type="button" class="venue-button ${venue===key?'active':''}" data-venue="${key}" aria-expanded="${venue===key}"><span class="venue-count">${v.count}</span><span class="venue-copy"><b>${esc(v.name)}</b><small>${esc(v.hint)}</small></span><span class="venue-expand">${venue===key?'−':'＋'}</span></button>${venue===key?`<div class="venue-details">${esc(v.skills.join('、'))}</div>`:''}</div>`).join('');
  setQuery('day',day);
 };
 $('#dayTabs').addEventListener('click',ev=>{const b=ev.target.closest('button[data-day]');if(!b)return;day=b.dataset.day;if(day==='27'){venue='all';venueBox.value='all';setQuery('venue','all')}dayRender()});
 venueBox.addEventListener('change',()=>{if(day==='27'){venue='all';venueBox.value='all';}else venue=venueBox.value;setQuery('venue',venue);dayRender()});
 $('#venueCards').addEventListener('click',ev=>{if(day==='27')return;const b=ev.target.closest('button[data-venue]');if(!b)return;venue=venue===b.dataset.venue?'all':b.dataset.venue;venueBox.value=venue;setQuery('venue',venue);dayRender()});
 $('#resetAgenda').addEventListener('click',()=>{day='24';venue='all';venueBox.value='all';setQuery('venue','all');dayRender()});
 dayRender();
}
function startCeremony(){
 const data=DATA.ceremony.events;
 let filter='all';
 const filters=[['all','全部 22 項'],['awarding','頒獎與表揚'],['performance','演出節目'],['registration','報到'],['ceremony','典禮程序'],['final','會旗交接']];
 function render(){
  $('#ceremonyFilters').innerHTML=filters.map(([key,label])=>`<button type="button" data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('');
  const shown=filter==='all'?data:data.filter(x=>x.kind===filter || (filter==='ceremony' && x.kind==='milestone'));
  $('#ceremonyList').innerHTML=shown.map((x)=>{
   const kindMap={registration:'報到',ceremony:'典禮',performance:'表演',awarding:'頒獎',milestone:'重要節點',final:'交接'};
   return `<article class="ceremony-row ${x.kind==='awarding'?'award':''} ${x.kind==='milestone'?'milestone':''}" role="button" tabindex="0" aria-pressed="false" aria-label="選取程序：${esc(x.time)} ${esc(x.title)}" data-ceremony="${x.id}"><time class="time">${esc(x.time)}</time><h3>${esc(x.title)}</h3><span class="kind">${esc(kindMap[x.kind])}${x.id==='c05'?' · 確定時間':' · 舊版待核'}</span></article>`;
  }).join('');
 }
 $('#ceremonyFilters').addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;filter=b.dataset.filter;render()});
 function selectCeremonyRow(row){if(!row)return;const activate=!row.classList.contains('selected');$$('.ceremony-row').forEach(x=>{const selected=activate&&x===row;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected));});}
 $('#ceremonyList').addEventListener('click',e=>selectCeremonyRow(e.target.closest('.ceremony-row')));
 $('#ceremonyList').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const row=e.target.closest('.ceremony-row');if(!row)return;e.preventDefault();selectCeremonyRow(row);});
 render();
}
// 路線座標直接對照官方圖二至圖七現有的箭頭區段（1105×985 像素）。
// 這些是局部視覺輔助動畫，不是可通行道路的完整路網，不得用作實際導航。
const TRANSPORT_MOTION_SEGMENTS={
 truck:[
  {d:'M 445 747 L 445 707 L 403 677 L 354 649 L 299 649 L 299 341',color:'#C94137',dur:8.2},
  {d:'M 268 802 L 66 802 L 65 167 L 369 167',color:'#157BAC',dur:10.8}
 ],
 vip:[
  {d:'M 437 774 L 437 722 L 465 694 L 479 665',color:'#A75383',dur:4.8}
 ],
 car:[
  {d:'M 423 721 L 423 675 L 457 641 L 493 608 L 589 608 L 670 604',color:'#CF7A23',dur:6.8},
  {d:'M 818 531 L 823 477 L 823 403 L 672 401',color:'#CF7A23',dur:6.0}
 ],
 coach:[
  {d:'M 284 766 L 39 766 L 39 164 L 382 164',color:'#8C6648',dur:10.0}
 ],
 'coach-walk':[
  {d:'M 431 123 L 436 180 L 373 242 L 317 260 L 280 304 L 280 438',color:'#1D2B33',dur:7.8}
 ],
 'car-walk':[
  {d:'M 426 777 L 426 724 L 400 681 L 287 672 L 285 550 L 285 477',color:'#1D2B33',dur:7.3},
  {d:'M 841 478 L 746 479 L 636 479 L 529 473',color:'#1D2B33',dur:5.0}
 ]
};
function buildTransportMotion(route,style){
 const tracks=TRANSPORT_MOTION_SEGMENTS[route]||[];
 if(style==='off'||!tracks.length)return '';
 return tracks.map((track,i)=>{
  const isWalker=style==='walker';
  const icon=isWalker?
   `<g class="motion-walker-symbol"><circle r="17" fill="#fff" opacity=".93" stroke="#263b44" stroke-width="1.3"/><g class="walk-bob" stroke="#111d25" stroke-width="3.8" stroke-linecap="round" fill="none"><circle cx="0" cy="-9" r="4" fill="#111d25" stroke="none"/><path d="M0 -4 L0 5 M0 -1 L-7 2 M0 0 L7 -2 M0 5 L-6 12 M0 5 L7 12"/></g></g>`:
   `<g class="motion-arrow-symbol"><circle r="16" fill="#fff" opacity=".95" stroke="${track.color}" stroke-width="2.2"/><path d="M-9 -6 L0 -6 L0 -11 L12 0 L0 11 L0 6 L-9 6Z" fill="${track.color}" stroke="#23333a" stroke-width=".8"/></g>`;
  const duration=track.dur+(i*.7);
  return `<g>${icon}<animateMotion dur="${duration}s" repeatCount="indefinite" rotate="${isWalker?'0':'auto'}" path="${track.d}"/></g>`;
 }).join('');
}

// 依大會手冊 115/11/12 圖一、圖二、圖五、圖六核對的示意位置；非 GPS 座標。
const OFFICIAL_STOP_SPOTS={"coach":{"height":985,"spots":[["coach",286,151]],"width":1105},"coach-walk":{"height":985,"spots":[["coach",286,98]],"width":1105},"overview":{"height":1344,"spots":[["coach",325,231],["heavy",640,231]],"width":1151},"truck":{"height":985,"spots":[["heavy",609,167]],"width":1105}};
function officialStopLabel(kind){return kind==='coach'?'遊覽車臨停上下客':'8 噸（含）以上工具車卸貨區';}
function buildStopOverlay(route){
 const cfg=OFFICIAL_STOP_SPOTS[route];if(!cfg)return {viewBox:'0 0 1105 985',html:''};
 const coach='#B46F13',heavy='#B32C38';
 let svg=cfg.spots.map(([kind,x,y])=>{
  const color=kind==='coach'?coach:heavy, label=officialStopLabel(kind), glyph=kind==='coach'?'巴':'貨', w=kind==='coach'?202:244;
  let lx=Math.max(6,Math.min(cfg.width-w-6,x-w/2)),ly=y+30;
  return `<g class="stop-point stop-${kind}" transform="translate(${x},${y})" aria-label="${label}"><title>${label}，位置依大會官方圖面框示意</title>
   <circle class="stop-pulse" r="25" fill="${color}"/><circle class="stop-pulse stop-pulse-delay" r="25" fill="${color}"/>
   <circle r="23" fill="#fff" stroke="${color}" stroke-width="5"/><circle r="18" fill="${color}"/>
   <text text-anchor="middle" y="6" font-size="21" fill="#fff" font-weight="900">${glyph}</text>
   </g><g transform="translate(${lx},${ly})" class="stop-caption"><rect rx="9" width="${w}" height="32" fill="#102B43" stroke="#fff" stroke-width="2"/>
   <text x="${w/2}" y="21" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">${label}</text></g>`;
 }).join('');
 return {viewBox:`0 0 ${cfg.width} ${cfg.height}`,html:svg};
}
function startTransport(){
 const items=DATA.transport.items;
 let active=items.find(x=>x.id===new URLSearchParams(location.search).get('route'))||items[0];
 let zoom=1,playing=!window.matchMedia('(prefers-reduced-motion: reduce)').matches,step=0;
 let motionMode=active.kind==='pedestrian'?'walker':active.kind==='overview'?'off':'arrow';
 let motionPlaying=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let timer=null;
 const nav=$('#transportNav'),viewport=$('#transportMapViewport'),image=$('#transportImage');
 const motionSvg=$('#transportMotionSvg'),mapCanvas=$('#transportMapCanvas'),stopSvg=$('#transportStopSvg');
 let showStopPins=true;
 function updateStopPins(){
  const data=buildStopOverlay(active.id);
  stopSvg.setAttribute('viewBox',data.viewBox);
  stopSvg.innerHTML=showStopPins?data.html:'';
  document.querySelectorAll('[data-quick-route]').forEach(b=>{
   b.setAttribute('aria-pressed',String(b.dataset.quickRoute===active.id));
   b.classList.toggle('is-current',b.dataset.quickRoute===active.id);
  });
  const toggle=$('#stopPulseToggle'); if(toggle){toggle.setAttribute('aria-pressed',String(showStopPins));toggle.textContent=showStopPins?'◉ 停靠點高亮：開':'○ 停靠點高亮：關';}
  const status=$('#stopPinStatus');if(status)status.textContent=showStopPins?(
   active.id==='overview'?'橘色：遊覽車後門西側臨停；紅色：8 噸（含）以上工具車後門東側卸貨。':
   active.id==='truck'?'紅色呼吸標記為 8 噸（含）以上工具車卸貨區。':
   active.id==='coach'||active.id==='coach-walk'?'橘色呼吸標記為遊覽車臨時停靠上下客區。':'本圖請依原圖指引。'
  ):'停靠點光圈已關閉；原官方地圖保持顯示。';
 }
 function updateMotion(redraw=true){
  const overview=active.kind==='overview';
  if(overview)motionMode='off';
  if(active.kind!=='pedestrian' && motionMode==='walker')motionMode='arrow';
  if(redraw)motionSvg.innerHTML=buildTransportMotion(active.id,motionMode);
  $$('.motion-mode').forEach(b=>{b.disabled=overview || (b.dataset.motion==='walker'&&active.kind!=='pedestrian');b.setAttribute('aria-pressed',String(b.dataset.motion===motionMode));});
  const toggle=$('#motionToggle');
  toggle.disabled=overview||motionMode==='off';
  toggle.textContent=motionPlaying?'⏸ 暫停動畫':'▶ 播放動畫';
  const status=$('#transportMotionStatus');
  status.textContent=overview?'圖一為位置總覽，沒有單一方向路線；請選圖二～圖七觀看動態。':motionMode==='off'?'已關閉路線動畫。原始官方箭頭和文字仍可閱讀。':`${active.name}：正在以${motionMode==='walker'?'黑色行人剪影':'移動箭頭'}提示官方原圖的局部方向（非完整導航）。${motionPlaying?'':'動態已暫停。'}`;
  if(motionSvg.pauseAnimations&&motionSvg.unpauseAnimations){if(motionPlaying)motionSvg.unpauseAnimations();else motionSvg.pauseAnimations();}
 }
 function render(){
  nav.innerHTML=items.map((x,i)=>`<button type="button" role="tab" data-route="${x.id}" aria-selected="${active.id===x.id}"><span>${String(i+1).padStart(2,'0')}</span><strong>${esc(x.short)}</strong></button>`).join('');
  $('#mapNum').textContent=`FIGURE ${String(active.fig).padStart(2,'0')} / 07`;
  $('#transportTitle').textContent=active.name;
  image.src=active.image;image.alt=`大會手冊第 ${active.page} 頁圖${active.fig}：${active.name}，原始箭頭及圖例完整保留`;
  $('#transportSource').textContent=`來源：大會手冊 p.${active.page} · 圖${['一','二','三','四','五','六','七'][active.fig-1]}`;
  $('#transportAudience').textContent=active.audience;
  $('#transportName').textContent=active.name;
  $('#transportSummary').textContent=active.summary;
  $('#transportNotes').innerHTML=active.notes.map(n=>`<li>${esc(n)}</li>`).join('');
  $('#transportSteps').innerHTML=active.steps.map((x,i)=>`<li data-step="${i}" class="${step===i?'current':''}">${esc(x)}</li>`).join('');
  $('#transportPdfLink').href=`assets/source/traffic.pdf#page=${active.fig}`;
  setQuery('route',active.id);
  updateZoom(1);
  updateStepButton();
  updateMotion();
  updateStopPins();
 }
 function updateStepButton(){
  $('#stepPlay').textContent=playing?'⏸ 暫停輪播':'▶ 播放步驟';
  [...$('#transportSteps').children].forEach((li,i)=>li.classList.toggle('current',i===step));
 }
 function stopTimer(){if(timer){clearInterval(timer);timer=null}}
 function schedule(){stopTimer();if(!playing)return;timer=setInterval(()=>{step=(step+1)%active.steps.length;updateStepButton()},2000)}
 function updateZoom(v){zoom=Math.max(.7,Math.min(2.8,Math.round(v*10)/10));mapCanvas.style.width=`${zoom*100}%`;image.style.width='100%';$('#zoomPct').textContent=`${Math.round(zoom*100)}%`;if(zoom===1){viewport.scrollLeft=0;viewport.scrollTop=0;}}
 const shortcut=$('#stopShortcuts');
 if(shortcut)shortcut.addEventListener('click',e=>{
  const b=e.target.closest('button[data-quick-route]');if(!b)return;
  active=items.find(x=>x.id===b.dataset.quickRoute)||active;step=0;
  motionMode=active.kind==='pedestrian'?'walker':active.kind==='overview'?'off':'arrow';
  render();schedule();
  if(matchMedia('(max-width:720px)').matches)document.querySelector('#transportMapViewport')?.scrollIntoView({block:'center',behavior:'smooth'});
 });
 $('#stopPulseToggle')?.addEventListener('click',()=>{showStopPins=!showStopPins;updateStopPins();});
 nav.addEventListener('click',e=>{const b=e.target.closest('button[data-route]');if(!b)return;active=items.find(x=>x.id===b.dataset.route)||items[0];step=0;motionMode=active.kind==='pedestrian'?'walker':active.kind==='overview'?'off':'arrow';render();schedule()});
 $('#stepPlay').addEventListener('click',()=>{playing=!playing;updateStepButton();schedule()});
 $('#transportSteps').addEventListener('click',e=>{const li=e.target.closest('li[data-step]');if(!li)return;step=+li.dataset.step;updateStepButton()});
 $$('.motion-mode').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;motionMode=b.dataset.motion;updateMotion();}));
 $('#motionToggle').addEventListener('click',()=>{if(active.kind==='overview'||motionMode==='off')return;motionPlaying=!motionPlaying;updateMotion(false);});
 $('#mapZoomIn').addEventListener('click',()=>updateZoom(zoom+.3));
 $('#mapZoomOut').addEventListener('click',()=>updateZoom(zoom-.3));
 $('#mapZoomReset').addEventListener('click',()=>updateZoom(1));
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTimer();if(motionSvg.pauseAnimations)motionSvg.pauseAnimations();}else{schedule();if(motionPlaying&&motionSvg.unpauseAnimations)motionSvg.unpauseAnimations();}});
 // In the standalone module the prior campus animation may not yet exist; hide unresolved links.
 window.addEventListener('pagehide',stopTimer,{once:true});
 render();schedule();
}
initHeader();
if(page==='agenda')startAgenda();
if(page==='ceremony')startCeremony();
if(page==='transport')startTransport();
})();

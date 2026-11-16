/* 115 工科賽｜單一資訊入口，純前端、離線可使用 */
(()=>{'use strict';
const D=window.GK_GUIDE_DATA,T=window.GK_INDIVIDUAL_TIMELINE,N=window.GK_SOURCE_NOTICES,S=window.GK_SKILL_SEARCH;if(!D||!S)return;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=document.body.dataset.page; const qs=new URLSearchParams(location.search);
const byId=Object.fromEntries(D.skills.map(s=>[s.id,s]));const venues=Object.fromEntries(D.venues.map(v=>[v.id,v]));
function queryUpdate(k,value){try{const u=new URL(location.href);u.searchParams.set(k,value);history.replaceState(null,'',u.pathname+u.search+u.hash);}catch(e){}}
const matchSkill=(s,q)=>!q||S.rank(s,q).score>0;
const searchMatches=q=>S.find(D.skills,q);
const matchBadge=why=>why&&(why.includes('別名')||why.includes('近似')||why.includes('場域'))?`<span class="search-match-tag ${why.includes('近似')?'approximate':''}">${esc(why)}</span>`:'';
function initHome(){
 const search=$('#quickSkillSearch'),res=$('#quickSkillResults');
 const renderResults=()=>{const q=search.value.trim();const found=q?searchMatches(q).slice(0,9):[];
   res.innerHTML=q?(found.length?found.map(({skill:s,why})=>`<a href="skills.html?skill=${s.id}"><span>${s.id} ${esc(s.name)}${matchBadge(why)}</span><small>${esc(s.venue)}</small></a>`).join(''):'<p class="quick-no-results" role="status">查無符合職種，請嘗試其他關鍵字或簡稱。</p>'):'';
 };
 search.addEventListener('input',renderResults);
 search.addEventListener('keydown',e=>{if(e.key==='Escape'){search.value='';renderResults();}else if(e.key==='Enter'){e.preventDefault();const q=search.value.trim(),one=searchMatches(q)[0]?.skill;if(one&&q)location.href=`skills.html?skill=${one.id}`;else if(q)location.href=`skills.html?q=${encodeURIComponent(q)}`}});

 const notices=$('#noticeList');
 if(notices && N){
  $('#noticeReviewDate').textContent='來源檢視：'+N.reviewDate;
  notices.innerHTML=N.items.map(x=>`<article class="ux-notice ux-notice-${esc(x.kind)}"><span class="ux-status">${esc(x.label)}</span><div><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p></div><a href="${esc(x.link)}">${esc(x.linkLabel)} →</a></article>`).join('');
 }
 const promo=$('.portal-event-box'),hero=$('.portal-hero-layout'),entrances=$('#entrances');
 if(promo&&hero&&entrances){const mq=window.matchMedia('(max-width:620px)');const arrange=()=>{if(mq.matches){entrances.insertAdjacentElement('afterend',promo);promo.classList.add('portal-event-after-entrances');}else{hero.appendChild(promo);promo.classList.remove('portal-event-after-entrances');}};arrange();if(mq.addEventListener)mq.addEventListener('change',arrange);else mq.addListener(arrange);}
}
function skillExamSummary(s){
 if(!T)return '<p class="ux-summary-note">尚未取得職種細項日程，請查看職種專頁。</p>';
 const rows=T.programs?.[s.id]||[];
 const dates=['11/24','11/25','11/26'];
 const days=dates.map(day=>{
  const found=rows.filter(r=>r.days?.includes(day)&&['theory','practical'].includes(r.kind));
  const items=found.length?found.slice(0,3).map(r=>`<li><span class="ux-exam-kind ${r.kind}">${r.kind==='theory'?'學科':'術科'}</span><div><b>${esc(r.time||'時間未載')}</b><small>${esc(r.title)}</small></div></li>`).join('')+(found.length>3?`<li class="ux-more-label">另有 ${found.length-3} 項，詳見完整細項</li>`:''):'<li class="ux-no-exam">細項表未列本日學術科測試</li>';
  return `<section class="ux-day-card"><h4>${day}（${{'11/24':'二','11/25':'三','11/26':'四'}[day]}）</h4><ul>${items}</ul></section>`;
 }).join('');
 const issues=T.warnings?.[s.id]||[];
 const alerts=issues.length?`<div class="ux-skill-alert"><strong>⚠ 來源待核對／重要提醒</strong><ul>${issues.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul></div>`:'';
 const checkins=rows.filter(r=>r.kind==='checkin'&&r.days?.some(d=>d!=='11/24'));
 const extras=checkins.length?`<div class="ux-extra-checkin"><strong>另有分日報到／點名</strong><span>${esc(checkins.slice(0,3).map(x=>x.day+' '+x.time+' '+x.title).join('；'))}${checkins.length>3?' 等':''}</span><a href="individual.html?skill=${s.id}&focus=all">查看完整細項</a></div>`:'';
 return `<section class="ux-skill-summary"><div class="ux-skill-summary-head"><h3>學術科重點時段</h3><span>以 115/11/15 職種細項為主</span></div><div class="ux-three-days">${days}</div>${extras}${alerts}<p class="ux-summary-note">僅有時長者不自行推算起訖；詳細點名、說明、休息、梯次及講評請展開完整細項。</p></section>`;
}
function initSkills(){
 const input=$('#skillQuery'),v=$('#skillVenue'),list=$('#skillList'),detail=$('#skillDetail'),quick=$('#skillQuickPick');
 if(quick){quick.innerHTML=D.skills.map(x=>`<option value="${x.id}">${x.id} · ${esc(x.name)}｜${esc(x.venue)}</option>`).join('');}
 D.venues.forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=x.name+'（'+x.count+'職種）';v.append(o)});
 let id=byId[qs.get('skill')]?qs.get('skill'):'01';
 if(qs.get('q'))input.value=qs.get('q');
 const draw=()=>{
  const matches=searchMatches(input.value.trim()).filter(r=>(v.value==='all'||r.skill.venueId===v.value));
  if(!matches.some(r=>r.skill.id===id)&&matches.length)id=matches[0].skill.id;
  if(quick)quick.value=id;
  $('#skillSummary').textContent='符合條件 '+matches.length+'／29 個職種；點選可查看報到及試場。';
  list.innerHTML=matches.map(({skill:s,why})=>`<button type="button" data-skill="${s.id}" aria-pressed="${id===s.id}"><span class="skill-num">${s.id}</span><span><b>${esc(s.name)}</b><small>${esc(s.venue)}</small>${matchBadge(why)}</span></button>`).join('')||'<p>查無符合條件的職種，請調整名稱、簡稱或場域。</p>';
  const s=matches.find(r=>r.skill.id===id)?.skill;if(!s){detail.innerHTML='<h2>沒有符合條件的職種</h2>';return}
  const venueLink=`venues.html?venue=${encodeURIComponent(s.venueId)}&skill=${s.id}`;
  const routeLink=s.venueId==='nkh'?`sixth/traffic.html?from=gate&to=${s.id}`:venueLink;
  detail.innerHTML=`<div class="skill-ident"><div><span class="skill-code">SKILL ${s.id} / 29</span><h2>${esc(s.name)}</h2></div><span class="skill-venue">${esc(s.venue)}</span></div>
  <section class="ux-quick-info" aria-label="本職種報到與試場資訊"><div class="ux-quick-report"><small>11/24 報到時間（場地 Excel）</small><strong>${esc(s.registrationTime)}</strong><span>${esc(s.registrationPlace)}</span><div class="checkin-id-notice" role="note" aria-label="選手報到證件提醒"><span class="checkin-id-notice__icon" aria-hidden="true">▣</span><div class="checkin-id-notice__content"><strong>選手報到時請出示學生證或身分證</strong></div></div></div><div class="ux-quick-place"><p><b>學科位置</b><span>${esc(s.theory||'依職種公告')}</span></p><p><b>術科位置</b><span>${esc(s.practical||'依職種公告')}</span></p></div></section>
  ${skillExamSummary(s)}
  <div class="ux-primary-actions"><a href="individual.html?skill=${s.id}&focus=all" class="ux-primary-action">查看完整三日細項 →</a><a href="${venueLink}" class="ux-primary-action secondary">查看試場地圖 →</a>${s.venueId!=='nkh'?`<a href="${venueLink}" class="ux-primary-action secondary">入口至場館動畫（待核定） →</a>`:`<a href="sixth/traffic.html" class="ux-primary-action secondary">校園步行動畫（試作） →</a>`}</div>
  <details class="ux-other-skill-info"><summary>其他資訊：領隊會議、進階定位與教室</summary><div class="ux-meeting"><b>領隊會議及賽後檢討</b><p>${esc(s.meeting||'依公告')}</p></div><div class="skill-detail-actions"><a href="agenda.html?day=24" class="secondary">大會活動日程 ↗</a><a href="sixth/index.html?program=${s.id}#explorer">第六輪進階互動定位 ↗</a>${/行政大樓/.test(s.theory)?`<a href="floor.html?skill=${s.id}" class="secondary">行政大樓教室格位 ↗</a>`:''}</div></details>
  <p class="skill-footnote">報到及場地來源：${esc(s.source)}；學術科時間來源：115/11/15 各職種細項表。遇時間差異或路線未核定，請依正式公告與現場指揮。</p>`;
  queryUpdate('skill',id);
 };
 list.addEventListener('click',e=>{const b=e.target.closest('[data-skill]');if(!b)return;id=b.dataset.skill;draw();if(window.matchMedia('(max-width:850px)').matches)detail.scrollIntoView({behavior:'smooth',block:'start'});});if(quick)quick.addEventListener('change',()=>{id=quick.value;input.value='';v.value='all';draw();});input.addEventListener('input',draw);v.addEventListener('change',draw);draw();
}
function initVenues(){
 let id=venues[qs.get('venue')]?qs.get('venue'):'nkh',type=0,zoom=1;
 const tabs=$('#venueTabs'),mapTypes=$('#mapTypes'),image=$('#venueMapImage'),viewport=$('#venueMapViewport');
 function draw(){
  const v=venues[id];if(!v)return;
  if(type>=v.maps.length)type=0;
  tabs.innerHTML=D.venues.map(x=>`<button type="button" data-venue="${x.id}" aria-pressed="${x.id===id}">${esc(x.name)} · ${x.count}</button>`).join('');
  mapTypes.innerHTML=v.maps.map((m,i)=>`<button type="button" data-map="${i}" aria-pressed="${i===type}">${esc(m.name)}</button>`).join('');
  $('#venueTitle').textContent=v.name;$('#venueHint').textContent=`${v.count} 個職種 · ${v.maps.length} 張來源圖 · 會議分流參考：${v.meetingHint}`;
  image.src=v.maps[type].src;image.alt=`${v.name}：${v.maps[type].name}（11/12 來源圖網頁縮圖）`;
  const programs=D.skills.filter(s=>s.venueId===id);$('#venueCount').textContent=programs.length;
  $('#venuePrograms').innerHTML=programs.map(s=>`<button type="button" data-skill="${s.id}">${s.id}　${esc(s.name)}　↗</button>`).join('');const deep=$('#venueDeepLink');if(deep){deep.href='sixth/index.html?venue='+encodeURIComponent(id)+'#explorer';deep.textContent='原版互動定位（'+v.name+'） ↗';}
  setZoom(1);queryUpdate('venue',id);if(window.GK_VENUE_ROUTE)window.GK_VENUE_ROUTE.render(id);
 }
 function setZoom(value){zoom=Math.min(3.5,Math.max(1,Math.round(value*10)/10));const stage=document.getElementById('venueMapStage');if(stage){stage.style.width=zoom*100+'%';image.style.width='100%';}else image.style.width=zoom*100+'%';$('#venueZoomText').textContent=Math.round(zoom*100)+'%';if(zoom===1){viewport.scrollLeft=0;viewport.scrollTop=0}}
 tabs.addEventListener('click',e=>{const b=e.target.closest('[data-venue]');if(!b)return;id=b.dataset.venue;type=0;draw()});
 mapTypes.addEventListener('click',e=>{const b=e.target.closest('[data-map]');if(!b)return;type=+b.dataset.map;draw()});
 $('#venuePrograms').addEventListener('click',e=>{const b=e.target.closest('[data-skill]');if(b)location.href=`skills.html?skill=${b.dataset.skill}`});
 $('#mapPlus').addEventListener('click',()=>setZoom(zoom+.25));$('#mapMinus').addEventListener('click',()=>setZoom(zoom-.25));$('#mapReset').addEventListener('click',()=>setZoom(1));draw();
}
if(page==='home')initHome();else if(page==='skills')initSkills();else if(page==='venues')initVenues();
})();

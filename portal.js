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
function shortTimelineTitle(event){
 const raw=String(event.title||'').replace(/\s+/g,' ').trim();
 if(event.kind==='checkin'){
  if(/抽籤/.test(raw))return '選手報到與抽籤';
  const slot=/(上午|下午)場次?/.exec(raw)?.[0];
  return slot?`${slot}報到`:'報到／點名';
 }
 if(event.kind==='theory')return '學科測試';
 if(event.kind==='practical'){
  const heat=/(第[一二三四五六七八九十\d]+梯|第[一二三四五六七八九十\d]+站|術科[一二三四五六七八九十\d]+)/.exec(raw)?.[0];
  return heat?`${heat}術科測試`:'術科測試';
 }
 if(event.kind==='prep'){
  const slot=/(上午|下午)場/.exec(raw)?.[0];
  if(slot&&/試車|校刀/.test(raw))return `${slot}試車與校刀`;
  return '賽前說明／分梯準備';
 }
 return raw.length>36?raw.slice(0,34).trimEnd()+'…':raw;
}
function initHome(){
 const search=$('#quickSkillSearch'),res=$('#quickSkillResults');
 const extraServices=[...(window.GK_DATA?.services||[]),window.GK_V12_MAP_PATCH?.serviceDesk,window.GK_V12_MAP_PATCH?.toolStorage].filter(Boolean);
 const extras=[...extraServices.map(x=>({title:x.name,desc:x.place,href:'sixth/index.html?service='+encodeURIComponent(x.id)+'#explorer',type:'大會服務',pending:x.pending})),...((window.GK_EVENT_DATA?.transport?.items)||[]).map(x=>({title:x.name,desc:x.audience,href:'transport.html?route='+encodeURIComponent(x.id),type:'交通'})),{title:'頒獎典禮',desc:'11/27 08:30 正式開始',href:'ceremony.html',type:'典禮'}];
 const results=q=>[...searchMatches(q).map(({skill:x})=>({title:x.id+' '+x.name,desc:x.venue,href:'skills.html?skill='+x.id,type:'職種'})),...extras.filter(x=>(x.title+' '+x.desc).toLowerCase().includes(q.toLowerCase()))];
 const renderResults=()=>{const q=search.value.trim(),found=q?results(q):[];res.innerHTML=q?(found.length?found.slice(0,30).map(x=>'<a href="'+esc(x.href)+'"><span>'+esc(x.title)+'</span><small>'+esc(x.type+(x.pending?'｜待公告':'')+'｜'+x.desc)+'</small></a>').join(''):'<p class="quick-no-results" role="status">查無符合資訊，請嘗試其他關鍵字。</p>'):'';};
 search.addEventListener('input',renderResults);
 search.addEventListener('keydown',e=>{if(e.key==='Escape'){search.value='';renderResults();}else if(e.key==='Enter'){e.preventDefault();const found=results(search.value.trim());if(search.value.trim()&&found.length===1)location.href=found[0].href;else res.querySelector('a')?.focus();}});
 const today=$('#v15Today'),agenda=window.GK_EVENT_DATA?.agenda;
 if(today&&agenda){const key=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const day=key<'2026-11-24'?24:key>'2026-11-27'?27:Number(key.slice(-2));const days=[day,...(day<27?[day+1]:[])];today.innerHTML='<h2>競賽日程重點</h2><p>大會概覽；各職種以專屬日程為準。</p><div class="v15-day-grid">'+days.map(d=>'<article><h3>11/'+d+(key==='2026-11-'+d?'｜今日':key==='2026-11-'+(d-1)?'｜次日':'')+'</h3>'+agenda.events.filter(x=>x.date===String(d)&&['contest','checkin','ceremony'].includes(x.kind)).slice(0,4).map(x=>'<p><b>'+esc(x.time)+'</b> '+esc(x.title)+'</p>').join('')+'<a href="agenda.html?day='+d+'">查看完整日程 ↗</a></article>').join('')+'</div>';}

 const notices=$('#noticeList');
 if(notices && N){
  $('#noticeReviewDate').textContent=N.items.length?`${N.items.length} 項提醒｜資料核對：${N.reviewDate||'未載'}`:'目前無提醒';
  notices.innerHTML=N.items.map(x=>`<article class="ux-notice ux-notice-${esc(x.kind)}"><span class="ux-status">${esc(x.label)}</span><div><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p></div><div>${(x.title.includes("11 室內配線")?[["11","室內配線"],["19","鑄造"],["22","測量"]]:x.title.includes("25 家具木工")?[["25","家具木工"],["28","配管"]]:[]).map(([id,label])=>`<a href="individual.html?skill=${id}">${label} →</a> `).join("") || `<a href="${esc(x.link)}">${esc(x.linkLabel)} →</a>`}</div></article>`).join('');
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
  const items=found.length?found.slice(0,3).map(r=>`<li><span class="ux-exam-kind ${r.kind}">${r.kind==='theory'?'學科':'術科'}</span><div><b>${esc(r.time||'時間未載')}</b><small>${esc(shortTimelineTitle(r))}</small></div></li>`).join('')+(found.length>3?`<li class="ux-more-label">另有 ${found.length-3} 項，詳見完整細項</li>`:''):'<li class="ux-no-exam">細項表未列本日學術科測試</li>';
  return `<section class="ux-day-card"><h4>${day}（${{'11/24':'二','11/25':'三','11/26':'四'}[day]}）</h4><ul>${items}</ul></section>`;
 }).join('');
 const issues=T.warnings?.[s.id]||[];
 const alerts=issues.length?`<div class="ux-skill-alert"><strong>⚠ 重要時間提醒</strong><ul>${issues.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul></div>`:'';
 const checkins=rows.filter(r=>r.kind==='checkin'&&r.days?.some(d=>d!=='11/24'));
 const extras=checkins.length?`<div class="ux-extra-checkin"><strong>另有分日報到／點名</strong><span>${esc(checkins.slice(0,3).map(x=>x.day+' '+x.time+' '+shortTimelineTitle(x)).join('；'))}${checkins.length>3?' 等':''}</span><a href="individual.html?skill=${s.id}&focus=all">查看完整細項</a></div>`:'';
 return `<section class="ux-skill-summary"><div class="ux-skill-summary-head"><h3>學術科重點時段</h3><span>11/24–11/26</span></div><div class="ux-three-days">${days}</div>${extras}${alerts}<p class="ux-summary-note">未列起訖的項目不推算時間；完整點名、梯次及其他流程可展開查看。</p></section>`;
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
  detail.innerHTML=`<div class="skill-ident"><div><span class="skill-code">職種編號 ${s.id}</span><h2>${esc(s.name)}</h2></div><span class="skill-venue">${esc(s.venue)}</span></div>
  <section class="ux-quick-info" aria-label="本職種報到與試場資訊"><div class="ux-quick-report"><small>11/24 報到時間</small><strong>${esc(s.registrationTime)}</strong><span>${esc(s.registrationPlace)}</span><div class="checkin-id-notice" role="note" aria-label="選手報到證件提醒"><span class="checkin-id-notice__icon" aria-hidden="true">▣</span><div class="checkin-id-notice__content"><strong>選手報到時請出示學生證或身分證</strong></div></div></div><div class="ux-quick-place"><p><b>學科位置</b><span>${esc(s.theory||'依職種公告')}</span></p><p><b>術科位置</b><span>${esc(s.practical||'依職種公告')}</span></p></div></section>
  ${skillExamSummary(s)}
  <div class="ux-primary-actions"><a href="sixth/index.html?program=${s.id}&destination=registration#explorer" class="ux-primary-action">查看報到位置 →</a><a href="sixth/index.html?program=${s.id}&destination=theory#explorer" class="ux-primary-action secondary">查看學科位置 →</a><a href="sixth/index.html?program=${s.id}&destination=practical#explorer" class="ux-primary-action secondary">查看術科位置 →</a><a href="individual.html?skill=${s.id}&focus=all" class="ux-primary-action secondary">查看三日完整流程 →</a>${s.venueId!=='nkh'?`<a href="${venueLink}" class="ux-primary-action secondary">場域步行路線示意（尚未核定） →</a>`:`<a href="sixth/traffic.html" class="ux-primary-action secondary">校園步行路線示意（尚未核定） →</a>`}</div>
  <details class="ux-other-skill-info"><summary>指導老師重點：領隊會議及其他場地資訊</summary><p class="ux-teacher-hint">請先確認選手的報到及學術科時間，再查看領隊會議與賽後檢討；教師活動不等同選手考試時段。</p><div class="ux-meeting"><b>領隊會議及賽後檢討</b><p>${esc(s.meeting||'依公告')}</p></div><div class="skill-detail-actions"><a href="agenda.html?day=24" class="secondary">大會活動日程 ↗</a><a href="sixth/index.html?program=${s.id}&destination=practical#explorer">互動校園地圖 ↗</a>${s.venueId==='nkh' && /行政大樓/.test(s.theory)?`<a href="floor.html?skill=${s.id}" class="secondary">北科附工行政大樓教室格位 ↗</a>`:''}</div></details>
  <p class="skill-footnote">時間、場地如有待核對提醒，請依主辦單位最新公告與現場指示。</p>`;
  queryUpdate('skill',id);
 };
 list.addEventListener('click',e=>{const b=e.target.closest('[data-skill]');if(!b)return;id=b.dataset.skill;draw();if(window.matchMedia('(max-width:850px)').matches)detail.scrollIntoView({behavior:'smooth',block:'start'});});if(quick)quick.addEventListener('change',()=>{id=quick.value;input.value='';v.value='all';draw();});input.addEventListener('input',draw);v.addEventListener('change',draw);draw();
}
function initVenues(){
 let id=venues[qs.get('venue')]?qs.get('venue'):'nkh',type=0,zoom=1;
 const tabs=$('#venueTabs'),mapTypes=$('#mapTypes'),image=$('#venueMapImage'),viewport=$('#venueMapViewport');
 image.addEventListener('error',()=>{$('#venueMapError').hidden=false});
 image.addEventListener('load',()=>{$('#venueMapError').hidden=true});
 function draw(){
  const v=venues[id];if(!v)return;
  if(type>=v.maps.length)type=0;
  tabs.innerHTML=D.venues.map(x=>`<button type="button" data-venue="${x.id}" aria-pressed="${x.id===id}">${esc(x.name)} · ${x.count}</button>`).join('');
  mapTypes.innerHTML=v.maps.map((m,i)=>`<button type="button" data-map="${i}" aria-pressed="${i===type}">${esc(m.name)}</button>`).join('');
  const variants=$('#venueMapVariants');if(variants)variants.hidden=v.maps.length<2;
  $('#venueTitle').textContent=v.name;$('#venueHint').textContent=`${v.count} 個職種 · ${v.maps.length} 張來源圖 · 會議分流參考：${v.meetingHint}`;
  image.src=v.maps[type].src;image.alt=`${v.name}：${v.maps[type].name}（11/12 來源圖網頁縮圖）`;
  const programs=D.skills.filter(s=>s.venueId===id);$('#venueCount').textContent=programs.length;
  const requested=new URLSearchParams(location.search).get('skill'), selected=programs.some(p=>p.id===requested)?requested:programs[0]?.id;
  $('#venuePrograms').innerHTML=programs.map(s=>`<button type="button" data-skill="${s.id}" aria-pressed="${s.id===selected}" title="定位 ${esc(s.name)}">${s.id}　${esc(s.name)}　⌖</button>`).join('');const deep=$('#venueDeepLink');if(deep){deep.href='sixth/index.html?venue='+encodeURIComponent(id)+'#explorer';deep.textContent='互動校園地圖（'+v.name+'） ↗';}
  setZoom(1);queryUpdate('venue',id);if(selected)queryUpdate('skill',selected);if(window.GK_VENUE_ROUTE){window.GK_VENUE_ROUTE.render(id);if(selected)window.GK_VENUE_ROUTE.selectSkill?.(selected,{updateUrl:false});}
  const action=$('#venueDeepLink');if(action&&selected)action.href='sixth/index.html?program='+encodeURIComponent(selected)+'&destination=practical#explorer';
 }
 function setZoom(value){zoom=Math.min(3.5,Math.max(1,Math.round(value*10)/10));const stage=document.getElementById('venueMapStage');if(stage){stage.style.width=zoom*100+'%';image.style.width='100%';}else image.style.width=zoom*100+'%';$('#venueZoomText').textContent=Math.round(zoom*100)+'%';if(zoom===1){viewport.scrollLeft=0;viewport.scrollTop=0}}
 tabs.addEventListener('click',e=>{const b=e.target.closest('[data-venue]');if(!b)return;id=b.dataset.venue;type=0;draw()});
 mapTypes.addEventListener('click',e=>{const b=e.target.closest('[data-map]');if(!b)return;type=+b.dataset.map;draw()});
 $('#venuePrograms').addEventListener('click',e=>{const button=e.target.closest('[data-skill]');if(!button)return;
  const skillId=button.dataset.skill;if(!byId[skillId])return;
  queryUpdate('skill',skillId);$('#venuePrograms').querySelectorAll('[data-skill]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
  $('#venueDeepLink').href='sixth/index.html?program='+encodeURIComponent(skillId)+'&destination=practical#explorer';
  if(window.GK_VENUE_ROUTE?.selectSkill?.(skillId))return;
  location.href='sixth/index.html?program='+encodeURIComponent(skillId)+'&destination=practical#explorer';
 });
 $('#mapPlus').addEventListener('click',()=>setZoom(zoom+.25));$('#mapMinus').addEventListener('click',()=>setZoom(zoom-.25));$('#mapReset').addEventListener('click',()=>setZoom(1));draw();
}
if(page==='home')initHome();else if(page==='skills')initSkills();else if(page==='venues')initVenues();
})();

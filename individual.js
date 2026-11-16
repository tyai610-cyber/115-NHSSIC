/* 115 工科賽｜11/15 職種細項日程：來源保真，分站／點名／時長各別呈現 */
(()=>{'use strict';
const D=window.GK_GUIDE_DATA,T=window.GK_INDIVIDUAL_TIMELINE,$=s=>document.querySelector(s);
if(!D||!T){document.body.insertAdjacentHTML('afterbegin','<p role="alert">職種細項時間載入失敗，請確認 JS 資料檔。</p>');return;}
const byId=Object.fromEntries(D.skills.map(p=>[p.id,p]));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kindLabels={checkin:'報到／點名',theory:'學科測試',practical:'術科測試',prep:'賽前說明／準備',break:'休息',review:'講評／觀摩',meeting:'會議',staff:'評分／工作',other:'其他活動'};
const indSkill=$('#indSkill'),indDay=$('#indDay'),indFocus=$('#indFocus');
for(const p of D.skills){const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.id+' · '+p.name+'｜'+p.venue;indSkill.append(opt);}
const qs=new URLSearchParams(location.search);
indSkill.value=byId[qs.get('skill')]?qs.get('skill'):'01';
if(['all','11/24','11/25','11/26'].includes(qs.get('day')))indDay.value=qs.get('day');
if(['all','exam','checkin','other'].includes(qs.get('focus')))indFocus.value=qs.get('focus');else indFocus.value='exam';
function render(){
 const p=byId[indSkill.value],rows=T.programs[p.id]||[],filter=indDay.value,focus=indFocus?.value||'exam';
 const isFull=focus==='all';
 $('#indToggleFull').textContent=isFull?'收合完整細項，只看學術科':'展開完整流程（點名／說明／休息等）';
 $('#indToggleFull').setAttribute('aria-pressed',String(isFull));
 $('#indUnifiedLink').href='skills.html?skill='+p.id;
 const dateKeys=filter==='all'?['11/24','11/25','11/26']:[filter];
 $('#indKeyDays').innerHTML=dateKeys.map(d=>{
  const exams=rows.filter(r=>r.days.includes(d)&&['theory','practical'].includes(r.kind));
  const html=exams.length?exams.slice(0,4).map(x=>`<div class="ind-key-line"><span>${x.kind==='theory'?'學科':'術科'}</span><div><b>${esc(x.time||'時間未載')}</b><small>${esc(x.title)}</small></div></div>`).join('')+(exams.length>4?`<small>另有 ${exams.length-4} 項，請查看下方列表</small>`:''):'<p>未列本日學術科測試</p>';
  return `<div class="ind-key-day"><strong>${d}</strong>${html}</div>`;
 }).join('');
 $('#indCode').textContent=p.id;$('#indTitle').textContent=p.name;$('#indVenue').textContent=p.venue;
 $('#indReg').textContent=p.registrationTime;$('#indRegPlace').textContent=p.registrationPlace;
 $('#indTheory').textContent=p.theory||'依公告';$('#indPractical').textContent=p.practical||'依公告';$('#indMeeting').textContent=p.meeting||'依公告';
 $('#indVenueLink').href='venues.html?venue='+encodeURIComponent(p.venueId);
 $('#indSixthLink').href='sixth/index.html?program='+p.id+'#studentTimeline';
 $('#indFloorLink').hidden=!/行政大樓/.test(p.theory||'');$('#indFloorLink').href='floor.html?skill='+p.id;
 const issues=T.warnings?.[p.id]||[];
 $('#indWarnings').hidden=!issues.length;
 $('#indWarnings').innerHTML=issues.length?'<strong>需核定／重要提醒</strong><ul>'+issues.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
 const allowed= r => focus==='exam'?['theory','practical'].includes(r.kind):focus==='checkin'?r.kind==='checkin':focus==='other'?!['theory','practical','checkin'].includes(r.kind):true;
 let html='',shown=0,exam=0,unspec=0;
 const days=filter==='all'?['11/24','11/25','11/26']:[filter];
 for(const d of days){const selected=rows.filter(r=>r.days.includes(d) && allowed(r));if(!selected.length)continue;
  html+='<h3 class="ind-day-title">115 年 '+esc(d)+'（'+({'11/24':'二','11/25':'三','11/26':'四'}[d])+'）<span class="ind-count">'+selected.length+' 項</span></h3>';
  for(const e of selected){shown++;if(['theory','practical'].includes(e.kind))exam++;
   const timeString=String(e.time||'');const durationOnly=/^\s*[\d.]+\s*(?:小時|分鐘)/.test(timeString)||/^\s*\(\d+\s*分鐘\)/.test(timeString);
   if(durationOnly)unspec++;
   const spansDays=e.days.length>1;
   const kind=e.kind;
   const marker=(durationOnly?' <span class="ind-pending">僅載時長</span>':'')+(spansDays?' <span class="ind-pending">跨日共計</span>':'');
   const longDetail=e.detail&&e.detail.trim()!==e.title.trim()?e.detail:'';
   const intro=longDetail&&longDetail.length<90?`<p class="ind-source-detail">${esc(longDetail)}</p>`:'';
   const expandedDetail=longDetail&&longDetail.length>=90?`<details class="ind-extra-details"><summary>展開考試內容與來源說明</summary><p class="ind-source-detail">${esc(longDetail)}</p></details>`:'';
   const components=e.components?.length?`<div class="ind-components"><b>同一時段內的站別／評分項目（非額外場次）</b><ul>${e.components.map(s=>'<li>'+esc(s)+'</li>').join('')}</ul></div>`:'';
   const note=e.note?`<div class="ind-footnote">${esc(e.note)}</div>`:'';
   const scoring=e.scoring?`<details class="ind-score"><summary>查看來源配分欄</summary><p>${esc(e.scoring)}</p></details>`:'';
   html+=`<article class="ind-entry" data-kind="${kind}"><div class="ind-time-area"><time>${esc(timeString||'時間未載')}</time>${marker}<small>${spansDays?'原表 11/25–11/26 共用時段':''}</small></div><div class="ind-content"><div class="ind-entry-head"><span class="ind-kind ind-kind-${kind}">${esc(kindLabels[kind]||kind)}</span><small>細項表第 ${e.sourcePage} 頁</small></div><strong>${esc(e.title||e.subject)}</strong>${intro}${expandedDetail}${components}${note}${scoring}</div></article>`;
  }
 }
 $('#indEvents').innerHTML=html||'<p class="ind-none">此篩選條件下沒有列出活動，請切換「全部活動」。</p>';
 $('#indStat').textContent=shown+' 項活動｜'+exam+' 項學術科時段'+(unspec?'｜'+unspec+' 項僅載時長':'');
 const u=new URL(location.href);u.searchParams.set('skill',p.id);if(filter==='all')u.searchParams.delete('day');else u.searchParams.set('day',filter);if(focus==='exam')u.searchParams.delete('focus');else u.searchParams.set('focus',focus);
 try{history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(e){}
 $('#indOpenLink').href=u.href;$('#indOpenLink').textContent='開啟 '+p.id+' '+p.name+' 專屬網址 ↗';
}
indSkill.addEventListener('change',render);indDay.addEventListener('change',render);indFocus.addEventListener('change',render);
$('#indToggleFull').addEventListener('click',()=>{indFocus.value=indFocus.value==='all'?'exam':'all';render();});
$('#copyCurrent').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#indOpenLink').href);$('#copyCurrent').textContent='✓ 已複製網址';setTimeout(()=>$('#copyCurrent').textContent='複製職種專屬網址',2000);}catch(e){$('#copyCurrent').textContent='請複製網址列';}});
$('#printCurrent').addEventListener('click',()=>window.print());
const fuzzy=window.GK_SKILL_SEARCH;
const fuzzyInput=$('#indSkillSearch'),fuzzyResults=$('#indSearchResults');
if(fuzzy&&fuzzyInput&&fuzzyResults){
 let found=[];
 const suggestions=()=>{
  const q=fuzzyInput.value.trim();found=q?fuzzy.find(D.skills,q,{limit:8}):[];
  fuzzyResults.innerHTML=q?(found.length?found.map(({skill:p,why})=>`<button type="button" role="option" data-pick="${p.id}" aria-selected="false"><b>${p.id} ${esc(p.name)}</b><small>${esc(why)}</small></button>`).join(''):'<p role="status">查無符合職種，請換個簡稱或編號。</p>'):'';
 };
 const pick=id=>{if(!byId[id])return;indSkill.value=id;fuzzyInput.value='';fuzzyResults.innerHTML='';render();};
 fuzzyInput.addEventListener('input',suggestions);
 fuzzyInput.addEventListener('keydown',e=>{
  if(e.key==='Escape'){fuzzyInput.value='';fuzzyResults.innerHTML='';}
  if(e.key==='Enter'&&found.length){e.preventDefault();pick(found[0].skill.id);}
  if(e.key==='ArrowDown'&&found.length){e.preventDefault();fuzzyResults.querySelector('button')?.focus();}
 });
 fuzzyResults.addEventListener('keydown',e=>{
  const buttons=[...fuzzyResults.querySelectorAll('button')],at=buttons.indexOf(document.activeElement);
  if(e.key==='Escape'){fuzzyResults.innerHTML='';fuzzyInput.focus();}
  if(e.key==='ArrowDown'&&buttons.length){e.preventDefault();buttons[Math.min(buttons.length-1,at+1)]?.focus();}
  if(e.key==='ArrowUp'&&buttons.length){e.preventDefault();if(at<=0)fuzzyInput.focus();else buttons[at-1]?.focus();}
 });
 fuzzyResults.addEventListener('click',e=>{const btn=e.target.closest('[data-pick]');if(btn)pick(btn.dataset.pick);});
 document.addEventListener('click',e=>{if(!e.target.closest('.ind-search-box'))fuzzyResults.innerHTML='';});
 indSkill.addEventListener('change',()=>{fuzzyInput.value='';fuzzyResults.innerHTML='';});
}
render();
})();

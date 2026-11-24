/* 115 工科賽｜11/15 職種細項日程：來源保真，分站／點名／時長各別呈現 */
(()=>{'use strict';
const D=window.GK_GUIDE_DATA,T=window.GK_INDIVIDUAL_TIMELINE,$=s=>document.querySelector(s);
if(!D||!T){document.body.insertAdjacentHTML('afterbegin','<p role="alert">職種細項時間載入失敗，請確認 JS 資料檔。</p>');return;}
const byId=Object.fromEntries(D.skills.map(p=>[p.id,p]));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanDetail=x=>String(x??'').replace(/【原表配分欄】/g,'').replace(/【備註】/g,'').replace(/\s+/g,' ').trim();
const kindLabels={checkin:'報到／點名',theory:'學科測試',practical:'術科測試',prep:'賽前說明／分梯',break:'休息',review:'講評／觀摩',meeting:'會議',staff:'評分／工作',other:'其他活動'};
function conciseTitle(event){
 const raw=cleanDetail(event.title||event.subject).replace(/^\s*[0-9一二三四五六七八九十]+[.、．]\s*/, '');
 if(event.kind==='theory')return /筆試/.test(raw)?'學科筆試':'學科測驗';
 if(event.kind==='practical'){
  const stage=/(第[一二三四五六七八九十\d]+(?:梯|站|試)|術科[一二三四五六七八九十\d]+)/.exec(raw)?.[0];
  if(stage)return `${stage}術科測試`;
  if(/術科競賽/.test(raw))return '術科競賽';
  return raw.length>36?'術科測試':raw;
 }
 if(event.kind==='checkin'){
  if(/抽籤/.test(raw)&&raw.length>24)return '報到及崗位抽籤';
  if(/報到/.test(raw)&&raw.length>38){const slot=/(上午|下午)場/.exec(raw)?.[0];return slot?`${slot}報到`:'報到';}
  if(/點名/.test(raw)&&raw.length>38)return '點名';
 }
 if(event.kind==='prep'&&/(上午|下午)場/.test(raw)&&/試車|校刀/.test(raw))return `${/(上午|下午)場/.exec(raw)[0]}試車與校刀`;
 if(raw.length<=46)return raw;
 const natural=raw.search(/[。；\n]/);
 if(natural>=16&&natural<=58)return raw.slice(0,natural).trim();
 return raw.slice(0,45).trimEnd()+'…';
}
const indSkill=$('#indSkill'),indDay=$('#indDay'),indFocus=$('#indFocus');
for(const p of D.skills){const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.id+' · '+p.name+'｜'+p.venue;indSkill.append(opt);}
const qs=new URLSearchParams(location.search);
indSkill.value=byId[qs.get('skill')]?qs.get('skill'):'01';
if(['all','11/24','11/25','11/26'].includes(qs.get('day')))indDay.value=qs.get('day');
if(['all','important','exam','checkin','other'].includes(qs.get('focus')))indFocus.value=qs.get('focus');else indFocus.value='important';
function render(){
 const p=byId[indSkill.value],rows=T.programs[p.id]||[],filter=indDay.value,focus=indFocus?.value||'important';
 const isFull=focus==='all';
 $('#indToggleFull').textContent=isFull?'收合完整流程':'展開完整流程（點名／說明／休息等）';
 $('#indToggleFull').setAttribute('aria-pressed',String(isFull));
 $('#indUnifiedLink').href='skills.html?skill='+p.id;
 const dateKeys=filter==='all'?['11/24','11/25','11/26']:[filter];
 $('#indKeyDays').innerHTML=dateKeys.map(d=>{
  const exams=rows.filter(r=>r.days.includes(d)&&['theory','practical'].includes(r.kind));
  const html=exams.length?exams.slice(0,4).map(x=>`<div class="ind-key-line"><span>${x.kind==='theory'?'學科':'術科'}</span><div><b>${esc(x.time||'時間未載')}</b><small>${esc(conciseTitle(x))}</small></div></div>`).join('')+(exams.length>4?`<small>另有 ${exams.length-4} 項，請查看下方列表</small>`:''):'<p>未列本日學術科測試</p>';
  return `<div class="ind-key-day"><strong>${d}</strong>${html}</div>`;
 }).join('');
 $('#indCode').textContent=p.id;$('#indTitle').textContent=p.name;$('#indVenue').textContent=p.venue;
 $('#indReg').textContent=p.registrationTime;$('#indRegPlace').textContent=p.registrationPlace;
 $('#indTheory').textContent=p.theory||'依公告';$('#indPractical').textContent=p.practical||'依公告';$('#indMeeting').textContent=p.meeting||'依公告';
 $('#indVenueLink').href='venues.html?venue='+encodeURIComponent(p.venueId)+'&skill='+encodeURIComponent(p.id);
 $('#indSixthLink').href='sixth/index.html?program='+p.id+'&destination=practical#explorer';
 $('#indTheoryMap').href='sixth/index.html?program='+p.id+'&destination=theory#explorer';
 $('#indRegistrationMap').href='sixth/index.html?program='+p.id+'&destination=registration#explorer';
 $('#indFloorLink').hidden=!(p.venueId==='nkh' && /行政大樓/.test(p.theory||''));$('#indFloorLink').href='floor.html?skill='+p.id;
 const issues=T.warnings?.[p.id]||[];
 $('#indWarnings').hidden=!issues.length;
 $('#indWarnings').innerHTML=issues.length?'<strong>需核定／重要提醒</strong><ul>'+issues.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
 const allowed= r => focus==='important'?['checkin','theory','practical','prep'].includes(r.kind):focus==='exam'?['theory','practical'].includes(r.kind):focus==='checkin'?r.kind==='checkin':focus==='other'?!['theory','practical','checkin','prep'].includes(r.kind):true;
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
   const rawTitle=cleanDetail(e.title||e.subject),title=conciseTitle(e);
   const detailParts=[rawTitle!==title?rawTitle:'',e.detail&&cleanDetail(e.detail)!==rawTitle?cleanDetail(e.detail):'',e.note?cleanDetail(e.note):'',e.scoring?`評分項目：${cleanDetail(e.scoring)}`:''].filter((x,i,a)=>x&&a.indexOf(x)===i);
   const expandedDetail=detailParts.length?`<details class="ind-extra-details"><summary>查看完整流程</summary>${detailParts.map(x=>`<p class="ind-source-detail">${esc(x)}</p>`).join('')}</details>`:'';
   const components=e.components?.length?`<details class="ind-components"><summary>查看分站／評分項目</summary><p>以下項目屬同一時段，不代表額外場次。</p><ul>${e.components.map(s=>'<li>'+esc(s)+'</li>').join('')}</ul></details>`:'';
   html+=`<article class="ind-entry" data-kind="${kind}"><div class="ind-time-area"><time>${esc(timeString||'時間未載')}</time>${marker}<small>${spansDays?'跨日共用時段':''}</small></div><div class="ind-content"><div class="ind-entry-head"><span class="ind-kind ind-kind-${kind}">${esc(kindLabels[kind]||kind)}</span></div><strong>${esc(title||'活動安排')}</strong>${expandedDetail}${components}</div></article>`;
  }
 }
 $('#indEvents').innerHTML=html||'<p class="ind-none">此篩選條件下沒有列出活動，請切換「全部活動」。</p>';
 $('#indStat').textContent=shown+' 項活動｜'+exam+' 項學術科時段'+(unspec?'｜'+unspec+' 項僅載時長':'');
 const u=new URL(location.href);u.searchParams.set('skill',p.id);if(filter==='all')u.searchParams.delete('day');else u.searchParams.set('day',filter);if(focus==='important')u.searchParams.delete('focus');else u.searchParams.set('focus',focus);
 try{history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(e){}
 $('#indOpenLink').href=u.href;$('#indOpenLink').textContent='開啟 '+p.id+' '+p.name+' 專屬網址 ↗';
}
indSkill.addEventListener('change',render);indDay.addEventListener('change',render);indFocus.addEventListener('change',render);
$('#indToggleFull').addEventListener('click',()=>{indFocus.value=indFocus.value==='all'?'important':'all';render();});
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

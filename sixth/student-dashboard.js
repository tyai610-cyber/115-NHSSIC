/* 115 工科賽考生三日行程與樓層查詢。純前端資料，無個人資料傳送。 */
(() => {
  'use strict';
  const T = window.GK_TIMELINE, D = window.GK_DATA;
  if (!T || !D) return;
  const byId = id => D.programs.find(p=>p.id===id);
  const $ = id => document.getElementById(id);
  const create = (tag,cls,value) => {
    const n=document.createElement(tag);if(cls)n.className=cls;
    if(value!==undefined)n.textContent=String(value);return n;
  };
  const dayList = T.days;
  const labels = {checkin:'報到／點名',theory:'學科',practical:'術科',review:'講評／檢討',prep:'賽前準備',break:'休息時間',meeting:'領隊會議',staff:'評審／評分',other:'其他活動'};
  const primaryKinds = new Set(['checkin','theory','practical','prep']);
  function shortEventTitle(e) {
    const raw=String(e.title||'').replace(/\s+/g,' ').trim();
    if(e.kind==='checkin') {
      if(/抽籤/.test(raw)) return '選手報到與抽籤';
      const slot=/(上午|下午)場次?/.exec(raw)?.[0];
      return slot?`${slot}報到`:'報到／點名';
    }
    if(e.kind==='theory') return '學科測試';
    if(e.kind==='practical') {
      const heat=/(第[一二三四五六七八九十\d]+梯|第[一二三四五六七八九十\d]+站|術科[一二三四五六七八九十\d]+)/.exec(raw)?.[0];
      return heat?`${heat}術科測試`:'術科測試';
    }
    if(e.kind==='prep') {
      const slot=/(上午|下午)場/.exec(raw)?.[0];
      if(slot&&/試車|校刀/.test(raw)) return `${slot}試車與校刀`;
      return '賽前說明／分梯準備';
    }
    return raw.length>32?raw.slice(0,30).trimEnd()+'…':raw;
  }
  const siteName = '北科附工';
  let chosen = '01', day='2026-11-24', floor='2F';
  const isoInfo={}; dayList.forEach(d=>isoInfo[d.iso]=d.label);
  const FLOOR_REGIONS=[{"id":"22","floor":"3F","room":"體育一乙","x":4.824,"y":11.698,"w":14.118,"h":6.729},{"id":"22","floor":"3F","room":"體育一甲","x":4.824,"y":18.53,"w":14.118,"h":6.418},{"id":"14","floor":"3F","room":"模具一","x":4.824,"y":24.948,"w":14.118,"h":6.729},{"id":"14","floor":"3F","room":"化工一乙","x":4.824,"y":31.677,"w":14.118,"h":7.143},{"id":"13","floor":"3F","room":"化工一甲","x":4.824,"y":38.923,"w":14.118,"h":6.832},{"id":"13","floor":"3F","room":"汽車一乙","x":4.824,"y":45.859,"w":14.118,"h":7.039},{"id":"11","floor":"3F","room":"汽車一甲","x":4.824,"y":52.795,"w":14.118,"h":7.039},{"id":"11","floor":"3F","room":"電子一甲","x":4.824,"y":59.938,"w":14.118,"h":9.834},{"id":"07","floor":"2F","room":"動力一","x":19.0,"y":24.948,"w":11.588,"h":6.729},{"id":"09","floor":"3F","room":"電子一乙","x":5.294,"y":69.772,"w":10.588,"h":9.731},{"id":"08","floor":"3F","room":"機械一甲","x":15.882,"y":69.772,"w":10.353,"h":9.731},{"id":"10","floor":"3F","room":"電機一甲","x":36.471,"y":69.772,"w":10.706,"h":9.731},{"id":"10","floor":"3F","room":"電機一乙","x":47.176,"y":69.772,"w":11.118,"h":9.731},{"id":"23","floor":"3F","room":"生機一甲","x":58.294,"y":69.772,"w":10.647,"h":9.731},{"id":"23","floor":"3F","room":"生機一乙","x":68.941,"y":69.772,"w":12.471,"h":9.731}];

  function program(){return byId(chosen);}
  function schedule(){return T.programs[chosen];}
  function setProgramViaOldApp(id) {
    const dropdown=$('globalProgram');if(!dropdown || !byId(id))return;
    dropdown.value=id;
    dropdown.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function navigateMap(purpose){
    const p=program();if(!p)return;
    if(window.GK_OPEN_DESTINATION)window.GK_OPEN_DESTINATION(purpose);
    $('routeHint').textContent=`已切換至${purpose==='registration'?'報到地點':purpose==='theory'?'學科試場':'術科試場'}。地圖只高亮可確認的定位；未確認位置請依現場指示。`;
  }
  function updateQuickRoute(){
    const p=program();if(!p)return;
    const fields={quickRegistration:p.registration,quickTheory:p.theory,quickPractical:p.practical};
    Object.entries(fields).forEach(([key,value])=>{$(key).textContent=(value||'依職種公告').replace(/\s+/g,' ').trim();});
  }
  function renderDays(){
    const box=$('studentDayTabs');box.replaceChildren();
    for(const d of dayList){
      const b=create('button','day-tab',d.label);
      b.type='button';b.dataset.day=d.iso;
      b.setAttribute('aria-pressed',String(day===d.iso));
      b.addEventListener('click',()=>{day=d.iso;renderDays();renderTimeline();});
      box.append(b);
    }
  }
  function studentEventsForDay(all=false){
    const events=schedule()?.events||[];
    return events.filter(e=>(e.days||[e.date]).includes(day) && (all || (e.audience==='students'&&primaryKinds.has(e.kind))));
  }
  function eventCard(e){
    const row=create('article',`timeline-event event-${e.kind}`);
    const time=create('div','timeline-time',e.time);
    if(e.precision==='unspecified' || e.precision==='conditional') time.append(create('span','time-pending', e.precision==='conditional'?'依現場／條件確認':'未列開始時間'));
    const content=create('div','timeline-content');
    const title=create('div','timeline-title');title.append(create('span',`event-tag event-tag-${e.kind}`,labels[e.kind]||'活動'));
    title.append(create('strong','',shortEventTitle(e)));
    content.append(title);
    if(e.description){
      const detail=create('details','event-more');detail.append(create('summary','','查看完整說明'));
      detail.append(create('p','',e.description));
      content.append(detail);
    }
    if(e.audience==='teachers')content.append(create('small','event-audience','指導老師活動，考生不必將此時段視為自己的考試時間。'));
    if(e.audience==='staff')content.append(create('small','event-audience','評審／工作人員作業，非考生必須到場時段。'));
    if(e.days?.length>1) content.append(create('small','event-audience','原表為跨日總時長，並未分配每天各自的開始時間。'));
    row.append(time,content);return row;
  }
  function renderTimeline(){
    const p=program(), all=$('includeStaffEvents').checked;
    if(!p)return;
    const selected=studentEventsForDay(all), allDay=studentEventsForDay(true);
    const attendance=selected.filter(e=>e.kind==='checkin');
    const hasStaff=allDay.some(e=>e.audience!=='students');
    const types=new Set(selected.map(e=>e.kind));
    const summary=$('daySummary');summary.replaceChildren();
    summary.append(create('strong','',`${isoInfo[day]}｜${p.id} ${p.name}`));
    summary.append(create('span','',`${selected.length} 筆活動・${types.has('theory')?'含學科':'無固定學科時段'}・${types.has('practical')?'含術科':'無固定術科時段'}`));
    const notice=$('attendanceNotice');notice.hidden=!attendance.length;
    notice.replaceChildren();
    if(attendance.length){
      notice.append(create('strong','',day==='2026-11-24'?'首日報到提醒':'當日再次報到／點名提醒'));
      notice.append(create('span','',attendance.map(e=>`${e.time}｜${shortEventTitle(e)}`).join('　；　')));
    }
    const list=$('studentEvents');list.replaceChildren();
    if(!selected.length)list.append(create('p','timeline-empty',hasStaff?'本日無額外列出的考生時段，可勾選「顯示其他會議／工作事件」查看相關事項。':'本日未列出活動，並非代表沒有其他安排；請依正式日程為準。'));
    else selected.forEach(e=>list.append(eventCard(e)));
    const cautions=T.cautions[chosen]||[];
    const warn=$('scheduleCautions');warn.hidden=!cautions.length;warn.replaceChildren();
    if(cautions.length){warn.append(create('strong','','需留意的日程提醒'));const ul=create('ul');cautions.forEach(c=>ul.append(create('li','',c)));warn.append(ul);}
  }
  function renderFloor(){
    const p=program();if(!p)return;
    const listing=T.floorPlan.floors;
    const mine=listing.flatMap(f=>f.rooms.map(r=>({...r,floor:f.floor}))).find(r=>r.id===chosen);
    $('floorGuide').hidden=!mine;
    if(!mine)return;
    floor=mine.floor;
    paintFloor();
  }
  function paintFloor(){
    const list=T.floorPlan.floors, tabs=$('floorTabs');tabs.replaceChildren();
    list.forEach(f=>{
      const b=create('button','floor-tab',f.floor);
      b.type='button';b.setAttribute('aria-pressed',String(floor===f.floor));
      b.addEventListener('click',()=>{floor=f.floor;paintFloor();});tabs.append(b);
    });
    const f=list.find(f=>f.floor===floor), box=$('floorRooms');box.replaceChildren();
    paintFloorBlueprint();
    if(!f?.rooms?.length){box.append(create('p','floor-no-rooms',f?.note||'本樓層暫無這次可確認的筆試教室清單。'));return;}
    box.append(create('p','floor-summary',`${floor}｜${f.rooms.reduce((n,r)=>n+r.rooms.length,0)} 間原表所列教室（${f.rooms.length} 職種）`));
    const grid=create('div','classroom-grid');
    for(const x of f.rooms){
      for(const room of x.rooms){
        const b=create('button','classroom-item');b.type='button';
        if(x.id===chosen)b.classList.add('is-current');
        b.append(create('strong','',room),create('small','',`${x.id}｜${byId(x.id)?.name||'職種'}`));
        b.addEventListener('click',()=>{
          if(x.id!==chosen){setProgramViaOldApp(x.id);}else document.querySelector('#detailTheory')?.scrollIntoView({block:'center',behavior:'smooth'});
        });grid.append(b);
      }
    }
    box.append(grid);
  }

  function paintFloorBlueprint(){
    const layer=$('floorHitLayer'),label=$('floorFocusText');
    if(!layer || !label)return;
    layer.replaceChildren();
    const current=FLOOR_REGIONS.filter(r=>r.floor===floor);
    const mine=current.filter(r=>r.id===chosen);
    label.textContent=mine.length
       ? `${floor}｜${program()?.name||''}：${mine.map(r=>r.room).join('、')}（${mine.length} 間）`
       : `${floor}｜此職種未列本樓層筆試教室；請查看其他樓層`;
    for(const room of current){
      const b=create('button','floor-region');b.type='button';
      b.style.left=room.x+'%';b.style.top=room.y+'%';b.style.width=room.w+'%';b.style.height=room.h+'%';
      b.setAttribute('aria-label',`${room.floor} ${room.room}，${room.id} ${byId(room.id)?.name||''}`);
      b.title=`${room.room}｜${room.id} ${byId(room.id)?.name||''}`;
      if(room.id===chosen)b.classList.add('is-current');
      b.addEventListener('click',()=>{
        if(room.id!==chosen){setProgramViaOldApp(room.id);}else{
          b.classList.add('just-selected');
          $('floorFocusText').textContent=`已選擇：${room.floor} ${room.room}｜${room.id} ${byId(room.id)?.name||''}`;
        }
      });
      layer.append(b);
    }
  }

  function renderExamTips(){
    const p=program();if(!p)return;
    const general=$('generalTips');general.replaceChildren();
    const basics=[`確認 ${p.id} ${p.name} 的 11/24 首日報到：${p.registrationTime||'待公告'}。`,'若 11/25 或 11/26 有再次點名／梯次報到，請以三日時間軸及職種通知為準。','出門前核對報到地點、學科教室與術科試場；地圖點位非實測入口。','考試證明文件、服裝、工具與可帶物品，依該職種正式競賽規定準備。'];
    basics.forEach(t=>general.append(create('li','',t)));
    const notes=T.programNotes[chosen]||[];
    const el=$('programTips');el.hidden=!notes.length;el.replaceChildren();
    if(notes.length){el.append(create('strong','','職種特別提醒'));const ul=create('ul');notes.forEach(n=>ul.append(create('li','',n)));el.append(ul);}
  }
  function render(){
    const dropdown=$('globalProgram');chosen=dropdown?.value||chosen;
    if(!schedule())return;
    updateQuickRoute();renderDays();renderTimeline();renderFloor();renderExamTips();
  }
  function setup(){
    // HTML script runs after app.js. The original app sets the initial selected program synchronously.
    document.querySelectorAll('.quick-route-button').forEach(b=>b.addEventListener('click',()=>navigateMap(b.dataset.route)));
    $('floorMapButton').addEventListener('click',()=>navigateMap('theory'));
    $('includeStaffEvents').addEventListener('change',renderTimeline);
    window.addEventListener('gk:programchange',e=>{
      if(e.detail?.id)chosen=e.detail.id;
      render();
    });
    chosen=$('globalProgram')?.value||'01';render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();

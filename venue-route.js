/* 六個外場域校門至競賽場館｜依原圖標註的可選擇示意動畫 */
(()=>{'use strict';
 const R=window.GK_VENUE_ROUTES||{},D=window.GK_GUIDE_DATA;
 const NS='http://www.w3.org/2000/svg';
 const $=id=>document.getElementById(id);
 const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const svgEl=(tag,attrs={})=>{let x=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,String(v));return x};
 // 類比截取原圖座標：使用同一 1695×2400 基底，不對原圖作裁切。
 const pxy=([x,y])=>[(x/.8+40),(y/.8+380)];
 const pathData=points=>points.map((p,i)=>{let [x,y]=pxy(p);return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
 let venue=null,skill=null,mode='arrow',playing=true,svg=null,stage=null,viewport=null;
 const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
 let motionOptIn=false,pendingMapFocus=null;
 const scrollBehavior=()=>motionPreference.matches?'auto':'smooth';
 const panel=$('venueRoutePanel'),sel=$('venueRouteSkill'),btn=$('venueRoutePlayback'),modeSelect=$('venueRouteMarker'),label=$('venueRouteLabel'),info=$('venueRouteInfo'),hint=$('venueRouteWarning');
 if(!panel||!D)return;
 const picture=$('venueMapImage');viewport=$('venueMapViewport');
 stage=document.createElement('div');stage.id='venueMapStage';stage.className='venue-map-stage';picture.parentNode.insertBefore(stage,picture);stage.appendChild(picture);
 const overlay=svgEl('svg',{id:'venueRouteSvg',viewBox:'0 0 1695 2400',preserveAspectRatio:'xMidYMid meet',role:'img','aria-label':'從校門到場館的示意動畫路線'});stage.appendChild(overlay);svg=overlay;
 let lastRequested=new URLSearchParams(location.search).get('skill');
 function focusDestination(route,{showMap=true}={}) {
  if(!route?.p?.length||!viewport)return;
  if(!picture.complete||!picture.naturalWidth){pendingMapFocus={venue,skill,showMap};return;}
  pendingMapFocus=null;
  const end=pxy(route.p[route.p.length-1]);
  requestAnimationFrame(()=>{
   if(showMap)viewport.scrollIntoView({block:'center',behavior:scrollBehavior()});
   const w=stage.getBoundingClientRect().width/1695;
   const left=Math.max(0,Math.min(Math.max(0,viewport.scrollWidth-viewport.clientWidth),end[0]*w-viewport.clientWidth*.5));
   const top=Math.max(0,Math.min(Math.max(0,viewport.scrollHeight-viewport.clientHeight),end[1]*w-viewport.clientHeight*.5));
   viewport.scrollTo({left,top,behavior:scrollBehavior()});
  });
 }
 function draw({focus=true,showMap=true}={}){if(!R[venue]||!R[venue].routes[skill])return;
  let q=R[venue],r=q.routes[skill],d=pathData(r.p);svg.replaceChildren();
  const defs=svgEl('defs');const glow=svgEl('filter',{id:'vrGlow'});glow.append(svgEl('feGaussianBlur',{stdDeviation:'9'}));defs.append(glow);svg.append(defs);
  let shadow=svgEl('path',{d,stroke:'#072338','stroke-width':'21',opacity:'.72',fill:'none','stroke-linejoin':'round','stroke-linecap':'round'});
  let line=svgEl('path',{d,stroke:'#23e0cb','stroke-width':'12',fill:'none','stroke-linejoin':'round','stroke-linecap':'round','stroke-dasharray':'22 15'});svg.append(shadow,line);
  const mark=(pt,c,text)=>{let [x,y]=pxy(pt);let g=svgEl('g');g.append(svgEl('circle',{cx:x,cy:y,r:37,fill:c,opacity:'.16',class:'venue-route-pulse'}));g.append(svgEl('circle',{cx:x,cy:y,r:20,fill:c,stroke:'#fff','stroke-width':7}));g.append(svgEl('text',{x,y:y-43,'font-size':37,'font-weight':'900','text-anchor':'middle',stroke:'#ffffff','stroke-width':9,'paint-order':'stroke',fill:c}));g.lastChild.textContent=text;svg.append(g);};
  mark(r.p[0],'#087b6c','入口');
  // 不改變來源座標：雙層光圈在固定中心點後方繪製。
  const [tx,ty]=pxy(r.p[r.p.length-1]),targetHalo=svgEl('g',{class:'venue-target-halo','aria-hidden':'true'});
  targetHalo.append(svgEl('circle',{cx:tx,cy:ty,r:43,fill:'#0b2d44',opacity:'.85',class:'venue-target-backdrop'}));
  targetHalo.append(svgEl('circle',{cx:tx,cy:ty,r:65,fill:'none',stroke:'#FFD600','stroke-width':13,class:'venue-target-ring'}));
  targetHalo.append(svgEl('circle',{cx:tx,cy:ty,r:76,fill:'none',stroke:'#ffffff','stroke-width':10,class:'venue-target-ring venue-target-ring-delayed'}));
  svg.append(targetHalo);
  mark(r.p[r.p.length-1],'#FF5722','場館');
  const targetName=D.skills.find(s=>s.id===skill)?.name||'競賽場館';
  const caption=`${skill} ${targetName}`;
  const captionWidth=Math.min(650,Math.max(235,Array.from(caption).length*43+70));
  const captionX=Math.max(24,Math.min(1695-captionWidth-24,tx-captionWidth*.5));
  const captionY=ty>160?ty-156:ty+109;
  const captionGroup=svgEl('g',{class:'venue-target-label','aria-hidden':'true'});
  captionGroup.append(svgEl('rect',{x:captionX,y:captionY,width:captionWidth,height:64,rx:14,fill:'#7c2718',stroke:'#fff8eb','stroke-width':5}));
  const captionText=svgEl('text',{x:captionX+captionWidth*.5,y:captionY+44,'text-anchor':'middle','font-size':40,'font-weight':900,fill:'#ffffff'});
  captionText.textContent=caption;captionGroup.append(captionText);svg.append(captionGroup);
  if(mode!=='off'){
    let g=svgEl('g',{class:'venue-route-mover'});
    if(mode==='arrow') {g.append(svgEl('circle',{r:25,fill:'#fbbf24',stroke:'#10283a','stroke-width':7}));g.append(svgEl('path',{d:'M-12 -16 L16 0 L-12 16 Z',fill:'#10283a'}));}
    else {let bg=svgEl('circle',{r:30,fill:'#ffffff',opacity:'.92'});g.append(bg);g.append(svgEl('circle',{cx:0,cy:-16,r:8,fill:'#131920',stroke:'#fff','stroke-width':1}));g.append(svgEl('path',{d:'M0 -7 L1 10 M1 -1 L-15 7 M1 -1 L15 7 M1 10 L-12 23 M1 10 L14 24',stroke:'#131920','stroke-width':7,'stroke-linecap':'round',fill:'none'}));}
    if(!motionPreference.matches||motionOptIn){
      const motion=svgEl('animateMotion',{dur:Math.max(6,r.p.length*1.15)+'s',repeatCount:'indefinite',rotate:mode==='arrow'?'auto':'0',path:d});
      g.append(motion);
    }else{
      const [sx,sy]=pxy(r.p[0]);g.setAttribute('transform',`translate(${sx} ${sy})`);
    }
    svg.append(g);
  }
  const selectedName=D.skills.find(s=>s.id===skill)?.name||'競賽場館';
  label.textContent=`${skill} ${selectedName}｜${r.place}`;info.textContent=`入口：${q.entry}。目的地光圈為館舍方向示意，並非已核定的精確入口。 ${r.note}`;
  hint.textContent=`${q.confidence}｜動畫僅供辨識館舍方向，不代表道路已核定、無障礙或實際可通行。`;
  btn.disabled=(mode==='off');
  playing=mode!=='off'&&(!motionPreference.matches||motionOptIn);
  btn.textContent=playing?'暫停動畫':'播放動畫';
  try{if(playing){svg.unpauseAnimations();svg.setCurrentTime(0);}else svg.pauseAnimations();}catch(e){}
  if(focus)focusDestination(r,{showMap});
 }
 function render(venueId){venue=venueId;let q=R[venueId];panel.hidden=!q;const disclosure=$('venueRouteDisclosure');if(disclosure)disclosure.hidden=!q;if(!q){svg.replaceChildren();return;}
  let skills=D.skills.filter(s=>s.venueId===venueId&&q.routes[s.id]);if(!skills.length){panel.hidden=true;return;}
  if(lastRequested && q.routes[lastRequested]){skill=lastRequested;lastRequested=null;}else if(!q.routes[skill])skill=skills[0].id;
  sel.innerHTML=skills.map(s=>`<option value="${s.id}">${s.id} ${esc(s.name)}｜${esc(q.routes[s.id].place)}</option>`).join('');sel.value=skill;
  draw();
 }
 function selectSkill(id,{updateUrl=true}={}){if(!R[venue]?.routes?.[id])return false;skill=id;sel.value=skill;
  if(updateUrl){try{const u=new URL(location.href);u.searchParams.set('skill',skill);history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(e){}}
  draw();return true;
 }
 sel.addEventListener('change',()=>selectSkill(sel.value));
 modeSelect.addEventListener('change',()=>{mode=modeSelect.value;if(motionPreference.matches)motionOptIn=false;draw({focus:false});});
 btn.addEventListener('click',()=>{
  if(mode==='off')return;
  if(!playing && motionPreference.matches && !motionOptIn){motionOptIn=true;draw({focus:false});return;}
  try{if(playing)svg.pauseAnimations();else svg.unpauseAnimations();}catch(e){}
  playing=!playing;btn.textContent=playing?'暫停動畫':'播放動畫';
 });
 $('venueRouteReplay').addEventListener('click',()=>{
  motionOptIn=true;draw({focus:false});try{svg.setCurrentTime(0);svg.unpauseAnimations()}catch(e){}
  playing=true;btn.textContent='暫停動畫';
 });
 $('venueRouteFocus').addEventListener('click',()=>{const route=R[venue]?.routes?.[skill];if(route)focusDestination(route);});
 const cancelPending=()=>{pendingMapFocus=null;};
 viewport.addEventListener('pointerdown',cancelPending,{passive:true});
 viewport.addEventListener('wheel',cancelPending,{passive:true});
 picture.addEventListener('load',()=>{
  const request=pendingMapFocus;
  if(request&&request.venue===venue&&request.skill===skill){
   pendingMapFocus=null;const route=R[venue]?.routes?.[skill];
   if(route)focusDestination(route,{showMap:request.showMap});
  }
 });
 const motionChanged=()=>{motionOptIn=false;draw({focus:false});};
 if(motionPreference.addEventListener)motionPreference.addEventListener('change',motionChanged);
 else if(motionPreference.addListener)motionPreference.addListener(motionChanged);
 window.GK_VENUE_ROUTE={render,selectSkill};
 const current=new URLSearchParams(location.search).get('venue')||'nkh';render(current);
})();
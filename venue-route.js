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
 const panel=$('venueRoutePanel'),sel=$('venueRouteSkill'),btn=$('venueRoutePlayback'),modeSelect=$('venueRouteMarker'),label=$('venueRouteLabel'),info=$('venueRouteInfo'),hint=$('venueRouteWarning');
 if(!panel||!D)return;
 const picture=$('venueMapImage');viewport=$('venueMapViewport');
 stage=document.createElement('div');stage.id='venueMapStage';stage.className='venue-map-stage';picture.parentNode.insertBefore(stage,picture);stage.appendChild(picture);
 const overlay=svgEl('svg',{id:'venueRouteSvg',viewBox:'0 0 1695 2400',preserveAspectRatio:'xMidYMid meet',role:'img','aria-label':'從校門到場館的示意動畫路線'});stage.appendChild(overlay);svg=overlay;
 let lastRequested=new URLSearchParams(location.search).get('skill');
 function focusRoute(route){if(!route||!viewport)return;const ys=route.p.map(p=>pxy(p)[1]),first=Math.min(...ys),last=Math.max(...ys);requestAnimationFrame(()=>{let scale=stage.getBoundingClientRect().width/1695;const mid=(first+last)/2*scale;const target=Math.max(0,mid-viewport.clientHeight*.53);viewport.scrollTop=Math.min(target,Math.max(0,stage.scrollHeight-viewport.clientHeight));});}
 function draw(){if(!R[venue]||!R[venue].routes[skill])return;
  let q=R[venue],r=q.routes[skill],d=pathData(r.p);svg.replaceChildren();
  const defs=svgEl('defs');const glow=svgEl('filter',{id:'vrGlow'});glow.append(svgEl('feGaussianBlur',{stdDeviation:'9'}));defs.append(glow);svg.append(defs);
  let shadow=svgEl('path',{d,stroke:'#072338','stroke-width':'21',opacity:'.72',fill:'none','stroke-linejoin':'round','stroke-linecap':'round'});
  let line=svgEl('path',{d,stroke:'#23e0cb','stroke-width':'12',fill:'none','stroke-linejoin':'round','stroke-linecap':'round','stroke-dasharray':'22 15'});svg.append(shadow,line);
  const mark=(pt,c,text)=>{let [x,y]=pxy(pt);let g=svgEl('g');g.append(svgEl('circle',{cx:x,cy:y,r:37,fill:c,opacity:'.16',class:'venue-route-pulse'}));g.append(svgEl('circle',{cx:x,cy:y,r:20,fill:c,stroke:'#fff','stroke-width':7}));g.append(svgEl('text',{x,y:y-43,'font-size':37,'font-weight':'900','text-anchor':'middle',stroke:'#ffffff','stroke-width':9,'paint-order':'stroke',fill:c}));g.lastChild.textContent=text;svg.append(g);};
  mark(r.p[0],'#087b6c','入口');mark(r.p[r.p.length-1],'#d52c51','場館');
  if(mode!=='off'){
    let g=svgEl('g',{class:'venue-route-mover'});
    if(mode==='arrow') {g.append(svgEl('circle',{r:25,fill:'#fbbf24',stroke:'#10283a','stroke-width':7}));g.append(svgEl('path',{d:'M-12 -16 L16 0 L-12 16 Z',fill:'#10283a'}));}
    else {let bg=svgEl('circle',{r:30,fill:'#ffffff',opacity:'.92'});g.append(bg);g.append(svgEl('circle',{cx:0,cy:-16,r:8,fill:'#131920',stroke:'#fff','stroke-width':1}));g.append(svgEl('path',{d:'M0 -7 L1 10 M1 -1 L-15 7 M1 -1 L15 7 M1 10 L-12 23 M1 10 L14 24',stroke:'#131920','stroke-width':7,'stroke-linecap':'round',fill:'none'}));}
    let motion=svgEl('animateMotion',{dur:Math.max(6,r.p.length*1.15)+'s',repeatCount:'indefinite',rotate:mode==='arrow'?'auto':'0',path:d});g.append(motion);svg.append(g);
  }
  label.textContent=`${q.entry} → ${r.place}`;info.textContent=r.note;
  hint.textContent=`${q.confidence}｜動畫僅供辨識館舍方向，不代表道路已核定、無障礙或實際可通行。`;btn.disabled=(mode==='off');
  playing=true;btn.textContent='暫停動畫';try{svg.unpauseAnimations();svg.setCurrentTime(0);}catch(e){}
  focusRoute(r);
 }
 function render(venueId){venue=venueId;let q=R[venueId];panel.hidden=!q;if(!q){svg.replaceChildren();return;}
  let skills=D.skills.filter(s=>s.venueId===venueId&&q.routes[s.id]);if(!skills.length){panel.hidden=true;return;}
  if(lastRequested && q.routes[lastRequested]){skill=lastRequested;lastRequested=null;}else if(!q.routes[skill])skill=skills[0].id;
  sel.innerHTML=skills.map(s=>`<option value="${s.id}">${s.id} ${esc(s.name)}｜${esc(q.routes[s.id].place)}</option>`).join('');sel.value=skill;
  draw();
 }
 sel.addEventListener('change',()=>{skill=sel.value;const u=new URL(location.href);u.searchParams.set('skill',skill);try{history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(e){};draw();});
 modeSelect.addEventListener('change',()=>{mode=modeSelect.value;draw()});
 btn.addEventListener('click',()=>{if(mode==='off')return;try{if(playing)svg.pauseAnimations();else svg.unpauseAnimations();}catch(e){}playing=!playing;btn.textContent=playing?'暫停動畫':'繼續播放';});
 $('venueRouteReplay').addEventListener('click',()=>{try{svg.setCurrentTime(0);svg.unpauseAnimations()}catch(e){}playing=true;btn.textContent='暫停動畫';});
 $('venueRouteFocus').addEventListener('click',()=>{if(R[venue])focusRoute(R[venue].routes[skill])});
 window.GK_VENUE_ROUTE={render};
 const current=new URLSearchParams(location.search).get('venue')||'nkh';render(current);
})();
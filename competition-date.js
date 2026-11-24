/* V15.1: shared Taiwan date policy; no mutation of source schedules. */
window.GK_COMPETITION_DATE=(()=>{
 const days=['11/24','11/25','11/26'];
 function today(date=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
 function resolve(mode='auto',date=new Date()){if(mode==='all'||days.includes(mode))return mode;const k=today(date);return k<'2026-11-24'?'11/24':k>'2026-11-26'?'all':k.slice(5).replace('-','/');}
 function mode(value){return ['all',...days].includes(value)?value:'auto';}
 function label(value,date=new Date()){const k=today(date);return value!=='auto'?'指定日期':k<'2026-11-24'?'競賽尚未開始':k>'2026-11-26'?'歷史競賽行程':'今日行程';}
 function watch(fn){let last=today();const check=()=>{const next=today();if(next!==last){last=next;fn();}};window.addEventListener('focus',check);window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);setInterval(check,30000);}
 return {days,today,resolve,mode,label,watch};
})();
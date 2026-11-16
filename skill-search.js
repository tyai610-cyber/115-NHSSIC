/* 115 工科賽｜29 職種共用模糊搜尋；純前端、離線可用，不改正式職種名稱 */
(function(){'use strict';
  const alias={
    '01':['設計','應設','應用設計'],
    '02':['冷氣','空調','冷凍','冷凍空調'],
    '03':['機械電繪','電腦繪圖','CAD','電腦輔助製圖','輔助機械製圖'],
    '04':['機繪','機械圖','機械製圖'],
    '05':['程式','寫程式','程式設計','軟體設計','電軟'],
    '06':['電腦維修','修電腦','電修','電腦修理'],
    '07':['化學','化學分析','化驗'],
    '08':['工電','工業電子'],
    '09':['數電','數位電子'],
    '10':['工配','工業配線'],
    '11':['室配','室內配線'],
    '12':['汽修','汽車維修','汽車修理','修車'],
    '13':['鉗工','鉗作'],
    '14':['車床','車工'],
    '15':['建製','建築圖','建築製圖'],
    '16':['板金','鈑金'],
    '17':['建築','砌磚'],
    '18':['室設','室內設計','空間設計'],
    '19':['鑄造','鑄工'],
    '20':['模具','模具設計'],
    '21':['圖文','印刷','圖文傳播','網版印刷'],
    '22':['測量','工程測量'],
    '23':['機電','機電整合'],
    '24':['飛修','航空修護','飛機維修'],
    '25':['木工','家具','傢俱木工','家具木工'],
    '26':['噴漆','汽車烤漆','汽噴'],
    '27':['機器人','機器人技術'],
    '28':['配管','管線'],
    '29':['機器人手臂','機器手臂','機械手臂','機械手臂技術','機器手臂技術','機器人手臂技術','手臂技術']
  };
  const normalize=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[\s\-_.·、，,：:／/()（）【】\[\]]+/g,'').replace(/臺/g,'台').replace(/鈑/g,'板');
  function distance(a,b){
    if(a===b)return 0;
    if(Math.abs(a.length-b.length)>1)return 2;
    const rows=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
    for(let i=0;i<=a.length;i++)rows[i][0]=i;
    for(let j=0;j<=b.length;j++)rows[0][j]=j;
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
      rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
    }
    return rows[a.length][b.length];
  }
  function rank(s,q){
    const needle=normalize(q),name=normalize(s.name),id=String(s.id),aliases=(alias[id]||[]).map(normalize);
    if(!needle)return {score:0,why:''};
    if(needle===name||needle===id||(/^[0-9]+$/.test(needle)&&Number(needle)===Number(id)))return {score:120,why:'完全符合'};
    if(needle===normalize(id+s.name)||needle===normalize(Number(id)+s.name))return {score:119,why:'編號＋名稱'};
    if(aliases.includes(needle))return {score:115,why:'符合簡稱／別名'};
    if(name.startsWith(needle))return {score:105,why:'名稱開頭'};
    if(aliases.some(a=>a.startsWith(needle)))return {score:95,why:'別名開頭'};
    if(name.includes(needle))return {score:90,why:'名稱包含'};
    if(aliases.some(a=>a.includes(needle)))return {score:82,why:'別名包含'};
    // 單字與兩字查詢不做寬鬆錯字比對，以免出現大量不相關結果。
    if(needle.length>=2){
      let pos=0;
      for(const c of name){if(c===needle[pos])pos++;if(pos===needle.length)break;}
      if(pos===needle.length&&needle.length>=3)return {score:62,why:'字詞順序相符'};
    }
    const candidates=[name,...aliases];
    // 三字以上允許單字錯字／鄰字顛倒；兩字查詢僅在首字相同的短名稱／簡稱判定。
    for(const candidate of candidates){
      if(Math.abs(needle.length-candidate.length)>1)continue;
      if(needle.length>=3 && distance(needle,candidate)<=1)return {score:52,why:'近似文字（請確認）'};
      if(needle.length===2 && candidate.length===2 && needle[0]===candidate[0] && distance(needle,candidate)===1)return {score:35,why:'近似文字（請確認）'};
    }
    // 可用場域文字查詢職種，但排序低於所有正式名稱與別名。
    if(needle.length>=2 && [s.venue,s.registrationPlace,s.theory].some(x=>normalize(x).includes(needle)))return {score:25,why:'場域／試場符合'};
    return {score:0,why:''};
  }
  function find(skills,q,{limit=29}={}){
    const needle=normalize(q);
    if(!needle)return skills.map(s=>({skill:s,score:0,why:''})).slice(0,limit);
    const ranked=skills.map(s=>({skill:s,...rank(s,needle)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||Number(a.skill.id)-Number(b.skill.id));
    // 有明確名稱／別名結果時不混入近似錯字，避免「汽修」同時推薦汽車噴漆。
    return (ranked[0]?.score>=80?ranked.filter(x=>x.score>=60):ranked).slice(0,limit);
  }
  window.GK_SKILL_SEARCH=Object.freeze({alias,normalize,rank,find});
})();

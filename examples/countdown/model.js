/* Shared validation and time arithmetic; no host or DOM dependencies. */
(() => {
  'use strict';
  const themes=['birthday','winter','travel'],modes=['days','clock','sleeps'];
  const picture=value=>value==='' || (typeof value==='string' && /^bilder\/[a-zA-Z0-9_-]+\.jpg$/.test(value));
  function validate(events){
    if(!Array.isArray(events)||events.length>12)throw Error('Höchstens 12 Countdowns sind möglich.');
    const ids=new Set();
    return events.map(item=>{
      if(!item||typeof item!=='object')throw Error('Ungültiger Countdown.');
      const {id,title,target,zone,theme,mode,image,animation}=item;
      if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(id)||ids.has(id))throw Error('Ungültige oder doppelte Countdown-Kennung.');ids.add(id);
      if(typeof title!=='string'||!title.trim()||title.length>80)throw Error('Bitte einen Titel mit höchstens 80 Zeichen eingeben.');
      if(typeof target!=='string'||!/^\d{4}-\d\d-\d\dT/.test(target)||!Number.isFinite(Date.parse(target)))throw Error('Bitte ein gültiges Zieldatum auswählen.');
      const year=new Date(target).getUTCFullYear();if(year<2020||year>2100)throw Error('Das Ziel muss zwischen 2020 und 2100 liegen.');
      if(typeof zone!=='string'||zone.length>80)throw Error('Ungültige Zeitzone.');
      try{new Intl.DateTimeFormat('de',{timeZone:zone}).format(new Date());}catch{throw Error('Ungültige Zeitzone.');}
      if(!themes.includes(theme)||!modes.includes(mode)||!picture(image)||typeof animation!=='boolean')throw Error('Ungültiges Design oder Bild.');
      return {id,title:title.trim(),target:new Date(target).toISOString(),zone,theme,mode,image,animation};
    });
  }
  function day(date,zone){
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const get=type=>Number(parts.find(p=>p.type===type).value);
    return Date.UTC(get('year'),get('month')-1,get('day'))/86400000;
  }
  function remaining(event,now=Date.now()){
    const diff=Math.max(0,Date.parse(event.target)-now),minutes=Math.ceil(diff/60000);
    return {done:diff===0,days:Math.ceil(diff/86400000),sleeps:Math.max(0,day(new Date(event.target),event.zone)-day(new Date(now),event.zone)),
      fullDays:Math.floor(minutes/1440),hours:Math.floor(minutes%1440/60),minutes:minutes%60};
  }
  const api={validate,remaining,picture};
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.CountdownModel=api;
})();

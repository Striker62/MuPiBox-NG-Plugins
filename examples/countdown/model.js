/* Shared validation and time arithmetic; no host or DOM dependencies. */
(() => {
  'use strict';
  const themes=['birthday','winter','travel'],modes=['days','clock','sleeps','hms','hours-minutes','minutes','custom'];
  const allUnits=['days','hours','minutes','seconds'];
  const eventGifs=[
    ['sommerurlaub','Sommerurlaub · Mädchen'],['sommerurlaub-junge','Sommerurlaub · Junge'],
    ['winterurlaub','Winterurlaub · Mädchen'],['winterurlaub-junge','Winterurlaub · Junge'],
    ['weihnachten','Weihnachten · Mädchen'],['weihnachten-junge','Weihnachten · Junge'],
    ['geburtstag','Geburtstag · Mädchen'],['geburtstag-junge','Geburtstag · Junge'],
    ['ostern','Ostern · Osterhase'],['einschulung','Einschulung · Mädchen'],['einschulung-junge','Einschulung · Junge'],
    ['kindergarten','Kindergarten · Mädchen'],['kindergarten-junge','Kindergarten · Junge'],
    ['schwimmbad','Schwimmbad · Mädchen'],['schwimmbad-junge','Schwimmbad · Junge'],['ausflug','Ausflug · Freunde']
  ].map(([id,label])=>({id,label}));
  function unitsFor(item){
    if(item.units!==undefined){
      if(!Array.isArray(item.units)||!item.units.length||item.units.length>4||new Set(item.units).size!==item.units.length||item.units.some(unit=>!allUnits.includes(unit)))throw Error('Bitte mindestens eine Zeiteinheit auswählen.');
      return allUnits.filter(unit=>item.units.includes(unit));
    }
    return {days:['days'],sleeps:['days'],clock:['days','hours','minutes'],hms:['hours','minutes','seconds'],'hours-minutes':['hours','minutes'],minutes:['minutes'],custom:['days']}[item.mode]||['days'];
  }
  const picture=value=>value==='' || (typeof value==='string' && /^bilder\/[a-zA-Z0-9_-]+\.(jpg|gif)$/.test(value));
  function validateGif(bytes){
    const fail=()=>{throw Error('Bitte ein gültiges GIF bis 2 MiB, 800 × 800 Pixel und 40 Einzelbilder auswählen.');};
    if(!(bytes instanceof Uint8Array)||bytes.length<14||bytes.length>2*1024*1024)fail();
    const header=String.fromCharCode(...bytes.slice(0,6));if(!['GIF87a','GIF89a'].includes(header))fail();
    const width=bytes[6]+256*bytes[7],height=bytes[8]+256*bytes[9];
    if(!width||!height||width>800||height>800)fail();
    let pos=13+((bytes[10]&128)?3*(2**((bytes[10]&7)+1)):0),frames=0;
    function blocks(){while(pos<bytes.length){const length=bytes[pos++];if(!length)return;pos+=length;if(pos>bytes.length)fail();}fail();}
    while(pos<bytes.length){
      const tag=bytes[pos++];
      if(tag===0x3b){if(!frames)fail();return {width,height,frames};}
      if(tag===0x21){if(pos>=bytes.length)fail();pos++;blocks();}
      else if(tag===0x2c){
        if(pos+9>bytes.length)fail();
        const left=bytes[pos]+256*bytes[pos+1],top=bytes[pos+2]+256*bytes[pos+3],w=bytes[pos+4]+256*bytes[pos+5],h=bytes[pos+6]+256*bytes[pos+7],flags=bytes[pos+8];
        if(!w||!h||left+w>width||top+h>height)fail();
        if(++frames>40||width*height*frames>20000000)fail();
        pos+=9+((flags&128)?3*(2**((flags&7)+1)):0);
        if(pos>=bytes.length||bytes[pos]<2||bytes[pos]>8)fail();pos++;blocks();
      }else fail();
    }
    fail();
  }
  function validate(events){
    if(!Array.isArray(events)||events.length>12)throw Error('Höchstens 12 Countdowns sind möglich.');
    const ids=new Set();
    return events.map(item=>{
      if(!item||typeof item!=='object')throw Error('Ungültiger Countdown.');
      const {id,title,target,zone,theme,mode,image,animation}=item;
      const imageLayout=item.imageLayout===undefined?'side':item.imageLayout;
      const imageFit=item.imageFit===undefined?'contain':item.imageFit;
      const display=item.display===undefined?'numbers':item.display;
      const waitStart=item.waitStart===undefined?'':item.waitStart;
      const showText=item.showText===undefined?false:item.showText;
      const sleepSymbol=item.sleepSymbol===undefined?false:item.sleepSymbol;
      const eventGif=item.eventGif===undefined?'':item.eventGif;
      if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(id)||ids.has(id))throw Error('Ungültige oder doppelte Countdown-Kennung.');ids.add(id);
      if(typeof title!=='string'||!title.trim()||title.length>80)throw Error('Bitte einen Titel mit höchstens 80 Zeichen eingeben.');
      if(typeof target!=='string'||!/^\d{4}-\d\d-\d\dT/.test(target)||!Number.isFinite(Date.parse(target)))throw Error('Bitte ein gültiges Zieldatum auswählen.');
      const year=new Date(target).getUTCFullYear();if(year<2020||year>2100)throw Error('Das Ziel muss zwischen 2020 und 2100 liegen.');
      if(typeof zone!=='string'||zone.length>80)throw Error('Ungültige Zeitzone.');
      try{new Intl.DateTimeFormat('de',{timeZone:zone}).format(new Date());}catch{throw Error('Ungültige Zeitzone.');}
      if(!themes.includes(theme)||!modes.includes(mode)||!picture(image)||typeof animation!=='boolean')throw Error('Ungültiges Design oder Bild.');
      if(!['side','background'].includes(imageLayout))throw Error('Ungültige Bilddarstellung.');
      if(!['contain','cover'].includes(imageFit))throw Error('Ungültige Bildanpassung.');
      if(typeof showText!=='boolean')throw Error('Ungültige Textdarstellung.');
      if(typeof sleepSymbol!=='boolean')throw Error('Ungültiges Schlafensymbol.');
      if(eventGif!==''&&!eventGifs.some(gif=>gif.id===eventGif))throw Error('Ungültiges Ereignis-GIF.');
      if(!['numbers','dial'].includes(display))throw Error('Ungültige Countdown-Darstellung.');
      if(typeof waitStart!=='string'||(waitStart!==''&&!Number.isFinite(Date.parse(waitStart))))throw Error('Ungültiger Startzeitpunkt.');
      if(display==='dial'&&(!waitStart||Date.parse(waitStart)>=Date.parse(target)))throw Error('Für die Warte-Uhr muss der Start vor dem Ziel liegen.');
      const units=display==='dial'&&Array.isArray(item.units)&&!item.units.length?['days']:unitsFor(item);
      return {id,title:title.trim(),target:new Date(target).toISOString(),zone,theme,mode,image,animation,imageLayout,imageFit,showText,sleepSymbol,eventGif,units,display,waitStart};
    });
  }
  function day(date,zone){
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const get=type=>Number(parts.find(p=>p.type===type).value);
    return Date.UTC(get('year'),get('month')-1,get('day'))/86400000;
  }
  function remaining(event,now=Date.now()){
    const diff=Math.max(0,Date.parse(event.target)-now),minutes=Math.ceil(diff/60000),seconds=Math.ceil(diff/1000);
    return {done:diff===0,days:Math.ceil(diff/86400000),sleeps:Math.max(0,day(new Date(event.target),event.zone)-day(new Date(now),event.zone)),
      fullDays:Math.floor(minutes/1440),hours:Math.floor(minutes%1440/60),minutes:minutes%60,
      totalMinutes:minutes,totalHours:Math.floor(minutes/60),secondHours:Math.floor(seconds/3600),secondMinutes:Math.floor(seconds%3600/60),seconds:seconds%60};
  }
  function parts(item,now=Date.now()){
    const units=unitsFor(item),scales={days:86400,hours:3600,minutes:60,seconds:1},smallest=scales[units[units.length-1]];
    let rest=Math.ceil(Math.max(0,Date.parse(item.target)-now)/(smallest*1000))*smallest;
    return units.map(unit=>{const value=Math.floor(rest/scales[unit]);rest%=scales[unit];return {unit,value};});
  }
  function dial(item,now=Date.now()){
    const start=Date.parse(item.waitStart),target=Date.parse(item.target);
    if(!Number.isFinite(start)||!Number.isFinite(target)||start>=target)throw Error('Start und Ziel der Warte-Uhr prüfen.');
    const progress=Math.max(0,Math.min(1,(now-start)/(target-start))),angle=progress*360;
    let sector='';
    if(progress===0)sector='M120 120 L120 20 A100 100 0 1 1 120 220 A100 100 0 1 1 120 20 Z';
    else if(progress<1){const radians=angle*Math.PI/180,x=120+100*Math.sin(radians),y=120-100*Math.cos(radians);sector=`M120 120 L${x} ${y} A100 100 0 ${progress<.5?1:0} 1 120 20 Z`;}
    return {progress,angle,sector};
  }
  function chronological(items){return [...items].sort((a,b)=>{const x=Date.parse(a.target),y=Date.parse(b.target);return (Number.isFinite(x)?x:Infinity)-(Number.isFinite(y)?y:Infinity)||0;});}
  function current(items,now=Date.now()){return chronological(items.filter(item=>!Number.isFinite(Date.parse(item.target))||now<Date.parse(item.target)+3600000));}
  const api={validate,remaining,picture,validateGif,unitsFor,parts,dial,chronological,current,eventGifs};
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.CountdownModel=api;
})();

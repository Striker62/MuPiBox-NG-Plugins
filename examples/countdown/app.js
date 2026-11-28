(() => {
  'use strict';
  const $=id=>document.getElementById(id),sdk=window.MuPiBoxSDK,model=window.CountdownModel;
  let events=[],index=0,timer=null,paused=false,loadRun=0,imageURL='',shown='',notice='',celebrated=new Set();
  function stop(){if(timer!==null)clearInterval(timer);timer=null;}
  function releaseImage(){if(imageURL)URL.revokeObjectURL(imageURL);imageURL='';}
  function unit(value,label){const box=document.createElement('div');box.className='number';const number=document.createElement('b'),name=document.createElement('small');number.textContent=value;name.textContent=label;box.append(number,name);$('numbers').append(box);}
  function tick(){
    const item=events[index];if(!item||paused)return;
    const time=model.remaining(item);$('numbers').replaceChildren();
    if(time.done){unit(item.showText?'Hurra!':'★','Es ist so weit');$('message').textContent=notice||(item.showText?'Dein großer Moment ist da!':'');
      const key=item.id+item.target;if(!celebrated.has(key)){celebrated.add(key);if(item.animation){$('confetti').replaceChildren();for(let i=0;i<24;i++){const piece=document.createElement('i');piece.style.left=(i*41%100)+'%';piece.style.animationDelay=(i%8)*.12+'s';$('confetti').append(piece);}}}
    }else{
      $('message').textContent=notice;
      if(item.mode==='sleeps'){unit(time.sleeps,time.sleeps===0?'Heute ist es so weit':time.sleeps===1?'noch einmal schlafen':'noch so oft schlafen');}
      else{const labels={days:'Tage',hours:'Stunden',minutes:'Minuten',seconds:'Sekunden'};model.parts(item).forEach((part,index)=>unit(index?String(part.value).padStart(2,'0'):part.value,labels[part.unit]));}
    }
  }
  async function render(){
    const item=events[index],run=++loadRun;shown=item?.id||'';notice='';releaseImage();
    for(const id of ['picture','background-picture']){$(id).hidden=true;$(id).removeAttribute('src');}
    document.body.classList.toggle('background-mode',Boolean(item?.image&&item.imageLayout==='background'));
    document.body.classList.toggle('text-free',Boolean(item&&!item.showText));
    $('confetti').replaceChildren();
    $('prev').disabled=index===0;$('next').disabled=index>=events.length-1;$('dots').replaceChildren();
    events.forEach((event,i)=>{const button=document.createElement('button');button.className=i===index?'active':'';button.setAttribute('aria-label',event.title);button.setAttribute('aria-current',i===index?'true':'false');button.onclick=()=>{index=i;void render();};$('dots').append(button);});
    if(!item){$('title').textContent='Worauf freust du dich?';$('numbers').replaceChildren();$('target').textContent='';$('message').textContent='Deine Eltern können in der App-Verwaltung einen Countdown einrichten.';return;}
    $('card').className=item.theme;$('symbol').textContent={birthday:'★',winter:'❄',travel:'➜'}[item.theme];$('title').textContent=item.title;
    $('target').textContent=new Intl.DateTimeFormat('de-DE',{timeZone:item.zone,dateStyle:'long',timeStyle:item.mode==='clock'?'short':undefined}).format(new Date(item.target));tick();
    if(item.image){try{const blob=await sdk.shared.read(item.image);if(run!==loadRun)return;if(!(blob instanceof Blob)||blob.size>2*1024*1024)throw Error('Ungültiges Bild');const gif=item.image.endsWith('.gif');if(gif)model.validateGif(new Uint8Array(await blob.arrayBuffer()));if(run!==loadRun)return;imageURL=URL.createObjectURL(new Blob([blob],{type:gif?'image/gif':'image/jpeg'}));const image=$(item.imageLayout==='background'?'background-picture':'picture');image.src=imageURL;image.hidden=false;}catch{if(run===loadRun){document.body.classList.remove('background-mode');notice='Das eigene Bild konnte nicht geladen werden.';$('message').textContent=notice;}}}
  }
  async function load(){
    try{const config=await sdk.config.get();const previous=shown;events=model.validate(config.countdowns||[]);index=Math.max(0,events.findIndex(item=>item.id===previous));await render();}
    catch(error){notice='Countdowns konnten nicht geladen werden: '+error.message;$('message').textContent=notice;}
  }
  function move(offset){const next=Math.max(0,Math.min(events.length-1,index+offset));if(next!==index){index=next;void render();}}
  $('prev').onclick=()=>move(-1);$('next').onclick=()=>move(1);
  $('exit').onclick=async()=>{try{await sdk.exit();}catch{$('message').textContent='Bitte über die MuPiBox zurückgehen.';}};
  function resume(){paused=false;document.body.classList.remove('paused');stop();timer=setInterval(tick,1000);void load();}
  function pause(){paused=true;stop();document.body.classList.add('paused');}
  sdk.on('lifecycle.pause',pause);sdk.on('lifecycle.resume',resume);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else resume();});
  window.addEventListener('pagehide',()=>{pause();++loadRun;releaseImage();});
  document.addEventListener('keydown',event=>{if(event.key==='ArrowRight')move(1);if(event.key==='ArrowLeft')move(-1);if(event.key==='Escape')$('exit').click();});
  resume();
})();

(() => {
  'use strict';
  const $=id=>document.getElementById(id),sdk=window.MuPiBoxAdminSDK,model=window.CountdownModel;
  let settings=null,revision='',events=[],templates=[],selected=-1,busy=false,clean='{"events":[],"templates":[]}';
  const uploads=new Map();
  const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
  const unique=()=>{const bytes=new Uint8Array(12);crypto.getRandomValues(bytes);return Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');};
  function confirmAction(text){
    $('confirm-text').textContent=text;$('confirm').hidden=false;$('confirm-no').focus();
    document.querySelector('main').inert=true;document.querySelector('footer').inert=true;document.querySelector('.countdown-picker').inert=true;
    return new Promise(resolve=>{const finish=value=>{$('confirm').hidden=true;document.querySelector('main').inert=false;document.querySelector('footer').inert=false;document.querySelector('.countdown-picker').inert=false;resolve(value);};$('confirm-no').onclick=()=>finish(false);$('confirm-yes').onclick=()=>finish(true);});
  }
  function status(text,error=false){$('status').textContent=text;$('status').className=error?'error':'';}
  const snapshot=()=>JSON.stringify({events,templates});
  const dirty=()=>snapshot()!==clean||uploads.size>0;
  function controls(){
    const dial=events[selected]?.display==='dial';$('dial-settings').hidden=!dial;$('unit-settings').hidden=dial;
    $('countdown-choice').disabled=busy||!events.length;
    $('save').disabled=busy||!settings||!dirty();$('add').disabled=busy||!settings||events.length>=12;$('reload').disabled=busy;
    $('dirty').textContent=dirty()?'Änderungen noch nicht gespeichert.':'Alle Änderungen gespeichert.';
    for(const input of document.querySelectorAll('#editor input,#editor select,#editor button'))input.disabled=busy;
    for(const unit of ['days','hours','minutes','seconds'])$('unit-'+unit).disabled=busy||dial||events[selected]?.mode==='sleeps';
    for(const id of ['start-date','start-time']){$(id).disabled=busy||!dial;$(id).required=dial;}
    $('save-template').disabled=busy||!settings||selected<0||templates.length>=12;
  }
  function renderTemplates(){
    $('templates').replaceChildren();$('template-count').textContent='('+templates.length+'/12)';$('no-templates').hidden=templates.length>0;
    templates.forEach(template=>{
      const card=document.createElement('div'),name=document.createElement('strong'),create=document.createElement('button'),remove=document.createElement('button');
      card.className='template-card';name.textContent=template.title;create.type=remove.type='button';create.textContent='Countdown anlegen';remove.textContent='Vorlage entfernen';remove.className='template-remove';
      create.disabled=busy||!settings||events.length>=12;remove.disabled=busy||!settings;
      create.onclick=()=>{
        if(busy||!settings||events.length>=12)return;
        const item={...template,id:unique(),target:'',waitStart:template.display==='dial'?new Date().toISOString():'',units:[...template.units]};
        events.push(item);const pending=uploads.get(template.id);if(pending)uploads.set(item.id,pending);
        selected=events.length-1;render();status('Neuer Countdown aus „'+template.title+'“ angelegt. Bitte ein neues Zieldatum wählen und anschließend alles speichern.');
      };
      remove.onclick=async()=>{
        if(busy||!await confirmAction('Vorlage „'+template.title+'“ entfernen? Bereits angelegte Countdowns bleiben erhalten.'))return;
        templates=templates.filter(item=>item.id!==template.id);uploads.delete(template.id);render();status('Vorlage entfernt. Mit „Alles speichern“ dauerhaft übernehmen.');
      };
      card.append(name,create,remove);$('templates').append(card);
    });
  }
  function list(){
    const selectedId=events[selected]?.id;events=model.chronological(events);selected=selectedId?events.findIndex(item=>item.id===selectedId):-1;
    if(selected>=0)$('heading').textContent='Countdown '+(selected+1)+' von '+events.length+' bearbeiten';
    $('countdown-count').textContent='('+events.length+' von 12)';
    $('countdown-choice').replaceChildren();
    events.forEach((item,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=(index+1)+'. '+(item.title.trim()||'Ohne Titel');$('countdown-choice').append(option);});
    $('countdown-choice').value=String(selected);
    renderTemplates();
    controls();
  }
  function preview(){
    const item=events[selected];if(!item)return;
    $('preview').className=item.theme;$('preview-symbol').textContent={birthday:'★',winter:'❄',travel:'➜'}[item.theme];$('preview-title').textContent=item.title;
    if(!Number.isFinite(Date.parse(item.target))){$('preview-time').textContent='Bitte Datum und Uhrzeit vervollständigen.';list();return;}
    const value=model.remaining(item);
    try{const labels={days:'Tage',hours:'Stunden',minutes:'Minuten',seconds:'Sekunden'};$('preview-time').textContent=value.done?'Es ist so weit!':item.display==='dial'?'Warte-Uhr · '+Math.round(model.dial(item).progress*100)+' % vergangen':item.mode==='sleeps'?'Noch '+value.sleeps+'-mal schlafen':model.parts(item).map(part=>part.value+' '+labels[part.unit]).join(' · ');}catch(error){$('preview-time').textContent=error.message;}
    $('image-name').textContent=uploads.has(item.id)?uploads.get(item.id).name+' · wird beim Speichern hochgeladen':item.image?'Eigenes Bild hinterlegt':'Design ohne eigenes Bild';
    list();
  }
  function render(){
    const item=events[selected];$('editor').hidden=!item;$('empty').hidden=Boolean(item);list();if(!item)return;
    $('heading').textContent='Countdown '+(selected+1)+' von '+events.length+' bearbeiten';$('title').value=item.title;$('template-name').value='';
    const date=new Date(item.target),pad=n=>String(n).padStart(2,'0');
    $('date').value=Number.isFinite(date.getTime())?date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate()):'';$('time').value=Number.isFinite(date.getTime())?pad(date.getHours())+':'+pad(date.getMinutes())+':'+pad(date.getSeconds()):'00:00';
    $('display').value=item.display||'numbers';
    const start=item.waitStart?new Date(item.waitStart):new Date();
    $('start-date').value=start.getFullYear()+'-'+pad(start.getMonth()+1)+'-'+pad(start.getDate());$('start-time').value=pad(start.getHours())+':'+pad(start.getMinutes())+':'+pad(start.getSeconds());
    $('theme').value=item.theme;$('sleep-mode').checked=item.mode==='sleeps';
    const units=Array.isArray(item.units)?item.units:model.unitsFor(item);for(const unit of ['days','hours','minutes','seconds'])$('unit-'+unit).checked=units.includes(unit);
    $('image-layout').value=item.imageLayout||'side';$('image-fit').value=item.imageFit||'contain';$('show-text').checked=item.showText===true;$('sleep-symbol').checked=item.sleepSymbol===true;$('animation').checked=item.animation;$('image').value='';
    $('zone').textContent='Zeitzone: '+zone;preview();
  }
  function edit(){
    const item=events[selected];if(!item||busy)return;
    item.title=$('title').value;item.theme=$('theme').value;item.mode=$('sleep-mode').checked?'sleeps':'custom';item.units=['days','hours','minutes','seconds'].filter(unit=>$('unit-'+unit).checked);if(item.mode==='sleeps'&&!item.units.length)item.units=['days'];item.imageLayout=$('image-layout').value;item.imageFit=$('image-fit').value;item.showText=$('show-text').checked;item.animation=$('animation').checked;
    item.display=$('display').value;
    item.sleepSymbol=$('sleep-symbol').checked;
    if(item.display==='dial'){const start=new Date($('start-date').value+'T'+$('start-time').value);item.waitStart=Number.isFinite(start.getTime())?start.toISOString():'';}
    const value=$('date').value+'T'+$('time').value;
    const target=new Date(value);item.target=Number.isFinite(target.getTime())?target.toISOString():'';item.zone=zone;
    preview();
  }
  async function load(){
    if(busy)return;if(dirty()&&!await confirmAction('Ungespeicherte Änderungen verwerfen und den gespeicherten Stand laden?'))return;
    busy=true;controls();
    try{
      if(!sdk?.settings?.get||!sdk?.settings?.set)throw Error('Bitte in der angemeldeten MuPiBox-App-Verwaltung öffnen.');
      let result=await sdk.settings.get();if(typeof result?.revision!=='string'||!result.value||typeof result.value!=='object'||Array.isArray(result.value))throw Error('Ungültige Einstellungen der Box.');
      const original=model.validate(result.value.countdowns||[]),kept=model.current(original);
      if(original.length!==kept.length){await sdk.settings.set({...result.value,countdowns:kept},{expectedRevision:result.revision});result=await sdk.settings.get();if(typeof result?.revision!=='string')throw Error('Bereinigung gespeichert; bitte erneut laden.');}
      const previous=events[selected]?.id,loaded=model.current(model.validate(result.value.countdowns||[])),loadedTemplates=model.validate(result.value.countdownTemplates||[]);settings=result.value;revision=result.revision;events=loaded;templates=loadedTemplates;uploads.clear();clean=snapshot();selected=Math.max(0,events.findIndex(item=>item.id===previous));if(!events.length)selected=-1;render();status('Gespeicherten Stand geladen.'+(original.length!==kept.length?' Abgelaufene Countdowns automatisch entfernt.':''));
    }catch(error){status('Laden fehlgeschlagen: '+error.message,true);}
    finally{busy=false;render();}
  }
  async function jpeg(file){
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)||!file.size||file.size>20*1024*1024)throw Error('Bitte JPEG, PNG oder WebP bis 20 MiB auswählen.');
    const url=URL.createObjectURL(file);
    try{
      const image=new Image();image.src=url;await image.decode();
      if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>40000000)throw Error('Das Bild ist leer oder größer als 40 Megapixel.');
      const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));
      if(!blob||blob.size>2*1024*1024)throw Error('Die Bildkopie ist zu groß. Bitte ein kleineres Bild verwenden.');return blob;
    }finally{URL.revokeObjectURL(url);}
  }
  $('save').onclick=async()=>{
    if(busy||!settings)return;
    if(events.length&&!$('editor').reportValidity())return;
    const selectedId=events[selected]?.id;
    let valid,validTemplates;try{valid=model.validate(model.current(events));validTemplates=model.validate(templates);}catch(error){status(error.message,true);return;}
    busy=true;controls();list();status('Countdowns werden gespeichert …');
    try{
      // Check settings revision before uploading; the final write is also guarded.
      const latest=await sdk.settings.get();if(latest.revision!==revision)throw Error('Die Einstellungen wurden an anderer Stelle geändert. Bitte den gespeicherten Stand neu laden.');
      for(const item of [...valid,...validTemplates]){
        const pending=uploads.get(item.id);if(!pending)continue;
        if(!pending.path){
          const gif=pending.file.type==='image/gif'||/\.gif$/i.test(pending.file.name);
          if(gif){if(pending.file.size>2*1024*1024)throw Error('GIF ist größer als 2 MiB.');model.validateGif(new Uint8Array(await pending.file.arrayBuffer()));pending.blob=new Blob([pending.file],{type:'image/gif'});}
          else pending.blob=await jpeg(pending.file);
          pending.path='bilder/bild-'+unique()+(gif?'.gif':'.jpg');
        }
        if(!pending.uploaded){await sdk.files.write(pending.path,pending.blob,{expectedRevision:''});pending.uploaded=true;}
        item.image=pending.path;
      }
      await sdk.settings.set({...settings,countdowns:valid,countdownTemplates:validTemplates},{expectedRevision:revision});
      events=valid;templates=validTemplates;selected=events.findIndex(item=>item.id===selectedId);if(selected<0&&events.length)selected=0;clean=snapshot();uploads.clear();settings=null;
      // Refresh revision so the next save cannot use an obsolete one.
      const result=await sdk.settings.get();if(typeof result?.revision!=='string')throw Error('Gespeichert. Bitte vor weiteren Änderungen den Stand neu laden.');
      if(JSON.stringify(model.validate(result.value?.countdowns||[]))!==JSON.stringify(valid)||JSON.stringify(model.validate(result.value?.countdownTemplates||[]))!==JSON.stringify(validTemplates))throw Error('Gespeichert, danach wurden die Countdowns oder Vorlagen an anderer Stelle geändert. Bitte den Stand neu laden.');
      settings=result.value;revision=result.revision;
      status('Gespeichert! Die App auf der Box schließen und erneut öffnen.');
    }catch(error){status('Speichern nicht abgeschlossen: '+error.message+' Deine Eingaben bleiben geöffnet.',true);}
    finally{busy=false;render();}
  };
  for(const id of ['title','date','time','theme','display','start-date','start-time','sleep-mode','sleep-symbol','unit-days','unit-hours','unit-minutes','unit-seconds','image-layout','image-fit','show-text','animation'])$(id).addEventListener('input',edit);
  $('start-now').onclick=()=>{if(busy)return;const now=new Date(),pad=n=>String(n).padStart(2,'0');$('start-date').value=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());$('start-time').value=pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());edit();};
  $('save-template').onclick=()=>{
    const item=events[selected];if(busy||!settings||!item||templates.length>=12)return;
    try{
      const value=model.validate([item])[0],name=$('template-name').value.trim()||value.title;
      const template=model.validate([{...value,id:unique(),title:name,units:[...value.units]}])[0];
      templates.push(template);const pending=uploads.get(item.id);if(pending)uploads.set(template.id,pending);
      render();status('Vorlage „'+name+'“ angelegt. Mit „Alles speichern“ dauerhaft sichern.');
    }catch(error){status('Vorlage konnte nicht angelegt werden: '+error.message,true);}
  };
  $('image').onchange=()=>{const item=events[selected],file=$('image').files[0];if(item&&file&&!busy){uploads.set(item.id,{file,name:file.name});preview();}};
  $('remove-image').onclick=()=>{const item=events[selected];if(!item||busy)return;item.image='';uploads.delete(item.id);$('image').value='';preview();};
  $('add').onclick=()=>{if(busy||!settings||events.length>=12)return;const date=new Date();date.setDate(date.getDate()+7);date.setHours(0,0,0,0);events.push({id:unique(),title:'Mein nächstes Abenteuer',target:date.toISOString(),zone,theme:'birthday',mode:'days',image:'',animation:true});selected=events.length-1;render();};
  $('delete').onclick=async()=>{if(busy||selected<0||!await confirmAction('Diesen Countdown entfernen? Die Änderung wird erst beim Speichern übernommen.'))return;uploads.delete(events[selected].id);events.splice(selected,1);selected=Math.min(selected,events.length-1);render();};
  $('reload').onclick=()=>void load();
  $('countdown-choice').onchange=()=>{const next=Number($('countdown-choice').value);if(!busy&&Number.isInteger(next)&&next>=0&&next<events.length){selected=next;render();}};
  $('editor').addEventListener('submit',event=>event.preventDefault());
  document.addEventListener('keydown',event=>{
    if($('confirm').hidden)return;
    if(event.key==='Escape'){event.preventDefault();$('confirm-no').click();}
    if(event.key==='Tab'){event.preventDefault();(document.activeElement===$('confirm-no')?$('confirm-yes'):$('confirm-no')).focus();}
  });
  window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
  if(typeof setInterval==='function'){
    const cleanup=setInterval(()=>{if(!busy&&!dirty()&&!document.hidden&&events.some(item=>Date.now()>=Date.parse(item.target)+3600000))void load();},30000);
    window.addEventListener('pagehide',()=>clearInterval(cleanup));
  }
  void load();
})();

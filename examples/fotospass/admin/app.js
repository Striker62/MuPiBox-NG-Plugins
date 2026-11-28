(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const sdk=window.MuPiBoxAdminSDK;
  const store=sdk&&window.FotoUploadStore.create(sdk);
  const urls=new Set();
  let uploading=false,stopRequested=false,refreshRun=0,queue=[];
  function error(message){$('error').textContent=message;$('error').hidden=false;}
  let cameraSettings=null,cameraRevision='',cameraBusy=false;
  const resolutions=['auto','640x480','1280x720','1920x1080','2560x1440','3840x2160'];
  async function loadCameraSettings(){
    if(cameraBusy)return;
    cameraBusy=true;cameraSettings=null;
    for(const id of ['camera-save','camera-reload','capture-resolution'])$(id).disabled=true;
    try{
      if(!sdk?.settings?.get||!sdk?.settings?.set)throw Error('Die Box stellt die App-Einstellungen noch nicht bereit.');
      const result=await sdk.settings.get();
      if(typeof result?.revision!=='string'||!result.value||typeof result.value!=='object'||Array.isArray(result.value))throw Error('Ungültige Antwort der App-Einstellungen.');
      cameraSettings=result.value;cameraRevision=result.revision;
      $('capture-resolution').value=resolutions.includes(result.value.fotoCaptureResolution)?result.value.fotoCaptureResolution:'auto';
      $('camera-status').textContent='Kameraeinstellung geladen. Änderungen gelten nach einem Neustart der FotoSpaß-App.';
    }catch(e){$('camera-status').textContent='Kameraeinstellung konnte nicht geladen werden: '+e.message;}
    finally{cameraBusy=false;$('camera-reload').disabled=false;$('camera-save').disabled=$('capture-resolution').disabled=!cameraSettings;}
  }
  $('camera-reload').onclick=()=>void loadCameraSettings();
  $('camera-save').onclick=async()=>{
    if(cameraBusy||!cameraSettings)return;
    const resolution=$('capture-resolution').value;if(!resolutions.includes(resolution))return;
    cameraBusy=true;for(const id of ['camera-save','camera-reload','capture-resolution'])$(id).disabled=true;
    try{
      await sdk.settings.set({...cameraSettings,fotoCaptureResolution:resolution},{expectedRevision:cameraRevision});
      cameraSettings=null;
      // Re-read the revision before permitting another write. Other settings
      // are preserved, and a concurrent admin edit must fail closed.
      const result=await sdk.settings.get();
      if(typeof result?.revision!=='string'||!result.value||typeof result.value!=='object'||Array.isArray(result.value))throw Error('Einstellung gespeichert; aktuelle Revision konnte nicht gelesen werden. Bitte neu laden.');
      cameraSettings=result.value;cameraRevision=result.revision;
      $('camera-status').textContent='Kameraeinstellung gespeichert. FotoSpaß schließen und erneut öffnen.';
    }catch(e){$('camera-status').textContent='Speichern nicht abgeschlossen: '+e.message+'. Bei einem Konflikt Einstellung neu laden.';}
    finally{cameraBusy=false;$('camera-reload').disabled=false;$('camera-save').disabled=$('capture-resolution').disabled=!cameraSettings;}
  };
  void loadCameraSettings();
  function unique(){const bytes=new Uint8Array(12);crypto.getRandomValues(bytes);return [...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');}
  function release(){for(const url of urls)URL.revokeObjectURL(url);urls.clear();}
  function selection(){
    const files=queue;$('selection').replaceChildren();
    for(const file of files){const li=document.createElement('li');li.textContent=file.name+' · '+(file.size/1024/1024).toFixed(1)+' MiB';$('selection').append(li);}
    if(!files.length){const li=document.createElement('li');li.textContent='Noch keine Bilder ausgewählt.';$('selection').append(li);}
    $('upload').disabled=uploading||!files.length||!store;
  }
  async function jpeg(file,resize){
    if(!/\.(jpe?g|png|webp|gif)$/i.test(file.name)||!file.size||file.size>32*1024*1024)throw Error('Bitte JPEG, PNG, WebP oder GIF bis 32 MiB auswählen.');
    const url=URL.createObjectURL(file);
    try{
      const image=new Image();image.src=url;await image.decode();
      const pixels=image.naturalWidth*image.naturalHeight;
      if(!pixels||pixels>50000000)throw Error('Das Ausgangsbild ist leer oder größer als 50 Megapixel.');
      if(!resize&&pixels>16000000)throw Error('Ohne Verkleinerung sind höchstens 16 Megapixel möglich.');
      const scale=resize?Math.min(1,2560/Math.max(image.naturalWidth,image.naturalHeight)):1;
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));
      if(!blob||blob.type!=='image/jpeg'||blob.size>8*1024*1024)throw Error('Die JPEG-Kopie ist größer als 8 MiB oder konnte nicht erzeugt werden. Bitte das Ausgangsbild verkleinern.');
      return blob;
    }finally{URL.revokeObjectURL(url);}
  }
  async function refresh(){
    const run=++refreshRun;$('refresh').disabled=true;
    release();$('gallery').replaceChildren();$('list-status').textContent='Fotos werden geladen …';
    try{
      if(!store)throw Error('Bitte innerhalb der angemeldeten MuPiBox-Administration öffnen.');
      const result=await store.list();if(run!==refreshRun)return;
      $('list-status').textContent=result.entries.length+' Fotos'+(result.truncated?' angezeigt – die Ordnerliste wurde von der Box gekürzt.':'.');
      for(const entry of result.entries){
        const card=document.createElement('figure');card.className='photo';
        const caption=document.createElement('figcaption');caption.textContent=entry.name;
        const button=document.createElement('button');button.textContent='Vorschau laden';button.type='button';
        button.onclick=async()=>{
          button.disabled=true;
          try{
            const file=await store.read(entry.name);if(run!==refreshRun)return;
            const mime=/\.png$/i.test(entry.name)?'image/png':/\.webp$/i.test(entry.name)?'image/webp':/\.gif$/i.test(entry.name)?'image/gif':'image/jpeg';
            const url=URL.createObjectURL(new Blob([file.blob],{type:mime}));urls.add(url);
            const image=document.createElement('img');image.src=url;image.alt='Vorschau: '+entry.name;image.onload=()=>{button.hidden=true;};image.onerror=()=>{URL.revokeObjectURL(url);urls.delete(url);image.remove();button.disabled=false;error('Vorschau konnte nicht geladen werden: '+entry.name);};
            card.prepend(image);
          }catch(e){button.disabled=false;error('Vorschau fehlgeschlagen: '+(e.message||String(e)));}
        };
        card.append(caption,button);$('gallery').append(card);
      }
    }catch(e){if(run===refreshRun){$('list-status').textContent='Fotos konnten nicht geladen werden.';error(e.message||String(e));}}
    finally{if(run===refreshRun)$('refresh').disabled=uploading;}
  }
  $('files').onchange=()=>{queue=Array.from($('files').files||[]);selection();};
  $('refresh').onclick=()=>{if(!uploading)void refresh();};
  $('cancel').onclick=()=>{stopRequested=true;$('status').textContent='Upload wird nach dem laufenden Bild beendet …';};
  $('upload').onclick=async()=>{
    if(uploading||!store)return;
    const files=queue.slice();if(!files.length)return;
    if(files.length>100){error('Bitte höchstens 100 Fotos auf einmal auswählen.');return;}
    uploading=true;stopRequested=false;$('error').hidden=true;$('files').value='';
    for(const id of ['upload','files','resize','refresh'])$(id).disabled=true;
    $('cancel').hidden=false;$('progress').hidden=false;$('progress').value=0;$('progress').max=files.length;
    let completed=0,failed=0,processed=0;
    try{
      for(const file of files){
        if(stopRequested)break;
        $('status').textContent='Foto '+(processed+1)+' / '+files.length+': '+file.name;
        try{const blob=await jpeg(file,$('resize').checked);await store.upload(file.name,blob,unique());completed++;queue=queue.filter(item=>item!==file);selection();}
        catch(e){failed++;error(file.name+': '+(e.message||String(e))+'\nBereits hochgeladene Fotos bleiben erhalten. Noch nicht bearbeitete Dateien bleiben ausgewählt.');stopRequested=true;}
        finally{processed++;$('progress').value=processed;}
      }
      $('status').textContent=completed+' Fotos hochgeladen, '+failed+' Fehler, '+(files.length-processed)+' nicht verarbeitet.';
      if(completed===files.length)$('files').value='';
      await refresh();
    }finally{
      uploading=false;$('cancel').hidden=true;
      for(const id of ['files','resize','refresh'])$(id).disabled=false;
      selection();
    }
  };
  window.addEventListener('pagehide',()=>{++refreshRun;stopRequested=true;release();});
  selection();void refresh();
})();

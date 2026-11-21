/* Start the loop when the app opens, before the graphics are decoded. */
(function () {
  'use strict';
  const sdk=window.MuPiBoxSDK;
  const audio=window.createRunAudio(sdk,window.MuPiRunAudioFiles);
  const buttons=[document.getElementById('sound'),document.getElementById('menu-sound')];
  const settings=document.getElementById('audio-settings');
  const settingsButton=document.getElementById('settings-button');
  const doneButton=document.getElementById('audio-done');
  const sliders={music:document.getElementById('volume-music'),effects:document.getElementById('volume-effects')};
  const labels={music:document.getElementById('volume-music-value'),effects:document.getElementById('volume-effects-value')};
  let muted=false, hostPaused=false, pageHidden=false, blurred=false, exiting=false;
  let levels={music:100,effects:100}, touched=false, changeTimer, saveTimer;

  function validLevel(value) {
    return Number.isInteger(value) && value>=0 && value<=100 ? value : 100;
  }
  function updateControls() {
    for (const key of ['music','effects']) {
      if (sliders[key]) sliders[key].value=String(levels[key]);
      if (labels[key]) labels[key].textContent=levels[key]+'%';
    }
  }
  function commitAudio() {
    if (typeof audio.setLevels==='function')
      Promise.resolve(audio.setLevels(levels)).catch(error=>console.warn('[MuPi Run] Volume:',error));
  }
  function persist() {
    if (!sdk.storage?.set) return;
    void Promise.resolve(sdk.storage.set('audioLevels',{...levels}))
      .catch(error=>console.warn('[MuPi Run] Volume speichern:',error));
  }
  function flush() {
    clearTimeout(changeTimer);
    clearTimeout(saveTimer);
    commitAudio();
    if (touched) persist();
  }
  function changeLevel(key,value,final) {
    touched=true;
    levels[key]=validLevel(Number(value));
    updateControls();
    clearTimeout(changeTimer);
    clearTimeout(saveTimer);
    if (final) flush();
    else {
      // Do not flood the Pi mixer with native bridge requests while dragging.
      changeTimer=setTimeout(commitAudio,160);
      saveTimer=setTimeout(persist,450);
    }
  }
  function closeSettings() {
    if (settings && !settings.hidden) {
      settings.hidden=true;
      flush();
      settingsButton?.focus();
    }
  }
  function sync() {
    return audio.active(!(muted || hostPaused || pageHidden || document.hidden || blurred || exiting));
  }
  for (const button of buttons.filter(Boolean)) {
    button.hidden=!Object.keys(window.MuPiRunAudioFiles).length;
    button.addEventListener('click',()=>{
      muted=!muted;
      for(const el of buttons.filter(Boolean)){
        el.setAttribute('aria-pressed',String(muted)); el.textContent=muted?'🔇':'♫';
      }
      sync();
    });
  }
  if(settings && settingsButton && doneButton && sliders.music && sliders.effects) {
    settingsButton.hidden=!Object.keys(window.MuPiRunAudioFiles).length;
    settingsButton.addEventListener('click',()=>{
      if(!settings.hidden)closeSettings();
      else {settings.hidden=false; sliders.music.focus();}
    });
    doneButton.addEventListener('click',closeSettings);
    for (const [key,input] of Object.entries(sliders)) {
      input.addEventListener('input',()=>changeLevel(key,input.value,false));
      input.addEventListener('change',()=>changeLevel(key,input.value,true));
    }
  }
  sdk.on('lifecycle.pause',()=>{hostPaused=true;closeSettings();sync();});
  sdk.on('lifecycle.resume',()=>{hostPaused=false;sync();});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>{pageHidden=true;closeSettings();sync();});
  window.addEventListener('pageshow',()=>{pageHidden=false;sync();});
  if(!sdk.isHosted){
    window.addEventListener('blur',()=>{blurred=true;sync();});
    window.addEventListener('focus',()=>{blurred=false;sync();});
    // Desktop previews may require an actual gesture to unblock HTML audio.
    for(const event of ['click','keydown','pointerup']) document.addEventListener(event,audio.unlock);
  }

  updateControls();
  // Restore saved settings before starting the music, avoiding a loud first note.
  const stored=sdk.storage?.get ? sdk.storage.get('audioLevels') : Promise.resolve(null);
  const opening=Promise.resolve(stored).catch(()=>null).then(saved=>{
    if (!touched && saved && typeof saved==='object') {
      levels={music:validLevel(saved.music),effects:validLevel(saved.effects)};
      updateControls();
    }
    return Promise.resolve(typeof audio.setLevels==='function' ? audio.setLevels(levels) : undefined)
      .then(sync);
  });
  window.MuPiRunSession={
    opening,play:audio.play,prepare:audio.prepare,
    settingsOpen(){return Boolean(settings && !settings.hidden);},
    closeSettings,
    exit(){exiting=true;closeSettings();sync();}
  };
})();

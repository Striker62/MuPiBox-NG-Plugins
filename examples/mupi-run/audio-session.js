/* Start the loop when the app opens, before the graphics are decoded. */
(function () {
  'use strict';
  const sdk=window.MuPiBoxSDK;
  const audio=window.createRunAudio(sdk,window.MuPiRunAudioFiles);
  const buttons=[document.getElementById('sound'),document.getElementById('menu-sound')];
  let muted=false, hostPaused=false, pageHidden=false, blurred=false, exiting=false;

  function sync() {
    audio.active(!(muted || hostPaused || pageHidden || document.hidden || blurred || exiting));
  }
  for (const button of buttons) {
    button.hidden=!Object.keys(window.MuPiRunAudioFiles).length;
    button.addEventListener('click',()=>{
      muted=!muted;
      for(const el of buttons){
        el.setAttribute('aria-pressed',String(muted)); el.textContent=muted?'🔇':'♫';
      }
      sync();
    });
  }
  sdk.on('lifecycle.pause',()=>{hostPaused=true;sync();});
  sdk.on('lifecycle.resume',()=>{hostPaused=false;sync();});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>{pageHidden=true;sync();});
  window.addEventListener('pageshow',()=>{pageHidden=false;sync();});
  if(!sdk.isHosted){
    window.addEventListener('blur',()=>{blurred=true;sync();});
    window.addEventListener('focus',()=>{blurred=false;sync();});
    // Desktop previews may require an actual gesture to unblock HTML audio.
    for(const event of ['click','keydown','pointerup']) document.addEventListener(event,audio.unlock);
  }
  window.MuPiRunSession={play:audio.play,exit(){exiting=true;sync();}};
  sync();
})();

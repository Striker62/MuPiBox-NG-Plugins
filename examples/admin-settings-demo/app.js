(function () {
  'use strict';
  const sdk=window.MuPiBoxSDK;
  const status=document.getElementById('message');
  const values=document.getElementById('values');
  async function load() {
    try {
      const cfg=await sdk.config.get();
      // The SDK returns only this app's non-secret settings.
      const enabled=cfg.enabled !== false;
      const message=typeof cfg.greeting === 'string' ? cfg.greeting : 'Hallo von MuPi!';
      const repeat=Number.isInteger(cfg.repeat)?Math.max(1,Math.min(5,cfg.repeat)):2;
      status.textContent=enabled?Array(repeat).fill(message).join(' · '):'In Admin deaktiviert';
      values.textContent=JSON.stringify({enabled,greeting:message,repeat,mode:cfg.mode||'normal'},null,2);
    } catch(e) {
      status.textContent='Einstellungen nicht verfügbar: '+e.message;
      values.textContent='';
    }
  }
  document.getElementById('refresh').addEventListener('click',load);
  void load();
})();

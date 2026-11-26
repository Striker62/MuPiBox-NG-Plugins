/* Admin-only recording workflow. The host owns microphone access and storage. */
(() => {
  'use strict';
  const validBook = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id);
  const recordingPath = path => typeof path === 'string' && /^audio\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(ogg|webm)$/.test(path) && !path.includes('..');
  function create(sdk, options = {}) {
    const audio = sdk?.audio;
    const update = options.update || (() => {}), lock = options.lock || (() => {});
    const unique = options.unique || (() => {
      const bytes = new Uint8Array(12);crypto.getRandomValues(bytes);
      return Array.from(bytes, value => value.toString(16).padStart(2,'0')).join('');
    });
    let context = null, candidate = null, preview = null, active = false, command = false;
    let inputs = [], scanning = false, durationMs = 0, state = 'idle', message = '';
    let locked = false, disposed = false, timer = null, generation = 0;
    const supported = Boolean(audio && ['listInputDevices','startRecording','getRecordingStatus','stopRecording','cancelRecording','playRecording','deleteRecording'].every(name => typeof audio[name] === 'function'));
    const notify = () => {
      const next = active || command || Boolean(candidate);
      if (next !== locked) { locked = next;lock(next); }
      if (!disposed) update();
    };
    function stopPreview() {
      if (preview) { const current=preview;preview=null;try {current.player.pause();} finally {current.release();} }
    }
    function clearTimer() { if (timer !== null) { clearTimeout(timer);timer = null; } }
    async function poll(run) {
      if (!active || disposed || run !== generation) return;
      try {
        const result = await audio.getRecordingStatus();
        if (!active || disposed || run !== generation) return;
        state = result.state;durationMs = Number.isFinite(result.durationMs) ? Math.max(0,result.durationMs) : 0;
        notify();
      } catch (error) {
        if (active && !disposed && run === generation) { message = 'Aufnahmestatus: ' + error.message;notify(); }
      }
      if (active && !disposed && run === generation) timer = setTimeout(() => {timer = null;void poll(run);},1000);
    }
    function setPage(value) {
      if (locked) return;
      if (context?.page !== value?.page || context?.bookId !== value?.bookId) {
        stopPreview();++generation;
        message = supported ? '' : 'Audioaufnahme benötigt die freigegebene Admin-Audio-SDK (Alpha 87 oder neuer).';
      }
      context = value;notify();
    }
    async function scan() {
      if (!supported || scanning || active || disposed) return;
      scanning = true;message = 'Mikrofone werden gesucht …';notify();
      try {
        const result = await audio.listInputDevices();if (disposed) return;
        inputs = (Array.isArray(result.box) ? result.box : []).filter(d => typeof d.id === 'string').map(d => ({id:d.id,label:String(d.label || 'Box-Mikrofon'),source:'box'}));
        if (result.secureContext) {
          inputs.push({id:'',label:'PC-Standardmikrofon',source:'browser'});
          inputs.push(...(Array.isArray(result.browser) ? result.browser : []).filter(d => typeof d.id === 'string' && d.id).map(d => ({id:d.id,label:String(d.label || 'PC-Mikrofon'),source:'browser'})));
        }
        message = inputs.length + ' Mikrofon(e) verfügbar.' + (!result.secureContext ? ' PC-Mikrofon nur über HTTPS oder localhost; hier ein Box-Mikrofon wählen.' : '');
      } catch (error) { if (!disposed) {inputs = [];message = 'Mikrofone konnten nicht geladen werden: ' + error.message;} }
      finally { scanning = false;notify(); }
    }
    async function start(index, browserFormat = 'webm') {
      if (!supported || active || command || candidate || disposed) return;
      const target = context, device = inputs[index];
      if (!target?.saved || !validBook(target.bookId) || !target.page || target.isCover) throw Error('Buch zuerst speichern und eine Inhaltsseite auswählen.');
      if (!device) throw Error('Bitte zuerst ein Mikrofon auswählen.');
      if (!['webm','ogg'].includes(browserFormat)) throw Error('Ungültiges Aufnahmeformat.');
      const token = unique();if (!/^[a-zA-Z0-9_-]{8,80}$/.test(token)) throw Error('Ungültige Aufnahmekennung.');
      const relative = 'audio/seite-' + String(target.number).padStart(3,'0') + '-' + token + '.' + (device.source === 'box' ? 'ogg' : browserFormat);
      const path = 'books/' + target.bookId + '/' + relative;
      stopPreview();active = true;state = 'pending';durationMs = 0;
      message = 'Aufnahme im MuPiBox-Dialog bestätigen. Stoppen speichert die neue Datei.';
      const run = ++generation;notify();void poll(run);
      try {
        const result = await audio.startRecording({source:device.source,deviceId:device.id,path,expectedRevision:''});
        if (disposed || run !== generation) return;
        if (result?.cancelled) { message = 'Aufnahme abgebrochen. Die bisherige Zuordnung bleibt erhalten.';return; }
        if (result?.path !== path || typeof result.revision !== 'string' || !Number.isFinite(result.size) || result.size < 1 || result.size > 8*1024*1024) throw Error('Die Box hat keine gültige gespeicherte Aufnahme bestätigt.');
        candidate = {path,relative,revision:result.revision,size:result.size,heard:false,target};
        message = 'Neue Aufnahme gespeichert. Erst anhören, dann der Seite zuordnen.';
      } catch (error) { if (!disposed && run === generation) message = 'Aufnahme fehlgeschlagen: ' + error.message; }
      finally { if (run === generation) {clearTimer();active = false;state = 'idle';notify();} }
    }
    async function control(action) {
      if (!active || command || disposed) return;
      command = true;notify();
      try {
        if (action === 'cancel') await audio.cancelRecording();
        else {
          const result = await audio.getRecordingStatus();
          if (!['recording','paused'].includes(result.state)) throw Error('Die Aufnahme zuerst im MuPiBox-Dialog bestätigen.');
          await audio.stopRecording();
        }
      } catch (error) { message = 'Aufnahme: ' + error.message;throw error; }
      finally { command = false;notify(); }
    }
    async function play() {
      if (active || command || disposed) return;
      const item = candidate || context?.page?.recording;
      if (!item) return;
      const path = candidate ? candidate.path : 'books/' + context.bookId + '/' + item.path;
      if (!candidate && (!validBook(context.bookId) || !recordingPath(item.path))) throw Error('Ungültiger Aufnahmepfad.');
      stopPreview();command = true;const run = generation;notify();
      try {
        const result = await audio.playRecording(path);
        if (disposed || run !== generation) { result.player.pause();result.release();return; }
        preview = result;if (candidate) candidate.heard = true;
        message = candidate ? 'Aufnahme anhören. Danach übernehmen oder verwerfen.' : 'Gespeicherte Seitenaufnahme wird abgespielt.';
      } finally { command = false;notify(); }
    }
    function adopt() {
      if (!candidate || !candidate.heard || active || command || disposed) return;
      stopPreview();candidate.target.page.recording = {path:candidate.relative,revision:candidate.revision,size:candidate.size};
      candidate = null;message = 'Aufnahme zugeordnet. Jetzt „Buch speichern“, um die Zuordnung zu sichern.';notify();
    }
    async function discard() {
      if (!candidate || active || command || disposed) return;
      const item = candidate;stopPreview();command = true;notify();
      try {
        await audio.deleteRecording(item.path,{expectedRevision:item.revision,confirmName:item.path.split('/').pop()});
        candidate = null;message = 'Neue Aufnahme in den Papierkorb verschoben. Bisherige Zuordnung unverändert.';
      } finally { command = false;notify(); }
    }
    function unassign() {
      if (active || command || candidate || !context?.page?.recording || disposed) return;
      stopPreview();context.page.recording = null;
      message = 'Zuordnung entfernt. „Buch speichern“ übernimmt die Änderung. Die Audiodatei bleibt erhalten.';notify();
    }
    function dispose() {
      disposed = true;++generation;clearTimer();stopPreview();
      if (active) void audio.cancelRecording().catch(() => {});
      active = false;command = false;
    }
    return {setPage,scan,start,stop:()=>control('stop'),cancel:()=>control('cancel'),play,stopPreview:()=>{stopPreview();notify();},adopt,discard,unassign,dispose,
      get snapshot(){return {supported,context,candidate,active,command,inputs,scanning,durationMs,state,message,locked,playing:Boolean(preview)};}};
  }
  const api = {create,recordingPath};
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.BookRecorder = api;
})();

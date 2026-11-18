(() => {
  'use strict';
  const sdk = window.MuPiBoxSDK;
  const el = id => document.getElementById(id);
  const labels = {
    de: {exit:'Zurück', next:'Nächster Witz', hint:'Auf die Sprechblase tippen, dann liest MuPi vor.', loading:'MuPi sucht einen Witz …', error:'Die Witze konnten nicht geladen werden.', unavailable:'TTS ist ausgeschaltet. Bitte in Admin → TTS aktivieren.', notReady:'TTS ist noch nicht bereit. Bitte Admin → TTS und den Sprachcache prüfen.', previewSpeaking:'Der Browser liest den Witz vor …', browserUnavailable:'Dieser Browser unterstützt kein Vorlesen.', speaking:'MuPi erzählt den Witz …', laughing:'MuPi lacht …', speakError:'Vorlesen nicht möglich. Bitte TTS und Audio-Freigabe prüfen.', fallback:'Deutsche Witze (noch keine Übersetzung).'},
    en: {exit:'Back', next:'Next joke', hint:'Tap the speech bubble to hear MuPi read the joke.', loading:'MuPi is finding a joke …', error:'Could not load jokes.', unavailable:'TTS is disabled. Enable it in Admin → TTS.', notReady:'TTS is not ready. Check Admin → TTS and the voice cache.', previewSpeaking:'Your browser is reading the joke …', browserUnavailable:'This browser does not support speech.', speaking:'MuPi is telling a joke …', laughing:'MuPi laughs …', speakError:'Speech unavailable. Check TTS and audio permission.', fallback:'German jokes (translation coming soon).'},
    fr: {exit:'Retour', next:'Blague suivante', hint:'Touchez la bulle pour écouter la blague.', loading:'MuPi cherche une blague …', error:'Impossible de charger les blagues.', unavailable:'La synthèse vocale est désactivée.', speaking:'MuPi raconte une blague …', speakError:'Lecture indisponible.', fallback:'Blagues allemandes (traduction à venir).'},
    es: {exit:'Volver', next:'Otro chiste', hint:'Toca el bocadillo para escuchar el chiste.', loading:'MuPi busca un chiste …', error:'No se pueden cargar los chistes.', unavailable:'La voz no está activada.', speaking:'MuPi cuenta un chiste …', speakError:'Voz no disponible.', fallback:'Chistes en alemán (traducción pendiente).'},
    it: {exit:'Indietro', next:'Altra battuta', hint:'Tocca il fumetto per ascoltare la battuta.', loading:'MuPi cerca una battuta …', error:'Impossibile caricare le battute.', unavailable:'Sintesi vocale non attiva.', speaking:'MuPi racconta una battuta …', speakError:'Voce non disponibile.', fallback:'Barzellette tedesche (traduzione in arrivo).'},
    nl: {exit:'Terug', next:'Volgende grap', hint:'Tik op de tekstballon om de grap te horen.', loading:'MuPi zoekt een grap …', error:'Kon grappen niet laden.', unavailable:'Voorlezen is niet ingeschakeld.', speaking:'MuPi vertelt een grap …', speakError:'Voorlezen niet beschikbaar.', fallback:'Duitse grappen (vertaling volgt).'},
    pl: {exit:'Wróć', next:'Następny żart', hint:'Dotknij dymku, aby odsłuchać żart.', loading:'MuPi szuka żartu …', error:'Nie można wczytać żartów.', unavailable:'Odczytywanie nie jest włączone.', speaking:'MuPi opowiada żart …', speakError:'Czytanie niedostępne.', fallback:'Niemieckie żarty (tłumaczenie wkrótce).'}
  };
  let ui = labels.de;
  let jokes = [];
  let bag = [];
  let current = -1;
  let last = -1;
  let paused = false;
  let generation = 0;
  let locale = 'de';
  let jokeLanguage = 'de';
  let preview = false;
  let laughterAudio = null;

  function setStatus(value) { el('status').textContent = value || ''; }
  function shuffleIndices(count) {
    const indices = Array.from({length: count}, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = indices[i]; indices[i] = indices[j]; indices[j] = temp;
    }
    if (indices.length > 1 && indices[indices.length - 1] === last) {
      const temp = indices[0]; indices[0] = indices[indices.length - 1];
      indices[indices.length - 1] = temp;
    }
    return indices;
  }
  function stopSpeech() {
    generation += 1;
    if (laughterAudio) {
      laughterAudio.pause();
      laughterAudio.currentTime = 0;
      laughterAudio = null;
    }
    // Browser preview audio must remain local to the browser. Never call the
    // appliance speech API or change its playback state from this mode.
    if (preview) {
      try { window.speechSynthesis?.cancel(); }
      catch (_) { /* Unsupported browser speech engine. */ }
      return Promise.resolve();
    }
    if (sdk && sdk.tts && typeof sdk.tts.stop === 'function') {
      try { return Promise.resolve(sdk.tts.stop()).catch(() => {}); }
      catch (_) { /* Older hosts may not support speech cancellation. */ }
    }
    return Promise.resolve();
  }
  async function playLaughter(token) {
    if (token !== generation || paused) return;
    try {
      if (preview) {
        const audio = new window.Audio('assets/laugh-ionakan-712055.mp3');
        laughterAudio = audio;
        audio.volume = 0.8;
        audio.onended = () => {
          if (token === generation && !paused) setStatus('');
          if (laughterAudio === audio) laughterAudio = null;
        };
        audio.onerror = () => {
          if (token === generation && !paused) setStatus('');
          if (laughterAudio === audio) laughterAudio = null;
        };
        await audio.play();
      } else {
        // Use the appliance audio bridge, not Chromium/WebAudio on the Pi.
        // This keeps the effect on the device's configured PipeWire sink.
        if (!sdk.audio || typeof sdk.audio.playClip !== 'function') return;
        await sdk.audio.playClip('assets/laugh-ionakan-712055.mp3');
      }
      if (token === generation && !paused) setStatus(ui.laughing || '');
    } catch (error) {
      // An older host without audio.clip must not prevent jokes/TTS.
      console.warn('[Funny MuPi] Lachen nicht verfügbar:', error);
      if (token === generation && !paused) setStatus('');
    }
  }
  function speakInBrowser(token) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setStatus(ui.browserUnavailable || ui.speakError);
      return;
    }
    const utterance = new window.SpeechSynthesisUtterance(jokes[current]);
    utterance.lang = jokeLanguage === 'de' ? 'de-DE' : jokeLanguage;
    utterance.rate = 0.96;
    utterance.onstart = () => {
      if (token === generation && !paused) setStatus(ui.previewSpeaking || ui.speaking);
    };
    utterance.onend = () => {
      if (token === generation && !paused) void playLaughter(token);
    };
    utterance.onerror = error => {
      // The browser fires "canceled" when the user requests another joke.
      if (token === generation && !paused && error.error !== 'canceled') {
        setStatus(ui.speakError);
      }
    };
    window.speechSynthesis.speak(utterance);
    setStatus(ui.previewSpeaking || ui.speaking);
  }
  function nextJoke() {
    if (paused || !jokes.length) return;
    stopSpeech();
    if (!bag.length) bag = shuffleIndices(jokes.length);
    current = bag.pop();
    last = current;
    el('joke').textContent = jokes[current];
    setStatus('');
  }
  async function speakJoke() {
    if (paused || current < 0) return;
    const stopping = stopSpeech();
    const token = generation;
    try {
      await stopping;
      if (token !== generation || paused) return;
      if (preview) {
        speakInBrowser(token);
        return;
      }
      if (!sdk || !sdk.tts) {setStatus(ui.speakError); return;}
      const state = await sdk.tts.status();
      if (token !== generation || paused) return;
      if (!state || state.enabled !== true) {setStatus(ui.unavailable); return;}
      if (state.available !== true) {setStatus(ui.notReady || ui.unavailable); return;}
      setStatus(ui.speaking);
      const result = await sdk.tts.speak(jokes[current], {waitForCompletion:true});
      if (token !== generation || paused) return;
      if (result && result.state === 'completed') {
        await playLaughter(token);
      } else {
        setStatus('');
      }
    } catch (error) {
      console.warn('[Funny MuPi] Vorlesen fehlgeschlagen:', error);
      if (token === generation && !paused) setStatus(ui.speakError);
    }
  }
  async function loadFile(lang) {
    const response = await fetch('jokes/' + lang + '.json');
    if (!response.ok) throw new Error('language file missing');
    const data = await response.json();
    if (!data || data.language !== lang || !Array.isArray(data.jokes)) throw new Error('invalid jokes file');
    const valid = data.jokes.filter(j => typeof j === 'string' && j.trim() && Array.from(j).length <= 600 && !j.includes('\0'));
    if (!valid.length) throw new Error('empty jokes file');
    return valid;
  }
  async function init() {
    try {
      const context = await sdk.getContext();
      const raw = String(context && context.language || navigator.language || 'de');
      locale = raw.toLowerCase().split(/[-_]/)[0];
      // NG versions up to alpha.62 report preview:false even for the Admin
      // browser runner. Native touchscreen sessions always use loopback.
      // This fallback changes only where speech plays, never permissions.
      preview = !!(context && context.preview === true) ||
        !['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);
      ui = labels[locale] || labels.en;
    } catch (_) { locale = 'de'; ui = labels.de; }
    document.documentElement.lang = locale;
    el('exit-label').textContent = ui.exit;
    el('next-label').textContent = ui.next;
    el('hint').textContent = ui.hint;
    el('joke').textContent = ui.loading;
    try {
      const requested = /^[a-z]{2}$/.test(locale) ? locale : 'de';
      try {
        jokes = await loadFile(requested);
        jokeLanguage = requested;
        el('language').textContent = requested.toUpperCase();
      } catch (_) {
        if (requested !== 'de') {
          jokes = await loadFile('de');
          jokeLanguage = 'de';
          el('language').textContent = 'DE';
          setStatus(ui.fallback);
        } else throw _;
      }
      nextJoke();
      if (locale !== 'de' && el('language').textContent === 'DE') setStatus(ui.fallback);
    } catch (_) {
      el('joke').textContent = ui.error;
      el('bubble').disabled = true;
      el('next').disabled = true;
      setStatus(ui.error);
    }
  }
  el('next').addEventListener('click', nextJoke);
  el('bubble').addEventListener('click', speakJoke);
  el('exit').addEventListener('click', async () => {await stopSpeech(); await sdk.exit();});
  sdk.on('input', ({button, action}) => {
    if (action !== 'press') return;
    if (button === 'BACK' || button === 'B') { el('exit').click(); return; }
    if (button === 'RIGHT' || button === 'X') { nextJoke(); return; }
    if (button === 'A' || button === 'START') speakJoke();
  });
  sdk.on('lifecycle.pause', () => {paused = true; stopSpeech();});
  sdk.on('lifecycle.resume', () => {paused = false;});
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (paused) stopSpeech();
  });
  init();
})();

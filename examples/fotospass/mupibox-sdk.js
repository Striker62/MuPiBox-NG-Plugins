/* MuPiBox-NG Plugin SDK v1 (developer preview). MIT License.
 * Apps never receive privileged filesystem or core access through this facade.
 * A future trusted host must inject __MUPIBOX_BRIDGE__ before the SDK loads.
 */
(function (global) {
  'use strict';
  const bridge = global.__MUPIBOX_BRIDGE__;
  const handlers = new Map();

  function on(eventName, callback) {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');
    if (!handlers.has(eventName)) handlers.set(eventName, new Set());
    handlers.get(eventName).add(callback);
    return () => handlers.get(eventName)?.delete(callback);
  }

  function emit(eventName, payload) {
    const subscribers = handlers.get(eventName);
    if (!subscribers) return;
    for (const fn of subscribers) {
      try { fn(payload); }
      catch (error) { global.console.error('[MuPiBoxSDK] event handler failed', error); }
    }
  }

  function checkKey(key) {
    if (typeof key !== 'string' || !/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) {
      throw new TypeError('storage key must be 1–80 ASCII letters, numbers, _, . or -');
    }
  }

  function invoke(method, payload) {
    if (!bridge || typeof bridge.invoke !== 'function') return Promise.reject(new Error('MuPiBox host unavailable'));
    return Promise.resolve(bridge.invoke(method, payload));
  }

  const storage = Object.freeze({
    async get(key) {
      checkKey(key);
      if (bridge) {
        const response = await invoke('storage.get', { key });
        return response?.value ?? null;
      }
      // Browser-only preview fallback; NOT equivalent to trusted host storage.
      try {
        const raw = global.localStorage.getItem('mupibox.preview.' + key);
        return raw === null ? null : JSON.parse(raw);
      } catch (error) {
        global.console.warn('[MuPiBoxSDK] preview storage read failed', error);
        return null;
      }
    },
    async set(key, value) {
      checkKey(key);
      const serialized = JSON.stringify(value);
      if (serialized === undefined || serialized.length > 65536) throw new TypeError('invalid or too-large value');
      if (bridge) return invoke('storage.set', { key, value });
      global.localStorage.setItem('mupibox.preview.' + key, serialized);
    }
  });

  // Opt-in audio host capability. The Raspberry Pi uses a dedicated
  // PipeWire server that Chromium WebAudio cannot automatically reach.
  // The trusted host enforces the audio permission and device volume ceiling.
  // Standalone browser previews synthesize tones locally instead.
  let previewAudioContext = null;
  const audio = Object.freeze({
    async playNote(note, volume = 30, instrument = 'musicbox', options = {}) {
      if (typeof note !== 'string' || !/^[A-G](?:#)?[45]$/.test(note))
        throw new TypeError('unsupported note');
      if (!Number.isInteger(volume) || volume < 0 || volume > 100)
        throw new TypeError('volume must be 0..100');
      if (!['musicbox', 'piano', 'epiano', 'glockenspiel', 'xylophone', 'marimba', 'harp'].includes(instrument))
        throw new TypeError('unsupported instrument');
      // relative:true scales 0..100 across the *allowed* device volume,
      // without changing the legacy absolute-volume contract for old apps.
      if (options === null || typeof options !== 'object' || Array.isArray(options) ||
          (options.relative !== undefined && typeof options.relative !== 'boolean'))
        throw new TypeError('audio options must contain a boolean relative field');
      const payload = {note, volume, instrument};
      if (options.relative === true) payload.relative = true;
      if (bridge) return invoke('audio.note', payload);
      // Browser-only developer preview; never a substitute for the appliance
      // mixer or its local parental-control and volume safeguards.
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return false;
      if (!previewAudioContext) previewAudioContext = new AC();
      if (previewAudioContext.state === 'suspended') await previewAudioContext.resume();
      const semitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
      const step = semitones[note[0]] + (note.includes('#') ? 1 : 0) + (Number(note[note.length-1]) - 4) * 12;
      const frequency = 261.625565 * Math.pow(2, step / 12);
      const oscillator = previewAudioContext.createOscillator();
      const gain = previewAudioContext.createGain();
      const now = previewAudioContext.currentTime;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume / 600), now + .015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + .29);
      oscillator.connect(gain); gain.connect(previewAudioContext.destination);
      oscillator.start(now); oscillator.stop(now + .31);
      return true;
    }
  });

  // Host webcam capability: the trusted on-device runner asks the parent
  // (via a real user-facing button) to confirm each camera session. The
  // plugin never receives a device path or native video handle and cannot
  // bypass the permission/consent UI by constructing a URL.
  const camera = Object.freeze({
    async list() {
      const data = await invoke('camera.list', {});
      return Array.isArray(data?.devices) ? data.devices : [];
    },
    async start(id) {
      if (typeof id !== 'string' || !/^video(?:0|[1-9][0-9]{0,2})$/.test(id))
        throw new TypeError('camera ID must be an enumerated video device');
      return invoke('camera.start', {id});
    },
    async capture() {
      const result = await invoke('camera.capture', {});
      if (!result || typeof result.image !== 'string' || !result.image.startsWith('data:image/jpeg;base64,'))
        throw new Error('invalid camera frame');
      return result;
    },
    async stop() {return invoke('camera.stop', {});}
  });

  // Persistent host-owned image storage. The caller supplies only a Blob or
  // an opaque photo ID. The trusted parent uploads binary data; untrusted apps
  // cannot choose filenames, directories, tokens or filesystem paths.
  const photoID = /^\d{8}T\d{6}\.\d{9}Z-[a-f0-9]{16}\.(?:png|jpg)$/;
  function checkPhotoID(id) {
    if (typeof id !== 'string' || !photoID.test(id))
      throw new TypeError('invalid photo ID');
  }
  const photos = Object.freeze({
    async save(input) {
      const blob = input instanceof global.Blob ? input : input?.blob;
      if (!(blob instanceof global.Blob) || !['image/png', 'image/jpeg'].includes(blob.type) ||
          blob.size < 1 || blob.size > 8 * 1024 * 1024)
        throw new TypeError('save requires a PNG or JPEG Blob up to 8 MiB');
      return invoke('photos.save', {blob});
    },
    async list() {
      const result = await invoke('photos.list', {});
      return Array.isArray(result?.photos) ? result.photos : [];
    },
    async get(id) {
      checkPhotoID(id);
      const result = await invoke('photos.get', {id});
      if (!(result?.blob instanceof global.Blob)) throw new Error('invalid photo response');
      return result.blob;
    },
    async delete(id) {
      checkPhotoID(id);
      return invoke('photos.delete', {id});
    }
  });

  const sdk = Object.freeze({
    apiVersion: '1',
    isHosted: Boolean(bridge),
    on,
    storage,
    audio,
    camera,
    photos,
    async getContext() {
      if (bridge) return invoke('host.context', {});
      return { apiVersion: '1', preview: true, language: global.navigator.language || 'de' };
    },
    async exit() {
      if (bridge) return invoke('app.exit', {});
      emit('preview.exit', {});
      return false;
    }
  });

  if (bridge && typeof bridge.subscribe === 'function') {
    bridge.subscribe((message) => {
      if (!message || typeof message.event !== 'string') return;
      if (['input', 'lifecycle.pause', 'lifecycle.resume', 'camera.stopped'].includes(message.event)) {
        emit(message.event, message.payload || {});
      }
    });
  } else if (!bridge) {
    const mapping = {
      ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      Enter: 'A', ' ': 'A', Escape: 'BACK', Backspace: 'BACK'
    };
    global.addEventListener('keydown', (event) => {
      const button = mapping[event.key];
      if (!button) return;
      event.preventDefault();
      emit('input', { button, action: 'press' });
    });
  }

  global.MuPiBoxSDK = sdk;
})(window);

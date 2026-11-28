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

  // Read-only, app-scoped settings supplied by the already authenticated
  // administrator. No second login, no credential or write bridge.
  const config = Object.freeze({
    async get() {
      if (!bridge) return {};
      const response = await invoke('config.get', {});
      return response?.value && typeof response.value === 'object' &&
        !Array.isArray(response.value) ? response.value : {};
    }
  });

  // Opt-in audio host capability. The Raspberry Pi uses a dedicated
  // PipeWire server that Chromium WebAudio cannot automatically reach.
  // The trusted host enforces the audio permission and device volume ceiling.
  // Standalone browser previews synthesize tones locally instead.
  let previewAudioContext = null;
  function checkSampleAsset(asset) {
    if (typeof asset !== 'string' || asset.length > 180 ||
        !/^assets\/[a-zA-Z0-9_/-]+\.(mp3|ogg|wav)$/.test(asset) ||
        asset.split('/').some(part => part === '..' || part.startsWith('.')))
      throw new TypeError('audio sample must be a bundled assets/*.ogg, .mp3 or .wav file');
  }
  const audio = Object.freeze({
    // Native file playback is mediated by the host and restricted to bundled
    // app assets. The host decodes into its own PipeWire mixer and enforces
    // the existing game/parental and maximum-volume policies.
    async prepareSample(asset) {
      checkSampleAsset(asset);
      if (!bridge) return false;
      return invoke('audio.sample.prepare', {asset});
    },
    async playSample(asset, volume = 40, options = {relative:true}) {
      checkSampleAsset(asset);
      if (!Number.isInteger(volume) || volume < 0 || volume > 100)
        throw new TypeError('sample volume must be 0..100');
      if (options === null || typeof options !== 'object' || Array.isArray(options) ||
          (options.relative !== undefined && typeof options.relative !== 'boolean'))
        throw new TypeError('sample options must contain a boolean relative field');
      if (!bridge) return false;
      return invoke('audio.sample.play', {asset, volume, relative:options.relative!==false});
    },
    async playMusic(asset, volume = 20, options = {relative:true}) {
      if (typeof asset !== 'string' || asset.length > 180 ||
          !/^assets\/[a-zA-Z0-9_/-]+\.(mp3|ogg|wav)$/.test(asset) ||
          asset.split('/').some(part => part === '..' || part.startsWith('.')))
        throw new TypeError('music must be a bundled assets/*.ogg, .mp3 or .wav file');
      if (!Number.isInteger(volume) || volume < 0 || volume > 100)
        throw new TypeError('music volume must be 0..100');
      if (options === null || typeof options !== 'object' || Array.isArray(options) ||
          (options.relative !== undefined && typeof options.relative !== 'boolean') ||
          (options.loop !== undefined && typeof options.loop !== 'boolean'))
        throw new TypeError('music options must contain boolean relative and loop fields');
      if (!bridge) return false;
      const payload = {asset, volume, relative:options.relative!==false};
      // Keep legacy payload byte-for-byte compatible unless one-shot is
      // explicitly requested by a newer plugin.
      if (options.loop === false) payload.loop = false;
      return invoke('audio.music.play', payload);
    },
    // Optional trusted host feature: preload a *bounded* packaged music
    // loop into its 20MiB/two-slot LRU PCM cache without starting playback.
    async prepareMusic(asset) {
      if (typeof asset !== 'string' || asset.length > 180 ||
          !/^assets\/[a-zA-Z0-9_/-]+\.(mp3|ogg|wav)$/.test(asset) ||
          asset.split('/').some(part => part === '..' || part.startsWith('.')))
        throw new TypeError('music must be a bundled assets/*.ogg, .mp3 or .wav file');
      if (!bridge) return false;
      return invoke('audio.music.prepare', {asset, volume:0, relative:true});
    },
    async setMusicVolume(volume, options = {relative:true}) {
      if (!Number.isInteger(volume) || volume < 0 || volume > 100 ||
          options === null || typeof options !== 'object' || Array.isArray(options) ||
          (options.relative !== undefined && typeof options.relative !== 'boolean'))
        throw new TypeError('music volume must be 0..100 with valid options');
      return bridge ? invoke('audio.music.volume', {volume, relative:options.relative!==false}) : false;
    },
    async setSampleVolume(volume, options = {relative:true}) {
      if (!Number.isInteger(volume) || volume < 0 || volume > 100 ||
          options === null || typeof options !== 'object' || Array.isArray(options) ||
          (options.relative !== undefined && typeof options.relative !== 'boolean'))
        throw new TypeError('sample volume must be 0..100 with valid options');
      return bridge ? invoke('audio.sample.volume', {volume, relative:options.relative!==false}) : false;
    },
    // Optional NG host capability: retain the exact loop position on pause.
    async pauseMusic() {return bridge ? invoke('audio.music.pause', {}) : false;},
    async resumeMusic() {return bridge ? invoke('audio.music.resume', {}) : false;},
    // Preserve one owner-owned music voice while the menu uses the same mixer.
    // The host keeps at most one suspended voice globally (bounded PCM).
    async holdMusic() {return bridge ? invoke('audio.music.hold', {}) : false;},
    async restoreMusic() {return bridge ? invoke('audio.music.restore', {}) : false;},
    async stopMusic() {return bridge ? invoke('audio.music.stop', {}) : false;},
    async stopSamples() {return bridge ? invoke('audio.sample.stop', {}) : false;},
    async playClip(asset) {
      // Only local, bundled audio assets may be requested. The host checks
      // that the asset belongs to the installed app and audio was granted.
      if (typeof asset !== 'string' || asset.length > 180 ||
          !/^assets\/[a-zA-Z0-9_/-]+\.(mp3|ogg|wav)$/.test(asset) ||
          asset.split('/').some(part => part === '..' || part.startsWith('.'))) {
        throw new TypeError('audio clip must be a bundled assets/*.mp3, .ogg or .wav file');
      }
      return invoke('audio.clip', {asset});
    },
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
    },
    async playChord(notes, volume = 30, options = {}) {
      const instruments = ['musicbox', 'piano', 'epiano', 'glockenspiel', 'xylophone', 'marimba', 'harp'];
      if (!Array.isArray(notes) || notes.length < 1 || notes.length > 4 ||
          notes.some(n => !n || typeof n.note !== 'string' ||
            !/^[A-G](?:#)?[45]$/.test(n.note) || !instruments.includes(n.instrument))) {
        throw new TypeError('chord needs 1..4 valid note/instrument objects');
      }
      if (!Number.isInteger(volume) || volume < 0 || volume > 100 ||
          options === null || typeof options !== 'object' || Array.isArray(options) ||
          (options.relative !== undefined && typeof options.relative !== 'boolean')) {
        throw new TypeError('invalid chord volume/options');
      }
      if (bridge) return invoke('audio.chord', {notes, volume, relative: options.relative === true});
      // Browser-only preview is not the native PipeWire mixing guarantee.
      return Promise.all(notes.map(n => audio.playNote(n.note, volume, n.instrument, options)));
    }
  });

  // Speech uses the owner's existing Admin > TTS configuration. Applications
  // never select a provider or receive credentials. An approved "audio"
  // permission is required, just as for native note playback.
  function speechText(text) {
    if (typeof text !== 'string' || !text.trim() || Array.from(text).length > 600 || text.includes('\0'))
      throw new TypeError('speech text must contain 1..600 characters and no NUL');
    return text.trim();
  }
  const tts = Object.freeze({
    async status() {
      if (!bridge) return {enabled: false, available: false, language: global.navigator.language || 'de'};
      const result = await invoke('tts.status', {});
      const out = {enabled: result?.enabled === true, available: result?.available === true,
        language: typeof result?.language === 'string' ? result.language : ''};
      if (typeof result?.state === 'string') out.state = result.state;
      if (typeof result?.speaking === 'boolean') out.speaking = result.speaking;
      if (typeof result?.canPause === 'boolean') out.canPause = result.canPause;
      if (typeof result?.preRenderingEnabled === 'boolean') out.preRenderingEnabled = result.preRenderingEnabled;
      return out;
    },
    async prepare(text) {
      return invoke('tts.prepare', {text: speechText(text)});
    },
    async stop() {
      return invoke('tts.stop', {});
    },
    async speak(text, options = {}) {
      if (options === null || typeof options !== 'object' || Array.isArray(options) ||
          (options.waitForCompletion !== undefined && typeof options.waitForCompletion !== 'boolean'))
        throw new TypeError('speech options must contain a boolean waitForCompletion');
      const payload = {text: speechText(text)};
      if (options.afterClip !== undefined) {
        const asset = options.afterClip;
        if (typeof asset !== 'string' || asset.length > 180 ||
            !/^assets\/[a-zA-Z0-9_/-]+\.wav$/.test(asset) ||
            asset.split('/').some(part => part === '..' || part.startsWith('.'))) {
          throw new TypeError('afterClip must be a bundled assets/*.wav file');
        }
        payload.after_clip = asset;
      }
      const result = await invoke('tts.speak', payload);
      if (options.waitForCompletion !== true) return result; // existing immediate-start contract
      if (typeof result?.request_id !== 'string')
        throw new Error('MuPiBox host does not support speech completion');
      // The host long-polls up to 15 seconds per call, avoiding constant
      // status traffic; only the owning app session can wait on this clip.
      for (;;) {
        const state = await invoke('tts.wait', {request_id: result.request_id});
        if (state?.done === true) return {...result, ...state};
      }
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
    async modes(id) {
      if (typeof id !== "string" || !/^video(?:0|[1-9][0-9]{0,2})$/.test(id)) throw new TypeError("invalid camera ID");
      const result=await invoke('camera.modes',{id});
      return Array.isArray(result?.modes)?result.modes:[];
    },
    async start(id, options = {}) {
      if (typeof id !== 'string' || !/^video(?:0|[1-9][0-9]{0,2})$/.test(id))
        throw new TypeError('camera ID must be an enumerated video device');
      return invoke('camera.start', {id,...(options.preview===undefined?{}:{preview:options.preview}),...(options.fps===undefined?{}:{fps:options.fps})});
    },
    async preview() {
      const result=await invoke('camera.preview',{});
      if (!result || typeof result.image !== 'string' || !result.image.startsWith('data:image/jpeg;base64,')) throw new Error('invalid camera frame');
      return result;
    },
    async capture(options = {}) {
      const result = await invoke('camera.capture', options);
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
  function photoBucket(bucket) {
    if (bucket===undefined) return {};
    if (!['photos','originals','edited'].includes(bucket)) throw new TypeError('invalid photo bucket');
    return {bucket};
  }
  function albumURL(url) {
    if(typeof url!=='string'||!url.startsWith('/api/gallery/')||url.length>2048) throw new TypeError('invalid gallery reference');
    return url;
  }
  const album = Object.freeze({
    async list() {
      const result=await invoke('photos.album.list',{});
      return Array.isArray(result?.albums)?result.albums:[];
    },
    async page(url) {return invoke('photos.album.page',{url:albumURL(url)});},
    async get(url) {
      const result=await invoke('photos.album.get',{url:albumURL(url)});
      if (!(result?.blob instanceof global.Blob)) throw new Error('invalid photo response');
      return result.blob;
    },
    async import(url) {return invoke('photos.album.import',{url:albumURL(url)});}
  });
  const photos = Object.freeze({
    album,
    async save(input) {
      const blob = input instanceof global.Blob ? input : input?.blob;
      if (!(blob instanceof global.Blob) || !['image/png', 'image/jpeg'].includes(blob.type) ||
          blob.size < 1 || blob.size > 8 * 1024 * 1024)
        throw new TypeError('save requires a PNG or JPEG Blob up to 8 MiB');
      return invoke('photos.save', {blob,...photoBucket(input?.bucket)});
    },
    async list(bucket) {
      const result = await invoke('photos.list', photoBucket(bucket));
      return Array.isArray(result?.photos) ? result.photos : [];
    },
    async get(id,bucket) {
      checkPhotoID(id);
      const result = await invoke('photos.get', {id,...photoBucket(bucket)});
      if (!(result?.blob instanceof global.Blob)) throw new Error('invalid photo response');
      return result.blob;
    },
    async delete(id,bucket) {
      checkPhotoID(id);
      return invoke('photos.delete', {id,...photoBucket(bucket)});
    }
  });

  // Owner-managed SMB content, scoped to CommunityApps/<app-id>. The host
  // accepts only the manifest-approved "shared-assets" permission. No
  // filesystem paths, unrestricted disk access or write methods are exposed.
  function sharedPath(input, allowRoot = false) {
    if (typeof input !== 'string' || input.length > 240 ||
        (!input && !allowRoot) || input.startsWith('/') || input.includes('\\') ||
        input.includes(':') || /[\x00-\x1f\x7f]/.test(input) ||
        (input && (input.split('/').length > 9 ||
          input.split('/').some(part => !part || part.startsWith('.'))))) {
      throw new TypeError('invalid shared content path');
    }
    return input;
  }
  const shared = Object.freeze({
    async list(folder = '') {
      const result = await invoke('shared.list', {path: sharedPath(folder, true)});
      if (!result || !Array.isArray(result.entries) || typeof result.revision !== 'string')
        throw new Error('invalid shared directory response');
      return result; // {entries:[{name,path,isDir,size,modified}],revision,truncated}
    },
    async read(filename) {
      const result = await invoke('shared.read', {path: sharedPath(filename)});
      if (!(result?.blob instanceof global.Blob)) throw new Error('invalid shared file response');
      return result.blob;
    },
    watch(folder, onChange, options = {}) {
      sharedPath(folder, true);
      if (typeof onChange !== 'function') throw new TypeError('watch callback required');
      const intervalMs = options.intervalMs ?? 30000;
      if (!Number.isFinite(intervalMs) || intervalMs < 15000 || intervalMs > 300000)
        throw new TypeError('polling interval must be 15–300 seconds');
      let active = true, running = false, lastRevision = null;
      async function poll() {
        if (!active || running || global.document?.hidden) return;
        running = true;
        try {
          const result = await shared.list(folder);
          if (lastRevision !== result.revision) {
            lastRevision = result.revision;
            if (active) onChange(result);
          }
        } catch (error) {
          // Permission revocation/unavailable SMB share is not silently retried
          // faster; application code can present the error to its users.
          if (active) global.console.warn('[MuPiBoxSDK] shared.watch:', error);
        } finally { running = false; }
      }
      void poll();
      const timer = global.setInterval(poll, intervalMs);
      return () => {active = false; global.clearInterval(timer);};
    }
  });

  // Browser and Home Assistant capabilities are always mediated by the
  // trusted host. Child apps never receive credentials or unrestricted URLs.
  const links = Object.freeze({
    async list(){return invoke('links.list', {});},
    async open(url){
      if(typeof url !== 'string' || url.length>1024) throw new TypeError('invalid favorite URL');
      return invoke('links.open', {url});
    }
  });
  const homeassistant = Object.freeze({
    async list(){return invoke('homeassistant.list',{});},
    async command(entityId,action){
      if(typeof entityId!=='string' || !/^(light|switch|scene)\.[a-z0-9_]{1,90}$/.test(entityId) ||
         !['turn_on','turn_off'].includes(action))throw new TypeError('invalid entity/action');
      return invoke('homeassistant.command',{entity_id:entityId,action});
    }
  });

  // API parity is a reviewed capability list, not a generic HTTP gateway.
  // The trusted host identifies the installed app and enforces permission,
  // parental control and local touch-session checks on every call.
  const device = Object.freeze({
    async info() { return invoke('device.info', {}); },
    async system() { return invoke('device.system', {}); },
    async display() { return invoke('device.display', {}); },
    async audio() { return invoke('device.audio', {}); }
  });

  const playback = Object.freeze({
    async status() { return invoke('playback.status', {}); },
    async queue() { return invoke('playback.queue', {}); },
    async transport(action) {
      if (!['play_pause', 'next', 'previous', 'volume_up', 'volume_down'].includes(action))
        throw new TypeError('unsupported playback transport action');
      return invoke('playback.transport', {action});
    }
  });

  // Host-side CDDA playback. App code never receives raw device handles.
  // Online metadata is requested only on an explicit user click.
  function checkOpticalDevice(device) {
    if (typeof device !== 'string' || !/^sr(?:0|[1-9][0-9]?)$/.test(device))
      throw new TypeError('invalid USB CD device ID');
  }
  function checkOpticalDisc(discId) {
    if (typeof discId !== 'string' || !/^[A-Za-z0-9._-]{28}$/.test(discId))
      throw new TypeError('invalid audio CD identifier');
  }
  const optical = Object.freeze({
    async list() {
      const result = await invoke('optical.list', {});
      return Array.isArray(result?.devices) ? result.devices : [];
    },
    async disc(device) { checkOpticalDevice(device); return invoke('optical.disc', {device}); },
    async play(device, track = 0, discId) {
      checkOpticalDevice(device); checkOpticalDisc(discId);
      if (!Number.isSafeInteger(track) || track < 0 || track > 99)
        throw new TypeError('CD track must be 0..99');
      return invoke('optical.play', {device, track, discId});
    },
    async status() { return invoke('optical.status', {}); },
    async transport(action, device, discId) {
      if (!['toggle', 'next', 'previous', 'stop'].includes(action))
        throw new TypeError('invalid CD transport action');
      checkOpticalDevice(device); checkOpticalDisc(discId);
      return invoke('optical.transport', {action, device, discId});
    },
    async seek(device, discId, position) {
      checkOpticalDevice(device); checkOpticalDisc(discId);
      if (typeof position !== 'number' || !Number.isFinite(position) || position < 0 || position > 25200)
        throw new TypeError('CD position out of range');
      return invoke('optical.seek', {device, discId, position});
    },
    async metadata(device, discId) {
      checkOpticalDevice(device); checkOpticalDisc(discId);
      return invoke('optical.metadata', {device, discId});
    },
    async drive(device, action) {
      checkOpticalDevice(device);
      if (!['eject', 'close', 'spindown'].includes(action))
        throw new TypeError('invalid CD drive action');
      return invoke('optical.drive', {device, action});
    }
  });

  const sdk = Object.freeze({
    apiVersion: '1',
    sdkRevision: '1.1',
    isHosted: Boolean(bridge),
    on,
    storage,
    config,
    audio,
    tts,
    camera,
    photos,
    shared,
    links,
    homeassistant,
    device,
    playback,
    optical,
    coloring: Object.freeze({
      async list() {
        if (!bridge) return [];
        const result = await invoke('coloring.list', {});
        return Array.isArray(result?.pages) ? result.pages.slice(0,128) : [];
      },
      async get(id) {
        if (typeof id !== 'string' || !id || id.length > 180 || /[\\/]/.test(id) || id.startsWith('.')) throw new TypeError('invalid page ID');
        const result = await invoke('coloring.get', {id});
        if (typeof result?.image !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(result.image) || result.image.length > 5000000) throw new Error('invalid coloring page');
        return result.image;
      }
    }),
    covers: Object.freeze({async sample() {
      if (!bridge) return [];
      const result = await invoke('covers.sample', {});
      return Array.isArray(result?.images) ? result.images.filter(x => typeof x === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x) && x.length <= 150000).slice(0, 8) : [];
    }}),
    async capabilities() {
      if (bridge) return invoke('host.capabilities', {});
      return {apiVersion: '1', sdkRevision: '1.1', methods: [], preview: true};
    },
    async supports(method) {
      if (typeof method !== 'string' || !/^[a-z][a-z.]+$/.test(method))
        throw new TypeError('invalid SDK method');
      let capabilities;
      try {capabilities = await sdk.capabilities();}
      catch (error) {
        if (/unsupported plugin bridge method|HTTP 400/i.test(String(error?.message || error))) return false;
        throw error;
      }
      return Array.isArray(capabilities.methods) && capabilities.methods.some(
        capability => capability.method === method && capability.available === true);
    },
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
      if (['input', 'controller.connection', 'lifecycle.pause', 'lifecycle.resume', 'camera.stopped'].includes(message.event)) {
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
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

  const sdk = Object.freeze({
    apiVersion: '1',
    isHosted: Boolean(bridge),
    on,
    storage,
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
      if (['input', 'lifecycle.pause', 'lifecycle.resume'].includes(message.event)) {
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

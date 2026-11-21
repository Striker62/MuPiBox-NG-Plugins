/* Bundled sounds go through the appliance mixer or a standalone preview player. */
(function (root) {
  'use strict';
  root.createRunAudio = function (sdk, files) {
    const players = new Map();
    const warned = new Set();
    const levels = {music:34, run:26, jump:62, slide:62, collect:90, kilometer:52};
    // Separate user settings scale the established per-sound mix without bypassing
    // the host's device/parental volume ceiling.
    const userLevels = {music:100, effects:100};
    function clamp(value) {
      return Number.isFinite(value) ? Math.max(0,Math.min(100,Math.round(value))) : 100;
    }
    function volumeFor(name) {
      return Math.round(levels[name] * userLevels[name==='music'?'music':'effects'] / 100);
    }
    let running = false, generation = 0, nextNativePlay = 0;
    let nativeQueue = Promise.resolve();
    const decoding = new Set();
    const pendingEffects = new Set();

    function report(name, error) {
      if (!warned.has(name)) console.warn('[MuPi Run] Audio '+name, String(error));
      warned.add(name);
    }
    function queue(name, command) {
      nativeQueue = nativeQueue.then(command).catch(error => report(name,error));
      return nativeQueue;
    }
    function play(name) {
      const file = files[name];
      if (!running || !file) return;
      const music = name === 'music';
      const volume = volumeFor(name);
      if (sdk.isHosted) {
        // A slow native decoder can otherwise accumulate old collection sounds.
        if (!music && pendingEffects.has(name)) return;
        if (!music) pendingEffects.add(name);
        const ticket = generation;
        let playback;
        const started = queue(name, async () => {
          if (ticket !== generation) return;
          // A long music decode can overlap an effect. Bound CPU load on the Pi.
          if (decoding.size >= 2) await Promise.race(decoding);
          if (ticket !== generation) return;
          // The native mixer rate-limits music and samples together at 75 ms.
          const delay = nextNativePlay - performance.now();
          if (delay > 0) await new Promise(resolve => setTimeout(resolve,delay));
          if (ticket !== generation) return;
          const method = music ? 'playMusic' : 'playSample';
          nextNativePlay = performance.now()+90;
          playback = sdk.audio[method](file,volume,{relative:true}).catch(error => report(name,error));
          decoding.add(playback);
          playback.then(() => decoding.delete(playback));
        });
        return started.then(() => playback).finally(() => {
          if (!music && ticket === generation) pendingEffects.delete(name);
        });
      }
      let player = players.get(name);
      if (!player) {
        player = new Audio(file);
        player.loop = music;
        players.set(name, player);
      }
      player.volume = volume / 100;
      if (!music) player.currentTime = 0;
      return player.play().catch(error => report(name,error));
    }
    function active(value) {
      if (value === running) return;
      running = value;
      generation++;
      pendingEffects.clear();
      if (value) return play('music');
      if (sdk.isHosted && Object.keys(files).length) {
        return queue('stop', async () => {
          const pending = [...decoding];
          const stop = () => Promise.all([sdk.audio.stopMusic(),sdk.audio.stopSamples()]);
          await stop();
          if (pending.length) {
            await Promise.all(pending);
            await stop(); // A response to an older play may have arrived after the stop.
          }
        });
      }
      for (const player of players.values()) player.pause();
    }
    async function prepare(context) {
      if (sdk.isHosted && !context?.audioSamplePreload) return;
      for (const [name,file] of Object.entries(files)) {
        if (name==='music') continue;
        if (sdk.isHosted) {
          await queue(name,async()=>{
            if (!running) return;
            const delay=nextNativePlay-performance.now();
            if(delay>0) await new Promise(resolve=>setTimeout(resolve,delay));
            if (!running) return;
            nextNativePlay=performance.now()+90;
            await sdk.audio.prepareSample(file);
          });
        } else if (!players.has(name)) {
          const player=new Audio(file);
          player.preload='auto';
          player.volume=volumeFor(name)/100;
          players.set(name,player);
          player.load();
        }
      }
    }
    function setLevels(next) {
      const oldMusic=userLevels.music;
      userLevels.music=clamp(next.music);
      userLevels.effects=clamp(next.effects);
      for (const [name,player] of players) player.volume=volumeFor(name)/100;
      if (!sdk.isHosted || !running || !files.music || oldMusic===userLevels.music) return Promise.resolve();
      const ticket=generation;
      // Prefer in-place mixer gain changes; old hosts can still apply the
      // setting by restarting only the music loop, never the short effects.
      return queue('music volume',async()=>{
        if (!running || ticket!==generation) return;
        const volume=volumeFor('music');
        if (typeof sdk.audio.setMusicVolume==='function') {
          try {
            await sdk.audio.setMusicVolume(volume,{relative:true});
            return;
          } catch (error) { report('music volume fallback',error); }
        }
        if (!running || ticket!==generation) return;
        await sdk.audio.stopMusic();
        if (running && ticket===generation) await sdk.audio.playMusic(files.music,volume,{relative:true});
      });
    }
    function unlock() {
      const music=players.get('music');
      if(running && music && music.paused) music.play().catch(error=>report('music',error));
    }
    return {active, play, prepare, unlock, setLevels};
  };
})(window);

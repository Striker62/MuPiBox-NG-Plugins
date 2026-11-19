/* Bundled sounds go through the appliance mixer or a standalone preview player. */
(function (root) {
  'use strict';
  root.createRunAudio = function (sdk, files) {
    const players = new Map();
    const warned = new Set();
    const levels = {music:34, run:26, jump:62, slide:62, collect:90, kilometer:52};
    let running = false, generation = 0, nextNativePlay = 0;
    let nativeQueue = Promise.resolve();
    const decoding = new Set();

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
      const volume = levels[name];
      if (sdk.isHosted) {
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
        return started.then(() => playback);
      }
      let player = players.get(name);
      if (!player) {
        player = new Audio(file);
        player.loop = music;
        player.volume = volume / 100;
        players.set(name, player);
      }
      player.currentTime = 0;
      return player.play().catch(error => report(name,error));
    }
    function active(value) {
      if (value === running) return;
      running = value;
      generation++;
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
    return {active, play};
  };
})(window);

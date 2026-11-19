/* Local assets are discovered by the packager. Empty slots make no requests. */
(function (root) {
  'use strict';
  root.createRunAudio = function (sdk, files) {
    const players = new Map();
    // The collection transient is quieter than the voice and slide recordings.
    const levels = {music:16, run:26, jump:62, slide:62, collect:90, kilometer:52};
    let running = false;
    function play(name) {
      const file = files[name];
      if (!running || !file) return;
      const music = name === 'music';
      const volume = levels[name];
      if (sdk.isHosted) {
        const method = music ? 'playMusic' : 'playSample';
        if (sdk.audio && sdk.audio[method]) sdk.audio[method](file, volume, {relative:true}).catch(() => {});
      } else {
        let player = players.get(name);
        if (!player) {
          player = new Audio(file);
          player.loop = music;
          player.volume = volume / 100;
          players.set(name, player);
        }
        player.currentTime = 0;
        player.play().catch(() => {});
      }
    }
    function active(value) {
      if (value === running) return;
      running = value;
      if (value) { play('music'); return; }
      if (sdk.isHosted && sdk.audio && Object.keys(files).length) {
        if (sdk.audio.stopMusic) sdk.audio.stopMusic().catch(() => {});
        if (sdk.audio.stopSamples) sdk.audio.stopSamples().catch(() => {});
      }
      for (const player of players.values()) player.pause();
    }
    return {active, play};
  };
})(window);

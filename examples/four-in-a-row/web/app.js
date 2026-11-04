/* MuPi 4er-Reihe: touch/controller frontend, host locale, three AI strengths. MIT. */
(function () {
  'use strict';
  const sdk = window.MuPiBoxSDK, game = window.MuPiFourGame;
  const status = document.getElementById('status'), modePicker = document.getElementById('mode');
  const board = document.getElementById('board');
  const reset = document.getElementById('reset');
  const exit = document.getElementById('exit');
  let mode = 'normal', selected = 3, paused = false, timer = null, token = 0, i18n;
  let state = game.fresh();
  const buttons = [];
  const t = (key, args) => i18n ? i18n.t(key, args) : key;
  const botTurn = () => mode !== 'two' && !state.finished && state.next === 'O';

  function draw() {
    const busy = botTurn();
    buttons.forEach(({button, row, col}) => {
      const piece = state.cells[row * game.COLS + col];
      button.dataset.piece = piece;
      button.dataset.selected = String(selected === col);
      button.dataset.win = String(state.winning.includes(row * game.COLS + col));
      button.disabled = state.finished || busy || paused || state.cells[col] !== '';
      button.setAttribute('aria-label', t('column', {number:col + 1}) + ', ' +
        t('cell', {number:row + 1}) + ': ' + (piece || t('free')));
    });
    if (paused) status.textContent = t('paused');
    else if (state.winner) status.textContent =
      mode === 'two' ? t('playerWin', {name:state.winner}) :
      state.winner === 'X' ? t('youWin') : t('botWin');
    else if (state.finished) status.textContent = t('draw');
    else if (busy) status.textContent = t('botTurn');
    else if (mode === 'two') status.textContent = t('playerTurn', {name:state.next});
    else status.textContent = t('youTurn');
  }

  function cancelBot() {
    token++;
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  }
  function scheduleBot() {
    if (!botTurn() || paused || timer !== null) return;
    const active = token;
    timer = window.setTimeout(() => {
      timer = null;
      if (active !== token || paused || !botTurn()) return;
      const col = game.choose(state, mode);
      if (col < 0) return;
      const next = game.drop(state, col);
      if (next) { state = next; draw(); }
    }, 260);
  }
  function play(col) {
    if (paused || botTurn() || state.finished) return;
    const next = game.drop(state, col);
    if (!next) return;
    selected = col;
    state = next;
    draw();
    scheduleBot();
  }
  function restart() {
    cancelBot();
    state = game.fresh();
    draw();
  }
  function changeMode(value) {
    if (!['two','easy','normal','hard'].includes(value)) return;
    mode = value;
    modePicker.value = value;
    void sdk.storage.set('mode', value).catch(() => {});
    restart();
  }
  function exitApp() {
    void sdk.exit().then(handled => {
      if (!handled && !sdk.isHosted) status.textContent = t('previewExit');
    }).catch(() => {});
  }

  for (let row = 0; row < game.ROWS; row++) {
    for (let col = 0; col < game.COLS; col++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot';
      button.addEventListener('click', () => play(col));
      board.appendChild(button);
      buttons.push({button,row,col});
    }
  }
  reset.addEventListener('click', restart);
  exit.addEventListener('click', exitApp);
  modePicker.addEventListener('change', () => changeMode(modePicker.value));

  sdk.on('input', ({button, action}) => {
    if (action !== 'press') return;
    if (button === 'BACK' || button === 'B') { exitApp(); return; }
    if (button === 'X') {
      const modes = ['two','easy','normal','hard'];
      changeMode(modes[(modes.indexOf(mode)+1) % modes.length]);
      return;
    }
    if (button === 'LEFT') selected = (selected + game.COLS - 1) % game.COLS;
    if (button === 'RIGHT') selected = (selected + 1) % game.COLS;
    if (button === 'A') play(selected);
    draw();
  });
  sdk.on('lifecycle.pause', () => {
    paused = true; cancelBot();
    document.body.classList.add('paused');
    draw();
  });
  sdk.on('lifecycle.resume', () => {
    paused = false;
    document.body.classList.remove('paused');
    draw(); scheduleBot();
  });

  (async () => {
    i18n = await window.MuPiGamesI18n.create(sdk);
    document.title = i18n.t('fourTitle') + ' – MuPiBox-NG';
    try {
      const stored = await sdk.storage.get('mode');
      if (['two','easy','normal','hard'].includes(stored)) mode = stored;
    } catch (_) { /* Browser preview without storage remains usable. */ }
    modePicker.value = mode;
    draw();
  })().catch(error => {
    console.error('[MuPi 4er-Reihe] startup failed', error);
    status.textContent = t('error');
  });
})();

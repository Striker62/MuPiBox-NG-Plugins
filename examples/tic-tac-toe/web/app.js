/* MuPi Kreuz & Kreis UI: Go/WASM rules, original JS AI, offline i18n. MIT. */
(function () {
  'use strict';
  const sdk = window.MuPiBoxSDK;
  const cells = [...document.querySelectorAll('[data-cell]')];
  const status = document.getElementById('status');
  const reset = document.getElementById('reset');
  const exit = document.getElementById('exit');
  const modePicker = document.getElementById('mode');
  let selected = 0, current = null, mode = 'normal', i18n = null;
  let paused = false, botTimer = null, roundToken = 0;
  const order = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]
  ];
  const t = (key, variables) => i18n ? i18n.t(key, variables) : key;
  const isBotTurn = () => mode !== 'two' && current && !current.finished && current.next === 'O';

  function winner(board) {
    for (const [a,b,c] of lines) {
      if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
    }
    return '';
  }

  function minimax(board, turn, depth) {
    const win = winner(board);
    if (win === 'O') return 10 - depth;
    if (win === 'X') return depth - 10;
    if (board.every(Boolean)) return 0;
    const maximizing = turn === 'O';
    let best = maximizing ? -Infinity : Infinity;
    for (const index of order) {
      if (board[index]) continue;
      board[index] = turn;
      const score = minimax(board, maximizing ? 'X' : 'O', depth + 1);
      board[index] = '';
      best = maximizing ? Math.max(best, score) : Math.min(best, score);
    }
    return best;
  }

  function pickBotMove(board, level) {
    const legal = order.filter(index => !board[index]);
    if (!legal.length) return -1;
    if (level === 'easy') return legal[Math.floor(Math.random() * legal.length)];
    if (level === 'normal' && Math.random() < .35)
      return legal[Math.floor(Math.random() * legal.length)];
    const copy = board.slice();
    let best = -Infinity, choices = [];
    for (const index of legal) {
      copy[index] = 'O';
      const score = minimax(copy, 'X', 1);
      copy[index] = '';
      if (score > best) { best = score; choices = [index]; }
      else if (score === best) choices.push(index);
    }
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function render(state) {
    if (!state || !Array.isArray(state.cells)) return;
    current = state;
    const botTurn = isBotTurn();
    cells.forEach((cell, index) => {
      const value = state.cells[index];
      cell.textContent = value;
      cell.dataset.mark = value;
      cell.disabled = Boolean(value) || state.finished || botTurn || paused;
      cell.classList.toggle('selected', selected === index);
      cell.setAttribute('aria-label', t('cell', { number: index + 1 }) + ': ' +
        (value || t('free')));
    });
    if (paused) status.textContent = t('paused');
    else if (state.winner) status.textContent =
      mode === 'two' ? t('playerWin', {name: state.winner}) :
      state.winner === 'X' ? t('youWin') : t('botWin');
    else if (state.finished) status.textContent = t('draw');
    else if (botTurn) status.textContent = t('botTurn');
    else if (mode === 'two') status.textContent = t('playerTurn', {name: state.next});
    else status.textContent = t('youTurn');
    reset.disabled = false;
  }

  function cancelBot() {
    roundToken++;
    if (botTimer !== null) window.clearTimeout(botTimer);
    botTimer = null;
  }
  function scheduleBot() {
    if (!isBotTurn() || paused || botTimer !== null) return;
    const token = roundToken;
    botTimer = window.setTimeout(() => {
      botTimer = null;
      if (token !== roundToken || !isBotTurn() || paused) return;
      const index = pickBotMove(current.cells, mode);
      if (index >= 0) render(window.mupiTicTacToePlay(index));
    }, 280);
  }
  function play(index) {
    if (!current || current.finished || isBotTurn() || paused || current.cells[index]) return;
    selected = index;
    try {
      const state = window.mupiTicTacToePlay(index);
      if (state.error) return;
      render(state);
      scheduleBot();
    } catch (error) {
      console.warn('[MuPi Kreuz & Kreis] move failed', error);
      status.textContent = t('error');
    }
  }
  function restart() {
    if (typeof window.mupiTicTacToeReset !== 'function') return;
    cancelBot();
    render(window.mupiTicTacToeReset());
  }
  function changeMode(next) {
    if (!['two','easy','normal','hard'].includes(next)) return;
    mode = next;
    modePicker.value = next;
    void sdk.storage.set('mode', next).catch(() => {});
    restart();
  }
  function exitApp() {
    void sdk.exit().then(handled => {
      if (!handled && !sdk.isHosted) status.textContent = t('previewExit');
    }).catch(() => {});
  }

  cells.forEach(button => button.addEventListener('click', () => play(Number(button.dataset.cell))));
  reset.addEventListener('click', restart);
  exit.addEventListener('click', exitApp);
  modePicker.addEventListener('change', () => changeMode(modePicker.value));

  sdk.on('input', ({button, action}) => {
    if (action !== 'press') return;
    if (button === 'BACK' || button === 'B') { exitApp(); return; }
    if (button === 'X') {
      const modes = ['two','easy','normal','hard'];
      changeMode(modes[(modes.indexOf(mode) + 1) % modes.length]);
      return;
    }
    const row = Math.floor(selected / 3), col = selected % 3;
    if (button === 'LEFT') selected = row * 3 + (col + 2) % 3;
    if (button === 'RIGHT') selected = row * 3 + (col + 1) % 3;
    if (button === 'UP') selected = ((row + 2) % 3) * 3 + col;
    if (button === 'DOWN') selected = ((row + 1) % 3) * 3 + col;
    if (button === 'A') play(selected);
    cells.forEach((el, i) => el.classList.toggle('selected', selected === i));
  });
  sdk.on('lifecycle.pause', () => {
    paused = true; cancelBot();
    document.body.classList.add('paused');
    if (current) render(current);
  });
  sdk.on('lifecycle.resume', () => {
    paused = false;
    document.body.classList.remove('paused');
    if (current) render(current);
    scheduleBot();
  });

  async function loadGame() {
    i18n = await window.MuPiGamesI18n.create(sdk);
    document.title = i18n.t('tttTitle') + ' – MuPiBox-NG';
    try {
      const saved = await sdk.storage.get('mode');
      if (['two','easy','normal','hard'].includes(saved)) mode = saved;
    } catch (_) { /* Storage is optional during preview. */ }
    modePicker.value = mode;
    if (typeof Go !== 'function') throw new Error('Missing Go/WASM runtime');
    const go = new Go();
    const response = await fetch('./game.wasm');
    if (!response.ok) throw new Error('Missing game.wasm');
    const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), go.importObject);
    void go.run(instance).catch(error => {
      console.warn('[MuPi Kreuz & Kreis] WASM failed', error);
      status.textContent = t('error');
    });
    if (typeof window.mupiTicTacToeState !== 'function') throw new Error('WASM not initialized');
    render(window.mupiTicTacToeState());
  }

  void loadGame().catch(error => {
    console.error('[MuPi Kreuz & Kreis] startup failed', error);
    status.textContent = t('error');
  });
})();

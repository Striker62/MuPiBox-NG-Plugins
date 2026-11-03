/* Browser UI for the independent Go/WASM Tic Tac Toe example. */
(function () {
  'use strict';
  const sdk = window.MuPiBoxSDK;
  const cells = [...document.querySelectorAll('[data-cell]')];
  const status = document.getElementById('status');
  const reset = document.getElementById('reset');
  const exit = document.getElementById('exit');
  let selected = 0;
  let current = null;

  function render(state) {
    if (!state || !Array.isArray(state.cells)) return;
    current = state;
    cells.forEach((cell, index) => {
      const value = state.cells[index];
      cell.textContent = value;
      cell.dataset.mark = value;
      cell.disabled = Boolean(value) || state.finished;
      cell.classList.toggle('selected', selected === index);
      cell.setAttribute('aria-label', `Feld ${index + 1}${value ? ': ' + value : ': frei'}`);
    });
    status.textContent = state.winner ? `Spieler ${state.winner} gewinnt!` :
      state.finished ? 'Unentschieden!' : `Spieler ${state.next} ist dran`;
    reset.disabled = false;
  }

  function play(index) {
    if (!current || current.finished || current.cells[index]) return;
    selected = index;
    try { render(window.mupiTicTacToePlay(index)); }
    catch (error) { status.textContent = `Fehler: ${error.message}`; }
  }

  for (const button of cells) {
    button.addEventListener('click', () => play(Number(button.dataset.cell)));
  }
  reset.addEventListener('click', () => render(window.mupiTicTacToeReset()));
  exit.addEventListener('click', async () => {
    const handled = await sdk.exit();
    if (!handled && !sdk.isHosted) status.textContent = 'Browser-Vorschau: Tab schließen zum Beenden';
  });

  sdk.on('input', ({ button, action }) => {
    if (action !== 'press') return;
    const row = Math.floor(selected / 3), col = selected % 3;
    if (button === 'LEFT') selected = row * 3 + (col + 2) % 3;
    if (button === 'RIGHT') selected = row * 3 + (col + 1) % 3;
    if (button === 'UP') selected = ((row + 2) % 3) * 3 + col;
    if (button === 'DOWN') selected = ((row + 1) % 3) * 3 + col;
    if (button === 'A') play(selected);
    if (button === 'BACK') sdk.exit();
    cells.forEach((el, i) => el.classList.toggle('selected', selected === i));
  });
  sdk.on('lifecycle.pause', () => document.body.classList.add('paused'));
  sdk.on('lifecycle.resume', () => document.body.classList.remove('paused'));

  async function loadGame() {
    if (typeof Go !== 'function') throw new Error('Go WASM runtime fehlt');
    const go = new Go();
    const response = await fetch('./game.wasm');
    if (!response.ok) throw new Error('game.wasm konnte nicht geladen werden');
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, go.importObject);
    // Do not await: the Go program intentionally keeps event callbacks alive.
    go.run(instance).catch(error => { status.textContent = 'Spiel abgebrochen: ' + error.message; });
    // Go registers functions synchronously before parking in select {}.
    if (typeof window.mupiTicTacToeState !== 'function') throw new Error('Go-Spiellogik nicht initialisiert');
    render(window.mupiTicTacToeState());
  }
  loadGame().catch(error => { status.textContent = 'Start fehlgeschlagen: ' + error.message; });
})();

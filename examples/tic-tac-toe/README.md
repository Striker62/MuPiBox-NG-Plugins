# Tic Tac Toe – Go / WebAssembly

A self-contained two-player game that illustrates the public MuPiBox-NG plugin package contract.

- `game/`: portable pure-Go rules with unit tests
- `cmd/wasm/`: Go-to-JavaScript bridge using `syscall/js`
- `web/`: touch/controller-friendly HTML/CSS/JS view
- `manifest.json`: static app metadata

Build from the repository root with `python3 tools/build_example.py`. The produced `dist/tic-tac-toe.mupiapp` is a ZIP file and **cannot yet be installed into MuPiBox-NG** without the future host app manager.

For a browser demo, run `python3 -m http.server 8080` from `.build/tic-tac-toe` and open `http://localhost:8080`. Arrow keys select, Enter/Space places a mark, and the buttons support touch/mouse. The SDK simulates controller input in browser-preview mode.

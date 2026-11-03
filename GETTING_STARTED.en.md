# MuPiBox-NG Plugins: build, run and contribute

**MuPiBox-NG supports independent apps via `.mupiapp` packages.** Each package is a ZIP containing a `manifest.json`, an HTML entry page and bundled JavaScript/CSS/images or optional Go/WebAssembly code. You do **not** need access to the private MuPiBox-NG core repository.

## How plugins work

1. The MuPiBox host checks the package, manifest and permissions before installing it.
2. A web runtime launches the app in an isolated browser context; the host decides what it may do.
3. Your app can use the public `MuPiBoxSDK` for input events, app-specific JSON storage, language/context and exit. Do not call internal MuPiBox APIs directly.
4. Apps should work offline. Currently, no third-party network access or native executables are supported. Browser previews do **not** yet replace the native Pi touchscreen UI.
5. Official built-in games remain installed. In particular, **“MuPi und die verlorenen Noten” stays in the NG core**.

## Create your first plugin

Fork or clone [this repository](https://github.com/splitti/MuPiBox-NG-Plugins) and install Python 3.10+ (Go is only needed for the Go/WASM example).

Create `my-app/manifest.json`:

```json
{
  "apiVersion": "1",
  "id": "community.my-first-game",
  "name": "My First Game",
  "version": "0.1.0",
  "runtime": "web",
  "entry": "index.html",
  "permissions": ["storage", "controller"],
  "display": {"orientation": "landscape", "minWidth": 800, "minHeight": 480}
}
```

Add `my-app/index.html` and bundle any scripts/assets it needs. You may copy `sdk/mupibox-sdk.js` into the app and load it from your HTML. See `examples/klang-memory/` for an HTML/JS example, or `examples/tic-tac-toe/` for Go/WebAssembly.

```bash
python3 tools/mupiapp.py pack my-app dist/my-first-game.mupiapp
python3 tools/mupiapp.py validate dist/my-first-game.mupiapp
cd my-app
python3 -m http.server 8080
# Open http://localhost:8080
```

For Go/WASM, run `python3 tools/build_example.py` and inspect the `examples/tic-tac-toe` source. You must bundle the Go `wasm_exec.js` matching your compiler.

On a compatible MuPiBox-NG **developer-preview host**, a parent/admin can open **Admin → Provider & Services → Community Apps / Plugins**, select the `.mupiapp` file, inspect and approve permissions, then install or open a browser preview. Host availability and the native touchscreen runtime depend on the installed NG version.

## Submit a plugin or SDK improvement via Pull Request

1. **Fork** `splitti/MuPiBox-NG-Plugins` on GitHub and clone your fork.
2. Make a **feature branch**: `git checkout -b feature/my-first-game`.
3. Keep your app or example in its own folder (for example `examples/my-first-game/`). Add its `manifest.json`, sources, README, license and any required attribution. For a large standalone app, you may publish it in your own repository and first open an issue proposing a catalog entry instead.
4. Run `python3 -m unittest discover -s tests -v`, package and validate your app; test keyboard, touch, 800×480 layout and controller behavior where applicable.
5. Commit and push to **your fork**, then open a **Pull Request targeting this repo's `main`**. Explain what the app does, requested permissions, screenshots or a short demo, how to build/test it, license/attribution and hardware compatibility.
6. CI and maintainers review the PR. Address feedback; merging is not automatic. Do not submit proprietary core code, private configuration, copied copyrighted art, tokens or credentials.

Read [`ai.md`](ai.md) for coding-assistant guidance, [`CONTRIBUTING.md`](CONTRIBUTING.md), [`docs/manifest-v1.md`](docs/manifest-v1.md) and [`SECURITY.md`](SECURITY.md). Report vulnerabilities privately as described in `SECURITY.md`.

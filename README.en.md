# MuPiBox-NG Plugins

**Independent apps for MuPiBox-NG, without access to the private core repository.**

This public repository provides a **developer-preview v1 app contract**, a web SDK, `.mupiapp` packaging and validation utilities, and a standalone Go/WebAssembly Tic-Tac-Toe example.

> **Developer preview, not yet supported by the host.** The SDK and example work outside MuPiBox-NG, but the MuPiBox-NG app manager, web runtime and secure host bridge are not implemented in the core yet. Packaging an app does not make it installable on an existing box today.

## Quick start

Install Python 3.10+ and Go 1.24+ (Go is only required for the Go example).

```bash
git clone https://github.com/splitti/MuPiBox-NG-Plugins.git
cd MuPiBox-NG-Plugins
python3 tools/build_example.py
python3 tools/mupiapp.py validate dist/tic-tac-toe.mupiapp
cd .build/tic-tac-toe && python3 -m http.server 8080
# Visit http://localhost:8080
```

Static HTML/JS apps do not need Go:

```bash
python3 tools/mupiapp.py pack ./my-app ./dist/my-app.mupiapp
```

Read [`docs/quickstart.md`](docs/quickstart.md), [`docs/manifest-v1.md`](docs/manifest-v1.md), [`docs/architecture.md`](docs/architecture.md), and the SDK [`sdk/mupibox-sdk.js`](sdk/mupibox-sdk.js).

The host app/API has not shipped; the mock browser fallback is for local development only. A manifest permission **does not** enforce sandboxing. No core code or assets are distributed by this repository.

The SDK and repository code are MIT licensed (see [`LICENSE`](LICENSE)). Third-party apps may use independent licenses. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md).

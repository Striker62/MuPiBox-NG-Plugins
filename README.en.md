# MuPiBox-NG Plugins

**Independent apps for MuPiBox-NG, without access to the private core repository.**

This public repository provides a **developer-preview v1 app contract**, a web SDK, `.mupiapp` packaging and validation utilities, a standalone Go/WebAssembly MuPi Kreuz & Kreis (crosses/circles) example, and an independently updateable HTML/JS Klang-Memory preview.

> **Developer preview.** MuPiBox-NG **0.2.0-alpha.18** introduces the Admin app manager and isolated browser preview for `.mupiapp` files. Native Qt touchscreen rendering, complete audio focus, automatic store updates and a signed catalog are not implemented yet. Earlier NG versions cannot install these packages.

## Quick start

Install Python 3.10+ and Go 1.24+ (Go is only required for the Go example).

```bash
git clone https://github.com/splitti/MuPiBox-NG-Plugins.git
cd MuPiBox-NG-Plugins
python3 tools/build_example.py
python3 tools/mupiapp.py validate dist/mupi-kreuz-kreis.mupiapp
cd .build/tic-tac-toe && python3 -m http.server 8080
# Visit http://localhost:8080
```

Static HTML/JS apps do not need Go:

```bash
python3 tools/mupiapp.py pack ./my-app ./dist/my-app.mupiapp
```

Read [`GETTING_STARTED.en.md`](GETTING_STARTED.en.md), [`ai.md`](ai.md), [`docs/quickstart.md`](docs/quickstart.md), [`docs/manifest-v1.md`](docs/manifest-v1.md), [`docs/architecture.md`](docs/architecture.md), and the SDK [`sdk/mupibox-sdk.js`](sdk/mupibox-sdk.js).

The browser fallback is for local development only; the experimental host integration is not a replacement for the existing native Qt touch apps. A manifest permission **does not** enforce sandboxing. No core code or assets are distributed by this repository.

The SDK and repository code are MIT licensed (see [`LICENSE`](LICENSE)). Third-party apps may use independent licenses. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md).

## Official app catalog

Starting with **MuPiBox-NG 0.2.0-alpha.19**, the curated [app catalog](catalog/apps.json) allows compatible MuPiBox-NG hosts to install verified packages directly from this repository’s GitHub Releases. Manual upload stays available for development. To propose a catalog app, read [catalog contribution rules](catalog/README.md) and submit a Pull Request after the reviewed release artifact is published.

## Klang-Memory 0.1.1: native touchscreen notes

With NG **0.2.0-alpha.22** or later, Klang-Memory uses the permission-gated `MuPiBoxSDK.audio.playNote()` call for real appliance audio through PipeWire. The game layout fits below the native MuPiBox status bar without scrolling. The new version appears as an Update in the official catalog; the original QML game remains installed.

## Plugin sound settings and experimental USB webcam support

With NG **0.2.0-alpha.23+**, Klang-Memory v0.1.2 offers its own saved 0–100% sound slider with a test tone, always respecting the parent's device limits. New `camera`-permission plugins may use the opt-in USB webcam API. The `examples/webcam-preview/` app demonstrates local, in-memory still previews with a separate **on-device** user consent dialog and visible Stop control. It does not record or upload video. **Physical webcam capture has not yet been tested on Pi box 85**, where no camera was attached.

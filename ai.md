# AI development guide for MuPiBox-NG plugins

This document is the **source of truth for AI coding assistants** (ChatGPT, Codex, Claude, Copilot, Gemini, etc.) working in this *public* repository. Read this file, `docs/manifest-v1.md`, `docs/architecture.md`, and `SECURITY.md` before generating or editing a plugin.

## Scope and boundaries

MuPiBox-NG is a Raspberry Pi / DietPi appliance with a private application core. This repository is the **public, independent extension SDK**; contributions here must not require access to, copy, recreate, or redistribute private MuPiBox-NG source, trademarks, copyrighted graphics/music, configuration, credentials or release signing keys.

- Plugins are independently authored **offline-capable HTML/CSS/JavaScript** apps, optionally using Go compiled to **browser WebAssembly** (`GOOS=js GOARCH=wasm`).
- Distributable artifacts are **`.mupiapp` ZIP** files. Required root `manifest.json` with `apiVersion: "1"`, `runtime: "web"`, stable reverse-domain-like `id`, semantic `version`, HTML `entry`, and an explicit `permissions` list. Reference: `schema/manifest-v1.schema.json`.
- A plugin never runs as root and does not receive native Go/Python process execution, QML bindings, OS file access, credentials, shell commands, device handles, networking or direct Core/Admin APIs.
- Do not rely on remote CDNs, external trackers or online services. A `network` permission may be described in the draft schema but the **current host v1 rejects network-enabled packages**.
- Touch and an 800×480 landscape display are the primary baseline. Use large hit targets, responsive layouts, mouse/touch interaction, focus indicators, and a controller-only fallback when appropriate. Support keyboard during desktop development.
- The existing built-in **“MuPi und die verlorenen Noten”** remains in the NG core and is **not to be migrated** into a third-party plugin. Other original QML apps stay intact until separately tested replacements can be enabled by the user.

## Code organization

| Path | Intended contents |
| --- | --- |
| `sdk/mupibox-sdk.js` | Public browser facade; only stable documented APIs |
| `schema/manifest-v1.schema.json` | Published manifest contract |
| `tools/mupiapp.py` | Deterministic packager + adversarial validator |
| `examples/tic-tac-toe/` | MuPi Kreuz & Kreis (legacy path and stable app ID): Go/WASM example; **Go compiles to WASM**, not a Linux binary |
| `examples/klang-memory/` | Independent HTML/JS demonstration, not a replacement for the native game |
| `docs/quickstart.md`, `docs/manifest-v1.md`, `docs/architecture.md` | Developer and security documentation |
| `GETTING_STARTED.en.md` | Short English creation and contribution guide |
| `catalog/apps.json` | Curated catalog of reviewed official GitHub Release assets, SHA-256 and permissions |

Apps may also live in **their own repos**. Submit a PR here only for an example, SDK change, compatibility fix, docs, test, or a separately agreed community catalog entry. Do not copy an entire third-party app without the author's permission and license.

## Public SDK v1

Use `window.MuPiBoxSDK` after loading the bundled `mupibox-sdk.js`.

```js
const sdk = window.MuPiBoxSDK;
const context = await sdk.getContext(); // API version and language
const score = await sdk.storage.get("best");
await sdk.storage.set("best", 3);
const unsubscribe = sdk.on("input", ({button, action}) => {
  if (action !== "press") return;
  if (button === "A") select();
  if (button === "BACK" || button === "B") sdk.exit();
});
sdk.on("lifecycle.pause", pauseAnimationAndAudio);
sdk.on("lifecycle.resume", resumeSafely);
```

Available v1 operations: `host.context`, `storage.get`, `storage.set`, `audio.note`, `app.exit`; events `input`, `lifecycle.pause`, `lifecycle.resume`. The browser-only SDK fallback is for **preview** and is not a security boundary. The trusted host controls app identity, capabilities, storage namespace and origin isolation. Never send tokens or credentials to a plugin. The `audio` permission allows `MuPiBoxSDK.audio.playNote(note, volume, instrument)` from NG alpha.22 (restricted C4..C5 and bounded by the box volume/parental settings). This uses the appliance PipeWire mixer, not WebAudio; full streaming audio focus is **not** available yet.

## Implementation and safety rules for AI assistants

1. Ask for the required behavior only when essential; otherwise build a small, working example **within this repo**.
2. No dependency on a private MuPiBox-NG checkout or hardware for basic development. Do not attempt to use credentials or access local device administration.
3. Keep plugin files local. Include `index.html`, bundled JS/CSS/WASM and assets. No eval, remote script loading, telemetry, inline secrets, arbitrary HTML injection, or undocumented bridge messages.
4. Request **minimum permissions**. `storage` only when needed for persistent app state; `controller` for host-forwarded gamepad input. Never pretend that manifest permissions themselves grant authorization.
5. Accept both controller and pointer input where applicable; do not require a controller for tasks like coloring. Avoid auto-playing audio before user interaction. On pause, silence media and suspend timers.
6. Storage keys should be short ASCII names, and values JSON-compatible; keep within the host quota (128 keys, 1 MiB total, 64 KiB per value).
7. Manifest IDs are permanent and unique; version updates must not silently reset saved game data.
8. Any package/validator changes must strengthen or preserve ZIP traversal, symlink, duplicate-name, size, ZIP bomb and permission restrictions. Never remove a check merely to make an app install.
9. No copyrighted MuPiBox core assets or third-party music, fonts or artwork without explicit redistribution permission. Declare third-party notices/licences where applicable.
10. Changes to the SDK or format must include tests, docs and backward-compatibility analysis. Avoid changing v1 behavior without an explicit versioning plan.
11. Never claim that a browser preview proves device UI, audio focus, touch rotation, child controls, signed catalog or complete sandbox security. Report precisely what was tested.
12. Keep PRs small, reviewable and scoped; do not push compiled binaries into source history unless explicitly needed and license-compliant.

## USB camera and volume APIs (NG alpha.23+, Developer Preview)

- A webcam requires the new `camera` manifest permission, explicit approval on installation **and** a separate per-session click on the trusted host's **Kamera erlauben** button. Only the local touchscreen can activate a webcam; the remote Admin preview cannot. Capture is 320×240 still-JPEG previews at around one frame per second, **not** unrestricted streaming. No microphone or external network APIs exist.
- Use `await sdk.camera.list()` to find enumerated USB/V4L2 devices; `await sdk.camera.start(device.id)` requests a visible on-screen consent overlay. After approval `await sdk.camera.capture()` returns `{image: "data:image/jpeg;base64,...", width: 320, height: 240}`. On exit, pause, error or a Stop button, call `await sdk.camera.stop()`. Subscribe to `sdk.on('camera.stopped',...)` and stop any capture timers.
- All camera calls are local-only, app-specific and rate/size/permission limited. Never guess device names, send a `/dev/videoN` filesystem path, persist a camera capture without an explicit user request, or automatically upload any image to a server. The host never saves webcam frames.
- `sdk.audio.playNote('C4', 70, 'musicbox', {relative:true})` scales 0–100% relative to the parent's **configured startup and maximum volume**. Legacy 3-argument calls remain unchanged. Store any in-app volume preference in the app's own `storage` namespace and offer an obvious Mute/0% option.
- On Box 85 **no physical webcam was connected for testing**: sample-camera FFmpeg capture on USB hardware is not yet validated. Never report end-to-end webcam operation as confirmed until tested with a UVC device.

## Build and test checklist

```bash
python3 -m unittest discover -s tests -v
(cd examples/tic-tac-toe && go test ./game)
python3 tools/build_example.py
python3 tools/build_klang_memory.py
python3 tools/mupiapp.py validate dist/mupi-kreuz-kreis.mupiapp
python3 tools/mupiapp.py validate dist/klang-memory.mupiapp
node --check sdk/mupibox-sdk.js
node --check examples/klang-memory/app.js
python3 tools/build_webcam_example.py
python3 tools/mupiapp.py validate dist/webcam-preview.mupiapp
node --test tests/test_sdk_camera_volume.js
```

For your own web app:

```bash
python3 tools/mupiapp.py pack ./my-app ./dist/my-app.mupiapp
python3 tools/mupiapp.py validate ./dist/my-app.mupiapp
cd my-app && python3 -m http.server 8080
```

For Go/WASM, build with `GOOS=js GOARCH=wasm CGO_ENABLED=0 go build -o game.wasm ./cmd/wasm` and ship the **matching** Go `wasm_exec.js` plus its license notice.

## Game-name and copyright risk documentation

For MuPi Kreuz & Kreis, MuPi 4er-Reihe and MuPi Krümelwurm, refer to
[\`docs/release-checklist.md\`](docs/release-checklist.md) and the
[preliminary review](docs/trademark-preflight-2026-11-04.md).
The owner accepted the **remaining unverified trademark risk** and chose
not to pay for external legal advice. Never claim that DPMA/EUIPO/WIPO
full register searches were completed when they were not.
An official catalog entry still requires actual verified Release bytes.
The legacy Tic-Tac-Toe app ID stays stable through the rename.

## Curated catalog rules

- The official in-app catalog is maintained under `catalog/apps.json` in this repository. A catalog entry is **not** code signing; the installer also restricts downloads to this repository’s GitHub Releases, verifies the declared SHA-256, parses the package and compares app ID, version, name and requested permissions.
- Do not add arbitrary URLs, CDNs, alternative repositories, user-entered hosts, GitHub pull-request build artifacts or private IPs to a catalog entry. Remote changes must be reviewed; never bypass the download allowlist.
- A third-party developer may keep sources in their own repository, but a maintainer must verify the license/source and publish a vetted `.mupiapp` into the **official MuPiBox-NG-Plugins release** before an official catalog PR adds it. Installing a PR or a fork is not supported by the catalog.
- For each new version update `releaseTag`, `asset`, `version`, `sha256` and permission list only after the trusted Release asset exists. Pin the checksum of the bytes downloaded from GitHub, not merely a local recompiled build. Never change the app ID to issue an update.
- The app manager checks for updates on request and installs only after explicit user approval. Manual file upload remains for development and testing.

## Pull request guidance

Read `GETTING_STARTED.en.md` and `CONTRIBUTING.md`; fork the public repository, create a feature branch and propose a focused PR against `main`. State purpose, demo steps, requested permissions, device/browser compatibility, licensing and test results. For security issues, use `SECURITY.md`, **not** a public issue or PR.

**Important:** This file guides repository contributions. It is not an instruction to publish private core code or to bypass the host application's permission model.

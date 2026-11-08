# MuPiBox-NG Plugins: build, run and contribute

**MuPiBox-NG supports independent apps via `.mupiapp` packages.** Each package is a ZIP containing a `manifest.json`, an HTML entry page and bundled JavaScript/CSS/images or optional Go/WebAssembly code. You do **not** need access to the private MuPiBox-NG core repository.

## How plugins work

1. The MuPiBox host checks the package, manifest and permissions before installing it.
2. A web runtime launches the app in an isolated browser context; the host decides what it may do.
3. Your app can use the public `MuPiBoxSDK` for input events, app-specific JSON storage, language/context and exit. Do not call internal MuPiBox APIs directly.
4. Apps should work offline. Currently, no third-party network access or native executables are supported. Browser previews are distinct from the native Qt touchscreen runner available in NG alpha.20+; appearance integration requires alpha.30+.
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

On **MuPiBox-NG 0.2.0-alpha.18 or newer** (developer-preview host), a parent/admin can open **Admin → Provider & Services → Community Apps / Plugins**, select the `.mupiapp` file, inspect and approve permissions, then install or open a browser preview. For **0.2.0-alpha.19 and newer**, the official catalog offers direct verified GitHub installation without downloading files yourself. In alpha.18 only manual upload is available. The native touchscreen runtime remains a separate feature.

## Integrate with the native MuPiBox interface (NG alpha.30+)

You can suggest where your app appears and which MuPiBox controls are visible. Add these **optional** fields to your app's `manifest.json` (the regular required fields still apply):

```json
{
  "category": "creative",
  "display": {
    "orientation": "landscape",
    "showBackButton": false,
    "showSystemInfo": false,
    "fullScreen": true,
    "background": "app"
  }
}
```

The fragment above is *not* a complete manifest. Supported categories: `games`, `creative`, `learning`, `tools`, `other`. `showBackButton` controls the **entire native Back + title group**, not just the arrow; a separate `showTitle` option does not currently exist. `showSystemInfo` controls the right status indicators; fullscreen draws the HTML app edge-to-edge. An opaque HTML/CSS background covers the native theme even if `background` is `system`.

**If you disable the native Back button, implement your own exit action:**

```javascript
document.querySelector('#back-button').addEventListener('click', () => {
  window.MuPiBoxSDK.exit();
});
```

Give this control a large touch target, visible label, and accessible name. `exit()` calls the existing trusted `app.exit` bridge; it does not access OS navigation and does not require a new permission. In local browser preview, it emits `preview.exit` instead of closing the tab. Provide a safe fallback for app navigation that does not rely solely on a controller. The host always retains control over the running app.

Users may override the preferences independently for each installed app in **Admin → Provider & Dienste → Community-Apps / Plugins → Installierte Apps → Darstellung & Integration**. Host overrides survive app updates. See [the full manifest contract](docs/manifest-v1.md#native-app-appearance-and-navigation-ng-020-alpha30) and the [JSON schema](schema/manifest-v1.schema.json).

## Submit a plugin or SDK improvement via Pull Request

1. **Fork** `splitti/MuPiBox-NG-Plugins` on GitHub and clone your fork.
2. Make a **feature branch**: `git checkout -b feature/my-first-game`.
3. Keep your app or example in its own folder (for example `examples/my-first-game/`). Add its `manifest.json`, sources, README, license and any required attribution. For a large standalone app, you may publish it in your own repository and first open an issue proposing a catalog entry instead.
4. Run `python3 -m unittest discover -s tests -v`, package and validate your app; test keyboard, touch, 800×480 layout and controller behavior where applicable.
5. Commit and push to **your fork**, then open a **Pull Request targeting this repo's `main`**. Explain what the app does, requested permissions, screenshots or a short demo, how to build/test it, license/attribution and hardware compatibility.
6. CI and maintainers review the PR. Address feedback; merging is not automatic. Do not submit proprietary core code, private configuration, copied copyrighted art, tokens or credentials.

### Request inclusion in the built-in catalog

The public SDK does not automatically install every pull request. Before your app can appear in **Admin → Community Apps → App Catalog**:

1. Open an issue describing its purpose and source repository, including license and screenshots.
2. Propose a reviewed PR with the app's source code and a reproducible `.mupiapp` build (or link to a public app repository). A maintainer reviews source, security, permissions, offline compatibility, copyright and accessibility.
3. A maintainer releases the vetted package in the **official** [MuPiBox-NG-Plugins GitHub Releases](https://github.com/splitti/MuPiBox-NG-Plugins/releases). Arbitrary third-party releases are not downloaded by the official catalog.
4. Submit or update an entry in [`catalog/apps.json`](catalog/apps.json) with the exact official Release tag, asset filename and its lowercase SHA-256 (`sha256sum my-app.mupiapp` on the released bytes), along with metadata, version and requested permissions.
5. After review/merge, compatible MuPiBox installations show the app on the next catalog refresh. Users individually approve installation and later updates; nothing installs automatically.

Read [`catalog/README.md`](catalog/README.md) for all catalog field rules and security restrictions.

Read [`ai.md`](ai.md) for coding-assistant guidance, [`CONTRIBUTING.md`](CONTRIBUTING.md), [`docs/manifest-v1.md`](docs/manifest-v1.md) and [`SECURITY.md`](SECURITY.md). Report vulnerabilities privately as described in `SECURITY.md`.

### Native plugin sound (MuPiBox-NG alpha.22 and newer)

Request the `audio` permission in the app manifest. After the parent explicitly approves it, call the asynchronous SDK method:

```js
await MuPiBoxSDK.audio.playNote('C4', 30, 'musicbox');
```

The supported range is C4–C5 (including sharps); instruments are `musicbox`, `piano`, `epiano`, `glockenspiel`, `xylophone`, `marimba` and `harp`. The host verifies permission, parent/child Games restrictions, limits frequency, and caps the note volume against the box's configured startup/maximum volume before rendering through native PipeWire. Unsupported/unapproved requests are rejected. Standalone browser previews use the SDK's WebAudio fallback, which may require a user gesture. This API is for musical notes, **not** audio streams or file playback.

### Camera access and per-app sound settings (MuPiBox-NG alpha.23+)

**Audio:** To build an optional 0–100% volume slider, call `await MuPiBoxSDK.audio.playNote('C4', volume, 'musicbox', {relative:true})`. Relative volume can never exceed the configured box startup/maximum limits. The original three-argument call is unchanged. Save the slider value with `MuPiBoxSDK.storage.set('volume', volume)` and restore it with `storage.get('volume')`. See `examples/klang-memory/` v0.1.2.

**Camera:** USB/V4L2 webcams use the new manifest permission `camera`. The official sample under `examples/webcam-preview/` shows:

```js
const devices = await MuPiBoxSDK.camera.list();
await MuPiBoxSDK.camera.start(devices[0].id); // asks user on local touchscreen
const {image} = await MuPiBoxSDK.camera.capture(); // local, bounded JPEG data URL
document.querySelector('img').src = image;
await MuPiBoxSDK.camera.stop();
```

The app cannot bypass the **separate user-facing consent dialog**; a visible Stop indicator remains in the trusted host, outside the plugin frame. The API returns bounded 320x240 JPEG snapshots (roughly 1 frame/second) and is available only on the local touchscreen, not the remote Admin preview. The host does not store or upload frames, does not grant microphone access and rejects unrecognized camera paths. An attached compatible UVC camera is required; physical capture was **not verified on box 85** because no webcam was connected. Use `python3 tools/build_webcam_example.py` to build the example.

### Durable photos (development host builds with photo-save)

For touch apps such as **FotoSpaß**, request a separate `photo-save` permission
in `manifest.json` alongside `camera` if taking pictures. The photo permission is
reviewed when the parent installs or updates the app. Neither permission grants
general filesystem access. On an equipped, updated **local MuPiBox touchscreen**
the API stores edited, finished images:

```javascript
const sdk = window.MuPiBoxSDK;
const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
if (!blob) throw new Error('Foto konnte nicht erstellt werden');
const saved = await sdk.photos.save({blob}); // host chooses filename and directory
const photos = await sdk.photos.list();      // [{id, filename, mimeType, size, createdAt}, ...]
const imageBlob = await sdk.photos.get(saved.id); // native Blob
const url = URL.createObjectURL(imageBlob);
preview.src = url; // call URL.revokeObjectURL(url) when preview is no longer needed
// await sdk.photos.delete(saved.id); // explicit deletion
```

Only **PNG/JPEG**, maximum **8 MiB per file**, **16 MP**, **250 MiB** and
**1000 photos per plugin**. The host validates and decodes the image, saves it
atomically under its private app-data root, and returns an opaque image ID.
Images survive app updates and uninstall. The built-in MuPiBox Gallery is not
automatically populated: export, backup and printing will need their own
separately approved host integration. On remote Admin/browser previews these
operations are intentionally unavailable. The webcam's camera consent dialog
still governs starting a camera.

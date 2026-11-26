# `.mupiapp` format: v1 (Developer Preview)

A `.mupiapp` is a ZIP archive with `manifest.json` **at archive root**. The root also contains the app's HTML entry point and every referenced CSS/JS/WASM/image asset. No remote CDN is required for the reference app.

Example:

```text
mupi-kreuz-kreis.mupiapp (ZIP)
├── manifest.json
├── index.html
├── app.js
├── style.css
├── icon.svg
├── game.wasm
├── wasm_exec.js
└── mupibox-sdk.js
```

Example manifest:

```json
{
  "apiVersion": "1",
  "id": "community.tictactoe",
  "name": "MuPi Kreuz & Kreis",
  "version": "0.2.0",
  "runtime": "web",
  "entry": "index.html",
  "icon": "icon.svg",
  "cover": "assets/cover.png",
  "permissions": ["storage", "controller", "audio"],
  "category": "games",
  "display": {
    "orientation": "landscape", "minWidth": 800, "minHeight": 480,
    "showBackButton": false, "showSystemInfo": false,
    "fullScreen": true, "background": "app"
  }
}
```

| Field | Purpose |
| --- | --- |
| `apiVersion` | Host contract major version, currently literal string `"1"` |
| `id` | Stable reverse-domain-like lowercase identifier; cannot change after publication |
| `name`, `description`, `author` | App-store-facing metadata, not trusted HTML |
| `version` | Semantic release version, for update comparisons |
| `runtime` | `"web"` or experimental `"qtquick-scene"` (declarative JSON; no QML code) |
| `entry`, `icon` | Relative paths inside the package, no absolute paths or `..` |
| `cover` | Optional raster home-tile image (PNG/JPG/JPEG/WebP) relative to the package root; not the app background |
| `permissions` | Requested privileges, **not grants**: `storage`, `controller`, `audio`, `camera`, `photo-save`, `shared-assets`, `links`, `homeassistant`, `device-status`, `playback`, `playback-control`, `cover-art`, `coloring-pages` (`network` is reserved in the packaging schema for backwards compatibility but not supported by the host; see [SDK API reference](sdk-api-reference.md)) |
| `networkHosts` | Explicit hostname allowlist **required** when requesting `network` |
| `category` | Preferred native menu location: `games`, `creative`, `learning`, `tools`, or `other` (defaults to `games`) |
| `display` | Preferred orientation, minimum size and optional native MuPiBox chrome settings |
| `galleryDirectories` | Optional, scoped album directory declarations; requires `photo-save` |
| `sharedDirectories` | Optional explicit SMB directory allowlist; requires `shared-assets`; max 8 paths |

**Owner-managed settings pages (declarative):** Apps may optionally declare
`adminSettings` in the manifest. MuPiBox renders a form in its existing
authenticated Admin UI, with typed fields and defaults. The app can read only
its own non-secret values via `MuPiBoxSDK.config.get()` when `storage` is
approved. There is no second sign-in, app-authored Admin HTML or write method
in the normal SDK. [Full German developer/AI guide](admin-settings-ai-guide.de.md)
and [working example](../examples/admin-settings-demo/README.md).

**Custom management pages:** Optional `admin.entry` adds a fully interactive
app-owned page in the existing NG Admin interface without a second login.
The page runs in an opaque-origin iframe and calls only the host-provided
`MuPiBoxAdminSDK` for explicitly approved scoped file and settings
operations. Optional `permissionReasons` explain requested permission
grants to the user. [German security, API and AI developer guide](admin-pages-ai-guide.de.md).
Since NG Alpha 87, `admin.capabilities` may include `audio.record`, with a required `permissionReasons["admin.audio.record"]`, `shared-assets` and scoped directories. [Recording API and demo](community-admin-audio-recording.md).

**Compatibility:** An app supporting API `1` must not assume later additions or the presence of a physical controller. A host must reject unsupported API versions and unknown permission names, and may deny any requested privilege.

**Packaging restrictions implemented by the validator:** 200 files max, 50 MiB total uncompressed, 20 MiB per file, max 1 MiB manifest, no absolute paths, traversal paths, symbolic links, duplicate paths or case-insensitive collisions. Host enforcement must repeat checks and enforce time/CPU/memory/file limits. Invalid packages must never be extracted directly into system directories.

**Integrity and provenance:** ZIP files are **not signed** in v1. The curated catalog publishes SHA-256 digests for reviewed GitHub Release artifacts; independent publisher signatures and automatic updates remain future work. A hash alone verifies downloaded bytes, not publisher trust.

**`photo-save` (host development):** Explicit, parent-approved permission to save PNG/JPEG image Blobs through `MuPiBoxSDK.photos`, not arbitrary file access. The API is available on the local touch runner only (no remote Admin preview). Max 8 MiB/file, 16 MP, 250 MiB and 1000 photos per application. The host owns all paths and IDs; photos survive plugin updates/uninstall. See `GETTING_STARTED.en.md`.

## Native app appearance and navigation (NG 0.2.0-alpha.30+)

The optional `category` and `display` properties are **presentation preferences**, not permissions. Owners can override each app under **Admin → Provider & Dienste → Community-Apps / Plugins → Installierte Apps → Darstellung & Integration**. Host-owned overrides take precedence over manifest preferences and persist across app updates. An older manifest remains valid and uses the normal MuPiBox appearance.

| Property | Type / allowed values | Default if absent |
| --- | --- | --- |
| `category` | `games`, `creative`, `learning`, `tools`, `other` | `games` |
| `display.showBackButton` | Boolean | `true` |
| `display.showSystemInfo` | Boolean | `true` |
| `display.fullScreen` | Boolean | `false` |
| `display.background` | `system` or `app` | `system` |
| `display.orientation` | `landscape`, `portrait`, `any` | Host's standard behavior |
| `display.minWidth`, `minHeight` | Positive display dimensions | Host's standard size |

In the current NG UI, `showBackButton: false` hides the **entire left native Back + app-title group**. The title cannot be toggled independently with a `showTitle` field. `showSystemInfo: false` hides the right native status indicators. `fullScreen: true` removes the browser's reserved top inset and draws the app edge-to-edge; visible enabled native controls may overlay the app content. `background: "system"` uses the native theme behind the web app, but an opaque CSS app background can cover it. Use `"app"` for a self-designed background.

**If you hide the host Back button, include a visible, touch-sized exit button within your app:**

```html
<button id="leave-app" type="button">Zurück</button>
<script src="mupibox-sdk.js"></script>
<script>
  document.getElementById('leave-app').addEventListener('click', () => {
    window.MuPiBoxSDK.exit(); // requests the trusted host to close the app
  });
</script>
```

`MuPiBoxSDK.exit()` uses the existing `app.exit` host bridge; it does not need an additional manifest permission. In a standalone browser preview there is no host to close, so this call only signals `preview.exit`. Native host navigation and escape routes remain under trusted MuPiBox control. Do not use a browser URL, `history.back()`, or internal Admin endpoints as an exit mechanism.

## Photo directories (optional)

A plugin with explicitly approved `"photo-save"` permission may declare up to eight gallery directories in its own scoped photo storage:

```json
{
  "permissions": ["photo-save"],
  "galleryDirectories": [
    {"path": "photos", "name": "Meine Fotos"},
    {"path": "photos/portraits", "name": "Porträts"}
  ]
}
```

These are **additional fields in a complete manifest**, not a standalone valid manifest. Paths must begin with `photos`, contain at most six slash-separated segments, have no dots or symlinks, and use letters, digits, underscores or hyphens only. They must not duplicate one another. `name` is optional (at most 100 characters). The app cannot create arbitrary host paths by declaring them.

Declaring a directory never publishes pictures automatically. An owner must separately enable **„Gespeicherte Fotos in Galerie anzeigen“** for that app in the Admin UI. Once enabled, its photos can become visible to other clients of the box's Gallery. This is independent of the private app storage API and can be revoked.

## Shared SMB folders for owner-managed app content (NG alpha.40+)

With the explicitly approved `shared-assets` permission, a local touchscreen
app can read only its own folder within the existing MuPiBox SMB share:

```text
<MuPiBox SMB share>/
  CommunityApps/
    community.buecherkiste/
      books/
        Ole/
          book.json
          images/
            cover.png
    community.fotospass/
      accessoires/
        baerte/
        brillen/
        huete/
```

The trusted host maps this to
`/srv/mupibox/CommunityApps/<manifest.id>/` on the box. Apps do **not**
receive that path, SMB credentials or directory handles. Uploads are made
by the owner through the existing SMB share, not by an untrusted app.

```js
const sdk = window.MuPiBoxSDK;
const books = await sdk.shared.list('books');
// {entries:[{name,path,isDir,size,modified}],revision,truncated}
const definition = await sdk.shared.read('books/Ole/book.json'); // Blob
const metadata = JSON.parse(await definition.text());
const stop = sdk.shared.watch('books', result => {
  console.log('Book folders updated:', result.entries);
}, {intervalMs: 30000}); // stop() on exit
```

`shared.list(folder = '')` lists up to 512 immediate files/directories and
returns a content revision for polling. `shared.watch()` checks every 15 to
300 seconds (default 30 seconds), only while the document is visible, and
invokes the callback when a change is detected. It is **polling**, not an
always-on kernel watcher. `shared.read(path)` returns a Blob (8 MiB maximum)
for JSON, text, SVG, JPEG/PNG/WebP/GIF, MP3/OGG/WAV or PDF. Other file types,
hidden dot paths, traversal, symlinks and device files are rejected.

The API is not available in the remote Admin preview. No write/delete
capability and no access to other applications, the music library, Gallery,
operating-system files or arbitrary SMB mounts is granted. Files placed in
the SMB share are user-provided/untrusted: do not interpret SVGs as HTML or
execute scripts; treat text and book metadata as content only.

**Required storage convention for new integrations:** Place no files directly in `CommunityApps/`; use the actual stable `<manifest.id>` and only app-documented subfolders. For a book app, each book belongs to its own `books/<book-id>/` directory. The per-app namespace is enforced for app reads, but the SMB owner's own writes are **not** restricted by this API. See the [shared-assets policy](shared-assets-policy.md) for naming, collisions, file types, and host hardening TODOs.


### App-specific SMB directories (NG alpha.40+)

A new app using the local, owner-managed SMB import should declare the
**exact allowed subfolders** alongside its permission. This is an excerpt
from the manifest, not a complete manifest:

```json
{
  "permissions": ["shared-assets"],
  "sharedDirectories": ["books"]
}
```

For example the installed app with ID `community.buecherkiste` may read
`CommunityApps/community.buecherkiste/books/buch-1/book.json` and other
files under `books/` only. Other folders are invisible or denied.
Valid paths have up to six slash-separated components containing only
ASCII letters, digits, underscores and hyphens; max 120 characters.
Duplicates, case-folded collisions, and overlapping parent/child paths
are rejected. Empty declarations on apps other than legacy
`community.buecherkiste` and `community.fotospass` yield no
folder access. Legacy Bücherkiste/Fotospaß IDs are scoped to
`books` / `accessoires` for compatibility, but new
versions should declare their folders. No application-side write API exists.

This **does not constrain the owner's own SMB write account**: owners can
still place files manually, but the host only returns contents under allowed
folders. For SMB/ACL changes, quotas and cleanup policy see
[the shared assets storage rules](shared-assets-policy.md).

## App wallpaper versus native menu tile image (NG 0.2.0-alpha.34+)

`display.background` is a **mode**, not a path:
- `"app"`: the host runner has its normal background; the web app
  draws its own wallpaper through CSS/HTML when it is opened.
- `"system"`: the host runner can reveal the MuPiBox theme if the
  plugin's `html`, `body` and other full-screen elements are transparent.
  An explicit opaque plugin CSS background is never overwritten.

To set an app-owned wallpaper, include **both** the image and stylesheet
inside the `.mupiapp` package. For example:

```text
index.html
style.css
assets/background.jpg
assets/cover.png
assets/icon.svg
```

```css
/* style.css next to index.html */
html, body { margin: 0; width: 100%; min-height: 100%; }
body { background: url("./assets/background.jpg") center / cover no-repeat; }
```

Select `"display":{"background":"app"}` if desired. The wallpaper is
visible only **inside the opened app**, never on Home. The setting does not
look for `background.jpg` automatically or make the app picture the
MuPiBox global background.

For the **Home/category tile**, add a top-level `"cover":
"assets/cover.png"` to the manifest. The file must be in the package,
with PNG/JPEG/WebP format; recommended approximately 512 × 512 pixels.
Native Qt uses `cover` first, then a raster `icon` (PNG etc.) if
available, then a themed fallback picture for `creative`, `learning`,
`tools` or `other`. Qt Quick on some DietPi installations cannot load
SVG, so `cover` deliberately rejects SVG. Existing `icon.svg` remains
valid for Admin/catalog/browser use. No additional permission or
migration is needed for legacy apps.

This contract applies to categories automatically generated for Community
Apps and to matching existing user-configured Home categories. Admin
category overrides are respected. Avoid external URLs, network requests,
dynamic code evaluation, raw host filesystem paths or developer-specific
NG implementation dependencies.


### Vollbild-Spiele und eigenes Navigationsdesign

Für Games mit eigener, gut erreichbarer Zurück-Schaltfläche empfehlen wir
`display.showBackButton=false`, `display.showSystemInfo=false`,
`display.fullScreen=true` und `display.background="system"`. Die
App muss `html/body` und den äußeren Container transparent halten, damit
das ausgewählte MuPiBox-Wallpaper sichtbar bleiben kann. Nur Spielfelder,
Buttons und Ableseflächen werden deckend gezeichnet. Bei einem eigenständigen
Vollbildspiel *muss* die App einen funktionierenden, sichtbaren Exit-Button
(`MuPiBoxSDK.exit()`) vorsehen; die Host-Navigationsoption bleibt weiterhin
pro App konfigurierbar. Frühere Admin-Überschreibungen gelten vor dem Manifest.

## Text-to-Speech über das Host-SDK

Die Freigabe `audio` schließt auch die Sprachausgabe über den **bestehenden**
TTS-Dienst der MuPiBox ein. Die Eltern wählen Sprache, Anbieter und Stimme
wie bisher unter **Admin → Text-to-Speech**. Community-Apps dürfen diese
Einstellungen nicht verändern und bekommen keine API-Schlüssel.

```js
const sdk = window.MuPiBoxSDK;
const tts = await sdk.tts.status(); // {enabled, available, language}
if (tts.available) {
  await sdk.tts.speak('Diese Buchseite wird vorgelesen.');
}
```

`speak(text)` akzeptiert 1–600 Unicode-Zeichen pro Aufruf. Ein Aufruf liest
nur den übergebenen Text, nutzt die globale Stimme und die vorhandene
Audio-Unterbrechungs-/Fortsetzungslogik. Es gibt eine Rate-Limitierung,
eine aktive Syntheseanfrage pro App und keine beliebige Stimmenauswahl.
Der Aufruf bestätigt, dass die Audioausgabe gestartet wurde, **nicht** das
Ende des gesprochenen Textes. Der lokale Browser-Vorschaumodus kann keine
Host-Sprachausgabe simulieren; Apps sollten `status().available` beachten.

Eine App benötigt für `tts.status()` und `tts.speak()` die `audio`-
Berechtigung. Ältere Hosts ohne diese SDK-Erweiterung werden weiterhin
unterstützt, solange Apps die Funktion optional verwenden.


## Optional host integration capabilities (NG community-suite preview)

`links` grants `sdk.links.list()` and requests to
`sdk.links.open(url)`. Only administrator-approved URLs are ever listed.
The open method currently fails closed (HTTP 501), since the external browser
requires a separate fully intercepted Qt WebEngine profile. This permission
does **not** grant `network` access to the plugin iframe.

`homeassistant` grants `sdk.homeassistant.list()` and
`sdk.homeassistant.command(entityId, action)`. The NG host uses its own
configured HA connection; apps cannot read or configure the access token.
Only administrator-approved `light.*`, `switch.*`, `scene.*` entities
and individually approved `turn_on`/`turn_off` operations are allowed.
The integration defaults to disabled and requires a LAN HA address.

Existing `storage` still limits each JSON value to 64 KiB; the updated
host expands the per-app budget to 32 MiB / 512 keys. Future large binary
media projects require separate file storage.


### Bounded polyphonic preview

An upgraded NG host implements `sdk.audio.playChord(notes, volume,
{relative:true})` where `notes` is an array of 1–4
`{note:"C4",instrument:"piano"}` values. The same `audio` permission,
device volume ceiling, parental controls and 75ms per-app call rate limit
apply as with `playNote`. It does not accept raw audio samples or arbitrary
note ranges and is not a sample-accurate song sequencer.


### Wiedergabe kurzer App-eigener Soundeffekte

Eine MuPiBox-NG-Version mit der optionalen Host-Bridge-Methode `audio.clip`
kann kleine Audiodateien (MP3, OGG, WAV) direkt über die eingerichtete
Box-Audioausgabe ausgeben. Die Datei muss als reguläre Datei im installierten
App-Paket unter `assets/` liegen und maximal 2 MiB groß sein. Die vorhandene
Berechtigung `audio`, Kindersicherung, per-App-Ratenlimit und die globale
Lautstärkebegrenzung bleiben aktiv. Beliebige Dateipfade und Netzwerk-URLs
werden nicht akzeptiert.

Die Funktion kann z. B. nach `tts.speak(text, {waitForCompletion:true})`
verwendet werden: Erst bei `result.state === "completed"` wird der kurze
Effekt mit `sdk.audio.playClip("assets/laugh.mp3")` gestartet. Die laufende
Clip-Ausgabe kann über `sdk.tts.stop()` vorzeitig beendet werden. Ältere
Hosts ohne `audio.clip` unterstützen weiterhin den restlichen App-Betrieb.


### Optional short-sample preloading (NG alpha.68+)

The host optionally supports `await MuPiBoxSDK.audio.prepareSample('assets/audio/jump.ogg')`.
It uses the same `audio` permission, installed-package path validation, per-app
rate limit, 2 MiB bounded PCM effect cache and PipeWire playback constraints as
`audio.playSample`. The method only prepares a *short* MP3/OGG/WAV effect,
returns a host response containing `prepared: true` on success and **never
plays audio**. It does not preload looping music, return decoded buffers or
unlock arbitrary filesystem access.

Older NG hosts do not implement this optional bridge method: catch a rejected
promise and continue with `playSample` without claiming that preloading
succeeded. Browser-only previews return `false` and do not emulate the native
PCM cache. Preload sparingly before gameplay (the server still rate-limits
requests); don't call it on every animation frame.

```js
try {
  await MuPiBoxSDK.audio.prepareSample('assets/audio/jump.ogg');
} catch (error) {
  // Fallback: the older host may decode on first play.
}
```


### Optional full-gamepad input (NG controller bridge update)

The trusted, local-only runner continues to publish the original
`input` events (including `A`, `B`, directional keys and `START`).
On upgraded hosts, it additionally sends distinct pressed/released
`input` events for `MUSIC` (physical face B), `SPRINT` (right shoulder)
and `MUTE` (face X). The original `B` alias for right-shoulder/sprint
is **preserved** for compatibility with existing community games.

The optional `controller.connection` event carries
`{connected: boolean, bluetooth: boolean}`. Listen with
`sdk.on('controller.connection', handler)`; always treat missing events
on older hosts as an unknown connection state, not proof that a controller
exists. Host polls physical HID only on trusted loopback routes and forwards
button edges. No plugin receives raw evdev device handles.

Applications with controller-required gameplay must explicitly refuse to
start until connection is confirmed. Distinct keys and the connection event
require an updated NG host; older versions do not provide these additions.

### Optional bounded music preloading (NG host audio-cache draft)

An updated NG host implements `await MuPiBoxSDK.audio.prepareMusic('assets/audio/level.wav')`.
It uses the existing explicit `audio` permission, only bundled app-owned
MP3/OGG/WAV assets, the same sandbox, and no file handles or raw PCM access.
The host has a strict **6 MiB packaged music asset / 125-second decoded
duration** limit and a shared **20 MiB / two-track LRU cache**. Effects
retain their separate 2 MiB / five-second limit and cache. Music cache
entries are owner-scoped, checked against the actual source file and
evicted on owner revocation. Successful prepare returns
`{prepared:true}` but plays nothing; `audio.playMusic` reuses the
cached PCM when possible. The music cache is an optimization, not a
guarantee that a track will stay cached after other apps run.

Feature-detect via `(await sdk.getContext()).audioMusicPreload === true`
before invoking it. Older hosts reject unsupported methods; catch and
continue with regular `audio.playMusic`. Standalone browser previews
return `false` without pretending to cache audio.

### Optional position-preserving music pause/resume

`MuPiBoxSDK.audio.pauseMusic()` and `MuPiBoxSDK.audio.resumeMusic()`
are optional NG-host features guarded by the existing `audio` permission.
They operate **only on the active audio voice belonging to this app/session**.
Pause silences the track without advancing its PCM position; resume continues
at that precise offset without redecoding. The operations do not disclose
the buffer, device or underlying file path and do not change volume limits.
Inspect `(await sdk.getContext()).audioMusicPauseResume === true` before
using them; older hosts should fall back to stop/replay (which restarts
the music), not claim position parity. Stopping paused music still fades
out safely and revokes the voice on session teardown.

### Optional music hold/restore (controller reconnection)

On hosts reporting `audioMusicHoldRestore === true` from `getContext()`,
`await sdk.audio.holdMusic()` suspends exactly one owner-owned music voice
at its current PCM offset. The app may play its title music, then request
`await sdk.audio.restoreMusic()` to replace that menu loop with the saved
voice and exact playback position. Both return `{active:boolean}` and
reject cross-owner restoration. The host holds at most **one** voice
globally, never exposes PCM to the browser, and discards it on session
revocation, expiry or displacement by another owner's hold. If `active`
is false, fall back to normal `playMusic`. A browser preview and older
hosts do not pretend that the previous position was restored.

### Bounded non-looping victory and game-over music (optional)

Updated NG hosts accept an explicit `loop:false` in
`MuPiBoxSDK.audio.playMusic('assets/audio/victory.wav', 40,
{relative:true, loop:false})`. Playback uses the same owner-scoped
PipeWire voice, volume ceilings, 6MiB packaged file and 125-second PCM
limits; it stops after the recording ends rather than repeating forever.
Omitting `loop` keeps historical music behavior and payloads unchanged.
Use this for level-finish fanfares and game-over themes; never use the
5-second `playSample` route for long recordings. Older hosts ignore
unknown `loop` fields, so one-shot parity requires the updated NG host.

## Native Qt Quick scene runtime (experimental host support)

`"runtime":"qtquick-scene"` uses `"entry":"scene.json"`; the trusted NG
Qt Quick renderer creates QML items from **passive, strictly validated JSON**.
It does not load arbitrary downloaded `.qml`, JavaScript, HTML, WASM or native
libraries inside the privileged UI process. This is intentionally a narrow
first step, **not yet a replacement for an arbitrary-QML game engine**.

- 800×480 logical scene; the host scales it and preserves the native header.
- Up to 48 objects: `text`, `counter`, `image`, `rectangle`, `button`.
- RGB colors `#RRGGBB`, coordinates `x`, `y`, `width`, `height`, optional
  `fontSize`; `image` points to an existing bundled PNG/JPEG/WebP.
- Optional `animateY:{"from":100,"to":130,"durationMs":1000}` on images
  and rectangles (150–20,000 ms).
- Buttons support `increment`, `reset`, `exit`, `saveScore`, `loadScore`,
  `playSample`, `playMusic`, `stopMusic`, `musicLouder`, `musicQuieter`,
  `soundLouder`, `soundQuieter`. For `playSample` and `playMusic` set `asset`
  to a bundled `.wav`, `.ogg`, or `.mp3` file. Other buttons must omit `asset`.
- `storage`, `controller`, and `audio` are opt-in permissions. The trusted Qt
  renderer uses the same rate-limited local SDK bridge as Web apps; persistence
  uses the scoped key `qtquick-score`, audio respects the global box limits
  and separates music/sound volumes. Jump increments the demo counter, Start
  resets it. No general app-supplied QML code runs in the host.
- No browser preview or arbitrary programmable game state. The existing Web
  runtime stays unchanged.
- An NG host without this runtime rejects the package.

The host validates scene data **before extraction**, rejects active content,
and serves immutable app-local assets through the existing scoped routes.
Unknown properties are rejected. The Qt main process never interprets
plugin-supplied source code. Allowing arbitrary QML later requires a
separate sandboxed process and an appropriate display/compositor integration;
NG currently runs under EGLFS rather than as a Wayland compositor.

Reference source: `examples/qtquick-scene-demo` (package with
`python3 tools/mupiapp.py pack examples/qtquick-scene-demo dist/qtquick-scene-demo.mupiapp --exclude README.md`).
Do not add the demo to the public catalog until its NG host version and real
Raspberry Pi UI behavior have been verified.

The reserved first-party MuPi Run development preview pairs `community.mupi-run-native` with the fixed scene selector `mupi-run-v1`. Its matching NG development host ships the executable implementation. The package has an empty elements array, reviewed media and exactly storage/audio/controller permissions. The regular element-scene format remains available to other authors. Stock alpha.71 cannot install this preview. See [native runner](../examples/mupi-run-native/README.md).

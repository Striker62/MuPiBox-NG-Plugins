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
| `runtime` | Only `"web"` for v1; Go must be compiled to WASM |
| `entry`, `icon` | Relative paths inside the package, no absolute paths or `..` |
| `permissions` | Requested privileges, **not grants**: `storage`, `controller`, `audio`, `camera`, `photo-save` (`network` is not supported by the current host) |
| `networkHosts` | Explicit hostname allowlist **required** when requesting `network` |
| `category` | Preferred native menu location: `games`, `creative`, `learning`, `tools`, or `other` (defaults to `games`) |
| `display` | Preferred orientation, minimum size and optional native MuPiBox chrome settings |
| `galleryDirectories` | Optional, scoped album directory declarations; requires `photo-save` |

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

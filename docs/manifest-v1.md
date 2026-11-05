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
  "display": { "orientation": "landscape", "minWidth": 800, "minHeight": 480 }
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
| `display` | Preferred orientation and minimum display size |

**Compatibility:** An app supporting API `1` must not assume later additions or the presence of a physical controller. A host must reject unsupported API versions and unknown permission names, and may deny any requested privilege.

**Packaging restrictions implemented by the validator:** 200 files max, 50 MiB total uncompressed, 20 MiB per file, max 1 MiB manifest, no absolute paths, traversal paths, symbolic links, duplicate paths or case-insensitive collisions. Host enforcement must repeat checks and enforce time/CPU/memory/file limits. Invalid packages must never be extracted directly into system directories.

**Integrity and provenance:** ZIP files are **not signed** in v1. The official future catalog should publish SHA-256 digests and provide a publisher-review/signature policy before auto-install/update. A hash alone verifies downloaded bytes, not publisher trust.

**`photo-save` (host development):** Explicit, parent-approved permission to save PNG/JPEG image Blobs through `MuPiBoxSDK.photos`, not arbitrary file access. The API is available on the local touch runner only (no remote Admin preview). Max 8 MiB/file, 16 MP, 250 MiB and 1000 photos per application. The host owns all paths and IDs; photos survive plugin updates/uninstall. See `GETTING_STARTED.en.md`.

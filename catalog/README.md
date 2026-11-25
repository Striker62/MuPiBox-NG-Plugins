# Curated MuPiBox-NG App Catalog

`apps.json` is the curated app list consumed by the built-in Plugin Manager (starting with NG alpha.19). It is reviewed and published from this repository's **main branch**. The box downloads it from the pinned GitHub Raw endpoint, and only downloads artifacts from GitHub Releases belonging to **splitti/MuPiBox-NG-Plugins**. HTTPS, strict hosts, package digest and manifest match are required. Catalog entries are informational **not digital signatures**.

Every entry must have: `id`, `name`, `description`, `category`, `author`, `version`, `releaseTag`, `asset`, `sha256` (lowercase SHA-256 of the **published Release asset**), and `permissions`. No arbitrary download URLs, alternate hosts or shell executables.

## Release review

Community apps require source, dependency, license, permissions and package review before publication. Catalog entries must match the actual vetted GitHub Release asset and its SHA-256 digest. Existing internal app IDs are kept for backward-compatible updates; visible display names may differ.

## Submit your app

You can develop in your own repository without NG core access. For inclusion in the **built-in** curated catalog:

1. Open an issue here explaining the app, screenshots, open-source license and why requested permissions are needed.
2. Submit a Pull Request with your source code (e.g. under `examples/<app>`) or a documented reviewable external source repository and a tested `.mupiapp` package.
3. Maintainers review code, permissions, licensing, accessibility, offline use and security. **Only maintainers can publish artifacts to the official trusted GitHub Releases area.**
4. After a trusted Release asset is published, submit or update the `catalog/apps.json` entry, with its exact Release tag, asset filename, digest and matching manifest metadata.
5. CI validates the catalog's structure; a maintainer confirms the Release asset and may reject or remove entries. A PR is **not** automatically installed on any box.

### Maintenance

On new versions, upload the vetted artifact as an official Release asset, then update `version`, `releaseTag`, `asset`, and `sha256`. Do not change app IDs. Installed versions are only updated after user confirmation. Manual `.mupiapp` upload remains available to developers independently of catalog review.

The catalog only lists **curated official copies** of apps; do not link arbitrary third-party URLs because this would bypass the host's download allowlist.

Source examples may be newer than published releases and request different
supported permissions. The catalog must continue to describe the published
package, not unreleased source. CI requires the same app ID and a source version
no older than the release; matching versions must match name and permissions.
The installer still checks published bytes against the catalog and asks for
approval of newly requested permissions when a new release is installed.

## Veröffentlichungs- und Aktualisierungsdaten

`app-dates.json` ist die **separate, optionale** Metadaten-Datei für den NG-Admin
(ab alpha.61). Sie enthält für jede App-ID `publishedAt` und `updatedAt`
als UTC-ISO-8601-Zeitstempel. `publishedAt` ist die erste Aufnahme in
`apps.json`, `updatedAt` der letzte Commit, der deren Katalogeintrag
geändert hat. Die Werte wurden aus der Git-Historie des Katalogs ermittelt.
Bei jeder neuen Veröffentlichung oder Änderung der App sind die Werte in
`app-dates.json` zu pflegen; das erste Veröffentlichungsdatum bleibt gleich.
Der neue Aktualisierungswert entspricht dem Commit-Zeitpunkt der Katalogänderung.
Diese Daten dienen **nur der Sortierung** und werden nicht zur Prüfung des
heruntergeladenen Pakets verwendet.

Die separate Datei ist wichtig: Ältere NG-Versionen verwenden beim Laden
von `apps.json` einen strikten Decoder und würden unbekannte Datumsfelder
sonst ablehnen. Ist `app-dates.json` nicht erreichbar, bleibt der
Katalog installierbar; Datumssortierung fällt auf die alphabetische
Reihenfolge zurück.

## Camera-capable catalog apps

A catalog entry with the `camera` permission must explain why it needs an attached USB/V4L2 camera. Admin approval at installation does **not** turn the camera on: the trusted local touchscreen asks for explicit session consent each time. A red Stop indicator is always visible. Camera apps are local-only; media is not uploaded or persisted by the host. For the experimental `official.webcam-preview` app, device capture has not been validated with physical hardware on Box 85.

### Optional first-party catalog extension

`first-party-apps.json` lists apps requiring newer, separately approved SDK
capabilities. Hosts predating these capabilities continue to read only
`apps.json`, whose strict permission validation would otherwise reject the
whole catalog. Both files reference the same verified GitHub Release assets.

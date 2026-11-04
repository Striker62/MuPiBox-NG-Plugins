# Curated MuPiBox-NG App Catalog

`apps.json` is the curated app list consumed by the built-in Plugin Manager (starting with NG alpha.19). It is reviewed and published from this repository's **main branch**. The box downloads it from the pinned GitHub Raw endpoint, and only downloads artifacts from GitHub Releases belonging to **splitti/MuPiBox-NG-Plugins**. HTTPS, strict hosts, package digest and manifest match are required. Catalog entries are informational **not digital signatures**.

Every entry must have: `id`, `name`, `description`, `category`, `author`, `version`, `releaseTag`, `asset`, `sha256` (lowercase SHA-256 of the **published Release asset**), and `permissions`. No arbitrary download URLs, alternate hosts or shell executables.

## Free name-rights preflight for the three MuPi games

The project owner explicitly chose a **free, non-lawyer risk assessment**
and accepted the residual trademark risk for the open-source release.
Read the [written decision](../docs/release-checklist.md) and
[preliminary evidence](../docs/trademark-preflight-2026-11-04.md).
The lack of a paid register search does **not** establish freedom from trademarks.
For these three games the source uses original program code, UI and icons.

Do not change any catalog record until the **real official GitHub Release asset**
exists, was downloaded, and its exact SHA-256 and manifest have been verified.
Keep \`community.tictactoe\` for backward-compatible updates even though its
visible title is now **MuPi Kreuz & Kreis**.

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

## Camera-capable catalog apps

A catalog entry with the `camera` permission must explain why it needs an attached USB/V4L2 camera. Admin approval at installation does **not** turn the camera on: the trusted local touchscreen asks for explicit session consent each time. A red Stop indicator is always visible. Camera apps are local-only; media is not uploaded or persisted by the host. For the experimental `official.webcam-preview` app, device capture has not been validated with physical hardware on Box 85.

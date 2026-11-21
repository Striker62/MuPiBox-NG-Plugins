# Curated Theme Catalog

The file `catalog/themes.json` describes reviewed theme bundles for NG's Themes plugin section. Empty `themes: []` is valid until the first official package is released. Each entry must include `id`, `name`, `description`, `author`, `version`, `releaseTag`, `asset`, `sha256`. Only official GitHub Release assets hosted at `splitti/MuPiBox-NG-Plugins` may be downloaded. No arbitrary URLs in entries.

Theme packages are checked for metadata, compatibility, licensing (including image/font licenses), appropriate screenshots, readability at 800×480, and whether bundled assets can be redistributed. SHA-256 checks package integrity, **not** author trust. Installations/updates need an explicit Admin action. Source contributors submit their own theme files, docs and a testable package by PR. Maintainers publish the reviewed artifact and then approve the catalog entry.

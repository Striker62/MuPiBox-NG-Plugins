# Community Themes – quick start (Theme API v1)

Themes are **data-only visual packages** for MuPiBox-NG's native Qt Quick display. Developers do not need access to the private application repository.

~~~sh
python3 tools/mupitheme.py pack examples/themes/starfield dist/sternenreise.mupitheme
python3 tools/mupitheme.py validate dist/sternenreise.mupitheme
~~~

Upload the package in **Admin → Community Apps / Plugins → Community Themes**. Select the installed theme under **Customizing → Theme**.

- `manifest.json` contains metadata, a stable reverse-domain ID, an existing bundled `extends` theme and a reference to `theme.json`.
- `theme.json` contains validated color/style tokens, optional component overrides and optional embedded images/fonts.
- All unspecified values inherit from the base theme. Arbitrary QML, JavaScript and CSS are intentionally unsupported.
- Installation is atomic; existing designs survive updates and removal of an active design is refused.
- Theme API v1 supports bounded home heading/card spacing, player cover radius, navigation and vertical media-list geometry, seven validated action-icon slots, Cover Flow perspective controls and up to 32 static decoration layers. The Admin custom-theme editor can export its current settings as a portable `.mupitheme` ZIP. It does **not** offer a general custom layout engine, per-element animations or arbitrary QML overrides. See [component/element inventory (DE)](elements.de.md), [tokens (DE)](reference.de.md) and [security/API (DE)](api.de.md).

Package source code, screenshots and license terms must be available for the curated catalog; maintainers publish inspected assets under GitHub Releases with SHA-256 verification.


### Fine-grained element styling

Optional `visuals` values offer bounded background opacity (0–1), independently adjustable corner radii (topLeft/topRight/bottomRight/bottomLeft, 0–80 px), and per-element border width/color on supported surfaces. System status icons and sensitive pairing prompts remain host-controlled. The browser designer exposes individual sliders and corner presets. See `reference.de.md` for the complete allowlist and examples.

# MuPiBox-NG Community-Themes (Theme API v1)

Dieses SDK erlaubt unabhängigen Entwicklern, installierbare Designs für die **native Qt-Quick-Kinderoberfläche** zu gestalten, ohne das private NG-Repository oder privilegierte Systemdateien zu ändern.

**Status:** Theme-Paketunterstützung im NG-Entwicklungszweig (noch keine veröffentlichte Alpha). Keine allgemeine Qt-/JavaScript-Plugin-API: Ein Theme ist ausschließlich deklaratives JSON plus lokale Assets. Das Theme-System und die Community-Apps verwenden denselben Admin-Plugin-Bereich, aber getrennte Formate.

## Schnellstart

~~~sh
git clone https://github.com/splitti/MuPiBox-NG-Plugins.git
cd MuPiBox-NG-Plugins
python3 tools/mupitheme.py pack examples/themes/starfield dist/sternenreise.mupitheme
python3 tools/mupitheme.py validate dist/sternenreise.mupitheme
~~~

Danach in NG: **Admin → Provider & Dienste → Community-Apps / Plugins → Community-Themes → Paket hochladen**. Das Theme erscheint anschließend unter **Box & Bedienung → Customizing → Theme**.

### Paketinhalte

~~~text
sternenreise.mupitheme (ZIP)
├── manifest.json             # Paket-ID, Version, Basis-Theme
├── theme.json                # Tokens, Komponenten, Assets
└── assets/
    ├── background.png        # optional
    └── preview.png           # optional
~~~

Das offizielle Beispiel ist `examples/themes/starfield/`.

## Aufbau der Theme-Definition

**manifest.json** identifiziert das Design stabil, **theme.json** beschreibt ausschließlich das Aussehen. Ein Theme kann alle dokumentierten Tokens auf einmal oder gezielt einzelne Komponenten überschreiben. Alle übrigen Werte werden vom `extends`-Theme geerbt. IDs müssen eindeutig und stabil sein, z. B. `community.mein-design`. Ein Bundle darf kein eingebautes NG-Theme überschreiben.

**Weitere Dokumentation:**
- [Alle Theme-Tokens und unterstützten Komponenten](reference.de.md)
- [Vollständiges Oberflächeninventar und Einschränkungen der API v1](elements.de.md)
- [Installation, API und Sicherheit](api.de.md)
- [English quick start](README.en.md)

**Neu:** Die native Oberfläche unterstützt dokumentierte Größen-/Abstandswerte für Startseite, Player, Navigation und Medienlisten, anpassbare Coverflow-Perspektive, eigene Bild-Icons für sieben sichere Aktions-Slots und statische Hintergrunddekorationen. Der vorhandene Admin-Custom-Theme-Editor kann seine aktuellen Einstellungen direkt als `.mupitheme` exportieren. Alle Werte stehen mit Bereich und Standardwert in der [Token-Referenz](reference.de.md).

**Mitmachen:** Themes können von jeder Community-Person eigenständig entwickelt werden. Für den offiziellen Katalog ist ein Maintainer-Review einschließlich Asset- und Lizenzprüfung sowie Veröffentlichung als GitHub-Release notwendig. Ein Katalogeintrag besteht ausschließlich aus Metadaten und SHA-256 – keine beliebigen Download-URLs.

**Lizenz:** Die .mupitheme-Dateien sind unabhängig vom NG-Kern. Jede Veröffentlichung muss eine eigene passende Lizenz haben; externe Schriften und Bilder müssen separat dafür freigegeben sein. Originäre NG-Artworks oder QML-Quellcode nicht ungeprüft in Community-Themes kopieren.

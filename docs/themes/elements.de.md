# UI-Elementinventar – native MuPiBox-NG-Oberfläche

Hier sind die wichtigsten sichtbaren Oberflächen und Zustände aus der gegenwärtigen Qt-Quick-Implementierung erfasst. **Themenfähigkeit ist keine implizite Garantie**: "geerbt" bedeutet, dass allgemeine Farben/Schriften/Radius wirken, aber noch keine individuelle Komponentenkonfiguration existiert. Der Theme-SDK v1-Vertrag wird in [reference.de.md](reference.de.md) beschrieben.

| Bildschirm / Teil | Zustände und Sonderfälle | Anpassung über API v1 |
| --- | --- | --- |
| Allgemeiner Hintergrund | Thema, eigenes Nutzerbild, Cover-Hintergrund, abgedunkelt, Galerie | `bg`, `assets.background`; benutzerdefinierter Hintergrund hat Vorrang |
| Systemstatusleiste | WLAN aktiv/offline, BT aktiv/inaktiv, Akku lädt/niedrig, Netzteil, Uhr, Lautstärke, Lüfter | `status.bar`, `statusShape`, `statusShadow`; Hardwarestatusfarben teilweise hostgesteuert |
| Startseiten-Kategorien | aktiv/inaktiv, Scrollen, langer Text, leere Kategorie | Farben/Fonts geerbt, eigene Geometrie noch nicht in v1 |
| Medienkachel | normal/aktiv/gedrückt, Fokus, ohne Cover, Titel kurz/lang, gesperrt | `media.card`, `focus`; Kartengröße/Abstand noch hostgesteuert |
| Kategorie-/Medienlisten | vertikal/horizontal/Coverflow, leer, laden, Fehler | Flächen geerbt; Coverflow-Abstände, Winkel und Animation noch nicht getrennt themebar |
| Cover-Maske | eckig/rund, spezielle Storybook-Kontur | `radius` und `chromeStyle`-Preset; eigene Masken später |
| Player | Pause/Wiedergabe, Vor-/Zurück, Spulen, Lautstärke, Stopp | `player.surface` und `player.transport` |
| Player-Zeitachse | Anfang, Mitte, Ende, Ziehen, unbekannte Dauer | `player.progress` |
| Warteschlange | aktueller Titel, Liste, leer, nächster Titel | `player.queue` |
| Player-Cover und Visualizer | Cover fehlt, Artwork, automatische Visualisierung, Effekte | Allgemeine Farben; Visualizer-Stile und Position sind Host-/Benutzereinstellungen |
| Suchfeld und Onscreen-Tastatur | Eingabe, Fokus, löschen, Suche ohne Treffer | Globale Farben/Schriften; gesonderte Theme-Komponente noch nicht vorhanden |
| Dialoge/Pop-ups/Toasts | Info, Erfolg, Warnung, Fehler, Bestätigung | `success`, `warning`, `error` plus globale Farben; eigene Abstände/Schatten später |
| Hardware-Menüs | WLAN/BT/Power/Audio-Route/Display | Globale Flächenfarben, Geräteaktionen bleiben hostgesteuert |
| Kindersicherung | versteckt/gesperrt, Zeitlimit, gesperrtes Medium | `error`/`warning`/`muted`; Sicherheitslogik nicht veränderbar |
| Community-App-Host | Vollbild, Header, Statussymbole, Theme-Hintergrund | `status.bar` und Hintergrund; CSS im App-Sandbox-Kontext bleibt eigenständig |
| Gallery/Fotobetrachter | Thumbnail, Fullscreen, Ladezustand, Slideshow | Allgemeines Farbschema; Galerie-Speziallayouts noch nicht separat |
| Malbuch/Spiele | Vollbild, interne Spielzustände, Abschluss | Native Host-Elemente nutzen Theme; Spieldesign ist App-eigen |
| Splashscreen/Boot | Theme-Splash, eigenes Bild, Splash-Designer | Bisheriger Splash-Designer; paketiertes `assets.splash` noch nicht angeschlossen |
| Bildschirmschoner/Ruhe | Inaktiv, laufende Wiedergabe, Screensaver | Host-Einstellungen; eigene Animationen noch nicht Teil der sicheren Theme-API |
| Admin UI | Einstellungen und Theme-Auswahl | **Absichtlich unabhängig** vom Kinder-/Player-Theme |

## Zustandsregeln

- **Normal, gedrückt, aktiv:** Akzent und Player-Zustandstokens, wenn vorhanden; sonst Basis-Theme.
- **Fokus:** `focus` und geerbte QML-Fokusdarstellung, Touchziele bleiben bedienbar.
- **Deaktiviert/gesperrt:** Der Host entscheidet, ob etwas bedienbar ist; Farben folgen globalen Semantiktokens.
- **Fehler/Offline/Warnung:** Zustandsfarben bleiben semantisch, damit ein Skin Warnungen nicht versteckt.
- **Fehlende Assets/ unbekannte Werte:** Der Host muss einen lesbaren Basiszustand anzeigen.

## Erweiterungsplan (nicht Bestandteil von v1)

Für tatsächlich frei veränderliche Layouts braucht der Host nach und nach: semantische Komponenten für Kategorie-Tabs, Coverflow, Listen, Suchfeld/Tastatur, Dialoge, Medienbadges, Galerie/Spiel-HUD; außerdem definierte Layout-Slots, eigene Icons und zustandsbezogene Motion-Tokens. Die Erweiterung erfolgt mit neuen API-Versionen und Hardware-/Lesbarkeits-Tests, **ohne beliebigen Qt- oder JS-Code**.

# Referenz: Theme API v1

**Quelle der Wahrheit im Host:** `internal/themepacks/manager.go` (Token-Allowlist und `componentTokens`); der SDK-Validator `tools/mupitheme.py` prüft dieselben Felder. Nicht auf nicht dokumentierte Variablen oder QML-Dateipfade zugreifen.

## 1. Manifest-Felder

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `apiVersion` | `"1"` (Pflicht) | Version des Paketvertrags |
| `kind` | `"theme"` (Pflicht) | Kein ausführbares App-Plugin |
| `id` | String (Pflicht) | Dauerhafte ID, z. B. `community.sternenreise`, maximal 100 Zeichen |
| `name` | String (Pflicht) | Sichtbarer Theme-Name, maximal 100 Zeichen |
| `version` | SemVer (Pflicht) | z. B. `1.0.0` |
| `extends` | integrierte Theme-ID (Pflicht) | Erbt fehlende Eigenschaften |
| `theme` | `"theme.json"` (Pflicht) | Theme-Daten im Paket-Root |
| `author` | String (optional) | Autor, maximal 100 Zeichen |
| `description` | String (optional) | Beschreibung, maximal 500 Zeichen |
| `license` | String (optional) | Lizenzkennung, maximal 100 Zeichen |
| `preview` | relativer Bildpfad (optional) | Paketbild unter `assets/` |

## 2. Palette und allgemeine Tokens

Alle Farben sind Strings im Format **`#RRGGBB`**, ohne CSS-Funktionen oder dynamischen Code. Zahlen sind echte JSON-Zahlen.

| Token | Zweck |
| --- | --- |
| `bg` | Grundfläche der Oberfläche |
| `status` | Hintergrund der Statusleiste |
| `panel` | Inhaltsflächen, Player-Fallback |
| `card` | Kartenhintergrund |
| `text` | Primärtext |
| `muted` | Sekundärtext |
| `heading` | Überschriften, Player-Titel |
| `accent` | Erster Akzent, aktive Elemente |
| `accentPressed` | Gedrückter Akzent |
| `accentText` | Text auf farbigem Akzent |
| `accent2` | Zweiter Akzent |
| `line` | Trennlinien und allgemeine Rahmen |
| `focus` | Fokus-Rahmen und aktive Karten |
| `success` | Erfolgszustände |
| `warning` | Warnungen |
| `error` | Fehler |
| `player` | Player-Hintergrund |
| `playerEdge` | Player-Rand |
| `statusEdge` | Statusleisten-Rand |
| `statusAccent` | Aktive Status-Symbole |
| `statusText` | Statusleisten-Text |
| `statusMuted` | Inaktive Status-Symbole |

## 3. Player-Tokens

| Token | Zweck |
| --- | --- |
| `control` | Hintergrund sekundärer Player-Buttons |
| `controlPressed` | Button gedrückt |
| `controlText` | Beschriftung/Symbole auf sekundären Buttons |
| `playAccent` | Primärer Play/Pause-Button |
| `playAccentPressed` | Primärer Button gedrückt |
| `playAccentText` | Symbol auf primärem Button |
| `progressTrack` | Unbespielter Fortschrittsbalken |
| `progressFill` | Gespielter Fortschritt |
| `progressThumb` | Schieberegler |
| `queueCard` | Warteschlangen-Karte |
| `queueActive` | Aktuelle Auswahl in der Queue |
| `queueActiveText` | Text auf aktiver Queue-Auswahl |

Alle Player-Farben sind optional und erhalten bei Nichtangabe den bisherigen Standard bzw. die geerbte Ableitung aus Panel/Akzent.

## 4. Formen, Schriften und zusätzliche Flags

| Token | Erlaubte Werte | Wirkung |
| --- | --- | --- |
| `radius` | 0–2 | Skalierung der Rundungen, 0 = eckig |
| `statusAlpha` | 0–1 | Deckkraft der Statusleiste |
| `statusBorderWidth` | 0–4 | Rahmenstärke der Statusleiste |
| `cardBorder` | 0–4 | Kartenrahmen |
| `statusShape` | `edge`, `floating`, `icons` | Statusleiste durchgehend/schwebend/Symbolkapsel |
| `statusShadow` | `none`, `soft`, `deep`, `glow` | Leisten-Schatten |
| `cardBorderStyle` | `line`, `alternating` | Kartenrahmenstil |
| `chromeStyle` | `default`, `glass`, `lcars`, `storybook` | Vorhandene Qt-Chrome-Variante |
| `light` | true/false | Helles Farbschema |
| `pixel` | true/false | Pixel-/Retro-Behandlung |
| `stripe` | true/false | Vorhandener Streifenakzent |
| `font` | Name (max. 80 Zeichen) | Schriftfamilie (lokal oder mitgeliefert) |
| `fallback` | Name (max. 80 Zeichen) | Ersatz-Schriftfamilie |

**Achtung:** Spezielle Chrome-Varianten und Dekorationen stammen weiterhin aus der NG-Implementierung. Das Paket kann vorhandene Varianten wählen, aber keine eigene ausführbare QML-Variante importieren.

## 5. Komponentenspezifische Overrides

`components` ist ein JSON-Objekt mit folgenden **exakten** Namen. Die letzte Spalte bezeichnet die erlaubten Property-Namen.

| Komponente | Eigenschaften |
| --- | --- |
| `status.bar` | `background`, `border`, `text`, `muted`, `accent`, `opacity`, `borderWidth`, `shape`, `shadow` |
| `media.card` | `background`, `borderWidth`, `borderStyle` |
| `player.surface` | `background`, `border`, `heading` |
| `player.progress` | `track`, `fill`, `thumb` |
| `player.transport` | `background`, `pressed`, `text`, `primary`, `primaryPressed`, `primaryText` |
| `player.queue` | `background`, `active`, `activeText` |
| `navigation.bar` | `gap`, `titleSize` |
| `navigation.back` | `radius` |
| `media.list` | `spacing`, `rowHeight`, `titleSize` |

Jede Komponenteneigenschaft wird auf ein bestehendes, semantisches Qt-Theme-Token abgebildet; z. B. `player.progress.fill` → `progressFill`. Dasselbe Token darf **nicht gleichzeitig** im globalen `tokens`-Objekt und in `components` definiert werden. Bei Konflikten weist der Installer das Theme ab, statt den Vorrang zu erraten.

### Beispiel

~~~json
{
  "tokens": {
    "bg": "#081528",
    "text": "#EDF8FF",
    "radius": 1.2,
    "accent": "#4DDFF2"
  },
  "components": {
    "player.progress": {
      "track": "#274765",
      "fill": "#4DDFF2",
      "thumb": "#FFFFFF"
    },
    "status.bar": {
      "shape": "floating",
      "opacity": 0.90
    }
  },
  "assets": {"background": "assets/background.png"}
}
~~~

## 6. Erweitertes Komponenten-Design: Abstände, Coverflow und Player

Die folgenden zusätzlichen Werte sind **abwärtskompatible, deklarative Erweiterungen** der Theme API v1. Sie steuern die native Qt-Quick-Oberfläche direkt; damit unterscheiden sie sich von reinen CSS-Vorschauen.

| Komponente | Eigenschaft | Token | Wertebereich | Standard |
| --- | --- | --- | --- | --- |
| `home.heading` | `size` | `homeHeadingSize` | 16–30 px | 19 |
| `home.heading` | `gap` | `homeHeadingGap` | 4–20 px | 8 |
| `home.card` | `spacing` | `homeCardSpacing` | 8–32 px | 14 |
| `player.cover` | `radius` | `playerCoverRadius` | 0–2 (Faktor) | wie `radius` |
| `media.coverflow` | `tiltDegrees` | `coverflowTiltDegrees` | 0–70° | 60 |
| `media.coverflow` | `overlap` | `coverflowOverlap` | 0–0,65 | 0,55 |
| `media.coverflow` | `sideScale` | `coverflowSideScale` | 0,7–1 | 0,82 |
| `media.coverflow` | `sideOpacity` | `coverflowSideOpacity` | 0,55–1 | 0,70 |
| `media.coverflow` | `snapMs` | `coverflowSnapMs` | 50–450 ms | 180 |
| `media.coverflow` | `cardRatio` | `coverflowCardRatio` | 0,65–1 | 0,8 |

Diese Werte wirken auf **beide** virtualisierten Coverflow-Ansichten (Kategorien und Spotify-Browser) sowie auf die Startkarten bzw. Player-Cover. Die normale horizontale Ansicht bleibt von den Coverflow-Werten unberührt. Der Abstand der Home-Karten bleibt vom Coverflow-Abstand getrennt.

Beispiel:

~~~json
{
  "components": {
    "home.heading": {"size": 22, "gap": 10},
    "home.card": {"spacing": 18},
    "player.cover": {"radius": 1.7},
    "media.coverflow": {
      "tiltDegrees": 50, "overlap": 0.45,
      "sideScale": 0.86, "sideOpacity": 0.80,
      "snapMs": 220, "cardRatio": 0.85
    }
  }
}
~~~

## 7. Deklarative Hintergrunddekorationen

`theme.json` unterstützt zusätzlich eine Liste `decorations`. Bis zu **32** Elemente werden auf einer **800×480-Logikfläche** vor der Kinderoberfläche und hinter deren Bedienelementen gezeichnet. Es gibt keine QML-/JavaScript-Ausführung und keine interaktiven Trefferflächen.

| Eigenschaft | Beschreibung | Grenzen |
| --- | --- | --- |
| `type` | `rect`, `ellipse` oder `image` | Pflicht |
| `x` / `y` | Linke obere Ecke im logischen 800×480-Koordinatensystem | x: −200…800; y: −200…480 |
| `width` / `height` | Breite und Höhe | 4…800 / 4…480 |
| `color` | Volltonfarbe bei `rect` und `ellipse` | `#RRGGBB`, Pflicht für diese Formen |
| `asset` | Paketierte Bilddatei bei `image` | PNG/JPEG/WebP unter `assets/`, maximal 3 MiB |
| `opacity` | Deckkraft | 0…0,8; Standard 0,25 |
| `rotation` | Drehwinkel | −180…180°, Standard 0 |

Zusätzlich höchstens **6 Bilddekorationen** je Theme. Das ist ein bewusstes Ressourcenlimit für Raspberry-Pi-Hardware.

~~~json
{
  "decorations": [
    {"type":"ellipse","x":620,"y":-80,"width":270,"height":270,"color":"#4DDFF2","opacity":0.09},
    {"type":"rect","x":50,"y":370,"width":600,"height":8,"color":"#8D8BFF","rotation":-4,"opacity":0.22},
    {"type":"image","x":715,"y":115,"width":65,"height":65,"asset":"assets/sparkle.png","opacity":0.50}
  ]
}
~~~

Bei einem vom Benutzer gewählten Hintergrundbild (`library` oder `custom`) werden diese Theme-Dekorationen nicht über die persönlichen Fotos gelegt. Startbild und Bildschirmschoner bleiben unabhängig. Die Dekorationen sind statisch; Animationen sind ein späterer API-Schritt.

## 8. Assets

| `assets`-Feld | Erlaubtes Format | Darstellung |
| --- | --- | --- |
| `background` | PNG, JPEG, WebP | Theme-Hintergrund, ideal 800×480 oder höher im 5:3-Format |
| `font` | TTF, OTF | Optionale eingebettete Font-Datei, passend zu `font` |
| `splash` | PNG, JPEG, WebP | Reserviert für die zukünftige Startup-Splash-Anbindung, in API v1 **noch nicht angewandt** |

`preview` im Manifest darf PNG, JPEG oder WebP sein. Für automatische Katalog-Vorschaubilder wird die Bilddatei mitinstalliert. Keine SVG-/CSS-/JavaScript-Dateien, keine externen Bild- oder Font-URLs.

**Wichtig:** Dokumentierte Optionen beziehen sich auf die zurzeit aktiv vom Host unterstützten Theme-Tokens. Eine Komponente, die hier nicht genannt ist, hat momentan keine unabhängige Theme-Eigenschaft. Das Inventar in [elements.de.md](elements.de.md) zeigt diese Grenzen explizit.

## 12. Navigation und vertikale Medienlisten

Die folgenden Theme-Komponenten ändern die **native Qt-Quick-Geometrie**. Touchflächen, Benutzerrechte und Navigation bleiben unter Kontrolle der NG.

| Komponente | Eigenschaft | Token | Wertebereich | Standard |
| --- | --- | --- | --- | --- |
| `navigation.bar` | `gap` | `navigationBarGap` | 4–18 px | 8 |
| `navigation.bar` | `titleSize` | `navigationTitleSize` | 14–29 px | 18 |
| `navigation.back` | `radius` | `navigationBackRadius` | 0–2, Faktor | wie Grund-Theme |
| `media.list` | `spacing` | `mediaListSpacing` | 4–24 px | 8 |
| `media.list` | `rowHeight` | `mediaListRowHeight` | 78–125 px | 78 (Kategorie) / 68 (Spotify-Browse, mit 10 px Versatz) |
| `media.list` | `titleSize` | `mediaListTitleSize` | 12–26 px | 15, bei vergrößerter UI 20 |

Beide vertikalen Listen verwenden dieselben Theme-Tokens, aber ihre bisherigen Standardhöhen werden beibehalten. In der horizontalen Ansicht und im Coverflow gelten eigene, unabhängige Geometrieregeln. Der Host stellt die Scrollbar-Touchflächen weiterhin sicher und kürzt zu lange Texte automatisch.

## 13. Eigene Icons – sieben sichere Aktions-Slots

Das optionale `icons`-Objekt ordnet erlaubten Aktionstypen **mitgelieferte PNG- oder WebP-Dateien** zu. Es kann weder andere Systemfunktionen ändern noch interaktiven QML-Code laden.

| Slot | Zweck |
| --- | --- |
| `navigation.back` | Zurück-Pfeil im gemeinsamen Kontext-Header |
| `player.play` | Startsymbol im Mini-/Voll-/Queue-Player und Galerie-Slideshow |
| `player.pause` | Pausensymbol |
| `player.previous` | Vorheriger Titel |
| `player.next` | Nächster Titel |
| `player.volume` | Lautstärke |
| `player.microphone` | Mikrofon und Karaoke |

Beispiel:

~~~json
{
  "icons": {
    "navigation.back": "assets/icons/back.png",
    "player.play": "assets/icons/play.png",
    "player.pause": "assets/icons/pause.png"
  }
}
~~~

**Grenzen:** maximal sieben Slots, nur geprüfte Pfade unter `assets/`, PNG/WebP und höchstens **512 KiB je Datei**. Empfohlen werden transparente quadratische Bilder in 128×128 px mit ausreichend Kontrast; diese Icons werden nicht nachgefärbt. Kann Qt ein Icon nicht laden oder ist kein Asset hinterlegt, erscheint **automatisch das eingebaute Vektorsymbol**. Touch- und Deaktivierungszustände werden weiterhin vom Host verarbeitet.

**Nicht themebar:** WLAN-, Bluetooth-, Akku-, Lüfter-, Fehler- und andere zustandsrelevante Systemanzeigen; auch das eigentliche Berechtigungs- und Navigationsverhalten ist ausdrücklich nicht austauschbar.

## 14. Eigene Themes direkt aus der Admin-Oberfläche exportieren

Unter **Box & Bedienung → Customizing → Eigenes Theme** gibt es **„Als Community-Theme (.mupitheme) exportieren“**. Der Nutzer vergibt einen Namen und eine eindeutige ID (zum Beispiel `community.mein-theme`); daraus erzeugt die NG eine vollständige ZIP-Datei aus `manifest.json` und `theme.json`.

Der Export verwendet **die gerade sichtbaren Editor-Werte**, auch wenn sie noch nicht gespeichert wurden. Enthalten sind Farben, Schriftwahl, Statusleistenform/-transparenz/-rahmen, Kartenrahmen und Rundungen. Die vorhandenen NG-Schriften werden beim späteren Import durch die vertrauenswürdige lokale Fontbibliothek aufgelöst, nicht als fremde Binärdateien verteilt.

**Nicht enthalten:** Zugangsdaten, Medien, Fotos, Geräteeinstellungen, eigene Splash-Bilder und nicht im Editor vorhandene erweiterte Optionen. Die neuen Icon-, Coverflow- und Dekorationswerte können anschließend im exportierten `theme.json` ergänzt werden. Vor der Veröffentlichung bitte Paketvalidator und Asset-Lizenzen prüfen.

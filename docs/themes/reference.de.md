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

## 6. Assets

| `assets`-Feld | Erlaubtes Format | Darstellung |
| --- | --- | --- |
| `background` | PNG, JPEG, WebP | Theme-Hintergrund, ideal 800×480 oder höher im 5:3-Format |
| `font` | TTF, OTF | Optionale eingebettete Font-Datei, passend zu `font` |
| `splash` | PNG, JPEG, WebP | Reserviert für die zukünftige Startup-Splash-Anbindung, in API v1 **noch nicht angewandt** |

`preview` im Manifest darf PNG, JPEG oder WebP sein. Für automatische Katalog-Vorschaubilder wird die Bilddatei mitinstalliert. Keine SVG-/CSS-/JavaScript-Dateien, keine externen Bild- oder Font-URLs.

**Wichtig:** Dokumentierte Optionen beziehen sich auf die zurzeit aktiv vom Host unterstützten Theme-Tokens. Eine Komponente, die hier nicht genannt ist, hat momentan keine unabhängige Theme-Eigenschaft. Das Inventar in [elements.de.md](elements.de.md) zeigt diese Grenzen explizit.

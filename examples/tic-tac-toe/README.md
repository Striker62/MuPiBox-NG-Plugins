# MuPi Kreuz & Kreis – Community-App

Ein vollständig offline laufendes Go/WebAssembly-Spiel auf einem 3×3-Raster für MuPiBox-NG.
Die Spielregeln bleiben in Go/WASM implementiert, der MuPi-Gegner läuft im
Browser-JavaScript und benutzt dieselben Go-Zugregeln.

## Modi

- **2 Spieler:** X gegen O auf derselben Box.
- **Leicht:** zufällige erlaubte Züge.
- **Normal:** überwiegend Minimax, aber gelegentlich zufällige Züge.
- **Schwer:** vollständiges Minimax; bei korrektem Spiel verliert MuPi nicht.

Die Übersetzung kommt über `sdk.getContext().language` aus der Box. Verfügbar:
Deutsch, Englisch, Französisch, Spanisch, Italienisch, Niederländisch, Schwedisch.
Im Browser ohne Host wird die Browser-Sprache verwendet; sonst Englisch als
Fallback für unbekannte Werte.

Touch: Feld antippen. Controller: Pfeiltasten, A setzt ein Feld, X schaltet
zwischen Modi um, B/Back schließt die App. Modi werden app-lokal gespeichert.

## Build

```bash
(cd examples/tic-tac-toe && go test ./game)
python3 tools/build_example.py
python3 tools/mupiapp.py validate dist/mupi-kreuz-kreis.mupiapp
```

Das gebündelte `wasm_exec.js` enthält einen Go-Laufzeit-Lizenzhinweis.
Quellcode: MIT, keine Drittanbieter-Grafiken oder -Sounds. Ein veröffentlichter
Katalog-Release muss seinen Hash nach dem Upload aktualisieren.

## Native Darstellung (NG alpha.34+)

Die Entwickler-Voreinstellungen sind im Manifest unabhängig wählbar:

- `display.background: "system"` übernimmt das vom Nutzer gewählte MuPiBox-Theme.
  Dafür müssen HTML, Body und vollflächige App-Container transparent bleiben.
  Die farbigen Spielfelder und das kleine Steuerpanel bleiben bewusst deckend.
- `display.background: "app"` erlaubt eine eigene, im Paket enthaltene
  Hintergrundgrafik in der HTML/CSS-Anwendung.
- `showBackButton` regelt die native Zurück-/Titelgruppe, `showSystemInfo`
  die Batterie-/WLAN-/Uhr-Anzeigen, `fullScreen` den reservierten oberen Rand.
  Diese Werte dürfen je App anders gesetzt werden.

Dieses Spiel wählt **Systemhintergrund**, **Vollbild**, **keine native Leiste**
und einen **eigenen gut erreichbaren Zurück-Button** (`MuPiBoxSDK.exit()`).
Die im Admin gesetzten Anzeige-Overrides der MuPiBox haben Vorrang vor den
App-Voreinstellungen. Das native Kartenbild ist unter `assets/cover.jpg`
und das dazugehörige Raster-Icon unter `assets/icon.png` abgelegt.

Beim Test ohne MuPiBox-Host liefert der Zurück-Button lediglich das sichere
SDK-Ereignis `preview.exit` statt den Browser ungefragt zu schließen.


## Transparentes Spielfeld vor dem MuPiBox-Theme (v0.2.4)

Die App nutzt weiterhin `display.background: system`. Die komplette
HTML-Seite (inkl. `html`, `body`, `.screen`) bleibt transparent. Auch
der großflächige Bereich `.info` hinter den Einstellungen hat jetzt
**keinen eigenen Hintergrund** mehr. Die neun Felder sind statt deckend
nur noch leicht dunkelblau getönt (27 % Deckkraft) und gerahmt. So bleibt
das vom Host gerenderte Theme-Wallpaper selbst durch die Spielfelder
sichtbar. Die Einzelbedienelemente Modusauswahl, Zurück und Neue Runde
bleiben zwecks Kontrast und Bedienbarkeit eigenständig gestaltet.

Technisch wichtig: Das MuPiBox-NG-Hostrelease muss den Theme-Hintergrund
auch **im sandboxed Browser-Frame** rendern (NG Alpha 41 und neuer). Die
App kann die Host-Komposition nicht selbst erzwingen; eine nominell
transparente HTML-Seite kann in älteren WebEngine-Versionen sonst
schwarz erscheinen. Keine zusätzliche Netzwerkberechtigung und keine
Änderung der Sandbox erforderlich.

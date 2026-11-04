# MuPi 4er-Reihe – Community-App

Eigenständig programmiertes Vierer-Reihe-Spiel für MuPiBox-NG (800×480 Touchscreen).
Keine Hasbro-/CONNECT-4-Marken, Grafiken, Sounds oder fremder Spielcode werden verwendet.

## Modi

- **2 Spieler** an derselben Box (X und O).
- **Leicht:** zufällige erlaubte Züge.
- **Normal:** erkennt unmittelbare Siege und Blockaden, danach eine bewusst
  begrenzte Positionsbewertung.
- **Schwer:** Minimax mit Alpha-Beta-Pruning (5 Halbzüge nach dem Kandidatenzug).
  Spielt deutlich stärker, ist aber nicht garantiert unbesiegbar.

Die Boxsprache wird über `MuPiBoxSDK.getContext().language` gelesen.
Unterstützt: `de`, `en`, `fr`, `es`, `it`, `nl`, `sv`.
Unbekannte Sprachen fallen auf Englisch zurück. Keine Internetverbindung nötig.

Touch: beliebige Stelle der Spalte antippen. Controller: ←/→ und A,
X wechselt den Spielmodus, B/Back schließt die App. Der Modus bleibt in
der app-eigenen Speicherberechtigung erhalten.

## Bauen und prüfen

```bash
python3 tools/build_four_in_a_row.py
python3 tools/mupiapp.py validate dist/four-in-a-row.mupiapp
node --test tests/test_board_games.js
```

Das Spiel nutzt eigenen JavaScript-Code, ein eigenes SVG-Icon und die MIT-lizenzierte
MuPiBox-SDK-Fassade. Es enthält keine Drittanbieter-Medien. Eine Veröffentlichung
im offiziellen App-Katalog erfordert zusätzlich einen geprüften GitHub-Release-Asset
und einen SHA-256-Eintrag; der Quellcode allein ändert den offiziellen Katalog nicht.

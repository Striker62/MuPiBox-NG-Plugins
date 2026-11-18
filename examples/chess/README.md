# MuPi Schach 0.1.4

Offline-Schach als unabhängige, touchscreenfreundliche Community-App für MuPiBox-NG.

- Zwei Personen auf einem Brett **oder** gegen MuPi mit vier Stärken (Anfänger, Leicht, Mittel, Schwer).
- Vollständige legale Züge einschließlich Rochade, en passant, Schachmatt, Patt, Umwandlung und Remisregeln.
- Eigene Zugzeit **je Spieler**, Durchschnitt der abgeschlossenen Züge und Zahl der Züge.
- Optional **15/30/60/120/300 Sekunden je Zug**, sonst unbegrenzt. Bei Zeitüberschreitung verliert der aktive Spieler, sofern ein Matt grundsätzlich möglich ist. Das Limit beginnt mit jedem Zug neu; der Zugwechsel setzt die Uhr zurück.
- Im KI-Modus kann die menschliche Farbe gewählt werden. Zurücknehmen setzt im Normalfall beide letzten Halbzüge zurück.
- Vollbild ohne native MuPiBox-Leiste, transparente Oberfläche für den **Theme-Hintergrund**. Eigener Pfeil oben links schließt die App über `MuPiBoxSDK.exit()`.
- 800×480 Landscape als Hauptziel. Touch: Figur/Zielfeld wählen. Controller: Pfeiltasten, A zum Wählen, B zum Abbrechen, X für Neustart, BACK zum Verlassen.
- Deutsche, englische, französische, spanische, italienische, niederländische und schwedische Oberfläche.
- Keine Server, CDN, Werbung, Telemetrie oder Internetzugriffe. Nur Berechtigung `controller`.

## Cover und Anzeige in der Spielebibliothek

Die App gehört zur Kategorie `games` und erscheint als **MuPi Schach**. Das separate `cover-clean-v2.jpg` bleibt die Kachel in der Spielebibliothek; es wird nicht als festes Schachbrett eingesetzt. Seit v0.1.4 gibt es stattdessen eine adaptive, komplett lokale Gold/Türkis-Neon-Oberfläche mit hochkontrastigen Spielfeldern, plastisch schattierten Unicode-Figuren und klaren Markierungen. Die MuPi-Dekoration `mascot-deco.png` wurde ausschließlich aus dem bestehenden Cover abgeleitet. `display.background: "app"` wählt diesen absichtlich gestalteten Hintergrund. Die Oberfläche ist für 800 × 480 optimiert und behält Touch, Controller, Tastatur, Sprachen und das vollständige Schach-Regelwerk bei. `showBackButton: false`, `showSystemInfo: false` und `fullScreen: true` verbergen die nativen Leisten; der eigene Zurück-Knopf nutzt weiterhin `MuPiBoxSDK.exit()`.

## Bauen und testen

```bash
python3 tools/build_chess.py
python3 tools/mupiapp.py validate dist/mupi-chess.mupiapp
node --test tests/test_chess.js
```

Der Builder bündelt die vorhandene öffentliche `sdk/mupibox-sdk.js`-Datei in das Paket. Der Code ist MIT-lizenziert und verwendet keine externe Schachbibliothek. Die KI ist eine lokal laufende, budgetierte Alpha-Beta-Suche, **keine** starke Stockfish-Engine. Schwierigkeit und Rechenzeit sind bewusst für Raspberry-Pi-Touchgeräte begrenzt. Uhren werden bei App-Pause und bei verborgenem Browser angehalten. Einstellungen starten eine neue Partie.

**Offizieller Katalog:** `community.mupi-chess` ist seit [Preview 0.10](https://github.com/splitti/MuPiBox-NG-Plugins/releases/tag/v0.1.0-preview.10) mit dem überprüften GitHub-Release-Asset `mupi-chess.mupiapp` im `catalog/apps.json` unter `games` enthalten. Die Prüfsumme stammt aus einem erneuten Download des tatsächlich veröffentlichten Pakets. Die MuPiBox muss den Katalog neu laden, damit die neue Kachel angezeigt wird.
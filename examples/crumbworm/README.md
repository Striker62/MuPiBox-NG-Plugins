# MuPi Krümelwurm

Eigenständiges, offline-fähiges Wurmspiel für die MuPiBox-NG. Drei Tempostufen
(leicht: 230 ms, normal: 150 ms, schwer: 95 ms je Spielschritt), Bonuskrümel
mit dreifacher Punktzahl, gespeicherter Rekord und eigene Garten-Grafiken.

## Bedienung

- **Touch auf 800×480:** Nur das Spielfeld und vier große Richtungspfeile.
  **Hoch** und **Runter** direkt links neben dem Spielfeld (übereinander);
  **Links** und **Rechts** darunter nebeneinander. Wischen auf dem Spielfeld
  lenkt weiterhin. Der erste Richtungstipp startet das Spiel in genau dieser
  Richtung, auch nach dem Spielende startet ein Pfeil eine neue Runde.
  Kurzes Tippen auf das Spielfeld startet/pausiert/setzt fort.
- **Zurück:** eigener Pfeil **←** oben links beendet die App über
  `MuPiBoxSDK.exit()`; er ersetzt die komplette native Back-/Titelleiste.
- **Controller:** Steuerkreuz lenkt, A/Start startet oder pausiert, X beginnt
  eine neue Runde, B/Back beendet das Spiel. Die Touch-Pfeile werden während
  der Controllerbedienung ausgeblendet; Touch am Spielfeld blendet sie wieder ein.
- **Tastatur:** Pfeile/WASD lenken, Leertaste/Enter startet/pausiert,
  R setzt zurück, Esc beendet, Zifferntasten 1/2/3 schalten die
  Geschwindigkeit um (leicht/normal/schwer). Eine Geschwindigkeitseinstellung
  auf dem Bildschirm ist bewusst entfernt, vorhandene Werte bleiben gespeichert.
- Keine Netzwerkzugriffe, keine Berechtigung außer `storage` und `controller`.

Die App liest die Sprache des Hosts mit `sdk.getContext().language`; ihre Texte
sind in de/en/fr/es/it/nl/sv gebündelt. Der Titel kann lokal übersetzt werden.
Das Spiel verwendet weder Originalcode noch Grafiken, Namen, Sounds oder
sonstige Assets eines existierenden Schlangenspiels.

### Build

```bash
python3 tools/build_crumbworm.py
python3 tools/mupiapp.py validate dist/crumbworm.mupiapp
node --test tests/test_crumbworm.js
```

Ein offizieller Katalogeintrag darf erst nach Veröffentlichung und Prüfung
eines vertrauenswürdigen GitHub-Release-Artefakts mit SHA-256-Hash ergänzt werden.


## Darstellung und Theme (ab 0.1.1)

Das optionale Manifest-`display` wird auf
`showBackButton: false`, `showSystemInfo: false`, `fullScreen: true`
und `background: "system"` gesetzt. Die eigene App-Oberfläche ist
**außerhalb des Spielfelds transparent**, damit die MuPiBox das vom Nutzer
gewählte Theme-Hintergrundbild darstellen kann. Es wird **kein eigenes
Wurm-Hintergrundbild** über das Theme gelegt. Die Spielfeldfläche selbst
bleibt kontrastreich dunkel, damit der Wurm gut sichtbar ist.

Der lokale Browser-Runner und die aktuelle NG-Hostversion müssen
Transparenz zulassen. Dafür gibt es einen separaten NG-Fix am
`CommunityWebView.qml`, der im Systemmodus keine deckende Fläche über
das ausgewählte Theme legt. Ohne diesen Host-Fix kann die MuPiBox zwar
die Theme-Farbe, nicht aber zwingend das Theme-Bild anzeigen.

**Wichtig:** Bereits gespeicherte Besitzer-Einstellungen zur
App-Darstellung im NG-Admin überschreiben das Manifest auch nach App-Updates.
Für das hier beschriebene Erscheinungsbild unter
Admin → Community-Apps → Installierte Apps → Darstellung & Integration
ggf. Back/Systeminformationen ausschalten, Vollbild einschalten und
Systemhintergrund wählen.

Weitere Prüfungen:

```bash
node --test tests/test_crumbworm.js tests/test_crumbworm_ui.js tests/test_board_games.js
python3 tools/build_crumbworm.py
python3 tools/mupiapp.py validate dist/crumbworm.mupiapp
```

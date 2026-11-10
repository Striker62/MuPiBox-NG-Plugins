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


## Vollbild und Zwei-Hand-Bedienung (v0.2.0)

- Host-Leiste im Paket vollständig deaktiviert: `showBackButton:false`,
  `showSystemInfo:false`, `fullScreen:true`; stattdessen linker eigener
  Exit-Button über das erlaubte `MuPiBoxSDK.exit()`. WICHTIG: Alte
  Admin-Darstellungsüberschreibungen werden durch App-Updates bewusst nicht
  zurückgesetzt; ggf. auf bestehenden Boxen dort anpassen.
- Touch auf 800×480: **Hoch/Runter** links *neben* der Leinwand,
  **Links/Rechts** unter der Leinwand *rechtsbündig*. Die zwei Steuergruppen
  sind voneinander getrennt und lassen sich beidhändig bedienen.
- Punktestand/Rekord liegen als kompaktes HUD direkt im Spielfeld statt in
  einer zusätzlichen Kopfzeile; das nutzbare Spielfeld bleibt so groß wie möglich.
- Unten links schaltet **NEON / GARTEN** die Darstellung. Der Gartenlook ist
  identisch zur bisherigen Version; der neue, komplett lokal gezeichnete
  Neon-Look hat dunkelblaues Raster, rot-blaue Leuchtkonturen und einen
  kantigen Wurm. Einmal gewählte Darstellung wird per `sdk.storage`
  app-lokal gespeichert, ohne Telemetrie/Netzzugriff.
- Die Spielregeln, Touch-Swipes, Controller und Geschwindigkeit bleiben gleich.

Regression: `node --test tests/test_crumbworm*.js` plus die
Packaging-/Manifest- und Vollbildintegrationstests.


## Lichtarena / Geschwindigkeitsstufen (v0.2.1)

Der zweite Skin zeichnet den Wurm vollständig in **elektrischem Blau,
Cyan und Weiß**. Kopf und Körper haben einen begrenzten Canvas-Glow und
helle Konturen, während die Futterkrümel rot-magenta bzw. goldgelb
leuchten. Das Raster behält rote Akzente; die klassische Gartengrafik
bleibt unverändert. Die Effekte sind rein lokal und benötigen keine
Netzwerk- oder neuen Medienberechtigungen. Canvas-Schatten werden vor
allen Spielfeld- und Farbarbeiten mit `save()/restore()` zurückgesetzt,
damit der Gartenmodus nicht unbeabsichtigt nachleuchtet.

Neben dem Designschalter gibt es nun einen Touch-Selector **Tempo**.
Die Stufen sind **Langsam** (230 ms), **Normal** (150 ms), **Schnell**
(95 ms) und **Turbo** (70 ms) pro Zug. Bestehende gespeicherte Werte
`easy`, `normal`, `hard` bleiben gültig, `turbo` kommt neu hinzu.
Eine Änderung während der Partie stellt die Ticker-Rate sofort um,
bleibt bei erneutem App-Start über `sdk.storage` gespeichert und
gilt gleichermaßen für Garten und Neon. Die Tastenkürzel 1/2/3/4
bleiben ohne Touch nutzbar; die Optionen und Beschriftungen sind in
allen sieben unterstützten Sprachen lokalisiert.

Die Positionen der Zwei-Hand-Steuerung und die 800×480-Vollbildansicht
bleiben erhalten. Der Ausstieg bleibt innerhalb der App über den
eigenen Zurück-Button möglich.

# MuPi Krümelwurm

Eigenständiges, offline-fähiges Wurmspiel für die MuPiBox-NG. Drei Tempostufen
(leicht: 230 ms, normal: 150 ms, schwer: 95 ms je Spielschritt), Bonuskrümel
mit dreifacher Punktzahl, gespeicherter Rekord und eigene Garten-Grafiken.

## Bedienung

- Touch: große Richtungstasten und Wischgesten auf dem Spielfeld
- Controller: Pfeile zum Lenken, A für Start/Pause, X für neue Runde, B/Back für Ende
- Tastatur: Pfeile/WASD, Leertaste/Enter für Start/Pause, R für Neustart
- Keine Netzwerkzugriffe, keine Berechtigung außer `storage` und `controller`

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

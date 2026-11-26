# Admin Audio Test (NG Alpha 87+)

Eigenständiges, nicht im offiziellen Katalog veröffentlichtes Beispiel.
Es verändert keine Bücherkiste-Installation und speichert ausschließlich unter
`CommunityApps/community.admin-audio-demo/books/testbuch/`.

Aus dem Repository-Hauptordner:

```sh
python3 tools/mupiapp.py pack examples/admin-audio-recording-demo dist/admin-audio-demo.mupiapp --exclude README.md
python3 tools/mupiapp.py validate dist/admin-audio-demo.mupiapp
```

Paket im NG-Admin unter Community-Apps hochladen, aktivieren, `shared-assets`
und die separaten Admin-Rechte (insbesondere `admin.audio.record`) freigeben.
**App-Verwaltung öffnen** → Mikrofone suchen → Gerät/Seite wählen → Aufnehmen →
im vertrauenswürdigen MuPiBox-Dialog bestätigen → Stoppen & speichern → Anhören.
Der Browser benötigt HTTPS/localhost; ein ALSA-Mikrofon an der Box nicht.
Aufnahmen können über den letzten Button in den Papierkorb verschoben werden.
Die Demo hält die letzte Aufnahme im Seitenspeicher; nach Neuladen bleiben die
Dateien erhalten, der letzte Eintrag wird aber nicht automatisch wieder geladen.
Sie demonstriert absichtlich keine Kinder-App-Wiedergabe.
Physische Mikrofontests stehen noch aus.

[SDK-Anleitung und Grenzen](../../docs/community-admin-audio-recording.md)

# Projektstand – MuPiBox-NG Community-Apps

Stand: 2026-11-09. Diese Datei ist eine Übergabehilfe für neue Entwicklungs-Chats, **keine** Alternative zum tatsächlichen Quellcode. Vor Änderungen immer die aktuellen Dateien im Fork lesen.

## Repository und Zusammenarbeit
- Fork: `Striker62/MuPiBox-NG-Plugins`; Upstream: `splitti/MuPiBox-NG-Plugins`.
- GitHub ist die maßgebliche Quelle für eingecheckte Versionen. Nicht eingecheckte lokale Teststände gesondert abgleichen.
- Vor jeder Änderung: Fork/Upstream vergleichen, `AGENTS.md`, `ai.md`, SDK-Dokumentation und betroffene App-Dateien lesen.
- Bestehende Änderungen anderer Mitwirkender nicht überschreiben; neue Arbeit möglichst auf separatem Branch/PR.
- Zum lokalen Test eine validierte `.mupiapp` aus dem jeweiligen App-Verzeichnis bauen, **nicht** das gesamte Repository-ZIP umbenennen.
- Neue Version erst nach lokalem Test und Freigabe als stabil betrachten.

## FotoSpaß
- Pfad: `examples/fotospass/`; App-ID: `community.fotospass`.
- **Version im GitHub-Manifest bei Erstellung dieser Datei:** `0.4.2`. Vor Weiterarbeit neu prüfen.
- Web-App mit Kamera-Vorschau, Countdown, Malen/Radierer, Touch-Accessoires, Foto-Speichern und Galerie inklusive Löschen.
- Testgerät: Raspberry Pi 4 mit eMeet C960 und 800×480-Touchdisplay.
- Manifest-Berechtigungen: `camera`, `photo-save`.
- Entwickler hat Änderungen vorgenommen: vor neuen Funktionen zuerst aktuelle Implementierung und Commit-Diff prüfen.
- Ideen/offene Punkte: weitere Accessoire-Kategorien, eigene Accessoires; Leistung des Raspberry Pi 4 schonen. Druck über Canon SELPHY CP1500 nur mit geeigneter Host-Schnittstelle.
- Bekannte frühere Schwierigkeiten beim Speichern und bei Accessoire-Pfaden; **nicht** ungeprüft als Fehler der aktuellen Version einstufen.
- Offizieller Paketbefehl laut App-README:
  `python3 tools/mupiapp.py pack examples/fotospass dist/fotospass.mupiapp --exclude README.md`

## Bücherkiste
- Pfad: `examples/Buecherkiste/`; App-ID: `community.buecherkiste`.
- **Version laut README bei Erstellung:** `0.2.19`. Vor Weiterarbeit Manifest und Commits prüfen.
- Offline-Bilderbuch-App; lokale Bücher mit Cover, Regalen und Leseansicht.
- Im bisherigen Stand sind eigene Bücher im installierten App-Verzeichnis nicht updatefest; vor Updates sichern.
- Die Rücknavigation zur MuPiBox-Oberfläche war als SDK-abhängige Verbesserung offen.
- Neue SDK-Funktion `shared-assets` und Zugriff auf eigenen SMB-Unterordner `CommunityApps/<App-ID>` vor Implementierung anhand der aktuellen Dokumentation und Host-Unterstützung prüfen. Nicht als bereits implementiert annehmen.

## Arbeitsregeln für neue Chats
1. App und gewünschte Funktion/Fehler benennen.
2. Aktuellen GitHub-Stand (Manifest, Quellcode, letzte Commits, SDK) lesen.
3. Vorhandene Änderungen bewahren; nur gezielte Anpassungen vornehmen.
4. Für Tests ein vollständiges, korrekt gepacktes `.mupiapp` bereitstellen, soweit technisch möglich.
5. Nach Test: Ergebnis, Versionsnummer und relevante Entscheidungen im `DEVELOPMENT_LOG.md` dokumentieren.
6. Bei Codeausgabe vollständige Dateien statt einzelner Code-Fragmente bevorzugen.
7. Keine Bilder generieren, wenn Code, Paket oder Erklärung angefordert wurde.

## Abgrenzung
Der eigenständige Flask-/Music-Assistant-Webplayer ist nicht automatisch Teil dieses Plugin-Repositories. Seine Versionen und Änderungen getrennt verwalten.

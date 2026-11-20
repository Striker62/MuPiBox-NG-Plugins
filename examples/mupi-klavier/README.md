# MuPi Klavier

## Screenshots (800 × 480)

Die Aufnahmen zeigen die **tatsächlich laufende Web-App** im Chromium-Browser
mit simuliertem MuPiBox-SDK. Die dargestellten Noten und Tasten stammen aus
der App; es handelt sich nicht um Design-Mockups oder Aufnahmen vom Raspberry Pi.

### Frei spielen

![MuPi Klavier – Frei spielen mit hervorgehobener Taste E4](screenshots/frei-spielen.png)

### Notenblatt

![MuPi Klavier – Notenblatt mit Violinschlüssel und hervorgehobener G4-Taste](screenshots/notenblatt.png)

### Fallende Noten

![MuPi Klavier – Fallende Noten mit Xylophon und hervorgehobener G4-Taste](screenshots/fallende-noten.png)

Screenshots erneut erstellen (Chromium erforderlich, aus dem Repository-Wurzelverzeichnis):

```bash
python3 tools/capture_mupi_klavier_screenshots.py
```

Die Screenshots liegen direkt bei der Anwendung unter `examples/mupi-klavier/screenshots/`.
Sie gehören zur Dokumentation und **nicht** zum installierbaren `.mupiapp`-Paket.

Eigenständige Community-App unter Lernen, optimiert für 800×480 (5 Zoll).
Freies Spielen, fallende Noten mit Wartefunktion und horizontaler Notenausschnitt.
Vorspielen, Tempo, sieben Instrumente, relative Lautstärke inklusive Stumm.
Eine Oktave C4–C5 mit deutschen Notennamen. Touch, A–K am PC sowie Controller
Links/Rechts/A; Zurück/B beendet die App. Fortschritt bleibt beim Ansichtswechsel erhalten.
Audio-, Speicher- und Controller-Berechtigung werden über den Host freigegeben.
Keine privaten Core-Quellen oder Bilder übernommen. Die drei traditionellen
Melodien sind eigene Transkriptionen gemeinfreier Melodien; kein Liedtext enthalten.
Notenwerte sind eine einfache Lernhilfe, kein vollständiger Notensatz.
Oberfläche ab 0.1.1: dunkles MuPi-Design mit kontrastreichen Tasten, vergrößerten Zielnoten, skalierbarer Notenanzeige, aus Canvas gezeichnetem Notenschlüssel und integriertem MuPi-Symbol mit genau drei Kiemenästen je Seite. Die bisherigen Spielmodi, Songs, Instrumente und Controller-Tasten bleiben unverändert.
Notenschlüssel: gemeinfreie SVG-Vorlage von Handige Harry, Wikimedia Commons (Music_ClefG.svg, PD-self), ohne Notenlinien; wird direkt als Vektorgrafik gerendert. Der MuPi-Kopf erscheint nicht mehr in der Steuerleiste.
Cover ab 0.1.2: freigegebenes MuPi-Klavier-Motiv mit je drei Kiemenästen pro Kopfseite; im Paket enthalten als assets/cover.jpg (832×650) und assets/icon.png (192×192), damit Qt und Admin dasselbe Motiv verwenden können.
Build: python3 tools/build_mupi_klavier.py
Browseransichten bei 800×480 für Freispiel, Notenblatt und fallende Noten geprüft.
Hardwaretest auf Raspberry Pi / 5-Zoll-Touchscreen steht aus.
Lizenz: wie das Repository (MIT).

Prüfungen: Python-Tests (inklusive Screenshot-Prüfungen), 2 Musiklogik-Tests,
Chromium bei 800×480: 13 Tasten, Layout ohne Überlauf, richtige/falsche Note,
Ansichtswechsel, Neustart und Vorspielen/Stopp mit simuliertem Host geprüft.
Browserprobe: tests/piano_browser_probe.html in .build/mupi-klavier/ kopieren
und per Chromium --headless --window-size=800,480 --dump-dom ausführen.
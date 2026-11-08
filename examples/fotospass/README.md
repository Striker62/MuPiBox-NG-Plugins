# FotoSpaß – MuPiBox-NG Plugin

FotoSpaß ist ein kindgerechtes Fotobox-Plugin für MuPiBox-NG.

## Funktionen

- Live-Vorschau über die offizielle Kamera-API
- Fotoaufnahme mit Countdown (3, 5 oder 10 Sekunden)
- Bilder mit Farben und Radierer bearbeiten
- Accessoires wie Brillen, Hüte, Kronen und Tierohren hinzufügen
- Accessoires per Touch verschieben und skalieren
- Fertige Fotos über die MuPiBox-Foto-API speichern
- Galerie mit Vorschaubildern und Großansicht
- Einzelne Fotos mit Sicherheitsabfrage löschen

## Hardware

Getestet mit Raspberry Pi 4, eMeet C960 USB-Webcam und 800 × 480-Touchdisplay.

## Installation

Das Plugin kann aus dem Community-App-Katalog installiert werden. Für ein lokales Paket müssen die reinen Repository-Dokumente ausgeschlossen werden, weil der NG-Installer nur unterstützte Web-Runtime-Dateitypen zulässt:

```bash
python3 tools/mupiapp.py pack examples/fotospass dist/fotospass.mupiapp --exclude README.md
```

Das Paket kann anschließend über die Entwicklerfunktion der MuPiBox-NG-Pluginverwaltung installiert werden.

## Version

0.4.2

## Geplante Erweiterung

Direkter Fotodruck, beispielsweise über einen Canon SELPHY CP1500. Dafür wird eine geeignete Druckschnittstelle in MuPiBox-NG benötigt.

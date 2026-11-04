# MuPiBox-NG Plugins

**Unabhängige Apps für MuPiBox-NG – ohne Zugriff auf das private Haupt-Repository.**

Dieses öffentliche Repository enthält einen **Entwurf der App-API v1**, ein SDK für Web-Apps, das Paketformat `.mupiapp`, einen Validator und drei eigenständige Community-Spiele: **MuPi Kreuz & Kreis** (Go/WebAssembly), **MuPi 4er-Reihe** und **MuPi Krümelwurm** (HTML/JavaScript).

> **Status: Developer Preview.** Seit **MuPiBox-NG 0.2.0-alpha.18** steht der webbasierte Plugin-Manager im Adminbereich zur Verfügung. Installation und isolierter Browser-Test von `.mupiapp`-Paketen sind möglich. Die native Qt-Touch-Laufzeit, vollständiger Audiofokus und ein signierter Plugin-Katalog fehlen noch; ältere NG-Versionen haben keinen Plugin-Manager.

## Für Entwickler

Voraussetzungen: Python 3.10+, Go 1.24+ (für das Go-Beispiel; das SDK selbst benötigt kein Go).

```bash
# Repo klonen
git clone https://github.com/splitti/MuPiBox-NG-Plugins.git
cd MuPiBox-NG-Plugins

# MuPi Kreuz & Kreis bauen und als .mupiapp packen
python3 tools/build_example.py

# Paketinhalt und Manifest sicherheitstechnisch prüfen
python3 tools/mupiapp.py validate dist/mupi-kreuz-kreis.mupiapp

# Lokal im Browser ausprobieren (noch kein Host-API-Zugriff)
cd .build/tic-tac-toe && python3 -m http.server 8080
# http://localhost:8080
```

Eine eigene HTML-/JavaScript-App kann ohne Go entwickelt werden. Sie benötigt ein `manifest.json`, einen lokalen HTML-Einstiegspunkt und alle Dateien im Paket:

```bash
python3 tools/mupiapp.py pack ./meine-app ./dist/meine-app.mupiapp
```

## Inhalt

- [`docs/manifest-v1.md`](docs/manifest-v1.md) – App-Paketvertrag und Versionierung
- [`docs/architecture.md`](docs/architecture.md) – Host-Integration, Berechtigungen und Sicherheit
- [`docs/quickstart.md`](docs/quickstart.md) – Eigene App entwickeln
- [`schema/manifest-v1.schema.json`](schema/manifest-v1.schema.json) – JSON-Schema
- [`sdk/mupibox-sdk.js`](sdk/mupibox-sdk.js) – öffentlicher JavaScript-SDK-Entwurf
- [`examples/tic-tac-toe`](examples/tic-tac-toe) – **MuPi Kreuz & Kreis** (Go/WASM, stabile Legacy-App-ID)
- [`examples/four-in-a-row`](examples/four-in-a-row) – **MuPi 4er-Reihe**
- [`examples/crumbworm`](examples/crumbworm) – **MuPi Krümelwurm**
- [`docs/release-checklist.md`](docs/release-checklist.md) – **Pflichtprüfung vor Veröffentlichung der Spiele**
- [`tools/mupiapp.py`](tools/mupiapp.py) – Packen und Validieren

## Leitlinien

1. Plugin-Entwickler bekommen **keinen Zugriff** auf den Quellcode, die API-Schlüssel oder das Dateisystem des MuPiBox-NG-Kerns.
2. Jedes App-Paket deklariert seine benötigten Berechtigungen; **eine Manifestdeklaration ist keine Sicherheitsisolation**.
3. V1 setzt auf statische Web-Apps/WASM. Native Prozesse (Go/Python) brauchen ein gesondertes Sicherheitsdesign und sind **nicht Teil von V1**.
4. Neue Host-Funktionen werden nach API-Version eingeführt. Die App-Laufzeit entscheidet, welche APIs verfügbar sind.
5. Apps und SDK sind unabhängig vom proprietär lizenzierten MuPiBox-NG-Kern.

## Community-Spiele (noch nicht als Update freigegeben)

Die drei neuen Spielversionen übernehmen `getContext().language` aus der Box
(de, en, fr, es, it, nl, sv), unterstützen Touch und Controller und benötigen
keine externe Online-API. **Die neue Veröffentlichung im offiziellen App-Katalog
ist bis zum Abschluss von [Release-Checkliste und Markenprüfung](docs/release-checklist.md)
gesperrt.** Der derzeitige Katalogeintrag des bestehenden Spiels zeigt weiterhin
den früher veröffentlichten Stand; er wird erst gemeinsam mit dem neuen
verifizierten Release-Asset umgestellt.

## Mitmachen

Siehe [CONTRIBUTING.md](CONTRIBUTING.md) und [SECURITY.md](SECURITY.md). Dieses Repository ist unter der [MIT-Lizenz](LICENSE) veröffentlicht; externe Apps dürfen eine **eigene** Lizenz haben und müssen nicht in dieses Repo aufgenommen werden.

**Offizielle Projektseite:** https://github.com/splitti/MuPiBox-NG (privates Hauptrepository; für Plugin-Entwickler nicht notwendig).

## Erste bestehende App als Plugin-Prototyp: Klang-Memory

Eine unabhängige Klang-Memory-Testversion liegt in `examples/klang-memory/`. Sie lässt sich mit `python3 tools/build_klang_memory.py` als `.mupiapp` verpacken. Die Browser-Version **ersetzt nicht** die bisherigen QML-Apps (Klang-Memory, Piano, Malbuch oder Cover-Memory). **MuPi und die verlorenen Noten bleibt im NG-Kern.** Audiofokus und native Touch-Laufzeit sind noch nicht integriert.

## Entwickleranleitungen und Beiträge

- [English plugin guide: build, use and submit via Pull Request](GETTING_STARTED.en.md)
- [AI coding instructions (Claude, ChatGPT, Codex, etc.)](ai.md)
- [Contributing](CONTRIBUTING.md)

Webbasierter Plugin-Manager ab **[MuPiBox-NG 0.2.0-alpha.18](https://releases.mupibox.de/releases/0.2.0-alpha.18/release-notes.txt)**. MuPi und die verlorenen Noten bleibt im NG-Kern.

## Offizieller App-Katalog

Ab **NG 0.2.0-alpha.19** können Nutzer Apps direkt aus dem gepflegten [Katalog](catalog/apps.json) im Admin installieren können; der manuelle Upload bleibt für Entwickler. Neue Apps werden über ein geprüftes [Pull Request-Verfahren](catalog/README.md) eingereicht und erst nach Review als offizielles, mit SHA-256 überprüftes GitHub-Release aufgenommen.

## Klang-Memory 0.1.1 – Ton auf dem Touchdisplay

Mit NG **0.2.0-alpha.22** oder neuer nutzt Klang-Memory die neue, berechtigungsgeprüfte `MuPiBoxSDK.audio.playNote()`-Schnittstelle. Die Töne gehen direkt an die MuPiBox-PipeWire-Ausgabe; der in die Box integrierte Browser benötigt dafür keinen eigenen PulseAudio-Ausgang. Der App-Bildschirm ist auch für das Touchdisplay mit oberer MuPiBox-Leiste optimiert. Die aktualisierte App erscheint als **Update** im offiziellen Katalog.

## Lautstärke pro App und USB-Webcam (NG alpha.23+)

Klang-Memory **0.1.2** hat nun ein eigenes Ton-Einstellungsmenü mit Lautstärkeregler und Probeton. Die Einstellung wird pro App gespeichert und bleibt unter der MuPiBox-Lautstärkebegrenzung.

Das neue SDK erlaubt per `camera`-Berechtigung USB-Webcams. Ein Beispiel `Webcam-Vorschau` ist als experimentelle, lokal begrenzte Kamera-App verfügbar. Vor jeder Nutzung muss direkt am Touchdisplay eine zweite Freigabe bestätigt werden; ein roter Hinweis zeigt den Kamerabetrieb und bietet sofortiges Stoppen. Fotos werden nicht automatisch gespeichert oder hochgeladen. Auf Box 85 war bisher keine USB-Kamera angeschlossen, weshalb ein echter Hardwaretest noch aussteht.

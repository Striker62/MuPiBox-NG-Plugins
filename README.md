# MuPiBox-NG Plugins

**Unabhängige Apps für MuPiBox-NG – ohne Zugriff auf das private Haupt-Repository.**

Dieses öffentliche Repository enthält einen **Entwurf der App-API v1**, ein SDK für Web-Apps, das Paketformat `.mupiapp`, einen Validator, vier eigenständige Community-Spiele (**MuPi Kreuz & Kreis**, **MuPi 4er-Reihe**, **MuPi Krümelwurm**, **MuPi Schach**) sowie die Community-Fotobox **FotoSpaß**.

> **Status: Developer Preview.** Seit **MuPiBox-NG 0.2.0-alpha.18** steht der webbasierte Plugin-Manager im Adminbereich zur Verfügung. Installation und isolierter Browser-Test von `.mupiapp`-Paketen sind möglich. Native Qt-Touch-Apps und der offizielle, geprüfte App-Katalog sind inzwischen verfügbar. Vollständiger Audiofokus und unabhängige Publisher-Signaturen fehlen weiterhin; ältere NG-Versionen haben keinen Plugin-Manager.

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

# Browser-Vorschau: siehe docs/quickstart.md (ohne Host-API-Zugriff)
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
- **MuPi Kreuz & Kreis** – Go/WASM (stabile interne App-ID; Quellcode unter [`examples/`](examples/))
- **MuPi 4er-Reihe** – Quellcode unter [`examples/`](examples/)
- [**MuPi Krümelwurm**](examples/crumbworm)
- [**MuPi Schach**](examples/chess) – Offline-Schach für zwei Personen oder gegen vier lokale MuPi-KI-Stärken, Zugstatistiken und optionales Zeitlimit pro Zug
- [FotoSpaß](examples/fotospass) – Community-Fotobox mit Kamera, Bearbeitung und lokaler Galerie
- [`docs/release-checklist.md`](docs/release-checklist.md) – Technische Prüfschritte vor Veröffentlichungen
- [Community-Beitragende](CONTRIBUTORS.md) – Zuordnung und Prüfung externer Beiträge
- [`tools/mupiapp.py`](tools/mupiapp.py) – Packen und Validieren

## App-Darstellung und eigener Zurück-Button (NG alpha.30+)

Jede Community-App kann über ihr `manifest.json` vorschlagen, **in welchem Menü** sie erscheint und **welche MuPiBox-Elemente** auf dem Touchdisplay sichtbar bleiben: Zurück-Schaltfläche mit Titel, Systeminformationen, Vollbild und Hintergrund. Eltern bzw. Administratoren können diese Vorgaben **für jede installierte App einzeln überschreiben**; die Einstellungen bleiben bei Updates erhalten.

Verzichtet eine App auf die native Zurück-Schaltfläche, sollte sie ihren eigenen gut erreichbaren Button mit `window.MuPiBoxSDK.exit()` anbieten. Die vorhandene Einstellung `showBackButton` blendet derzeit die ganze linke Gruppe aus **Zurück + Titel** aus; ein separates `showTitle` gibt es noch nicht.

**Für Entwickler:** [Manifest-Felder und Beispielcode](docs/manifest-v1.md#native-app-appearance-and-navigation-ng-020-alpha30) · [Englische Schritt-für-Schritt-Anleitung](GETTING_STARTED.en.md#integrate-with-the-native-mupibox-interface-ng-alpha30).

## Bücherkiste und FotoSpaß: SMB-Assets (Host-Entwicklung)

Neue Community-Apps können mit der optionalen, bei Installation zu
bestätigenden Berechtigung `shared-assets` ausschließlich ihre eigenen
Verzeichnisse der bestehenden MuPiBox-SMB-Freigabe lesen:
`CommunityApps/<App-ID>/`. Für Bücherkiste sind darunter z. B.
`books/Ole/book.json`, für FotoSpaß
`accessoires/baerte/`, `accessoires/brillen/` und `accessoires/huete/`
vorgesehen. `MuPiBoxSDK.shared.list()`, `shared.read()` und
`shared.watch()` liefern Verzeichnislisten, Datei-Blobs und
Änderungserkennung (Polling). Kein direkter Pfad-/SMB-Zugriff und keine
Schreibmöglichkeit. **Vor Benutzung muss eine NG-Version mit der neuen
Host-Berechtigung veröffentlicht und installiert sein.**

Details, Sicherheitsgrenzen und Beispiele: [Manifest-Dokumentation](docs/manifest-v1.md#shared-smb-folders-for-owner-managed-app-content-host-development).

## App-Hintergrund und Bilder für die Kategorien (NG alpha.34+)

Die Auswahl **„Hintergrund aus der App (HTML/CSS)“** im NG-Admin legt
**keinen Uploadordner** fest. Ein App-Hintergrund gehört direkt ins
`.mupiapp`-Paket, etwa `assets/background.jpg`, und wird in der eigenen
`style.css` mit `background: url("./assets/background.jpg") center/cover`
eingebunden. Sichtbar ist er **nur innerhalb der laufenden App**.
Für den MuPiBox-Theme-Hintergrund `display.background: "system"` wählen
und `html/body` transparent halten.

Die **Kachelbilder auf der MuPiBox-Startseite** sind etwas anderes:
Mit `"cover": "assets/cover.png"` im Plugin-Manifest bekommt die
App ein individuelles Kachelbild. Erlaubt sind PNG/JPEG/WebP (empfohlen
quadratisch, ca. 512×512). Ohne dieses Feld verwendet NG zuerst ein
rasterbasiertes App-Icon oder automatisch passende Illustrationen für
Kreativ, Lernen, Werkzeuge und Weitere Apps. SVG-Icons bleiben für
Browser/Metadaten zulässig, werden aber auf der Qt-Touchoberfläche
nicht als verlässliche Kachelbilder vorausgesetzt.

**Für Entwickler und KI-Assistenten:** [genaue Regeln und Beispiel mit CSS](docs/manifest-v1.md#app-wallpaper-versus-native-menu-tile-image-ng-020-alpha34),
[englische Entwickleranleitung](GETTING_STARTED.en.md) und [AI-Anleitung](ai.md).

## Leitlinien

1. Plugin-Entwickler bekommen **keinen Zugriff** auf den Quellcode, die API-Schlüssel oder das Dateisystem des MuPiBox-NG-Kerns.
2. Jedes App-Paket deklariert seine benötigten Berechtigungen; **eine Manifestdeklaration ist keine Sicherheitsisolation**.
3. V1 setzt auf statische Web-Apps/WASM. Native Prozesse (Go/Python) brauchen ein gesondertes Sicherheitsdesign und sind **nicht Teil von V1**.
4. Neue Host-Funktionen werden nach API-Version eingeführt. Die App-Laufzeit entscheidet, welche APIs verfügbar sind.
5. Apps und SDK sind unabhängig vom proprietär lizenzierten MuPiBox-NG-Kern.

## MuPi Schach (0.1.0 – Quellcode/Preview)

`python3 tools/build_chess.py` baut das eigenständige, vollständig offline spielbare Schach inklusive lokalem Computergegner und einer Zugzeit-Uhr. Der Host-Theme-Hintergrund bleibt sichtbar, native Header-/Systemelemente sind ausgeblendet; ein eigener Pfeil verlässt das Spiel. Technische Details und Tests: [examples/chess/README.md](examples/chess/README.md). Aufnahme in den offiziellen Katalog erst mit geprüftem Release-Artefakt und SHA-256.

## Community-Spiele

Die Spiele übernehmen `getContext().language` aus der Box (de, en, fr, es, it, nl, sv), unterstützen Touch und Controller und benötigen keine externe Online-API. Versionen im offiziellen App-Katalog werden erst nach technischem Review, Paketprüfung und Kontrolle der veröffentlichten SHA-256 bereitgestellt.

## Mitmachen

Siehe [CONTRIBUTING.md](CONTRIBUTING.md) und [SECURITY.md](SECURITY.md). Dieses Repository ist unter der [MIT-Lizenz](LICENSE) veröffentlicht; externe Apps dürfen eine **eigene** Lizenz haben und müssen nicht in dieses Repo aufgenommen werden.

**Offizielle Projektseite:** https://github.com/splitti/MuPiBox-NG (privates Hauptrepository; für Plugin-Entwickler nicht notwendig).

## Erste bestehende App als Plugin-Prototyp: Klang-Memory

Eine unabhängige Klang-Memory-Testversion liegt in `examples/klang-memory/`. Sie lässt sich mit `python3 tools/build_klang_memory.py` als `.mupiapp` verpacken. Die Browser-Version **ersetzt nicht** die bisherigen QML-Apps (Klang-Memory, Piano, Malbuch oder Cover-Memory). **MuPi und die verlorenen Noten bleibt im NG-Kern.** Vollständiger Audiofokus bleibt in Entwicklung; die native Qt-Touch-Laufzeit steht inzwischen zur Verfügung.

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

## Community-Fotobox: FotoSpaß 0.4.2

[FotoSpaß](examples/fotospass) wurde von [@Striker62](https://github.com/Striker62) mit [Pull Request #4](https://github.com/splitti/MuPiBox-NG-Plugins/pull/4) beigesteuert. Die App bietet einen lokalen Webcam-Fotomodus, Countdown, Malen, Accessoires und eine Foto-Galerie mit Einzelbildlöschung. Berechtigungen: `camera` und `photo-save`, **kein** `network`. Die Kamera erfordert die Freigabe am Gerät, die lokale Speicherung die explizite Foto-Berechtigung. Weitere Details und Prüfnachweis: [CONTRIBUTORS.md](CONTRIBUTORS.md).

Die Aufnahme des Quellcodes in `main` ist **keine** Aufnahme in den offiziellen App-Katalog. Erst ein geprüftes, veröffentlichtes `.mupiapp`-Paket mit kontrollierter SHA-256 darf dort eingetragen werden. Die internen Ordner-/App-IDs älterer Spiele bleiben aus Kompatibilitätsgründen bestehen; ihre **sichtbaren Titel** lauten MuPi Kreuz & Kreis, MuPi 4er-Reihe und MuPi Krümelwurm.

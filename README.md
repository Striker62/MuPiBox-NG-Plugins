# MuPiBox-NG Plugins

**Unabhängige Apps für MuPiBox-NG – ohne Zugriff auf das private Haupt-Repository.**

Dieses öffentliche Repository enthält einen **Entwurf der App-API v1**, ein SDK für Web-Apps, das Paketformat `.mupiapp`, einen Validator und eine vollständig eigenständige Tic-Tac-Toe-Referenz-App in **Go/WebAssembly**.

> **Status: Developer Preview.** Die Werkzeuge und das Beispiel sind hier bereits nutzbar. Der App-Manager, die eingebettete Laufzeit und die sichere Host-Bridge müssen erst im MuPiBox-NG-Kern implementiert werden. Eine `.mupiapp` kann derzeit **nicht** auf einer unveränderten MuPiBox-NG installiert werden.

## Für Entwickler

Voraussetzungen: Python 3.10+, Go 1.24+ (für das Go-Beispiel; das SDK selbst benötigt kein Go).

```bash
# Repo klonen
git clone https://github.com/splitti/MuPiBox-NG-Plugins.git
cd MuPiBox-NG-Plugins

# Referenz-App bauen und als .mupiapp packen
python3 tools/build_example.py

# Paketinhalt und Manifest sicherheitstechnisch prüfen
python3 tools/mupiapp.py validate dist/tic-tac-toe.mupiapp

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
- [`examples/tic-tac-toe`](examples/tic-tac-toe) – Go/WASM-Referenz-App
- [`tools/mupiapp.py`](tools/mupiapp.py) – Packen und Validieren

## Leitlinien

1. Plugin-Entwickler bekommen **keinen Zugriff** auf den Quellcode, die API-Schlüssel oder das Dateisystem des MuPiBox-NG-Kerns.
2. Jedes App-Paket deklariert seine benötigten Berechtigungen; **eine Manifestdeklaration ist keine Sicherheitsisolation**.
3. V1 setzt auf statische Web-Apps/WASM. Native Prozesse (Go/Python) brauchen ein gesondertes Sicherheitsdesign und sind **nicht Teil von V1**.
4. Neue Host-Funktionen werden nach API-Version eingeführt. Die App-Laufzeit entscheidet, welche APIs verfügbar sind.
5. Apps und SDK sind unabhängig vom proprietär lizenzierten MuPiBox-NG-Kern.

## Mitmachen

Siehe [CONTRIBUTING.md](CONTRIBUTING.md) und [SECURITY.md](SECURITY.md). Dieses Repository ist unter der [MIT-Lizenz](LICENSE) veröffentlicht; externe Apps dürfen eine **eigene** Lizenz haben und müssen nicht in dieses Repo aufgenommen werden.

**Offizielle Projektseite:** https://github.com/splitti/MuPiBox-NG (privates Hauptrepository; für Plugin-Entwickler nicht notwendig).

## First built-in application migration preview: Klang-Memory

An independent Klang-Memory implementation is available in `examples/klang-memory/`. Build it with `python3 tools/build_klang_memory.py`; it uses the same `.mupiapp` format as Tic Tac Toe. This is a **browser-only prototype** and **does not replace** the existing Qt Quick Klang-Memory, Piano, Malbuch, Cover-Memory or **MuPi und die verlorenen Noten**. The platform audio focus and Pi touch runtime are not yet integrated.

## Entwickleranleitungen und Beiträge

- [English plugin guide: build, use and submit via Pull Request](GETTING_STARTED.en.md)
- [AI coding instructions (Claude, ChatGPT, Codex, etc.)](ai.md)
- [Contributing](CONTRIBUTING.md)

Webbasierter Plugin-Manager: privater NG-Entwicklungszweig `feature/plugin-host-v1`; die Verfügbarkeit hängt von der installierten NG-Version ab. MuPi und die verlorenen Noten bleibt im NG-Kern.

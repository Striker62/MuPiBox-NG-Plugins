# Admin-SDK: Audioaufnahmen (NG 0.2.0-alpha.87+)

Für eigene Community-App-Verwaltungsseiten, z. B. zum Einsprechen einzelner
Buchseiten. Kein Zugriff auf das private Hauptrepository und kein zusätzliches
SDK-Paket erforderlich. Der Host injiziert `window.MuPiBoxAdminSDK` automatisch.
Die normale Kinder-App hat kein Aufnahme- oder Admin-Recht.

## Manifest

Bestehende Einträge beibehalten und ergänzen (Ausschnitt):

```json
{
  "permissions": [
    "shared-assets"
  ],
  "sharedDirectories": [
    "books"
  ],
  "permissionReasons": {
    "shared-assets": "Eigene Aufnahmen lesen.",
    "admin.audio.record": "Buchseiten mit einem ausdrücklich ausgewählten Mikrofon einsprechen."
  },
  "admin": {
    "entry": "admin/index.html",
    "capabilities": [
      "audio.record",
      "files.list",
      "files.read",
      "files.write",
      "files.trash"
    ],
    "directories": [
      "books"
    ]
  }
}
```

`audio.record` ist eine **Admin-Capability**, keine normale
`permissions`-Berechtigung. Die Begründung `admin.audio.record` ist Pflicht.
Der Administrator muss dieses Recht separat aktivieren (standardmäßig aus),
ebenso muss `shared-assets` freigegeben sein. `files.read` ist für Anhören,
`files.list` für Auflisten, `files.trash` für Verwerfen und `files.write`
für andere Dateien wie book.json nötig. Zum Aufnehmen selbst genügt
`audio.record` mit `shared-assets` und erlaubtem Zielverzeichnis.
Die Aufnahme legt ihre Datei selbst an; `files.write` ist dafür nicht nötig.

## SDK und Beispiel

In einer lokalen JS-Datei der App-Verwaltung (kein Inline-Skript, keine
direkten REST-Aufrufe):

```js
const audio = window.MuPiBoxAdminSDK.audio;
const inputs = await audio.listInputDevices();
// inputs.box: [{id, label}], physische ALSA-Capture-Geräte
// inputs.browser: [{id, label}], Browser-Mikrofone
// inputs.secureContext: Browser-Kontext sicher?

// Aus einer Benutzeraktion, hier das erste Box-Mikrofon:
if (!inputs.box.length) throw Error("Kein Box-Mikrofon gefunden");
const result = await audio.startRecording({
  source: "box",
  deviceId: inputs.box[0].id,
  path: "books/mein-buch/seite-01.ogg"
});
// Die Promise endet erst nach Speichern/Abbrechen, nicht beim Start.
// result: {path, revision, size} oder {cancelled: true}
```

Alternative PC-Aufnahme: `source: "browser"`, `deviceId: ""` für das
Standardmikrofon bzw. eine Geräte-ID; Ziel `books/mein-buch/seite-01.webm`.
Der Browser muss Opus im gewählten Container unterstützen
(WebM oder Ogg), sonst einen passenden Container wählen. Browserlabels
können vor Erlaubnis anonym sein. Die Box nimmt ausschließlich Ogg/Opus auf.

| Methode unter MuPiBoxAdminSDK.audio | Verhalten |
| --- | --- |
| listInputDevices() | Browser- und Box-Mikrofone |
| startRecording({source, deviceId, path, expectedRevision?}) | Host-Dialog, Start nur nach Bestätigung |
| getRecordingStatus() | {state, durationMs}; Wandzeit einschließlich Pausen |
| stopRecording() | Stoppt und speichert |
| cancelRecording() | Verwirft laufende Aufnahme |
| pauseRecording() / resumeRecording() | Nur Browseraufnahme |
| playRecording(path) | Startet Wiedergabe gespeicherter Datei; benötigt files.read |
| deleteRecording(path, {expectedRevision, confirmName}) | Papierkorb; benötigt files.trash |

Stop/Abbruch aus separaten Buttons aufrufen, während startRecording noch
läuft. Der vertrauenswürdige Host zeigt eigene Start-, Stopp- und
Abbruchschaltflächen. Beispiel für Anhören und Freigabe:

```js
const preview = await audio.playRecording(result.path);
// Bei vorzeitigem Abbruch oder vor neuer Wiedergabe:
preview.player.pause();
preview.release();
// Bei Ende/Fehler gibt das SDK die Blob-URL automatisch frei.
```

Für Neuaufnahmen zunächst einen eindeutigen Dateinamen verwenden. Beim
Überschreiben ist die aktuelle Dateirevision erforderlich (expectedRevision),
sonst meldet der Host einen Konflikt. Zum Verwerfen einer gespeicherten
Aufnahme nach ausdrücklicher Benutzeraktion:
```js
await audio.deleteRecording(result.path, {
  expectedRevision: result.revision,
  confirmName: result.path.split("/").pop()
});
```

Für Bücherkiste: erst nach erfolgreicher Aufnahme und Vorschau den relativen
Dateinamen in der vorhandenen Buchseitenstruktur übernehmen; die book.json
über files.read und files.write mit ihrer aktuellen Revision aktualisieren.
Stoppen speichert bereits; es gibt noch keinen ungespeicherten Vorschau-Modus.
Für eine sichere Ersetzen-Funktion die alte Aufnahme erst nach erfolgreicher
Metadaten-Aktualisierung optional in den Papierkorb verschieben.
Die Kinder-App kann freigegebene Dateien über MuPiBoxSDK.shared.read lesen.
**Direkte Blob-Audio-Wiedergabe in der normalen Touch-Web-App ist in Alpha 87
nicht freigegeben (media-src CSP); nicht als funktionsfähig voraussetzen.**
Admin-Wiedergabe ist davon unabhängig.

## Sofort testen

[Eigenständiges Beispiel mit Manifest, HTML und JavaScript](../examples/admin-audio-recording-demo/README.md).
Es wird nicht automatisch in den Katalog aufgenommen und benutzt eine eigene
App-ID. Der Packer und das öffentliche Schema berücksichtigen die neue Capability.

## Grenzen und Sicherheit

- Maximal 120 Sekunden und 8 MiB je Aufnahme; pro Seite aufnehmen.
- Box: ALSA, FFmpeg, Ogg/Opus, Mono 24 kHz, 32 kbit/s, nur eine Box-Aufnahme
  gleichzeitig. USB-Mikrofon oder USB-Audiointerface mit Capture-Eingang
  möglich, sofern erkannt. Keine Monitor-Sinks, keine beliebige USB-Durchreichung.
- PC: sicherer Browser-Kontext (HTTPS oder localhost); keine HTTP-Ausnahme.
- Sichtbare Host-Bestätigung und widerrufbares Admin-Recht. Kein direkter
  Mikrofonstream an die App, kein allgemeiner Geräte- oder Dateisystemzugriff.
- Navigation, Berechtigungsentzug oder fehlender Heartbeat beenden die Aufnahme;
  bei Verbindungsverlust kann die Box bis zu sechs Sekunden nach dem letzten
  Heartbeat weiter aufnehmen und verwirft dann. Keine automatische Cloud-Übertragung.
- App-eigene Pfade, revisionsgeprüfte Änderungen und Dateikontingente gelten.
- Hardware-Abnahme ausstehend: PC-/USB-Mikrofon, Codec, Aufnahme/Anhören,
  Abziehen des Mikrofons, Rechteentzug, Browserwechsel und Neustart testen.

# MuPiBox NG Community-App-SDK – Plattformfunktionen (Revision 1.1)

Die bestehende `apiVersion: "1"` bleibt kompatibel. Seit SDK-Revision **1.1**
können Community-Apps geprüfte MuPiBox-Plattformfunktionen ohne eigene
HTTP-Requests aufrufen. Die SDK-Revision allein schaltet auf alten Boxen keine
Funktionen frei: Die NG-Host-Version muss die jeweilige Bridge-Methode ebenfalls
unterstützen.

**Wichtig:** Das SDK ist kein unbeschränkter Proxy zur MuPiBox-HTTP-API.
Admin-Passwörter, Systemkonfiguration, WLAN-Zugangsdaten, Dateipfade,
Neustart/Shutdown, Updates und beliebige API-URLs bleiben gesperrt. Die Box
identifiziert die installierte App anhand ihrer Host-Sitzung und kontrolliert
bei *jedem* Aufruf die genehmigten Manifest-Berechtigungen. Sie erhält niemals
das Admin-Cookie oder einen Touch-Token.

## Plattform-Methoden

Alle Methoden geben ein `Promise` zurück. Eine ungültige Eingabe führt zu
einem `TypeError`, eine fehlende Host-Funktion oder Berechtigung zu einer
abgelehnten Promise (typischerweise HTTP 400/403), ein momentan nicht
ausführbarer Vorgang zu einer abgelehnten Promise (typischerweise HTTP 409/503).

| SDK-Funktion | Bridge | Manifest-Berechtigung | Ergebnis / Verhalten |
| --- | --- | --- | --- |
| `sdk.capabilities()` | `host.capabilities` | keine | Aktuelle Host-Methoden samt `permission`, `granted`, `touchOnly`, `available`. |
| `sdk.supports(method)` | `host.capabilities` | keine | `true` nur bei aktuell verfügbarer Methode. |
| `sdk.getContext()` | `host.context` | keine | App-Kontext und SDK-Revision. |
| `sdk.device.info()` | `device.info` | `device-status` | Versionsnummer, Sprache, API-/SDK-Revision (keine Box-ID). |
| `sdk.device.system()` | `device.system` | `device-status` | Internet, WLAN-Qualität, Akku. Keine IP, MAC, Hostnamen oder Zugangsdaten. |
| `sdk.device.display()` | `device.display` | `device-status` | Effektive Helligkeit, Nachtmodus, konfigurierte UI-Drehung. |
| `sdk.device.audio()` | `device.audio` | `device-status` | Konfigurierte Start-/Maximallautstärke sowie ggf. Player-Lautstärke. Nur lesend. |
| `sdk.playback.status()` | `playback.status` | `playback` | Aktiver Titel, Quelle, Zustand, Interpret, Position, Dauer, Cover. |
| `sdk.playback.queue()` | `playback.queue` | `playback` | Aktuell geladene lokale/NAS-Titelliste, max. 100 Einträge; keine Bibliothekssuche. |
| `sdk.playback.transport(action)` | `playback.transport` | `playback-control` | Wiedergabe-Toggle, nächster/voriger Titel, Lautstärke hoch/runter. |

Gültige Transport-Aktionen: `play_pause`, `next`, `previous`,
`volume_up`, `volume_down`. Die Box verwendet die bestehende,
quellenübergreifende Transportlogik (einschließlich Spotify/Sendspin),
Kindersicherung und Lautstärkebegrenzung. Andere Aktionen sind verboten.

### Berechtigungen

Eine App deklariert nur die tatsächlich benötigten Rechte in
`manifest.json`, zum Beispiel:

```json
{
  "apiVersion": "1",
  "id": "community.player-control",
  "name": "Spieler-Anzeige",
  "version": "1.0.0",
  "runtime": "web",
  "entry": "index.html",
  "permissions": ["device-status", "playback", "playback-control"]
}
```

Die manifestierten Berechtigungen müssen vom Administrator beim Installieren
oder Berechtigungswechsel ausdrücklich freigegeben werden. Eine bestehende
App erhält sie beim NG-Update **nicht** automatisch.

Die bisherigen Bereiche `storage`, `audio`, `tts`, `camera`,
`photos`, `shared`, `links`, `homeassistant` und Input-/Lifecycle-
Events bleiben unverändert. `camera`, `photos` und Datei-`shared.read`
sind nur mit einer gültigen lokalen Touch-Sitzung zugänglich. Zusätzlich
gilt die gesonderte Kamerabestätigung, die Foto-Speicherbeschränkung bzw.
die Ordner-Freigabe.

### Beispiel: Statusanzeige

```js
const sdk = window.MuPiBoxSDK;

if (await sdk.supports('device.system')) {
  const {battery, wifi, internet} = await sdk.device.system();
  // nur die von der Box freigegebenen, unkritischen Werte anzeigen
}

if (await sdk.supports('playback.status')) {
  const current = await sdk.playback.status();
  console.log(current.title, current.state);
}

if (await sdk.supports('playback.transport')) {
  await sdk.playback.transport('play_pause');
}
```

Statusmethoden sind Momentaufnahmen. Apps können sparsam pollen; es gibt
keinen garantierten Echtzeit-Push für diese neuen Plattformzustände.
`sdk.on('input',...)` und die vorhandenen Lifecycle-Events sind davon
unabhängig. Häufige Polling-Schleifen vermeiden, insbesondere auf Pi 4.

### Versions- und Fehlerbehandlung

```js
try {
  const capabilities = await sdk.capabilities();
  if (capabilities.sdkRevision === '1.1') {
    // capabilities.methods[i].available prüfen
  }
} catch (error) {
  // alter NG-Host, unterbrochene Verbindung oder API-Fehler
  console.warn('SDK capabilities unavailable:', error.message);
}
```

Eine ausstehende Permission wird nicht durch SDK-Validierung freigegeben:
Der Host entscheidet bei jeder einzelnen Operation. Bei alten NG-Versionen
mit Bridge-API 1, aber ohne `host.capabilities`, wirft `capabilities()`
einen Fehler. So können Apps kompatibel ausweichen. `supports()` liefert
bei fehlendem Host oder in der isolierten Browser-Vorschau `false`.

## Wartung und API-Abgleich

Der NG-Quellcode führt ein vollständiges, **statisch erfasstes** Inventar
seiner HTTP-Endpunkte unter
`docs/community-sdk-api-inventory.md`. Neue Routen lassen den CI-Abgleich
fehlschlagen, bis ihre SDK-Eignung geprüft und das Inventar aktualisiert ist.

Die NG-Bridge besitzt eine zentrale Capability-Liste
(`internal/server/plugin_sdk_api.go`) und einen strikt gefilterten
Iframe-Runner. In diesem SDK-Repository prüft
`tests/test_sdk_platform.js` alle benutzten Bridge-Methoden gegen
`schema/sdk-bridge-methods.json`. Die Vertragssnapshots müssen bei
neuen Host-Methoden zusammen aktualisiert werden.

Weitere API-Funktionen sind möglich, aber **nicht automatisch freigegeben**:
Jede neue Funktion braucht ein eindeutiges Permission-Modell, Input-/Output-
Beschränkungen, Tests, Fehlerbehandlung, Dokumentation und eine Prüfung,
ob Elternschutz sowie Ressourcenlimits eingehalten werden.

### USB Audio-CD an Linux-Boxen (NG-Host-Erweiterung)

`sdk.optical.list()`, `sdk.optical.disc(device)`, `sdk.optical.play(device, track = 0)`,
`sdk.optical.status()` und `sdk.optical.transport(action)` sind nur
mit **`optical-media`** und einer gültigen **lokalen Touch-Sitzung** verfügbar.
Transport erlaubt nur `toggle`, `next`, `previous`, `stop`.
Der Host enumeriert USB-Geräte als opake Namen `sr0` bis `sr99`,
prüft CD-TOC und darf ausschließlich selbst mit den Geräten kommunizieren.
App-Code sieht keine `/dev`-Pfade, keine Spotify-/anderen Dienstetokens
und kann weder Audio-CDs kopieren noch beliebige Programme starten.

Audio-CDs werden durch das interne Core-Playback (Lautstärkebegrenzung,
Pause/Fortsetzen, Playlist/Tracknavigation) an mpv übergeben.
Die optionale Bridge erscheint erst auf einer entsprechend aktualisierten
NG-Host-Version. Ältere Hosts lassen die installierte App über
`sdk.supports('optical.list')` den fehlenden Dienst melden.
Physischer Raspberry-Pi-/USB-CDDA-Test ist vor Freigabe nötig.

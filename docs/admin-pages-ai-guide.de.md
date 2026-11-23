# Eigene Admin-Webseiten für MuPiBox NG Community-Apps

> **Status:** Implementiert in den zugehörigen Entwurfs-PRs, noch nicht Bestandteil
> einer veröffentlichten Alpha. Zuerst Host- und SDK-PR mergen, auf Testbox
> installieren, anschließend Community-App aktualisieren.

## Drei Stufen – dieselbe bestehende Anmeldung

1. **Keine Einstellungen:** gewöhnliche, installierbare Community-App.
2. **Formular:** `manifest.adminSettings` mit automatisch erzeugten
   Schaltern, Eingabefeldern und Auswahlfeldern. Kein App-JavaScript im Admin.
3. **Verwaltungsseite:** `manifest.admin.entry` verweist auf ein
   mitgeliefertes `admin/index.html`. Nach dem Klick auf **Verwaltung öffnen**
   erscheint eine eigene Seite **innerhalb der bestehenden MuPiBox-Administration**
   (mit MuPiBox-Kopfzeile und Zurück-Navigation). Keine zweite Anmeldung.

Die normale Touch-App wird nicht mit Admin-Rechten ausgestattet.
Die Verwaltungsseite läuft in einem **iframe ohne `allow-same-origin`**;
sie erhält keine Admin-Cookies, keine Provider-Tokens und kein allgemeines
Netzwerk-/Dateisystemrecht. Ein vertrauenswürdiger MuPiBox-Parent nimmt
nur freigegebene `MuPiBoxAdminSDK`-Aufrufe an und prüft Admin-Session,
Browser-Origin, App-ID, aktivierten Status und deklarierte Capability
**bei jeder einzelnen Operation**.

## Minimales Manifest

```json
{
  "apiVersion": "1",
  "id": "community.meine-bibliothek",
  "name": "Meine Bibliothek",
  "version": "0.1.0",
  "runtime": "web",
  "entry": "index.html",
  "permissions": ["storage", "shared-assets"],
  "permissionReasons": {
    "storage": "Speichert nutzerbezogene Einstellungen.",
    "shared-assets": "Liest eigene Mediendateien in der Bibliothek."
  },
  "sharedDirectories": ["books"],
  "adminSettings": {
    "title": "Bibliothek · Optionen",
    "fields": [
      {"key":"autoPlay","label":"Automatisch abspielen","type":"boolean","default":false},
      {"key":"view","label":"Ansicht","type":"select","default":"covers",
       "options":[{"label":"Cover","value":"covers"},{"label":"Liste","value":"list"}]}
    ]
  },
  "admin": {
    "entry": "admin/index.html",
    "capabilities": [
      "settings.read", "settings.write",
      "files.list", "files.read", "files.write", "files.trash"
    ],
    "directories": ["books"]
  }
}
```

Wichtig: `admin.directories` muss eine Teilmenge von `sharedDirectories`
sein; nie `../`, absolute Pfade, Symlinks oder frei konfigurierbare Pfade.
`admin.entry` muss eine vorhandene HTML-Datei im `admin/`‑Unterordner
sein; der Host lehnt unbekannte Capabilities und unbekannte Manifesteinträge
ab. Nur der Web-Runtime-Typ darf eigenes HTML mitbringen. Eine Qt-Scene
wird dadurch nicht zu ausführbarem QML.

Das normale Installationsverfahren bleibt unverändert: Man bestätigt die
vom Paket angeforderten Berechtigungen. Der Entwickler darf zusätzliche,
möglichst konkrete Begründungen in `permissionReasons` mitliefern.
Im Admin können Laufzeitrechte pro App wieder entzogen oder freigegeben
werden. Sie werden im Host bei jeder Bridge-Operation erneut geprüft;
die Freigabe für Funktionen im Admin-SDK ist separat explizit durch das
Paket festgelegt und stets an eine gültige Admin-Sitzung gebunden.

## Paketstruktur

```text
community.meine-bibliothek/
├── manifest.json
├── index.html
├── app.js
├── mupibox-sdk.js
└── admin/
    ├── index.html
    ├── app.js
    └── style.css
```

Die Admin-Seite bindet nur **eigene lokale Dateien** ein:

```html
<!doctype html>
<html><head>
<meta charset="utf-8">
<link rel="stylesheet" href="style.css">
</head><body>
<h1>Meine Bücher</h1>
<button id="refresh">Bücher laden</button>
<div id="books"></div>
<script src="app.js"></script>
</body></html>
```

`MuPiBoxAdminSDK` wird **vom Host** vor der App-JavaScript-Datei
eingebunden. Die Seite soll keine SDK-Datei selbst in ihren Ordner kopieren.
Der Host setzt eine strenge CSP: keine externen CDNs, keine Top-Navigation,
keine beliebigen HTTP-Aufrufe, kein Cookie-/Admin-Session-Zugriff.

## SDK-Aufrufe (nur in der Admin-Seite)

```js
const admin=window.MuPiBoxAdminSDK;

// App-spezifische Einstellungen, mit Revision gegen Überschreibkonflikte:
const {value, revision}=await admin.settings.get();
await admin.settings.set({...value, autoPlay: true},
                         {expectedRevision: revision});

// Nur ausdrücklich erlaubte app-eigene Unterordner:
const {entries, truncated}=await admin.files.list("books");
const file=await admin.files.read("books/mein-buch/book.json");
const data=JSON.parse(await file.blob.text());

// Binäre Daten als Blob. Eine bestehende Datei braucht eine Revision;
// leere Revision bedeutet "nur neu anlegen".
const upload=await admin.files.write(
  "books/mein-buch/images/01.jpg", jpegBlob,
  {expectedRevision: ""}
);
await admin.files.write(
  "books/mein-buch/book.json",
  new Blob([JSON.stringify({title:"Mein Buch",cover:"images/01.jpg",
    imagePattern:"images/{page:02d}.jpg",layout:"full-page"})]),
  {expectedRevision:""}
);

// Endgültig löschen ist aus der Admin-Seite NICHT möglich.
// Die Datei bzw. der Buchordner landet in einem privaten Papierkorb.
// Bestätigung mit genauem Datei-/Ordnernamen erforderlich:
await admin.files.trash("books/mein-buch", {confirmName:"mein-buch"});
```

### Fähigkeitsliste

| Capability | Funktion | Grenzen |
|---|---|---|
| `settings.read` | App-Konfiguration lesen | keine Geheimnisse |
| `settings.write` | App-Konfiguration speichern | max. 64 KiB, Revision |
| `files.list` | Ordner auflisten | nur explizite App-Verzeichnisse, max. 512 Einträge |
| `files.read` | Datei als Blob lesen | nur app-eigene Pfade, max. 8 MiB |
| `files.write` | Dateien hochladen/aktualisieren | Dateitypen und Quota geprüft |
| `files.trash` | Datei/Ordner in Papierkorb verschieben | Namensbestätigung |

Uploadfähig sind `.json`, `.txt`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`,
`.mp3`, `.ogg`, `.wav` und `.pdf`. Die Host-API prüft Dateiendung und
Inhalt (z. B. JPEG-/PNG-Signatur, gültiges JSON, UTF‑8). Keine ausführbaren
Formate, HTML, SVG, Shell-Skripte oder ZIP-Archive. Maximal 8 MiB pro
Datei, 128 MiB und 2000 Dateien pro app-eigenem Dateibaum einschließlich
Papierkorb. Es gibt kein universelles `files.delete`. Die API verwendet
eine verzeichnisfixierte `os.Root`-Dateisystemschnittstelle. Ungeeignete
Pfadkomponenten und Symlinks werden abgewiesen. Änderungen sind
revisionsgeprüft; bei einem Konflikt wird HTTP 409 gemeldet.

**Hinweis:** Zeitgleiche Änderungen von außerhalb über SMB sind weiterhin
möglich. Der Entwickler muss 409-Fehler behandeln und bei besonders
komplexen Datenstrukturen atomare hostseitige Transaktionen gesondert
anfordern. Ein neuer Codepfad erhält nicht automatisch mehr Rechte, nur
weil eine Freigabe im Manifest steht.

## Beispiel: Bücherkiste

`examples/Buecherkiste/admin/` enthält eine echte HTML/CSS/JS-Verwaltung.
Sie listet vorhandene SMB-Bücher auf, erstellt neue Bücher,
bearbeitet `book.json`, lädt Bilder hoch, erzeugt nummerierte
JPEG-Seiten, zeigt Vorschaubilder, bearbeitet Vorlesetexte und
verschiebt Bücher in den Papierkorb. Die ursprüngliche Touch-Leseansicht
bleibt erhalten. Die Verwaltung hat **keine eigene Login-Seite**.

Bau und Test:

```sh
python3 tools/mupiapp.py pack examples/Buecherkiste dist/buecherkiste.mupiapp --exclude README.md
python3 tools/mupiapp.py validate dist/buecherkiste.mupiapp
node --check examples/Buecherkiste/admin/app.js
python3 -m unittest discover -s tests -v
```

Bestehende Bücher auf SMB werden nicht bei der Installation überschrieben.
Die eigenen Dateien sind im app-eigenen Verzeichnis
`CommunityApps/community.buecherkiste/books/`. Das Archiv mit
Standardbüchern bleibt unveränderlich und ist nicht per Admin-SDK editierbar.

## Sicherheits- und Kompatibilitätsregeln

- Keine zweite Passwortabfrage; MuPiBox Admin bleibt die einzige Anmeldung.
- Die Admin-Seite darf **nicht** `window.fetch('/api/admin/...')` benutzen.
  Sie verwendet nur `MuPiBoxAdminSDK`.
- Keine fremden CDNs oder externen Skripte; alle Skripte und Bilder ins Paket.
- Andere Community-Apps und der Linux-Host sind nicht über das SDK lesbar.
- Keine TIDAL-/Spotify-/Audible-/NAS-Provider-Tokens durchreichen.
- Gerätefunktionen (NFC, GPIO, udev, USB-CD) benötigen zusätzliche
  spezifische Host-Integrationen und einen separaten Sicherheitsreview.
- Kein Zugriff auf Kinder-Touch-Seiten über die Admin-Bridge.
- Alte Apps ohne `admin`-Feld funktionieren weiterhin.
- Neue Pakete mit `admin`-Feld benötigen einen Host, der dies unterstützt;
  ein älterer Host soll sie beim Paketcheck ablehnen.

## Prompt für KI-Entwickler

> Entwickle eine MuPiBox-NG-Community-App nach der aktuellen öffentlichen
> SDK-Spezifikation. Verwende `apiVersion: "1"` und einen stabilen
> Reverse-Domain-Namen. Die App soll im bestehenden NG-Adminbereich
> über `manifest.admin.entry` eine eigene Verwaltungsseite anbieten.
> Erstelle `admin/index.html`, `admin/app.js`, `admin/style.css`.
> Nutze ausschließlich `window.MuPiBoxAdminSDK` mit den im Manifest
> deklarierten Capabilities; niemals eigene Login-Seiten, Cookies,
> Admin-REST-Requests, Root-Befehle, fremde Skripte oder versteckte
> Dateisystemzugriffe. Halte alle eigenen Dateizugriffe unter genau den
> in `sharedDirectories` / `admin.directories` deklarierten Verzeichnissen.
> Verwende `expectedRevision` für Updates, behandle Konflikte und
> Fehler sichtbar, benutze `files.trash` anstelle von endgültigem Löschen.
> Beschreibe im `permissionReasons`-Objekt jede angeforderte
> Berechtigung verständlich. Unterstütze kleinere Browserbreiten.
> Erstelle alle Paketinhalte inklusive `manifest.json`, App-HTML,
> SDK-Quellenkopie und Admin-HTML/CSS/JS, teste Syntax und baue das
> Paket mit `tools/mupiapp.py pack` und `validate`. Nutze
> `examples/Buecherkiste/admin/` als funktionierendes Beispiel.

## Nicht enthalten

Kein universeller Dateimanager, keine neue Spotify-/TIDAL-Anbindung,
keine Medienquellensuche über den gesamten Player und kein frei
ausführbares Linux-Skript. Für solche Vorgänge ist eine eigene
explizit geprüfte Host-Funktion erforderlich.

# Eigene Admin-Einstellungen für Community-Apps (NG · Entwickleranleitung)

**Status:** Umsetzung in NG-Host-PR und SDK-PR; erst nach Merge und NG-Update auf Boxen verfügbar.
Kein gesondertes Login: Die Einstellungskarte nutzt **die bereits bestehende Admin-Sitzung**.
App-JavaScript wird **nicht** im Admin-Kontext ausgeführt.

## Schnellstart: Konfiguration statt eigener Login-Seite

Ergänze im normalen `manifest.json` ein optionales `adminSettings`-Objekt:

```json
{
  "apiVersion": "1",
  "id": "community.meine-app",
  "name": "Meine App",
  "version": "1.0.0",
  "runtime": "web",
  "entry": "index.html",
  "permissions": ["storage"],
  "adminSettings": {
    "title": "Meine App · Einstellungen",
    "description": "Nur der Box-Administrator kann diese Werte ändern.",
    "fields": [
      {"key":"active","type":"boolean","label":"Aktiv","default":true,"group":"Allgemein"},
      {"key":"title","type":"string","label":"Überschrift","default":"Hallo!","maxLength":80},
      {"key":"volume","type":"integer","label":"Stufe","default":3,"min":0,"max":10,"group":"Audio"},
      {"key":"style","type":"select","label":"Ansicht","default":"normal",
       "options":[{"value":"normal","label":"Normal"},{"value":"small","label":"Kompakt"}]}
    ]
  }
}
```

Dies ist ein Beispielmanifest; die eigentlichen `index.html`, `app.js` und
`mupibox-sdk.js` gehören mit in das ZIP. Bei `permissions` muss `storage`
erteilt sein, damit die App selbst die Werte über den SDK-Bridgeaufruf liest.

**Auf der Box:** Admin → Provider & Dienste → Community-Apps/Plugins →
Installierte Apps → bei der gewünschten App deren **Einstellungen** aufklappen.
Die MuPiBox zeichnet automatisch die Schalter, Textfelder, Ganzzahlregler/
-zahleneingaben und Auswahlfelder. Die Einstellungen sind je App-ID getrennt,
bleiben beim Update bestehen und werden ohne zusätzliche Anmeldung gespeichert.

**In der App:**

```html
<script src="mupibox-sdk.js"></script>
<script src="app.js"></script>
```

```js
const settings = await window.MuPiBoxSDK.config.get();
const title = typeof settings.title === 'string' ? settings.title : 'Hallo!';
document.getElementById('headline').textContent = title;
// Es gibt ausdrücklich KEIN config.set() in der Community-App.
// Änderungen erfolgen ausschließlich in der bestehenden Admin-UI.
```

Bei Erstinstallation werden die `default`-Werte des Manifests zurückgegeben.
Ein Host-Update oder eine Änderung der Schema-Defaults überschreibt
bereits gespeicherte gültige Nutzereinstellungen nicht. Ein Klick auf
**Aktualisieren** in der Beispiel-App lädt die aktuelle Konfiguration erneut;
eine laufende App wird nicht automatisch neu gestartet.

## Erlaubte Felder und Regeln

| Feldtyp | Werte | Optionen |
| --- | --- | --- |
| `boolean` | `true` oder `false` | Schalter |
| `string` | Text (max. 200 Zeichen) | `minLength`, `maxLength` |
| `integer` | Ganzzahl (−1.000.000 … 1.000.000) | `min`, `max` |
| `select` | Auswahl aus einer festen Liste | `options` mit `value` + `label` |

Jeder Eintrag braucht `key`, `label`, `type` und `default`. Optional:
`group` (Zwischenüberschrift) und `help`. Maximal 32 Felder pro App;
`key` muss mit Kleinbuchstabe beginnen und darf danach nur Buchstaben,
Ziffern und Unterstriche enthalten (max. 40 Zeichen). Auswahllisten:
2–30 eindeutig verschiedene Werte. Die Anwendung muss unbekannte
oder unerwartete Konfigurationswerte defensiv behandeln.

Die Validierung erfolgt **zweimal**: im öffentlichen `.mupiapp`-Packager
und im vertrauenswürdigen NG-Host bei der Paketinstallation und bei jedem
Speichervorgang. Unbekannte/duplizierte Felder, ungültige Typen,
Grenzwertverletzungen und nicht deklarierte Optionen werden verworfen.

**Sicherheit:** Keine HTML/JS-Inhalte als Admin-Formular einbinden. Keine
Passwörter, Provider-Tokens, WLAN-Zugangsdaten, Admin-Cookies oder andere
Geheimnisse in `adminSettings` speichern. App-JS hat keine Admin-Sitzung
und kann Konfiguration nur lesen, sofern `storage` freigegeben ist.
Der Host prüft Session, Browser-Origin, App-Zustand und Änderungsrevision,
speichert atomar mit 0600-Rechten und begrenzt auf 64 KiB.
Beim parallelen Bearbeiten liefert die API einen HTTP-409-Konflikt.
App-Datenverwaltung (z. B. Bücher-Dateien hochladen, löschen, Papierkorb)
ist **nicht** Bestandteil dieser Einstellungsschnittstelle und benötigt
später ein gesondert geprüftes Admin-Dateimodul.

**Nur das Erstellen eines Manifestfeldes verleiht ausdrücklich keinerlei
Linux-/GPIO-/USB-/Netzwerkrechte.** Für solche Funktionen sind gesonderte
NG-Host-Schnittstellen und deren Berechtigungsprüfung nötig.

## Beispielprojekt und Test

Siehe [`examples/admin-settings-demo`](../examples/admin-settings-demo/).

```sh
python3 tools/mupiapp.py pack examples/admin-settings-demo dist/admin-settings-demo.mupiapp --exclude README.md
python3 tools/mupiapp.py validate dist/admin-settings-demo.mupiapp
python3 -m unittest discover -s tests -v
```

### Kopierfertiger Auftrag an eine KI

> Erstelle eine neue MuPiBox-NG-Community-App mit `apiVersion: "1"`,
> `runtime: "web"` und einer stabilen App-ID. Baue sie nach dem Muster
> `examples/admin-settings-demo`. Lege alle Einstellungen **ausschließlich**
> im deklarativen `manifest.adminSettings`-Schema fest; verwende nur
> `boolean`, `string`, `integer`, `select` samt gültigen Defaults und
> sinnvollen Grenzen. Verwende die mitgelieferte aktuelle
> `sdk/mupibox-sdk.js`, um die Einstellungen über
> `await MuPiBoxSDK.config.get()` **lesend** zu verwenden. Keine eigene
> Passwortabfrage, keinen eigenen Admin-HTTP-Endpunkt, keine Cookies,
> keine Root-Befehle und keine Umgehung der SDK-Berechtigungen.
> Stelle ein vollständiges offlinefähiges App-Paket inklusive
> `manifest.json`, `index.html`, `app.js` und `mupibox-sdk.js` bereit.
> Teste mit `tools/mupiapp.py pack` und `validate`, ergänze einen
> kurzen README mit der Bedeutung jedes Felds und den erforderlichen
> Freigaben. Nutze keine externen CDNs.

## Was ausdrücklich noch nicht Teil des Features ist

Individuell ausgeführtes HTML im Adminbereich, hochladbare Buchdateien,
GPIO-/udev-Installationsregeln, eigene Hintergrunddienste und geheime
OAuth-Token. Diese Funktionen brauchen jeweils einen separaten
Security-Review. Das geplante Bücherkiste-Dateiverwaltungsmodul bleibt
ein eigenes Vorhaben.

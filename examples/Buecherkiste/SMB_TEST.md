# Bücherkiste 0.2.21: zusätzliche SMB-Bücher

Die eingebauten Bücher bleiben erhalten. SMB-Bücher werden zusätzlich geladen,
auch bei gleichen Titeln, Ordnernamen oder Buch-IDs. Darstellung und CSS bleiben
unverändert. Erneutes Laden erfolgt beim App-Start und bei Rückkehr ins Regal;
ein Hintergrund-Watcher ist in diesem ersten Schritt nicht aktiviert.

## MuPiBox-Test

1. Das Paket `buecherkiste-0.2.21-smb.mupiapp` im Bereich Community-Apps als
   Update installieren. Die App-ID bleibt `community.buecherkiste`.
2. Die bestehende Berechtigung `shared-assets` am lokalen Touchscreen freigeben.
   Es werden keine weiteren Berechtigungen angefordert.
3. Optional kann unter `Q:\CommunityApps\community.buecherkiste\books\index.json` stehen:

   ```json
   {"books":["ole1","henne-und-adler1"]}
   ```

4. In beiden Ordnern müssen `book.json`, `images/` und gegebenenfalls `text/`
   vorhanden sein. `id` in `book.json` darf unverändert bleiben; die Ordnernamen
   in `index.json` bestimmen den Speicherort.
5. Bücherkiste direkt auf der MuPiBox öffnen. Erwartet: vier Bücher, jeweils
   zwei mit gleichem Titel. Die entfernte Admin-Vorschau zeigt nur die
   eingebauten Bücher, da dort SMB-Zugriff nicht verfügbar ist.
6. Beide Ole-Bücher bis Seite 16 durchblättern; beide Henne-Bücher inklusive
   Text prüfen. Vorwärts, rückwärts, Zoom und Rückkehr ins Regal testen.
7. Testweise nur die SMB-`index.json` umbenennen und ins Regal zurückkehren:
   die eingebauten und automatisch erkannten SMB-Bücher müssen weiterhin funktionieren. Anschließend
   die Datei zurückbenennen und erneut ins Regal wechseln.
8. Einen ungültigen SMB-Buchordner in die Liste aufnehmen: andere Bücher
   müssen weiterhin erscheinen. Den Eintrag nach dem Test entfernen.

## Dateiformat und Grenzen

Die Liste enthält maximal 60 eindeutige Ordnernamen aus Buchstaben, Ziffern,
Unterstrich und Bindestrich. Metadaten müssen ein nichtleeres `title`, `cover`
und `imagePattern` enthalten; unterstützte Layouts sind `full-page` und
`image-and-text`. Cover und Seiten liegen direkt unter `images/` und dürfen
JPEG, PNG, WebP oder GIF sein. SVG wird nicht geladen. Muster unterstützen
`{page}`, `{page:02d}` und `{page_plus_one:02d}` (Breite maximal vier Stellen).
Der vorhandene Scan ab Seite 1 mit Ende nach zwei fehlenden Seitennummern
bleibt erhalten; maximal 200 Seiten. `pageCount` ist keine Dateiliste.

JSON ist auf 256 KiB, jedes Bild auf 8 MiB begrenzt. Bilder werden nur bei
Bedarf gelesen; temporäre Objekt-URLs werden bei Seitenwechsel, Regal-Neuaufbau
und Schließen der App freigegeben. Fehler einzelner SMB-Bücher werden isoliert.
Fehlerhafte oder fehlende Bilder bleiben leer und verhindern keine Navigation.

## Automatische Prüfungen

`node --test tests/test_buecherkiste_shared.js tests/test_sdk_shared.js`
prüft zusätzliche Bücher, gleiche Titel/Ordner, fehlendes SDK, verweigerte
Berechtigung, ungültige Metadaten, Rasterbildsignaturen, Seitenwechsel und
Objekt-URL-Lebensdauer mit simuliertem Host. Der Audit-Workflow führt diese
Tests sowie Paketvalidierung, Größenprüfung und ClamAV aus. Ein erfolgreicher
simulierter Test ersetzt nicht den Test auf dem MuPiBox-Touchscreen.

## Automatische Ordnererkennung ab 0.2.21

Buchordner mit book.json werden direkt unter CommunityApps/community.buecherkiste/ und unter dessen books/-Ordner erkannt. Eine index.json ist nicht erforderlich. Pro SMB-Bereich werden insgesamt maximal 60 Buchordner berücksichtigt; es erfolgt keine rekursive Suche. Gleichnamige Ordner an beiden Orten bleiben getrennte Bücher. Zum Aktualisieren die App neu starten oder aus einem Buch ins Regal zurückkehren.

## Urheberseite ab 0.2.22

Henne und Adler erhält eine zusätzliche letzte Seite (11 / 11) mit Textautorin, Illustrator, Übersetzung, Quelle und Lizenz. Die Angaben werden aus book.json gelesen und als reiner Text angezeigt. Dies gilt auch für SMB-Kopien, sofern dort die vorhandenen Angaben author und license enthalten sind. Es muss keine zusätzliche Bilddatei kopiert werden. Bücher ohne diese Angaben, insbesondere Ole, bekommen keine zusätzliche Seite. Vorwärts und rückwärts zwischen Seite 10 und 11, Zoom und Rückkehr ins Regal auf der MuPiBox prüfen.


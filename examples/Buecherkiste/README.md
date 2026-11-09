📚 Bücherkiste für MuPiBox-NG
Version: 0.2.20 · Status: Testversion · Plattform: MuPiBox-NG (Plugin-App, Web-Runtime)

Die Bücherkiste ist eine kinderfreundliche, offline nutzbare Bilderbuch-App für MuPiBox-NG. Bücher werden mit ihren echten Covern in einer illustrierten Buchhandlung angezeigt und lassen sich per Touch öffnen und durchblättern.
Hinweis: Dies ist der aktuelle, auf einem Raspberry Pi 4 getestete Entwicklungsstand. Die Navigation aus der Bücherkiste zurück zur MuPiBox-Oberfläche soll angepasst werden, sobald die MuPiBox-NG-SDK eine geeignete Zurück-Funktion bereitstellt.

Funktionen
- Illustrierte Buchhandlung als feststehender Hintergrund.
- 3D-Buchdarstellung mit schmalen, farbigen Buchrücken in Coverhöhe.
- Bis zu sechs Bücher pro Regalseite (zwei Reihen mit drei Spalten auf ausreichend großen Displays).
- Seitliches Wischen, Pfeiltasten oder Seitenpunkte zum Wechseln zwischen Regalseiten; der Hintergrund bleibt stehen.
- Keine zusätzlichen Titel unter den Buchcovern.
- Bilderbuch-Leseansicht mit Vor-/Zurückblättern, Seitenanzeige und Zoom.
- Zwei unterstützte Darstellungsarten: full-page und image-and-text.
- Automatische Ermittlung vorhandener Buchseiten anhand der Bilddateien (kein pageCount erforderlich).
- Lokale Dateien: Nach der Installation ist zum Lesen keine Internetverbindung erforderlich.
Installation
1. Die Datei Buecherkiste-0.2.20.mupiapp über die Plugin-App-Verwaltung von MuPiBox-NG installieren.
2. Die App Bücherkiste starten.
3. Die enthaltenen Bücher erscheinen im Regal.
Die beiden mitgelieferten Bücher bleiben im Paket. **Eigene Bücher gehören nun updatefest in die SMB-Freigabe**, nicht in die installierten Plugin-Dateien. Nach dem Update muss die neue Berechtigung `shared-assets` bestätigt werden. Ein Host ohne diese Schnittstelle zeigt nur die mitgelieferten Bücher.
Enthaltene Beispielbücher
- Ole und der verschwundene Knopf – Bilderbuch im Vollseitenformat.
- Henne und Adler – Bilderbuch mit getrennt dargestellten Bildern und Text.
Quellenhinweis zu „Henne und Adler“: Ann Nduku; Illustrationen: Wiehan de Jager; deutsche Übersetzung: Anna Westpfahl. Quelle: African Storybook. Lizenz: CC BY 3.0. Diese Lizenzangabe gilt für das genannte Buch, nicht automatisch für sämtliche anderen App-Inhalte.
Eigene Bücher über SMB hinzufügen (ab 0.2.20)
-------------------------------------------
Die eigenen Bücher werden in der MuPiBox-SMB-Freigabe unter
`CommunityApps/community.buecherkiste/books/<ordnername>/` abgelegt.
Jeder Buchordner benötigt `book.json` sowie `images/` mit der
zur `imagePattern` passenden Nummerierung. Optional: `text/pages.json`
bei `image-and-text`. Namen aus Buchstaben, Ziffern, Unterstrichen oder
Bindestrichen verwenden. Je Buch ein eigenständiger Ordner.

Beispiel für zwei zusätzliche SMB-Bücher:

```text
CommunityApps/
  community.buecherkiste/
    books/
      urlaubsbuch/
        book.json
        images/01.jpg
        images/02.jpg
      mein-zweites-buch/
        book.json
        images/01.png
        images/02.png
```

Die App listet diese Bücher automatisch zusätzlich zu den beiden
mitgelieferten Büchern auf. Bei Namensgleichheit mit einem Paket-Buch
bleiben die Bücher getrennte Einträge; nichts wird überschrieben.
Unvollständige Bücher werden mit Warnung im Browser-Log übersprungen.
Es erfolgt weder Schreiben noch Löschen durch die App.
SMB-Dateien bleiben auch nach Plugin-Updates erhalten.
Bei beschränktem Display werden die Cover als Blobs geladen und
zwischengespeichert (maximal 28 gleichzeitig).

Legacy-Anleitung für Änderungen an den **Paketbüchern** (nicht updatefest):
Eigene Bücher hinzufügen
Die Bücher liegen im Plugin-Paket unter books/. Jeder Buchordner benötigt eine book.json und die passenden Bilddateien. Anschließend muss der Ordnername in books/index.json ergänzt werden.

Beispiel:
books/
├── index.json
├── ole/
│   ├── book.json
│   ├── images/
│   │   ├── 01.jpg
│   │   ├── 02.jpg
│   │   └── ...
│   └── tts/
│       └── pages.json
├── henne-und-adler/
│   ├── book.json
│   ├── images/
│   ├── text/
│   │   └── pages.json
│   └── tts/
│       └── pages.json
└── mein-buch/
    ├── book.json
    └── images/
        ├── 01.jpg
        ├── 02.jpg
        └── 03.jpg
books/index.json
{
  "books": [
    "ole",
    "henne-und-adler",
    "mein-buch"
  ]
}
Die Einträge sind Ordnernamen, nicht die angezeigten Buchtitel. Verwende am besten kurze Namen mit Kleinbuchstaben, Ziffern und Bindestrichen (z. B. mein-buch), ohne Leerzeichen oder Umlaute.
books/mein-buch/book.json
{
  "id": "mein-buch",
  "title": "Mein Bilderbuch",
  "cover": "images/01.jpg",
  "imagePattern": "images/{page:02d}.jpg",
  "firstPage": 1,
  "layout": "full-page"
}
Die id sollte mit dem Ordnernamen übereinstimmen. Die Seitenbilder heißen in diesem Beispiel 01.jpg, 02.jpg, 03.jpg usw. Die App prüft beim Öffnen, welche Seiten vorhanden sind. Für eine zuverlässige Erkennung sollten die Seiten ohne Nummernlücken vorliegen.

Für Bücher mit getrenntem Bild und Text wird "layout": "image-and-text" verwendet; die Textdatei kann über "text": "text/pages.json" angegeben werden. Die beiden mitgelieferten Bücher dienen als Beispiele für die jeweiligen Formate.
Projektstruktur
app.js                  # Buchliste, Seitenverwaltung, Leser und Navigation
style.css               # Darstellung und 3D-Buchoptik
index.html              # Einstiegspunkt der Web-App
manifest.json           # MuPiBox-NG-Plugin-Metadaten
buchladen-original.jpg  # Hintergrundbild der Buchhandlung
books/                  # Buchordner und index.json
Die Plugin-ID lautet community.buecherkiste, die Runtime ist web. Das Manifest deklariert keine zusätzlichen Berechtigungen.
Bekannte Einschränkungen
- Der Zurück-Pfeil zur MuPiBox-Oberfläche ist noch nicht über eine SDK-Navigationsfunktion angebunden. Diese Integration ist für ein späteres Update vorgesehen.
- Änderungen im installierten books/-Verzeichnis sind nicht updatefest.
- Die Oberfläche wurde auf einem Raspberry Pi 4 getestet; weitere Bildschirmgrößen und Geräte sollten separat geprüft werden.
- Die Seitenerkennung setzt fortlaufend nummerierte Bilddateien voraus und stoppt nach zwei fehlenden Seitennummern.
Entwicklung
Die Bücherkiste ist ein Community-Projekt für MuPiBox-NG. Änderungen an der Darstellung sollten die funktionierende Buchverwaltung und Leseansicht möglichst unverändert lassen.

Aktueller Stand: 0.2.19 – farbige Buchrücken auf Coverhöhe; Hintergrund, Buchpositionen, Blätterfunktion und Leseansicht bleiben gegenüber dem vorherigen Stand unverändert.

# Bücherkiste für MuPiBox-NG

Version **0.2.24** · Community-App · Web-Runtime · App-ID `community.buecherkiste`

Die Bücherkiste zeigt Bilderbücher in einer illustrierten Buchhandlung. Bücher
lassen sich per Touch öffnen, durchblättern und vergrößern. Die zwei eingebauten
Bücher funktionieren offline und bleiben unabhängig von zusätzlichen SMB-Büchern
erhalten.

## Funktionen

- Responsive Buchhandlung mit farbigen Buchrücken und mehreren Regalseiten.
- Regalseiten per Wischen, Pfeiltasten oder Seitenpunkten wechseln.
- Buchseiten vorwärts/rückwärts blättern, Seitenanzeige und Zoom.
- Vollseitenformat (`full-page`) oder Bild mit getrenntem Text (`image-and-text`).
- Zusätzliche Bücher aus dem eigenen SMB-Bereich, auch mit gleichen Titeln.
- Automatische Erkennung von Buchordnern; eine SMB-`index.json` ist optional.
- Zusätzliche Schlussseite mit Urheber- und Lizenzangaben bei Büchern, deren
  Metadaten `author` und `license` enthalten.
- Navigation: **Buch → Regal → MuPiBox**. Der MuPiBox-Pfeil ist nur im Regal
  sichtbar und nutzt `MuPiBoxSDK.exit()`.

## Installation und Navigation

1. Das `.mupiapp`-Paket über die Community-App-Verwaltung installieren.
2. Die Berechtigung `shared-assets` für zusätzliche Bücher am lokalen
   MuPiBox-Touchscreen erlauben. Sie gewährt ausschließlich lesenden Zugriff
   auf den eigenen App-Bereich.
3. Die Bücherkiste direkt auf der MuPiBox starten.

Voraussetzung für SMB ist eine MuPiBox-NG-Version mit Unterstützung für
`MuPiBoxSDK.shared`. Die entfernte Admin-Vorschau kann keine SMB-Bücher laden.
Ohne Freigabe oder bei SMB-Fehlern bleiben die eingebauten Bücher verfügbar.

Das Manifest setzt `display.showBackButton` auf `false`, damit der native
Zurück-Button samt App-Titel ausgeblendet wird. Bereits gespeicherte
Darstellungseinstellungen der MuPiBox können diese Vorgabe übersteuern; in
diesem Fall den nativen Button in der App-Konfiguration der MuPiBox ausschalten.
In einer eigenständigen Browser-Vorschau kann der SDK-Pfeil keine MuPiBox beenden.

## Eingebaute Bücher

- **Ole und der verschwundene Knopf:** 16 Bildseiten im Vollseitenformat.
- **Henne und Adler:** 10 Bild-/Textseiten und eine zusätzliche Urheberseite.
  Text: Ann Nduku; Illustrationen: Wiehan de Jager; deutsche Übersetzung:
  Anna Westpfahl. Quelle: [Storybooks African Languages / African Storybook](https://storybooksafricanlanguages.net/stories/de/0158/).
  Lizenz: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
  Diese Lizenz gilt für dieses Buch, nicht automatisch für andere App-Inhalte.

TTS-Dateien sind vorhanden, eine Sprachausgabe ist nicht implementiert.

## Eigene Bücher über SMB hinzufügen

Im vorhandenen MuPiBox-SMB-Laufwerk werden die Bücher in diesem Bereich abgelegt:

```text
CommunityApps/
  community.buecherkiste/
    books/
      mein-buch/
        book.json
        images/
          01.jpg
          02.jpg
          03.jpg
```

Bei einem als `Q:` eingebundenen Laufwerk lautet der Buchpfad beispielsweise
`Q:\CommunityApps\community.buecherkiste\books\mein-buch\`.
Buchordner direkt unter `community.buecherkiste/` werden ebenfalls erkannt.
Es erfolgt keine rekursive Suche. Ordnernamen bestehen aus Buchstaben, Ziffern,
Unterstrichen und Bindestrichen (maximal 80 Zeichen).

Beispiel für `book.json`:

```json
{
  "id": "mein-buch",
  "title": "Mein Bilderbuch",
  "cover": "images/01.jpg",
  "imagePattern": "images/{page:02d}.jpg",
  "firstPage": 1,
  "layout": "full-page"
}
```

Die Erkennung verwendet den Ordnerpfad; gleiche Titel oder IDs ersetzen keine
anderen Bücher. Für das Layout `image-and-text` kann zusätzlich
`"text": "text/pages.json"` angegeben werden. Diese Datei enthält zum Beispiel
`{"pages":[{"text":"Text der ersten Seite"}]}`.

Die optionale Datei `books/index.json` kann eine bevorzugte Reihenfolge vorgeben:

```json
{"books":["ole1","henne-und-adler1","mein-buch"]}
```

Weitere gefundene Buchordner werden ergänzt. Nach Änderungen die App neu starten
oder aus einem Buch ins Regal zurückkehren. Ein Hintergrund-Watcher ist nicht
aktiviert. Der SMB-Bereich ist vom installierten App-Paket getrennt; zusätzliche
Bücher werden nicht in das Paket kopiert. Eigene Änderungen direkt im
installierten Plugin-Verzeichnis können bei einem Update überschrieben werden.

## Dateigrenzen

Maximal 60 zusätzliche Buchordner insgesamt und 200 Bildseiten pro Buch.
JSON-Dateien sind auf 256 KiB, Bilder auf 8 MiB begrenzt. Unterstützt werden
JPEG, PNG, WebP und GIF direkt im Unterordner `images/`; SVG wird nicht geladen.
Die Seiten werden ab 1 erkannt, der Scan endet nach zwei fehlenden Seitennummern.
`pageCount` ist optional und ersetzt keine Bilddateien. Muster unterstützen
`{page}`, `{page:02d}` und `{page_plus_one:02d}` mit höchstens vier Stellen.

SMB-Metadaten werden als Inhalt behandelt; Text wird nicht als HTML ausgeführt.
Temporäre Bildadressen werden bei Seitenwechsel, Regal-Neuaufbau und Verlassen
der App freigegeben. Der SDK-Zugriff schreibt oder löscht keine SMB-Dateien.

## Paket bauen und prüfen

Vom Repository-Stamm aus:

```sh
node --test tests/test_buecherkiste_shared.js tests/test_sdk_shared.js
python tools/mupiapp.py pack examples/Buecherkiste dist/buecherkiste.mupiapp --exclude README.md --exclude CSS_AUDIT.md --exclude SMB_TEST.md
python tools/mupiapp.py validate dist/buecherkiste.mupiapp
```

Der Bücherkiste-Audit auf GitHub prüft außerdem CSS-Struktur, Paketintegrität,
Dateitypen und die Grenze von 25 MB und führt einen ClamAV-Virenscan aus.
Den Gerätetest beschreibt [SMB_TEST.md](SMB_TEST.md).

Die zusätzlichen SMB-Bücher, die Urheberseite und die Navigation aus Version
0.2.24 (Buch → Regal → MuPiBox, ohne MuPiBox-Pfeil im Buch) wurden vom Anwender
auf der MuPiBox bestätigt. Entwicklungsreferenz ist ein Raspberry Pi 4 mit
10,1-Zoll-Display. Displaytests mit 5 und 7 Zoll sind noch offen. Simulierte
SDK-Tests ersetzen keinen Touchscreen-Test.

## Veröffentlichung

Der Entwicklungscode kann neuer sein als das Paket im offiziellen Katalog.
`catalog/apps.json` muss weiterhin das tatsächlich veröffentlichte Release-
Paket samt Version, Berechtigungen und SHA-256 beschreiben. Erst nach einer
offiziellen Veröffentlichung durch den Maintainer werden diese Angaben auf
die neue Version umgestellt; ein Merge allein veröffentlicht kein Paket.

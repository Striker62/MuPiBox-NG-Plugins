# Bücherkiste für MuPiBox NG

Mit der Bücherkiste können Kinder Bilderbücher auswählen, durchblättern, vergrößern und vorlesen lassen. Die App bringt **Ole und der verschwundene Knopf** (16 Bildseiten) und **Henne und Adler** (10 Bild- und Textseiten plus eine Urheberseite) mit. Eigene Bücher erscheinen zusätzlich im Regal.

## 1.2.0-beta.6: Covertext im Regal vorlesen

Ein langer Druck (650 ms) auf ein Cover im Regal liest den eingegebenen
Covertext per TTS vor. Ist der Text leer, wird der Buchtitel vorgelesen.
Kurzes Tippen öffnet weiterhin das Buch; Bewegungen beim Wischen brechen
den langen Druck ab. Die Box muss TTS bereitstellen und freigegeben haben.

## 1.2.0-beta.5: Cover einsprechen und beschriften

Auch bei einem separaten Cover lassen sich jetzt Vorlesetext und eine eigene
Aufnahme hinterlegen, etwa für den Buchtitel. Der Covertext wird separat als
`coverText` in der Buchbeschreibung gespeichert; die Zuordnung der Texte zu
den Inhaltsseiten bleibt unverändert. Coveraufnahmen werden wie andere
Seitenaufnahmen revisionsgeprüft gespeichert und können in der Verwaltung
angehört werden. Die Wiedergabe in der Kinder-App bleibt eine separate Erweiterung.

## 1.2.0-beta.4: kompakte Wiedergabezeile

Seitenbezeichnung, Fortschritt und Zeit stehen rechts neben „Anhören“ und
„Wiedergabe stoppen“. Auf schmalen Fenstern bricht die Anzeige bei Bedarf um.

## 1.2.0-beta.3: Aufnahme- und Wiedergabeanzeige

Die Verwaltung zeigt die ausgewählte Buchseite sowie bei der Wiedergabe
„neue Aufnahme“ oder „gespeicherte Aufnahme“. Während der Aufnahme erscheinen
die verstrichene Zeit und das Limit von zwei Minuten. Beim Anhören werden
die aktuelle Position, die Gesamtdauer und ein Fortschrittsbalken angezeigt.
Die genaue Dauer vorhandener Dateien wird beim Anhören ermittelt.
Beim Seitenwechsel werden die Zeitangaben zurückgesetzt.

Die Mikrofonbestätigung der MuPiBox bleibt bestehen. Eine echte Pegelanzeige
für das Box-Mikrofon benötigt zusätzliche Pegeldaten aus der Admin-SDK.

## 1.2.0-beta.2: Buchwechsel nach dem Speichern

Die Rückfrage zum Verwerfen erscheint nur noch bei tatsächlichen ungespeicherten
Änderungen. Ein frisch geöffnetes oder erfolgreich gespeichertes Buch lässt
sich ohne Rückfrage verlassen, um ein anderes Buch zu öffnen oder einen neuen
Entwurf anzulegen. Verglichen werden Titel, Cover-Einstellung, Seitenbilder,
Reihenfolge, Vorlesetexte und Aufnahmezuordnungen. Änderungen, die wieder auf
den gespeicherten Stand zurückgesetzt wurden, lösen ebenfalls keine Warnung aus.
Nach einem fehlgeschlagenen Speichern bleibt der Schutz aktiv. Laufende Importe,
Speichervorgänge und noch nicht abgeschlossene Aufnahmeentscheidungen bleiben
vor einem versehentlichen Verlassen geschützt.

## 1.2.0-beta.1: Buchseiten in der Verwaltung einsprechen

Die bestehende Buchverwaltung mit Seitenvorschau und Vorlesetext bleibt erhalten.
Unter der ausgewählten Inhaltsseite gibt es **Seite selbst einsprechen**:

1. Ein neues Buch zuerst speichern oder ein vorhandenes eigenes Buch öffnen.
2. Inhaltsseite wählen und **Mikrofone suchen** drücken. Das separate Cover
   erhält keine Aufnahme. Über die HTTP-Adresse der Box ein **Box-Mikrofon**
   wählen; das PC-Mikrofon wird nur bei sicherem Browser-Kontext angeboten
   (HTTPS oder localhost). Box-Aufnahmen sind Ogg/Opus; für den PC stehen
   WebM/Opus und Ogg/Opus zur Auswahl, sofern der Browser sie unterstützt.
3. **Aufnehmen** drücken und den vertrauenswürdigen MuPiBox-Dialog bestätigen.
   **Stoppen und speichern** beendet die Aufnahme und legt die Datei ab;
   **Aufnahme abbrechen** verwirft den laufenden Vorgang. Grenzen: 120 Sekunden
   Wandzeit und 8 MiB je Aufnahme. Währenddessen ist die Seitenauswahl gesperrt.
4. Die neue Datei **Anhören** und anschließend **Aufnahme übernehmen**.
   Alternativ über **Neue Aufnahme verwerfen** mit Bestätigung in den
   Papierkorb verschieben. Eine vorhandene Seitenaufnahme bleibt bis zur
   erfolgreichen Übernahme und zum Buchspeichern unverändert.
5. **Buch speichern** sichert die neue Seitenzuordnung in `book.json`.
   Die Aufnahme folgt beim Umsortieren dem Seitenbild und nicht seiner alten
   Seitennummer. Die Vorlesetexte werden nicht durch Aufnahme-Metadaten ersetzt.

**Wichtig:** Dies ist eine Aufnahmeverwaltung, noch keine Wiedergabe eigener
Aufnahmen in der Kinderansicht auf dem Touchdisplay. Die öffentliche
Admin-Audio-Dokumentation für Alpha 87 sperrt dort direkte Blob-Audio-Ausgabe.
Die Bücherkiste liest weiterhin mit ihrer vorhandenen TTS-Funktion vor.

Die neue **Admin-Capability `audio.record`** muss separat in der App-Verwaltung
freigegeben werden; die normale Kinder-App erhält kein Mikrofonrecht.
Die bestehende Freigabe `shared-assets` und die Admin-Dateirechte bleiben
erforderlich. Das Manifest enthält die Pflichtbegründung `admin.audio.record`.
Ein fehlendes SDK oder eine verweigerte Freigabe blockiert die übrige
Buchverwaltung nicht. Die Audio-SDK wird ausschließlich vom Host bereitgestellt.

### Dateien und Zuordnung

Die vom Host gespeicherten Dateien liegen appgetrennt unter
`CommunityApps/community.buecherkiste/books/<buch-id>/audio/`.
Neuaufnahmen verwenden eindeutige Namen, z. B.
`seite-001-<zufallskennung>.ogg`. Vorhandene Dateien werden nicht überschrieben.
Die gemeinsame Host-Quote (128 MiB und 2000 Dateien inklusive Papierkorb)
gilt weiterhin. Die App verwendet in `book.json` das eigene Feld:

```json
{
  "pageRecordings": {
    "images/01.jpg": {
      "path": "audio/seite-001-aufnahmekennung.ogg",
      "revision": "vom-host-gelieferte-dateirevision",
      "size": 12345
    }
  }
}
```

Die Bildpfade werden beim Speichern neuer Bildgenerationen passend umgeordnet.
Vor dem Veröffentlichen der Buchbeschreibung prüft die Verwaltung Existenz
und Revision der verknüpften Aufnahmen. Scheitert die Veröffentlichung, bleibt
die zuvor veröffentlichte Zuordnung erhalten. Alte oder entfernte Aufnahmen
werden nicht automatisch gelöscht. **Zuordnung entfernen** entfernt nur die
Verknüpfung nach dem nächsten Buchspeichern; die Audiodatei bleibt erhalten.

Stoppen speichert bereits eine neue Datei. Wer danach die Verwaltung verlässt
oder den Buchentwurf verwirft, bevor er die Zuordnung speichert, kann deshalb
eine unzugeordnete Audiodatei im Buchordner zurücklassen. Beim Verlassen wird
eine laufende Aufnahme abgebrochen und eine Vorschau beendet. Bei verlorenem
Kontakt gelten zusätzlich die Heartbeat-Abbruchregeln des Hosts.

Automatische Tests verwenden simulierte Aufnahmegeräte und prüfen Aufnahme,
Abbruch, Vorschau, Bestätigung, Revisionen, Fehler und die Seitenzuordnung.
Die reale Abnahme mit PC-/USB-Mikrofon, Audioformat und Box ist noch offen.
Offizielle Schnittstelle: [Admin-Audio-Aufnahmen](../../docs/community-admin-audio-recording.md).


## Neu: Bücher direkt in der MuPiBox-Administration verwalten (1.1.0)

Die Bücherkiste liefert optional eine **eigene Admin-Webseite**
`admin/index.html` mit. Nach dem Update des NG-Hosts (Admin-Page-Feature)
erscheint in der Karte der installierten App die Schaltfläche
**Verwaltung öffnen**. Die vorhandene MuPiBox-Admin-Sitzung reicht
vollkommen aus – es gibt **keine zweite Anmeldung**.

Dort können eigene Bücher erstellt und bearbeitet, Titel und Seitenlayouts
geändert, Bildseiten hochgeladen, Vorschaubilder geladen und Vorlesetexte
erfasst werden. Eigene Bücher können mit Bestätigung in einen geschützten
Papierkorb verschoben werden. Die Leseansicht für Kinder bekommt
**keine** dieser Schreibrechte.

Die Verwaltungsseite verwaltet ausschließlich den bereits vorhandenen
eigenen SMB-Bücherbereich und verwendet
`MuPiBoxAdminSDK.files.*`. Vorhandene eigene Bücher und die
mitgelieferten Standardbücher bleiben erhalten. Bilder werden beim
Upload lokal im Browser nach JPEG konvertiert. Die App schreibt
`books/<buch-id>/book.json`, `images/01.jpg`, `tts/pages.json` und
ggf. `text/pages.json`. Im Admin nicht möglich: geschützte
Originalbuch-Dateien aus dem App-Paket bearbeiten oder Dateien
außerhalb des Bücherordners lesen.

**Abhängigkeit:** Diese Funktion setzt die neue NG-Host-Admin-Bridge
voraus. Auf alten Box-Versionen lässt sich das neue Paket mit `admin`
nicht installieren. Die vollständige SDK-Dokumentation:
`docs/admin-pages-ai-guide.de.md` im Plugin-Repository.


## Installation und Bedienung

Installiere das `.mupiapp`-Paket in der Community-App-Verwaltung. Erlaube **SMB-Inhalte** (`shared-assets`) für eigene Bücher und **Audio** für das Vorlesen. Öffne die Bücherkiste am Touchscreen. Mit **Regal** kommst du aus dem Buch zurück zur Bücherauswahl. Der Pfeil im Regal führt zurück zur MuPiBox.

Die Bücherkiste nutzt die Stimme, die unter **Admin → Text-to-Speech** eingestellt ist. Für alle drei Tasten braucht die MuPiBox die erweiterten TTS-Funktionen, die laut SDK-Dokumentation ab **NG Alpha 58** vorgesehen sind. Die Tasten erscheinen, wenn TTS verfügbar ist und die Seite einen Vorlesetext hat.

| Taste | Funktion |
| --- | --- |
| Buch mit Lautsprecher | Liest ab der aktuellen Seite vor und blättert selbst weiter. |
| Seite mit Lautsprecher | Liest die aktuelle Seite und danach jede Seite, zu der du selbst blätterst. |
| Lautsprecher | Liest die aktuelle Seite einmal vor. |

Die aktive Taste zeigt ein **Stopp-Quadrat**. Tippe darauf, um den Modus zu beenden. Im Modus „Seite mit Lautsprecher“ bleibt das Quadrat auch zwischen den Seiten sichtbar. Beim Zurückgehen ins Regal endet das Vorlesen.

## Eigene Bücher über das Netzwerk hinzufügen

Lege pro Buch einen eigenen Ordner unter `CommunityApps/community.buecherkiste/books/` in deiner MuPiBox-Freigabe an. Bei einem als `Q:` eingebundenen Laufwerk ist das beispielsweise `Q:\CommunityApps\community.buecherkiste\books\mein-buch`.

```text
CommunityApps/
└── community.buecherkiste/
    └── books/
        └── mein-buch/
            ├── book.json
            ├── images/
            │   ├── 01.jpg
            │   └── 02.jpg
            └── tts/
                └── pages.json
```

Speichere die JSON-Dateien als UTF-8. Die Dateinamen in der `book.json` müssen zu den Dateien im Buchordner passen. Dieses Beispiel verwendet die erste Bildseite zugleich als Cover.

```json
{
  "title": "Mein Bilderbuch",
  "cover": "images/01.jpg",
  "imagePattern": "images/{page:02d}.jpg",
  "layout": "full-page",
  "tts": "tts/pages.json"
}
```

`{page:02d}` erzeugt die Nummern `01`, `02` und so weiter. Nummeriere die Bilder lückenlos ab 1. Unterstützt werden JPEG, PNG, WebP und GIF. Pro Bild sind bis zu 8 MiB möglich, pro JSON-Datei bis zu 256 KiB. Die App durchsucht bis zu 60 zusätzliche Buchordner und bis zu 200 Seitennummern je Buch.

### Vorlesetexte

In `tts/pages.json` gehört der erste Eintrag zur ersten Bildseite und der zweite zur zweiten Bildseite.

```json
{
  "pages": [
    { "text": "Mia findet einen roten Schlüssel." },
    { "text": "Der Schlüssel passt zur kleinen Tür." }
  ]
}
```

Die Vorlesefunktion unterstützt bis zu 600 Zeichen je Seite. Halte die Reihenfolge ein und verwende für eine Seite ohne Vorlesetext einen leeren Eintrag wie `{"text":""}`. Bei einem reinen Bilderbuch kannst du den Ordner `tts/` und das Feld `tts` weglassen.

### Text neben dem Bild und Urheberangaben

Für getrennte Bilder und sichtbare Texte setzt du `"layout": "image-and-text"` und ergänzt `"text": "text/pages.json"` in der `book.json`. Lege die Datei im Buchordner unter `text/pages.json` an. Sie verwendet dieselbe Seitenstruktur wie das Beispiel für Vorlesetexte. Der sichtbare Text kann auch als Vorlesetext dienen.

Wenn `book.json` die Felder `author` und `license` enthält, ergänzt die Bücherkiste eine Schlussseite mit Urheber- und Lizenzangaben. Optional kannst du `illustrator`, `translator`, `source` und `license_url` angeben.

### Bücher im Regal finden

Die App erkennt die direkten Unterordner von `books/` automatisch. Verwende für Ordnernamen Buchstaben ohne Umlaute, Ziffern, Bindestriche oder Unterstriche und höchstens 80 Zeichen. Gleiche Buchtitel sind möglich, solange die Bücher in getrennten Ordnern liegen. Optional legt `books/index.json` mit beispielsweise `{"books":["mein-buch","zweites-buch"]}` eine bevorzugte Reihenfolge fest.

Kehre nach Änderungen aus einem Buch ins Regal zurück oder starte die App neu. Lege eigene Dateien in der Netzwerkfreigabe ab, damit sie unabhängig vom installierten App-Paket bleiben.

## Quellen und Lizenzen

**Henne und Adler**: Text von Ann Nduku, Illustrationen von Wiehan de Jager, deutsche Übersetzung von Anna Westpfahl. [Storybooks African Languages / African Storybook](https://storybooksafricanlanguages.net/stories/de/0158/) · [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)

## Gerätetest

Der App-Entwickler hat die drei Vorlesetasten und eigene SMB-Bücher auf MuPiBox NG Alpha 65 getestet.
# Buchverwaltung im vertrauten Editor-Layout (1.1.1-beta.1)

Die Verwaltung verwendet das Layout des lokalen Bucheditors: Bücherliste,
Titel und Ordnerkennung links, Seitenminiaturen darunter sowie große
Seitenvorschau und Vorlesetext rechts. Bilder lassen sich hinzufügen,
entfernen und mit den Pfeilen umsortieren; der Text bleibt bei seinem Bild.
Ein separates erstes Cover wird ausdrücklich markiert, erhält keinen
Vorlesetext und wird nicht als Inhaltsseite gezählt. Beim Entfernen des
Covers wird die Cover-Markierung zurückgesetzt. Ohne separates Cover ist
die erste Inhaltsseite zugleich das Titelbild.

Die Seite wird über „App-Verwaltung öffnen“ in der angemeldeten MuPiBox-
Administration geöffnet. Alpha 85 oder neuer wird für diesen Test empfohlen.
Dateizugriffe verwenden ausschließlich die freigegebene Admin-SDK und den
eigenen `books`-Ordner. Die normale Leseansicht behält ihr Design. Die
vorhandene Aufteilung langer Vorlesetexte in höchstens 500 Zeichen große
TTS-Blöcke ist auch in diesem Paket enthalten; die Verwaltung kürzt Texte
nicht. Leere Seitentexte bleiben erhalten.

„Buch speichern“ übernimmt den gesamten Entwurf und aktualisiert die
`index.json` unter Erhalt vorhandener Einträge. Die Bearbeitung unterstützt
derzeit `full-page`; `image-and-text` wird mit einem Hinweis abgewiesen.
OCR bleibt im lokalen Flask-Editor, da die Admin-SDK keine OCR anbietet.
Ungespeicherte Entwürfe gehen beim Neuladen verloren.

Zum Schutz bestehender Bücher werden geänderte Bildfolgen und Texte unter
neuen Dateinamen geschrieben, bevor `book.json` revisionsgeprüft auf den
neuen Stand verweist. Unveränderte Bildfolgen werden wiederverwendet.
Die ursprünglichen Dateien bleiben erhalten und zählen weiterhin gegen
die Host-Quota (128 MiB/2000 Dateien einschließlich Papierkorb). Es gibt
keine automatische endgültige Bereinigung und keine hostseitige Transaktion
über mehrere Dateien. Falls nur die Aktualisierung der Bücherliste scheitert,
wird das gespeicherte Buch mit einer sichtbaren Warnung gemeldet; erneutes
Speichern versucht den Listeneintrag nochmals. Bei Konflikten mit SMB-
Änderungen das Buch neu öffnen. Ein fehlgeschlagener Upload kann ungenutzte
Dateien hinterlassen, verändert aber noch nicht das veröffentlichte Buch.

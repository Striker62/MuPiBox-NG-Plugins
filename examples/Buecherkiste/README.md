# Bücherkiste für MuPiBox NG

Mit der Bücherkiste können Kinder Bilderbücher auswählen, durchblättern, vergrößern und vorlesen lassen. Die App bringt **Ole und der verschwundene Knopf** (16 Bildseiten) und **Henne und Adler** (10 Bild- und Textseiten plus eine Urheberseite) mit. Eigene Bücher erscheinen zusätzlich im Regal.

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

# CSS-Prüfbericht – Bücherkiste

Stand: 2026-11-09 · Branch: `dev/buecherkiste-aufraeumen` · App-Version: 0.2.19

## Umfang und Methode
Quellen: `examples/Buecherkiste/style.css` (304 Zeilen, ca. 22,6 KB, ca. 203 Regelblöcke), `index.html`, `app.js`. Statische Sichtprüfung; **kein** Laufzeittest auf der MuPiBox. Es wurden keine CSS-Regeln gelöscht.

## Erste Befunde
| Priorität | Befund | Empfehlung |
| --- | --- | --- |
| Hoch | `#book` in der CSS-Basis, während die aktuelle HTML-Regalansicht `#shelf .books` nutzt. | Als Kandidat für verwaisten Selektor markieren; vor Löschen auch dynamische JS-Erzeugung prüfen. |
| Hoch | Mehrere historisch gewachsene `#shelf`-, `#shelf .books`- und `.book`-Definitionen aus den Versionen 0.2.8–0.2.19. | Finale wirksame Werte pro Media-Query ermitteln und zusammenführen; visuell vergleichen. |
| Mittel | `#henne-page`, `#henne-image`, `#henne-text` mehrfach definiert (0.1.7–0.2.0). | Nur nach Kontrolle von Zoom und kleinen Viewports konsolidieren. |
| Mittel | Häufige `!important`-Overrides in späteren Regeln. | Ursache in der Kaskade prüfen; nicht pauschal entfernen. |
| Schutz | `.zoom`, `.zoomed`, `.henne`, `#henne-text-inner` werden zur Laufzeit verwendet. | Nicht als verwaist löschen. |
| Schutz | `::before` für Buchrücken und CSS-Variablen `--spine-*` steuern die Coveroptik. | Erhalten und auf Pi 4 prüfen. |

## Grenzen der statischen Analyse
- Dynamisch mit `createElement`, `classList`, `innerHTML` oder `style.setProperty` verwendete Elemente können von reinen Textsuchern übersehen werden.
- Media-Queries, Pseudoklassen, `[hidden]` und `::before/::after` können absichtlich mehrfach definiert sein.
- Die tatsächliche Nutzung lässt sich ergänzend über Chromium/Edge DevTools »Coverage« bei vollständig durchgeklickter App prüfen.
- Dieser Bericht ist eine erste Sichtprüfung, **keine vollständige beweisende Liste** aller verwaisten CSS-Regeln.

## Nächste Schritte
1. Automatisierte Syntax- und Verdachtsprüfung im Entwicklungsbranch aktivieren.
2. Kandidaten manuell anhand von HTML und JS klassifizieren.
3. CSS in separatem Commit konsolidieren, ohne die Darstellung zu ändern.
4. Auf MuPiBox bei 800×480 testen: Regal, beide Bücher, Blättern, Zoom, kleine Viewports.
5. Erst nach Freigabe mit `main` zusammenführen.


## Vertiefte statische Bestandsaufnahme (2026-11-09)

Eine zusätzliche automatisierte Auswertung der aktuellen `style.css` hat **187 einfache Selektor-/Deklarationsblöcke** erfasst (verschachtelte Media-Queries und kompakt geschriebene Regeln begrenzen die Genauigkeit). Die folgenden Werte sind *Vorkommen*, nicht nachgewiesene Fehler:

| Selektor | Vorkommen |
| --- | ---: |
| `#shelf .books` | 19 |
| `#shelf` | 12 |
| `#shelf .books .book-slot .book img` | 12 |
| `#shelf .books .book` | 7 |
| `#shelf .books .book span` | 6 |
| `#shelf .books .book img` | 5 |
| `#shelf .books .book::before` | 5 |
| `#reader.henne:not(.zoomed) #henne-text` | 4 |

Eine einfache Gegenprobe der Selektorbezeichner gegen `index.html` und `app.js` lieferte **keine sicher nachgewiesenen verwaisten Regeln**. Dieses Ergebnis ist ausdrücklich *kein Beweis*, dass alle Regeln verwendet werden: HTML wird zur Laufzeit erzeugt und die Auswertung ist kein vollständiger CSS-Parser.

**Konkrete nächste manuelle Prüfung:**
1. Frühere Einzelbuch-Darstellung `#book` gegen die aktuell erzeugten DOM-Elemente prüfen.
2. Die Regal-Regeln nach Basiskaskade und jeder `@media`-Bedingung getrennt zusammenführen.
3. `!important`-Regeln und CSS-Variablen für Buchrücken nur nach optischem Vergleich ändern.
4. Für dynamische Zustände Regal / Buch / Zoom / Henne auf dem Zielgerät testen.

**Status:** Analyse erweitert; keine Änderungen an `style.css`, `app.js` oder `index.html`. Die automatische GitHub-Action prüft Syntax und Paketierung, aber noch keine vollständige CSS-Nutzungsabdeckung.


## Erste Bereinigung – Commit `4a99fea` (2026-11-09)

- Aus `style.css` entfernt: die beiden veralteten Selektoren `#book` und `#book img` (insgesamt 297 Zeichen).
- Begründung: Das aktuelle `index.html` besitzt kein Element mit `id="book"`; die Regal-Buttons werden in `app.js` mit `className='book'` erzeugt.
- **Unverändert:** Alle aktuellen `.book`- und `.book-slot`-Regeln, Media-Queries, Zoom- und Buchrücken-Effekte.
- **Noch ausstehend:** CI-Ergebnis kontrollieren, visuelle Prüfung auf 800×480, vollständige Konsolidierung der mehrfachen Regal-Overrides.
- Dies ist eine erste risikoarme Teilbereinigung, **noch keine vollständige Regal-CSS-Konsolidierung**.


## Zweite Bereinigung – Commit `95230c7` (2026-11-09)

Fünf frühere, wortgleich später erneut definierte CSS-Regeln entfernt:
- `#shelf` mit `buchladen-leere-regale.jpg`-Hintergrundangaben
- `#shelf .books::before,#shelf .books::after` mit `display:none!important`
- `#shelf .books::-webkit-scrollbar` mit `display:none`
- `#shelf .books .book-slot .book::after` mit `display:none!important`
- `#shelf .books .book-slot .book span` mit `display:none!important`

340 Zeichen weniger CSS. Die späteren gleichlautenden Definitionen wurden beibehalten. Dies ist **nur die konservative Entfernung identischer Duplikate**, noch keine umfassende Konsolidierung der historischen Regalregeln. Laufzeit-/Screenshot-Vergleich und CI-Status sind noch nicht bestätigt.


## Dritte Bereinigung – Commit `d62eaa4` (2026-11-09)

Drei historische `#shelf .books`-Deklarationen `left:10%!important;right:10%!important` in `@media(max-width:540px)` entfernt. Die aktuell spätere `0.2.17`-Regel definiert für dieselbe Bildschirmbreite `inset:13% 11% 10%!important`, wodurch die älteren horizontalen 10-%-Abstände überschrieben werden. Andere Regeln in den betreffenden Media-Queries blieben erhalten.

- Reduktion: 212 Zeichen CSS.
- Kumulierte Reduktion seit Beginn: 849 Zeichen.
- CSS-Bereinigung **noch nicht vollständig**; weitere historische Overrides benötigen eine Prüfung der tatsächlichen Kaskade.
- Nach diesem Commit sind CI und Sichtprüfung auf dem Zielgerät erneut erforderlich.


## Vierte Bereinigung – Commit `635b013` (2026-11-09)

- Veralteten `inset:12% 14% 15%!important`-Block aus 0.2.15 entfernt.
- In 0.2.16 die später durch 0.2.17 überschriebenen Regeln für Hintergrundbild, Regal-Inset, dekorative Pseudoelemente, Header und `z-index` entfernt.
- `filter:none!important` und `backdrop-filter:none!important` für Buchcover erhalten.
- Weitere 443 Zeichen entfernt; insgesamt seit Beginn **1292 Zeichen** weniger CSS.
- Die aktuelle 0.2.17/0.2.19-Darstellung und responsive Regeln sind nicht absichtlich geändert worden.
- **Offen:** GitHub-CI-Lauf und Sichtprüfung auf der MuPiBox für diesen Commit. Das erfolgreiche Testergebnis des vorherigen Pakets deckt diese Änderung noch nicht ab.
- Responsive Zielvorgabe: dynamische Darstellung für 5, 7 und 10,1 Zoll; Größen sind keine festen Pixelauflösungen.

## Gerätetest bestätigt – 2026-11-09

Der Nutzer hat das aktuelle CI-Testpaket auf der MuPiBox mit **10,1-Zoll-Monitor** installiert und bestätigt: **funktioniert**. Die vorherigen CSS-Bereinigungen einschließlich Commit `635b013` sind damit auf dem aktuellen Bildschirm praktisch getestet. Die GitHub-Actions-Prüfungen waren ebenfalls grün. Tests auf **5 und 7 Zoll** folgen später; deren Darstellung ist noch nicht bestätigt.


## Fünfte Bereinigung – Commit `0da41d2` (2026-11-09)

Zwei durch die spätere 0.2.17-Gestaltung mit gleicher Spezifität und `!important` überschriebene Regeln aus 0.2.14 entfernt: das alte Hintergrundbild `buchladen-leere-regale.jpg` und das alte `#shelf .books`-Inset. Andere 0.2.14-Regeln bleiben erhalten, insbesondere die bildbezogenen Regeln.

- Weitere 169 Zeichen entfernt; kumulativ **1461 Zeichen**.
- Noch **nicht** auf der MuPiBox getestet. Vor weiteren Änderungen den neuesten grünen CI-Lauf und dessen Paket auf 10,1 Zoll prüfen.

## Gerätetest nach fünfter Bereinigung – 2026-11-09

Der Nutzer hat das Paket aus dem richtigen Bücherkiste-Workflow auf dem aktuellen **10,1-Zoll-Monitor** geprüft und meldet: **„sieht gut aus“**. Die fünfte CSS-Bereinigung (Commit `0da41d2`) gilt damit für diese Anzeige als visuell bestätigt. 5- und 7-Zoll-Darstellung bleiben ungetestet.


## Sechste Bereinigung – Commit `2721a5c` (2026-11-09)

Alte Größenbegrenzungen für `#shelf .books .book-slot .book img` aus 0.2.14 entfernt, einschließlich der damaligen `max-width:540px`-Sonderregel. Die späteren gleich spezifischen `!important`-Regeln aus 0.2.15 und 0.2.17 überschreiben diese Werte; die aktuelle 0.2.17-Regel setzt `max-height:79%`, `max-width:74%` und bei maximal 540 px Breite `max-width:79%`.

- Weitere **172 Zeichen** entfernt; insgesamt **1633 Zeichen** seit Beginn.
- GitHub-CI und Gerätetest für diesen Commit noch nicht bestätigt. Auf dem 10,1-Zoll-Monitor prüfen; 5 und 7 Zoll bleiben als spätere Testziele bestehen.

## Gerätetest nach sechster Bereinigung – 2026-11-09

Nach Ergänzung der Paketintegritätsprüfung im GitHub-Workflow (Commit `1607106`) konnte der Nutzer das neue Testartefakt ohne Firefox-Blockierung herunterladen und bestätigte auf dem **10,1-Zoll-Monitor**: **„funktionier alles“**. Damit ist die sechste CSS-Bereinigung (Commit `2721a5c`) auf diesem Gerät praktisch bestätigt. Der vorherige Firefox-Alarm ist damit nicht technisch als Fehlalarm bewiesen; die zusätzlichen CI-Prüfungen ersetzen keinen Malware-Scan. Tests auf 5 und 7 Zoll bleiben ausstehend.

## Siebte Bereinigung – Commit `c4ee41f` (2026-11-09)

Die alte `background`-Kurzschreibweise aus Version 0.2.12 (`buchladen-szene.svg`) in `#shelf` wurde entfernt. Die spätere 0.2.17-Definition überschreibt dieselbe Eigenschaft mit `!important`; `padding`, `position` und `overflow` aus dem alten Block bleiben erhalten.

- Weitere **86 Zeichen** entfernt, kumulativ **1719 Zeichen**.
- GitHub-CI und Gerätetest für diesen Stand stehen noch aus; keine Aussage über erfolgreiche visuelle Prüfung auf 10,1 Zoll oder 5/7 Zoll.

### Gerätetest der siebten Bereinigung – 2026-11-09

Nutzer bestätigt nach Installation des Testpakets auf der MuPiBox mit 10,1-Zoll-Monitor: „auch ok funktioniert“. Siebte Bereinigung (`c4ee41f`) damit auf diesem Gerät visuell und funktional bestätigt. 5- und 7-Zoll-Tests weiterhin offen.

## Achte Bereinigung – Commit `b492409` (2026-11-09)

Entfernt wurde der vollständige alte 0.2.14-Dekorationsblock für `#shelf .books::before` und `::after` (Regalbretter: Höhe, Farbverlauf, Schatten). Seit 0.2.17 sind beide Pseudoelemente mit `display:none!important` und `content:none!important` deaktiviert. Die tatsächlichen Regalbretter gehören zum Hintergrundbild.

- **278 Zeichen** entfernt; kumulativ **1997 Zeichen**.
- GitHub-CI und Sichttest für diese Änderung stehen noch aus; 5- und 7-Zoll-Tests ebenfalls.

## Neuer Bibliothekshintergrund – Teststand 2026-11-09

Für den nächsten Test wurde in `style.css` die Hintergrunddatei von `buchladen-original.jpg` auf die bereits vom Nutzer in den Branch hochgeladene Datei `Fröhlicher Pauli Maulwurf in der Bibliothek.png` umgestellt (Commit `f80b9c4`). Die ursprüngliche JPG-Datei bleibt im Repository. Dies ist ein noch nicht auf dem Gerät getesteter Stand, zusammen mit der achten CSS-Bereinigung (`b492409`).

## Gerätetest – achte CSS-Bereinigung und neuer Bibliothekshintergrund (2026-11-09)

Nach Umbenennung des hochgeladenen Hintergrundbildes zu `bibliothek.png` und Anpassung der CSS-Referenz (Commit `711737b`) bestätigt der Nutzer für die MuPiBox auf dem 10,1-Zoll-Monitor: **„das bild passt und alles andere sieht gut aus und funktioniert“**. Damit sind sowohl die achte CSS-Bereinigung (`b492409`) als auch der neue Bibliothekshintergrund praktisch bestätigt. Die zuvor fehlgeschlagenen Paketläufe betrafen den nicht unterstützten Dateinamen mit Umlaut/Leerzeichen; das Problem wurde durch den einfachen Dateinamen behoben. Tests auf 5 und 7 Zoll stehen weiterhin aus.

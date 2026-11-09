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

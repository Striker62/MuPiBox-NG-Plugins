# MuPi Community-Spiele: kostenloser Rechtecheck und Release-Freigabe

**Entscheidung vom 04.11.2026:** Der Projektbetreiber wünscht die öffentliche,
kostenlose Open-Source-Veröffentlichung ohne kostenpflichtige Markenprüfung.
Die folgende kostenlose Vorprüfung ist durchgeführt. Es wird **keine juristische
Markenfreiheit garantiert**; das dokumentierte Restrisiko ist bewusst akzeptiert.

Prüfprotokoll: [Marken- und Copyright-Vorprüfung](trademark-preflight-2026-11-04.md).
GitHub-Dokumentation: [Issue #1](https://github.com/splitti/MuPiBox-NG-Plugins/issues/1).

## Freigegebene Anzeigenamen und unveränderliche IDs

| Spieltitel (de) | Installations-ID |
| --- | --- |
| **MuPi Kreuz & Kreis** | \`community.tictactoe\` (historische ID muss bleiben) |
| **MuPi 4er-Reihe** | \`community.mupi-four-in-a-row\` |
| **MuPi Krümelwurm** | \`community.mupi-kruemelwurm\` |

Alle Spiele nutzen eigenständig entwickelte Mechaniken und Grafiken.
Die gebräuchlichen früheren Vorbilder werden **nicht** als Produktnamen,
Marketingmarken, Logos oder Titelbilder übernommen. Nicht mit Dritten assoziieren.

## Durchgeführte Prüfpunkte

- [x] Öffentliche kostenlose Web-Recherche zu den Namen; Ergebnisse und Grenzen
      im Prüfprotokoll dokumentiert.
- [x] Bekannte potenzielle Überschneidungen, insbesondere **MUPI** (EU
      Nr. 008212045, Klassen 5/29/35) und US Nr. 6478819 (Klasse 28),
      ausdrücklich protokolliert; keine pauschale „MuPi ist frei“-Behauptung.
- [x] Spielregeln eigenständig mit Go/JavaScript entwickelt; Quelltext
      stichprobenartig auf Drittmedien geprüft.
- [x] Eigene SVG-/Canvas-Grafiken statt kopierter Brettspiel-,
      Schlangen- oder Marken-Illustrationen.
- [x] Projektlizenz MIT; Go/WebAssembly baut das Laufzeit-Lizenzdokument
      \`GO_LICENSE.txt\` in das Spielpaket ein.
- [x] Sieben Boxsprachen, 2P/MuPi-Gegner bzw. Geschwindigkeitsstufen programmiert.
- [x] CI, Unit-Tests und sichere ZIP-Paketvalidierung vorgesehen; vor jedem
      GitHub-Release vollständig ausführen.
- [x] Entscheidung dokumentiert, **kein Geld für externe Markenrecherche**
      auszugeben und trotzdem mit eigenen Namen zu veröffentlichen.

## Restunsicherheiten und freiwillige Nachkontrollen

- [ ] Amtliche vollständige DPMA-/EUIPO-/WIPO-Identitäts- und Ähnlichkeitssuche
      einschließlich Übersetzungen, Klassen 9/28/41, älterer
      geschäftlicher Kennzeichen und Werktitel. **Nicht als durchgeführt
      ausgeben**; kostenpflichtige Rechtsberatung wird nicht beauftragt.
- [ ] Echte 800×480-Hardware-Tests auf Pi 4/5 mit Touch/Controller,
      sofern die Box erreichbar ist.
- [ ] Nach Release regelmäßig Meldungen über Verwechslungsgefahr/Markenrechte
      prüfen und bei konkretem Konflikt Namen/Gestaltung zeitnah ändern.

## Technischer Release-Prozess

1. Alle Tests erfolgreich, alle drei Builds per \`tools/mupiapp.py validate\`
   geprüft, UTF-8 und Berechtigungen kontrolliert.
2. Vorhandene App-ID \`community.tictactoe\` behalten, neue Versionsnummer und
   den neuen sichtbaren Namen \`MuPi Kreuz & Kreis\` verwenden.
3. Pakete nur in offizielles GitHub-Release des eigenen Repositories hochladen.
4. Originalbytes aus dem **veröffentlichten Release** herunterladen und
   SHA-256 überprüfen.
5. Erst anschließend \`catalog/apps.json\` mit dem echten Release-Hash,
   Version, Assetnamen und permissions aktualisieren; keinen erfundenen Hash.
6. Keine automatische Installation auf fremden Geräten oder Umgehung der
   lokalen Admin-Berechtigungsfreigabe.

**Hinweis:** Gratis/Open Source verringert nicht automatisch die Haftung oder
markenrechtliche Reichweite. Bei Abmahnung oder plausiblen Kollisionen
vorübergehend den Eintrag zurücknehmen und nach Umbenennung erneut prüfen.

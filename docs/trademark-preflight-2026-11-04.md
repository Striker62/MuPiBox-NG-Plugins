# Vorläufige Marken- und Copyrightprüfung – MuPi Community-Spiele

**Recherchestand:** 04.11.2026. **Releaseentscheidung:** Der Projektbetreiber akzeptiert nach kostenloser Vorprüfung ausdrücklich das verbleibende Markenrisiko und wünscht Veröffentlichung. Keine rechtliche Garantie oder amtliche Negativauskunft.
**Nachweisdokument zu [Issue #1](https://github.com/splitti/MuPiBox-NG-Plugins/issues/1).**

## Reichweite und Grenzen

Dies ist eine orientierende Internet-/Quellcode-Prüfung, **keine vollständige
registergestützte Markenrecherche oder juristische Rechtsfreigabe**. Erfasst sind
öffentliche Webquellen, Marken-Zweitauskünfte und die drei Projekt-Quellverzeichnisse.
Eine belastbare Negativauskunft über deutsche/Unions-/IR-Marken ist nicht möglich:

- DPMAregister ist unter https://register.dpma.de/DPMAregister/Uebersicht
  erreichbar, für den vollständigen Suchbetrieb aber JavaScript-abhängig.
- TMview unter https://www.tmdn.org/tmview/ lieferte hier keine auswertbaren
  Trefferlisten; EUIPO-Seiten waren teils zugriffsbeschränkt.
- WIPO Global Brand Database https://branddb.wipo.int/ verlangt
  eine interaktive Captcha-Prüfung. Eine erfolgreiche Datenbankabfrage wurde
  **nicht** durchgeführt. Keine Null-Treffer behaupten.
- Suchmaschinen sind **kein Ersatz** für DPMA-/EUIPO-/WIPO-Registersuche,
  Ähnlichkeitsrecherche und Abgleich relevanter Klassen/Rechtsstände.

## Konkrete, belegte Markenfunde (Zweitquellen, Rechtsstand amtlich nachprüfen)

1. **MUPI**, Unionsmarke Nr. **008212045**, Inhaberin MEDIS, farmacevtska
   družba, d.o.o.; öffentlich als **registered** und Klassen **5, 29, 35**
   aufgeführt. Keine unmittelbar einschlägige Spiele-/Softwareklasse 9/28/41
   in dieser Quelle. Das bedeutet **nicht**, dass das Wort „MuPi“ allgemein frei
   wäre; Klassen begrenzen den Schutz nicht schematisch.
   Quelle: https://www.trademarkelite.com/europe/trademark/trademark-detail/008212045/Mupi
2. **MUPI**, US-Registrierung **6478819**, Anmeldenummer **90401052**;
   in einer öffentlichen Markendatenbank als registriert geführt, Klasse **28**
   mit u.a. Puppen, Spielzeug, Puzzles und *handheld game consoles*. Für
   Deutschland kein unmittelbares US-Markenrecht; bei US-Vermarktung
   gesondert klären. Unterschied zu Browsergames/Klasse 9 rechtlich würdigen.
   Quelle: https://trademarks.justia.com/904/01/mupi-90401052.html

Andere öffentliche Namensträger (nicht automatisch eingetragene Marken):
„MUPI SYSTEMS“ als IT-Unternehmen in Brasilien.
Quelle: https://www.linkedin.com/company/mupi-systems/

## Namen der drei Spiele – orientierende Einschätzung

| Vorgesehener Anzeigetitel | Vorprüfung | Vorläufiges Risiko DE/EU |
| --- | --- | --- |
| **MuPi Kreuz & Kreis** | Für den vollständigen Namen keine offensichtlich identische öffentliche Spielemarke in der Websuche auffindbar. **„Kreuz & Kreis“** allein wird aber bereits als Handelsbezeichnung eines X/O-Holzspiels verwendet. | **Eher niedrig bis mittel**, v.a. bei Nutzung nur des generischen Untertitels. MuPi-Präfix stets sichtbar lassen, keine Darstellung des anderen Anbieters übernehmen. |
| **MuPi 4er-Reihe** | Für die vollständige Kombination kein offensichtlicher identischer Treffer in der Websuche. „Vier in einer Reihe“ und „4er-Reihe“ sind beschreibende Spiel-/Mathematikformulierungen; bestehende Produkte nutzen ähnliche Wörter. | **Eher niedrig**, sofern eigenständige Gestaltung und kein Hasbro/CONNECT-4-Marketing. |
| **MuPi Krümelwurm** | Für die vollständige Wortfolge und naheliegende Schreibvarianten kein offensichtlicher identischer Treffer in der indexierten Websuche. | **Eher niedrig** und vergleichsweise eigenständig, aber keine Register-Negativauskunft. |

Beleg des fremden Spieltitels „Kreuz & Kreis“:
https://babykindwelt.de/products/tictale

Beleg der beschreibenden Spielbezeichnung „Vier in einer Reihe“:
https://www.merkur-werbemittel.de/artikel/vier_in_einer_reihe/58250/437

Die sichtbaren Übersetzungen der drei Titel (`en/fr/es/it/nl/sv`) benötigen
im amtlichen Register ebenfalls einen eigenständigen Ähnlichkeitsabgleich.

## Spielprinzip, Code, Gestaltung

- **§ 69a Abs. 2 UrhG** schützt nicht die Ideen und Prinzipien eines
  Computerprogramms, wohl aber dessen konkrete Ausdrucksform:
  https://www.gesetze-im-internet.de/urhg/__69a.html
- Für die drei Varianten (3×3 X/O, fallende Spielsteine 7×6, Wurm sammelt
  Krümel) ist eine eigenständige Implementation grundsätzlich möglich.
- Im Entwicklungsbranch `feature/multilingual-board-games-ai` wurden die
  Go/JS-Spielregeln, die HTML-/Canvas-Darstellung, lokale SVG-Symbole
  und Manifeste stichprobenartig betrachtet. Keine übernommenen
  Hasbro-/Nokia-Produktgrafiken, Fremd-Sounddateien, Logo-Dateien oder
  externen Assets erkennbar. Dies ist **keine automatisierte Plagiatsprüfung**.
- Repo-Lizenz: **MIT**, `LICENSE` mit Copyright (c) 2026 Olaf Splitt.
  Die Go/WASM-Build-Routine verlangt die passende Go-Lizenzdatei und
  packt `GO_LICENSE.txt` mit in den Build; vor Release den tatsächlichen
  ZIP-Inhalt samt Lizenz erneut kontrollieren.
- Der Go-Runtime-Vermerk ist nötig; Marken und Copyrights werden durch
  bloße MIT-Lizenzierung des eigenen Codes nicht aufgehoben.
- Spielregeln und technische KI-Algorithmen sind deutlich weniger
  problematisch als die **Übernahme konkreter geschützter Grafik,
  Quellcode-Ausdrucksformen, Musik oder charakteristischer Markenaufmachung**.
- Ergänzend **§ 5 MarkenG** (Werktitel/geschäftliche Bezeichnungen),
  **§§ 9, 14 MarkenG** (Verwechslungsgefahr) beachten:
  https://www.gesetze-im-internet.de/markeng/__5.html
  https://www.gesetze-im-internet.de/markeng/__9.html

## Bedeutung der bestehenden MuPiBox-Nutzung

Die öffentliche Projektgeschichte weist `MuPiBox` seit 2022 nach (öffentliches
GitHub-Repo und mupibox.de). Das ist ein nützlicher Herkunfts- und
Benutzungsnachweis, **begründet aber ohne weitere Prüfung weder eine
eingetragene Marke noch eine weltweite Exklusivität am isolierten Wort „MuPi“**.
https://github.com/splitti/MuPiBox
https://mupibox.de/ueber-uns/

## Empfehlung und verbindliche Restarbeiten

**Technisch/urheberrechtlich: vorläufig unauffällig.**
Für eine öffentliche DE/EU-Veröffentlichung sind die Namen **plausibel
verwendbar**, aber **nicht rechtlich freigegeben**. Aufgrund der bekannten
„MUPI“-Eintragungen und der fremden Verwendung „Kreuz & Kreis“ sollte keine
absolute Markenfreiheit behauptet werden.

**Weiterhin nicht vollständig überprüft / empfohlene Nachkontrollen:**
- [ ] Interaktive amtliche DPMAregister-/EUIPO-TMview-/WIPO-Suche mit
  Screenshots/Datumsnachweis (identisch + ähnlich + alle Übersetzungen;
  Klassen 9, 28, 41 und sachlich verwandte Waren/Dienstleistungen).
- [ ] Rechtlich relevante Treffer hinsichtlich Zeitrang, Schutzgebiet,
  Waren-/Dienstleistungsnähe und Verwechslungsgefahr bewerten.
- [ ] Fremde Benutzungskennzeichen und Werktitel abschließend prüfen.
- [ ] Rechtlich verantwortliche Person bestätigt den Release oder lässt
  offene Zweifelsfälle von einem Markenrechtsanwalt beurteilen.
- [ ] Geräte-/Sprach-/Build-/Release-Asset-/SHA-256-Prüfung wie in der
  Release-Checkliste.
- [ ] Erst danach offizielle Assets veröffentlichen und den Katalog umstellen.

Die frühere interne Release-Sperre wird auf ausdrücklichen Wunsch des
Projektbetreibers durch die dokumentierte Best-Effort-Risikoentscheidung ersetzt.
Das bedeutet **nicht**, dass Register negativ geprüft oder ältere Rechte ausgeschlossen wurden.

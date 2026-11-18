# MuPi Water Battle – Community App (0.2.2)

Eigenständig gestaltetes, kindgerechtes Offline-Suchspiel mit drei Modi: Quick 8×8 (2 Boote mit 3/2 Feldern), Classic 10×10 (5 Boote mit 5/4/3/3/2 Feldern) und Max 12×12 (7 Boote mit 5/4/4/3/3/2/2 Feldern). Keine Verbindung zu Hasbro, Battleship oder kommerziellen Ausgaben. Spiellogik, Bildschirmtexte und Illustrationen wurden eigenständig für MuPiBox erstellt. Die ausgewählten Audiodateien stammen von externen, in SOUND_CREDITS.txt genannten Urhebern und haben eigene Lizenzen.

## Spielen
1. Die Boote des gewählten Modus rechts mit Touch platzieren, über **Drehen** ausrichten. Boote dürfen sich auch diagonal nicht berühren. **Zufall** platziert die ganze Flotte automatisch.
2. **Los geht's!** drücken. Jetzt links ein unbekanntes Feld antippen.
3. Ihr und MuPi habt abwechselnd einen Zug. Treffer, Wasser und komplett aufgedeckte Boote werden markiert; die zuerst vollständig entdeckte gegnerische Flotte gewinnt.
4. Schwierigkeitsgrade: **Leicht** (Zufall), **Mittel** (Nachbarfelder nach Treffern), **Schlau** (Wahrscheinlichkeits-Suche). Keine der Varianten liest beim Zielen die verdeckten gegnerischen Boote.
5. Drei hochwertige freigestellte MuPi-Reaktionen: Wasser-Platscher, erschrockener orangefarbener MuPi im Boot und MuPi im Rettungsring. Versenkte Boote erhalten andersfarbige Sterne, Treffer einen kurzen Bild-Wackeleffekt (bei reduzierter Animation aus). Die neuen Reaktionsgrafiken sind freigestellte PNG-Dateien statt der bisherigen, weiterhin als historische Vorlage vorhandenen SVG-Grafiken.
6. Die ausgewählten sechs Audiodateien sind lokal in `assets/audio/*.ogg` enthalten: Hintergrundmusik (20,6 Sekunden, loopfähig), Wasser-Plopp, Treffer-Explosion, Versenkt, Gewonnen und Verloren. Die Lautstärke der Effekte und Musik lassen sich getrennt regeln, Musik ist abschaltbar; Einstellungen werden über die `storage`-Berechtigung gespeichert. Die Materialien und Lizenzen sind in `SOUND_CREDITS.txt` dokumentiert (Big Explosion CC BY 3.0: Blender Foundation). **Hinweis:** Die aktuelle NG-Version bietet über `MuPiBoxSDK.audio.playNote()` nur Noten/Instrumente, jedoch keine Sample-/Musikdatei-Wiedergabe über PipeWire. Daher sind die Original-Samples bislang nur in der normalen Browser-Vorschau hörbar; auf der MuPiBox bleiben die bisherigen nativen Tonfolgen als Fallback. Die Dateisamples werden erst nach einer sicher implementierten nativen SDK-Erweiterung hörbar.

## Auf dem 5-Zoll-Display
Optimiert für 800×480, Touch, Vollbild und eingebauten Zurück-Button. Im Max Mode wird wegen der 12×12-Felder zunächst ein einzelnes Spielfeld vergrößert. Mit dem Ansichtsbutton im Max-Spiel direkt zwischen Gegner und Meine Karte umschalten; in der Platzierungsphase zwischen eigener Karte und beiden Spielfeldern. Der native Header ist ausgeblendet, App-Hintergrund aktiviert. Controller: Steuerkreuz navigiert, **A** wählt, **X** dreht in der Aufbauphase, **Y** platziert die Boote automatisch (im laufenden Max-Spiel: Ansicht wechseln), **Start** beginnt und **Zurück** verlässt die App.

## Installieren
Ab passender NG-Alpha mit Community-App-Manager:

    python3 tools/build_wasserschlacht.py

Danach dist/mupi-wasserschlacht.mupiapp im NG-Admin unter Community-Apps als Paket installieren und die Berechtigungen **controller**, **audio** und **storage** bestätigen. Die App arbeitet vollständig offline. Die App wird über den offiziellen Community-App-Katalog veröffentlicht; sie erfordert kein Backend.

## Tests
    node --test tests/mupi_wasserschlacht.test.cjs tests/waterbattle_audio.test.cjs

Quellcode: MIT-Lizenz des Community-Plugin-Repositories. Das grundsätzliche traditionelle Spielprinzip lässt sich unabhängig umsetzen; die konkrete Erscheinung kommerzieller Produkte, deren Markenzeichen und Grafikmaterial werden nicht übernommen. Für produktive Veröffentlichung sollte zusätzlich eine finale Marken-/Designprüfung erfolgen.

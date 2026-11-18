# MuPi Water Battle – Community App (0.2.0)

Eigenständig gestaltetes, kindgerechtes Offline-Suchspiel mit drei Modi: Quick 8×8 (2 Boote mit 3/2 Feldern), Classic 10×10 (5 Boote mit 5/4/3/3/2 Feldern) und Max 12×12 (7 Boote mit 5/4/4/3/3/2/2 Feldern). Keine Verbindung zu Hasbro, Battleship oder kommerziellen Ausgaben. Alle Regeln, Illustrationen, Texte und Soundfolgen dieser App wurden für MuPiBox erstellt.

## Spielen
1. Die Boote des gewählten Modus rechts mit Touch platzieren, über **Drehen** ausrichten. Boote dürfen sich auch diagonal nicht berühren. **Zufall** platziert die ganze Flotte automatisch.
2. **Los geht's!** drücken. Jetzt links ein unbekanntes Feld antippen.
3. Ihr und MuPi habt abwechselnd einen Zug. Treffer, Wasser und komplett aufgedeckte Boote werden markiert; die zuerst vollständig entdeckte gegnerische Flotte gewinnt.
4. Schwierigkeitsgrade: **Leicht** (Zufall), **Mittel** (Nachbarfelder nach Treffern), **Schlau** (Wahrscheinlichkeits-Suche). Keine der Varianten liest beim Zielen die verdeckten gegnerischen Boote.
5. Drei Animationen: Wasser-Platscher, erschrockener orangefarbener MuPi im Boot und MuPi im Rettungsring. Original-Vektorzeichnungen liegen unter assets/.
6. Ton-Schalter oben rechts. Tonfolgen laufen auf NG über MuPiBoxSDK.audio.playNote mit Audio-Berechtigung; im normalen Browser werden zusätzlich echte synthetische Platsch-Geräusche erzeugt. **Wichtig:** Der MuPiBox-NG-Plugin-Host stellt derzeit noch keine verlässliche Wiedergabe beliebiger WAV-/OGG-Samples über PipeWire bereit. Daher sind native Box-Sounds musikalische Wasser-/Treffermotive und nicht aufgenommene Platscher.

## Auf dem 5-Zoll-Display
Optimiert für 800×480, Touch, Vollbild und eingebauten Zurück-Button. Im Max Mode wird wegen der 12×12-Felder zunächst ein einzelnes Spielfeld vergrößert. Mit dem Ansichtsbutton zwischen Gegner / Boote / Beide umschalten; in der Platzierungsphase zwischen Boote / Beide. Der native Header ist ausgeblendet, App-Hintergrund aktiviert. Controller: Steuerkreuz navigiert, **A** wählt, **X** dreht in der Aufbauphase, **Y** platziert die Boote automatisch (im laufenden Max-Spiel: Ansicht wechseln), **Start** beginnt und **Zurück** verlässt die App.

## Installieren
Ab passender NG-Alpha mit Community-App-Manager:

    python3 tools/build_wasserschlacht.py

Danach dist/mupi-wasserschlacht.mupiapp im NG-Admin unter Community-Apps als Paket installieren und die Berechtigungen **controller** und **audio** bestätigen. Die App arbeitet vollständig offline. Sie ist bewusst nicht automatisch im offiziellen Katalog und erfordert kein Backend.

## Tests
    node --test tests/mupi_wasserschlacht.test.cjs

Quellcode: MIT-Lizenz des Community-Plugin-Repositories. Das grundsätzliche traditionelle Spielprinzip lässt sich unabhängig umsetzen; die konkrete Erscheinung kommerzieller Produkte, deren Markenzeichen und Grafikmaterial werden nicht übernommen. Für produktive Veröffentlichung sollte zusätzlich eine finale Marken-/Designprüfung erfolgen.

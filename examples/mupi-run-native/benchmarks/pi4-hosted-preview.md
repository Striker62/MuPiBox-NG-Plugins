# MuPi Run auf dem Raspberry Pi 4 · 21. November 2026

Die native Preview verkürzt den Start und braucht in den beiden Vergleichsläufen weniger RAM. Die CPU-Last steigt leicht. In allen vier Durchläufen gab es Bildpausen über 100 ms. Auf Janbox ist der 30-Minuten-Nachweis offen.

## Gleicher Parcours auf Box 83

Web 0.8.7 aus Release `v0.1.0-preview.60`, native Daten aus `v0.1.0-preview.62`, NG-Entwicklungshost. Zwei Läufe je Variante, Reihenfolge Web A → Qt A → Qt B → Web B. Alle vier endeten nach 2.880 Physiktakten bei **1.061,44 m, 39 Noten und 30 Hinderniswellen**. Der Pi 4B Rev. 1.1 mit 1 GB und 800 × 480 nutzte Qt 6.8.2, OpenGL ES 3.1 und Mesa 26.2.6 mit Broadcom V3D 4.2.14.0. Die laufende NG-Oberfläche auf Alpha.71 blieb aktiv. Die beobachteten Temperaturen lagen zwischen 60,4 und 63,8 °C. Vor den vier Läufen meldete die Firmware jeweils `throttled=0x0`.

| Lauf | Spielbilder/s¹ | P50 / P95 / P99 (ms) | >100 ms | Maximum | Spielbereit² | CPU³ | PSS / RSS Spitze³ |
|---|---:|---:|---:|---:|---:|---:|---:|
| Web A | 28,31 | 33,3 / 49,8 / 96,5 | 13 | 502 ms | 12,52 s | 105,7 % | 341,2 / 558,4 MiB |
| Qt A | 28,99 | 28 / 57 / 87 | 12 | 176 ms | 1,79 s | 113,4 % | 281,1 / 345,2 MiB |
| Qt B | 29,12 | 28 / 57 / 88 | 8 | 142 ms | 1,49 s | 113,3 % | 280,6 / 345,1 MiB |
| Web B | 27,97 | 33,3 / 46,4 / 63,1 | 10 | 1.161 ms | 10,56 s | 106,9 % | 351,0 / 571,7 MiB |

¹ Web zählt vollständig ausgeführte Spiel-Zeichenaufrufe. Qt zählt unterschiedliche Spielbildrevisionen beim `frameSwapped` des Fensters. Webs äußeres Qt-Fenster meldete zusätzlich 30,40 bzw. 30,63 Swaps/s, mit maximal 570 bzw. 718 ms Abstand. Fenster-Swaps können dieselbe Spielszene enthalten. Die unterschiedlichen Messpunkte begrenzen den direkten FPS-Vergleich. DRM-Renderzähler und der Qt-Renderer belegen Aktivität der V3D. Die Auslesung des physischen Panels und die GPU-Beschleunigung einzelner Chromium-Canvas-Operationen lassen sich damit nicht belegen.

² Start des QML-Prozesses bis zur startbereiten Szene mit vorbereiteten Effekten. Installation und Start des isolierten NG-Backends liegen vor diesem Intervall.

³ CPU über Prozesszeit, 100 % entspricht einem Kern. Spitzen aus Zwei-Sekunden-Stichproben der Testgruppe einschließlich QML, Weston, NG-Testhost und ggf. Chromium-Kindprozessen. PSS verteilt gemeinsam genutzte Seiten anteilig. Vorhandene Hauptoberfläche, Systemlast und Dateicache liefen regulär weiter.

## Was die Änderung an der Musik bewirkt

In separaten Läufen wurde nur die Musikdatei samt Pfad im identisch instrumentierten Web-Paket ausgetauscht. Beide Varianten verwenden denselben NG-Testhost mit direktem PCM-Lader. Die 44,5 Sekunden lange Schleife liegt in der Preview als 48-kHz-Mono-WAV mit 16 Bit vor. Die kurzen Effekte werden vorbereitet und wiederverwendet. Während der Messungen ging der echte Software-Mix ausschließlich in einen Speichersenker. Die Hardwarelautstärke für die Tests betrug 0 %.

| Web-Test | Dauer des SDK-Musikaufrufs | Ergebnis |
|---|---:|---|
| Ogg A / B | 4.501 / 3.986 ms | Beide Parcours vollständig |
| PCM A | 16 ms | Spiel ging nach 0,22 m in Pause, Lauf unvollständig |
| PCM B | 26 ms | Parcours vollständig, 28,38 Spielbilder/s, 411 ms längste Pause, 365,3 MiB Spitzen-PSS |

Die PCM-Datei spart beim ersten Musikaufruf mehrere Sekunden. Sie ist größer und hat das Ruckeln der Webversion nicht behoben. Die Messung erfasst den SDK-Aufruf bis zur Antwort. Für hörbare Latenz am Lautsprecher und die Ursache des vom Nutzer gemeldeten Einfrierens gibt es keinen Nachweis.

## Dauerbetrieb und Eingabe

- **Box 83, integrierter Zwischenstand vor der Änderung an der Sitzungsverwaltung.** In 1.800,017 s wurden 54.133 unterschiedliche Spielbilder ausgegeben, 51.869,44 m simuliert und 1.731 Noten eingesammelt. Mittel 30,07 Bilder/s, P50/P95/P99 29/57/61 ms, zwölf Pausen über 100 ms, Maximum 135 ms. QML-PSS nach Minute 1/15/29 betrug 147,82/148,03/148,27 MiB. Im Lauf traten keine SDK-Fehler auf. Der frühere Versuch mit stark wachsendem Speicher wurde verworfen.
- **Box 83, geänderte Sitzungsverwaltung.** Der Vergleichsparcours endete bei denselben 39 Noten, ohne SDK-Fehler. 28,93 Bilder/s, P99 90 ms, Maximum 234 ms, Spitzen-PSS 281,8 MiB. Im separaten Prozessverlusttest behielt der Host bei einem zwölf Sekunden angehaltenen Qt-Client die Sitzung. Nach SIGKILL waren die Stimmen freigegeben. Vorher war nachweislich PCM mit Audiosignal gemischt worden.
- **Janbox, Pi 4B Rev. 1.5 mit 1 GB.** Ein nativer Kurzlauf mit der vorherigen Sitzungsverwaltung schloss den Vergleichsparcours ab. 29,38 Bilder/s, P50/P95/P99 28/57/73 ms, sechs Pausen über 100 ms, Spitze 141 ms. Der Webversuch protokollierte beim Musikstart einen Bridge-Timeout und wurde bei 160,5 MiB verfügbarem Systemspeicher vom Testwächter beendet. Ein nativer Langlauf endete nach rund 17½ Minuten mit widerrufener Sitzung. Der Wiederholungsversuch mit verbindungsgebundener Sitzung erreichte die Speicherschutzschwelle bei 161,2 MiB. Der Wächter beendete das Testfenster. Die regulären Dienste liefen weiter.
- **Software-Eingabe auf Box 83.** 24 injizierte Aktionen für Sprung, Grätsche und beide Spurrichtungen bis zum nächsten Fenster-Swap mit neuer Revision: Median 27 ms, Spannweite 11–133 ms. Physischer Touch, Controllertransport und Panelreaktion kommen im normalen Betrieb hinzu.
- **Freigabegrenzen.** Die Messungen liefen mit echtem V3D auf einer privaten Weston-Fläche neben EGLFS. Physischer Touch und Controller mit Trennen/Verbinden, hörbare Ausgabe, Rückkehr auf dem sichtbaren Panel und ein vollständiger Geräte-Rollback benötigen eigene Abnahme. Ein Raspberry Pi 5 stand nicht zur Verfügung.

## Nachtest mit Preview 0.1.1

**Bildstillstand.** Auf Box 83 wurde ausschließlich der Qt-Prozess der isolierten Spielinstanz nach drei Sekunden Laufzeit für 1,7 s angehalten und wieder freigegeben. Die bisherige Version wechselte bei 42,16 m in Pause. Die korrigierte Version lief selbstständig weiter und beendete denselben Parcours nach 49,736 s mit 1.061,44 m, 39 Noten und 30 Wellen. Der längste gemessene Bildabstand betrug einschließlich der Unterbrechung 1.754 ms. Ein zusätzlicher Qt-Test unterbricht einen laufenden Sprung und prüft dessen Position und Alter vor und nach dem nächsten Physiktakt. Bewusstes Pausieren und Fortsetzen wurden ebenfalls geprüft.

**Ton gegen stumm.** Vier Durchläufe auf Box 83 in der Tabellenreihenfolge mit derselben Preview, derselben V3D-Ausgabe, demselben Seed und isoliertem PCM-Mixer. Für die stummen Läufe standen beide gespeicherten Spiel-Lautstärken auf null. Der Host bereitete die drei kurzen Effekte in allen vier Läufen vor. In den beiden stummen Läufen gab es keinen Musik- oder Effekt-Abspielaufruf. Alle erreichten dasselbe Ziel.

| Wiedergabe | Spielbilder/s | P99 | Längste Bildpause | Pausen >100 ms | Spitzen-PSS der Testgruppe |
|---|---:|---:|---:|---:|---:|
| Mit Ton A | 29,11 | 84 ms | 160 ms | 7 | 241,9 MiB |
| Stumm A | 28,90 | 87 ms | 171 ms | 6 | 232,5 MiB |
| Stumm B | 29,03 | 89 ms | 133 ms | 7 | 232,8 MiB |
| Mit Ton B | 28,91 | 85 ms | 214 ms | 9 | 242,1 MiB |

Ein weiterer vollständiger V3D-Lauf nutzte den Produktionsmixer mit einem privaten PipeWire-Ausgang auf Box 83. Der Monitor zeichnete 2.651.648 Stereo-Frames mit 4.676.500 von null verschiedenen Einzelwerten auf. Nach dem Beenden waren die letzten 500 ms still. Der Parcours erreichte 28,99 Spielbilder/s, P99 89 ms und eine längste Bildpause von 159 ms. Die Messung war am physischen Lautsprecher stumm.

**Janbox, wiederholter Langlauf.** Beide Versuche liefen mit Paket 0.1.0, verbindungsgebundener SDK-Sitzung, temporärem Spielspeicher auf ext4 und einem Go-Speicherziel von 32 MiB. Die installierte Hauptoberfläche lief parallel. Mit Alpha.71 beendete der Schutz den Versuch nach rund 20:58 Minuten beobachteter Qt-Laufzeit bei 161,5 MiB verfügbarem Systemspeicher. Mit Alpha.72 waren es rund 20:39 Minuten und 164,2 MiB. Die Hintergrundmusik startete im zweiten Versuch in 28 ms, die 1.591 Effektaufrufe dauerten im Median 1,88 ms. Um 14:22 Uhr wechselte diese isolierte Instanz in Pause. Auf dem physischen Display wurde zu dieser Zeit das veröffentlichte Webspiel geöffnet. Es liegt für beide Versuche kein vollständiger FPS-Datensatz über 30 Minuten vor. Ob der vom Nutzer ursprünglich beobachtete Stillstand denselben Auslöser hatte, bleibt offen.

**Menü und Rückwechsel auf Box 83.** Ein QtTest auf der vollständigen NG-Oberfläche wählte die Spielekachel, startete einen Lauf, sprang und kehrte zum Menü zurück. Bei absichtlich gelöschtem Sammelton blieben die übrigen Klänge verfügbar. In einem separaten Test installierte der ARM64-Kandidat 0.1.1 über die Admin-API. Das mitgelieferte Recovery-Programm stellte in einer privaten Installation den vorherigen Runtime-Pfad, die Unit-Dateien und die geprüfte Datenbank wieder her. Der originale Alpha.71-Host startete anschließend erfolgreich. Seine unveränderte QML-Oberfläche zeigte den Versionshinweis, ein synthetischer Touch auf „Zurück zum Menü“ löste den regulären Ausstieg aus. Der Neustart wurde nur protokolliert. Physischer Touch, ein echter Controller, die Abnahme am Lautsprecher und ein Geräte-Neustart bleiben offen.

## Spielansichten und Reproduktion

[Aufnahmen vom Pi 4, Web und Qt nebeneinander](pi4-hosted-scenes.webp) · [Messdaten je Lauf, einschließlich unvollständiger Versuche](pi4-hosted-preview.json) · [Werkzeuge und Ablauf](../../../tools/benchmarks/mupi-run/README.md)

Die Ansichten wurden getrennt vom Zeitvergleich aufgenommen. Beide Renderer erhalten für die Szenen dieselben Positionen und Posen. Der native HUD und die Touchflächen haben ein eigenes Layout. Das öffentliche Paket enthält Spielressourcen und deklarative Daten. Zum Start wird der [passende NG-Host](https://github.com/splitti/MuPiBox-NG/pull/131) benötigt.

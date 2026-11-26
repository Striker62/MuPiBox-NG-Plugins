# FotoSpaß – MuPiBox-NG Plugin

FotoSpaß ist ein kindgerechtes Fotobox-Plugin für MuPiBox-NG.

## 1.3.0-beta.6: Bildausschnitt und Spiegelbild

Nach einer Aufnahme oder dem Laden eines Fotos öffnet sich der Reiter **Bild**:

- **+ / −** vergrößert den Bildausschnitt bis auf das Vierfache. Anschließend
  das Foto mit einem Finger oder der Maus verschieben. Der Ausschnitt bleibt
  innerhalb des Bildes; die Ausgabe behält ihre ursprünglichen Abmessungen.
- **Spiegeln** dreht die Ausrichtung horizontal um.
- **Zurück** setzt Zoom und Position zurück; die gewählte Spiegelung bleibt.
- **Rückgängig** stellt auch den vorherigen Ausschnitt wieder her.

Das Kameralivebild und neue Kameraaufnahmen erscheinen standardmäßig gespiegelt.
Geladene Fotos werden zunächst unverändert ausgerichtet. Die Spiegelung der
Aufnahme und der Ausschnitt werden in die gespeicherte JPEG-Kopie übernommen.
Das unbearbeitete Kameraoriginal im SDK-Bereich `originals` bleibt ungespiegelt
und ohne Zuschnitt. Vorlagen und bereits vorhandene Originaldateien bleiben
unverändert. Malerei und Accessoires liegen separat über dem Foto und werden
beim Ändern des Hintergrund-Ausschnitts nicht verschoben oder gespiegelt.

Die Editoransicht und der JPEG-Export verwenden denselben gerenderten Foto-Canvas.
Automatische Tests prüfen Spiegelung, begrenztes Verschieben, Rückgängig und
die Verwendung dieses Canvas beim Speichern. Die Touchbedienung auf der Box
muss noch getestet werden.

**Helligkeit:** Beim Gerätetest wurde gemeldet, dass das Foto bereits nach der
Aufnahme dunkler als die Live-Vorschau ist. Der App-Code setzt keinen
Helligkeitsfilter. Vorschau und hochauflösende Aufnahme sind getrennte
SDK-Aufrufe; ein Belichtungswechsel der Kamera ist eine mögliche Ursache.
Die öffentliche SDK bietet keine Einstellung für Belichtung oder Aufwärmzeit.
Diese Version korrigiert diesen Helligkeitsunterschied nicht durch einen
pauschalen Bildfilter; die Ursache auf dem Gerät ist noch nicht abschließend
geklärt.

## 1.3.0-beta.5: einfachere Kinderoberfläche

**Kamera einstellen**, Kameraauswahl, Gerätesuche und Kamera-Ausschalten sind
aus der Kinderoberfläche entfernt. FotoSpaß wählt die vorhandene Kamera
automatisch; die Fotoauflösung bleibt eine Einstellung der Adminseite.
Nach einem Stopp gibt es statt des technischen Dialogs die einfache Aktion
**Kamera starten** an derselben Stelle wie **Foto machen**. Ein Stopp durch
die Box wird weiterhin respektiert und führt nicht zum automatischen Neustart.

Beim Öffnen eines Bildes und beim Laden in den Editor steht nur noch
**Foto bereit!**. Die Erklärung für Eltern: Bearbeitungen werden als neue
Kopien gespeichert; das geladene Original bleibt erhalten. Die vorhandenen
Bestätigungen zum Löschen und zum Verwerfen ungespeicherter Änderungen bleiben.

## 1.3.0-beta.4: Fotoauflösung in der Adminseite

Die Auflösung wird unter **FotoSpaß · Verwaltung → Kamera** eingestellt.
Nach **Kameraeinstellung speichern** die Kinder-App schließen und neu öffnen.
In der Kinder-App gibt es keine Auflösungsauswahl mehr. Zur Auswahl stehen
Automatisch, 640 × 480, 1280 × 720, 1920 × 1080, 2560 × 1440 und 3840 × 2160.
Automatisch verwendet den größten angebotenen nativen Modus bis 3840 × 2160.
Bei einer nicht angebotenen Vorgabe wird die größte native Auflösung innerhalb
der Vorgabe verwendet, andernfalls die kleinste. Die Vorschau bleibt unabhängig
davon kleiner und passt ihren Abfrageabstand an die Box an.

Die zusätzliche Berechtigung `storage` dient dem lesenden Zugriff auf diese
Admin-Vorgabe über `config.get`. Die Adminseite nutzt dafür `settings.read`
und `settings.write`. Andere App-Einstellungen bleiben erhalten; Schreibkonflikte
werden über die Revision erkannt. Dateifreigaben und Foto-Uploads bleiben gleich.

## 1.3.0-beta.3: automatische Anpassung an Vorschau-Limits

Bei „preview rate limited“ erhöht die App den Abfrageabstand schrittweise
(250, 500, 1000, maximal 1500 ms) und behält den angepassten Abstand für die
Kamerasitzung auch nach erfolgreichen Bildern bei. Das verhindert, dass sie
nach jeder erfolgreichen Vorschau erneut die gleiche Grenze überschreitet.
Ein Test simuliert eine Box, die nur eine Vorschau pro Sekunde zulässt.
Die Fotoauflösung ist unabhängig davon; ab beta.4 wird sie in der Adminseite gewählt.

## 1.3.0-beta.2: Vorschaufehler und Startdiagnose

Die neue Vorschau wird mit 125 ms Mindestabstand abgefragt, mit Reserve zur
angeforderten Rate von 10 FPS. Vorübergehende Rate-Limits und Meldungen über
noch nicht bereite Bilder werden bis zu dreimal mit wachsendem Abstand erneut
versucht. Berechtigungsfehler stoppen sofort. Bei dauerhaften Fehlern bleibt
der konkrete Fehlertext sichtbar, auch wenn die Box anschließend den von der
App angeforderten Kamerastopp bestätigt. Ein externer Sicherheitsstopp wird
weiterhin beachtet und startet die Kamera nicht automatisch neu.

Diese Änderungen sind mit simulierten Rate-Limits, dauerhaften Fehlern und
Berechtigungsfehlern geprüft. Die Ursache des auf der Box gemeldeten kurzen
Livebilds ist ohne deren genaue Fehlermeldung noch nicht bestätigt.

## 1.3.0-beta.1: neue Foto- und Kamerafunktionen

Diese Testversion verwendet den öffentlichen SDK-Stand aus
`feat/photo-camera-sdk-20261126` (Commit `3c8a509`). Die Box muss die neuen
Funktionen anbieten; die App prüft dies beim Start. Auf älteren unterstützten
Hosts bleiben bisherige Kameraaufnahme und Fotospeicherung erhalten.

- Native Fotoauflösung bis 3840 × 2160. Ab beta.4 steht die Vorgabe in der
  Adminseite; sie wird beim nächsten App-Start gelesen.
- Vorschau: bis 640 × 480 mit angeforderten 10 Bildern pro Sekunde, jeweils
  nur eine Anfrage. Die tatsächliche Geschwindigkeit hängt von Kamera und Box ab.
  Vor dem Foto wartet die App auf eine ausstehende Vorschau und nimmt dann
  ein separates Foto in der gewählten Auflösung auf. Keine Hochskalierung.
- **Meine Fotos → Fotoalbum:** freigegebenes Album auswählen, Bild öffnen,
  **In Originale übernehmen** antippen. Anschließend unter **Originale**
  auswählen und bearbeiten. Die neue Berechtigung `photo-import` muss freigegeben
  sein. Der Import verändert das Quellfoto nicht.
- Mit dem neuen SDK bleiben aufgenommene Originale beim Speichern separat im
  privaten SDK-Bereich `originals`; Ergebnisse liegen unter `edited`. Bereits
  gespeicherte Fotos aus dem bisherigen Bereich `photos` bleiben unter
  **Meine Fotos** sichtbar. Speichern einer Vorlage erstellt eine bearbeitete Kopie.
- Damit neue Ergebnisse im MuPiBox-Fotoalbum erscheinen, muss die Veröffentlichung
  des deklarierten Bereichs `edited` in der App-Verwaltung freigegeben werden.
  Originale werden nicht automatisch veröffentlicht.
- **Vorlagen** und der Admin-Upload bleiben unter dem SMB-Ordner
  `CommunityApps/community.fotospass/originale/`. Dieser Ordner ist unabhängig
  vom privaten SDK-Bereich `originals`. Vorhandene Dateien werden nicht migriert.

Gespeicherte Kameraaufnahmen und Ergebnisse sind JPEG mit 90 % Qualität.
Importierte Albumoriginale behalten die Quellbytes (JPEG/PNG). Es gelten die
SDK-Grenzen von 8 MiB und 16 Megapixeln pro gespeicherten Bild sowie die gemeinsame
App-Quote. Scheitert das Speichern eines Ergebnisses, bleibt der Entwurf geöffnet;
ein bereits gesichertes Original wird beim erneuten Versuch nicht dupliziert.

Automatische Tests prüfen die neue Anbindung mit einem simulierten Host,
einschließlich ausstehender Vorschau, abgebrochener Aufnahme, Speicherversuch
mit Wiederholung und Albumimport. Die tatsächliche Kamerageschwindigkeit,
Auflösung und Veröffentlichung müssen auf der Box getestet werden.

## Funktionen

- Live-Vorschau über die offizielle Kamera-API
- Fotoaufnahme mit Countdown (3, 5 oder 10 Sekunden)
- Bilder mit Farben und Radierer bearbeiten
- Accessoires wie Brillen, Hüte, Kronen und Tierohren hinzufügen
- Accessoires per Touch verschieben und skalieren
- Fertige Fotos über die MuPiBox-Foto-API speichern
- Galerie mit Vorschaubildern und Großansicht
- Einzelne Fotos mit Sicherheitsabfrage löschen
- Bestehende bildbasierte Kategorien: Bärte, Tiere, Fantasie, Brillen und Hüte
- Eigene PNG-Accessoires zusätzlich über SMB laden und im Foto mitspeichern

## Eigene Accessoires (ab 0.5.3)

Ausgangspunkt ist das vom App-Entwickler bereitgestellte, funktionierende Paket
`FotoSpass-0.5.2.mupiapp`. Kategorien, Darstellung und Kamerabedienung werden
beibehalten. Die verkürzte SDK-Datei dieses Pakets wird durch das offizielle
SDK aus `sdk/mupibox-sdk.js` ersetzt.

Für den SMB-Zugriff nennt die aktuelle SDK-Dokumentation **MuPiBox NG
0.2.0-alpha.40 oder neuer** als Voraussetzung. Die App fordert zusätzlich
`shared-assets` an und deklariert `sharedDirectories: ["accessoires"]`.
Die Berechtigung muss bei Installation bzw. Update bestätigt werden.
Der Zugriff ist ausschließlich lesend und nur auf dem lokalen Touchscreen
verfügbar; die entfernte Admin-Vorschau lädt keine SMB-Accessoires.

Unter der vorhandenen SMB-Freigabe gilt diese Struktur:

```text
CommunityApps/
  community.fotospass/
    accessoires/
      baerte/
        vollbart.png
      tiere/
        katzenohren.png
      fantasie/
        zauberhut.png
      brillen/
        meine-brille.png
      huete/
        sommerhut.png
```

Die Ordner ergänzen die bereits vorhandenen Kategorien. Beispiel unter Windows:
`Q:\CommunityApps\community.fotospass\accessoires\brillen\meine-brille.png`.
Es wird nicht rekursiv gesucht und keine `index.json` benötigt.
Eingebaute Accessoires bleiben immer erhalten; auch eine eigene `glasses.png`
ersetzt die eingebaute Brille nicht. Fehlende Ordner oder eine verweigerte
Freigabe blockieren die eingebauten Accessoires nicht.

Unterstützt werden **PNG-Dateien**, empfohlen mit transparentem Hintergrund und
etwa 512 × 512 Pixeln. Grenzen: maximal 1024 Pixel je Bildseite, 2 MiB pro Datei,
12 eigene Dateien je Kategorie (bis zu 60 insgesamt). Dateinamen dürfen
Buchstaben einschließlich Umlauten, Ziffern, Leerzeichen, Unterstriche und
Bindestriche enthalten; Dateiendung `.png` bzw. `.PNG`, maximal 100 Zeichen.
Versteckte Dateien, Pfadbestandteile, SVG und andere Bildformate werden ignoriert.
Die Dateinamen dienen als Bezeichnung für Hilfetexte und Bedienhilfen; die
Bildauswahl bleibt wie bisher ohne sichtbare Textbeschriftung.

Beim App-Start und beim erneuten Öffnen des Reiters **Accessoires** wird die
Dateiliste aktualisiert. Bilder werden erst bei Bedarf eingelesen und geprüft.
Bereits geladene Bilder bleiben während der Bearbeitung verfügbar; geänderte
Bilddateien werden nach einem App-Neustart neu gelesen. Eigene PNGs behalten
beim Platzieren und Speichern ihr Seitenverhältnis und ihre Transparenz.
Der Bildcache ist auf 32 PNGs und zusammen 16 MiB begrenzt; nicht mehr benötigte
Bildadressen und beim Schließen auch noch ausstehende Ladevorgänge werden
bereinigt. Diese App-Grenzen sind keine Quote für den SMB-Speicher des Besitzers.

## Hardware

Getestet mit Raspberry Pi 4, eMeet C960 USB-Webcam und 800 × 480-Touchdisplay.

## Installation

Das Plugin kann aus dem Community-App-Katalog installiert werden. Für ein lokales Paket müssen die reinen Repository-Dokumente ausgeschlossen werden, weil der NG-Installer nur unterstützte Web-Runtime-Dateitypen zulässt:

```bash
python3 tools/mupiapp.py pack examples/fotospass dist/fotospass.mupiapp --exclude README.md
```

Das Paket kann anschließend über die Entwicklerfunktion der MuPiBox-NG-Pluginverwaltung installiert werden.

## Version

1.3.0-beta.6 (Bildausschnitt, Verschieben und Spiegelbild)

## Neue Oberfläche (ab 0.5.5)

Cremefarbener Hintergrund, Akzente in Türkis, Koralle und Sonnengelb sowie
pastellfarbene Accessoire-Karten ersetzen die bisherige dunkle Darstellung.
Die wichtigsten Schaltflächen verwenden mitgelieferte SVG-Symbole statt
geräteabhängiger Emoji-Zeichen. Es werden keine externen Bilder oder Schriften
geladen. Foto und Kameraaufnahme bleiben unverändert.

Die Aktionen für Größe, Fertig/Entfernen, Rückgängig, Speichern und Neues Foto
bleiben außerhalb der scrollenden Auswahl sichtbar. Die Kategorien bleiben
bildbasiert; alle bestehenden PNG-Import- und Bearbeitungsfunktionen bleiben
erhalten. Layout und Bedienung wurden in einer Browser-Vorschau mit simuliertem
Host bei 800 × 480 geprüft. Anschließend hat der App-Entwickler Version 0.5.5 auf
MuPiBox NG Alpha 41 vollständig getestet und bestätigt: neue Oberfläche und
Touchbedienung, Kameraaufnahme, SMB-Accessoires, Bearbeitung, Speichern,
Galerie und Rücknavigation einschließlich des Schutzes ungespeicherter Fotos.

## Zurück zur MuPiBox (ab 0.5.4)

Der kleine Pfeil oben links führt über `MuPiBoxSDK.exit()` zur MuPiBox zurück.
Ein laufender Countdown wird abgebrochen und die Kamera vor dem Verlassen
gestoppt. Bei einem aufgenommenen, noch nicht gespeicherten Foto fragt die App:
**„Foto verwerfen und zurück zur MuPiBox?“**. Mit **Weiter bearbeiten** bleibt
das Foto erhalten. Bereits gespeicherte Fotos werden durch Verlassen oder
Verwerfen eines Bearbeitungsstands nicht gelöscht. Während des Speicherns ist
der Pfeil deaktiviert; spätere Änderungen erfordern erneut eine Bestätigung.

Das Manifest setzt `display.showBackButton` auf `false`, um den nativen
Zurück-Button samt Titel auszublenden. Gespeicherte MuPiBox-App-Einstellungen
können diese Vorgabe übersteuern; nötigenfalls den nativen Button dort
ausschalten. Die unabhängige Kamera-Freigabe und der Sicherheits-Stopp der
MuPiBox bleiben unter Kontrolle des Hosts.

SMB-Import, Platzierung, Skalierung und Mitspeichern aus Version 0.5.3 sowie
die Navigation und der Schutz ungespeicherter Fotos aus Version 0.5.4 wurden
vom App-Entwickler auf MuPiBox NG Alpha 41 bestätigt.

## Prüfungen und Gerätetest

```sh
node --test tests/test_fotospass_shared.js tests/test_sdk_shared.js tests/test_sdk_photos.js tests/test_sdk_camera_volume.js
python3 tools/mupiapp.py validate dist/fotospass.mupiapp
```

Der FotoSpaß-Audit prüft Code und SDK, baut das Paket und scannt es sowie seinen
Inhalt mit ClamAV. Die automatischen Tests verwenden einen simulierten Host;
Kamera, Touchbedienung und PNG-Darstellung auf der MuPiBox müssen separat
getestet werden:

1. Update installieren und `shared-assets` bestätigen.
2. Ein transparentes PNG unter `accessoires/brillen/` ablegen.
3. Ein Foto aufnehmen; die eigene Brille muss zusätzlich in **Brillen** erscheinen.
4. Brille platzieren, skalieren, rückgängig machen und mit Malen kombinieren.
5. Foto speichern und in der Galerie prüfen: Position, Seitenverhältnis und
   Transparenz müssen erhalten bleiben.
6. Die eingebauten Accessoires, ein neues Foto und das Löschen mit Bestätigung
   wie bisher prüfen. Ohne SMB-Freigabe müssen die eingebauten weiter funktionieren.

Der offizielle Katalog bleibt auf das veröffentlichte Paket festgelegt.
Eine spätere Veröffentlichung erfordert einen passenden neuen Release-Eintrag;
dieser Entwicklungsbranch ändert `catalog/apps.json` nicht.

## Geplante Erweiterung

Direkter Fotodruck, beispielsweise über einen Canon SELPHY CP1500. Dafür wird eine geeignete Druckschnittstelle in MuPiBox-NG benötigt.

## Korrektur 0.5.6

Der Countdown verdunkelt die Kameravorschau nicht mehr. Zahl und Hinweis
liegen ohne deckenden Hintergrund über dem Bild; ein Textschatten hält sie lesbar.
Der App-Entwickler hat den transparenten Countdown mit echter Kamera auf der MuPiBox bestätigt.

## Korrektur 0.5.7

Die Accessoire-Schaltflächen verwenden einfache Zeichen für Vergrößern (+),
Fertig (Häkchen) und Entfernen (×), um die fehlerhafte Symbolanzeige auf der
MuPiBox zu vermeiden. Der transparente Countdown aus 0.5.6 ist enthalten.
Der App-Entwickler hat die korrekte Darstellung auf der MuPiBox bestätigt.
# Testversion 1.0.2-beta.1: gleichmäßigere Kameravorschau

Die Vorschau fordert Bilder mit mindestens 1100 ms Abstand zwischen den
Aufnahmestarts an. Die nächste Anfrage wird nach Abschluss der laufenden
Aufnahme geplant, statt auf einen festen 1350-ms-Takt zu warten. Dauert die
Aufnahme länger, entsteht dadurch keine zusätzliche Wartezeit bis zum nächsten
Takt. Es läuft höchstens eine Aufnahme gleichzeitig. Verdeckte Seiten pausieren
die Aufnahmen; Stoppen, Fotoaufnahme und App-Ende verwerfen ausstehende Ergebnisse.

Das ist weiterhin eine Einzelbildvorschau innerhalb der dokumentierten
Kamera-SDK-Grenzen, kein Video-Stream. Die tatsächliche Bildrate hängt von
Kamera und Host ab und muss auf der MuPiBox gemessen werden. Das Design und
die Foto-/Accessoire-Funktionen bleiben erhalten.
# Testversion 1.1.0-beta.1: Galeriefotos bearbeiten

Unter „Meine Fotos“ ein gespeichertes Foto öffnen und „Bearbeiten“ wählen.
Das Bild wird in seiner vorhandenen Auflösung (bis 16 Megapixel) in den
Editor übernommen. Accessoires und Zeichnungen können hinzugefügt werden.
„Foto speichern“ erstellt über die bestehende Foto-SDK eine neue Kopie;
das gewählte Original wird nicht ersetzt oder gelöscht. Bereits im Bild
enthaltene Zeichnungen und Accessoires sind Teil des gespeicherten Bilds
und lassen sich nicht nachträglich einzeln verschieben.

Beim Wechsel von einem ungespeicherten Entwurf wird dessen Verwerfen
ausdrücklich bestätigt. Ein Fehler beim Bildladen erhält den bisherigen
Entwurf. Die Kamera bleibt während der Bearbeitung ausgeschaltet.

Diese Version greift auf die eigene FotoSpaß-Galerie zu. Der Import aus
dem allgemeinen MuPiBox-Fotoalbum benötigt eine zusätzliche SDK-Funktion.
Eine Trennung in Original- und Ergebnisordner ist damit noch nicht umgesetzt.
Die verbesserte Kameravorschau aus 1.0.2-beta.1 bleibt enthalten.
# Testversion 1.1.0-beta.2: Fotos als JPEG

FotoSpaß speichert neue Kameraaufnahmen und bearbeitete Galeriefotos als
JPEG mit Qualität 90 %. Transparente Bildbereiche werden vor dem Speichern
auf Weiß zusammengeführt; Accessoires behalten ihre Transparenz im Editor.
Die Host-Fotoverwaltung erhält einen Blob mit `image/jpeg` und bestimmt
Dateiname und Speicherort. Es werden keine vorhandenen Bilder automatisch
umgewandelt. Bearbeitete Bilder werden weiterhin als neue Kopie gespeichert.
Ergebnisse über 8 MiB werden mit einem sichtbaren Fehler abgewiesen, der
Entwurf bleibt erhalten. Die Original-/Ergebnisordner-Trennung und der
allgemeine Fotoalbum-Import sind weiterhin separate Erweiterungen.
# Testversion 1.2.0-beta.1: FotoSpaß-Verwaltung mit Upload

In der MuPiBox-Administration bei FotoSpaß „App-Verwaltung öffnen“ wählen.
Die neue Seite lädt Fotos vom Computer in den explizit freigegebenen
SMB-Ordner `CommunityApps/community.fotospass/originale/`. Angefordert werden
nur die Admin-Capabilities `files.list`, `files.read` und `files.write`,
beschränkt auf `originale`. Die vorhandene Accessoire-Freigabe bleibt bestehen.
Die zusätzlichen Berechtigungen beim Update bestätigen. Alpha 85 oder neuer
wird für die Verwaltung vorausgesetzt; tatsächlichen Upload auf der Box testen.

JPEG, PNG, WebP und GIF können ausgewählt werden (max. 100 Dateien pro Batch,
32 MiB pro Ausgangsdatei und 50 Megapixel vor der Konvertierung). GIF wird
als Standbild übernommen. Die Upload-Kopie wird als JPEG mit Qualität 90 %
auf weißem Hintergrund erzeugt. Standardmäßig wird die Kantenlänge auf
2560 Pixel begrenzt; ohne Verkleinerung werden höchstens 16 Megapixel
akzeptiert. Das Ergebnis darf höchstens 8 MiB groß sein. Eindeutige Dateinamen
und leere `expectedRevision` verhindern das Überschreiben bestehender Dateien.
Die Ausgangsdateien auf dem Computer bleiben unverändert.

„Bereitgestellte Fotos“ zeigt den Ordnerinhalt. Vorschaubilder werden erst
auf Knopfdruck geladen, um größere Sammlungen nicht vollständig in den
Browser-Arbeitsspeicher zu laden. Eine gekürzte Host-Ordnerliste wird als
solche gekennzeichnet. Stoppen erfolgt nach dem laufenden Upload. Bei einem
Fehler bleiben offene Dateien in der Auswahl; erfolgreich hochgeladene
Dateien werden bei einem erneuten Versuch nicht erneut gesendet.

Dies ist zunächst eine Admin-Uploadfunktion. Die Touch-App zeigt diese
Originale noch nicht in ihrer Galerie. Der Zugriff auf das allgemeine
MuPiBox-Fotoalbum und die Auswahl der bereitgestellten Originale zum Bearbeiten
folgen separat. Bisherige Foto-SDK-Aufnahmen und Ergebnisse bleiben im
bestehenden Host-Fotospeicher und werden nicht verschoben. Diese neue
Verwaltungsseite kann einen Schreibschutz des Host-Dateisystems nicht umgehen.
# Testversion 1.2.0-beta.2: Vorlagen in der Touch-App bearbeiten

Unter „Meine Fotos“ kann zwischen gespeicherten Fotos und „Vorlagen“
gewechselt werden. Vorlagen werden ausschließlich über die lesende Shared-
SDK aus `CommunityApps/community.fotospass/originale/` geladen. JPEG, PNG,
WebP und GIF bis 8 MiB und 16 Megapixel werden unterstützt; HEIC und
ausführbare Formate werden nicht geladen. Die Übersicht erzeugt kleine
JPEG-Vorschauen nacheinander, um große Originaldateien nicht gesammelt als
Vorschaubilder im Speicher zu halten.

Vorlage antippen und „Bearbeiten“ wählen. Accessoires und Zeichnungen
funktionieren wie bei einer Kameraaufnahme. Das Ergebnis wird als neues
JPEG mit Qualität 90 % über die Foto-SDK in „Meine Fotos“ gespeichert.
Die Quelldatei im Vorlagenordner bleibt unverändert. Bei Vorlagen wird kein
Löschen-Button angeboten. Ein noch nicht gespeicherter Entwurf wird vor dem
Ersetzen ausdrücklich bestätigt. Fehlende Shared-Freigaben und Bildfehler
werden angezeigt; die eigene Foto-Galerie bleibt davon unabhängig.

Die Auswahl benötigt eine gültige lokale Touch-Sitzung für Shared-Dateien.
Der allgemeine MuPiBox-Fotoalbum-Import ist nicht Teil dieser Änderung.
Solange der Admin-Upload durch den bekannten Host-Schreibschutz blockiert
ist, können die Bilder per SMB in `originale` kopiert werden. Dann in der
App „Vorlagen“ wählen und bei Bedarf „Aktualisieren“ drücken.

# FotoSpaß – MuPiBox-NG Plugin

FotoSpaß ist ein kindgerechtes Fotobox-Plugin für MuPiBox-NG.

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

Ausgangspunkt ist das vom Anwender bereitgestellte, funktionierende Paket
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

0.5.5 (Testversion mit freundlicher Fotobox-Oberfläche)

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
Host bei 800 × 480 geprüft. Anschließend hat der Anwender Version 0.5.5 auf
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
vom Anwender auf MuPiBox NG Alpha 41 bestätigt.

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
Der Countdown mit echter Kamera muss auf der MuPiBox noch geprüft werden.

## Korrektur 0.5.7

Die Accessoire-Schaltflächen verwenden einfache Zeichen für Vergrößern (+),
Fertig (Häkchen) und Entfernen (×), um die fehlerhafte Symbolanzeige auf der
MuPiBox zu vermeiden. Der transparente Countdown aus 0.5.6 ist enthalten.
Die Darstellung auf dem Gerät muss noch bestätigt werden.

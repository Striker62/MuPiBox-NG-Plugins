# MuPi CD-Player 0.2.0 (experimentelle Vorschau – Hardwareabnahme offen)

Die Community-App **MuPi CD-Player** für MuPiBox NG verwendet die lokal
angeschlossenen USB-CD/DVD-Laufwerke. Audio-CDs werden **direkt über
mpv/PipeWire** abgespielt – ohne Music Assistant, externen Player, Ripping oder
Datei-Upload. Kategorie: Werkzeuge.

## Funktionen (Softwarestand; ohne reale CD-Hardware getestet)

- 512×512-Cover mit einer deutlich sichtbaren Audio-CD im nativen Coverflow.
- USB-Laufwerke `sr0` … `sr99` mit Namen und Tray-Status erkennen;
  manuelles Suchen oder etwa alle 11 Sekunden automatisch im Leerlauf.
- Audio-CD-/CD-Extra-Inhaltsverzeichnis mit Audio-Titelnummern, TOC-Längen
  und MusicBrainz-Disc-ID; Wechsel einer CD wird auch bei identischer
  Titelanzahl erkannt. Reine Daten-CDs werden abgewiesen.
- Titelwahl, Play/Pause, Next/Previous, Stop, Position/Seek,
  Auswerfen, Schublade schließen und Laufwerk anhalten.
- Bei mehreren Laufwerken zeigt die App nur den Status des ausgewählten
  Gerätes an; die Host-Bridge schützt vor Wiedergabebefehlen für eine
  inzwischen ausgetauschte CD.
- Titel, Künstler, Album und kleines Cover **nur auf bewussten Klick auf
  „Albuminfos online“** von MusicBrainz / Cover Art Archive abrufen.
  Ohne Internet bleibt die App vollständig nutzbar; ein negativer
  Lookup löst keine wiederholte Suche aus.
- Kein direkter Gerätezustand, keine CD-Samples, Provider-Logindaten oder
  beliebiger Netzwerk-/Systemzugriff in Community-JavaScript.

### Datenschutz

Der optionale Online-Lookup sendet die ausschließlich aus CD-Titelsektoren
berechnete **MusicBrainz-Disc-ID** sowie die bei HTTPS-Verbindungen
üblichen Verbindungsdaten an MusicBrainz. Für das Cover wird eine
Release-ID an Cover Art Archive/Internet Archive geschickt. Die App selbst
hat keine Netzwerkberechtigung. Es werden niemals Audioinhalte oder
Authentifizierungsdaten übermittelt. Der Host begrenzt Antwortgröße,
Auflösung, Hosts, Laufzeit, Redirects und Anfragerate.

## Experimentelle Veröffentlichung

Die App wird als **öffentliche Vorschau ohne abgeschlossene Hardwareabnahme**
angeboten. Die veröffentlichte .mupiapp ist softwareseitig geprüft, aber
nicht an einem echten USB-CD-Laufwerk getestet. Ohne NG-Host mit
`optical-media` (MuPiBox-NG Host-PR #154, abhängig von #153) lässt sie
sich nicht verwenden; ältere NG-Versionen können die Installation wegen
der fehlenden Berechtigung ablehnen. Das ist eine bekannte Einschränkung.

## Installation: Reihenfolge und Sicherheit

1. Zuerst **NG-Host PR #153** (gesicherte Community-App-Administration)
   nach der aktuellen Alpha-Basis übernehmen und testen.
2. Danach **NG-Host PR #154** (optical bridge) übernehmen. Beide
   PRs sind noch Draft; die Hardwareprüfung kann mangels Laufwerk nicht
   bestätigt werden.
3. Dann dieses `.mupiapp` aus Plugins PR #120 installieren und
   `optical-media` bei der Installation/unter Berechtigungen genehmigen.
4. Ein extern versorgtes oder geeignet mit USB-Strom versorgtes optisches
   Laufwerk sowie eine Audio-CD anschließen. Laufwerksberechtigungen
   ausschließlich eng über die Linux-Gruppe `cdrom` bzw. `0660`
   auf den unprivilegierten Host-Dienst vergeben. **Nie** `MODE=0666`,
   `chmod a+rw` oder Root-Rechte für die Community-App.
5. Verifizieren, dass mpv mit CDDA/libcdio gebaut ist und der ausgewählte
   Audioausgang/PipeWire korrekt funktioniert.

## Grenzen / offene reale Hardwaretests

- Geräte-/USB-Reset, nicht standardkonforme Mixed-Mode-CDs sowie exotische
  Tray-Mechaniken benötigen reale Hardwareabnahme.
- Nur CD-Extra mit einem nachgelagerten Daten-Track wird unter der
  standardisierten 11.400-Sektoren-Annahme unterstützt. Andere Mixed-Mode-
  Discs werden **aus Sicherheitsgründen abgewiesen**.
- Die per mpv gemeldete Zeitleiste und Seek-Grenzen müssen auf echter
  CDDA-Hardware abgeglichen werden; bis dahin experimentell.
- Vor einer **Hardware-Freigabe**: Pi 4/5, Hotplug/USB-Reset, Auswurf bei aktiver CD,
  paralleler Audiofokus (Spotify/MA/Sendspin), Lautstärkelimit,
  Widerruf von `optical-media`, Elternschutz und längere Abspieldauer
  prüfen. Kein Live-Test wurde durchgeführt.

## Paketbau / lokale Tests

```sh
python3 tools/mupiapp.py pack examples/usb-cd-player dist/usb-cd-player.mupiapp --exclude README.md --exclude cover-art.svg
python3 tools/mupiapp.py validate dist/usb-cd-player.mupiapp
node --check examples/usb-cd-player/app.js
node --test tests/usb_cd_player.test.cjs tests/test_sdk_platform.js
```

Manifest benötigt `optical-media` als einzige Berechtigung.
Die Web-Vorschau hat **keinen** Zugriff auf diese Funktion. Ohne Host
mit den neuen SDK-Methoden zeigt die App nur einen Aktualisierungshinweis.

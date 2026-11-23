# USB-Audio-CD: Classic 5.1 -> MuPiBox NG (Prüfung vom 23.11.2026)

## Fundstelle: tatsächlich vorhandene Classic-CD-Implementierung

**Korrektur der ersten Main-Branch-Prüfung:** Die CD-Implementierung existiert bereits,
aber nicht in den `main`-Branches. Sie befindet sich in
[`Lippsson/MuPiBox` auf `dev5.1`](https://github.com/Lippsson/MuPiBox/tree/dev5.1/extensions/cd)
und [`wowa1990/MuPiBox` auf `upstream-v5.1-pr`](https://github.com/wowa1990/MuPiBox/tree/upstream-v5.1-pr/extensions/cd).
Die Classic-Extension heißt `cd` und hat Version **1.0.1**.

Der Ursprung ist [wowa1990/MuPiBox PR #41](https://github.com/wowa1990/MuPiBox/pull/41),
**am 09.11.2026 gemergt** – allerdings in einen 5.1-Entwicklungs-/Integrationsbranch,
**nicht in den Main-Branch von `splitti/MuPiBox`**. Dieser PR brachte zugleich
Winamp-Theme, Extensions-Framework, Uhr und Wetter. Auf `dev5.1` sind die
fertigen Pakete `extensions/dist/cd-1.0.0.mpx` und `cd-1.0.1.mpx` vorhanden.

Relevante Dateien im Classic-Quellcode:
- [`extensions/cd/manifest.json`](https://github.com/Lippsson/MuPiBox/blob/dev5.1/extensions/cd/manifest.json): Rechte, CD-Erkennung und optionale Internet-Metadaten.
- [`cd-drive.js`](https://github.com/Lippsson/MuPiBox/blob/dev5.1/extensions/cd/cd-drive.js): `CDROM_DRIVE_STATUS` (0x5326), `CDROM_DISC_STATUS` (0x5327), TOC und Track-LBAs (`0x5305`, `0x5306`), Barcode/MCN (`0x5311`), Laufwerksüberwachung, Tray/Eject (`0x5309`, `0x5319`), Spin-down.
- [`cd-lookup.js`](https://github.com/Lippsson/MuPiBox/blob/dev5.1/extensions/cd/cd-lookup.js): Discogs mit optionalem Token und Barcode, MusicBrainz-Disc-ID aus TOC, Cover Art Archive, Laufzeitabgleich und Bildprüfung.
- [`player.js`](https://github.com/Lippsson/MuPiBox/blob/dev5.1/extensions/cd/player.js): logische Albumquelle, CDDA/mpv-Titel, Laufwerksstatus, Disc-Cover-Cache, Miss-Cooldown, Zeitberechnung aus LBAs, Seek, Stop/Spin-down und Eject.
- [`display.js`](https://github.com/Lippsson/MuPiBox/blob/dev5.1/extensions/cd/display.js): CD-Reiter, Medienansicht und Eject aus Winamp.
- [`cd-drive.test.js`](https://github.com/Lippsson/MuPiBox/blob/dev5.1/extensions/cd/test/cd-drive.test.js) und [`cd-lookup.test.js`](https://github.com/Lippsson/MuPiBox/blob/dev5.1/extensions/cd/test/cd-lookup.test.js): Tests für Wechsel, USB-Resets, TOC, Metadaten und Cover.

## Vergleich zum bereits vorbereiteten NG-Entwurf (PR #145 / Plugins #120)

| Funktion | Classic 5.1 | NG-Erstentwurf | Maßnahme |
| --- | --- | --- | --- |
| USB-CD erkennen und Tracks abspielen | vorhanden | vorhanden | NG-Player weiterverwenden; mpv-CDDA an Realgerät testen |
| Disc-Anwesenheit/Tray-/Spin-up-Status | Kernel-Status via `0x5326` | nur Disc-Typ/TOC und manuelle Neusuche | **Nachziehen** |
| Disc-Wechsel, Auto-Refresh, USB-Reset | 3s-Poller, ID, 120s-Grace | nur Poll der App und keine Disc-ID | **Nachziehen**, udev-Ereignisse bevorzugen |
| Track-Längen, Position und präzises Seeking | TOC/LBAs, Offsets | nicht implementiert | **Nachziehen** |
| Album, Interpret und Titelnamen | Discogs/MusicBrainz | `Titel 1` etc. | **Opt-in-Metadatenservice auf Hostseite**, keine Netzberechtigung für die App |
| Cover Art Archive | vorhanden + lokaler Cache | nicht implementiert | **Optional nachziehen**, begrenzen, Content-Type und Bildformat validieren |
| Eject/Tray Close/Spin-down | vorhanden | nicht implementiert | **Optional nachziehen**, nur Touch, ausgewähltes Laufwerk, nicht während anderer Medien |
| Mehrere USB-CD-Geräte | Standard `/dev/sr0` | Host listet mehrere `srN` | **NG-Vorteil behalten** |
| Kindersicherung und Host-Autorisierung | Classic-Extension-Modell | NG-Plugin-Capability + Touchsession | **NG-Modell behalten** |

## Sicherheitsbewertung (kritisch bei der Portierung)

**Nicht aus Classic kopieren:**
- `extensions/cd/99-mpx-cd.rules` setzt `MODE="0666"`: das Laufwerk
  wäre für **alle lokalen Benutzer/Prozesse** les- und schreibbar.
- `player.js` benutzt als Fallback `sudo -n chmod a+rw /dev/sr0`:
  ebenfalls unzulässig für die NG-Sicherheitsarchitektur.
- Im Classic-Plugin sind Host-Routen als GET (`/eject`) mit Seiteneffekt
  realisiert. NG-Eject muss eine durch Touch-/Apprechte geschützte **POST**
  mit Laufwerksidentitätsprüfung sein.
- Die Classic-`.mpx` kann ausführbaren Player-/API-Code und udev-Regeln
  installierten; **niemals direkt als NG-`.mupiapp` ausführen**.

**NG-Vorgabe:** Zugriff nur im vertrauenswürdigen Linux-Host mit
minimalen Gruppenrechten (`cdrom`, `0660`), niemals `0666`,
niemals allgemeines `sudo/chmod`, keine Device-Namen aus ungeprüftem
JavaScript, kein Root-Zugriff oder frei wählbare Pfade. Metadaten
vom Host über feste HTTPS-Endpunkte mit Timeouts/Größenlimits/
Redirect-Validierung und lokalem Cache beziehen. Discogs-Token
gesondert verschlüsselt ablegen; **nicht an die Community-App senden**.

## Weitere Classic-5.1-Funktionen im selben PR-Umfeld

- [PR #41](https://github.com/wowa1990/MuPiBox/pull/41): Winamp-Skin,
  Erweiterungs-Framework, CD, Uhr, Wetter.
- [PR #42](https://github.com/wowa1990/MuPiBox/pull/42): mehrere
  Box-Benutzer, GPIO-Buttons, Upgrade-Rollback und Erweiterungs-Settings.
- [PR #44](https://github.com/wowa1990/MuPiBox/pull/44):
  NFC-Erweiterung (PN5180, RC522, PN532, USB), Podcast-Episodenlisten,
  Sunset-Dimming und Rotary Pi 5.
- [PR #45](https://github.com/wowa1990/MuPiBox/pull/45):
  NFC-Multireader, Tag-Kacheln und Mini-Player; PR zum Prüfdatum geschlossen,
  **nicht gemergt**.

Alle diese Änderungen **gegen den bestehenden NG-Code abgleichen**, nicht
blind übernehmen: NG hat eigene Schnittstellen, Plugins, GPIO- und
Sicherheitsmodelle. Ein Classic-PR kann in einem Fork integriert sein,
ohne dass das Classic-Upstream-Main bereits aktualisiert wurde.

## Status NG

Bisherige NG- und Plugins-PRs implementieren einen **ersten unabhängigen
Entwurf**; der vorhandene Classic-Code wurde bei der ersten Prüfung
übersehen. Diese Datei korrigiert den Sachstand. Der konkrete Backport
von Classic-Laufwerksüberwachung, LBAs, Metadaten und Tray-Verwaltung ist
**noch offen**. Physische USB-CDDA-Hardwaretests vor Merge und Katalog-Release
erforderlich.

## Weiterentwickelter NG-Stand (23.11.2026; Host #154 + Plugins #120)

**Hinweis:** Die obige Tabelle beschreibt ausdrücklich den *ersten* NG-
Entwurf von PR #145 und ist deshalb historische Bestandsaufnahme.

Für die **zweite Entwicklungsstufe** wurden die folgenden Unterschiede
im NG-eigenen Sicherheitsmodell softwareseitig umgesetzt:

| Classic-Funktion | Umsetzung der NG-Entwicklungsstufe 2 |
| --- | --- |
| Laufwerk/Tray/Disc-Zustand | Sichere Linux-ioctls auf validierten USB-Laufwerken; Status wird an App gereicht |
| TOC/Track-LBA/Laufzeit | LBA, Trackdauer und Lead-out aus Kernel-TOC, angezeigt im Tracklisting |
| CD-Identität/Disc-Wechsel | MusicBrainz-SHA1-ID aus 804 ASCII-Hexzeichen; Disc-Wechsel auch bei gleicher Titelanzahl; erneute Prüfung vor Play/Skip/Seek |
| Audio-CD + CD-Extra | Audio-only sowie Standard-CD-Extra mit **einem** letzten Daten-Track; exotische Mixed-Mode-Layouts werden abgewiesen |
| Eject/Close/Spin-down | Explizite SDK-Bedienung für das ausgewählte Laufwerk, stoppt nur dessen Audioquelle |
| MusicBrainz-Titel/Album | Nur auf Benutzerklick, hostseitiger HTTPS-Lookup ohne App-Netzwerkberechtigung, Cache und strenge API-Limits |
| Cover Art Archive | Nur nach MusicBrainz-Lookup, Proxy über Host auf begrenztes JPEG-/PNG-Datenbild mit Redirect-/Host-/IP-Prüfungen |
| USB-Reset-Recovery | **Absichtlich nicht automatisch übernommen**: hardwareabhängiges Busreset kann fremde Geräte stören. Hardware-Test + gezielte Recovery später nötig. |

Der neue Host-Code befindet sich in
`splitti/MuPiBox-NG#154` auf der Admin-Sicherheitsintegration
`#153`; die App/SDK-Gegenstelle in
`splitti/MuPiBox-NG-Plugins#120`.
**Sämtliche realen Laufwerk-/CDDA-/mpv-Tests stehen aus.**
Die Implementierung ist nicht öffentlich für Anwender freigegeben.
Keiner der oben beschriebenen Punkte ist als Hardware-abgenommen
zu verstehen.

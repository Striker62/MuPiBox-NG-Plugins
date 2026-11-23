# USB-Audio-CD und Classic-Forks – technischer Vergleich (2026-11-23)

Verglichen wurden die **Main-Branches** von
`Lippsson/MuPiBox`, `wowa1990/MuPiBox` und `splitti/MuPiBox`
sowie die NG-Community-Architektur (Release-Zweig `alpha75`).

## USB-CD

**In keinem der beiden genannten Classic-Forks findet sich in Main
eine eigene CDDA-/CD-ROM-Wiedergabeimplementierung.** Deshalb gibt es
keinen USB-CD-Spielercode, den wir direkt nach NG portieren könnten.
Die hier erstellte Implementierung ist eine neue, sichere Adaption
der Idee: bestehende NG-Core-Queue + mpv-CDDA + eingeschränkte
Community-Bridge `optical-media`. Sie greift nicht direkt aus
HTML/JavaScript auf Linux-Gerätedateien zu.

## Tatsächliche Git-Baum-Unterschiede zu Classic-Upstream

| Fork | Dateien nur im Fork | Dateien im Upstream, nicht im Fork | Gemeinsame Dateien mit unterschiedlichem Inhalt |
| --- | ---: | ---: | ---: |
| `wowa1990/MuPiBox` | 0 | 0 | 1 (`version.json`) |
| `Lippsson/MuPiBox` | **0** | **19** | **117** |

Der `wowa1990`-Stand ist im Main-Baum praktisch identisch zu
`splitti/MuPiBox`. `Lippsson` hat gegenüber dem Upstream **keine
zusätzlichen Dateien**, sondern u. a. ältere oder divergierende
Implementierungen. Es wäre falsch, die Upstream-Neuerungen als
zusätzliche `Lippsson`-Features zu bezeichnen.

## NG-Vergleich: Was sich zu prüfen lohnt

1. **USB-WLAN-Fallback und Netzwerk-Recovery:** In den beiden Classic-
   Codebasen sind Skripte wie `scripts/mupibox/optimize_wifi.sh`,
   `wifi_monitor.sh` und `wpa_action_guard.sh` enthalten. Der
   Upstream berücksichtigt atomare WLAN-Konfigurationsschreibvorgänge
   (mit restriktiven Dateirechten), Dual-WLAN und DietPi-Varianten.
   Prüfen, ob NG diese Sicherheits-/Recovery-Eigenschaften vollständig
   abdeckt; keine Root-Shellskripte unverändert portieren.
2. **Display-Profile/-Drehung:** `splitti/MuPiBox` besitzt zusätzliche
   Dateien wie `scripts/mupibox/display_profile.sh`,
   `display_rotation.sh` und
   `src/backend-api/src/eltern/display-profile.ts`, die im
   `Lippsson`-Main fehlen. NG-Displayprofile und automatische
   Migration dagegen abgleichen.
3. **MuPiHAT/USB-PD:** `splitti/MuPiBox` enthält
   `scripts/mupihat/tps25730.py`, das im `Lippsson`-Main fehlt.
   Gegen NG-Hardware-Abstraktion und Stromversorgung prüfen.
4. **Diagnose/Telemetrie:** `splitti/MuPiBox` besitzt zusätzliche
   `telemetry.ts`, `support-summary.ts` und Tests gegenüber dem
   `Lippsson`-Main. Vor einem NG-Backport Datenschutz, Einwilligung,
   Datenminimierung und Testabdeckung abgleichen.
5. **Spotify-Sync und TIDAL:** In beiden Fork-Ständen existieren
   Unterschiede an `spotify-sync/diff.ts`, `scheduler.ts`,
   `state-machine.ts` und `scripts/mupibox/tidal_service.py`.
   Versions-/Diffprüfung und gezielte Regressionstests sind nötig,
   bevor ein konkreter Bugfix für NG benannt werden kann.

## Umsetzungsstatus

- USB-Optical-Discovery, lokale Berechtigungen und CDDA-Playback:
  **Code in NG- und Plugins-PRs, Entwurf / noch nicht real hardwaregetestet**.
- Lese- und Transporttests: Unit-Tests + CI vorgesehen.
- Hardware-Lauffähigkeit: USB-Laufwerk, libcdio-Unterstützung in mpv,
  Linux-Rechte/Gruppe, Audiofokus, Laufwerkswechsel und Medienwechsel
  **noch nicht bestätigt**.
- Weitere Classic-Neuerungen: **nur Prüfempfehlungen**, keine Übernahmen
  oder freigegebenen Patches. Der Vergleich umfasst Main, nicht sämtliche
  offenen Feature-Branches und PRs.

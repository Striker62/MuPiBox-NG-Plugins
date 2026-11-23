# USB-Audio-CD und Classic-Forks – Erstprüfung (2026-11-23)

Gegenübergestellt: `Lippsson/MuPiBox`, `wowa1990/MuPiBox`,
`splitti/MuPiBox` (Classic) und `splitti/MuPiBox-NG`.

**Ergebnis zum USB-CD-Laufwerk:** In den beiden genannten Classic-Forks
wurden im aktuellen Main-Tree keine spezifischen CDDA-/CD-ROM-Player-
Dateien oder entsprechende Implementierungs-Pfade festgestellt.
Der Classic-Code kann deshalb nicht einfach kopiert werden. Die NG-
Umsetzung nutzt die vorhandene Core-Queue, den bereits verwendeten
`mpv`-Player und die Community-App-Capability-Schnittstelle. Ein
physischen CDDA-Test und Prüfung der CDDA-Compile-Optionen von mpv
stehen noch aus. Die alte Classic-USB-Unterstützung bezieht sich
vor allem auf WiFi-, Audio- und Display-/Hardware-Konfigurationen.

## Forkvergleich und mögliche Übernahmen

- **wowa1990:** Im Git-Baum des `main`-Branches gegenüber
  `splitti/MuPiBox` lediglich `version.json` anders. Kein isolierter
  USB-CD-Commit zu portieren. Fork auf künftige Änderungen beobachten.
- **Lippsson:** Gegenüber `splitti/MuPiBox` ca. 136 Pfade anders.
  Display-Profile/-Rotation/-Touch (`scripts/mupibox/display_*.sh`,
  `src/backend-api/src/eltern/display-profile.ts`) → ggf. NG-Display-
  Profilmigration ergänzen, **keinen Classic-Systemskript-Code direkt
  mit Root-Rechten übernehmen**.
- **Lippsson:** Hardware `scripts/mupihat/tps25730.py` und
  `scripts/mupihat/mupihat.py` → Unterschiede am Strom-/USB-PD-Pfad
  untersuchen, gegen NG-MuPiHAT-System-Agent testen.
- **Lippsson:** `src/backend-api/src/eltern/telemetry.ts`,
  `support-summary.ts`, `src/backend-api/src/telemetry.spec.ts` →
  datensparsame Diagnose-/Support-Verbesserungen prüfen, Opt-in
  erzwingen; nicht automatisch Netzwerkdaten übertragen.
- **Lippsson:** `src/backend-api/src/spotify-sync/diff.ts`,
  `scheduler.ts`, `state-machine.ts` → gegen NG-Spotify-Sync auf
  Race-/Resume-Fixes prüfen; nicht blind übernehmen.
- **Lippsson:** `scripts/mupibox/check_network.sh`,
  `optimize_wifi.sh`, `wpa_action_guard.sh` und
  `src/backend-api/src/eltern/network.ts` → WLAN-Roaming/
  Ausfallsicherheit vergleichen und Sicherheitsmodell bewahren.

Weitere technische Bewertung muss anhand der konkreten Code-Diffs,
Tests und Hardware-Ergebnisse erfolgen. Die Unterschiede sind **Kandidaten**,
keine bereits bestätigten Funktionsverbesserungen.

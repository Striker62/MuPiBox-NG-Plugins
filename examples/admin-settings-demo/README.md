# Admin-Einstellungen Demo

Diese Test-App zeigt, wie ein Entwickler ohne eigenes Login eine
Konfigurationsseite über die MuPiBox-NG-Adminoberfläche bekommt.
Im Manifest `adminSettings.fields` definieren, die Box rendert die
Felder selbst. In der App werden die Werte mit
`await MuPiBoxSDK.config.get()` gelesen (nur `storage`).

Zum Bau:
`python3 tools/mupiapp.py pack examples/admin-settings-demo dist/admin-settings-demo.mupiapp --exclude README.md`

**Voraussetzung:** NG-Host mit Unterstützung für `adminSettings`.
Das bisherige Schema-freie JSON-Editor-Verhalten bleibt für alte Apps bestehen.

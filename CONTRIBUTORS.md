# Community-Beiträge / Community contributions

Dieses Verzeichnis dokumentiert freiwillige Beiträge aus der MuPiBox-NG-Community. Die Zuordnung erfolgt anhand des öffentlichen GitHub-Nutzernamens und des zugehörigen Pull Requests, nicht anhand privater Kontaktdaten.

| Eingereicht | GitHub-Benutzer | Beitrag | Pull Request | Version |
| --- | --- | --- | --- | --- |
| 2026-11-06 | [@Striker62](https://github.com/Striker62) | **FotoSpaß**: USB-Kamera, Countdown, Malen/Accessoires, lokale Foto-Speicherung und Galerie mit Einzelbild-Löschung | [#4](https://github.com/splitti/MuPiBox-NG-Plugins/pull/4) | 0.4.2 |

## Sicherheit und Aufnahme

Der Quellcode aus PR [#4](https://github.com/splitti/MuPiBox-NG-Plugins/pull/4) wurde am 06.11.2026 statisch auf verdächtige Netzwerkzugriffe, eingebettete Ressourcen und Host-API-Aufrufe geprüft. Es fanden sich keine unbeabsichtigten Internet-Datenübertragungen im eingereichten Code. Benötigte Host-Berechtigungen: `camera` und `photo-save` (keine `network`-Berechtigung). Nach der Aufnahme wurde die lokale SDK-Kopie an das öffentliche Haupt-SDK mit strenger Foto-ID-Prüfung angeglichen.

**Grenzen:** Es handelt sich um eine statische Codeprüfung, keine Garantie für Fehlerfreiheit oder einen unabhängigen Kamera-Hardwaretest. Der vom Erstbeitragenden ausgelöste ursprüngliche CI-Lauf erforderte eine Workflow-Freigabe (`action_required`). Die Aufnahme ins Repository ist keine automatische Freigabe für den offiziellen App-Katalog; dafür sind Paketvalidierung und ein geprüftes GitHub-Release mit korrektem SHA-256 erforderlich.

Beiträge unterliegen den Regeln von [CONTRIBUTING.md](CONTRIBUTING.md) und den Lizenzbedingungen dieses Repositories.

# Theme-Installation, HTTP-API und Sicherheit

## Speicherort und Updateverhalten

Installierte Designs liegen standardmäßig in `/var/lib/mupibox-ng/themes/<ID>/`, unabhängig vom aktuellen Release. Die Umgebung `MUPIBOX_THEMES_DIR` kann den Speicherort für Tests ändern. Nach vollständiger Validierung wird erst in ein temporäres Verzeichnis entpackt, dann atomar aktiviert. Ein fehlgeschlagenes Update überschreibt keine bisher gültige Version.

Themes aus dem Systemlieferumfang bleiben in `ui/qtquick/ThemeDefs.js`, bis die gemeinsame interne Dateirepräsentation ebenfalls umgestellt ist. Die Kinderoberfläche verwendet trotzdem denselben Theme-Token-Vertrag für beides.

## Endpunkte

| Methode und Pfad | Funktion | Berechtigung |
| --- | --- | --- |
| GET `/api/admin/themes` | Installierte Themes und Token-Konfiguration | Admin |
| POST `/api/admin/themes/inspect` | ZIP vor Installation prüfen (Raw-Body) | Passwortgeschützter Admin |
| POST `/api/admin/themes/install` | Multipart-Upload, Feld `package` | Passwortgeschützter Admin |
| DELETE `/api/admin/themes/{id}` | Installiertes, inaktives Theme entfernen | Passwortgeschützter Admin |
| GET `/api/admin/themes/catalog` | Kuratierten Theme-Katalog laden | Passwortgeschützter Admin |
| POST `/api/admin/themes/catalog/{id}/install` | SHA-256-geprüften Release installieren; JSON `{version,sha256}` | Passwortgeschützter Admin |
| GET `/api/themes/{id}` | Nur deklarative Tokens/Metadaten für den Qt-Client | lokal und LAN lesbar |
| GET `/api/themes/{id}/assets/{asset}` | Ausschließlich im Theme referenzierte Bilder/Schriften | lesbar |
| PUT `/api/admin/settings` | Theme-ID speichern und aktivieren | bestehende Admin-Authentisierung |

## Eingangsprüfung

- Nur ZIP mit `manifest.json` und `theme.json`, nicht die `.mupiapp`-App-Laufzeit.
- Größe maximal 24 MiB komprimiert, 40 MiB entpackt, höchstens 128 Dateien / 16 MiB pro Datei.
- Keine Symlinks, verschachtelte Pfad-Traversal, doppelten Dateinamen, ZIP-Verschlüsselung oder ausführbare Dateien.
- Nur PNG/JPEG/WebP und TTF/OTF als referenzierte Assets; keine externen URLs.
- Theme-Tokens, Datentypen, Wertebereiche und Komponentennamen werden explizit gegen die Host-Allowlist geprüft.
- Theme-Katalog: HTTPS mit festgelegten offiziellen Hosts, SHA-256-Prüfung und Matching von Manifest/Version/Autor. Hash ist keine Publisher-Signatur.
- Ein aktives Theme kann nicht deinstalliert werden. Bei fehlendem/ungültigem Theme fallen die Qt-Tokens auf Modern Dark zurück.

## Grenzen in v1

Die **laufende Box wird durch diese Entwicklungsarbeit nicht verändert**, und es wird **keine neue Alpha** veröffentlicht. In v1 gibt es noch keinen vollständigen freien Layout-Editor und keinen automatischen Export der Admin-Custom-Theme-Änderungen als Paket; zunächst sind Entwicklerpakete und native Palette/Komponenten verfügbar. Ein eigenes Theme-Splash-Bild wird derzeit nur validiert und gespeichert, noch nicht als Bootbild verwendet. Das System-Boot-Splash bleibt unter Kontrolle des bisherigen Designers.

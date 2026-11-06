# Release-Checkliste für Community-Apps

Diese Checkliste beschreibt technische und organisatorische Prüfungen vor einer Veröffentlichung im offiziellen MuPiBox-NG-App-Katalog.

## Vor der Veröffentlichung

- [ ] Quellcode und Abhängigkeiten auf unerwartete Netzwerkzugriffe, Fremdcode und eingebettete Zugangsdaten prüfen.
- [ ] Berechtigungen im Manifest auf die erforderlichen Funktionen beschränken.
- [ ] Eigene und externe Bestandteile einschließlich ihrer Lizenzen dokumentieren.
- [ ] Build- und Funktionstests ausführen; Display, Eingabe und unterstützte Sprachen überprüfen.
- [ ] Jede `.mupiapp`-Datei mit `python3 tools/mupiapp.py validate` prüfen.
- [ ] Nur verifizierte Pakete als Assets im offiziellen GitHub-Release bereitstellen.
- [ ] SHA-256 der tatsächlich veröffentlichten Release-Dateien ermitteln und erst dann `catalog/apps.json` aktualisieren.
- [ ] Bestehende App-IDs für kompatible Updates beibehalten; sichtbare App-Namen dürfen unabhängig davon angepasst werden.
- [ ] Installationen und Updates erfolgen erst nach Zustimmung durch den Geräte-Administrator.

Für neue Beiträge gelten [CONTRIBUTING.md](../CONTRIBUTING.md) und die [Katalogregeln](../catalog/README.md).

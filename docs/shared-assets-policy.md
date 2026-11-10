# Regeln für SMB-Inhalte von Community-Apps (Shared Assets)

**Status:** Verbindliche Ablage- und Entwicklerkonvention. NG **0.2.0-alpha.40** setzt die App-seitige Unterordner-Allowlist, validierte Manifest-Angaben und die sichere automatische Verzeichnisanlage um. Samba-seitige Beschränkungen der *Besitzer-Schreibrechte*, Quoten und ein möglicher Upload-Dateimanager sind weiterhin **nicht implementiert**. Vorhandene Besitzerdateien werden nicht verschoben oder gelöscht.

## Wozu dient `CommunityApps`?

Der Ordner der bestehenden MuPiBox-SMB-Freigabe ist **ausschließlich für vom Gerätebesitzer bereitgestellte, app-spezifische Nutzdaten** gedacht (z. B. eigene Bücher, Hintergründe *als Daten innerhalb einer App*, Foto-Accessoires). Er ist **kein** allgemeiner Download-, Paket-, Backup- oder Cache-Ordner.

- Die Wurzel `CommunityApps/` bleibt frei von einzelnen Dateien und Nutzdaten.
- Jede App erhält nur ihren eigenen Namensraum `CommunityApps/<manifest.id>/`. Die ID ist die **tatsächliche stabile App-ID aus ihrem Manifest**, nicht der Anzeigename.
- Unter dem App-Ordner dürfen nur die von **dieser App dokumentierten** Unterverzeichnisse und Dateiformate liegen. Neue App-Ordner oder zusätzliche Bereiche benötigen eine explizite Beschreibung in der jeweiligen Entwicklerdokumentation.
- Es gibt keinen globalen Ordner `CommunityApps/books/` und keine gemeinsame `books/`-Ablage für alle Apps.

### Beispiel (Bücherkiste / FotoSpaß)

```text
<MuPiBox-SMB-Freigabe>/
└── CommunityApps/
    ├── community.buecherkiste/        # Beispiel-App-ID, am installierten Manifest prüfen
    │   └── books/
    │       ├── buch-1/
    │       │   ├── book.json
    │       │   ├── images/
    │       │   ├── text/             # falls von der App unterstützt
    │       │   └── tts/              # falls von der App unterstützt
    │       └── buch-2/
    │           ├── book.json
    │           └── images/
    └── community.fotospass/
        └── accessoires/
            ├── baerte/
            ├── brillen/
            └── huete/
```

Jedes Buch bekommt **einen eigenen Ordner**. Für neue Buchordner empfehlen wir kurze, eindeutige, stabile Namen mit Kleinbuchstaben, Ziffern und Bindestrichen (z. B. `mein-buch-1`). Groß-/Kleinschreibung nicht zum Unterscheiden zweier Bücher verwenden. Ein Import darf gleichnamige vorhandene Bücher **nicht stillschweigend überschreiben**. Das konkrete Format von `book.json` ist durch die jeweilige Bücherkiste-App zu definieren; ein Ordner allein garantiert noch keinen erfolgreichen Import.

Die Pfade funktionieren mit NG **Alpha 40 oder neuer** und einer App, die `shared-assets` explizit anfordert. Der NG-Host legt erlaubte Verzeichnisse beim App-Installieren/Reaktivieren/Backend-Start automatisch an. Die Bücherkiste **0.2.20** (Community Apps Preview 14) unterstützt den SMB-Import; alte Bücherkiste-Pakete lesen nur ihre gebündelten Bücher.

## Wer darf dort schreiben?

1. **Besitzer/Administratoren** legen erlaubte Dateien über ihre eigene SMB-Freigabe ab und verwalten sie selbst.
2. **Community-Apps** dürfen über `MuPiBoxSDK.shared.list/read/watch` nach gesonderter Freigabe `shared-assets` **nur lesen** und nur in ihrem eigenen `<manifest.id>`-Ordner. Sie erhalten **keinen** direkten Dateisystemzugriff, SMB-Zugangsdaten oder Zugriff auf andere Apps.
3. Die Berechtigung `shared-assets` ist **keine Schreibberechtigung**. App-eigene Einstellungen gehören in `storage`, Fotos in die separat bestätigte `photo-save`-Speicherung mit eigenen Quoten. App-Pakete, Icons und Home-Kachel-Cover gehören **ins `.mupiapp`-Paket**, nicht in die SMB-Freigabe.
4. Apps dürfen keine Daten in fremde App-Verzeichnisse schreiben, dort lesen, versteckte Dateien auswerten oder unbekannte Dateien als Programm ausführen.

**Wichtig:** Weil ein berechtigter SMB-Benutzer Dateien selbst ablegen kann, verhindern SDK-Namensräume **kein willkürliches Schreiben durch den SMB-Benutzer**. Dafür wären zusätzliche Samba-/Dateisystem- oder Verwaltungsregeln erforderlich. Die folgenden Vorgaben sind also teilweise organisatorisch und nicht bereits technisch erzwungen.

## Sicherheits- und Kompatibilitätsregeln

- Der Host muss Pfade gegen `..`, absolute Pfade, symbolische Links, Spezialdateien und Ausbrüche aus dem zugewiesenen App-Ordner prüfen. Die bestehende `shared.read`-API begrenzt einzelne Lesevorgänge auf **8 MiB** und akzeptiert nur dokumentierte Datentypen (u. a. JSON/Text, Bilder, unterstütztes Audio, PDF). Dateien außerhalb dieser Grenzen können in der SMB-Freigabe liegen, sind aber **nicht garantiert über die API lesbar**.
- Keine ausführbaren Skripte/Binärdateien oder Zugangsdaten in Shared Assets ablegen. Inhalte gelten als **nicht vertrauenswürdige Daten**: JSON nur parsen/validieren, SVG niemals als aktives HTML ausführen.
- Keine automatischen Löschungen, rekursiven Umbenennungen oder Migrationen fremder Verzeichnisse. Bei unbekannten/ungültigen Dateien: ignorieren und verständliche Warnung anzeigen.
- Bestehende Inhalte bleiben bei Updates/Deinstallation erhalten; Löschen erfolgt nur gezielt durch den Besitzer mit eindeutiger Bestätigung.
- Jede App, die `shared-assets` nutzt, muss im Repo/Handbuch ihre **konkreten erlaubten Pfade, Dateitypen, Mindeststruktur, Größenempfehlungen, Import-Regeln und die verwendete Manifest-ID** dokumentieren; die App muss bei nicht unterstütztem Host verständlich reagieren.
- Buchinhalte bleiben Eigentum/Verantwortung des Besitzers; die lokale Ablage bedeutet **keine Veröffentlichung oder automatische Weitergabe** an die Community.

## Implementiert (NG Alpha 40) und weiterhin offen

- **Implementiert:** App-ID und durch `sharedDirectories` erlaubte Unterverzeichnisse sind manifestgebunden; verfügbare Dateiendungen weiterhin durch eine globale Host-Allowlist begrenzt. Eine strengere, app-spezifische Dateitypdeklaration ist noch offen.
- **Weiterhin offen:** Falls ein Upload/Dateimanager angeboten wird: nur deklarierte Verzeichnisse, Typ- und Größenprüfung, Schutz vor Überschreiben, klare Fehlermeldungen.
- **Weiterhin offen:** Einstellbare Gesamtquoten bzw. Warnschwellen **pro App-Ordner**, Zählung von Dateien und optional Scan verwaister/unbekannter App-Verzeichnisse; bestehende Dateien nicht selbsttätig löschen.
- **Implementiert:** Host-Regressionstests für Pfadausbrüche, Symlinks und fehlende Berechtigungen; Hardwaretests und die Prüfung von Benutzer-Dateinamenskollisionen bleiben offen.
- **Weiterhin offen:** Wenn SMB-Schreibzugriff selbst stärker eingeschränkt werden soll, ist ein gesondertes **Samba-Rechte-/Uploadkonzept** erforderlich, da reguläre Besitzer manuell Dateien über SMB bereitstellen können sollen.

Siehe auch [Manifest-/SDK-Vertrag](manifest-v1.md#shared-smb-folders-for-owner-managed-app-content-host-development) und [Entwickleranleitung](../GETTING_STARTED.en.md#import-owner-provided-books-and-accessories-over-smb-host-development).

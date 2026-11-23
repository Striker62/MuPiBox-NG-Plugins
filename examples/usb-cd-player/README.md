# MuPi CD-Player (Community App)

USB-CD/DVD-Laufwerk am Raspberry Pi anschließen, Audio-CD einlegen und
in MuPiBox NG die App **MuPi CD-Player** öffnen. Titelwahl, Pause/Weiter,
vorheriger/nächster Titel und Stop laufen über denselben Core-Player wie
andere MuPiBox-Audioquellen. Daten-CDs und Rippen werden nicht unterstützt.

Die App sucht im Leerlauf etwa alle 11 Sekunden nach neu angeschlossenen
Laufwerken und eingelegten CDs. Die Schaltfläche **Suchen** aktualisiert
sofort. Bei einem CD-Wechsel mit derselben Trackanzahl kann die aktuelle
Version den Wechsel noch nicht sicher erkennen; bitte dann **Suchen** wählen.
Bei mehreren Laufwerken zeigen die Transporttasten nur die Wiedergabe des
in der App ausgewählten Laufwerks an (Host mit `optical.status().device`
erforderlich). Während laufender Wiedergabe wird das Laufwerk nicht zusätzlich
auf einen Disc-Wechsel abgefragt, um unnötige Zugriffe zu vermeiden.

**NG-Voraussetzung:** Host-Erweiterung im separaten MuPiBox-NG-PR,
die die neue Berechtigung `optical-media` einführt. Die Erlaubnis muss
beim Installieren explizit bestätigt werden. Nur die lokale Touch-Sitzung
darf auf USB-CD zugreifen; die Web-Vorschau kann dies nicht.

**Box-Voraussetzung:** Linux `/dev/srN` und USB-Kernel-Gerät mit
lesbarer Audio-CD, passendes `cdrom`-/`optical`-Zugriffsrecht für den
MuPiBox-Dienst sowie ein `mpv` mit libcdio/CDDA-Unterstützung.
Weder CDDB-Metadaten noch Cover werden aus dem Internet geladen.
Kein Root, kein generischer Device-/Dateizugriff für Apps.

**Paketbau:** `python3 tools/mupiapp.py pack examples/usb-cd-player release/usb-cd-player.mupiapp --exclude README.md`
(die Optionen können sich ändern; prüfe `--help`). App-SDK muss
unter `mupibox-sdk.js` in der App mitverpackt sein. Release/öffentlicher
Katalog erst nach GPIO-/USB-/mpv-Gerätetest auf Pi 4/5.
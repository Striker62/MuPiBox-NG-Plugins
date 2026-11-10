# Einheitliche MuPi-Community-App-Cover

**MuPi ist das orange Axolotl** mit großen dunklen Augen, cremefarbenem Bauch,
rosaroten Kiemenästen und freundlichem Gesicht – **kein Roboter**. Die
Covergestaltung nutzt oben das goldgelbe **MuPi**-Logo auf einem mit Laub
verzierten Holzschild und darunter den lesbaren jeweiligen App-Titel.

Für die Querformat-Kacheln im NG-Games-Coverflow wird das Format **416×325**
(JPEG, 2× die Fläche der ca. 206×161 sichtbaren Bild-Kachel) verwendet,
wodurch die Schrift nicht durch einen unpassenden Bildzuschnitt verloren geht.
Der quadratische Icon-Fallback ist **192×192 PNG**. Die Spielmotive sind
Offline-Assets innerhalb des jeweiligen `.mupiapp`-Pakets und werden
im App-Manifest über `cover` und `icon` referenziert. Für Schach
bleiben MuPis Kopfhörer Teil des Covermotivs; weitere Motive können sie
ebenfalls zeigen.

Die verwendeten Originalillustrationen sind speziell für die MuPiBox
erstellte digitale Grafiken. Rechte an fremden Fotos, Logos und Medien
dürfen dadurch nicht vorausgesetzt werden.

Bei Änderungen: Versionsnummer im App-Manifest erhöhen, die betroffene App
erneut paketieren, mit `tools/mupiapp.py validate` prüfen und den
katalogisierten SHA-256-Wert ausschließlich auf das veröffentlichte Paket
setzen. Der Katalog darf nie auf unveröffentlichte oder ungetestete Bilder
zeigen. Die Cover selbst enthalten keine Netzwerk- oder Berechtigungslogik.

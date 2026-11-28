# Wie lange noch? – Kinder-Countdown

Version **0.1.0-beta.5** · eigenständige Community-App von Striker62.

Beta 5 zeigt direkt oben in der Verwaltung eine Auswahl aller Countdowns
mit Anzahl und Nummer. Damit lassen sich auch bei schmalen Ansichten und
ähnlichen Titeln alle Ereignisse eindeutig auswählen. Ein Regressionstest
prüft Anlegen, Speichern, Neuladen und Bearbeiten zweier Countdowns.

Beta 4 verkleinert den Ereignistitel und passt Abstände sowie Zahlen an die
durch die MuPiBox-Leiste reduzierte Displayhöhe an. Titelzeilen werden nicht
mehr durch die Flex-Anordnung zusammengedrückt. Das eigene GIF wurde auf der
Box erfolgreich angezeigt; die flüssige Animation ist im Gerätetest zu prüfen.

Beta 3 unterstützt animierte GIFs als eigene Bilder. Sie bleiben im
Originalformat erhalten: bis 2 MiB, 800 × 800 Pixel, 40 Einzelbilder und
insgesamt 20 Millionen Bildpunkte über alle Frames. Dateikopf, Bildblöcke
und Größen werden vor dem Speichern und Anzeigen geprüft. Die tatsächliche
Animation auf dem Touchdisplay ist noch auf der Box zu testen.

Beta 2 lädt das gemeinsame Datumsmodul direkt aus dem Admin-Verzeichnis.
Die Verwaltung benötigt dadurch keinen Zugriff auf einen übergeordneten
Paketordner mehr.

Eltern richten bis zu zwölf Countdowns in der App-Verwaltung ein. Kinder
blättern auf der Box durch große Karten für Geburtstag, Weihnachten, Urlaub
oder eigene Anlässe. Drei Designs (Geburtstag, Winter und Reise), ein eigenes
Bild, drei Zeitdarstellungen und eine einmalige Konfetti-Animation pro Ziel
und App-Sitzung sind enthalten. Keine externen Dienste oder Abhängigkeiten.

## Einrichtung

1. `.mupiapp` installieren und die Berechtigungen freigeben.
2. In der App-Verwaltung einen Countdown anlegen, Titel, Datum und Uhrzeit
   sowie Design und Anzeige wählen. Ein eigenes Bild ist optional.
3. **Alle Countdowns speichern**. Auf der Box aktualisieren oder neu öffnen.

Die Verwaltung erlaubt Bearbeiten, Sortieren und Entfernen. Die Einstellungen
werden erst durch Speichern übernommen. Gleichzeitige Änderungen werden über
Revisionen gegen versehentliches Überschreiben geschützt. Entfernen eines
Bildes löst nur dessen Zuordnung; vorhandene Bilddateien werden nicht gelöscht.

## Zeit und Darstellung

- **Tage:** angefangene verbleibende 24-Stunden-Zeiträume, aufgerundet.
- **Tage, Stunden und Minuten:** auf volle Minuten aufgerundet; ohne Sekunden.
- **Noch so oft schlafen:** Anzahl der Kalendertage in der beim Einrichten
  gespeicherten Zeitzone. Am Zieltag steht „Heute ist es so weit“.
- Nach Erreichen des Ziels bleibt die Karte als „Hurra! Es ist so weit“ stehen.
  Abgelaufene Countdowns können Eltern ändern oder entfernen.
- Die Uhr der Box muss korrekt eingestellt sein. Die Browser-Zeitzone beim
  Einrichten bestimmt die Zielzeit; Sommer-/Winterzeit berücksichtigt der
  Browser beim gewählten Datum. Kein täglicher Internetzugriff erforderlich.

## Bilder und Berechtigungen

`storage` liest die app-eigenen Eltern-Einstellungen. `shared-assets` liest
ausschließlich `CommunityApps/community.countdown/bilder/`.
Die Adminseite benötigt `settings.read`, `settings.write` und `files.write`
im Ordner `bilder`. Keine Mikrofon-, Kamera-, Audio- oder Netzwerkrechte.

JPEG, PNG oder WebP bis 20 MiB / 40 Megapixel werden im Browser auf höchstens
1600 Pixel Kantenlänge verkleinert und als JPEG bis 2 MiB gespeichert.
Transparenz wird weiß. Eindeutige Namen und Anlegen ohne Überschreiben schützen
vorhandene Dateien. Die Originale auf dem Computer bleiben unverändert.

## Bedienung und Technik

Touch ab 800 × 480, Maus und Tastatur (Pfeiltasten, Escape). Eigener Zurück-
Button nutzt die SDK. Timer und Animationen pausieren bei Hintergrundbetrieb;
bei Rückkehr wird die Zeit neu berechnet. Reduzierte Bewegung wird respektiert.
SDK-Kopie entspricht dem öffentlichen SDK dieses Repositorys. Die App nutzt
keine direkten REST-, Dateisystem- oder Geräteaufrufe.

Eigene CSS-Grafiken; Code unter der MIT-Lizenz des Repositorys. Kein fremdes
Bildmaterial. Im ersten Teststand wird das Standard-Kategoriebild der Box
verwendet. Ein eigenes Kachelbild und ein Adventskalender mit Türchen sind
spätere Erweiterungen. Die App ist noch nicht im offiziellen Katalog.

## Bauen und prüfen

```sh
node --test tests/test_countdown.cjs tests/test_countdown_admin.cjs tests/test_countdown_runtime.cjs
python3 tools/mupiapp.py pack examples/countdown dist/Wie-lange-noch-0.1.0-beta.3.mupiapp --exclude README.md
python3 tools/mupiapp.py validate dist/Wie-lange-noch-0.1.0-beta.3.mupiapp
```

Die grundlegende Logik ist automatisiert geprüft. Gerätetest und visuelle
Abnahme auf der Box stehen für diesen neuen Teststand noch aus.

# Funny MuPi

Eine offlinefähige MuPiBox-NG-Community-App für kurze, familienfreundliche Witze.

## Benutzung
- **Sprechblase antippen:** Auf der Box wird die konfigurierte MuPiBox-TTS verwendet. In der Browser-Vorschau liest dagegen der eigene Browser vor (keine Wiedergabe auf der Box).
- **Nächster Witz:** Ein neuer Zufallswitz; alle Einträge kommen einmal dran, bevor sie sich wiederholen.
- **Zurück:** Beendet die App und stoppt die von ihr gestartete Sprachausgabe, sofern der Host \`tts.stop\` unterstützt.
- **Controller:** A / Start = vorlesen, Rechts / X = nächster Witz, B / Back = zurück.
- TTS ist optional: Ohne aktivierte TTS läuft die Anzeige weiterhin. Für die tatsächliche Box-Ausgabe muss **Admin → TTS** aktiviert, ein Sprachcache verfügbar und die Berechtigung \`audio\` genehmigt sein. Die App unterscheidet deaktivierte und noch nicht bereite TTS und zeigt eine konkrete Meldung.

## Sprachen und Witze ergänzen
Die App liest die Box-Sprache aus \`sdk.getContext().language\` und lädt lokal \`jokes/<language>.json\`, z. B. \`de-DE\` → \`jokes/de.json\`. Die Dateien liegen als Klartext im GitHub-Repository und werden beim Bauen **in die .mupiapp-Datei gepackt**. Im Betrieb ist keine GitHub-Abfrage und kein Internet nötig.

Vorhanden: \`de.json\` mit 50 Kinderwitzen und \`en.json\` mit 12 Witzen. Fehlende Sprachen fallen auf die deutsche Datei zurück. Die Bedienelemente sind für de/en/fr/es/it/nl/pl übersetzt.

Dateiformat:

\`\`\`json
{"language":"de","jokes":["Frage?\\nAntwort.","Noch ein Witz ..."]}
\`\`\`

Neuer Inhalt: neue \`jokes/fr.json\`, \`jokes/es.json\` usw. hinzufügen, Versionsnummer im Manifest erhöhen, Paket neu bauen und veröffentlichen. Die TTS-Stimme/Sprachwahl wird **nicht** von der App umgestellt.

## Paket erzeugen
Vom Root des Repositories:

\`\`\`bash
python3 tools/build_funny_mupi.py
python3 tools/mupiapp.py validate dist/funny-mupi.mupiapp
\`\`\`

Das Build-Skript kopiert das aktuelle öffentliche \`sdk/mupibox-sdk.js\` hinein und packt ein eigenständiges Offline-ZIP. Zum Entwickeln die SDK-Datei in das App-Verzeichnis kopieren und \`index.html\` lokal über einen HTTP-Server öffnen.

## Datenschutz und Rechte
Keine Netzwerkanfragen an fremde Dienste, keine Statistik, keine Speicherung. Die Witze sind kurze überlieferte bzw. frei formulierte Wortspiele; das Artwork wurde eigens für die App gezeichnet. Die App wird unter der Repository-Lizenz MIT bereitgestellt. Hardware/TTS müssen auf einem echten MuPiBox-NG-Host getestet werden.

## Darstellung
MuPi wird orangefarben angezeigt. Die Spitze der Sprechblase weist rechts auf MuPi; die Darstellung skaliert auch für schmalere Ansichten.


## Artwork und Abschluss-Lachen

- Die Bildschirmfigur und das App-Symbol verwenden assets/mupi-laugh-refined.png, freigestellt mit transparentem Hintergrund.
- assets/laugh-ionakan-712055.mp3 ist ein lokal mitgelieferter, ca. 2,4 Sekunden langer Lacher von ionakan: [girl laughs loudly](https://freesound.org/people/ionakan/sounds/712055/), Lizenz CC0 1.0. Quelle: Freesound. Offline-Wiedergabe, keine HTTP-Verbindung zum Anbieter während des Spiels.
- Das Lachen ertönt ausschließlich nach vollständig beendetem Vorlesen. Es wird bei neuem Witz, Unterbrechen, Verlassen oder fehlerhafter Sprachausgabe abgebrochen und niemals automatisch beim Wechseln der Witzkarte gespielt.
- In der Browser-Vorschau spielt der lokale Browser den Effekt. Auf dem Gerät erfolgt die Ausgabe über die MuPiBox-NG-Audio-Bridge (audio.playClip); hierfür wird eine NG-Version mit dieser Methode benötigt.

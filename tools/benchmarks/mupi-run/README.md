# MuPi Run auf dem Raspberry Pi messen

Die Instrumentierung fügt einer Kopie des fertigen Spielpakets Messpunkte hinzu. Jeder Szenentest zeichnet die gleichen sechs Abschnitte mit festem Seed. Die Auswahl der Aktionen im separaten Langlauf erfolgt über die Touch-Schaltflächen des normalen Spiels. Die Ergebnisse enthalten Spielzeichnungen, Qt-Fensteraktualisierungen, Prozess-CPU, PSS und V3D-Renderzeit.

```sh
python3 tools/build_mupi_run.py
python3 tools/benchmarks/mupi-run/package-bench.py dist/mupi-run.mupiapp /tmp/mupi-run-scenes.mupiapp
python3 tools/benchmarks/mupi-run/package-bench.py --soak dist/mupi-run.mupiapp /tmp/mupi-run-soak.mupiapp
```

Der isolierte Host stammt aus dem NG-Core (`internal/server/plugin_renderer_benchmark_test.go`, Stand 2599a4c1). Für ein ARM64-System aus dem NG-Repository bauen:

```sh
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go test -c ./internal/server -o /tmp/host
```

Auf dem Testgerät ein beschreibbares Arbeitsverzeichnis und eine separate, beschleunigte 800×480-Wayland-Ausgabe für den Qt-Testnutzer verwenden. Der native Host arbeitet mit temporärem App-Speicher und einem Testmixer. Er bindet seinen normalen Port im eigenen Netzwerk-Namespace. Die folgenden Variablen setzen einen bereits gestarteten privaten Weston mit dem Socket `mupi-bench` im zugehörigen XDG-Laufzeitverzeichnis voraus. Das Messverzeichnis und die Qt-Datei müssen für den Testnutzer zugänglich sein.

```sh
export BENCH_USER=mupibox BENCH_HOST=/tmp/host
export QT_QPA_PLATFORM=wayland WAYLAND_DISPLAY=mupi-bench QSG_INFO=1
# XDG_RUNTIME_DIR auf das private Laufzeitverzeichnis des Testnutzers setzen.
unshare -n bash "$BENCH_TOOLS/run-private-trial.sh" scenes /tmp/mupi-run-scenes.mupiapp
unshare -n bash "$BENCH_TOOLS/run-private-trial.sh" long /tmp/mupi-run-soak.mupiapp
python3 "$BENCH_TOOLS/summarize.py" . scenes
```

`BENCH_TOOLS` bezeichnet den absoluten Pfad zu diesem Verzeichnis. Für Vorher/Nachher-Messungen beide Pakete nacheinander mit eigenen Bezeichnungen starten. Ein Timeout bleibt als unvollständiger Versuch erhalten. Für Aufnahmevergleiche zusätzlich `--capture` beim Instrumentieren verwenden und neben `Test.qml` ein für den Qt-Testnutzer beschreibbares Verzeichnis `shots` anlegen. Für Kostenzuordnung einen eigenen Versuch mit `--profile` durchführen. Die zusätzlichen Messaufrufe verändern die Laufzeit.

[Ergebnisse auf zwei Pi 4](../../../examples/mupi-run/benchmarks/pi4-2026-11-20.md)

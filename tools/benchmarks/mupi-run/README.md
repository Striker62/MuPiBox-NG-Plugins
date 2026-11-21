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

## Hosted Qt Quick vs released Web 0.8.7

Use a separate temporary directory on a Pi 4 and the same NG development backend for both editions. Build the real Go benchmark host from the matching NG checkout with SQLite/CGO enabled. Stage that executable as `nativehost`. The fixture installs the selected package in temporary storage, decodes real PCM and drains the mixer into memory. No system PipeWire sink is opened.

Place the four files from `hosted/` ending in .sh/.py beside the host. Stage the matching Wayland client and Weston libraries extracted for the device's OS under `prefix/usr`. Make the staged executables readable/executable by the test user. Copy NG's CommunityQtScene.qml, RunnerGame.qml and runner/ to a `hosted/` subdirectory beside Hosted.qml and fixed-replay.js. Place Web.qml in `web/`. Create `web/shots` and `hosted/shots` owned by the unprivileged test user. The launcher creates a private network/mount namespace, mounts Weston dependencies and connects the test clients over its own loopback. The regular display and services remain available.

Use the official asset from release `v0.1.0-preview.60`, SHA-256 `e809d7397eec9257a77a3d4bb747435fd6283f615509bed281004d4bfce8cac1`. From the public SDK checkout, with LAB pointing to the prepared directory:

```sh
python3 tools/benchmarks/mupi-run/package-bench.py --fixed mupi-run.mupiapp "$LAB/web-bench.mupiapp"
python3 tools/benchmarks/mupi-run/package-bench.py --capture mupi-run.mupiapp "$LAB/capture-web.mupiapp"
cp dist/mupi-run-native-preview.mupiapp "$LAB/preview.mupiapp"
systemd-run --wait --unit=runlab-native-a -p RuntimeMaxSec=110 bash "$LAB/safe-trial.sh" native_a "$LAB/hosted/Hosted.qml"
systemd-run --wait --unit=runlab-web-a -p RuntimeMaxSec=110 bash "$LAB/safe-trial.sh" web_a "$LAB/web/Web.qml"
python3 tools/benchmarks/mupi-run/summarize-hosted.py "$LAB/native_a" "$LAB/web_a"
```

For sampled input-to-swap timings add `--input` to the native client. Use `--capture` for matched frozen scene captures. Use `--soak` on native with `RuntimeMaxSec=1850` for 30 minutes of continuous simulation. Run one trial per device at a time. Each trial needs its own label. The observer records 2 s samples of process time, PSS/RSS and DRM file-descriptor render counters. The guard terminates the test window on low available memory. A protected stop is an incomplete run.

For the fixed-replay audio comparison on the isolated NG host, pass
`--setenv=RUN_TEST_MUTED_LEVELS=1` to systemd-run for the two muted trials
in the order default, muted, muted, default. Verify that all four runs reach
the fixed end state. Muted trials still prepare the three short effects but
should log neither audio.music.play nor audio.sample.play. The Janbox
follow-up used TMPDIR on a local ext4 directory writable only by the test
user and GOMEMLIMIT=32MiB for the disposable host. Both options were local
to the benchmark. A memory-guard stop invalidates the endurance run.

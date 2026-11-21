# MuPi Run · native Qt Quick preview

The preview has its own ID, `community.mupi-run-native`. It uses the Web game's fixed 60 Hz rules, the original 24-frame run and pose-dependent 35-frame action clips. A jump or slide starts at the next accepted input. The renderer updates the pose at 30 Hz. A static Qt shader projects the original road textures for riverbed, boardwalk and forest. The software backend uses precomputed road phases. Scenery uses culled, recycled Qt scene graph items. The gold notes, butterflies, obstacles, cover, splash and character pages come from the existing game.

## Installation and compatibility

Use **a development host containing the [trusted runner integration](https://github.com/splitti/MuPiBox-NG/pull/131)**. Stock NG 0.2.0-alpha.71 understands generic data scenes and rejects the new engine selector. The public catalog continues to offer the Web version 0.8.7.

On a compatible test host a parent can upload `mupi-run-native-preview.mupiapp` in the Community Apps admin, review the requested storage, audio and controller permissions and enable the separate game. The host checks the package ID, required assets and PNG dimensions before installing. The installed package supplies JSON, credits and local media. The host supplies the QML, shader, fixed-step simulation and SDK bridge. This pairing keeps executable files out of Community packages. The general-purpose isolation proposal is tracked in [NG #129](https://github.com/splitti/MuPiBox-NG/issues/129).

The preview stores its own record and independent music/effect settings. The loop starts from the menu and the host pauses and resumes its voice. The three provided effects are prepared before the start control is enabled. The loop and effects use 48 kHz mono 16-bit PCM. Music encoding increases package bytes and avoids launching a decoder on the direct PCM path. Source attribution ships in `AUDIO-CREDITS.txt`. When provided, the builder also registers assets/audio/run.wav for footsteps and assets/audio/kilometer.wav for 1,000 m events. This release includes the three supplied effects.

## Build

Requires Python 3, Pillow, FFmpeg and Node.js. Use a separate NG checkout if regenerating the trusted runtime.

```sh
python3 tools/build_mupi_run_native.py
python3 tools/package_mupi_run_scene.py
python3 tools/mupiapp.py validate dist/mupi-run-native-preview.mupiapp
node examples/mupi-run-native/test_logic_parity.cjs
node examples/mupi-run-native/test_world_replay.cjs
# To stage the matching built-in code in an NG development checkout:
python3 tools/package_mupi_run_scene.py --host ../MuPiBox-NG
gofmt -w ../MuPiBox-NG/internal/pluginapps/runner_art.go
```

The package writer fixes ZIP member order and timestamps. The engine's image layout is in `tools/runner-art-v1.json`. Regenerate `road.frag.qsb` after a shader change using Qt's matching `qsb --glsl '100 es,120,150' -o road.frag.qsb road.frag`. The effect atlas authoring utility uses the trusted Web artwork sources. Neither authoring tool runs on a child's box.

## Hardware checks

The [hosted Pi 4 results, audio-only comparison and screenshots](benchmarks/pi4-hosted-preview.md) cover the installable preview. The [initial PR #107 experiment](benchmarks/pi4-2026-11-21.md) covers the standalone prototype. The hosted comparison uses private loopback, a throwaway NG database and package installation, a private 800 × 480 Weston Wayland/EGL surface and a test mixer draining PCM into memory. The regular EGLFS UI can keep running. The fixed replay in `tools/benchmarks/mupi-run` supplies both engines with seed 414 and the same inputs on the same simulation ticks. It checks 2,880 ticks, 1,061.44 m, 39 notes and 30 waves. GPU presentation, physical scanout and physical input are distinct measurements.


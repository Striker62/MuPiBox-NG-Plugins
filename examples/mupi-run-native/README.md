# MuPi Run – native Qt Quick port, GPU hardware benchmark

**Experimental first-party renderer, not yet installable as a `qtquick-scene`
Community App.** Work is on `feat/mupi-run-native-qt-benchmark-20261121`; it
must not replace `community.mupi-run` 0.8.7 or bypass the NG security boundary.

## What was ported

The native QML uses **the exact original gameplay rules** in
`examples/mupi-run/logic.js`, wrapped into a generated QML-importable
`RunLogic.js`: 60 Hz fixed-step simulation, collision and obstacle rules,
scene/terrain transitions, deterministic wave generation, jumping, ducking,
three lanes, notes and score. The original 24 running frames plus all 35
jump and 35 slide frames in their 24 original transition patterns use
**the very same pixel tiles / atlas metadata** as MuPi Run Web 0.8.7.

The graphics are displayed through Qt Quick `Image` scene nodes, instead of
Chromium 2D Canvas. The original scenery placement and camera functions were
ported to `RunWorld.js`; the 16-recycled-segment world is preserved. 36
precomputed ground textures retain the original palette / perspective
approximation, but discretize movement to 2 m per texture. Road/props,
shadow, particles, butterfly appearance, UI and controller integration are
**not yet pixel-for-pixel equivalent** to the Web game. Native touch
controls (left/right/jump/duck), keyboard controls, pause/start/retry and HUD
are implemented; the long benchmark uses an automated gamepad surrogate.

The default `soundEnabled` is `false` and this prototype **never calls an
audio output or SDK endpoint**. All Pi benchmarks were **0 % volume**, below
the requested 5 % limit. Music/SFX volume settings and true physical
controller events are still to be connected to the permissioned host SDK.

## Build and test

From the MuPiBox-NG-Plugins checkout:

```bash
python3 tools/build_mupi_run_native.py
node examples/mupi-run-native/test_logic_parity.cjs
QT_QPA_PLATFORM=offscreen QT_QUICK_BACKEND=software \
    /usr/lib/qt6/bin/qmlscene dist/mupi-run-native/NativeBench.qml
```

The builder requires Python Pillow and converts the exact original WebP
spritesheet pages to PNG, because lean Pi4 Qt6 QImageIO builds may lack the
WebP decoder. Art is loaded locally from `dist/mupi-run-native/assets`.
`RunLogic.js`, `RunTiles.js`, `RunPoses.js` are generated; do not edit them
by hand. Generated binaries/images stay outside Git in `dist/`.

### Benchmark limitations

Offscreen Qt with `QT_QUICK_BACKEND=software` is **not GPU acceleration**.
For the real Pi test, use a separate headless **Weston OpenGL ES 3.1**
compositor with Mesa V3D (`/dev/dri/renderD128`) and run native QML as a
Wayland-EGL client. Do not change the box's existing EGLFS UI, install
system packages, replace the compositor, or take over the physical panel to
run this benchmark. The private Weston and QtWayland dependencies in the
2026-11-21 hardware tests were extracted into a temporary directory and
mounted only inside a disposable mount namespace; no production services
were changed. This was **a headless GPU rendering test** – not the physical
800×480 touch/display scanout or speaker test.

Use `NativeBench.qml` for a seeded 15 s run; `NativeBenchZones.qml` for a
45 s traversal across all three terrains. JSON logs are
`MUPI_NATIVE_BENCH_JSON` and `MUPI_NATIVE_ZONES_JSON`.
`benchmarks/monitor.py 22` samples the Qt and Weston processes' PSS/RSS,
CPU ticks, and max temperature. The source is deliberately conservative:
no claims of equal picture fidelity or of a Chromium/WebEngine 0.8.7 A/B
until both packages are measured with the same input replay and compositor.

**Results, Pi 4 diagnostics and comparison:**
[benchmarks/pi4-2026-11-21.md](benchmarks/pi4-2026-11-21.md).

## Security / future integration

NG alpha.70's declarative `qtquick-scene` format **does not accept QML files,
JavaScript files or native libraries from downloaded Community packages**.
That is intentional: executing QML in NG's privileged GUI process would
provide untrusted code with the main program's privileges. The native game
source here has to be built as **trusted first-party runtime code** or run in
a separate, OS-enforced, sandboxed Qt process with a real compositor and
app-bound authenticated IPC. Neither route is delivered by this prototype.

Before public catalog publication: implement the host integration, lifecycle
and permissioned SDK (physical controller, separate music/SFX at <= user
volume cap, bestMeters persistence, trusted back, update/disable revocation),
benchmark direct Web 0.8.7 versus this port with identical input/graphics,
verify Pi 4/5 with the real screen, and complete security review. Keep the
existing Web 0.8.7 published and untouched until this is finished.

See NG [issue #129](https://github.com/splitti/MuPiBox-NG/issues/129) and
Plugins [issue #106](https://github.com/splitti/MuPiBox-NG-Plugins/issues/106).

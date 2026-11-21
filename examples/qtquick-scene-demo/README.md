# MuPi Native Demo — Qt Quick scene runtime prototype

A deliberately constrained, GPU-rendered Qt Quick scene in the normal
`.mupiapp` format. It contains **no downloaded QML, JS or native binaries**.
The host owns the Qt Quick component and validates every scene property
before installation. Native buttons increment a score, save/load it with the permissioned host
storage bridge, and play a short bundled sample through the controlled audio
mixer. Music and effects have separate gain controls. Controller Jump collects
a note; Start resets the score. On installation the administrator must explicitly
approve the declared `storage`, `controller` and `audio` permissions.

Build (in repository root):

```sh
python3 tools/mupiapp.py pack examples/qtquick-scene-demo dist/qtquick-scene-demo.mupiapp --exclude README.md
python3 tools/mupiapp.py validate dist/qtquick-scene-demo.mupiapp
```

This is a **development preview**, not a published catalog app. It requires
an NG host with `qtquick-scene` support, and opens on the physical touchscreen
without Qt WebEngine. Browser preview is unsupported. The prototype proves
package installation, native scene construction, UI scaling and touch input.
It is *not* a general QML source execution runtime and cannot yet host MuPi
Run's arbitrary game logic, video playback or third-party JavaScript. For arbitrary QML, a separate process and sandbox
are required; MuPiBox's EGLFS UI cannot embed that process without additional
compositor work.

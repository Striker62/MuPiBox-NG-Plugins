# Webcam Preview – opt-in USB camera plugin

This is a camera API reference app for MuPiBox-NG **alpha.23 and newer**. The camera backend uses local Video4Linux2 devices, captures bounded 320×240 JPEG frames through ffmpeg and returns them to the app in-memory. The sample refreshes approximately once a second (not a high-frame-rate video stream). No photos, sound or recordings are written by the host, and the plugin has no network permission.

**Permission:** `camera` must be granted when installing. Each time the plugin starts, the trusted MuPiBox touchscreen host displays a second approval dialog. During capture, a red **Kamera aktiv · Stop** indicator remains visible outside the untrusted app frame. Leaving the app or locking the screen disables capture.

Build with `python3 tools/build_webcam_example.py`. Use a supported USB UVC webcam under `/dev/videoN` with a readable V4L2 capture stream; some hardware may not support the required JPEG capture. No USB camera was physically connected to Pi box 85 during development, so the V4L2 capture path is not yet hardware-verified.

The in-admin browser preview intentionally does **not** support camera access; only the local touch session may request frames. A camera plugin cannot receive access to microphone, filesystem, admin APIs or network services.

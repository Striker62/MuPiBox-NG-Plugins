# Klang-Memory – independent MuPiBox Plugin

An HTML/JavaScript version of Sound Memory. The built-in QML game is untouched.

Build with `python3 tools/build_klang_memory.py`, validate the `.mupiapp` and install it from the curated catalog (or by manual upload for development).

**v0.1.1:** Playback on MuPiBox-NG Alpha 22+ uses `MuPiBoxSDK.audio.playNote()` and the native PipeWire/box audio bus rather than Chromium WebAudio, which is not routed into the dedicated appliance audio session. The permission `audio` must have been approved. Box volume limits and parental controls still apply. Standalone browser previews use WebAudio fallback in the SDK.

The app is height-responsive to the touchscreen's reserved header, with all four pads and the round controls visible without scrolling. Scores remain in per-app private storage.

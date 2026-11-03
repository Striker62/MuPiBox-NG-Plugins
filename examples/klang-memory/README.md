# Klang-Memory – independently updateable proof of concept

This is a fresh, standalone HTML/JavaScript version of the existing Klang-Memory game using the public MuPiBox SDK.

The **original built-in QML Klang-Memory remains enabled and unchanged**. It is not replaced automatically.

Test mode: build a `.mupiapp` archive using `python3 tools/mupiapp.py pack examples/klang-memory dist/klang-memory.mupiapp` from the SDK repository root, then install manually with Admin approval. Includes WebAudio sound playback, touch, keyboard/controller, and a saved personal best via the storage API.

The HTML runner remains a browser preview. On-board Pi touch integration and host-level audio focus are not implemented in v1.

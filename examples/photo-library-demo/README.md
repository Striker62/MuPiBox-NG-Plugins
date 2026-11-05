# Foto-Speicher Test (MuPiBox-NG)

Offline reference app for the new `photo-save` host permission. This is **not** FotoSpaß and it does not access the camera, printer, global Gallery or network.

## Build and install

```bash
python3 tools/build_photo_library_demo.py
python3 tools/mupiapp.py validate dist/photo-library-demo.mupiapp
```

On a host with the `photo-save` implementation, open Admin > Community Apps, upload `photo-library-demo.mupiapp`, inspect and approve `photo-save` and open the app **on the local MuPiBox touchscreen**. The remote Admin browser preview cannot access photo storage.

## Acceptance

1. Tap **Testbild** or draw on the canvas with a finger.
2. Tap **Als PNG speichern**; the photo count should increase.
3. Exit and restart the plugin. Your previous photo must remain listed.
4. Select the saved item to load the photo onto the canvas.
5. Tap **Löschen**, then **Sicher?**. The photo must disappear.
6. If storage is unavailable or permission is missing, the app shows the error rather than writing to hidden browser storage.

Files survive app updates and even uninstall as designed. Delete a photo explicitly to remove it. The SDK forwards binary PNG Blob data through the trusted runner; plugins do not receive paths, tokens or raw filesystem capabilities.

# Photo and camera SDK extensions

Requires an NG host that advertises the new methods in `host.capabilities`.
Existing apps keep their legacy 320×240 capture and private `photos` album.

## Original and edited images

Use `photo-save` for private storage and `photo-import` separately for album reads.
All three buckets share 250 MiB / 1000 photos per app; max 8 MiB / 16 MP per saved image.
An import copies original bytes and does not modify the source.

```js
const albums = await MuPiBoxSDK.photos.album.list();
const page = await MuPiBoxSDK.photos.album.page(albums[0].photos_url + '?page=1&size=24');
const original = await MuPiBoxSDK.photos.album.import(page.photos[0].url);
const blob = await MuPiBoxSDK.photos.get(original.id, 'originals');
// after editing:
await MuPiBoxSDK.photos.save({blob: editedBlob, bucket: 'edited'});
```

Use `photos.album.get(url)` to preview JPEG/PNG as a Blob; release object URLs.
Page results contain `has_more`. Local, NAS and opt-in app albums are supported;
Immich and other formats are not yet supported. Only the local touchscreen
runner can invoke these methods. Never pass file paths or external URLs.

Publish only edited photos by declaring the following manifest field and
enabling gallery publication in Admin:

```json
{"permissions":["camera","photo-save","photo-import"],
 "galleryDirectories":[{"path":"edited","name":"Spaß mit Fotos"}]}
```

Existing `photos.save(blob)`, `photos.list()`, `photos.get(id)` and
`photos.delete(id)` continue to use the legacy bucket.

## Camera

```js
const devices = await MuPiBoxSDK.camera.list();
const id = devices[0].id;
const modes = await MuPiBoxSDK.camera.modes(id); // discrete native sizes, if v4l2-ctl is available
await MuPiBoxSDK.camera.start(id, {preview:{width:640,height:480},fps:15});
// poll camera.preview() sequentially at <=15 FPS; no overlapping requests.
const frame = await MuPiBoxSDK.camera.preview();
image.src = frame.image;
// stop polling and wait for an outstanding preview before taking a photo:
const still = await MuPiBoxSDK.camera.capture({width:1920,height:1080});
await MuPiBoxSDK.camera.stop();
```

Preview sizes are bounded to 640×480, 5–15 FPS; choose a supported mode.
Capture supports native sizes up to 3840×2160 within the 8 MiB JPEG limit.
The host reports actual image dimensions. Unsupported device modes return
an error; no upscaling is performed. A still temporarily stops the preview;
the next preview call restarts it. The host retains only the latest frame,
stops the process after two seconds without preview requests, and cancels
on session revocation. Do not keep polling while the app is hidden.
No preview data is stored by the host. Physical throughput depends on camera
and Pi; 15 FPS is a cap, not a measured guarantee.

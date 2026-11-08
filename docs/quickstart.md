# Build an external MuPiBox-NG app

## Static web app

1. Make an empty directory, add `manifest.json` as described in [the manifest spec](manifest-v1.md).
2. Add `index.html`, referenced scripts, styles, image assets and (optionally) `mupibox-sdk.js` from `sdk/`.
3. Preview with `python3 -m http.server 8080`. Browsers cannot load WASM via `file://` reliably.
4. Package: `python3 tools/mupiapp.py pack ./my-app dist/my-app.mupiapp`.
5. Validate: `python3 tools/mupiapp.py validate dist/my-app.mupiapp`.

## Go/WASM app

See [`examples/tic-tac-toe`](../examples/tic-tac-toe). A Go `syscall/js` program exposes gameplay functions to a static HTML view. No server or dynamic host binaries required.

```bash
python3 tools/build_example.py
cd .build/tic-tac-toe
python3 -m http.server 8080
```

For your own Go app, compile with `GOOS=js GOARCH=wasm go build -o game.wasm ./cmd/wasm` and include the `wasm_exec.js` runtime matching the compiler version (`$(go env GOROOT)/lib/wasm/wasm_exec.js`, or `misc/wasm/wasm_exec.js` for older Go releases).

## SDK calls (draft)

```javascript
const host = window.MuPiBoxSDK;
const unsubscribe = host.on('input', ({button, action}) => {
  if (button === 'BACK' && action === 'press') host.exit();
});
const score = await host.storage.get('score');
await host.storage.set('score', 3);
```

A local browser preview uses **localStorage** for testing. Starting with MuPiBox-NG **0.2.0-alpha.18**, installed plugins instead use the isolated browser runner and trusted, narrowly scoped host bridge. Native Qt touch integration is available in NG alpha.20+; per-app native header, status and fullscreen preferences are available from alpha.30 (see [the manifest specification](manifest-v1.md#native-app-appearance-and-navigation-ng-020-alpha30)). The SDK itself is no substitute for host sandboxing.

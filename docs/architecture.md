# Host integration architecture (v1 browser preview shipped in NG alpha.18)

## Layers

```text
MuPiBox-NG UI (Qt Quick) / Admin / PWA
  -> App manager (install, remove, permissions, updates, child access)
  -> Per-app isolated web runtime (HTML/JS/WASM)
  -> Trusted host bridge (capability checks and version negotiation)
  -> Narrowly scoped OS services / media focus / controller input
```

An external author only needs the public SDK, schema and package builder. **Do not copy the private core into this repo.**

## Host contract v1 draft

A host may inject `window.__MUPIBOX_BRIDGE__` into a unique, isolated app context before the SDK executes. The bridge supplies:

- `invoke(method, payload): Promise<JSON>` – asynchronous, host-validated calls
- `subscribe(callback): unsubscribe` – host-originated events

Reserved methods: `host.context`, `app.exit`, `storage.get`, `storage.set`. Events: `lifecycle.pause`, `lifecycle.resume`, `input`. The JavaScript SDK converts them into a stable external API; consumers never access host internals. Every invocation MUST be authorized by the trusted host's current app identity and granted capabilities; the app's `id` in its own manifest is not proof of identity. Input and storage values are untrusted.

Illustrative payloads:

```json
{"method":"storage.get","payload":{"key":"wins"}}
{"event":"input","payload":{"button":"A","action":"press"}}
{"event":"lifecycle.pause","payload":{}}
```

**Preview fallback:** Without a host bridge, the SDK uses origin-local browser storage and synthetic keyboard input. This is for development only and is *not a sandbox*.

## Audio and background lifecycle

When app becomes active, host should negotiate audio focus with the existing player. On `lifecycle.pause`, apps stop animation, timers and audio; on `resume`, they restore safe state. Controller events route only to the focused app. `app.exit` returns to the official UI. The host must remain able to revoke focus or terminate an app without its cooperation.

## Trust boundaries

1. One app per origin and isolated storage namespace; **do not** open untrusted content on the privileged Admin/UI origin.
2. No privileged API exposed to the web page except allowlisted bridge methods. Validate method, types, sizes, app identity and permissions on the host side.
3. Default deny network (including localhost and RFC1918 LAN); if network is requested, enforce TLS/hostname/redirect/DNS restrictions in the host. The manifest cannot provide security by itself.
4. Protect against archive traversal, symlinks, oversized content, decompression bombs, malicious SVG/script content and malicious web origins. Use an application sandbox and a strict host-enforced CSP.
5. Treat downloaded packages as untrusted even if the manifest validates. Updates must be pinned to a known publisher and checked for permission changes.
6. Child controls, time limits and RFID launching must be enforced by MuPiBox-NG, not by the app.
7. Native Go/Python applications are **explicitly excluded from v1** pending OS-level isolation design (uid namespaces, cgroups, seccomp, mount/FS restrictions, no privileged socket).

## Shipped and remaining milestones

1. **Shipped in NG 0.2.0-alpha.18:** Trusted archive importer, manually approved manifest permissions, install/update/remove, Admin UI, isolated browser-only Web/WASM runner, persistent scoped storage and an experimental bridge.
2. **Open:** Native Qt touch runtime for Raspberry Pi 4/5; benchmark memory/CPU and check rendering, rotation and hardware gamepads.
3. **Partly shipped in NG alpha.22:** Native musical notes through the permission-gated SDK and appliance PipeWire stream; complete media/stream audio focus is still open. Controller/touch lifecycle remains browser preview quality.
4. **Open:** Per-app child approval, RFID launch, time budgets, complete parental enforcement and content API scopes.
5. **Open:** Catalog backend, signed metadata, publisher identity, automatic updates and multi-version trust policy.

The core can implement a different rendering engine as long as the public bridge behaves the same.

## Per-app photo storage (host development)

An optional `photo-save` permission allows the local trusted touch runner to carry image Blobs across the opaque iframe boundary. The privileged host sends the validated PNG/JPEG bytes to an app-scoped, quota-limited local store via a session-authenticated binary request. The untrusted app never sees paths or session tokens, cannot access other apps' photos, and cannot call the Admin API. Unlike 1-MiB JSON preferences, images use a separate 250-MiB per-app store. The host does not automatically publish them into the built-in Gallery or to printers.

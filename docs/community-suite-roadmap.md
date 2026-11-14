# Community Suite 2026 — MuPi Links, Home Assistant and creative games

Status: **developer previews**, not curated releases. All ten prototypes are
independent web packages using the public SDK; none requires privileged plugins,
third-party JavaScript downloads or copying MuPiBox-NG private source.

## Build

Run `python3 tools/build_community_suite.py` then validate each resulting
`dist/community-preview/*.mupiapp`. The builder copies the updated public SDK
into each package. Test packages must only be installed on a compatible NG
developer instance. The NG host must know the new optional `links` and
`homeassistant` capabilities before those two plugins can be installed.
Apps are not automatically entered into the official catalog.

## Five independently authored classic / lawn-game adaptations (preview)

All five are original code and generated SVG/PNG assets. No third-party
engine or publisher artwork is bundled. 800×480, touch and controller.

| App | Players | Computer |
| --- | --- | --- |
| MuPi Mühlenmeister | Two local | Easy random / medium tactical / hard defensive threat lookahead |
| MuPi Reversi Arena | Two local | Easy random / medium positional / hard minimax |
| MuPi Dame-Duell | Two local | Easy random / medium greedy / hard shallow minimax |
| MuPis Würfelrennen | Two to four participants; configurable number of humans | Remaining participants AI with easy/medium/hard strategy |
| MuPis Wikingerduell (Kubb) | Two teams / two local players | Easy/medium/hard aiming skill with legal-target priority |

Mühlenmeister uses 9 stones per player, placing, sliding, 3-stone flying,
the capture-of-nonmill-stone priority, and a 100-no-mill-moves draw.
Reversi is standard 8×8 with pass turns when no legal moves remain.
Dame-Duell intentionally selects a documented **8×8 variant**: forward men,
mandatory captures, full multiple-jump sequences, long-moving kings,
immediate promotion ending a turn and no majority-capture obligation.
This must not be marketed as the only standard for German/international
draughts. Würfelrennen is a wholly original visual rendering of general
Ludo/Pachisi-like rules: six to leave home, exact private home lane,
captures on the ring, extra roll on six following a valid move. A six
with **no** legal move passes the turn. Avoid the protected Schmidt
trademark and any associated artwork, trade dress or rulebook text.

MuPis Wikingerduell is a small-screen, turn-based **Kubb** adaptation (not
historical Hnefatafl). It draws a 5+5 baseline-kubb field with a central king,
uses a simplified 2/4/6-baton opening, carries knocked-down cubbs back as
field kubbs and enforces field-first priority and early-king-loss. It does
not attempt rigid-body throwing physics or exact tournament adjudication.
It has no licensed third-party board photography or rulebook copy.

See [legal review](community-suite-license-audit.md).

## Current prototype scope

| App | App ID | Working preview | Missing before release |
| --- | --- | --- | --- |
| MuPis BeatBox | `community.mupi-beatbox` | 4 tracks, 16 steps, adjustable tempo, selectable C4–C5 pitches, up to four simultaneous voices through new host chord API, project save/load, controller | polyphonic timing, audio focus, sample packs, song export |
| MuPi Soundquiz | `community.mupi-soundquiz` | Instrument quiz using seven host voices, best-score storage | sound packs, levels, translation, hardware audio tests |
| MuPis Rhythm Game | `community.mupi-rhythm` | Four falling lanes, touch/controller hits, combo, original practice chart, high score | actual synchronized backing track, holds/swipes, chart import, calibration |
| MuPi Links | `community.mupi-links` | Host-managed URL whitelist/favorites are listed | external browsing DISABLED until an intercepted isolated browser is built |
| MuPi Home Assistant | `community.mupi-homeassistant` | Child-scoped approved entity state and narrow on/off actions | live subscriptions, broader safe entity types, HA hardware tests |

All games target landscape 800 × 480. The host note and bounded chord APIs support
C4–C5, seven synth instruments and a rate limit of 75 ms between requests
per app. The NG host branch now includes a bounded `audio.chord` call (up to four
voices per step in one request), which is appropriate for the initial BeatBox.
This is still **not** a sample-accurate clock, DAW or sample player. Rhythm Game uses
an original simple practice pattern, not licensed soundtrack material.
Chromium WebAudio does not currently have a guaranteed route to the MuPiBox
appliance's PipeWire stream; a reliable synchronized music engine remains a
separate feature.

## Security model and host-facing APIs

- `links.list` exposes configured URLs only to apps granted `links`.
- `links.open` validates the URL against the host's exact whitelist but
  intentionally returns HTTP 501. **Do not replace with a simple
  `window.location` or `WebEngineView.url`**. QML navigationRequested only
  filters navigations, not cross-origin subresources, background requests or
  all redirects. Safe external browsing needs a separate off-the-record
  Qt WebEngine profile and a native `QQuickWebEngineProfile::setRequestInterceptor`
  applied to every network request, plus blocked downloads, permission
  requests, local file/network access, pop-ups, and credential isolation.
  Integrating that interceptor with qmlscene needs a separate native component;
  do not loosen the existing community iframe CSP.
- `homeassistant.list` exposes only owner-approved entities, names,
  state and explicitly available actions, never the token or raw attributes.
- `homeassistant.command(entity_id, action)` supports only approved actions
  for approved `light.*`, `switch.*`, `scene.*` entities. The owner enters
  a private-IP Home Assistant URL, long-lived token, and entity allowlist in
  the NG Admin. Tokens are stored only in a mode-0600 host configuration file;
  the plugin never sees them. Redirects are disallowed; only fixed HA API
  paths are used. Everything defaults disabled.
- Existing `storage` remains limited to 64 KiB per value but can now
  retain up to 512 keys / 32 MiB aggregate per app. Large media/project files
  need a separately authorized, quota-limited binary storage API.
- Parental time, device camera/microphone and app installation permissions
  remain host-owned and cannot be overridden by a plugin.

## Third-party feasibility (do not vendor blindly)

| Candidate | Source / license | Decision |
| --- | --- | --- |
| Chrome Music Lab **Song Maker** | [Live experiment](https://musiclab.chromeexperiments.com/Song-Maker/); **the exact Song Maker source is not in** the archived [Google Creative Lab collection](https://github.com/googlecreativelab/chrome-music-lab). See [request #14](https://github.com/googlecreativelab/chrome-music-lab/issues/14) | Reimplement the 5-inch friendly grid concept; do **not** assume the original Song Maker itself is Apache-licensed |
| Chrome Music Lab **Melody Maker** | [Google Creative Lab archive](https://github.com/googlecreativelab/chrome-music-lab/tree/master/melodymaker), Apache-2.0 | Good isolated learning-experiment candidate; needs audio routing |
| [Cadenza](https://github.com/appleweiping/cadenza) | MIT; original four-lane WebAudio rhythm game with public-domain melody transcriptions | **Best next port evaluation**. Touch-first, few dependencies; adapt input/audio and confirm per-chart musical provenance |
| [BeepBox](https://github.com/johnnesky/beepbox) | MIT | Inspiration or possible reuse of synth/sequence components after profiling; original UI too small |
| [JS Paint](https://github.com/1j01/jspaint) | MIT | Do not port complete desktop UI; keep simplified NG painting features |
| [mashukui/web-games](https://github.com/mashukui/web-games) | MIT project, self-contained HTML5 games | Candidate pool for 2048, Breakout, Water Sort, Sokoban, Piano Tap, Simon Says, Mini Golf; inspect per-game files and assets first |
| [Libre Arcade](https://github.com/linkingtechnologies/libre-arcade) | Mixed GPL-3, MIT, Apache, AGPL, CC licenses | Individual review required; avoid wholesale importing |
| [Bemuse](https://github.com/bemusic/bemuse) | AGPL-3.0, BMS rhythm engine | Too complex for first 5-inch port; network/asset/licensing burden |

## Further games to shortlist

Prioritize **2048**, **Sokoban**, **Breakout**, **Water Sort**, **Simon Says**
and **Piano Tap**. Each has a simple interaction model suitable for 800×480,
offline packages and controller navigation. Larger management-heavy games
and WebGL-first games are lower priority. Existing MuPi Snake, Chess,
Four-in-a-Row and Tic-Tac-Toe do not need duplicative ports.

### Future integration milestones

1. Hardware smoke test Pi 4 / Pi 5: ALSA/PipeWire sink switches,
   controller and 800×480 clipping, suspend/exit.
2. Native intercepted external browsing, exact URL whitelist,
   private host/network policy, admin-only configuration.
3. Secure HA setup tests against a real local test HA installation;
   subscriptions and bounded polling.
4. Audio focus + native synchronized pattern transport
   `audio.sequence.load/play/stop` or verified WebAudio PipeWire routing.
5. Licensed Cadenza charts/audio adaptation, rhythm-game calibration,
   song export/import and larger binary project storage.
6. Independent external code/license review, curated releases with SHA-256,
   then optional installation via the catalog. Never install directly on
   productive boxes during feature development.

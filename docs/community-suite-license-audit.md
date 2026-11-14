# License & trademark review — MuPiBox NG Community Suite (2026-11-14)

**Scope:** Four independently implemented classic board games and the five earlier
Community Suite prototypes. A preliminary engineering review, not an attorney's
final trademark clearance for commercial distribution.

## Audit of the actual nine packages

- Game logic, HTML/CSS and SVG icons for all nine preview apps are newly written
  for the MuPiBox Community project; no third-party engines were copied.
- Cover PNGs were generated programmatically from simple shapes/type;
  no downloaded pictures, publishers' game boards, logos or character artwork.
- BeatBox, Soundquiz and Rhythm preview use the MuPiBox **host synthesizer**
  and an internally authored training sequence. They bundle **no commercial
  musical recordings, song arrangements, SFX samples or chart data**.
- Each package bundles the public `mupibox-sdk.js`, which is part of this
  repository's MIT-licensed SDK. The build system includes `LICENSE.txt`
  (root MIT copyright and permission notice) in **every .mupiapp ZIP**.
  Unit tests verify the exact license text is inside all nine archives.
- `storage`, `controller`, `audio`, `links`, `homeassistant` are
  MuPiBox-host permission names, not third-party dependencies.
- No external CDNs or unreviewed websites are fetched by the packaged apps.

## Names and rule sets

| Preview name | Rules / rights | Decision |
| --- | --- | --- |
| **MuPi Mühlenmeister** | Traditional nine men's morris, public traditional rules; independently rendered 24-node board | Okay to develop. 2 local / easy, medium, hard AI |
| **MuPi Reversi Arena** | Independent 8×8 tile-flipping implementation. **Othello** is a registered trademark; do not use its branding or assets | Use generic Reversi description. 2 local / 3 AI levels |
| **MuPi Dame-Duell** | 8×8 checkers with explicit variant; board and pieces generated independently | Okay to develop. Specify mandatory capture, forward men, long kings, chained captures, no majority-capture requirement |
| **MuPis Würfelrennen** | Original Ludo/Pachisi-like gameplay, original radial 52-cell graphic; 2–4 participants, all-human or mixed AI | Do not market as **Mensch ärgere Dich nicht** or **MäDn** or reproduce Schmidt artwork. These names are registered marks and Schmidt has enforced them. New game name is separate, pending normal pre-release collision clearance |

General rules/mechanics are not automatically protected (German Copyright Act
§69a(2) concerning software principles; DPMA FAQ for board-game mechanics).
Specific artwork, graphic design, written rulebooks, music and software **are**
protected independently. A broad assumption that a game with the same rules is
automatically risk-free would be incorrect; avoid publisher visual trade dress.

Sources:
- https://www.schmidtspiele.de/unsere-marken.html
- https://www.schmidtspiele-shop.de/spiele-klassiker
- https://dregeriplegal.de/2025/04/04/markenrechtliche-abmahnung-der-schmidt-spiele-gmbh-mensch-aergere-dich-nicht/
- https://www.othello.gr.jp/trademark_registrations
- https://www.gesetze-im-internet.de/urhg/__69a.html
- https://www.deutsches-patentamt.de/english/services/customer_care_services/faq/index.html

## External projects inspected, **NOT yet copied into any MuPi package**

| Project | License found | Recommendation |
| --- | --- | --- |
| [Cadenza](https://github.com/appleweiping/cadenza/blob/main/LICENSE) | MIT (copyright 2026 Weiping Yan), no audio files; synthesized piano | Good future engine candidate, retain full license and attribution if copied. The README acknowledges that its *Cielito Lindo* arrangement is **not yet public-domain in countries applying life+70**. Do not redistribute all 167 charts unchanged in Germany. Obtain piece-by-piece composition and arrangement rights clearance, or ship only individually verified traditional/public-domain works. |
| [Chrome Music Lab experiments](https://github.com/googlecreativelab/chrome-music-lab/blob/master/LICENSE) | Apache 2.0 for actual code in that repo | **Song Maker** source is not available in that archived repo in a way we have verified for reuse. Reimplement *concept* independently; do not copy proprietary page or artwork. Apache attribution/NOTICE and modified-file notices needed for any reused code from the repo. |
| [BeepBox](https://github.com/johnnesky/beepbox/blob/main/LICENSE.md) | MIT | Host synth currently used; future reuse only with license notice and source audit |
| [orDrumbox v2](https://github.com/cadeli/ordrumbox-v2/blob/main/LICENSE) | MIT | Candidate for future audio engine; test WebAudio/AudioWorklet on Pi |
| [Tone.js](https://github.com/Tonejs/Tone.js/blob/dev/LICENSE.md) | MIT | Candidate for sequencer if PipeWire/WebAudio route becomes viable |
| [JS Paint](https://github.com/1j01/jspaint/blob/master/LICENSE.txt) | MIT | Not bundled: desktop controls poorly matched to 5-inch touch |
| [mashukui/web-games](https://github.com/mashukui/web-games/blob/main/LICENSE) | MIT root | Individual games/assets must be checked before copying; nothing bundled yet |
| [GridSound DAW](https://github.com/gridsound/daw/blob/main/LICENSE) | AGPL-3.0 | Not bundled. A future modified online AGPL work has source provision obligations; separate review required |

## German music copyright caution

The Cadenza README expressly identifies Quirino Mendoza (died 1957)
and the exception *Cielito Lindo*. In Germany, if the relevant death date
and authorship facts are correct, the standard 70-years-after-death term
under §§64, 69 UrhG runs through **31 December 2027**; unprotected use
would generally start **1 January 2028**, subject to separately protected
lyrics, arrangements, recordings and any other contributors. Avoid this
piece in a 2026 Germany-targeted content pack, even though Cadenza's
software itself is MIT.

Legal references:
- https://www.gesetze-im-internet.de/urhg/__64.html
- https://www.gesetze-im-internet.de/urhg/__65.html
- https://www.gesetze-im-internet.de/urhg/__69.html

## Pre-release gate

1. Validate the four names against current DPMA/EUIPO trademark records in the
   final publication territory, especially Würfelrennen and Reversi.
2. Verify exact copyright attribution for any newly imported song chart,
   samples, fonts or graphics; every transitive component gets an SPDX/NOTICE.
3. Preserve MIT `LICENSE.txt` in archives, document own modifications.
4. Run basic 800×480 touch/controller and AI game-completion tests on Pi 4/5.
5. Do not ship as public catalog release until security and hardware checks pass.

No legal guarantee of non-infringement is implied by this technical audit.

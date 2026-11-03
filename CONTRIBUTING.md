# Contributing / Mitmachen

Thanks for helping make the independent MuPiBox-NG plugin ecosystem accessible.

1. Open an issue describing the proposal and its compatibility impact.
2. Keep the v1 schema, docs, JS SDK and package validator aligned.
3. Add tests for behavior and security-related changes (`python3 -m unittest discover -s tests -v`, `cd examples/tic-tac-toe && go test ./game`).
4. Do not add copyrighted MuPiBox-NG core source, proprietary artwork, secrets, tokens or device configuration.
5. Apps do not have to live in this repo. Publish independent apps in your own repositories and distribute `.mupiapp` releases.

A browser-only plugin host is available starting with MuPiBox-NG **0.2.0-alpha.18**; native Pi touch integration, full audio focus and a signed app catalog are not available yet. Do not claim compatibility with older NG versions. See [the English guide](GETTING_STARTED.en.md) and [AI instructions](ai.md) for PR preparation.

By contributing code here, you agree to publish it under this repository's MIT license. Individual external app authors may pick their own licenses.

For inclusion in the optional built-in app catalog, see [catalog/README.md](catalog/README.md). A normal PR is not a trusted release. Only curated, reviewed .mupiapp packages published by the MuPiBox-NG-Plugins maintainers in this repository’s official GitHub Releases can be added. Always provide artifact SHA-256 and matching permissions.

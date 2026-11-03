# Contributing / Mitmachen

Thanks for helping make the independent MuPiBox-NG plugin ecosystem accessible.

1. Open an issue describing the proposal and its compatibility impact.
2. Keep the v1 schema, docs, JS SDK and package validator aligned.
3. Add tests for behavior and security-related changes (`python3 -m unittest discover -s tests -v`, `cd examples/tic-tac-toe && go test ./game`).
4. Do not add copyrighted MuPiBox-NG core source, proprietary artwork, secrets, tokens or device configuration.
5. Apps do not have to live in this repo. Publish independent apps in your own repositories and distribute `.mupiapp` releases.

The host integration is not available yet; please do not report standalone packages as installable on an existing MuPiBox-NG build.

By contributing code here, you agree to publish it under this repository's MIT license. Individual external app authors may pick their own licenses.

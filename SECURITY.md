# Security policy

**Developer preview:** App packages are untrusted content. The Python validator checks structure and some archive hazards, but it does not prove that an app is harmless, safe for children, or sandboxed.

Never run third-party native binaries with system privileges. Never grant a plugin direct access to the MuPiBox-NG filesystem, credentials or core services. A future host runtime MUST isolate every app, gate privileged calls, enforce per-app storage and network policies, verify package integrity and require user consent. Web content security policy and unique origins must be enforced by the *host*, not just declared in an app manifest.

Do not upload vulnerabilities, credentials or private host code in public issues. Report potential vulnerabilities privately to the repository owner via GitHub's **Report a vulnerability** feature when enabled, or contact the maintainer privately via the official project channels.

No security-supported release line exists yet; the v1 contract is experimental until the host integration and threat-model review are complete.

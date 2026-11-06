# Verification, 2026-11-06

Canonical pure registrations and lazy manifest binding now drive skill/command
projections, workflow/profile IDs and detection/reference mappings. The factory
facade remains unchanged. Tool profiles bind the explicit catalog dynamically
to paths, adapters, capabilities and transform behavior. preAdapter/postAdapter
transforms wrap command/skill renderers deterministically. Init, update and
legacy upgrade share ArtifactSyncEngine planning/rendering/writing while their
cleanup and shared-root ownership policy remain in place.

Node 24.21 / pinned pnpm 10.34.5, native Windows paths with spaces:
- Build and lint passed.
- Initial unchanged golden/template/skill/reference/adapter parity: 515 passed.
- Engine/manifest/profile/transform + actual init/update delivery tests and
  unchanged golden/skills.sh checks: 87 passed. The new matrix compares complete
  bytes/paths to the previous projection algorithm for every supported tool,
  all delivery modes and core/full workflows. It also tests actual writes,
  shared writer arbitration, unsupported-surface preflight and linked targets.
- Existing shared-root/representative init policy selection: 20 passed.
- Actual built CLI smoke: all eight scenarios passed, evidence retained under
  artifacts/qa-smoke/2026-11-06T12-12-00-186Z-956e7b28/summary.json.
- Existing golden hashes and public skills were not regenerated or edited.

Full platform CI remains the final archive gate. No new user-facing CLI flags,
workflow body changes, install-scope migration or broader cleanup was added.
Extension guardrails and import-cycle/order decisions are documented in
docs/template-generation.md and the design.

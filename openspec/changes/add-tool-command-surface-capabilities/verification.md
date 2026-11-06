# Verification, 2026-11-06

## Implementation and sequencing

Based on current main 40771b5 (including the merged simplification/profile
model and QA harness). Capability metadata is additive to existing per-tool
generation. No install-scope feature is merged, so task 0.4's conditional
combined-scope gate is not triggered. Follow-up scope work must preserve this
capability-aware delivery model; no global-path behavior is claimed here.

Explicit commandSurface metadata wins over adapter inference. Codex retains
its existing invocable-skills model; ForgeCode, Kimi and Vibe join it. Trae
continues using its adapter. Init's legacy cleanup/migration now follows tool
selection and compatibility preflight; update preflights configured tools
before any migration. Unsupported commands-only selection leaves every
project/global config file untouched. Interactive guidance names invocable
tools before confirmation; summaries report usable skills instead of skips.

## Local evidence

- Node 24.21 / pinned pnpm 10.34.5: build and lint passed.
- 14 new tests passed: explicit override/fallback, all invocable tool delivery
  modes, mixed Claude/Kimi/ForgeCode/Vibe, second-update idempotence, pre-write
  failure with full project/global file-hash inventories.
- Seven adjusted init regressions and five update regressions passed. Legacy
  expectations that Kimi gets no artifacts, or unsupported tools are silently
  emptied, were changed to the proposed contract; preservation checks remain.
- Actual built CLI smoke: commands-only Kimi and Claude+Kimi each generated six
  Kimi skills; Claude received six commands without skills; second update was
  up to date and retained skills. Isolated HOME/config with native spaced paths.
- Initial broad local targeted run: 348 passed, four skipped; its failures were
  old behavior assertions plus Windows symlink privilege and a slow migration
  timeout. No full local pass is claimed. Server full matrix remains the gate.

Complete server CI and archive are pending. Public docs include the delivery
matrix and unsupported-tool remediation. No user/global install files changed.

# Developer QA

After `pnpm install --frozen-lockfile` and `pnpm run build`, run `make qa`.
`make qa-smoke` is the same non-interactive check. Without Make, including on
Windows, use `node scripts/qa-smoke.mjs`.

Eight deterministic scenarios exercise the actual built CLI: core output,
detected tools without a terminal, legacy profile migration, both delivery
cleanup directions, commands-only tool detection, a new-tool notice and invalid
profile rejection before project writes. A user-owned command file must survive
both cleanup checks.

Each scenario has a separate project and child-process HOME, USERPROFILE,
XDG_CONFIG_HOME, XDG_DATA_HOME, APPDATA, LOCALAPPDATA and CODEX_HOME. The parent
process and the developer's real tool/config directories are unchanged.
Telemetry is disabled in the fixture processes.

The command prints its evidence directory under `artifacts/qa-smoke/`. For each
CLI step it retains arguments, exit status, stdout, stderr and before/after
project file inventories with sizes and SHA-256 hashes. The isolated fixtures
are retained there for inspection. `summary.json` reports every scenario even
when one fails; any failed scenario makes the command exit nonzero. Use
`--artifacts <new-directory>` to choose an export location. Existing evidence
directories are refused instead of overwritten.

Linux CI runs the same entrypoint and uploads its evidence even on failure.
Interactive key handling has its own checklist: `make qa-interactive` or
`node scripts/qa-interactive.mjs`. Record that acceptance separately.

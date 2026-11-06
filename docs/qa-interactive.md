# Interactive CLI acceptance

Use a disposable directory and an isolated home/config/data environment. The
smoke harness keeps per-scenario fixtures under the artifact directory; one of
those environments can be reused without touching your normal tool settings.

1. Build with `pnpm run build`, then run `make qa` (or `node scripts/qa-smoke.mjs`).
2. In a real terminal, enter an empty fixture project and run the built CLI's
   `init --no-animation`. Confirm the tool selector is readable and focused.
3. Press Space to select a tool, Space to clear it, then Space again. Confirm
   the check mark follows every toggle. Press Enter to confirm.
4. Run init in another fixture already containing a `.claude` directory.
   Confirm the detected tool is preselected and Enter accepts the selection.
5. Check the resulting paths and the getting-started invocation against the
   smoke report. On Windows use native paths, including a directory with spaces.
6. Record OS, Node version, observed key presses, outcome and any unsupported
   terminal case in the change's verification record. Automated smoke output
   does not claim to have verified key handling.

`make qa-interactive` prints this checklist. Windows installations without Make
can run `node scripts/qa-interactive.mjs` directly.

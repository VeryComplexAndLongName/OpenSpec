# QA acceptance, 2026-11-06

Windows 10, Node 24.21.0: eight actual built-CLI smoke scenarios passed.
Run: artifacts/qa-smoke/2026-11-06T10-08-23-828Z-f5326a3f/summary.json.

Negative control: a separate CLI stub returning 42 caused all eight scenarios to
fail, retained per-command evidence and returned harness status 1. Reusing an
existing evidence directory was refused, preserving the summary SHA-256
3651b15983028ff72daa421a56192f48ce2c4d218a1e068b5849453994a84b8b.

Pinned pnpm 10.34.5 build and source lint passed. The subsequent full CI and real-terminal acceptance results below complete
those gates.

Actual Windows PTY acceptance passed: empty project showed no selected tools;
Space selected Amazon Q, Space cleared it, Space selected it again; Enter
confirmed and generated six skills/six commands (exit 0). In a separate project
containing .claude, the real selector reported Claude Code preselected; Enter
accepted it and generated six skills/six commands (exit 0). Both projects used
isolated homes/config/data paths and a project path with spaces.


## Completed server CI

CI run 42201389984 passed on exact feature commit
a0d676331683cec9f5036ddf3e3858114ac09478:
- Linux: 198 test files, 5745 tests passed; all eight smoke scenarios passed.
- Windows: 195 test files passed / 3 skipped; 5647 tests passed / 98 skipped.
- macOS, build/typecheck/lint, Nix validation and release tracking passed.
- Security run 42201389985 passed after enabling the repository's missing
  dependency graph through the documented vulnerability-alerts API. No check
  was disabled and no dependency changed. Dependency Review, Audit and website
  lockfile drift all passed.
- The Linux job ran `make qa-smoke` and uploaded `cli-smoke-pull_request`.

The separate full attempt on the user's Windows 10 laptop encountered existing
EPERM failures when creating symlinks and slow Git subprocess timeouts. After
the complete server matrix passed, that redundant local run was stopped. It is
not reported as a local full-suite pass. Local smoke, controls, build, lint and
actual PTY acceptance passed as recorded above. Server Windows acceptance uses
the supported CI environment and is not substituted by local source inspection.

CI: https://github.com/VeryComplexAndLongName/OpenSpec/actions/runs/42201389984
Security: https://github.com/VeryComplexAndLongName/OpenSpec/actions/runs/42201389985

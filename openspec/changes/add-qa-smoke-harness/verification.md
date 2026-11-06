# QA acceptance, 2026-11-06

Windows 10, Node 24.21.0: eight actual built-CLI smoke scenarios passed.
Run: artifacts/qa-smoke/2026-11-06T10-08-23-828Z-f5326a3f/summary.json.

Negative control: a separate CLI stub returning 42 caused all eight scenarios to
fail, retained per-command evidence and returned harness status 1. Reusing an
existing evidence directory was refused, preserving the summary SHA-256
3651b15983028ff72daa421a56192f48ce2c4d218a1e068b5849453994a84b8b.

Pinned pnpm 10.34.5 build and source lint passed. Full tests, Linux CI and
interactive detection acceptance remain pending; no completion is claimed yet.

Actual Windows PTY acceptance passed: empty project showed no selected tools;
Space selected Amazon Q, Space cleared it, Space selected it again; Enter
confirmed and generated six skills/six commands (exit 0). In a separate project
containing .claude, the real selector reported Claude Code preselected; Enter
accepted it and generated six skills/six commands (exit 0). Both projects used
isolated homes/config/data paths and a project path with spaces.

## 1. Deterministic CLI QA

- [x] 1.1 Implement eight actual-CLI smoke scenarios with per-scenario home/config/data isolation and native spaced paths; verify generated core artifacts, detection, migration, cleanup/user-file preservation, notices and pre-write validation.
- [x] 1.2 Retain command logs, exit results, before/after file inventories and aggregate failure results; verify an intentionally failing CLI produces a nonzero harness result and retained evidence.

## 2. Developer and CI entrypoints

- [ ] 2.1 Add Make targets and equivalent direct Node entrypoints, QA instructions and a printable interactive checklist; execute the documented commands.
- [ ] 2.2 Wire Linux CI to run smoke QA and upload evidence; verify the Linux run and workflow job results.

## 3. Acceptance

- [x] 3.1 Verify smoke QA on Windows with native paths containing spaces; record the platform and run directory.
- [x] 3.2 In a real terminal verify Space toggle/untoggle, Enter confirmation and detected-tool preselection; record actual key presses and observed results separately from non-interactive smoke.
- [ ] 3.3 Run build, lint, complete existing tests, strict OpenSpec validation and diff checks; preserve the outcomes and limitations.

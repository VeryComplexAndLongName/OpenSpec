# Archive acceptance audit, 2026-11-06

- Selected changes are already implemented on fetched origin/main and their tasks contain named regression/manual/full-suite acceptance receipts.
- Canonical scenario preservation will be checked before each archive; existing incomplete proposals are not declared implemented.
- fix-schemas-root-selection remains open unless the specifically requested Windows CI evidence is confirmed.
- fix-schemas-root-selection: exact implementation commit 836442866134187434f59c44d96c78994809b9fe has successful upstream Windows job 93943929352 in run 31541262310. Retained actual job log explicitly shows test/commands/schemas.test.ts: 6 passed; full Windows suite 134 files passed/1 skipped, 3886 tests passed/66 skipped. The test file includes the native store path with spaces and isolated registered/local root fixtures. https://github.com/Fission-AI/OpenSpec/actions/runs/31541262310/job/93943929352
- Only completed changes already present on main are archived. Existing verification records and known limitations are retained.

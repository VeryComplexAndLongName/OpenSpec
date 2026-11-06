# Stack planning implementation decisions

The optional Zod stack shape is shared with ordinary metadata persistence.
One read-only graph loads active changes and archived metadata, uses explicit
edges, finds SCCs, propagates hard blockers and computes depth/ID order. Marker
providers require explicit direct ordering; missing history/overlap advice is
marked advisory so strict validation keeps it non-blocking without weakening
any existing strict warning. Archive enforces this graph before writes even
when callers skip spec validation.

Split is a conventional proposal/tasks scaffolder, not semantic decomposition.
The source becomes a planning-only container. Exact original bytes are retained
under .split-original-*; original deltas leave the active merge path. Thus a
parent-first dependency link does not create a deadlock or apply unimplemented
canonical requirements. Child tasks remain open. The final child conservatively
carries the overall capability contracts, while scope assignment refines them.
Existing implementation consumers must explicitly rewire to that final child;
the command refuses before writes instead of silently editing unrelated plans.

Collision, ownership, path/link and artifact-kind checks precede scaffolding.
Explicit re-split replaces only named managed stubs of the same child set;
other user files and original backups remain. Custom tracked-task layouts are
refused rather than silently retaining duplicate implementation work. These
limits and the migration of IMPLEMENTATION_ORDER.md are documented in
docs/change-stacks.md. No existing scope/task is claimed implemented by split.

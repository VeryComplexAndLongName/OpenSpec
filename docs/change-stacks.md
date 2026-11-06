# Change stacks and independently mergeable slices

Stack fields are optional in a change's `.openspec.yaml`:

```yaml
schema: spec-driven
dependsOn: [add-storage]
provides: [query-api]
requires: [storage-contract]
touches: [cli-init, src/core]
parent: query-platform
```

`dependsOn` is the execution/archive ordering source of truth. A predecessor
may be active or archived; archived IDs accept the original ID and the dated
archive directory name. `parent` records a decomposition relationship without
adding an implicit graph edge. Arrays contain nonempty trimmed strings and are
deduplicated. Dependency/parent IDs use the normal kebab-case grammar.

`provides` and `requires` describe capability contracts. If an active change
provides a required marker, declare a direct `dependsOn` edge to at least one
provider. Markers never add edges automatically. A historical provider satisfies
the marker without a warning. A marker absent from active and archived history
is advisory. Shared `touches` values produce advisory overlap warnings. These
planning warnings remain non-blocking even under `--strict`; malformed metadata,
missing dependencies, cycles and transitively blocked paths are errors.

## Inspect and create a stack

```sh
openspec new change add-query --depends-on add-storage \
  --requires storage-contract --provides query-api --touches cli-init
openspec change graph --json
openspec change next
openspec validate --changes --strict
```

Graph order sorts by dependency depth, then lexicographic change ID at the same
depth. `next` includes only valid changes whose explicit predecessors are
already archived. Missing/unresolved paths are excluded from recommendations;
JSON retains their diagnostics. Cycles fail graph/next before sequencing.
Archive refuses active predecessors even with `--no-validate` or `--skip-specs`.
The commands resolve the same repository/store roots as other modern commands;
`--store <id>` selects a registered store. These new planning subcommands are
supported and do not emit the legacy noun-command deprecation warning.

## Split a plan before implementation

Split when slices can be reviewed, tested and merged independently. Keep a
single change when intermediate states would be invalid or the work is already
small enough for one review. The conventional proposal.md/tasks.md scaffolder
does not guess semantic requirement ownership or custom workflow task layouts.

```sh
openspec change split query-platform
# Or choose explicit child IDs:
openspec change split query-platform --slices query-storage,query-api
```

The default creates two numbered slices. Each child has a `parent` link,
depends on the planning parent and the previous slice, and retains the source's
explicit prerequisites. The final slice carries the source's overall capability
contracts until the authors refine the slice scopes. `touches` remains advisory.
Every child receives open scope/implementation/acceptance tasks. These are
planning stubs with `skip_specs: true`; assign exact requirements and markers,
add the slice's deltas, and remove `skip_specs` before implementing behavior.

The source becomes a planning container with one completed scaffolding task.
Its exact original proposal, unfinished tasks, metadata and deltas are preserved
under `.split-original-*`. Original delta specs leave the active `specs/` path,
so archiving the planning parent cannot apply unimplemented requirements to
canonical specs. Archive the planning parent first, then implement/archive
children in order. The original implementation tasks were preserved, not marked
complete. The source's history remains available in its archive.

Existing implementation consumers of the source must point to the final slice
before splitting. The command names those consumers and refuses without writes,
instead of silently making them depend only on a completed planning parent.
It does not rewrite another change's dependency metadata on the author's behalf.

A second split refuses without changing child content. `--overwrite` (alias
`--force`) explicitly regenerates only the managed proposal/tasks/metadata stubs
for the original child IDs. Other files and the exact original backups remain.
It refuses unrelated child collisions, moved ownership, linked content and
non-file managed artifact paths before writing. Custom task-artifact layouts
receive an actionable error so their unfinished work cannot be duplicated or
hidden. Refine those layouts explicitly rather than treating the scaffolder as
an automatic decomposition engine.

## Migrate a narrative ordering file

Move normative predecessor relationships from
`openspec/changes/IMPLEMENTATION_ORDER.md` into each change's `dependsOn`.
Retain the Markdown file for rationale or discussion if useful; it is optional
narrative, never a second dependency source. Run graph and strict validation to
check the resulting metadata, then coordinate advisory overlaps separately.

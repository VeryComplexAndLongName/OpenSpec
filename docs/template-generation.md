# Workflow artifact generation

OpenSpec installs the same workflow bodies through skills and tool command
adapters. Keep registration, rendering and writing on the shared path below.

## Canonical workflow registration

`src/core/templates/workflow-registrations.ts` is the only workflow registration
table. Each entry names a workflow, skill directory/factory, optional command
descriptor and presentation ranks. The data module has type-only factory
imports so config, profiles and reference helpers do not initialize templates
through an import cycle. `workflow-manifest.ts` binds the split template modules
lazily and applies the existing license/compatibility/author/version defaults.

`getSkillTemplates`, `getCommandTemplates`, `getCommandContents`, profile IDs,
skill detection names, command IDs and workflow-to-skill mappings derive from
that registration. Generation order and profile presentation order differed
before this refactor; the manifest records both ranks to preserve that API.
The existing `skill-templates.ts` factory exports remain a compatibility facade.
Standalone feedback guidance remains outside the installable workflow catalog.

When adding a workflow, add its module/facade export and one manifest entry.
Choose stable IDs/paths and presentation ranks; provide a command descriptor
only when it has a command projection. Do not add parallel detection/projection
arrays. Completeness tests require unique IDs/dirs, valid skill metadata and
matching command/workflow registration.

## Tool profiles and transforms

`ToolProfileRegistry` binds every explicit `AI_TOOLS` entry to its current
adapter, command surface, skills paths, invocation and transform IDs. It resolves
lazily so explicit metadata overrides and adapter registration remain visible.
Path helpers use profiles; no second hand-maintained supported-tool list exists.
Registered adapter-only extension IDs remain resolvable without becoming CLI
tool selections. Existing project/global MiniMax paths retain their semantics.

Transforms declare an ID, `skill | command | both` scope,
`preAdapter | postAdapter` phase, numeric priority and an applicability predicate.
Within a phase, priority then stable ID determines order, independently of
registration order. Duplicate IDs or non-finite priorities fail explicitly.

The standard pre-adapter transforms preserve skill invocation variants and
adapter command spellings, including OpenCode's flat references. Command bodies
are transformed before `adapter.formatFile`; post-adapter transforms receive
the complete formatted file. Skill bodies run pre-adapter before frontmatter
rendering, then post-adapter. Optional-workflow conditionals must be resolved.
OpenCode's argument placeholder injection stays in its formatting adapter.

Use the same renderer for generation, drift comparisons and adapter-backed
onboarding references. The low-level reference helpers remain compatibility
APIs; init/update no longer compose artifact transforms themselves.

## Shared sync engine

`ArtifactSyncEngine` plans concrete artifacts, renders them and writes through
the existing `FileSystemUtils` trust-boundary checks. Init, update and the legacy
upgrade generation path all use it. Selected workflows, delivery, version,
shared-skill writer arbitration and the effective skills root are inputs.

Callers retain their existing cleanup/ownership policy and per-surface ordering:
write skills, reconcile ownership/deselected skills, write commands, reconcile
commands. The engine does not broaden legacy cleanup, delete user files, claim
a shared root or introduce an install-scope migration. A skipped shared-skill
writer may still generate an independent command surface.

`plan()` supports inspection without writes; `sync()` uses that same plan and
writer. Representative tests compare every byte/path against the previous
projection algorithm for every tool, all delivery modes and core/full workflows.
Writer tests cover shared arbitration, unsupported-surface preflight and a
linked target that must not write outside the project.

## Fidelity gates

Keep existing template golden hashes and public skills unchanged for a pure
pipeline refactor. Run manifest/profile/transform/engine tests, existing template
and skills.sh parity, actual CLI smoke and full platform CI. A future intentional
workflow change may regenerate goldens under its own reviewed scope; generation
architecture changes alone do not justify rebaselining them.

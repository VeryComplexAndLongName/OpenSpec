# Implementation checkpoint, 2026-11-06

The user authorized independent completion on 2026-11-06. The scope metadata
and pure target planner (tasks 2.1–2.4) are implemented with focused tests.
No init/update generation, global defaults, config migration or cleanup has
been switched on by this preparatory slice. All corresponding tasks remain open.

`resolveInstallTarget` uses explicit support per surface, conservative project
fallback when metadata is absent, deterministic fallback notes and actionable
failure for an empty support set or missing target. Existing global-only
MiniMax skills are declared explicitly; no upstream global paths are guessed.
The planner validates relative paths, drive-relative/UNC/traversal escapes and
native Windows roots. It performs no filesystem writes or cleanup; actual
writers must continue to use their filesystem confinement checks.

## Unresolved original contract

The original command-generation delta requires Codex global prompts under
`$CODEX_HOME/prompts` or `~/.codex/prompts`. The current supported-tools and
command-surface contracts explicitly make Codex skills-invocable with no
command adapter. Implementing that delta would restore a retired command
surface; silently removing it would change this proposal's scope.

The user must choose whether to revise the Codex scenario to the current
skills contract (recommended) or explicitly restore legacy prompts. The
Windows/CODEX_HOME scenario remains unimplemented, not checked off. Config
defaults, adapter context, init/update scope migration and safe cleanup remain
open together so this preparatory planner cannot cause a partial installation.
The change must not be archived.

## Verification

- 16 focused scope planner cases passed, including native Windows paths.
- Build/lint, strict validation and server CI are recorded by the PR gate.

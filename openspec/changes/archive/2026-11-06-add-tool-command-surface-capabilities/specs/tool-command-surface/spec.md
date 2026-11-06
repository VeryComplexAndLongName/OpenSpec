## Purpose
Classify each tool's command surface so delivery keeps selected workflows invocable and rejects incompatible commands-only plans before changing files.

## ADDED Requirements

### Requirement: Explicit command surface metadata
Tool metadata SHALL optionally declare commandSurface as adapter, skills-invocable or none. The shared resolver SHALL use explicit metadata before inferring adapter presence, and SHALL infer none when neither is present.

#### Scenario: Explicit override and inferred fallback
- **WHEN** a registered adapter's tool has an explicit commandSurface override
- **THEN** the resolver SHALL return the override
- **AND** an unannotated registered tool SHALL resolve to adapter
- **AND** an unannotated tool without an adapter SHALL resolve to none

### Requirement: Invocable skill integrations
Codex, ForgeCode, Kimi Code and Mistral Vibe SHALL use managed skills as their command surface under every delivery mode. Adapter-backed tools SHALL retain their existing delivery behavior.

#### Scenario: Mixed commands delivery
- **WHEN** commands delivery selects Claude Code and Kimi Code
- **THEN** Claude SHALL receive command files and remove managed skills
- **AND** Kimi SHALL retain or generate its managed skills without requiring an adapter

### Requirement: Atomic compatibility preflight
Init and update SHALL reject commands delivery for tools resolving to none before migration, cleanup, generation or configuration writes, with deterministic incompatible IDs and both or skills alternatives.

#### Scenario: Incompatible configured tool
- **WHEN** a configured tool resolves to none and update uses commands delivery
- **THEN** update SHALL fail before altering any configured tool or global configuration
- **AND** its error SHALL list incompatible tool IDs in lexicographic order

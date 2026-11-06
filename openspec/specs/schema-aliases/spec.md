# schema-aliases Specification

## Purpose
Let users select the standard OpenSpec workflow as `openspec-default` while existing `spec-driven` configurations continue to resolve the same schema without migration.

## Requirements

### Requirement: Standard workflow schema names are aliases

The system SHALL resolve `openspec-default` and `spec-driven` to the same standard workflow schema definition.

#### Scenario: Select the preferred schema name
- **WHEN** a user selects `openspec-default` in a schema-accepting CLI command or project configuration
- **THEN** the system SHALL use the standard workflow schema

#### Scenario: Select the existing schema name
- **WHEN** a user selects `spec-driven` in a schema-accepting CLI command or project configuration
- **THEN** the system SHALL use the same schema definition as `openspec-default`
- **AND** workflow artifacts and instructions SHALL be equivalent for both names

### Requirement: Existing project configurations remain compatible

Existing projects configured with `schema: spec-driven` SHALL continue to work without requiring users to edit their configuration or rename schema directories.

#### Scenario: Use an unchanged existing project
- **GIVEN** a project already uses `schema: spec-driven`
- **WHEN** a schema-dependent command reads its configuration
- **THEN** the command SHALL resolve the standard workflow schema successfully
- **AND** the existing schema setting SHALL remain usable without migration

### Requirement: New default selection uses the preferred schema name

The default standard workflow selection and documentation SHALL prefer `openspec-default` while documenting continued compatibility with `spec-driven`.

#### Scenario: Select the default schema
- **WHEN** the system selects the default schema without an explicit schema name
- **THEN** the preferred default name SHALL be `openspec-default`
- **AND** it SHALL resolve to the same workflow definition as `spec-driven`

#### Scenario: Read schema selection documentation
- **WHEN** documentation presents the standard workflow schema
- **THEN** it SHALL prefer `openspec-default` and explain that `spec-driven` remains accepted

### Requirement: Alias resolution works with native schema paths

Both names SHALL resolve the same schema on Windows, macOS and Linux, independently of whether its physical directory retains the existing name or uses the preferred name.

#### Scenario: Resolve aliases from a Windows path with spaces
- **GIVEN** a project and schema location with spaces in their native Windows paths
- **WHEN** the user selects either standard schema name
- **THEN** both names SHALL resolve to the same schema definition using platform-correct paths

#### Scenario: Resolve aliases on macOS and Linux
- **WHEN** the user selects either standard schema name on macOS or Linux
- **THEN** both names SHALL resolve the same schema definition using native paths

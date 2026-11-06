# qa-smoke-harness Specification

## Purpose
Give contributors a reproducible, isolated way to validate built CLI initialization, profile migration and tool delivery behavior while retaining inspectable evidence.

## Requirements

### Requirement: Deterministic built CLI scenarios
The smoke harness SHALL invoke the actual built CLI non-interactively and check core output, tool detection, missing-profile migration, both delivery cleanup directions, commands-only detection, new-tool messaging and invalid-profile rejection before project writes.

#### Scenario: Run the smoke suite
- **WHEN** a contributor runs smoke QA after building the CLI
- **THEN** each declared scenario SHALL run against its own fixture project and validate its observable output or files
- **AND** cleanup scenarios SHALL preserve a user-owned command file

### Requirement: Isolated cross-platform fixture settings
Every scenario SHALL use its own project and child-process home/config/data/Codex directories, preserving the caller's real configuration.

#### Scenario: Native Windows paths with spaces
- **WHEN** smoke QA runs on Windows
- **THEN** its fixture projects SHALL include spaces and use native paths
- **AND** fixture commands SHALL use isolated home and configuration directories

#### Scenario: Unix fixture paths
- **WHEN** smoke QA runs on Linux or macOS
- **THEN** the same scenarios SHALL use platform-correct fixture paths and isolated home/config/data directories

### Requirement: Inspectable success and failure artifacts
The harness SHALL retain command arguments, stdout, stderr, exit status, before/after file inventories and per-scenario aggregate results in a new evidence directory.

#### Scenario: A scenario fails
- **WHEN** a CLI command or observable scenario assertion fails
- **THEN** evidence SHALL remain available and the harness SHALL return a nonzero exit status
- **AND** the aggregate result SHALL identify the failed scenario

#### Scenario: An evidence directory already exists
- **WHEN** a contributor selects an existing evidence directory
- **THEN** the harness SHALL refuse to overwrite the previous run

### Requirement: Interactive acceptance remains explicit
The QA workflow SHALL provide a separate checklist for real-terminal tool selection and record that acceptance independently of automated smoke results.

#### Scenario: Check interactive initialization
- **WHEN** a contributor follows the interactive checklist
- **THEN** they SHALL check Space selection and clearing, Enter confirmation and detected-tool preselection
- **AND** the record SHALL identify the platform and observed outcome

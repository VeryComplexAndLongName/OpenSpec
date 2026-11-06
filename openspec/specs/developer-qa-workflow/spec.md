# developer-qa-workflow Specification

## Purpose
Provide one documented local and CI entrypoint for repeatable OpenSpec CLI smoke QA, with a separate entrypoint for interactive terminal acceptance.

## Requirements

### Requirement: Makefile QA Entry Point

The repository SHALL provide Makefile targets as the primary developer entrypoint for CLI QA flows.

#### Scenario: Default QA target runs smoke suite

- **WHEN** a developer runs `make qa`
- **THEN** the command SHALL execute the non-interactive smoke suite
- **AND** exit with status code 0 only when all smoke scenarios pass

#### Scenario: Smoke suite target is directly invokable

- **WHEN** a developer runs `make qa-smoke`
- **THEN** the command SHALL execute the same smoke suite used by `make qa`
- **AND** return a non-zero exit code on assertion failure

#### Scenario: Interactive checklist target exists

- **WHEN** a developer runs `make qa-interactive`
- **THEN** the command SHALL provide the manual interactive verification checklist
- **AND** SHALL NOT run interactive prompt automation by default

### Requirement: Sandboxed Smoke Scenario Runner

The smoke suite SHALL run CLI scenarios in isolated sandboxes so tests are repeatable and do not depend on machine-global state.

#### Scenario: Scenario execution is environment-isolated

- **WHEN** a smoke scenario runs
- **THEN** it SHALL use temporary values for `HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, and `CODEX_HOME`
- **AND** global config from the host machine SHALL NOT affect scenario outcomes

#### Scenario: Scenario artifacts are captured for review

- **WHEN** a smoke scenario completes
- **THEN** the runner SHALL capture command output and exit status
- **AND** SHALL capture enough filesystem state to inspect before/after behavior

#### Scenario: High-risk workflow coverage exists

- **WHEN** the smoke suite executes
- **THEN** it SHALL include scenarios covering profile/delivery behavior and migration-sensitive flows
- **AND** include at least:
  - non-interactive tool detection
  - migration when profile is unset
  - delivery cleanup (`both -> skills`, `both -> commands`)
  - commands-only update detection

### Requirement: Shared contributor QA entrypoints
Contributors SHALL be able to run smoke QA through `make qa` or `make qa-smoke`, and print the interactive checklist through `make qa-interactive`.

#### Scenario: Make is unavailable on Windows
- **WHEN** a contributor has Node but no Make installed
- **THEN** documented direct Node commands SHALL run the same smoke harness and print the same checklist

### Requirement: Linux CI exercises the same smoke harness
Linux CI SHALL execute the contributor smoke entrypoint after building and retain its evidence as a CI artifact even when smoke QA fails.

#### Scenario: A Linux pull request check runs
- **WHEN** the Linux CLI test job reaches smoke QA
- **THEN** it SHALL invoke the same smoke entrypoint used locally
- **AND** failed smoke assertions SHALL fail the job while preserving uploadable evidence

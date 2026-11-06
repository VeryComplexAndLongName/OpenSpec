# Update Command Specification

## Purpose

As a developer using OpenSpec, I want to update the OpenSpec instructions in my project when new versions are released, so that I can benefit from improvements to AI agent instructions.

## Requirements

### Requirement: Update Behavior
The update command SHALL update OpenSpec instruction files to the latest templates in a team-friendly manner.

#### Scenario: Running update command
- **WHEN** a user runs `openspec update`
- **THEN** replace `openspec/AGENTS.md` with the latest template
- **AND** if a root-level stub (`AGENTS.md`/`CLAUDE.md`) exists, refresh it so it points to `@/openspec/AGENTS.md`

### Requirement: Prerequisites

The command SHALL require an existing OpenSpec structure before allowing updates.

#### Scenario: Checking prerequisites

- **GIVEN** the command requires an existing `openspec` directory (created by `openspec init`)
- **WHEN** the `openspec` directory does not exist
- **THEN** display error: "No OpenSpec directory found. Run 'openspec init' first."
- **AND** exit with code 1

### Requirement: File Handling
The update command SHALL handle file updates in a predictable and safe manner.

#### Scenario: Updating files
- **WHEN** updating files
- **THEN** completely replace `openspec/AGENTS.md` with the latest template
- **AND** if a root-level stub exists, update the managed block content so it keeps directing teammates to `@/openspec/AGENTS.md`

### Requirement: Tool-Agnostic Updates
The update command SHALL refresh OpenSpec-managed files in a predictable manner while respecting each team's chosen tooling.

#### Scenario: Updating files
- **WHEN** updating files
- **THEN** completely replace `openspec/AGENTS.md` with the latest template
- **AND** create or refresh the root-level `AGENTS.md` stub using the managed marker block, even if the file was previously absent
- **AND** update only the OpenSpec-managed sections inside existing AI tool files, leaving user-authored content untouched
- **AND** avoid creating new native-tool configuration files (slash commands, CLAUDE.md, etc.) unless they already exist

### Requirement: Core Files Always Updated
The update command SHALL always update the core OpenSpec files and display an ASCII-safe success message.

#### Scenario: Successful update
- **WHEN** the update completes successfully
- **THEN** replace `openspec/AGENTS.md` with the latest template
- **AND** if a root-level stub exists, refresh it so it still directs contributors to `@/openspec/AGENTS.md`

### Requirement: Slash Command Updates

The update command SHALL refresh existing slash command files for configured tools without creating new ones, and ensure the OpenCode archive command accepts change ID arguments.

#### Scenario: Updating slash commands for Antigravity
- **WHEN** `.agent/workflows/` contains `openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md`
- **THEN** refresh the OpenSpec-managed portion of each file so the workflow copy matches other tools while preserving the existing single-field `description` frontmatter
- **AND** skip creating any missing workflow files during update, mirroring the behavior for Devin Desktop and other IDEs

#### Scenario: Updating slash commands for Claude Code
- **WHEN** `.claude/commands/openspec/` contains `proposal.md`, `apply.md`, and `archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for CodeBuddy Code
- **WHEN** `.codebuddy/commands/openspec/` contains `proposal.md`, `apply.md`, and `archive.md`
- **THEN** refresh each file using the shared CodeBuddy templates that include YAML frontmatter for the `description` and `argument-hint` fields
- **AND** use square bracket format for `argument-hint` parameters (e.g., `[change-id]`)
- **AND** preserve any user customizations outside the OpenSpec managed markers

#### Scenario: Updating slash commands for Cline
- **WHEN** `.clinerules/workflows/` contains `openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates
- **AND** include Cline-specific Markdown heading frontmatter
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Continue
- **WHEN** `.continue/prompts/` contains `openspec-proposal.prompt`, `openspec-apply.prompt`, and `openspec-archive.prompt`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Crush
- **WHEN** `.crush/commands/` contains `openspec/proposal.md`, `openspec/apply.md`, and `openspec/archive.md`
- **THEN** refresh each file using shared templates
- **AND** include Crush-specific frontmatter with OpenSpec category and tags
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Cursor
- **WHEN** `.cursor/commands/` contains `openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Factory Droid
- **WHEN** `.factory/commands/` contains `openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md`
- **THEN** refresh each file using the shared Factory templates that include YAML frontmatter for the `description` and `argument-hint` fields
- **AND** ensure the template body retains the `$ARGUMENTS` placeholder so user input keeps flowing into droid
- **AND** update only the content inside the OpenSpec managed markers, leaving any unmanaged notes untouched
- **AND** skip creating missing files during update

#### Scenario: Updating slash commands for OpenCode
- **WHEN** `.opencode/commands/` contains OpenSpec-managed `opsx-*.md` command files for the configured profile (for example `opsx-propose.md`, `opsx-apply.md`, and `opsx-archive.md`)
- **THEN** refresh each file using shared templates
- **AND** transform command references to hyphen form (for example `/opsx-propose`), as for every tool whose command files are named `opsx-<id>`
- **AND** ensure templates include instructions for the relevant workflow stage
- **AND** ensure the archive command includes `$ARGUMENTS` placeholder in frontmatter for accepting change ID arguments

#### Scenario: Legacy OpenCode command path cleanup
- **WHEN** a project still has command files under the legacy singular path `.opencode/command/` (for example `opsx-*.md` or `openspec-*.md`)
- **THEN** `openspec init` or legacy cleanup SHALL remove those files and generate replacements under `.opencode/commands/`
- **AND** `openspec update` SHALL NOT refresh files that remain only under `.opencode/command/`

#### Scenario: Updating slash commands for Windsurf
- **WHEN** the legacy Windsurf location `.windsurf/workflows/`, now Devin's, contains `openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates wrapped in OpenSpec markers
- **AND** ensure templates include instructions for the relevant workflow stage
- **AND** skip creating missing files (the update command only refreshes what already exists)

#### Scenario: Updating workflows for Devin Desktop
- **WHEN** Devin Desktop is a configured tool (its `.devin/` directory exists)
- **THEN** write `.devin/workflows/opsx-<id>.md` for each workflow in the active profile, from shared templates
- **AND** emit frontmatter with `name`, `description`, `category`, and `tags`
- **AND** transform command references to hyphen form (for example `/opsx-propose`), the name Devin registers for a workflow file
- **AND** refresh `.devin/skills/openspec-*/SKILL.md` with `/openspec-*` skill references, the one invocation both Devin agents accept

#### Scenario: Updating slash commands for Kilo Code
- **WHEN** `.kilocode/workflows/` contains `openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates wrapped in OpenSpec markers
- **AND** ensure templates include instructions for the relevant workflow stage
- **AND** skip creating missing files (the update command only refreshes what already exists)

#### Scenario: Updating slash commands for Codex
- **GIVEN** the global Codex prompt directory contains `openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md`
- **WHEN** a user runs `openspec update`
- **THEN** refresh each file using the shared slash-command templates (including placeholder guidance)
- **AND** preserve any unmanaged content outside the OpenSpec marker block
- **AND** skip creation when a Codex prompt file is missing

#### Scenario: Updating slash commands for GitHub Copilot
- **WHEN** `.github/prompts/` contains `openspec-proposal.prompt.md`, `openspec-apply.prompt.md`, and `openspec-archive.prompt.md`
- **THEN** refresh each file using shared templates while preserving the YAML frontmatter
- **AND** update only the OpenSpec-managed block between markers
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Gemini CLI
- **WHEN** `.gemini/commands/openspec/` contains `proposal.toml`, `apply.toml`, and `archive.toml`
- **THEN** refresh the body of each file using the shared proposal/apply/archive templates
- **AND** replace only the content between `<!-- OPENSPEC:START -->` and `<!-- OPENSPEC:END -->` markers inside the `prompt = """` block so the TOML framing (`description`, `prompt`) stays intact
- **AND** skip creating any missing `.toml` files during update; only pre-existing Gemini commands are refreshed

#### Scenario: Updating slash commands for iFlow CLI
- **WHEN** `.iflow/commands/` contains `openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates
- **AND** preserve the YAML frontmatter with `name`, `id`, `category`, and `description` fields
- **AND** update only the OpenSpec-managed block between markers
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Missing slash command file
- **WHEN** a tool lacks a slash command file
- **THEN** do not create a new file during update

#### Scenario: Codex prompt files are not refreshed
- **GIVEN** the global Codex prompt directory contains OpenSpec-managed Codex prompt files
- **WHEN** a user runs `openspec update`
- **THEN** the command SHALL NOT refresh Codex prompt files
- **AND** it SHALL treat those files as legacy cleanup candidates
- **AND** it SHALL preserve unmanaged files by deleting only exact allowlisted OpenSpec-owned filenames under the resolved global Codex prompt directory after replacement skills exist

### Requirement: Archive Command Argument Support
The archive slash command template SHALL support optional change ID arguments for tools that support `$ARGUMENTS` placeholder.

#### Scenario: Archive command with change ID argument
- **WHEN** a user invokes `/openspec:archive <change-id>` with a change ID
- **THEN** the template SHALL instruct the AI to validate the provided change ID against `openspec list`
- **AND** use the provided change ID for archiving if valid
- **AND** fail fast if the provided change ID doesn't match an archivable change

#### Scenario: Archive command without argument (backward compatibility)
- **WHEN** a user invokes `/openspec:archive` without providing a change ID
- **THEN** the template SHALL instruct the AI to identify the change ID from context or by running `openspec list`
- **AND** proceed with the existing behavior (maintaining backward compatibility)

#### Scenario: OpenCode archive template generation
- **WHEN** generating the OpenCode archive slash command file
- **THEN** include the `$ARGUMENTS` placeholder in the frontmatter
- **AND** wrap it in a clear structure like `<ChangeId>\n  $ARGUMENTS\n</ChangeId>` to indicate the expected argument
- **AND** include validation steps in the template body to check if the change ID is valid

### Requirement: Update respects global profile config
The update command SHALL read global config and apply profile settings to the project.

#### Scenario: Update adds missing workflows from config
- **WHEN** user runs `openspec update`
- **AND** global config specifies workflows not currently installed in the project
- **THEN** the system SHALL generate skill/command files for missing workflows
- **THEN** the system SHALL display: "Added: <workflow-names>"

#### Scenario: Update refreshes existing workflows
- **WHEN** user runs `openspec update`
- **AND** workflows are already installed in the project
- **THEN** the system SHALL refresh those workflow files with latest templates
- **THEN** the system SHALL display: "Updated: <workflow-names>"

#### Scenario: Update with no changes needed
- **WHEN** user runs `openspec update`
- **AND** installed workflows match global config
- **AND** all templates are current
- **AND** delivery setting matches installed files
- **THEN** the system SHALL display: "Already up to date."

#### Scenario: Profile or delivery drift with current templates
- **WHEN** user runs `openspec update`
- **AND** workflow templates are current for the installed skills
- **AND** project files do not match current profile and/or delivery config
- **THEN** the system SHALL treat this as an update-required state (not "Already up to date.")
- **THEN** the system SHALL add/remove files to match current profile and delivery settings

#### Scenario: Update summary output
- **WHEN** update completes with changes
- **THEN** the system SHALL display a summary:
  - "Added: propose, explore" (new workflows installed)
  - "Updated: apply, archive" (existing workflows refreshed)
  - "Removed: 4 command files" (if delivery changed)
- **THEN** the system SHALL list affected tools: "Tools: Claude Code, Cursor"

### Requirement: Update respects delivery setting
The update command SHALL add or remove files based on the delivery setting.

#### Scenario: Delivery changed to skills-only
- **WHEN** user runs `openspec update`
- **AND** global config specifies `delivery: skills`
- **AND** project has command files installed
- **THEN** the system SHALL delete command files for workflows in the profile
- **THEN** the system SHALL generate/update skill files only
- **THEN** the system SHALL display: "Removed: <count> command files (delivery: skills)"

#### Scenario: Delivery changed to commands-only
- **WHEN** user runs `openspec update`
- **AND** global config specifies `delivery: commands`
- **AND** project has skill files installed
- **THEN** the system SHALL delete skill directories for workflows in the profile
- **THEN** the system SHALL generate/update command files only
- **THEN** the system SHALL display: "Removed: <count> skill directories (delivery: commands)"

#### Scenario: Delivery is both
- **WHEN** user runs `openspec update`
- **AND** global config specifies `delivery: both`
- **THEN** the system SHALL generate/update both skill and command files

### Requirement: Update detects configured tools from skills or commands
The update command SHALL treat a tool as configured if it has either generated skill files or generated command files.

#### Scenario: Commands-only installation
- **WHEN** user runs `openspec update`
- **AND** a tool has generated OpenSpec command files
- **AND** that tool has no OpenSpec skill files (commands-only delivery)
- **THEN** the tool SHALL still be treated as configured
- **THEN** the system SHALL apply profile and delivery sync for that tool

### Requirement: One-time migration for existing users
The update command SHALL detect existing users (no `profile` in global config + existing workflows) and migrate them to `custom` profile before applying updates.

#### Scenario: First update after upgrade (existing user)
- **WHEN** user runs `openspec update`
- **AND** global config does not contain a `profile` field
- **AND** project has existing workflow files installed
- **THEN** the system SHALL scan installed workflows across all tool directories in the project
- **THEN** the system SHALL only match workflow names present in `ALL_WORKFLOWS` constant (ignoring user-created custom skills)
- **THEN** the system SHALL take the union of detected workflow names across all tools
- **THEN** the system SHALL write to global config: `profile: "custom"`, `delivery: "both"`, `workflows: [<detected>]`
- **THEN** the system SHALL display: "Migrated: custom profile with <count> workflows (<workflow-names>)"
- **THEN** the system SHALL display: "New in this version: /opsx:propose (combines new + ff). Try 'openspec config profile core' for the streamlined 4-workflow experience."
- **THEN** the system SHALL proceed with normal update logic (using the migrated config)
- **THEN** the result SHALL be template refresh only (no workflows added or removed)

#### Scenario: Migration with partial workflows (user manually removed some)
- **WHEN** user runs `openspec update`
- **AND** global config does not contain a `profile` field
- **AND** project has fewer than the original 10 workflows installed
- **THEN** the system SHALL migrate with only the workflows that are actually present
- **THEN** the migrated `workflows` array SHALL reflect the user's current state, not the original set

#### Scenario: Migration with multiple tools having different workflow sets
- **WHEN** user runs `openspec update`
- **AND** project has multiple tools configured (e.g., Claude Code, Cursor)
- **AND** different tools have different workflows installed
- **THEN** the system SHALL take the union of all detected workflows across all tools
- **THEN** the migrated `workflows` array SHALL include any workflow that exists in at least one tool

#### Scenario: No migration needed (profile already set)
- **WHEN** user runs `openspec update`
- **AND** global config already contains a `profile` field
- **THEN** the system SHALL NOT perform migration
- **THEN** the system SHALL proceed with normal update logic using existing config

#### Scenario: No migration needed (no existing workflows)
- **WHEN** user runs `openspec update`
- **AND** global config does not contain a `profile` field
- **AND** project has no existing workflow files
- **THEN** the system SHALL NOT perform migration
- **THEN** the system SHALL use `core` profile defaults

#### Scenario: Migration is idempotent
- **WHEN** user runs `openspec update` multiple times
- **THEN** migration SHALL only occur on the first run (when `profile` field is absent)
- **THEN** subsequent runs SHALL use the existing global config without re-scanning

#### Scenario: Non-interactive migration
- **WHEN** user runs `openspec update` non-interactively (e.g., in CI)
- **AND** migration is triggered
- **THEN** the system SHALL perform migration without prompting
- **THEN** the system SHALL display the migration summary to stdout

### Requirement: Update detects new tool directories
The update command SHALL notify the user if new AI tool directories are detected that aren't currently configured.

#### Scenario: New tool directory detected
- **WHEN** user runs `openspec update`
- **AND** a new tool directory is detected (e.g., `.windsurf/` exists but Windsurf is not configured)
- **THEN** the system SHALL display: "Detected new tool: Windsurf. Run 'openspec init' to add it."
- **THEN** the system SHALL NOT automatically add the new tool
- **THEN** the system SHALL proceed with update for currently configured tools only

#### Scenario: Multiple new tool directories detected
- **WHEN** user runs `openspec update`
- **AND** multiple new tool directories are detected (e.g., `.github/` and `.windsurf/` exist but neither tool is configured)
- **THEN** the system SHALL display one consolidated message listing all detected tools, for example: "Detected new tools: GitHub Copilot, Windsurf. Run 'openspec init' to add them."
- **THEN** the system SHALL NOT automatically add any new tools
- **THEN** the system SHALL proceed with update for currently configured tools only

#### Scenario: No new tool directories
- **WHEN** user runs `openspec update`
- **AND** no new tool directories are detected
- **THEN** the system SHALL NOT display any tool detection message

### Requirement: Update requires an OpenSpec project
The update command SHALL only run inside an initialized OpenSpec project.

#### Scenario: Update outside a project
- **WHEN** user runs `openspec update`
- **AND** no `openspec/` directory exists in the current working directory
- **THEN** the system SHALL display: "No OpenSpec project found. Run 'openspec init' to set up."
- **THEN** the system SHALL exit with code 1

### Requirement: Extra workflows synchronized to active profile
The update command SHALL remove workflow files that are no longer selected in the current profile.

#### Scenario: Deselected workflows from previous profile
- **WHEN** user runs `openspec update`
- **AND** project has workflows not in current profile (e.g., user switched from custom to core or deselected workflows via `openspec config profile`)
- **THEN** the system SHALL delete skill and command workflow files for deselected workflows (respecting active delivery mode)
- **THEN** the system SHALL keep only workflows currently selected in profile

#### Scenario: Delivery change with extra workflows
- **WHEN** user runs `openspec update`
- **AND** delivery changed (e.g., `both` → `skills`)
- **AND** project has extra workflows not in current profile
- **THEN** the system SHALL delete files for extra workflows that match the removed delivery type
- **THEN** for example: if switching to `skills`, all command files are deleted (including for extra workflows)

### Requirement: Oh My Pi tool supported in update
The `openspec update` command SHALL refresh Oh My Pi skill files and command files when Oh My Pi is configured, using Oh My Pi's hyphen-based command reference convention.

#### Scenario: Updating Oh My Pi skill files
- **WHEN** `openspec update` runs and Oh My Pi is a configured tool
- **THEN** skill files in `.omp/skills/openspec-<id>/SKILL.md` are refreshed with the latest templates
- **AND** skill file bodies use hyphen-based `/opsx-<id>` command references

#### Scenario: Updating Oh My Pi command files
- **WHEN** `openspec update` runs and Oh My Pi is a configured tool
- **THEN** command files are written to `.omp/commands/opsx-<id>.md` for each workflow in the active profile, creating them if they do not yet exist and overwriting them if they do

### Requirement: Codex update uses the skills-invocable command surface
`openspec update` SHALL treat Codex as a skills-invocable tool, not as an adapter-backed command-file tool.

#### Scenario: Codex command surface resolution
- **WHEN** `openspec update` detects Codex as a configured tool
- **THEN** the command SHALL resolve Codex command surface capability as `skills-invocable`
- **AND** it SHALL apply delivery behavior through the shared command-surface capability model when that model is available
- **AND** it SHALL NOT use a Codex-specific delivery predicate that duplicates command-surface capability rules

### Requirement: Codex update uses skills only
`openspec update` SHALL refresh Codex through generated OpenSpec skills without generating or refreshing Codex custom prompt files.

#### Scenario: Legacy Codex prompt migration infers workflows from the legacy filenames
- **WHEN** `openspec update` upgrades an unconfigured Codex tool from detected exact allowlisted global legacy Codex prompt files
- **THEN** it SHALL infer the replacement workflow IDs from the detected prompt filenames where possible
- **AND** it SHALL use that inferred workflow subset for the replacement Codex skills instead of expanding to the current profile's full workflow set

#### Scenario: Updating Codex with default delivery
- **WHEN** a project has Codex OpenSpec skills configured
- **AND** the active delivery mode is `both`
- **THEN** `openspec update` SHALL refresh the selected Codex skill files under `.codex/skills/`
- **AND** it SHALL NOT create or refresh Codex prompt files under `$CODEX_HOME/prompts` or the default Codex prompt directory

#### Scenario: Updating Codex with commands delivery
- **WHEN** a project has Codex configured
- **AND** the active delivery mode is `commands`
- **THEN** `openspec update` SHALL keep Codex usable by refreshing selected Codex skills
- **AND** it SHALL skip Codex command-file generation because Codex is skills-invocable
- **AND** it SHALL NOT remove Codex skills solely because the global delivery mode is `commands`

#### Scenario: Updating Codex with skills delivery
- **WHEN** a project has Codex configured
- **AND** the active delivery mode is `skills`
- **THEN** `openspec update` SHALL refresh selected Codex skills
- **AND** it SHALL treat OpenSpec-managed Codex prompt files as legacy cleanup candidates
- **AND** it SHALL NOT delete global Codex prompt files through ordinary delivery reconciliation without accepted or forced cleanup

### Requirement: Codex update cleanup removes managed legacy prompts
`openspec update` SHALL clean up previously managed Codex prompt files from the resolved global Codex prompt directory only after replacement Codex skills exist.

#### Scenario: Forced update cleanup removes Codex prompts
- **WHEN** a user runs `openspec update --force`
- **AND** the resolved Codex prompt directory contains exact allowlisted managed global Codex prompt files
- **AND** replacement Codex skills exist for the workflows represented by those prompt filenames
- **THEN** the command SHALL remove those managed Codex prompt files
- **AND** it SHALL leave non-OpenSpec Codex prompt files unchanged

#### Scenario: Configured Codex cleanup completes after skills refresh
- **WHEN** an approved or forced update detects an allowlisted global Codex prompt whose configured project is missing the replacement skill
- **AND** the configured-tool update installs that replacement skill, including under `delivery=commands`
- **THEN** the command SHALL perform deferred global prompt cleanup after the configured-tool update loop
- **AND** it SHALL remove the replaced prompt in the same update run

#### Scenario: Interactive update cleanup includes Codex prompts
- **WHEN** a user runs `openspec update` interactively
- **THEN** the preview SHALL list immediate repo-local removals separately from deferred global prompts cleanup
- **AND** the deferred section SHALL list the concrete global prompt paths before the user confirms cleanup
- **AND** managed Codex prompt files are detected
- **THEN** the cleanup prompt SHALL include those files in the cleanup plan
- **AND** accepting cleanup SHALL remove only the prompt files whose replacement Codex skills exist

#### Scenario: Non-interactive update without force does not delete prompts
- **WHEN** a user runs `openspec update` without interaction and without `--force`
- **AND** managed Codex prompt files are detected
- **THEN** the command SHALL warn that legacy cleanup requires `--force` or an interactive run
- **AND** it SHALL NOT delete Codex prompt files

### Requirement: Delivery sync by command surface capability
The update command SHALL synchronize artifacts using each configured tool's command surface capability.

#### Scenario: Commands delivery for adapter-backed configured tool
- **WHEN** user runs `openspec update`
- **AND** delivery is set to `commands`
- **AND** a configured tool has an adapter-backed command surface
- **THEN** the system SHALL generate or refresh command files for active workflows
- **AND** the system SHALL remove managed skill directories for that tool

#### Scenario: Commands delivery for skills-invocable configured tool
- **WHEN** user runs `openspec update`
- **AND** delivery is set to `commands`
- **AND** a configured tool has `skills-invocable` command surface capability
- **THEN** the system SHALL generate or refresh managed skill directories for active workflows
- **AND** the system SHALL NOT remove those managed skill directories as part of commands-only cleanup
- **AND** the system SHALL NOT attempt to require adapter-generated command files for that tool

#### Scenario: Commands delivery with unsupported command surface
- **WHEN** user runs `openspec update`
- **AND** delivery is set to `commands`
- **AND** a configured tool has no command surface capability
- **THEN** the system SHALL fail with exit code 1 before applying partial updates
- **AND** the output SHALL identify incompatible tools and recommended remediation

### Requirement: Configured-tool detection for skills-invocable command surfaces
The update command SHALL treat tools with skills-invocable command surfaces as configured when managed skill artifacts are present, including under commands delivery.

#### Scenario: Skills-invocable tool under commands delivery
- **WHEN** user runs `openspec update`
- **AND** delivery is set to `commands`
- **AND** a tool has no adapter-generated command files
- **AND** that tool is marked `skills-invocable` and has managed skills installed
- **THEN** the system SHALL include the tool in configured-tool detection
- **AND** the system SHALL apply normal version/profile/delivery sync to that tool

### Requirement: Update summary reflects effective per-tool delivery
The update command SHALL report effective artifact behavior when delivery intent and artifact type differ due to tool capability.

#### Scenario: Summary for skills-invocable tools in commands delivery
- **WHEN** update completes successfully
- **AND** delivery is `commands`
- **AND** at least one updated tool is `skills-invocable`
- **THEN** output SHALL include a clear note that those tools use skills as their command surface
- **AND** output SHALL avoid implying that command generation was skipped due to an error

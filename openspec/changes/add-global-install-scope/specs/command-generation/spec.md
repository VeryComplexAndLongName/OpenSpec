## MODIFIED Requirements

### Requirement: ToolCommandAdapter interface
The system SHALL provide install-context-aware command path resolution.

#### Scenario: Adapter interface structure
- **WHEN** implementing a tool adapter
- **THEN** `ToolCommandAdapter` SHALL retain `toolId` matching `AIToolOption.value` and `formatFile(content: CommandContent)` returning complete file content with frontmatter
- **AND** command file path resolution SHALL receive the command ID and install context (including effective scope and environment context)
- **AND** SHALL return the effective command output path for that context

#### Scenario: Codex global path remains supported
- **WHEN** resolving Codex command paths in global scope
- **THEN** the adapter SHALL target `$CODEX_HOME/prompts` when `CODEX_HOME` is set
- **AND** SHALL otherwise target `~/.codex/prompts`

#### Scenario: Claude adapter formatting

- **WHEN** formatting a command for Claude Code
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.claude/commands/opsx/<id>.md`

#### Scenario: Cursor adapter formatting

- **WHEN** formatting a command for Cursor
- **THEN** the adapter SHALL output YAML frontmatter with `name` as `/opsx-<id>`, `id`, `category`, `description` fields
- **AND** file path SHALL follow pattern `.cursor/commands/opsx-<id>.md`

#### Scenario: Windsurf adapter formatting

- **GIVEN** RETIRED — Windsurf was rebranded to Devin Desktop and its config directory moved
- **WHEN** looking for a Windsurf adapter
- **THEN** none SHALL be registered — it is replaced by the Devin adapter below, not kept alongside a second adapter for the same product

#### Scenario: Devin Desktop adapter formatting

- **WHEN** formatting a command for Devin Desktop
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.devin/workflows/opsx-<id>.md`

#### Scenario: Trae adapter formatting

- **WHEN** formatting a command for Trae
- **THEN** the adapter SHALL output YAML frontmatter with `name` and `description` fields
- **AND** file path SHALL follow pattern `.trae/commands/opsx-<id>.md`

#### Scenario: OpenCode adapter formatting

- **WHEN** formatting a command for OpenCode
- **THEN** the adapter SHALL output YAML frontmatter with `description` field
- **AND** file path SHALL follow pattern `.opencode/commands/opsx-<id>.md` using `path.join('.opencode', 'commands', ...)` for cross-platform compatibility
- **AND** the adapter SHALL transform colon-based command references (`/opsx:name`) to hyphen-based (`/opsx-name`) in the body

### Requirement: Command generator function
The command generator SHALL pass install context into adapter path resolution for all generated commands.

#### Scenario: Scoped command generation
- **WHEN** generating commands for a tool with a resolved effective scope
- **THEN** generated command paths SHALL match that effective scope
- **AND** the formatted command body/frontmatter behavior SHALL remain tool-specific and unchanged

#### Scenario: Generate command file

- **WHEN** calling `generateCommand(content, adapter)`
- **THEN** it SHALL return an object with:
  - `path`: the file path from `adapter.getFilePath(content.id)`
  - `fileContent`: the formatted content from `adapter.formatFile(content)`

#### Scenario: Command references match the name the tool registers

- **WHEN** the adapter's file path names the command by filename (`opsx-<id>`)
- **THEN** `generateCommand` SHALL rewrite `/opsx:<id>` references in the body to `/opsx-<id>` before formatting
- **WHEN** the adapter's file path does not name the command by filename (for example it namespaces the command under an `opsx/` directory)
- **THEN** the body's `/opsx:<id>` references SHALL be left unchanged

#### Scenario: Command references use the tool's own invocation prefix

- **WHEN** an adapter declares an `invocationPrefix` because its files are not invoked with a slash (Amazon Q loads `.amazonq/prompts/opsx-<id>.md` into a prompt library invoked with `@`)
- **THEN** `generateCommand` SHALL rewrite `/opsx:<id>` references in the body to `<prefix>opsx-<id>` — for Amazon Q, `@opsx-<id>` — replacing the leading slash rather than adding to it
- **AND** generated skills and the `init`/`update` "Getting started" hint SHALL use the same form
- **WHEN** an adapter declares no `invocationPrefix`
- **THEN** the prefix SHALL default to `/`

#### Scenario: Generate multiple commands

- **WHEN** generating all opsx commands for a tool
- **THEN** the system SHALL iterate over command contents and generate each using the tool's adapter

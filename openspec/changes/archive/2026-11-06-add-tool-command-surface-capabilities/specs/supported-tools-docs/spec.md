## Purpose
Explain supported tool integrations, their command surfaces and delivery behavior so users can select usable workflow artifacts and resolve incompatible configurations.

## ADDED Requirements

### Requirement: Command surface delivery guidance
Supported tools documentation SHALL explain adapter, skills-invocable and none semantics, the delivery matrix, and remediation for incompatible commands-only selection.

#### Scenario: Commands-only selection with invocable skills
- **WHEN** a user reads delivery guidance for ForgeCode, Kimi Code or Mistral Vibe
- **THEN** it SHALL state that commands delivery retains their managed skills
- **AND** it SHALL explain that tools resolving to none require delivery both or skills

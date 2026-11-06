## Context

The two names select the same standard workflow. Existing projects and custom
schema overrides must retain their behavior. This adds no user-configurable
alias registry and keeps the physical schemas/spec-driven directory.

## Decisions

Resolve the two fixed names together within each existing precedence tier:
project before user before package. In a tier containing both directories,
openspec-default wins for both names. An invalid selected definition fails;
it is not silently replaced by a lower-precedence valid schema. Other schema
names and path-boundary checks are unchanged.

Discovery advertises both accepted names using the effective definition and
source. New defaults use a shared openspec-default constant; explicit legacy
project configuration and existing metadata are not rewritten. Built-in task
validation recognizes both names and still checks the resolved physical root
so a custom override is never mistaken for the package schema.

Rejected: renaming the built-in directory (unnecessary migration), duplicating
schema files (drift), and a configurable alias framework (outside scope).

## Risks / Trade-offs

New default metadata/output names intentionally change; legacy explicit names
continue to work. Native path joins and real override fixtures exercise Windows
paths with spaces. The equal-priority two-directory rule is deterministic and
documented to avoid selecting different definitions for the two spellings.

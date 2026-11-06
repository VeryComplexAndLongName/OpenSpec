# Standard workflow schema names

Use `openspec-default` for the standard workflow. The existing name
`spec-driven` resolves the same schema, templates, artifacts and apply rules.
New default selections and generated configs/metadata use `openspec-default`.
Existing configs with `schema: spec-driven` are preserved and remain valid.

For example, both `openspec templates --schema openspec-default` and
`openspec templates --schema spec-driven` select the same workflow.

Both spellings use the existing resolution precedence: project-local schemas,
then user overrides, then the packaged schema. Within each tier OpenSpec checks
`openspec-default` before `spec-driven` for either spelling. Thus an existing
project override under `openspec/schemas/spec-driven` still applies to both
names even when a user-level preferred-name override exists. If a tier contains
both directories, its preferred-name definition wins for both names. An invalid
effective definition is reported, rather than silently using a lower tier.

The packaged physical directory remains `schemas/spec-driven`. There is no
directory migration and no duplicate set of standard templates. Discovery lists
both accepted names with the same effective metadata/source. Unrelated custom
schema names retain their existing resolution and validation behavior. This is
a fixed compatibility alias, not a configurable alias framework.

Native Windows paths, including spaces, use the same selection rules as macOS
and Linux. Existing path-boundary checks and custom-schema trust boundaries
continue to apply.

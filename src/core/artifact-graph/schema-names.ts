/** The preferred standard workflow name and its backward-compatible spelling. */
export const DEFAULT_SCHEMA = 'openspec-default';
export const LEGACY_DEFAULT_SCHEMA = 'spec-driven';

export function isDefaultSchemaName(name: string): boolean {
  return name === DEFAULT_SCHEMA || name === LEGACY_DEFAULT_SCHEMA;
}

/** Resolve both spellings identically within each existing precedence tier. */
export function schemaLookupNames(name: string): readonly string[] {
  return isDefaultSchemaName(name) ? [DEFAULT_SCHEMA, LEGACY_DEFAULT_SCHEMA] : [name];
}

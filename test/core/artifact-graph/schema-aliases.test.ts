import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { parse } from 'yaml';
import { getSchemaDir, getPackageSchemasDir, listSchemas, listSchemasWithInfo, resolveSchema } from '../../../src/core/artifact-graph/resolver.js';
import { DEFAULT_SCHEMA, LEGACY_DEFAULT_SCHEMA } from '../../../src/core/artifact-graph/schema-names.js';
import { createChange } from '../../../src/utils/change-utils.js';
import { Validator } from '../../../src/core/validation/validator.js';

describe('standard workflow aliases', () => {
  let root: string;
  let previousDataHome: string | undefined;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec aliases with spaces '));
    previousDataHome = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = path.join(root, 'user data');
  });
  afterEach(() => {
    if (previousDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = previousDataHome;
    fs.rmSync(root, { recursive: true, force: true });
  });
  function definition(parent: string, spelling: string, name: string): string {
    const dir = path.join(parent, spelling);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'schema.yaml'), `name: ${name}\nversion: 1\ndescription: ${name}\nartifacts:\n  - id: proposal\n    generates: proposal.md\n    description: Test proposal\n    template: proposal.md\n    instruction: Write a proposal\n    requires: []\n`);
    return dir;
  }
  const names = [DEFAULT_SCHEMA, LEGACY_DEFAULT_SCHEMA];

  it('resolves both spellings to the existing packaged definition and templates', () => {
    for (const name of names) expect(getSchemaDir(name)).toBe(path.join(getPackageSchemasDir(), 'spec-driven'));
    expect(resolveSchema(DEFAULT_SCHEMA)).toEqual(resolveSchema(LEGACY_DEFAULT_SCHEMA));
  });
  it('retains project precedence even when the user has the preferred spelling', () => {
    definition(path.join(process.env.XDG_DATA_HOME!, 'openspec', 'schemas'), DEFAULT_SCHEMA, 'user-definition');
    const projectDir = definition(path.join(root, 'openspec', 'schemas'), LEGACY_DEFAULT_SCHEMA, 'project-definition');
    for (const name of names) {
      expect(getSchemaDir(name, root)).toBe(projectDir);
      expect(resolveSchema(name, root).name).toBe('project-definition');
    }
  });
  it('selects the preferred directory for both spellings when a tier contains both', () => {
    definition(path.join(root, 'openspec', 'schemas'), LEGACY_DEFAULT_SCHEMA, 'old-definition');
    const preferred = definition(path.join(root, 'openspec', 'schemas'), DEFAULT_SCHEMA, 'preferred-definition');
    for (const name of names) expect(getSchemaDir(name, root)).toBe(preferred);
  });
  it.each(names)('uses a user override named %s for both spellings', spelling => {
    const dir = definition(path.join(process.env.XDG_DATA_HOME!, 'openspec', 'schemas'), spelling, 'user-definition');
    for (const name of names) expect(getSchemaDir(name, root)).toBe(dir);
  });
  it('advertises equal metadata and source for both accepted names', () => {
    definition(path.join(root, 'openspec', 'schemas'), LEGACY_DEFAULT_SCHEMA, 'project-definition');
    const available = listSchemas(root);
    for (const name of names) expect(available).toContain(name);
    const info = listSchemasWithInfo(root).filter(s => names.includes(s.name));
    expect(info).toHaveLength(2);
    for (const item of info) expect(item).toMatchObject({ description: 'project-definition', source: 'project', artifacts: ['proposal'] });
  });
  it('reports an invalid effective alias definition rather than silently falling back', () => {
    definition(path.join(root, 'openspec', 'schemas'), LEGACY_DEFAULT_SCHEMA, 'valid-legacy');
    const preferred = definition(path.join(root, 'openspec', 'schemas'), DEFAULT_SCHEMA, 'preferred');
    fs.writeFileSync(path.join(preferred, 'schema.yaml'), 'not: a-valid-schema\n');
    for (const name of names) expect(() => resolveSchema(name, root)).toThrow('Invalid schema');
    expect(listSchemasWithInfo(root).filter(s => names.includes(s.name))).toEqual([]);
  });
  it('leaves unrelated custom names and path-boundary rejection unchanged', () => {
    const dir = definition(path.join(root, 'openspec', 'schemas'), 'my-workflow', 'my-workflow');
    expect(getSchemaDir('my-workflow', root)).toBe(dir);
    expect(getSchemaDir('../spec-driven', root)).toBeNull();
    expect(getSchemaDir('..\\openspec-default', root)).toBeNull();
  });
  it('preserves an existing explicit legacy configuration during change creation', async () => {
    fs.mkdirSync(path.join(root, 'openspec'));
    const config = path.join(root, 'openspec', 'config.yaml');
    const original = 'schema: spec-driven\ncontext: Existing project context\n';
    fs.writeFileSync(config, original);
    const result = await createChange(root, 'legacy-project-change');
    expect(result.schema).toBe(LEGACY_DEFAULT_SCHEMA);
    expect(fs.readFileSync(config, 'utf8')).toBe(original);
    const metadata = parse(fs.readFileSync(path.join(root, 'openspec', 'changes', 'legacy-project-change', '.openspec.yaml'), 'utf8'));
    expect(metadata.schema).toBe(LEGACY_DEFAULT_SCHEMA);
  });
  it('uses the preferred name for new default change metadata', async () => {
    const result = await createChange(root, 'new-default-change');
    expect(result.schema).toBe(DEFAULT_SCHEMA);
    const metadata = parse(fs.readFileSync(path.join(root, 'openspec', 'changes', 'new-default-change', '.openspec.yaml'), 'utf8'));
    expect(metadata.schema).toBe(DEFAULT_SCHEMA);
  });
  it.each(names)('retains built-in task-number validation under %s', async name => {
    const change = path.join(root, 'openspec', 'changes', 'bad-numbering');
    fs.mkdirSync(change, { recursive: true });
    fs.writeFileSync(path.join(change, '.openspec.yaml'), `schema: ${name}\nskip_specs: true\n`);
    fs.writeFileSync(path.join(change, 'tasks.md'), '## 1. Implementation\n- [ ] 2.1 Wrong group\n');
    const result = await new Validator(true).validateChangeDeltaSpecs(change, { projectRoot: root });
    expect(result.issues.some(issue => issue.path === 'tasks.md' && issue.message.includes('2.1'))).toBe(true);
  });
  it('does not apply built-in numbering to an override using the preferred name', async () => {
    definition(path.join(root, 'openspec', 'schemas'), DEFAULT_SCHEMA, 'custom-override');
    const change = path.join(root, 'openspec', 'changes', 'custom-numbering');
    fs.mkdirSync(change, { recursive: true });
    fs.writeFileSync(path.join(change, '.openspec.yaml'), `schema: ${LEGACY_DEFAULT_SCHEMA}\nskip_specs: true\n`);
    fs.writeFileSync(path.join(change, 'tasks.md'), '## 1. Implementation\n- [ ] 2.1 Custom numbering\n');
    const result = await new Validator(true).validateChangeDeltaSpecs(change, { projectRoot: root });
    expect(result.issues.some(issue => issue.path === 'tasks.md' && issue.message.includes('2.1'))).toBe(false);
  });
});

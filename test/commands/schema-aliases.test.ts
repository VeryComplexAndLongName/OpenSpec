import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCLI } from '../helpers/run-cli.js';

describe('standard schema aliases through the CLI', () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec aliases CLI with spaces '));
    const change = path.join(root, 'openspec', 'changes', 'alias-check');
    await fs.mkdir(change, { recursive: true });
    await fs.writeFile(path.join(change, 'proposal.md'), '## Why\nAn alias acceptance fixture.\n');
    await fs.writeFile(path.join(change, 'tasks.md'), '## 1. Work\n- [ ] 1.1 Check aliases\n');
  });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

  it.each([
    ['templates', '--json'],
    ['status', '--change', 'alias-check', '--json'],
    ['instructions', 'proposal', '--change', 'alias-check', '--json'],
    ['instructions', 'apply', '--change', 'alias-check', '--json'],
  ])('resolves equal workflow content for %j', async (...args) => {
    const results = [];
    for (const name of ['openspec-default', 'spec-driven']) {
      const result = await runCLI([...args, '--schema', name], { cwd: root });
      expect(result.exitCode, result.stderr).toBe(0);
      const json = JSON.parse(result.stdout);
      if ('schemaName' in json) {
        expect(json.schemaName).toBe(name);
        delete json.schemaName;
      }
      results.push(json);
    }
    expect(results[0]).toEqual(results[1]);
  }, 30000);
});

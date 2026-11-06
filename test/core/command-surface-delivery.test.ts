import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { InitCommand } from '../../src/core/init.js';
import { UpdateCommand } from '../../src/core/update.js';
import { saveGlobalConfig } from '../../src/core/global-config.js';
import type { Delivery } from '../../src/core/global-config.js';

describe('capability-aware init/update delivery', () => {
  let root: string;
  let project: string;
  let originalEnv: NodeJS.ProcessEnv;
  beforeEach(async () => {
    originalEnv = { ...process.env };
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec command surfaces with spaces '));
    project = path.join(root, 'project');
    await fs.mkdir(project);
    for (const variable of ['HOME','USERPROFILE','CODEX_HOME','XDG_CONFIG_HOME','XDG_DATA_HOME']) process.env[variable] = path.join(root, variable);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(async () => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });
  async function inventory(directory = project): Promise<Record<string,string>> {
    const result: Record<string,string> = {};
    async function scan(dir: string): Promise<void> {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) await scan(file);
        else result[path.relative(directory,file)] = createHash('sha256').update(await fs.readFile(file)).digest('hex');
      }
    }
    await scan(directory);
    return result;
  }
  function configure(delivery: Delivery) { saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery }); }
  it.each(['both','skills','commands'] as const)('keeps mixed tool delivery stable under %s', async delivery => {
    configure('both');
    await new InitCommand({ tools: 'claude,kimi,forgecode,vibe', interactive: false }).execute(project);
    configure(delivery);
    await new UpdateCommand({ force: true }).execute(project);
    for (const rootDir of ['.kimi-code','.forge','.vibe']) {
      expect(await fs.readFile(path.join(project,rootDir,'skills','openspec-propose','SKILL.md'),'utf8')).toContain('openspec-propose');
    }
    const files = await inventory();
    const claudeSkills = Object.keys(files).some(file => file.includes(path.join('.claude','skills')));
    const claudeCommands = Object.keys(files).some(file => file.includes(path.join('.claude','commands')));
    expect(claudeSkills).toBe(delivery !== 'commands');
    expect(claudeCommands).toBe(delivery !== 'skills');
    vi.mocked(console.log).mockClear();
    await new UpdateCommand().execute(project);
    expect(await inventory()).toEqual(files);
    expect(vi.mocked(console.log).mock.calls.flat().join('\n')).toContain('up to date');
  }, 60000);
  it.each(['kimi','forgecode','vibe'])('initializes %s directly in commands delivery', async tool => {
    configure('commands');
    await new InitCommand({ tools: tool, interactive: false }).execute(project);
    const files = Object.keys(await inventory());
    expect(files.filter(file => file.endsWith('SKILL.md'))).toHaveLength(6);
    expect(vi.mocked(console.log).mock.calls.flat().join('\n')).not.toContain('no adapter');
  }, 30000);
  it('rejects unsupported init before creating or migrating any file', async () => {
    configure('commands');
    await fs.writeFile(path.join(project,'AGENTS.md'),'<!-- OPENSPEC:START -->\nLegacy instructions\n<!-- OPENSPEC:END -->\n');
    const before = await inventory(root);
    await expect(new InitCommand({ tools: 'claude,hermes', force: true, interactive: false }).execute(project))
      .rejects.toThrow('unsupported for tools: hermes');
    expect(await inventory(root)).toEqual(before);
  });
  it('rejects unsupported update before altering any configured tool or global config', async () => {
    configure('both');
    await new InitCommand({ tools: 'claude,hermes', interactive: false }).execute(project);
    configure('commands');
    const before = await inventory(root);
    await expect(new UpdateCommand({ force: true }).execute(project)).rejects.toThrow('unsupported for tools: hermes');
    expect(await inventory(root)).toEqual(before);
  }, 30000);
});

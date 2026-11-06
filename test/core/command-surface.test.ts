import { describe, expect, it } from 'vitest';
import { AI_TOOLS } from '../../src/core/config.js';
import { assertCommandSurfaceCompatibility, resolveCommandSurfaceCapability, shouldGenerateCommandsForTool, shouldGenerateSkillsForTool, shouldRemoveSkillsForTool } from '../../src/core/command-surface.js';

describe('command surface capabilities', () => {
  it('uses explicit metadata before registered adapter inference', () => {
    const claude = AI_TOOLS.find(tool => tool.value === 'claude')!;
    const original = claude.commandSurface;
    try {
      claude.commandSurface = 'none';
      expect(resolveCommandSurfaceCapability('claude')).toBe('none');
      claude.commandSurface = 'skills-invocable';
      expect(resolveCommandSurfaceCapability('claude')).toBe('skills-invocable');
    } finally { claude.commandSurface = original; }
    expect(resolveCommandSurfaceCapability('claude')).toBe('adapter');
    expect(resolveCommandSurfaceCapability('trae')).toBe('adapter');
    expect(resolveCommandSurfaceCapability('hermes')).toBe('none');
    expect(resolveCommandSurfaceCapability('unknown-tool')).toBe('none');
  });
  it.each(['codex', 'forgecode', 'kimi', 'vibe'])('keeps %s invocable under every delivery', tool => {
    expect(resolveCommandSurfaceCapability(tool)).toBe('skills-invocable');
    for (const delivery of ['both', 'skills', 'commands'] as const) {
      expect(shouldGenerateSkillsForTool(tool, delivery)).toBe(true);
      expect(shouldRemoveSkillsForTool(tool, delivery)).toBe(false);
      expect(shouldGenerateCommandsForTool(tool, delivery)).toBe(false);
    }
  });
  it('lists incompatible IDs deterministically and allows skills alternatives', () => {
    expect(() => assertCommandSurfaceCompatibility(['unknown-z', 'hermes', 'hermes', 'kimi'], 'commands'))
      .toThrow("delivery=commands is unsupported for tools: hermes, unknown-z. Use 'openspec config set delivery both' or 'openspec config set delivery skills'.");
    for (const delivery of ['both', 'skills'] as const) {
      expect(() => assertCommandSurfaceCompatibility(['hermes'], delivery)).not.toThrow();
    }
  });
});

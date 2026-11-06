import type { CommandInvocation } from './command-generation/invocation.js';
import { ToolProfileRegistry } from './tool-profiles.js';
import type { Delivery } from './global-config.js';

import { AI_TOOLS, type CommandSurfaceCapability } from './config.js';
export type { CommandSurfaceCapability } from './config.js';

/**
 * How the tool spells its OpenSpec commands: the name from the command files
 * its adapter writes, the prefix the adapter declares. Returns undefined for
 * tools with no command adapter, which have no command names to spell.
 */
export function resolveCommandInvocation(toolId: string): CommandInvocation | undefined {
  return ToolProfileRegistry.get(toolId)?.invocation;
}

export function resolveCommandSurfaceCapability(toolId: string): CommandSurfaceCapability {
  return ToolProfileRegistry.get(toolId)?.commandSurface ?? 'none';
}

export function shouldGenerateSkillsForTool(toolId: string, delivery: Delivery): boolean {
  return delivery !== 'commands' || resolveCommandSurfaceCapability(toolId) === 'skills-invocable';
}

export function shouldRemoveSkillsForTool(toolId: string, delivery: Delivery): boolean {
  return delivery === 'commands' && resolveCommandSurfaceCapability(toolId) !== 'skills-invocable';
}

export function shouldGenerateCommandsForTool(toolId: string, delivery: Delivery): boolean {
  return delivery !== 'skills' && resolveCommandSurfaceCapability(toolId) === 'adapter';
}

export function shouldReconcileCommandFilesForTool(toolId: string, delivery: Delivery): boolean {
  return delivery === 'skills' && resolveCommandSurfaceCapability(toolId) === 'adapter';
}

/** Refuse an empty command surface before any migration, cleanup or generation. */
export function assertCommandSurfaceCompatibility(toolIds: readonly string[], delivery: Delivery): void {
  if (delivery !== 'commands') return;
  const unsupported = [...new Set(toolIds)]
    .filter(id => resolveCommandSurfaceCapability(id) === 'none').sort();
  if (unsupported.length > 0) {
    throw new Error(
      `delivery=commands is unsupported for tools: ${unsupported.join(', ')}. ` +
      `Use 'openspec config set delivery both' or 'openspec config set delivery skills'.`
    );
  }
}

export function skillsCommandSurfaceNote(toolIds: readonly string[], delivery: Delivery): string | undefined {
  if (delivery !== 'commands') return undefined;
  const names = [...new Set(toolIds)].filter(id => resolveCommandSurfaceCapability(id) === 'skills-invocable')
    .map(id => AI_TOOLS.find(tool => tool.value === id)?.name ?? id);
  return names.length > 0
    ? `Commands for ${names.join(', ')} use invocable skills; managed skills will be installed and retained.`
    : undefined;
}

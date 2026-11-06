import { AI_TOOLS, type AIToolOption, type CommandSurfaceCapability } from './config.js';
import { CommandAdapterRegistry } from './command-generation/registry.js';
import { getInvocationForAdapter, type CommandInvocation } from './command-generation/invocation.js';
import type { ToolCommandAdapter } from './command-generation/types.js';
import type { Delivery } from './global-config.js';
import { getTransformerForTool } from '../utils/command-references.js';

export interface ToolProfile {
  toolId: string;
  tool: AIToolOption;
  skillsDir?: string;
  globalSkillsDir?: string;
  commandAdapter?: ToolCommandAdapter;
  commandSurface: CommandSurfaceCapability;
  invocation?: CommandInvocation;
  transforms: readonly string[];
  skillTransformer(delivery: Delivery): ((text: string) => string) | undefined;
}

/** Profiles bind the existing explicit tool catalog to adapter/path/transform
 * capabilities. Resolve lazily so adapter registration and metadata overrides
 * remain observable; no second, drifting list of supported tool IDs exists. */
export class ToolProfileRegistry {
  static from(tool: AIToolOption): ToolProfile {
    const commandAdapter = CommandAdapterRegistry.get(tool.value);
    const commandSurface = tool.commandSurface ?? (commandAdapter ? 'adapter' : 'none');
    const invocation = commandAdapter ? getInvocationForAdapter(commandAdapter) : undefined;
    return {
      toolId: tool.value, tool, skillsDir: tool.skillsDir, globalSkillsDir: tool.globalSkillsDir,
      commandAdapter, commandSurface, invocation,
      transforms: ['skill-invocations', 'command-invocations'],
      skillTransformer: delivery => getTransformerForTool(tool.value, delivery, commandSurface, invocation),
    };
  }
  static get(toolId: string): ToolProfile | undefined {
    const tool = AI_TOOLS.find(candidate => candidate.value === toolId);
    return tool ? this.from(tool) : CommandAdapterRegistry.has(toolId)
      ? this.from({ value: toolId, name: toolId, available: true }) : undefined;
  }
  static getAll(): ToolProfile[] { return AI_TOOLS.map(tool => this.from(tool)); }
}

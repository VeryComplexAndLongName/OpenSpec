import os from 'node:os';
import path from 'node:path';

import { AI_TOOLS, type AIToolOption } from '../config.js';
import { ToolProfileRegistry } from '../tool-profiles.js';

export type SkillCapableTool = AIToolOption & (
  | { skillsDir: string }
  | { globalSkillsDir: string }
);

export function toolSupportsSkills(tool: AIToolOption): tool is SkillCapableTool {
  return Boolean(tool.skillsDir || tool.globalSkillsDir);
}

export function getSkillCapableTools(): SkillCapableTool[] {
  return AI_TOOLS.filter(toolSupportsSkills);
}

export function hasGlobalSkillTarget(tool: AIToolOption): boolean {
  return Boolean(tool.globalSkillsDir);
}

export function resolveToolSkillsDir(
  projectRoot: string,
  tool: SkillCapableTool,
  options: { homeDir?: string } = {}
): string {
  const profile = ToolProfileRegistry.from(tool);
  if (profile.globalSkillsDir) {
    const homeDir = options.homeDir ?? process.env.USERPROFILE ?? process.env.HOME ?? os.homedir();
    return path.join(homeDir, profile.globalSkillsDir, 'skills');
  }

  if (profile.skillsDir) {
    return path.join(projectRoot, profile.skillsDir, 'skills');
  }

  throw new Error(`Tool '${tool.value}' does not support skill generation.`);
}

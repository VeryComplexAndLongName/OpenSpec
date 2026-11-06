import * as factories from './skill-templates.js';
import type { SkillTemplate, CommandTemplate } from './types.js';
import { WORKFLOW_REGISTRATIONS, type WorkflowId } from './workflow-registrations.js';

export interface WorkflowManifestEntry {
  workflowId: WorkflowId;
  skillDirName: string;
  skill: SkillTemplate;
  command?: CommandTemplate;
  commandId?: string;
  tags: string[];
  compatibility: string;
}

/** Resolve the registered split modules lazily. The facade's existing factory
 * exports remain unchanged; defaults are the same as the public renderer's. */
export function getWorkflowManifest(): WorkflowManifestEntry[] {
  return WORKFLOW_REGISTRATIONS.map(entry => {
    const template = factories[entry.skillFactory]();
    const skill: SkillTemplate = {
      ...template,
      license: template.license || 'MIT',
      compatibility: template.compatibility || 'Requires openspec CLI.',
      metadata: {
        ...template.metadata,
        author: template.metadata?.author || 'openspec',
        version: template.metadata?.version || '1.0',
      },
    };
    const commandRegistration = 'command' in entry ? entry.command : undefined;
    const command = commandRegistration ? factories[commandRegistration.factory]() : undefined;
    return {
      workflowId: entry.workflowId, skillDirName: entry.skillDirName, skill,
      ...(command ? { command, commandId: commandRegistration!.id } : {}),
      tags: command?.tags ?? [], compatibility: skill.compatibility!,
    };
  });
}

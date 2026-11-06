import path from 'node:path';
import { ToolProfileRegistry } from './tool-profiles.js';
import { generateCommands } from './command-generation/generator.js';
import { getSkillTemplates, getCommandContents, generateSkillContent } from './shared/skill-generation.js';
import { hasGlobalSkillTarget, resolveToolSkillsDir, toolSupportsSkills } from './shared/skill-paths.js';
import { assertCommandSurfaceCompatibility, shouldGenerateCommandsForTool, shouldGenerateSkillsForTool } from './command-surface.js';
import { runArtifactTransforms, DEFAULT_ARTIFACT_TRANSFORMS, type ArtifactTransform, type ArtifactTransformContext } from './templates/artifact-transforms.js';
import { WORKFLOW_REGISTRATIONS } from './templates/workflow-registrations.js';
import type { SkillTemplate } from './templates/types.js';
import type { Delivery } from './global-config.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { assertWorkflowConditionalsResolved } from './templates/optional-workflow.js';

function skillContext(toolId: string, delivery: Delivery, workflowId?: string): ArtifactTransformContext {
  const profile = ToolProfileRegistry.get(toolId);
  if (!profile) throw new Error(`Unknown tool profile '${toolId}'.`);
  return { toolId, scope: 'skill', delivery, workflowId, commandSurface: profile.commandSurface,
    invocation: profile.invocation, skillTransformer: profile.skillTransformer(delivery) };
}

export function renderToolWorkflowReference(text: string, toolId: string, delivery: Delivery): string {
  return runArtifactTransforms(text, skillContext(toolId, delivery), 'preAdapter');
}

export function renderSkillForTool(template: SkillTemplate, version: string, toolId: string, delivery: Delivery, transforms?: readonly ArtifactTransform[]): string {
  const context = skillContext(toolId, delivery, WORKFLOW_REGISTRATIONS.find(entry => entry.skillDirName === template.name)?.workflowId);
  const profile = ToolProfileRegistry.get(toolId)!;
  const effective = transforms ?? DEFAULT_ARTIFACT_TRANSFORMS.filter(transform => profile.transforms.includes(transform.id));
  const instructions = runArtifactTransforms(template.instructions, context, 'preAdapter', effective);
  const formatted = generateSkillContent({ ...template, instructions }, version);
  const content = runArtifactTransforms(formatted, context, 'postAdapter', effective);
  assertWorkflowConditionalsResolved(content, `Skill '${template.name}' contains unresolved workflow conditionals after transforms`);
  return content;
}

export interface ArtifactSyncOptions {
  projectRoot: string;
  toolId: string;
  delivery: Delivery;
  workflows: readonly string[];
  version: string;
  surface?: 'skill' | 'command' | 'both';
  writesSkills?: boolean;
  skillsPath?: string;
  skillsRoot?: string;
}
export interface PlannedArtifact { surface: 'skill' | 'command'; path: string; content: string; root: string }

/** Shared generation plan, renderer and writer. Callers retain ownership,
 * legacy cleanup and profile reconciliation policy; the engine only writes
 * their selected surfaces, using the same canonical path guards as before. */
export class ArtifactSyncEngine {
  constructor(private readonly transforms?: readonly ArtifactTransform[]) {}

  plan(options: ArtifactSyncOptions): PlannedArtifact[] {
    const profile = ToolProfileRegistry.get(options.toolId);
    if (!profile) throw new Error(`Unknown tool profile '${options.toolId}'.`);
    assertCommandSurfaceCompatibility([options.toolId], options.delivery);
    const artifacts: PlannedArtifact[] = [];
    const surface = options.surface ?? 'both';
    if (surface !== 'command' && options.writesSkills !== false && shouldGenerateSkillsForTool(options.toolId, options.delivery) && toolSupportsSkills(profile.tool)) {
      const directory = options.skillsPath ?? resolveToolSkillsDir(options.projectRoot, profile.tool);
      const root = options.skillsRoot ?? (hasGlobalSkillTarget(profile.tool) ? directory : options.projectRoot);
      for (const entry of getSkillTemplates(options.workflows)) artifacts.push({
        surface: 'skill', root, path: path.join(directory, entry.dirName, 'SKILL.md'),
        content: renderSkillForTool(entry.template, options.version, options.toolId, options.delivery, this.transforms),
      });
    }
    if (surface !== 'skill' && shouldGenerateCommandsForTool(options.toolId, options.delivery) && profile.commandAdapter) {
      for (const command of generateCommands(getCommandContents(options.workflows), profile.commandAdapter, { transforms: this.transforms, delivery: options.delivery })) artifacts.push({
        surface: 'command', root: options.projectRoot,
        path: FileSystemUtils.resolveProjectArtifactPath(options.projectRoot, command.path), content: command.fileContent,
      });
    }
    return artifacts;
  }

  async write(artifacts: readonly PlannedArtifact[]): Promise<void> {
    for (const artifact of artifacts) {
      FileSystemUtils.assertPathWithin(artifact.root, artifact.path);
      await FileSystemUtils.writeFile(artifact.path, artifact.content);
    }
  }

  async sync(options: ArtifactSyncOptions): Promise<PlannedArtifact[]> {
    const artifacts = this.plan(options);
    await this.write(artifacts);
    return artifacts;
  }
}

export const artifactSyncEngine = new ArtifactSyncEngine();

/**
 * Command Generator
 *
 * Functions for generating command files using tool adapters.
 */

import type { CommandContent, ToolCommandAdapter, GeneratedCommand } from './types.js';
import { getInvocationForAdapter } from './invocation.js';
import { runArtifactTransforms, DEFAULT_ARTIFACT_TRANSFORMS, type ArtifactTransform, type ArtifactTransformContext } from '../templates/artifact-transforms.js';
import { ToolProfileRegistry } from '../tool-profiles.js';
import type { Delivery } from '../global-config.js';
import { assertWorkflowConditionalsResolved } from '../templates/optional-workflow.js';

/**
 * Generate a single command file using the provided adapter.
 *
 * Command bodies are authored with `/opsx:<id>` references. Tools whose command
 * files are invoked by filename register `/opsx-<id>` instead, and Amazon Q
 * surfaces them in its prompt library as `@opsx-<id>`, so the body is rewritten
 * to the form that tool answers to before the adapter formats it. Doing it here
 * rather than per adapter keeps every tool in step (#727, #1307); adapters stay
 * pure formatters.
 *
 * @param content - The tool-agnostic command content
 * @param adapter - The tool-specific adapter
 * @returns Generated command with path and file content
 */
export interface CommandGenerationOptions {
  transforms?: readonly ArtifactTransform[];
  delivery?: Delivery;
}

export function generateCommand(
  content: CommandContent,
  adapter: ToolCommandAdapter,
  options: CommandGenerationOptions = {},
): GeneratedCommand {
  assertWorkflowConditionalsResolved(
    content.body,
    `Command '${content.id}' was generated without resolving its optional-workflow blocks`
  );

  const invocation = getInvocationForAdapter(adapter);
  const profile = ToolProfileRegistry.get(adapter.toolId);
  const transforms = options.transforms ?? DEFAULT_ARTIFACT_TRANSFORMS.filter(transform => !profile || profile.transforms.includes(transform.id));
  const context: ArtifactTransformContext = { toolId: adapter.toolId, scope: 'command',
    workflowId: content.id, delivery: options.delivery ?? 'both', commandSurface: 'adapter', invocation };
  const formatted = { ...content, body: runArtifactTransforms(content.body, context, 'preAdapter', transforms) };
  const fileContent = runArtifactTransforms(adapter.formatFile(formatted), context, 'postAdapter', transforms);
  assertWorkflowConditionalsResolved(fileContent, `Command '${content.id}' contains unresolved workflow conditionals after transforms`);

  return {
    path: adapter.getFilePath(content.id),
    fileContent,
  };
}

/**
 * Generate multiple command files using the provided adapter.
 * @param contents - Array of tool-agnostic command contents
 * @param adapter - The tool-specific adapter
 * @returns Array of generated commands with paths and file contents
 */
export function generateCommands(
  contents: CommandContent[],
  adapter: ToolCommandAdapter,
  options: CommandGenerationOptions = {},
): GeneratedCommand[] {
  return contents.map((content) => generateCommand(content, adapter, options));
}

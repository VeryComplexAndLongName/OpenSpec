import type { Delivery } from '../global-config.js';
import type { CommandSurfaceCapability } from '../config.js';
import { needsInvocationRewrite, type CommandInvocation } from '../command-generation/invocation.js';
import { transformCommandInvocations } from '../../utils/command-references.js';

export type ArtifactScope = 'skill' | 'command';
export type TransformPhase = 'preAdapter' | 'postAdapter';
export interface ArtifactTransformContext {
  toolId: string;
  scope: ArtifactScope;
  delivery: Delivery;
  commandSurface: CommandSurfaceCapability;
  workflowId?: string;
  invocation?: CommandInvocation;
  skillTransformer?: (text: string) => string;
}
export interface ArtifactTransform {
  id: string;
  scope: ArtifactScope | 'both';
  phase: TransformPhase;
  priority: number;
  applies(context: ArtifactTransformContext): boolean;
  transform(text: string, context: ArtifactTransformContext): string;
}

export const DEFAULT_ARTIFACT_TRANSFORMS: readonly ArtifactTransform[] = [
  {
    id: 'skill-invocations', scope: 'skill', phase: 'preAdapter', priority: 100,
    applies: context => context.skillTransformer !== undefined,
    transform: (text, context) => context.skillTransformer!(text),
  },
  {
    id: 'command-invocations', scope: 'command', phase: 'preAdapter', priority: 100,
    applies: context => context.invocation !== undefined && needsInvocationRewrite(context.invocation),
    transform: (text, context) => transformCommandInvocations(text, context.invocation!),
  },
];

/** Order is independent of registration order: phase is explicit, then numeric
 * priority and stable ID. Never mutate the registry or share intermediate text. */
export function runArtifactTransforms(
  text: string, context: ArtifactTransformContext, phase: TransformPhase,
  transforms: readonly ArtifactTransform[] = DEFAULT_ARTIFACT_TRANSFORMS,
): string {
  const ids = new Set<string>();
  for (const transform of transforms) {
    if (!transform.id || ids.has(transform.id) || !Number.isFinite(transform.priority)) throw new Error(`Invalid or duplicate artifact transform '${transform.id}'.`);
    ids.add(transform.id);
  }
  const selected = transforms.filter(transform => transform.phase === phase &&
    (transform.scope === 'both' || transform.scope === context.scope) && transform.applies(context))
    .sort((a,b) => a.priority-b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return selected.reduce((content, transform) => transform.transform(content, context), text);
}

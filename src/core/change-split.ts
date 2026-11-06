import * as fs from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { z } from 'zod';
import { isKebabId } from './id.js';
import { ChangeMetadataSchema } from './change-metadata/schema.js';
import { resolveSchemaForChange } from '../utils/change-metadata.js';
import { resolveTaskFilesForChange } from '../utils/task-progress.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { formatLocalDate } from '../utils/date.js';
import { loadChangeStack } from './change-stack.js';

const PlanSchema = z.object({ version: z.literal(1), children: z.array(z.string().refine(isKebabId)).min(2) }).strict();
const MANIFEST = '.openspec-split.yaml';
const BACKUPS = ['.split-original-proposal.md', '.split-original-tasks.md', '.split-original-metadata.yaml', '.split-original-specs'];

function assertRealTree(directory: string): void {
  const stat = fs.lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Split requires a real change directory: ${directory}`);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Split refuses linked content: ${target}`);
    if (entry.isDirectory()) assertRealTree(target);
  }
}

/** Create planning stubs, preserving every original task and delta separately.
 * This never claims to implement a slice or to assign requirements semantically. */
export function splitChange(projectRoot: string, sourceId: string, options: { slices?: string[]; overwrite?: boolean } = {}): { parent: string; children: string[] } {
  if (!isKebabId(sourceId) || sourceId === 'archive') throw new Error('Source change ID must be a non-reserved kebab-case ID.');
  const changes = path.join(projectRoot, 'openspec', 'changes');
  const source = path.join(changes, sourceId);
  FileSystemUtils.assertPathWithin(changes, source);
  assertRealTree(source);
  const manifest = path.join(source, MANIFEST);
  const previous = fs.existsSync(manifest) ? PlanSchema.parse(parse(fs.readFileSync(manifest, 'utf8'))) : undefined;
  if (previous && !options.overwrite) throw new Error(`Change '${sourceId}' is already split. Review its children or rerun with --overwrite (alias --force). No files changed.`);
  const prefix = sourceId.slice(0, 190).replace(/-+$/, '');
  const children = options.slices ?? previous?.children ?? [`${prefix}-slice-1`, `${prefix}-slice-2`];
  if (children.length < 2 || new Set(children).size !== children.length || children.some(id => !isKebabId(id) || id.length > 200 || id === sourceId || id === 'archive')) {
    throw new Error('Provide at least two unique kebab-case child IDs, different from the parent and archive.');
  }
  if (previous && JSON.stringify(previous.children) !== JSON.stringify(children)) throw new Error('Overwrite must retain the original child IDs; changing the slice set would orphan existing work.');
  if (!previous && BACKUPS.some(file => fs.existsSync(path.join(source, file)))) throw new Error('Split backup paths already exist. Preserve/reconcile them before starting another split.');
  const proposal = path.join(source, 'proposal.md');
  if (!fs.existsSync(proposal)) throw new Error('Write a top-level proposal.md before splitting this change.');
  for (const file of ['proposal.md', 'tasks.md', '.openspec.yaml']) {
    const target = path.join(source, file);
    if (fs.existsSync(target) && !fs.statSync(target).isFile()) throw new Error(`Split expects a regular file: ${target}`);
  }
  const taskFiles = resolveTaskFilesForChange(source, projectRoot);
  if (taskFiles.some(file => path.resolve(file) !== path.join(source, 'tasks.md'))) {
    throw new Error('This workflow tracks custom task paths. Split those artifacts explicitly before using the conventional proposal.md/tasks.md scaffolder.');
  }
  const originalMetadata = previous
    ? parse(fs.readFileSync(path.join(source, '.split-original-metadata.yaml'), 'utf8'))
    : fs.existsSync(path.join(source, '.openspec.yaml')) ? parse(fs.readFileSync(path.join(source, '.openspec.yaml'), 'utf8')) : {};
  const metadata = { ...(originalMetadata ?? {}), schema: originalMetadata?.schema ?? resolveSchemaForChange(source) };
  ChangeMetadataSchema.parse(metadata);
  const finalSlice = children[children.length - 1];
  const consumers = loadChangeStack(projectRoot).nodes.filter(node => node.id !== sourceId && !children.includes(node.id) && (
    node.dependsOn?.includes(sourceId) ||
    (node.requires?.some(marker => metadata.provides?.includes(marker)) && !node.dependsOn?.includes(finalSlice))
  ));
  if (consumers.length > 0) throw new Error(`Existing consumers (${consumers.map(node => node.id).join(', ')}) would be unblocked too early by a planning parent. Point their implementation dependencies to final slice '${finalSlice}' before retrying; no files changed.`);
  for (const child of children) {
    const directory = path.join(changes, child);
    FileSystemUtils.assertPathWithin(changes, directory);
    if (fs.existsSync(directory)) {
      if (!previous || !options.overwrite) throw new Error(`Child '${child}' already exists. Choose other --slices IDs; no files changed.`);
      assertRealTree(directory);
      const childMetadata = parse(fs.readFileSync(path.join(directory, '.openspec.yaml'), 'utf8'));
      if (childMetadata?.parent !== sourceId) throw new Error(`Child '${child}' no longer belongs to this split. Reconcile it before overwriting.`);
      for (const file of ['proposal.md', 'tasks.md', '.openspec.yaml']) {
        const target = path.join(directory, file);
        if (fs.existsSync(target) && !fs.statSync(target).isFile()) throw new Error(`Split expects a regular managed file: ${target}`);
      }
    }
  }

  // All collision and link checks precede writes. Keep exact original bytes;
  // delta specs leave the active merge path so archiving a planning container
  // cannot accidentally apply unimplemented requirements to canonical specs.
  if (!previous) {
    fs.copyFileSync(proposal, path.join(source, BACKUPS[0]));
    if (fs.existsSync(path.join(source, 'tasks.md'))) fs.copyFileSync(path.join(source, 'tasks.md'), path.join(source, BACKUPS[1]));
    const originalFile = path.join(source, '.openspec.yaml');
    if (fs.existsSync(originalFile)) fs.copyFileSync(originalFile, path.join(source, BACKUPS[2]));
    else fs.writeFileSync(path.join(source, BACKUPS[2]), stringify(metadata));
    if (fs.existsSync(path.join(source, 'specs'))) fs.renameSync(path.join(source, 'specs'), path.join(source, BACKUPS[3]));
  }
  children.forEach((child, index) => {
    const directory = path.join(changes, child);
    fs.mkdirSync(directory, { recursive: true });
    const childMetadata = {
      schema: metadata.schema, created: formatLocalDate(), skip_specs: true,
      parent: sourceId,
      dependsOn: [...new Set([...(metadata.dependsOn ?? []), sourceId, ...(index > 0 ? [children[index - 1]] : [])])],
      ...(metadata.touches ? { touches: metadata.touches } : {}),
      ...(index === children.length - 1 && metadata.provides ? { provides: metadata.provides } : {}),
      ...(index === children.length - 1 && metadata.requires ? { requires: metadata.requires } : {}),
    };
    ChangeMetadataSchema.parse(childMetadata);
    fs.writeFileSync(path.join(directory, '.openspec.yaml'), stringify(childMetadata));
    fs.writeFileSync(path.join(directory, 'proposal.md'), `## Why\n\nPlan an independently mergeable slice of ${sourceId}. Original proposal/tasks/deltas are preserved under the parent's .split-original-* paths (or its archive).\n\n## What Changes\n\n- Define the scope of slice ${index + 1} of ${children.length}; assign requirements before implementation.\n- This initial scaffold has no spec deltas; remove skip_specs when adding behavior deltas.\n\n## Capabilities\n\n### New Capabilities\n\nNone until the slice scope is defined.\n\n### Modified Capabilities\n\nNone until the slice scope is defined.\n`);
    fs.writeFileSync(path.join(directory, 'tasks.md'), '## 1. Slice implementation\n\n- [ ] 1.1 Assign this slice its requirements and acceptance criteria from the preserved original plan; add deltas where needed.\n- [ ] 1.2 Implement the assigned scope without duplicating another slice.\n- [ ] 1.3 Verify acceptance and archive in dependency order.\n');
  });
  fs.writeFileSync(path.join(source, '.openspec.yaml'), stringify({ ...metadata, skip_specs: true, provides: [], requires: [], touches: [] }));
  fs.writeFileSync(proposal, `## Why\n\nCoordinate the decomposition of ${sourceId} into independently mergeable slices.\n\n## What Changes\n\n- Create planning stubs: ${children.join(', ')}.\n- Preserve original proposal, metadata, unfinished tasks and delta specs under .split-original-*; no original implementation task is marked done.\n- This parent is a planning container only. Archive it before implementing/archiving the children; its original deltas are outside the active merge path.\n\n## Capabilities\n\n### New Capabilities\n\nNone; planning scaffolding only.\n\n### Modified Capabilities\n\nNone; implementation belongs to the child slices.\n`);
  fs.writeFileSync(path.join(source, 'tasks.md'), '## 1. Planning split\n\n- [x] 1.1 Preserve the original unfinished plan and create linked child planning stubs.\n');
  fs.writeFileSync(manifest, stringify({ version: 1, children }));
  return { parent: sourceId, children };
}

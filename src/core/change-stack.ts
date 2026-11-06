import * as fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { StackMetadataSchema, type StackMetadata } from './change-metadata/schema.js';
import { FileSystemUtils } from '../utils/file-system.js';
import type { ValidationIssue } from './validation/types.js';

export interface StackNode extends StackMetadata { id: string }
export interface StackIssue extends ValidationIssue { change: string }
export interface ChangeStack {
  nodes: StackNode[];
  order: string[];
  next: string[];
  blocked: Record<string, string[]>;
  issues: StackIssue[];
}

function directories(directory: string): string[] {
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'archive')
      .map(entry => entry.name).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

function metadata(directory: string): StackMetadata {
  const file = path.join(directory, '.openspec.yaml');
  if (!fs.existsSync(file)) return {};
  FileSystemUtils.assertPathWithin(directory, file);
  const content = fs.readFileSync(file, 'utf8');
  let value: unknown;
  try { value = parse(content); }
  catch (error) { throw new Error(`the file is not valid YAML: ${(error as Error).message}`); }
  return StackMetadataSchema.parse(value ?? {});
}

/** Active edges are explicit. Archived IDs resolve by exact historical name or
 * by removing one archive-added date prefix; original digit-leading IDs remain. */
export function loadChangeStack(projectRoot: string): ChangeStack {
  const changes = path.join(projectRoot, 'openspec', 'changes');
  const issues: StackIssue[] = [];
  const issue = (change: string, level: 'ERROR' | 'WARNING', message: string): void => {
    issues.push({ change, level, path: '.openspec.yaml', message, ...(level === 'WARNING' ? { advisory: true } : {}) });
  };
  const archived = new Set<string>();
  const archivedProviders = new Set<string>();
  for (const id of directories(path.join(changes, 'archive'))) {
    archived.add(id);
    archived.add(id.replace(/^\d{4}-\d{2}-\d{2}-/, ''));
    try {
      for (const marker of metadata(path.join(changes, 'archive', id)).provides ?? []) archivedProviders.add(marker);
    } catch {
      // Old archives without current metadata remain historical dependency
      // targets, but cannot assert a capability marker we cannot parse.
    }
  }
  const nodes: StackNode[] = directories(changes).map(id => {
    try { return { id, ...metadata(path.join(changes, id)) }; }
    catch (error) {
      issue(id, 'ERROR', `Invalid stack metadata for '${id}': ${(error as Error).message}`);
      return { id };
    }
  });
  const byId = new Map(nodes.map(node => [node.id, node]));
  const edges = (id: string): string[] => (byId.get(id)?.dependsOn ?? []).filter(dep => byId.has(dep)).sort();
  for (const node of nodes) {
    for (const dep of node.dependsOn ?? []) {
      if (!byId.has(dep) && !archived.has(dep)) issue(node.id, 'ERROR', `Missing dependency '${dep}' required by '${node.id}'. Create it or correct dependsOn.`);
    }
    for (const marker of node.requires ?? []) {
      const providers = nodes.filter(candidate => candidate.id !== node.id && candidate.provides?.includes(marker));
      if (providers.length > 0 && !providers.some(provider => node.dependsOn?.includes(provider.id))) {
        issue(node.id, 'ERROR', `Required marker '${marker}' has active providers (${providers.map(p => p.id).join(', ')}). Add an explicit dependsOn edge to at least one provider.`);
      } else if (providers.length === 0 && !node.provides?.includes(marker) && !archivedProviders.has(marker)) {
        issue(node.id, 'WARNING', `No active or archived provider for required marker '${marker}'. Declare a provider and explicit ordering if needed.`);
      }
    }
  }

  // Tarjan SCCs find all cyclic nodes, including intersecting cycles. Report
  // sorted members instead of inventing an edge path from sorted identifiers.
  let index = 0;
  const indices = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  function visit(id: string): void {
    indices.set(id, index); low.set(id, index++); stack.push(id); onStack.add(id);
    for (const dep of edges(id)) {
      if (!indices.has(dep)) { visit(dep); low.set(id, Math.min(low.get(id)!, low.get(dep)!)); }
      else if (onStack.has(dep)) low.set(id, Math.min(low.get(id)!, indices.get(dep)!));
    }
    if (low.get(id) !== indices.get(id)) return;
    const component: string[] = [];
    let member: string;
    do { member = stack.pop()!; onStack.delete(member); component.push(member); } while (member !== id);
    component.sort();
    if (component.length > 1 || edges(id).includes(id)) {
      const message = `Dependency cycle among: ${component.join(', ')}. Remove a dependsOn edge to break the cycle.`;
      for (const cyclic of component) issue(cyclic, 'ERROR', message);
    }
  }
  for (const node of nodes) if (!indices.has(node.id)) visit(node.id);

  const blocked: Record<string, string[]> = Object.create(null);
  for (const item of issues.filter(item => item.level === 'ERROR')) (blocked[item.change] ??= []).push(item.message);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (blocked[node.id]) continue;
      const failed = edges(node.id).filter(dep => blocked[dep]);
      if (failed.length > 0) {
        const message = `Blocked by unresolved dependency path through: ${failed.join(', ')}. Fix the predecessor metadata.`;
        blocked[node.id] = [message]; issue(node.id, 'ERROR', message); changed = true;
      }
    }
  }
  const depth = new Map<string, number>();
  function getDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    const dependencies = edges(id);
    const value = dependencies.length > 0 ? 1 + Math.max(...dependencies.map(getDepth)) : 0;
    depth.set(id, value); return value;
  }
  const order = nodes.filter(node => !blocked[node.id]).map(node => node.id)
    .sort((a, b) => getDepth(a) - getDepth(b) || (a < b ? -1 : a > b ? 1 : 0));
  const next = order.filter(id => edges(id).length === 0);
  const touches = new Map<string, string[]>();
  for (const node of nodes) for (const area of node.touches ?? []) touches.set(area, [...(touches.get(area) ?? []), node.id]);
  for (const [area, owners] of [...touches].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    if (owners.length > 1) for (const owner of owners) issue(owner, 'WARNING', `Overlapping touches '${area}': ${owners.join(', ')}. Coordinate these changes.`);
  }
  issues.sort((a, b) => a.change < b.change ? -1 : a.change > b.change ? 1 : a.message < b.message ? -1 : a.message > b.message ? 1 : 0);
  return { nodes, order, next, blocked, issues };
}

export function assertStackArchiveOrder(projectRoot: string, change: string, options: { deferMetadataErrors?: boolean } = {}): void {
  const graph = loadChangeStack(projectRoot);
  const failures = graph.issues.filter(issue => issue.change === change && issue.level === 'ERROR');
  // Preserve the archive command's existing malformed/unreadable metadata
  // diagnostics. It calls the full gate after those historical checks too.
  if (options.deferMetadataErrors && failures.length > 0 && failures.every(issue => issue.message.startsWith('Invalid stack metadata for '))) return;
  if (failures.length > 0) throw new Error(failures.map(issue => issue.message).join('\n'));
  const node = graph.nodes.find(node => node.id === change);
  const active = new Set(graph.nodes.map(node => node.id));
  const pending = (node?.dependsOn ?? []).filter(dep => active.has(dep)).sort();
  if (pending.length > 0) throw new Error(`Archive '${change}' after its dependsOn predecessors: ${pending.join(', ')}. Archive those changes first.`);
}

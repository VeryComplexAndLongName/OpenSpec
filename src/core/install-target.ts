import os from 'node:os';
import path from 'node:path';
import type { AIToolOption } from './config.js';
import type { InstallScope } from './global-config.js';

export type InstallSurface = 'skills' | 'commands';

export interface InstallTargetRequest {
  tool: AIToolOption;
  surface: InstallSurface;
  requestedScope: InstallScope;
  projectRoot: string;
  platform?: NodeJS.Platform;
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
  /** The adapter's existing project-relative command path. */
  commandPath?: string;
  /** Explicit upstream-supported global command root, never guessed. */
  globalCommandRoot?: string;
}

export interface InstallTarget {
  toolId: string;
  surface: InstallSurface;
  requestedScope: InstallScope;
  effectiveScope: InstallScope;
  target: string;
  fallbackReason?: string;
}

/** Pure scope planner. It does not create, remove or migrate installed files.
 * Init/update integration and defaults must land with the migration protocol. */
export function resolveInstallTarget(request: InstallTargetRequest): InstallTarget {
  const { tool, surface, requestedScope } = request;
  if (!['global', 'project'].includes(requestedScope)) throw new Error(`Invalid install scope '${requestedScope}'. Use global or project.`);
  const support = tool.installScopeSupport?.[surface] ?? ['project'];
  if (support.some(scope => scope !== 'global' && scope !== 'project')) throw new Error(`Invalid ${surface} scope metadata for '${tool.value}'.`);
  const alternate = requestedScope === 'global' ? 'project' : 'global';
  const effectiveScope = support.includes(requestedScope) ? requestedScope
    : support.includes(alternate) ? alternate : undefined;
  if (!effectiveScope) throw new Error(`Tool '${tool.value}' supports no ${surface} install scope. Choose another delivery surface or tool.`);
  const platform = request.platform ?? process.platform;
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const environment = request.env ?? process.env;
  if (!paths.isAbsolute(request.projectRoot)) throw new Error(`Project root must be absolute: ${request.projectRoot}`);
  const homeDir = request.homeDir ?? (platform === 'win32' ? environment.USERPROFILE : environment.HOME) ?? os.homedir();
  const base = effectiveScope === 'global' ? homeDir : request.projectRoot;
  if (!paths.isAbsolute(base)) throw new Error(`Install base must be absolute for '${tool.value}': ${base}`);
  const isSafeRelative = (directory: string, root: string): boolean => {
    if (paths.parse(directory).root) return false;
    const relative = paths.relative(root, paths.resolve(root, directory));
    return !paths.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${paths.sep}`);
  };
  let target: string;
  if (surface === 'skills') {
    const directory = effectiveScope === 'global' ? tool.globalSkillsDir : tool.skillsDir;
    if (!directory) throw new Error(`Tool '${tool.value}' declares ${effectiveScope} skills support without a target directory.`);
    if (!isSafeRelative(directory, base)) {
      throw new Error(`Unsafe ${effectiveScope} skills target for '${tool.value}': ${directory}`);
    }
    target = paths.join(base, directory, 'skills');
  } else {
    const commandPath = request.commandPath;
    if (!commandPath || !isSafeRelative(commandPath, request.projectRoot)) {
      throw new Error(`Provide a safe project-relative adapter command path for '${tool.value}'.`);
    }
    if (effectiveScope === 'global') {
      if (!request.globalCommandRoot || !paths.isAbsolute(request.globalCommandRoot)) {
        throw new Error(`Tool '${tool.value}' declares global commands without an explicit absolute global command root.`);
      }
      target = paths.join(request.globalCommandRoot, commandPath);
    } else target = paths.join(base, commandPath);
  }
  return {
    toolId: tool.value, surface, requestedScope, effectiveScope, target,
    ...(effectiveScope !== requestedScope ? {
      fallbackReason: `${tool.value} ${surface} do not support ${requestedScope} scope; using ${effectiveScope}.`,
    } : {}),
  };
}

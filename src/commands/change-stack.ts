import { Command, Option } from 'commander';
import { loadChangeStack } from '../core/change-stack.js';
import { splitChange } from '../core/change-split.js';
import { resolveRootForCommand, toRootOutput } from '../core/root-selection.js';
import { COMMON_FLAGS } from '../core/completions/shared-flags.js';

type Options = { json?: boolean; store?: string; storePath?: string; slices?: string; overwrite?: boolean; force?: boolean };
export function registerChangeStackCommands(parent: Command): void {
  for (const name of ['graph', 'next', 'split'] as const) {
    const command = parent.command(name === 'split' ? 'split <change-id>' : name)
      .description(name === 'split' ? 'Scaffold independently mergeable child plans, preserving the source' : `Show change dependency ${name === 'graph' ? 'graph and order' : 'candidates ready to start'}`)
      .option('--json', 'Output as JSON')
      .option('--store <id>', COMMON_FLAGS.store.description)
      .addOption(new Option('--store-path <path>', 'Unsupported; register a store and use --store').hideHelp());
    if (name === 'split') command.option('--slices <ids>', 'Comma-separated child IDs (default: two numbered slices)')
      .option('--overwrite', 'Regenerate managed scaffold files of a previous split')
      .option('--force', 'Alias for --overwrite');
    command.action(async (...args: unknown[]) => {
      const id = name === 'split' ? args[0] as string : undefined;
      const options = args[name === 'split' ? 1 : 0] as Options;
      try {
        const root = await resolveRootForCommand(options, { json: options.json, failurePayload: { stack: null, root: null }, allowImplicitRoot: false });
        if (!root) return;
        const graph = loadChangeStack(root.path);
        const errors = graph.issues.filter(issue => issue.level === 'ERROR');
        const blocking = errors.filter(issue => issue.message.startsWith('Dependency cycle among:') || (name === 'split' && issue.change === id));
        if (blocking.length > 0) throw new Error([...new Set(blocking.map(issue => issue.message))].join('\n'));
        const result = name === 'split'
          ? splitChange(root.path, id!, { slices: options.slices?.split(',').map(value => value.trim()), overwrite: options.overwrite || options.force })
          : graph;
        if (options.json) console.log(JSON.stringify({ stack: result, root: toRootOutput(root) }, null, 2));
        else if (name === 'split') console.log(`Created child plans: ${(result as { children: string[] }).children.join(', ')}. Original unfinished work is preserved in the parent.`);
        else {
          for (const node of graph.nodes) console.log(`${node.id} <- ${(node.dependsOn ?? []).join(', ') || '(none)'}`);
          console.log(`${name === 'graph' ? 'Recommended order' : 'Next unblocked changes'}: ${(name === 'graph' ? graph.order : graph.next).join(', ') || '(none)'}`);
          for (const issue of graph.issues) console.error(`${issue.level === 'ERROR' ? 'Error' : 'Warning'}: ${issue.message}`);
        }
        if (name !== 'split' && errors.length > 0) process.exitCode = 1;
      } catch (error) {
        if (options.json) console.log(JSON.stringify({ stack: null, status: [{ code: 'change_stack_error', message: (error as Error).message }] }, null, 2));
        else console.error(`Error: ${(error as Error).message}`);
        process.exitCode = 1;
      }
    });
  }
}

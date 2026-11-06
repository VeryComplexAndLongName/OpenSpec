import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { stringify } from 'yaml';
import { runCLI } from '../helpers/run-cli.js';

describe('change stack CLI', () => {
  let root: string;
  let changes: string;
  beforeEach(async () => {
    root=await fs.mkdtemp(path.join(os.tmpdir(),'openspec stack CLI native spaces '));
    changes=path.join(root,'openspec','changes');
    await fs.mkdir(path.join(changes,'archive'),{recursive:true});
    await fs.mkdir(path.join(root,'openspec','specs'));
    await fs.writeFile(path.join(root,'openspec','config.yaml'),'schema: spec-driven\n');
  });
  afterEach(async()=>{ await fs.rm(root,{recursive:true,force:true}); });
  async function change(id: string, metadata: Record<string,unknown> = {}) {
    const dir=path.join(changes,id);
    await fs.mkdir(dir,{recursive:true});
    await fs.writeFile(path.join(dir,'.openspec.yaml'),stringify({schema:'spec-driven',skip_specs:true,...metadata}));
    await fs.writeFile(path.join(dir,'proposal.md'),'## Why\nA real CLI acceptance fixture.\n\n## What Changes\n- Plan concrete work.\n');
    await fs.writeFile(path.join(dir,'tasks.md'),'## 1. Work\n- [ ] 1.1 Unfinished implementation\n');
    return dir;
  }
  it('shows graph/next order and persists new-change metadata flags', async()=>{
    await change('a');await change('b',{dependsOn:['a']});await change('z');
    const graph=await runCLI(['change','graph','--json'],{cwd:root});
    expect(graph.exitCode,graph.stderr).toBe(0);
    expect(JSON.parse(graph.stdout).stack.order).toEqual(['a','z','b']);
    expect(graph.stderr).not.toContain('deprecated');
    const next=await runCLI(['change','next','--json'],{cwd:root});
    expect(JSON.parse(next.stdout).stack.next).toEqual(['a','z']);
    const created=await runCLI(['new','change','child','--depends-on','a','--parent','a','--touches','cli-init','--provides','X','--json'],{cwd:root});
    expect(created.exitCode,created.stderr).toBe(0);
    expect(await fs.readFile(path.join(changes,'child','.openspec.yaml'),'utf8')).toContain('dependsOn:');
  },60000);
  it('returns the same cycle diagnostic in graph and strict validation', async()=>{
    await change('a',{dependsOn:['b']});await change('b',{dependsOn:['a']});
    const graph=await runCLI(['change','graph','--json'],{cwd:root});
    const validation=await runCLI(['validate','a','--strict','--json'],{cwd:root});
    expect(graph.exitCode).toBe(1);expect(validation.exitCode).toBe(1);
    const message='Dependency cycle among: a, b. Remove a dependsOn edge to break the cycle.';
    expect(graph.stdout).toContain(message);expect(validation.stdout).toContain(message);
  },60000);
  it('enforces archive order even when spec validation is explicitly skipped', async()=>{
    await change('a');const child=await change('b',{dependsOn:['a']});
    const archived=await runCLI(['archive','b','--yes','--no-validate','--skip-specs','--json'],{cwd:root});
    expect(archived.exitCode).toBe(1);
    expect(archived.stdout).toContain('archive_stack_blocked');
    expect(await fs.readFile(path.join(child,'tasks.md'),'utf8')).toContain('[ ] 1.1');
  },30000);
  it('splits, refuses re-split, supports force and archives only the planning parent', async()=>{
    const parent=await change('large',{skip_specs:false});
    await fs.mkdir(path.join(parent,'specs','feature'),{recursive:true});
    await fs.writeFile(path.join(parent,'specs','feature','spec.md'),'Unimplemented original delta');
    const split=await runCLI(['change','split','large','--slices','first,second','--json'],{cwd:root});
    expect(split.exitCode,split.stderr).toBe(0);
    expect(JSON.parse(split.stdout).stack.children).toEqual(['first','second']);
    const file=path.join(changes,'first','tasks.md');
    await fs.writeFile(file,'Custom child task');
    const again=await runCLI(['change','split','large','--json'],{cwd:root});
    expect(again.exitCode).toBe(1);expect(await fs.readFile(file,'utf8')).toBe('Custom child task');
    const force=await runCLI(['change','split','large','--force','--json'],{cwd:root});
    expect(force.exitCode,force.stderr).toBe(0);
    expect(await fs.readFile(file,'utf8')).toContain('[ ] 1.1');
    const archived=await runCLI(['archive','large','--yes','--json'],{cwd:root});
    expect(archived.exitCode,archived.stdout+archived.stderr).toBe(0);
    const archivedName=JSON.parse(archived.stdout).archive.archivedAs;
    expect(await fs.readFile(path.join(changes,'archive',archivedName,'.split-original-specs','feature','spec.md'),'utf8')).toBe('Unimplemented original delta');
    await expect(fs.access(path.join(root,'openspec','specs','feature'))).rejects.toThrow();
    const next=await runCLI(['change','next','--json'],{cwd:root});
    expect(JSON.parse(next.stdout).stack.next).toEqual(['first']);
  },60000);
});

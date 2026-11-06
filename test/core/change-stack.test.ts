import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parse, stringify } from 'yaml';
import { loadChangeStack, assertStackArchiveOrder } from '../../src/core/change-stack.js';
import { splitChange } from '../../src/core/change-split.js';
import { ChangeMetadataSchema } from '../../src/core/change-metadata/schema.js';
import { Validator } from '../../src/core/validation/validator.js';
import { createChange } from '../../src/utils/change-utils.js';

describe('change stack planning', () => {
  let root: string;
  let changes: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec stack native spaces '));
    changes = path.join(root,'openspec','changes');
    fs.mkdirSync(path.join(changes,'archive'), { recursive: true });
    fs.mkdirSync(path.join(root,'openspec','specs'));
    fs.writeFileSync(path.join(root,'openspec','config.yaml'),'schema: spec-driven\n');
  });
  afterEach(() => fs.rmSync(root,{ recursive: true, force: true }));
  function change(id: string, metadata: Record<string,unknown> = {}, archived = false): string {
    const dir = path.join(changes, ...(archived ? ['archive'] : []), id);
    fs.mkdirSync(dir,{ recursive: true });
    fs.writeFileSync(path.join(dir,'.openspec.yaml'),stringify({ schema:'spec-driven', skip_specs:true, ...metadata }));
    fs.writeFileSync(path.join(dir,'proposal.md'),'## Why\nA concrete planning fixture.\n\n## What Changes\n- Refine a plan.\n');
    fs.writeFileSync(path.join(dir,'tasks.md'),'## 1. Work\n- [ ] 1.1 Original unfinished implementation\n');
    return dir;
  }
  it('normalizes optional metadata without changing old metadata', () => {
    expect(ChangeMetadataSchema.parse({ schema:'spec-driven' })).toEqual({schema:'spec-driven'});
    expect(ChangeMetadataSchema.parse({schema:'spec-driven', dependsOn:[' a ','a'],touches:[' cli-init ','cli-init']}))
      .toMatchObject({dependsOn:['a'],touches:['cli-init']});
    for (const metadata of [{dependsOn:'a'}, {parent:['a']}, {requires:[' ']}, {dependsOn:['../escape']}]) {
      expect(ChangeMetadataSchema.safeParse({schema:'spec-driven',...metadata}).success).toBe(false);
    }
  });
  it('orders by dependency depth then lexicographic ID and resolves dated archives', () => {
    change('z'); change('a'); change('b',{dependsOn:['a']}); change('d',{dependsOn:['old']});
    change('2026-11-05-old',{},true);
    const graph = loadChangeStack(root);
    expect(graph.order).toEqual(['a','d','z','b']);
    expect(graph.next).toEqual(['a','d','z']);
    expect(graph.issues).toEqual([]);
  });
  it('detects all cyclic nodes and propagates missing/cyclic paths', () => {
    change('a',{dependsOn:['b']}); change('b',{dependsOn:['a']}); change('c',{dependsOn:['a']});
    change('d',{dependsOn:['missing']}); change('e',{dependsOn:['d']}); change('free');
    const graph = loadChangeStack(root);
    expect(graph.order).toEqual(['free']);
    expect(graph.next).toEqual(['free']);
    expect(graph.blocked.a[0]).toBe('Dependency cycle among: a, b. Remove a dependsOn edge to break the cycle.');
    expect(graph.blocked.c[0]).toContain('unresolved dependency path');
    expect(graph.blocked.e[0]).toContain('unresolved dependency path');
    expect(() => assertStackArchiveOrder(root,'b')).toThrow('Dependency cycle among: a, b');
  });
  it('requires explicit provider edges without inferring them', () => {
    change('a',{provides:['X']});change('b',{requires:['X']});
    expect(loadChangeStack(root).blocked.b[0]).toContain('Add an explicit dependsOn edge');
    change('b',{requires:['X'],dependsOn:['a']});
    expect(loadChangeStack(root).order).toEqual(['a','b']);
    expect(() => assertStackArchiveOrder(root,'b')).toThrow('Archive those changes first');
  });
  it('recognizes archived providers and keeps overlap/missing-marker advice non-blocking in strict mode', async () => {
    change('2026-11-05-old',{provides:['old-contract']},true);
    const a=change('a',{requires:['old-contract','unknown'],touches:['cli-init']});
    change('b',{touches:['cli-init']});
    const graph=loadChangeStack(root);
    expect(graph.issues.filter(i=>i.message.includes('old-contract'))).toEqual([]);
    expect(graph.issues.some(i=>i.message.includes("required marker 'unknown'"))).toBe(true);
    const report=await new Validator(true).validateChangeDeltaSpecs(a,{projectRoot:root});
    expect(report.valid).toBe(true);
    expect(report.issues.filter(i=>i.level==='WARNING').every(i=>i.advisory)).toBe(true);
  });
  it('persists new-change stack inputs and rejects invalid input before writes', async () => {
    const created=await createChange(root,'child',{metadata:{parent:'parent',dependsOn:[' parent '],provides:['contract']}});
    expect(parse(fs.readFileSync(path.join(created.changeDir,'.openspec.yaml'),'utf8'))).toMatchObject({parent:'parent',dependsOn:['parent'],provides:['contract']});
    await expect(createChange(root,'bad',{metadata:{parent:'../escape'}})).rejects.toThrow();
    expect(fs.existsSync(path.join(changes,'bad'))).toBe(false);
  });
  it('preserves unfinished source work and creates a parent-first child sequence', () => {
    const source=change('large',{skip_specs:false,provides:['done']});
    fs.mkdirSync(path.join(source,'specs','feature'),{recursive:true});
    fs.writeFileSync(path.join(source,'specs','feature','spec.md'),'Original unimplemented delta');
    const tasks=fs.readFileSync(path.join(source,'tasks.md'));
    const result=splitChange(root,'large');
    expect(result.children).toEqual(['large-slice-1','large-slice-2']);
    expect(fs.readFileSync(path.join(source,'.split-original-tasks.md'))).toEqual(tasks);
    expect(fs.readFileSync(path.join(source,'.split-original-specs','feature','spec.md'),'utf8')).toBe('Original unimplemented delta');
    expect(fs.existsSync(path.join(source,'specs'))).toBe(false);
    expect(fs.readFileSync(path.join(source,'tasks.md'),'utf8')).not.toContain('[ ]');
    for (const id of result.children) {
      const metadata=parse(fs.readFileSync(path.join(changes,id,'.openspec.yaml'),'utf8'));
      expect(metadata.parent).toBe('large');expect(metadata.dependsOn).toContain('large');
      expect(fs.readFileSync(path.join(changes,id,'tasks.md'),'utf8').match(/\[ \]/g)).toHaveLength(3);
    }
    expect(loadChangeStack(root).order).toEqual(['large','large-slice-1','large-slice-2']);
    expect(()=>assertStackArchiveOrder(root,'large')).not.toThrow();
  });
  it('refuses re-split and unmanaged collisions, and overwrites only managed stubs explicitly', () => {
    const source=change('large');
    splitChange(root,'large');
    const child=path.join(changes,'large-slice-1');
    fs.writeFileSync(path.join(child,'tasks.md'),'Custom unfinished child work');
    fs.writeFileSync(path.join(child,'user-owned.md'),'Preserve me');
    expect(()=>splitChange(root,'large')).toThrow('already split');
    expect(fs.readFileSync(path.join(child,'tasks.md'),'utf8')).toBe('Custom unfinished child work');
    splitChange(root,'large',{overwrite:true});
    expect(fs.readFileSync(path.join(child,'tasks.md'),'utf8')).toContain('[ ] 1.1');
    expect(fs.readFileSync(path.join(child,'user-owned.md'),'utf8')).toBe('Preserve me');
    expect(fs.readFileSync(path.join(source,'.split-original-tasks.md'),'utf8')).toContain('Original unfinished implementation');
    const other=change('other');change('other-slice-2');
    expect(()=>splitChange(root,'other',{overwrite:true})).toThrow('already exists');
    expect(fs.existsSync(path.join(other,'.openspec-split.yaml'))).toBe(false);
    expect(fs.existsSync(path.join(changes,'other-slice-1'))).toBe(false);
  });
  it('does not unblock existing implementation consumers through a planning parent', () => {
    const source=change('large',{provides:['contract']});
    change('consumer',{dependsOn:['large'],requires:['contract']});
    expect(()=>splitChange(root,'large')).toThrow("Point their implementation dependencies to final slice 'large-slice-2'");
    expect(fs.existsSync(path.join(source,'.openspec-split.yaml'))).toBe(false);
    change('consumer',{dependsOn:['large-slice-2'],requires:['contract']});
    splitChange(root,'large');
    expect(loadChangeStack(root).issues.filter(issue=>issue.level==='ERROR')).toEqual([]);
    expect(loadChangeStack(root).order).toEqual(['large','large-slice-1','large-slice-2','consumer']);
  });
  it('recognizes conventional tasks through a canonicalized project path', () => {
    change('large');
    const alias = `${root}-alias`;
    fs.symlinkSync(root, alias, process.platform === 'win32' ? 'junction' : 'dir');
    try {
      expect(splitChange(alias, 'large').children).toEqual(['large-slice-1', 'large-slice-2']);
    } finally {
      fs.unlinkSync(alias);
    }
  });
});

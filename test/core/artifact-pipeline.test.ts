import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AI_TOOLS, OPENSPEC_SKILL_NAMES } from '../../src/core/config.js';
import { ALL_WORKFLOWS, CORE_WORKFLOWS } from '../../src/core/profiles.js';
import { ToolProfileRegistry } from '../../src/core/tool-profiles.js';
import { ArtifactSyncEngine } from '../../src/core/artifact-sync.js';
import { getWorkflowManifest } from '../../src/core/templates/workflow-manifest.js';
import { WORKFLOW_REGISTRATIONS } from '../../src/core/templates/workflow-registrations.js';
import { runArtifactTransforms, type ArtifactTransform, type ArtifactTransformContext } from '../../src/core/templates/artifact-transforms.js';
import { getSkillTemplates, getCommandContents, generateSkillContent } from '../../src/core/shared/skill-generation.js';
import { resolveToolSkillsDir, toolSupportsSkills } from '../../src/core/shared/skill-paths.js';
import { getTransformerForTool, transformCommandInvocations } from '../../src/utils/command-references.js';
import { getInvocationForAdapter, needsInvocationRewrite } from '../../src/core/command-generation/invocation.js';
import { CommandAdapterRegistry } from '../../src/core/command-generation/registry.js';
import { generateCommand } from '../../src/core/command-generation/generator.js';
import { shouldGenerateSkillsForTool, shouldGenerateCommandsForTool } from '../../src/core/command-surface.js';
import { COMMAND_IDS } from '../../src/core/shared/tool-detection.js';

describe('artifact pipeline contracts', () => {
  let root: string;
  let oldEnv: NodeJS.ProcessEnv;
  beforeEach(() => {
    root=fs.mkdtempSync(path.join(os.tmpdir(),'openspec pipeline native spaces '));
    oldEnv={...process.env};
    for(const key of ['HOME','USERPROFILE','XDG_CONFIG_HOME','XDG_DATA_HOME','CODEX_HOME']) process.env[key]=path.join(root,key);
  });
  afterEach(()=>{ process.env=oldEnv;fs.rmSync(root,{recursive:true,force:true}); });

  it('has one complete registration for every workflow with matching projections',()=>{
    const manifest=getWorkflowManifest();
    expect(new Set(manifest.map(entry=>entry.workflowId)).size).toBe(manifest.length);
    expect(new Set(manifest.map(entry=>entry.skillDirName)).size).toBe(manifest.length);
    expect(new Set(manifest.map(entry=>entry.workflowId))).toEqual(new Set(ALL_WORKFLOWS));
    expect(manifest.map(entry=>entry.skillDirName)).toEqual([...OPENSPEC_SKILL_NAMES]);
    expect(manifest.flatMap(entry=>entry.commandId ? [entry.commandId] : [])).toEqual([...COMMAND_IDS]);
    expect(getSkillTemplates().map(entry=>entry.workflowId)).toEqual(WORKFLOW_REGISTRATIONS.map(entry=>entry.workflowId));
    for(const entry of manifest) {
      expect(entry.skill.name).toBe(entry.skillDirName);
      expect(entry.skill.description.trim().length).toBeGreaterThan(0);
      expect(entry.skill.license).toBeTruthy();expect(entry.compatibility).toBeTruthy();
      expect(entry.skill.metadata?.author).toBeTruthy();expect(entry.skill.metadata?.version).toBeTruthy();
      if(entry.command) { expect(entry.commandId).toBe(entry.workflowId);expect(entry.command.description).toBeTruthy(); }
    }
  });
  it('resolves every supported tool through the shared profile/path/adapter catalog',()=>{
    expect(ToolProfileRegistry.getAll().map(profile=>profile.toolId)).toEqual(AI_TOOLS.map(tool=>tool.value));
    for(const tool of AI_TOOLS) {
      const profile=ToolProfileRegistry.get(tool.value)!;
      expect(profile.commandAdapter).toBe(CommandAdapterRegistry.get(tool.value));
      expect(profile.commandSurface).toBe(tool.commandSurface ?? (profile.commandAdapter ? 'adapter':'none'));
      if(toolSupportsSkills(tool)) {
        expect(resolveToolSkillsDir(root,tool)).toBe(tool.globalSkillsDir
          ? path.join(process.env.USERPROFILE!,tool.globalSkillsDir,'skills')
          : path.join(root,tool.skillsDir!,'skills'));
      }
    }
  });
  it.each(AI_TOOLS)('preserves complete legacy-projection bytes and paths for $value', tool=>{
    const engine=new ArtifactSyncEngine();
    const profile=ToolProfileRegistry.get(tool.value)!;
    for(const delivery of ['both','skills','commands'] as const) for(const workflows of [CORE_WORKFLOWS,ALL_WORKFLOWS]) {
      const options={ projectRoot:root,toolId:tool.value,delivery,workflows,version:'PARITY' };
      if(delivery==='commands' && profile.commandSurface==='none') {
        expect(()=>engine.plan(options)).toThrow('unsupported for tools:');continue;
      }
      const expected: Array<{surface:string;path:string;content:string}>=[];
      if(toolSupportsSkills(tool) && shouldGenerateSkillsForTool(tool.value,delivery)) {
        for(const {template,dirName} of getSkillTemplates(workflows)) expected.push({
          surface:'skill',path:path.join(resolveToolSkillsDir(root,tool),dirName,'SKILL.md'),
          content:generateSkillContent(template,'PARITY',getTransformerForTool(tool.value,delivery,profile.commandSurface,profile.invocation)),
        });
      }
      if(shouldGenerateCommandsForTool(tool.value,delivery) && profile.commandAdapter) {
        const adapter=profile.commandAdapter;const invocation=getInvocationForAdapter(adapter);
        for(const command of getCommandContents(workflows)) {
          const formatted=needsInvocationRewrite(invocation) ? {...command,body:transformCommandInvocations(command.body,invocation)} : command;
          expected.push({surface:'command',path:path.join(root,adapter.getFilePath(command.id)),content:adapter.formatFile(formatted)});
        }
      }
      expect(engine.plan(options).map(({surface,path:target,content})=>({surface,path:target,content}))).toEqual(expected);
    }
  });
  it('writes only planned artifacts and honors shared-skill writer arbitration',async()=>{
    const engine=new ArtifactSyncEngine();
    const options={projectRoot:root,toolId:'claude',delivery:'both' as const,workflows:CORE_WORKFLOWS,version:'PARITY'};
    const artifacts=await engine.sync(options);
    expect(artifacts).toHaveLength(12);
    for(const artifact of artifacts) expect(fs.readFileSync(artifact.path,'utf8')).toBe(artifact.content);
    expect(engine.plan({...options,writesSkills:false}).every(artifact=>artifact.surface==='command')).toBe(true);
    const blocked=path.join(root,'untouched');fs.mkdirSync(blocked);
    await expect(engine.sync({...options,projectRoot:blocked,toolId:'hermes',delivery:'commands'})).rejects.toThrow('unsupported for tools: hermes');
    expect(fs.readdirSync(blocked)).toEqual([]);
  });
  it('refuses a linked skill target before writing outside the project',async()=>{
    const outside=fs.mkdtempSync(path.join(os.tmpdir(),'openspec pipeline outside '));
    try {
      fs.writeFileSync(path.join(outside,'user-owned.txt'),'preserve');
      fs.symlinkSync(outside,path.join(root,'.claude'),process.platform==='win32'?'junction':'dir');
      await expect(new ArtifactSyncEngine().sync({projectRoot:root,toolId:'claude',delivery:'skills',workflows:CORE_WORKFLOWS,version:'PARITY'})).rejects.toThrow();
      expect(fs.readdirSync(outside)).toEqual(['user-owned.txt']);
      expect(fs.readFileSync(path.join(outside,'user-owned.txt'),'utf8')).toBe('preserve');
    } finally { fs.rmSync(outside,{recursive:true,force:true}); }
  });
});

describe('ordered artifact transforms',()=>{
  const context:ArtifactTransformContext={toolId:'test',scope:'command',delivery:'both',commandSurface:'adapter',workflowId:'apply'};
  function transform(id:string,scope:'skill'|'command'|'both',phase:'preAdapter'|'postAdapter',priority:number):ArtifactTransform {
    return {id,scope,phase,priority,applies:ctx=>ctx.workflowId==='apply',transform:text=>text+id};
  }
  it('orders by phase, priority and stable ID while respecting scope/applicability',()=>{
    const transforms=[transform('z','command','preAdapter',2),transform('b','both','preAdapter',1),transform('a','command','preAdapter',1),transform('s','skill','preAdapter',0),transform('p','command','postAdapter',0)];
    expect(runArtifactTransforms('',context,'preAdapter',transforms)).toBe('abz');
    expect(runArtifactTransforms('',context,'preAdapter',[...transforms].reverse())).toBe('abz');
    expect(runArtifactTransforms('',context,'postAdapter',transforms)).toBe('p');
    expect(runArtifactTransforms('',{...context,workflowId:'other'},'preAdapter',transforms)).toBe('');
    expect(transforms.map(item=>item.id)).toEqual(['z','b','a','s','p']);
  });
  it('runs command phases around adapter formatting and rejects duplicate IDs',()=>{
    const transforms=[transform('before','command','preAdapter',1),transform('after','command','postAdapter',1)];
    const generated=generateCommand({id:'apply',name:'Apply',description:'Apply',category:'Work',tags:[],body:'body'},
      {toolId:'test',getFilePath:()=> 'apply.md',formatFile:content=>'adapter['+content.body+']'},{transforms});
    expect(generated.fileContent).toBe('adapter[bodybefore]after');
    expect(()=>runArtifactTransforms('',context,'preAdapter',[transforms[0],transforms[0]])).toThrow('duplicate artifact transform');
  });
});

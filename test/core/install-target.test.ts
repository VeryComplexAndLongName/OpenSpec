import { describe, expect, it } from 'vitest';
import { AI_TOOLS, type AIToolOption } from '../../src/core/config.js';
import { resolveInstallTarget } from '../../src/core/install-target.js';

const tool: AIToolOption = { name: 'Fixture', value: 'fixture', available: true, skillsDir: '.fixture' };

describe('pure install target planning', () => {
  it('conservatively falls back to project scope when metadata is absent', () => {
    expect(resolveInstallTarget({tool, surface:'skills', requestedScope:'global', projectRoot:'/work/repo', platform:'linux'}))
      .toMatchObject({effectiveScope:'project',target:'/work/repo/.fixture/skills',fallbackReason:expect.stringContaining('using project')});
  });
  it('prefers the requested supported scope and reports no fallback', () => {
    const scoped = {...tool,globalSkillsDir:'.fixture',installScopeSupport:{skills:['project','global'] as const}};
    const result = resolveInstallTarget({tool:{...scoped,installScopeSupport:{skills:[...scoped.installScopeSupport.skills]}},surface:'skills',requestedScope:'global',projectRoot:'/repo',homeDir:'/home/user',platform:'linux'});
    expect(result.target).toBe('/home/user/.fixture/skills');
    expect(result.fallbackReason).toBeUndefined();
  });
  it('keeps the existing global-only MiniMax convention explicit', () => {
    const minimax = AI_TOOLS.find(candidate=>candidate.value==='minimax-code')!;
    expect(resolveInstallTarget({tool:minimax,surface:'skills',requestedScope:'project',projectRoot:'/repo',homeDir:'/home/user',platform:'linux'}))
      .toMatchObject({effectiveScope:'global',target:'/home/user/.minimax/skills'});
    expect(()=>resolveInstallTarget({tool:minimax,surface:'commands',requestedScope:'global',projectRoot:'/repo'})).toThrow('supports no commands');
  });
  it('resolves native Windows global targets with spaces without POSIX defaults', () => {
    const scoped = {...tool,globalSkillsDir:'.fixture',installScopeSupport:{skills:['global'] as ('global')[]}};
    expect(resolveInstallTarget({tool:scoped,surface:'skills',requestedScope:'global',projectRoot:'D:\\repo',platform:'win32',env:{USERPROFILE:'C:\\Users\\Some User'}}).target)
      .toBe('C:\\Users\\Some User\\.fixture\\skills');
  });
  it('keeps existing project command paths and refuses invented global locations', () => {
    expect(resolveInstallTarget({tool,surface:'commands',requestedScope:'global',projectRoot:'/repo',platform:'linux',commandPath:'.fixture/commands/opsx-new.md'}).target)
      .toBe('/repo/.fixture/commands/opsx-new.md');
    const scoped = {...tool,installScopeSupport:{commands:['global'] as ('global')[]}};
    expect(()=>resolveInstallTarget({tool:scoped,surface:'commands',requestedScope:'global',projectRoot:'/repo',platform:'linux',homeDir:'/home/user',commandPath:'opsx-new.md'})).toThrow('explicit absolute global command root');
  });
  it.each(['../escape','/absolute','nested/../../escape'])('refuses unsafe skills metadata %s', directory => {
    expect(()=>resolveInstallTarget({tool:{...tool,skillsDir:directory},surface:'skills',requestedScope:'project',projectRoot:'/repo',platform:'linux'})).toThrow('Unsafe');
  });
  it.each(['../escape','/absolute'])('refuses unsafe command paths %s', commandPath => {
    expect(()=>resolveInstallTarget({tool,surface:'commands',requestedScope:'project',projectRoot:'/repo',platform:'linux',commandPath})).toThrow('safe project-relative');
  });
  it('fails when a declared scope has no target instead of silently choosing another location', () => {
    expect(()=>resolveInstallTarget({tool:{...tool,installScopeSupport:{skills:['global']}},surface:'skills',requestedScope:'global',projectRoot:'/repo',platform:'linux',homeDir:'/home/user'})).toThrow('without a target directory');
  });
  it.each(['D:escape','D:\\escape','\\\\server\\share','..\\escape'])('refuses Windows path escape %s', directory => {
    expect(()=>resolveInstallTarget({tool:{...tool,skillsDir:directory},surface:'skills',requestedScope:'project',projectRoot:'C:\\repo',platform:'win32'})).toThrow('Unsafe');
  });
  it('requires an absolute project root even for a global install plan', () => {
    expect(()=>resolveInstallTarget({tool,surface:'skills',requestedScope:'project',projectRoot:'relative',platform:'linux'})).toThrow('Project root must be absolute');
  });
});

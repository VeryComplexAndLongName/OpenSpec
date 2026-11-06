/** Pure workflow registration data: safe for config/profile imports.
 * Template factories are named here and bound lazily by workflow-manifest.ts,
 * keeping metadata discovery independent of template/module initialization. */
import type { SkillTemplate, CommandTemplate } from './types.js';
type Factories = typeof import('./skill-templates.js');
type FactoryKey<T> = { [K in keyof Factories]: Factories[K] extends () => T ? K : never }[keyof Factories];
export interface WorkflowRegistration {
  workflowId: string;
  skillDirName: string;
  skillFactory: FactoryKey<SkillTemplate>;
  command?: { id: string; factory: FactoryKey<CommandTemplate> };
  profileOrder: number;
  coreOrder?: number;
}

// Generation order and profile presentation order intentionally differ in the
// established API. Both are recorded once here rather than reordering output.
export const WORKFLOW_REGISTRATIONS = [
  { workflowId: "explore", skillDirName: "openspec-explore", skillFactory: "getExploreSkillTemplate", command: { id: "explore", factory: "getOpsxExploreCommandTemplate" }, profileOrder: 1, coreOrder: 1 },
  { workflowId: "new", skillDirName: "openspec-new-change", skillFactory: "getNewChangeSkillTemplate", command: { id: "new", factory: "getOpsxNewCommandTemplate" }, profileOrder: 2 },
  { workflowId: "continue", skillDirName: "openspec-continue-change", skillFactory: "getContinueChangeSkillTemplate", command: { id: "continue", factory: "getOpsxContinueCommandTemplate" }, profileOrder: 3 },
  { workflowId: "apply", skillDirName: "openspec-apply-change", skillFactory: "getApplyChangeSkillTemplate", command: { id: "apply", factory: "getOpsxApplyCommandTemplate" }, profileOrder: 4, coreOrder: 2 },
  { workflowId: "update", skillDirName: "openspec-update-change", skillFactory: "getUpdateChangeSkillTemplate", command: { id: "update", factory: "getOpsxUpdateCommandTemplate" }, profileOrder: 5, coreOrder: 3 },
  { workflowId: "ff", skillDirName: "openspec-ff-change", skillFactory: "getFfChangeSkillTemplate", command: { id: "ff", factory: "getOpsxFfCommandTemplate" }, profileOrder: 6 },
  { workflowId: "sync", skillDirName: "openspec-sync-specs", skillFactory: "getSyncSpecsSkillTemplate", command: { id: "sync", factory: "getOpsxSyncCommandTemplate" }, profileOrder: 7, coreOrder: 4 },
  { workflowId: "archive", skillDirName: "openspec-archive-change", skillFactory: "getArchiveChangeSkillTemplate", command: { id: "archive", factory: "getOpsxArchiveCommandTemplate" }, profileOrder: 8, coreOrder: 5 },
  { workflowId: "bulk-archive", skillDirName: "openspec-bulk-archive-change", skillFactory: "getBulkArchiveChangeSkillTemplate", command: { id: "bulk-archive", factory: "getOpsxBulkArchiveCommandTemplate" }, profileOrder: 9 },
  { workflowId: "verify", skillDirName: "openspec-verify-change", skillFactory: "getVerifyChangeSkillTemplate", command: { id: "verify", factory: "getOpsxVerifyCommandTemplate" }, profileOrder: 10 },
  { workflowId: "onboard", skillDirName: "openspec-onboard", skillFactory: "getOnboardSkillTemplate", command: { id: "onboard", factory: "getOpsxOnboardCommandTemplate" }, profileOrder: 11 },
  { workflowId: "propose", skillDirName: "openspec-propose", skillFactory: "getOpsxProposeSkillTemplate", command: { id: "propose", factory: "getOpsxProposeCommandTemplate" }, profileOrder: 0, coreOrder: 0 },
 ] as const satisfies readonly WorkflowRegistration[];
export type WorkflowId = (typeof WORKFLOW_REGISTRATIONS)[number]['workflowId'];
export type CoreWorkflowRegistration = Extract<(typeof WORKFLOW_REGISTRATIONS)[number], { coreOrder: number }>;
export type CoreWorkflowId = CoreWorkflowRegistration['workflowId'];
export const WORKFLOW_SKILL_NAMES = Object.freeze(WORKFLOW_REGISTRATIONS.map(entry => entry.skillDirName));
export const WORKFLOW_COMMAND_IDS = Object.freeze(WORKFLOW_REGISTRATIONS.flatMap(entry => 'command' in entry && entry.command ? [entry.command.id] : []));

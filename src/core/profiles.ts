import { WORKFLOW_REGISTRATIONS, type CoreWorkflowRegistration } from './templates/workflow-registrations.js';
/**
 * Profile System
 *
 * Defines workflow profiles that control which workflows are installed.
 * Profiles determine WHICH workflows; delivery (in global config) determines HOW.
 */

import type { Profile } from './global-config.js';

/**
 * Core workflows included in the 'core' profile.
 * These provide the streamlined experience for new users.
 */
export const CORE_WORKFLOWS = Object.freeze(WORKFLOW_REGISTRATIONS.filter((entry): entry is CoreWorkflowRegistration => 'coreOrder' in entry).sort((a,b) => a.coreOrder-b.coreOrder).map(entry => entry.workflowId));

/**
 * All available workflows in the system.
 */
export const ALL_WORKFLOWS = Object.freeze([...WORKFLOW_REGISTRATIONS].sort((a,b) => a.profileOrder-b.profileOrder).map(entry => entry.workflowId));

export type WorkflowId = (typeof ALL_WORKFLOWS)[number];
export type CoreWorkflowId = (typeof CORE_WORKFLOWS)[number];

/**
 * Resolves which workflows should be active for a given profile configuration.
 *
 * - 'core' profile always returns CORE_WORKFLOWS
 * - 'custom' profile returns the provided customWorkflows and required dependencies
 */
export function getProfileWorkflows(
  profile: Profile,
  customWorkflows?: string[]
): readonly string[] {
  if (profile === 'custom') {
    const workflows = customWorkflows ?? [];
    const syncDependentIndex = workflows.findIndex(
      (workflow) => workflow === 'archive' || workflow === 'bulk-archive'
    );

    if (syncDependentIndex !== -1 && !workflows.includes('sync')) {
      return [
        ...workflows.slice(0, syncDependentIndex),
        'sync',
        ...workflows.slice(syncDependentIndex),
      ];
    }

    return workflows;
  }
  return CORE_WORKFLOWS;
}

import { ACCESS_ROLE_IDS, ResourceType } from 'librechat-data-provider';

export interface ResourceConfig {
  resourceType: ResourceType;
  defaultViewerRoleId: ACCESS_ROLE_IDS;
  defaultEditorRoleId: ACCESS_ROLE_IDS;
  defaultOwnerRoleId: ACCESS_ROLE_IDS;
  getResourceUrl?: (resourceId: string) => string;
  getResourceName: (resourceName?: string) => string;
  getShareMessage: (resourceName?: string) => string;
  getManageMessage: (resourceName?: string) => string;
  getCopyUrlMessage: () => string;
}

export const RESOURCE_CONFIGS: Record<ResourceType, ResourceConfig> = {
  [ResourceType.AGENT]: {
    resourceType: ResourceType.AGENT,
    defaultViewerRoleId: ACCESS_ROLE_IDS.AGENT_VIEWER,
    defaultEditorRoleId: ACCESS_ROLE_IDS.AGENT_EDITOR,
    defaultOwnerRoleId: ACCESS_ROLE_IDS.AGENT_OWNER,
    getResourceUrl: (agentId: string) => `${window.location.origin}/c/new?agent_id=${agentId}`,
    getResourceName: (name?: string) => (name && name !== '' ? `"${name}"` : 'agent'),
    getShareMessage: (name?: string) => (name && name !== '' ? `"${name}"` : 'agent'),
    getManageMessage: (name?: string) =>
      `Manage permissions for ${name && name !== '' ? `"${name}"` : 'agent'}`,
    getCopyUrlMessage: () => 'Agent URL copied',
  },
  [ResourceType.PROMPTGROUP]: {
    resourceType: ResourceType.PROMPTGROUP,
    defaultViewerRoleId: ACCESS_ROLE_IDS.PROMPTGROUP_VIEWER,
    defaultEditorRoleId: ACCESS_ROLE_IDS.PROMPTGROUP_EDITOR,
    defaultOwnerRoleId: ACCESS_ROLE_IDS.PROMPTGROUP_OWNER,
    getResourceName: (name?: string) => (name && name !== '' ? `"${name}"` : 'prompt'),
    getShareMessage: (name?: string) => (name && name !== '' ? `"${name}"` : 'prompt'),
    getManageMessage: (name?: string) =>
      `Manage permissions for ${name && name !== '' ? `"${name}"` : 'prompt'}`,
    getCopyUrlMessage: () => 'Prompt URL copied',
  },
};

export const getResourceConfig = (resourceType: ResourceType): ResourceConfig | undefined => {
  return RESOURCE_CONFIGS[resourceType];
};

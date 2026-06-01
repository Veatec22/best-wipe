import type { AddPanelOptions } from "dockview";

export type WorkspaceTabId =
  | "tasks"
  | "schema"
  | "docs"
  | "structure"
  | "notes"
  | "calendar"
  | "admin";

export interface WorkspacePanelParams {
  tabId: WorkspaceTabId;
}

export type WorkspacePanelPosition = NonNullable<AddPanelOptions<WorkspacePanelParams>["position"]>;

export function workspacePanelId(tabId: WorkspaceTabId): string {
  return `workspace:${tabId}`;
}

export function createWorkspacePanelOptions(
  tabId: WorkspaceTabId,
  title: string,
  position?: WorkspacePanelPosition,
): AddPanelOptions<WorkspacePanelParams> {
  const options: AddPanelOptions<WorkspacePanelParams> = {
    id: workspacePanelId(tabId),
    component: "workspacePanel",
    title,
    params: { tabId },
  };

  if (position) {
    options.position = position;
  }

  return options;
}

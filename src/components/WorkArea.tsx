import {
  type DockviewApi,
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from "dockview";
import { BookOpen } from "pixelarticons/react/BookOpen";
import { Calendar } from "pixelarticons/react/Calendar";
import { Checkbox } from "pixelarticons/react/Checkbox";
import { Database } from "pixelarticons/react/Database";
import { Notes } from "pixelarticons/react/Notes";
import { Shield } from "pixelarticons/react/Shield";
import { Tree } from "pixelarticons/react/Tree";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { createContext, useContext, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ClockApi } from "../game/clock";
import { Panel } from "../ui/components";
import { AdminPane } from "./tabs/AdminPane";
import { CalendarPane } from "./tabs/CalendarPane";
import { DocsPane } from "./tabs/DocsPane";
import { NotesPane } from "./tabs/NotesPane";
import { SchemaPane } from "./tabs/SchemaPane";
import { StructurePane } from "./tabs/StructurePane";
import { TasksPane } from "./tabs/TasksPane";
import {
  createWorkspacePanelOptions,
  type WorkspacePanelParams,
  type WorkspaceTabId,
  workspacePanelId,
} from "./workspaceDockview";

type TabId = WorkspaceTabId;

const TAB_ORDER: TabId[] =
  __APP_MODE__ === "admin"
    ? ["tasks", "schema", "docs", "structure", "notes", "calendar", "admin"]
    : ["tasks", "schema", "docs", "structure", "notes", "calendar"];

const TAB_ICONS: Record<TabId, ComponentType<SVGProps<SVGSVGElement>>> = {
  tasks: Checkbox,
  schema: Database,
  docs: BookOpen,
  structure: Tree,
  notes: Notes,
  calendar: Calendar,
  admin: Shield,
};

const FLUSH_TABS: ReadonlySet<TabId> = new Set<TabId>(["tasks"]);

interface Props {
  clockApi: ClockApi;
  playerAvatarUrl?: string;
  onSubmitTask(taskId: string): void | Promise<void>;
}

interface WorkspacePanelProps extends IDockviewPanelProps<WorkspacePanelParams> {}

interface WorkspaceRuntime {
  clockApi: ClockApi;
  playerAvatarUrl?: string;
  onSubmitTask(taskId: string): void | Promise<void>;
}

const WorkspaceRuntimeContext = createContext<WorkspaceRuntime | null>(null);

export function WorkArea({ clockApi, playerAvatarUrl, onSubmitTask }: Props) {
  const { t } = useTranslation();
  const apiRef = useRef<DockviewApi | null>(null);

  const explorerItems = useMemo(
    () =>
      TAB_ORDER.map(id => {
        const Icon = TAB_ICONS[id];
        return {
          id,
          label: t(`tabs.${id}`),
          icon: <Icon width={14} height={14} aria-hidden="true" />,
        };
      }),
    [t],
  );

  const runtime = useMemo(
    () => ({ clockApi, playerAvatarUrl, onSubmitTask }),
    [clockApi, playerAvatarUrl, onSubmitTask],
  );

  const components = useMemo(
    () => ({
      workspacePanel: (props: IDockviewPanelProps<WorkspacePanelParams>) => (
        <WorkspacePanel {...props} />
      ),
    }),
    [],
  );

  function handleReady(event: DockviewReadyEvent) {
    apiRef.current = event.api;
    event.api.addPanel(createWorkspacePanelOptions("tasks", t("tabs.tasks")));
  }

  function openTab(id: TabId) {
    const api = apiRef.current;
    if (!api) return;

    const panelId = workspacePanelId(id);
    const existingPanel = api.getPanel(panelId);
    if (existingPanel) {
      existingPanel.api.setActive();
      existingPanel.api.group.api.setActive();
      return;
    }

    api.addPanel(createWorkspacePanelOptions(id, t(`tabs.${id}`)));
  }

  return (
    <section className="df-work">
      <aside className="df-work-explorer" aria-label={t("tabs.workspaceExplorer")}>
        {explorerItems.map(item => (
          <button
            key={item.id}
            type="button"
            className="df-work-explorer-item"
            onClick={() => openTab(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </aside>
      <WorkspaceRuntimeContext.Provider value={runtime}>
        <section className="df-workbench" aria-label={t("tabs.workspaceDesktop")}>
          <DockviewReact
            className="dockview-theme-data-fever"
            components={components}
            onReady={handleReady}
          />
        </section>
      </WorkspaceRuntimeContext.Provider>
    </section>
  );
}

function WorkspacePanel({ params }: WorkspacePanelProps) {
  const runtime = useWorkspaceRuntime();
  const tabId = params.tabId;

  return (
    <Panel className="df-dock-panel" flush={FLUSH_TABS.has(tabId)}>
      {renderPane(tabId, runtime)}
    </Panel>
  );
}

interface RenderPaneProps {
  clockApi: ClockApi;
  playerAvatarUrl?: string;
  onSubmitTask(taskId: string): void | Promise<void>;
}

function renderPane(
  id: TabId,
  { clockApi, playerAvatarUrl, onSubmitTask }: RenderPaneProps,
): ReactNode {
  if (id === "tasks") return <TasksPane onSubmitTask={onSubmitTask} />;
  if (id === "schema") return <SchemaPane />;
  if (id === "docs") return <DocsPane />;
  if (id === "structure") return <StructurePane />;
  if (id === "notes") return <NotesPane />;
  if (id === "calendar") {
    return <CalendarPane clock={clockApi.clock} playerAvatarUrl={playerAvatarUrl} />;
  }
  return <AdminPane clockApi={clockApi} />;
}

function useWorkspaceRuntime(): WorkspaceRuntime {
  const runtime = useContext(WorkspaceRuntimeContext);
  if (!runtime) throw new Error("Workspace runtime context is missing.");
  return runtime;
}

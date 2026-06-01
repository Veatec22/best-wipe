import { expect, test } from "bun:test";
import { createWorkspacePanelOptions } from "./workspaceDockview";

test("workspace panel options create a focusable dockview tab", () => {
  expect(createWorkspacePanelOptions("schema", "Schemat")).toEqual({
    id: "workspace:schema",
    component: "workspacePanel",
    title: "Schemat",
    params: { tabId: "schema" },
  });
});

test("workspace panel options can open beside a reference panel", () => {
  expect(
    createWorkspacePanelOptions("docs", "Dokumentacja", {
      referencePanel: "workspace:schema",
      direction: "right",
    }),
  ).toEqual({
    id: "workspace:docs",
    component: "workspacePanel",
    title: "Dokumentacja",
    params: { tabId: "docs" },
    position: {
      referencePanel: "workspace:schema",
      direction: "right",
    },
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import WorkspacesPage from "@/pages/WorkspacesPage";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";

type RuntimeQueryState = {
  data?: {
    source: "fixture" | "live";
    snapshot: typeof runtimeContractSnapshot;
    error: string | null;
  };
  isPending: boolean;
};

let runtimeQueryState: RuntimeQueryState = {
  data: {
    source: "fixture",
    snapshot: runtimeContractSnapshot,
    error: null,
  },
  isPending: false,
};

vi.mock("@/features/runtime/useRuntimeSnapshot", () => ({
  useRuntimeSnapshot: () => runtimeQueryState,
}));

function renderWorkspaceRoute(initialEntry: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/workspaces",
        element: createElement(WorkspacesPage),
      },
      {
        path: "/workspaces/:workspaceSlug",
        element: createElement(WorkspacesPage),
      },
    ],
    { initialEntries: [initialEntry] },
  );

  const markup = renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n },
      createElement(RouterProvider, {
        router,
      }),
    ),
  );

  return markup;
}

describe("WorkspacesPage", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    runtimeQueryState = {
      data: {
        source: "fixture",
        snapshot: runtimeContractSnapshot,
        error: null,
      },
      isPending: false,
    };
  });

  it("renders the selected workspace review and operator handoff links", () => {
    const markup = renderWorkspaceRoute("/workspaces/hermes-control-center");

    expect(markup).toContain("Hermes Agent Web UI");
    expect(markup).toContain("Workspace review surface");
    expect(markup).toContain("maintainer-safe");
    expect(markup).toContain("Open session review");
    expect(markup).toContain("Open workspace session queue");
    expect(markup).toContain("Open workspace run queue");
    expect(markup).toContain("Open run review");
    expect(markup).toContain("Open workspace approvals queue");
    expect(markup).toContain("Open approval review");
    expect(markup).toContain("/sessions?workspace=hermes-control-center");
    expect(markup).toContain("/runs?workspace=hermes-control-center");
    expect(markup).toContain("/approvals?workspace=hermes-control-center");
    expect(markup).toContain("/sessions/sess-20260413-runtime-contract?workspace=hermes-control-center");
    expect(markup).toContain("/runs/run-runtime-adapter?workspace=hermes-control-center");
    expect(markup).toContain("/approvals/approval-adapter-pr?workspace=hermes-control-center");
  });

  it("auto-selects the canonical workspace on the base route", () => {
    const markup = renderWorkspaceRoute("/workspaces");

    expect(markup).toContain("Current workspace review");
    expect(markup).toContain("Hermes Agent Web UI");
    expect(markup).toContain("laolaoshiren/hermes-control-center");
  });

  it("renders the hydration loading state while runtime data is pending", () => {
    runtimeQueryState = {
      isPending: true,
    };

    const markup = renderWorkspaceRoute("/workspaces");

    expect(markup).toContain("Hydrating live runtime");
    expect(markup).toContain("Loading sessions and replay data from the Hermes backend before rendering route-specific runtime details.");
  });

  it("renders an honest empty state when no workspaces are available", () => {
    runtimeQueryState = {
      data: {
        source: "fixture",
        snapshot: {
          ...runtimeContractSnapshot,
          workspaces: [],
          sessions: [],
          runs: [],
          approvals: [],
          artifacts: [],
          events: [],
        },
        error: "fixture fallback engaged",
      },
      isPending: false,
    };

    const markup = renderWorkspaceRoute("/workspaces");

    expect(markup).toContain("No workspaces available yet");
    expect(markup).toContain("fixture fallback engaged");
  });
});

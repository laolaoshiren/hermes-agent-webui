import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import RunsPage from "@/pages/RunsPage";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";

const multiWorkspaceSnapshot = {
  ...runtimeContractSnapshot,
  workspaces: [
    ...runtimeContractSnapshot.workspaces,
    {
      id: "ws-customer-support",
      name: "Customer Support",
      slug: "customer-support",
      status: "active" as const,
      repository: {
        provider: "github" as const,
        owner: "laolaoshiren",
        name: "support-ops",
        url: "https://github.com/laolaoshiren/support-ops",
      },
      defaultBranch: "main",
      policyPreset: "support-safe",
      activeRunCount: 0,
      updatedAt: "2026-04-13T09:05:00Z",
    },
  ],
  sessions: [
    ...runtimeContractSnapshot.sessions,
    {
      ...runtimeContractSnapshot.sessions[0],
      id: "sess-customer-support",
      workspaceId: "ws-customer-support",
      title: "Customer support automation queue",
      runIds: ["run-customer-support-triage"],
      approvalIds: [],
      artifactIds: [],
      lastActiveAt: "2026-04-13T09:05:00Z",
    },
  ],
  runs: [
    ...runtimeContractSnapshot.runs,
    {
      ...runtimeContractSnapshot.runs[0],
      id: "run-customer-support-triage",
      sessionId: "sess-customer-support",
      workspaceId: "ws-customer-support",
      title: "Triage support backlog",
      summary: "Prioritize the support automation queue.",
      status: "queued" as const,
      approvalIds: [],
      artifactIds: [],
      eventCount: 0,
    },
  ],
  approvals: runtimeContractSnapshot.approvals.filter((approval) => approval.runId !== "run-customer-support-triage"),
  artifacts: runtimeContractSnapshot.artifacts.filter((artifact) => artifact.runId !== "run-customer-support-triage"),
  events: runtimeContractSnapshot.events.filter((event) => event.runId !== "run-customer-support-triage"),
};

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
    snapshot: multiWorkspaceSnapshot,
    error: null,
  },
  isPending: false,
};

vi.mock("@/features/runtime/useRuntimeSnapshot", () => ({
  useRuntimeSnapshot: () => runtimeQueryState,
}));

function createRunsRouter(initialEntry: string) {
  return createMemoryRouter(
    [
      {
        path: "/runs",
        element: createElement(RunsPage),
      },
      {
        path: "/runs/:runId",
        element: createElement(RunsPage),
      },
    ],
    { initialEntries: [initialEntry] },
  );
}

function renderRunsRoute(initialEntry: string) {
  const router = createRunsRouter(initialEntry);
  const markup = renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n },
      createElement(RouterProvider, { router }),
    ),
  );

  return { markup, router };
}

describe("RunsPage workspace filter", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    runtimeQueryState = {
      data: {
        source: "fixture",
        snapshot: multiWorkspaceSnapshot,
        error: null,
      },
      isPending: false,
    };
  });

  it("renders only workspace-scoped runs when a workspace filter is present", () => {
    const { markup } = renderRunsRoute("/runs?workspace=customer-support");

    expect(markup).toContain("Workspace-scoped queue");
    expect(markup).toContain("Customer Support");
    expect(markup).toContain("Triage support backlog");
    expect(markup).toContain("/workspaces/customer-support");
    expect(markup).not.toContain("Scaffold runtime adapter seam");
  });

  it("keeps selected-run links inside the active workspace scope", () => {
    const { markup } = renderRunsRoute("/runs?workspace=customer-support");

    expect(markup).toContain("/runs/run-customer-support-triage?workspace=customer-support");
  });

  it("preserves workspace scope on a deep-linked run review", () => {
    const { markup } = renderRunsRoute("/runs/run-customer-support-triage?workspace=customer-support");

    expect(markup).toContain("Workspace-scoped queue");
    expect(markup).toContain("Triage support backlog");
    expect(markup).toContain("/workspaces/customer-support");
  });

  it("falls back to the global queue when no workspace filter is present", () => {
    const { markup } = renderRunsRoute("/runs");

    expect(markup).toContain("Scaffold runtime adapter seam");
    expect(markup).toContain("Triage support backlog");
    expect(markup).not.toContain("Workspace-scoped queue");
  });
});

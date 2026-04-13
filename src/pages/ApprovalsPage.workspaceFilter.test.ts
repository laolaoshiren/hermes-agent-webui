import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import ApprovalsPage from "@/pages/ApprovalsPage";
import { getScopedApprovalReviewWorkspaceSlug } from "@/pages/approvalReviewHandoff";
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
      activeRunCount: 1,
      updatedAt: "2026-04-13T09:10:00Z",
    },
  ],
  sessions: [
    ...runtimeContractSnapshot.sessions,
    {
      ...runtimeContractSnapshot.sessions[0],
      id: "sess-customer-support",
      workspaceId: "ws-customer-support",
      title: "Customer support automation queue",
      preview: "Approve hosted help center access before starting triage.",
      runIds: ["run-customer-support-triage"],
      lastActiveAt: "2026-04-13T09:10:00Z",
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
      status: "awaiting_approval" as const,
      approvalIds: ["approval-customer-support-network"],
      artifactIds: [],
      eventCount: 1,
    },
  ],
  approvals: [
    ...runtimeContractSnapshot.approvals,
    {
      ...runtimeContractSnapshot.approvals[0],
      id: "approval-customer-support-network",
      runId: "run-customer-support-triage",
      title: "Approve support network access",
      reason: "Allow the support triage agent to inspect hosted help center data.",
      requestedBy: "support-ops-bot",
      requestedAt: "2026-04-13T09:08:00Z",
      expiresAt: "2026-04-13T18:00:00Z",
      reviewer: null,
      resolutionNote: null,
    },
  ],
  artifacts: runtimeContractSnapshot.artifacts.filter((artifact) => artifact.runId !== "run-customer-support-triage"),
  events: [
    ...runtimeContractSnapshot.events,
    {
      ...runtimeContractSnapshot.events[0],
      id: "evt-customer-support-network",
      runId: "run-customer-support-triage",
      title: "Support queue prepared",
      detail: "The support workspace is waiting for approval before fetching hosted data.",
      approvalId: "approval-customer-support-network",
      artifactId: null,
      timestamp: "2026-04-13T09:09:00Z",
    },
  ],
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

function createApprovalsRouter(initialEntry: string) {
  return createMemoryRouter(
    [
      {
        path: "/approvals",
        element: createElement(ApprovalsPage),
      },
      {
        path: "/approvals/:approvalId",
        element: createElement(ApprovalsPage),
      },
    ],
    { initialEntries: [initialEntry] },
  );
}

function renderApprovalsRoute(initialEntry: string) {
  const router = createApprovalsRouter(initialEntry);
  const markup = renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n },
      createElement(RouterProvider, { router }),
    ),
  );

  return { markup, router };
}

describe("ApprovalsPage workspace filter", () => {
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

  it("renders only workspace-scoped approvals when a workspace filter is present", () => {
    const { markup } = renderApprovalsRoute("/approvals?workspace=customer-support");

    expect(markup).toContain("Workspace-scoped approvals");
    expect(markup).toContain("Customer Support");
    expect(markup).toContain("Approve support network access");
    expect(markup).toContain("Open workspace review");
    expect(markup).toContain("/workspaces/customer-support");
    expect(markup).not.toContain("Review runtime adapter PR");
  });

  it("preserves workspace scope on a deep-linked approval review", () => {
    const { markup } = renderApprovalsRoute("/approvals/approval-customer-support-network?workspace=customer-support");

    expect(markup).toContain("Workspace-scoped approvals");
    expect(markup).toContain("/runs/run-customer-support-triage?workspace=customer-support");
    expect(markup).toContain("/sessions/sess-customer-support?workspace=customer-support");
    expect(markup).toContain("Customer support automation queue");
    expect(markup).toContain("Replay events");
  });

  it("only preserves scoped approval handoff when the related run belongs to the active workspace", () => {
    expect(getScopedApprovalReviewWorkspaceSlug("ws-customer-support", "customer-support", "ws-customer-support")).toBe(
      "customer-support",
    );
    expect(getScopedApprovalReviewWorkspaceSlug("ws-customer-support", "customer-support", "ws-hcc")).toBeNull();
    expect(getScopedApprovalReviewWorkspaceSlug(null, "customer-support", "ws-customer-support")).toBeNull();
  });

  it("clears invalid workspace filters instead of rendering mismatched approval data", () => {
    const { markup, router } = renderApprovalsRoute("/approvals?workspace=missing-workspace");

    expect(router.state.location.pathname).toBe("/approvals");
    expect(markup).not.toContain("Workspace-scoped approvals");
    expect(markup).not.toContain("Customer Support");
  });

  it("falls back to the global queue when no workspace filter is present", () => {
    const { markup } = renderApprovalsRoute("/approvals");

    expect(markup).toContain("Open adapter scaffolding increment for review");
    expect(markup).toContain("Approve support network access");
    expect(markup).toContain("/runs/run-runtime-adapter");
    expect(markup).not.toContain("/runs/run-runtime-adapter?workspace=hermes-control-center");
    expect(markup).not.toContain("Workspace-scoped approvals");
  });
});

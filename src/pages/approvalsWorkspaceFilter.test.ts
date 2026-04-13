import { describe, expect, it } from "vitest";

import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { deriveApprovalsWorkspaceFilterState } from "@/pages/approvalsWorkspaceFilter";

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

describe("deriveApprovalsWorkspaceFilterState", () => {
  it("returns workspace-scoped approvals when a valid workspace slug is present", () => {
    const state = deriveApprovalsWorkspaceFilterState(multiWorkspaceSnapshot, "customer-support");

    expect(state.selectedWorkspace?.slug).toBe("customer-support");
    expect(state.shouldClearInvalidWorkspace).toBe(false);
    expect(state.filteredApprovals.map((approval) => approval.id)).toEqual(["approval-customer-support-network"]);
  });

  it("marks invalid workspace filters for clearing", () => {
    const state = deriveApprovalsWorkspaceFilterState(multiWorkspaceSnapshot, "missing-workspace");

    expect(state.selectedWorkspace).toBeNull();
    expect(state.shouldClearInvalidWorkspace).toBe(true);
    expect(state.filteredApprovals).toEqual(multiWorkspaceSnapshot.approvals);
  });

  it("returns the global approvals queue when no workspace filter is present", () => {
    const state = deriveApprovalsWorkspaceFilterState(multiWorkspaceSnapshot, null);

    expect(state.selectedWorkspace).toBeNull();
    expect(state.shouldClearInvalidWorkspace).toBe(false);
    expect(state.filteredApprovals).toEqual(multiWorkspaceSnapshot.approvals);
  });
});

import { describe, expect, it } from "vitest";

import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { deriveRunsWorkspaceFilterState } from "@/pages/runsWorkspaceFilter";

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
};

describe("deriveRunsWorkspaceFilterState", () => {
  it("returns workspace-scoped runs and canonical slug when a valid workspace slug is provided", () => {
    const state = deriveRunsWorkspaceFilterState(multiWorkspaceSnapshot, "customer-support");

    expect(state.selectedWorkspace?.slug).toBe("customer-support");
    expect(state.filteredRuns.map((run) => run.id)).toEqual(["run-customer-support-triage"]);
    expect(state.shouldClearInvalidWorkspace).toBe(false);
  });

  it("marks invalid workspace filters for clearing and falls back to the full run queue", () => {
    const state = deriveRunsWorkspaceFilterState(multiWorkspaceSnapshot, "missing-workspace");

    expect(state.selectedWorkspace).toBeNull();
    expect(state.shouldClearInvalidWorkspace).toBe(true);
    expect(state.filteredRuns).toEqual(multiWorkspaceSnapshot.runs);
  });

  it("returns the unfiltered run queue when no workspace filter is provided", () => {
    const state = deriveRunsWorkspaceFilterState(multiWorkspaceSnapshot, null);

    expect(state.selectedWorkspace).toBeNull();
    expect(state.filteredRuns).toEqual(multiWorkspaceSnapshot.runs);
  });
});

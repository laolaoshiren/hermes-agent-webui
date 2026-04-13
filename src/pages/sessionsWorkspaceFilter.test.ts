import { describe, expect, it } from "vitest";

import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { deriveSessionsWorkspaceFilter } from "@/pages/sessionsWorkspaceFilter";

describe("deriveSessionsWorkspaceFilter", () => {
  it("filters sessions to the selected workspace", () => {
    const state = deriveSessionsWorkspaceFilter(runtimeContractSnapshot, "hermes-control-center");

    expect(state.selectedWorkspace?.slug).toBe("hermes-control-center");
    expect(state.filteredSessions.every((session) => session.workspaceId === "ws-hcc")).toBe(true);
    expect(state.shouldClearInvalidWorkspace).toBe(false);
  });

  it("marks invalid workspace filters for clearing and falls back to the full session list", () => {
    const state = deriveSessionsWorkspaceFilter(runtimeContractSnapshot, "missing-workspace");

    expect(state.selectedWorkspace).toBeNull();
    expect(state.shouldClearInvalidWorkspace).toBe(true);
    expect(state.filteredSessions).toEqual(runtimeContractSnapshot.sessions);
  });

  it("returns the unfiltered session list when no workspace filter is provided", () => {
    const state = deriveSessionsWorkspaceFilter(runtimeContractSnapshot, null);

    expect(state.selectedWorkspace).toBeNull();
    expect(state.shouldClearInvalidWorkspace).toBe(false);
    expect(state.filteredSessions).toEqual(runtimeContractSnapshot.sessions);
  });
});

import { getSessionsForWorkspace, getWorkspaceBySlug } from "@/features/runtime/selectors";
import type { RuntimeContractSnapshot, SessionSummary, WorkspaceSummary } from "@/features/runtime/types";

export interface SessionsWorkspaceFilterState {
  selectedWorkspace: WorkspaceSummary | null;
  filteredSessions: SessionSummary[];
  shouldClearInvalidWorkspace: boolean;
}

export function deriveSessionsWorkspaceFilter(
  snapshot: RuntimeContractSnapshot,
  workspaceSlug: string | null | undefined,
): SessionsWorkspaceFilterState {
  const selectedWorkspace = workspaceSlug ? getWorkspaceBySlug(snapshot, workspaceSlug) : null;

  return {
    selectedWorkspace,
    filteredSessions: selectedWorkspace ? getSessionsForWorkspace(snapshot, selectedWorkspace.id) : snapshot.sessions,
    shouldClearInvalidWorkspace: Boolean(workspaceSlug && !selectedWorkspace),
  };
}

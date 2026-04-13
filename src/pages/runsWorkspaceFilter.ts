import { getRunsForWorkspace, getWorkspaceBySlug } from "@/features/runtime/selectors";
import type { RunSummary, RuntimeContractSnapshot, WorkspaceSummary } from "@/features/runtime/types";

export interface RunsWorkspaceFilterState {
  selectedWorkspace: WorkspaceSummary | null;
  shouldClearInvalidWorkspace: boolean;
  filteredRuns: RunSummary[];
}

export function deriveRunsWorkspaceFilterState(
  snapshot: RuntimeContractSnapshot,
  workspaceSlug: string | null | undefined,
): RunsWorkspaceFilterState {
  const selectedWorkspace = workspaceSlug ? getWorkspaceBySlug(snapshot, workspaceSlug) : null;

  return {
    selectedWorkspace,
    shouldClearInvalidWorkspace: Boolean(workspaceSlug && !selectedWorkspace),
    filteredRuns: selectedWorkspace ? getRunsForWorkspace(snapshot, selectedWorkspace.id) : snapshot.runs,
  };
}

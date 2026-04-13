import { getApprovalsForWorkspace, getWorkspaceBySlug } from "@/features/runtime/selectors";
import type { ApprovalSummary, RuntimeContractSnapshot, WorkspaceSummary } from "@/features/runtime/types";

export interface ApprovalsWorkspaceFilterState {
  selectedWorkspace: WorkspaceSummary | null;
  shouldClearInvalidWorkspace: boolean;
  filteredApprovals: ApprovalSummary[];
}

export function deriveApprovalsWorkspaceFilterState(
  snapshot: RuntimeContractSnapshot,
  workspaceSlug: string | null | undefined,
): ApprovalsWorkspaceFilterState {
  const selectedWorkspace = workspaceSlug ? getWorkspaceBySlug(snapshot, workspaceSlug) : null;

  return {
    selectedWorkspace,
    shouldClearInvalidWorkspace: Boolean(workspaceSlug && !selectedWorkspace),
    filteredApprovals: selectedWorkspace ? getApprovalsForWorkspace(snapshot, selectedWorkspace.id) : snapshot.approvals,
  };
}

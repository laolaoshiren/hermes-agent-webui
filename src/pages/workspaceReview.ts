import {
  getApprovalsForWorkspace,
  getArtifactsForWorkspace,
  getDefaultWorkspace,
  getRunsForWorkspace,
  getSessionsForWorkspace,
  getWorkspaceById,
  getWorkspaceBySlug,
} from "@/features/runtime/selectors";
import type {
  ApprovalSummary,
  RunStatus,
  RunSummary,
  RuntimeContractSnapshot,
  SessionSummary,
  WorkspaceSummary,
} from "@/features/runtime/types";

export interface WorkspaceReviewMetrics {
  sessions: number;
  runs: number;
  activeRuns: number;
  pendingApprovals: number;
  artifacts: number;
  latestActivityAt: string | null;
}

export interface WorkspaceReviewState {
  selectedWorkspace: WorkspaceSummary | null;
  canonicalWorkspaceSlug: string | null;
  shouldRedirectToCanonical: boolean;
  sessions: SessionSummary[];
  runs: RunSummary[];
  approvals: ApprovalSummary[];
  primarySession: SessionSummary | null;
  primaryRun: RunSummary | null;
  primaryApproval: ApprovalSummary | null;
  metrics: WorkspaceReviewMetrics;
}

function getRunPriority(status: RunStatus) {
  switch (status) {
    case "running":
      return 0;
    case "awaiting_approval":
      return 1;
    case "queued":
      return 2;
    case "completed":
      return 3;
    case "failed":
      return 4;
    default:
      return 5;
  }
}

function getLatestTimestamp(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function choosePrimaryRun(runs: RunSummary[]) {
  return [...runs].sort((left, right) => {
    const priorityDelta = getRunPriority(left.status) - getRunPriority(right.status);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return right.startedAt.localeCompare(left.startedAt);
  })[0] ?? null;
}

function choosePrimarySession(sessions: SessionSummary[], primaryRun: RunSummary | null) {
  if (primaryRun) {
    return sessions.find((session) => session.id === primaryRun.sessionId) ?? null;
  }

  return [...sessions].sort((left, right) => right.lastActiveAt.localeCompare(left.lastActiveAt))[0] ?? null;
}

function choosePrimaryApproval(approvals: ApprovalSummary[], primaryRun: RunSummary | null) {
  const prioritized = [...approvals].sort((left, right) => {
    if (left.status === "pending" && right.status !== "pending") {
      return -1;
    }

    if (left.status !== "pending" && right.status === "pending") {
      return 1;
    }

    if (primaryRun) {
      if (left.runId === primaryRun.id && right.runId !== primaryRun.id) {
        return -1;
      }

      if (left.runId !== primaryRun.id && right.runId === primaryRun.id) {
        return 1;
      }
    }

    return right.requestedAt.localeCompare(left.requestedAt);
  });

  return prioritized[0] ?? null;
}

export function deriveWorkspaceMetrics(snapshot: RuntimeContractSnapshot, workspaceId: string): WorkspaceReviewMetrics {
  const sessions = getSessionsForWorkspace(snapshot, workspaceId);
  const runs = getRunsForWorkspace(snapshot, workspaceId);
  const approvals = getApprovalsForWorkspace(snapshot, workspaceId);
  const artifacts = getArtifactsForWorkspace(snapshot, workspaceId);
  const workspace = getWorkspaceById(snapshot, workspaceId);
  const runIds = new Set(runs.map((run) => run.id));
  const events = snapshot.events.filter((event) => runIds.has(event.runId));

  return {
    sessions: sessions.length,
    runs: runs.length,
    activeRuns: runs.filter((run) => run.status === "running" || run.status === "awaiting_approval").length,
    pendingApprovals: approvals.filter((approval) => approval.status === "pending").length,
    artifacts: artifacts.length,
    latestActivityAt: getLatestTimestamp([
      workspace?.updatedAt,
      ...sessions.map((session) => session.lastActiveAt),
      ...runs.map((run) => run.endedAt ?? run.startedAt),
      ...approvals.map((approval) => approval.requestedAt),
      ...artifacts.map((artifact) => artifact.createdAt),
      ...events.map((event) => event.timestamp),
    ]),
  };
}

export function deriveWorkspaceReview(
  snapshot: RuntimeContractSnapshot,
  selectedWorkspaceSlug: string | null | undefined,
): WorkspaceReviewState {
  const defaultWorkspace = getDefaultWorkspace(snapshot);
  const matchedWorkspace = selectedWorkspaceSlug ? getWorkspaceBySlug(snapshot, selectedWorkspaceSlug) : null;
  const selectedWorkspace = matchedWorkspace ?? defaultWorkspace;
  const canonicalWorkspaceSlug = selectedWorkspace?.slug ?? null;
  const sessions = selectedWorkspace ? getSessionsForWorkspace(snapshot, selectedWorkspace.id) : [];
  const runs = selectedWorkspace ? getRunsForWorkspace(snapshot, selectedWorkspace.id) : [];
  const approvals = selectedWorkspace ? getApprovalsForWorkspace(snapshot, selectedWorkspace.id) : [];
  const primaryRun = choosePrimaryRun(runs);
  const primarySession = choosePrimarySession(sessions, primaryRun);
  const primaryApproval = choosePrimaryApproval(approvals, primaryRun);

  return {
    selectedWorkspace,
    canonicalWorkspaceSlug,
    shouldRedirectToCanonical: Boolean(selectedWorkspaceSlug && canonicalWorkspaceSlug && selectedWorkspaceSlug !== canonicalWorkspaceSlug),
    sessions,
    runs,
    approvals,
    primarySession,
    primaryRun,
    primaryApproval,
    metrics: selectedWorkspace
      ? deriveWorkspaceMetrics(snapshot, selectedWorkspace.id)
      : {
          sessions: 0,
          runs: 0,
          activeRuns: 0,
          pendingApprovals: 0,
          artifacts: 0,
          latestActivityAt: null,
        },
  };
}

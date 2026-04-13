import type {
  ApprovalSummary,
  ArtifactSummary,
  RunSummary,
  RunTimelineEvent,
  RuntimeContractSnapshot,
  SessionSummary,
  WorkspaceSummary,
} from "@/features/runtime/types";

export function getDefaultWorkspace(snapshot: RuntimeContractSnapshot): WorkspaceSummary | null {
  return snapshot.workspaces.find((workspace) => workspace.status === "active") ?? snapshot.workspaces[0] ?? null;
}

export function getWorkspaceById(snapshot: RuntimeContractSnapshot, workspaceId: string): WorkspaceSummary | null {
  return snapshot.workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
}

export function getWorkspaceBySlug(snapshot: RuntimeContractSnapshot, workspaceSlug: string): WorkspaceSummary | null {
  return snapshot.workspaces.find((workspace) => workspace.slug === workspaceSlug) ?? null;
}

export function getSessionsForWorkspace(snapshot: RuntimeContractSnapshot, workspaceId: string): SessionSummary[] {
  return snapshot.sessions.filter((session) => session.workspaceId === workspaceId);
}

export function getRunsForWorkspace(snapshot: RuntimeContractSnapshot, workspaceId: string): RunSummary[] {
  return snapshot.runs.filter((run) => run.workspaceId === workspaceId);
}

export function getApprovalsForWorkspace(snapshot: RuntimeContractSnapshot, workspaceId: string): ApprovalSummary[] {
  const runIds = new Set(getRunsForWorkspace(snapshot, workspaceId).map((run) => run.id));
  return snapshot.approvals.filter((approval) => runIds.has(approval.runId));
}

export function getArtifactsForWorkspace(snapshot: RuntimeContractSnapshot, workspaceId: string): ArtifactSummary[] {
  const runIds = new Set(getRunsForWorkspace(snapshot, workspaceId).map((run) => run.id));
  return snapshot.artifacts.filter((artifact) => runIds.has(artifact.runId));
}

export function getDefaultRun(snapshot: RuntimeContractSnapshot): RunSummary | null {
  return snapshot.runs.find((run) => run.status === "running") ?? snapshot.runs[0] ?? null;
}

export function getRunById(snapshot: RuntimeContractSnapshot, runId: string): RunSummary | null {
  return snapshot.runs.find((run) => run.id === runId) ?? null;
}

export function getDefaultApproval(snapshot: RuntimeContractSnapshot): ApprovalSummary | null {
  return snapshot.approvals.find((approval) => approval.status === "pending") ?? snapshot.approvals[0] ?? null;
}

export function getApprovalById(snapshot: RuntimeContractSnapshot, approvalId: string): ApprovalSummary | null {
  return snapshot.approvals.find((approval) => approval.id === approvalId) ?? null;
}

export function getTimelineForRun(snapshot: RuntimeContractSnapshot, runId: string): RunTimelineEvent[] {
  return snapshot.events
    .filter((event) => event.runId === runId)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function getApprovalsForRun(snapshot: RuntimeContractSnapshot, runId: string): ApprovalSummary[] {
  return snapshot.approvals.filter((approval) => approval.runId === runId);
}

export function getArtifactsForRun(snapshot: RuntimeContractSnapshot, runId: string): ArtifactSummary[] {
  return snapshot.artifacts.filter((artifact) => artifact.runId === runId);
}

export function getRuntimeCounts(snapshot: RuntimeContractSnapshot) {
  return {
    workspaces: snapshot.workspaces.length,
    sessions: snapshot.sessions.length,
    runs: snapshot.runs.length,
    activeRuns: snapshot.runs.filter((run) => run.status === "running" || run.status === "awaiting_approval").length,
    pendingApprovals: snapshot.approvals.filter((approval) => approval.status === "pending").length,
    events: snapshot.events.length,
    artifacts: snapshot.artifacts.length,
  };
}

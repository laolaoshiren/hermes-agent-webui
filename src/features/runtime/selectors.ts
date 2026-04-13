import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import type {
  ApprovalSummary,
  ArtifactSummary,
  RunSummary,
  RunTimelineEvent,
  RuntimeContractSnapshot,
} from "@/features/runtime/types";

function getSnapshot(): RuntimeContractSnapshot {
  return runtimeContractSnapshot;
}

export function getDefaultRun(): RunSummary | null {
  const snapshot = getSnapshot();
  return snapshot.runs.find((run) => run.status === "running") ?? snapshot.runs[0];
}

export function getRunById(runId: string): RunSummary | null {
  return getSnapshot().runs.find((run) => run.id === runId) ?? null;
}

export function getApprovalById(approvalId: string): ApprovalSummary | null {
  return getSnapshot().approvals.find((approval) => approval.id === approvalId) ?? null;
}

export function getTimelineForRun(runId: string): RunTimelineEvent[] {
  return getSnapshot()
    .events.filter((event) => event.runId === runId)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function getApprovalsForRun(runId: string): ApprovalSummary[] {
  return getSnapshot().approvals.filter((approval) => approval.runId === runId);
}

export function getArtifactsForRun(runId: string): ArtifactSummary[] {
  return getSnapshot().artifacts.filter((artifact) => artifact.runId === runId);
}

export function getRuntimeCounts() {
  const snapshot = getSnapshot();

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

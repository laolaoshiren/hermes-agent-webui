import type { SessionInfo } from "@/lib/api";
import type { RuntimeContractSnapshot, RunStatus, RunSummary, SessionSummary } from "@/features/runtime/types";

export interface SessionReviewMetrics {
  messages: number;
  toolCalls: number;
  linkedRuns: number;
  timelineEvents: number;
  approvals: number;
  artifacts: number;
}

export interface SessionReviewState {
  selectedSession: SessionInfo | null;
  runtimeSession: SessionSummary | null;
  relatedRun: RunSummary | null;
  canonicalSessionId: string | null;
  shouldRedirectToCanonical: boolean;
  metrics: SessionReviewMetrics;
}

export function getDefaultSession(sessions: SessionInfo[]): SessionInfo | null {
  return sessions.find((session) => session.is_active) ?? sessions[0] ?? null;
}

function getVisibleSessions(sessions: SessionInfo[], visibleSessionIds?: Iterable<string>) {
  if (!visibleSessionIds) {
    return sessions;
  }

  const visibleIds = new Set(visibleSessionIds);
  return sessions.filter((session) => visibleIds.has(session.id));
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

function chooseRelatedRun(snapshot: RuntimeContractSnapshot, runtimeSession: SessionSummary | null, selectedSession: SessionInfo | null) {
  const relatedRuns = runtimeSession?.runIds.length
    ? runtimeSession.runIds
        .map((runId) => snapshot.runs.find((run) => run.id === runId) ?? null)
        .filter((run): run is RunSummary => run !== null)
    : selectedSession
      ? snapshot.runs.filter((run) => run.sessionId === selectedSession.id)
      : [];

  return relatedRuns.sort((left, right) => {
    const priorityDelta = getRunPriority(left.status) - getRunPriority(right.status);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return right.startedAt.localeCompare(left.startedAt);
  })[0] ?? null;
}

export function deriveSessionReview(
  sessions: SessionInfo[],
  snapshot: RuntimeContractSnapshot,
  selectedSessionId: string | null | undefined,
  visibleSessionIds?: Iterable<string>,
): SessionReviewState {
  const visibleSessions = getVisibleSessions(sessions, visibleSessionIds);
  const matchedSession = selectedSessionId ? visibleSessions.find((session) => session.id === selectedSessionId) ?? null : null;
  const selectedSession = matchedSession ?? getDefaultSession(visibleSessions);
  const runtimeSession = selectedSession ? snapshot.sessions.find((session) => session.id === selectedSession.id) ?? null : null;
  const relatedRun = chooseRelatedRun(snapshot, runtimeSession, selectedSession);
  const canonicalSessionId = selectedSession?.id ?? null;

  return {
    selectedSession,
    runtimeSession,
    relatedRun,
    canonicalSessionId,
    shouldRedirectToCanonical: Boolean(selectedSessionId && canonicalSessionId && selectedSessionId !== canonicalSessionId),
    metrics: {
      messages: selectedSession?.message_count ?? 0,
      toolCalls: selectedSession?.tool_call_count ?? 0,
      linkedRuns: runtimeSession?.runIds.length ?? (relatedRun ? 1 : 0),
      timelineEvents: relatedRun ? snapshot.events.filter((event) => event.runId === relatedRun.id).length : 0,
      approvals: relatedRun ? snapshot.approvals.filter((approval) => approval.runId === relatedRun.id).length : 0,
      artifacts: relatedRun ? snapshot.artifacts.filter((artifact) => artifact.runId === relatedRun.id).length : 0,
    },
  };
}

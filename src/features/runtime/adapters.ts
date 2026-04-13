import type { SessionMessage } from "@/lib/api";
import type {
  ArtifactSummary,
  ApprovalSummary,
  RunSummary,
  RunTimelineEvent,
  RuntimeContractSnapshot,
  SessionSummary,
  WorkspaceSummary,
} from "@/features/runtime/types";
import type {
  RuntimeAdapterSource,
  RuntimeArtifactSource,
  RuntimeApprovalSource,
  RuntimeRunSource,
  RuntimeSessionSource,
  RuntimeTimelineEventSource,
  RuntimeWorkspaceSource,
} from "@/features/runtime/adapterTypes";

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function unixSecondsToIso(value: number | null | undefined): string | null {
  if (typeof value !== "number") {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function normalizeIsoTimestamp(value: string | null, label: string): string | null {
  if (value === null) {
    return null;
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Runtime contract invariant failed: invalid timestamp for ${label}`);
  }

  return new Date(parsed).toISOString();
}

function getSessionPreview(messages: SessionMessage[], fallback: string | null): string | null {
  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }

  const lastTextMessage = [...messages]
    .reverse()
    .find(
      (message) =>
        (message.role === "user" || message.role === "assistant") && typeof message.content === "string" && message.content.trim().length > 0,
    );

  return lastTextMessage?.content?.trim() ?? null;
}

function buildWorkspaces(source: RuntimeAdapterSource, runs: RuntimeRunSource[]): WorkspaceSummary[] {
  return source.workspaces.map((workspace: RuntimeWorkspaceSource) => ({
    ...workspace,
    activeRunCount: runs.filter(
      (run) => run.workspaceId === workspace.id && (run.status === "running" || run.status === "awaiting_approval"),
    ).length,
  }));
}

function buildApprovals(source: RuntimeAdapterSource): ApprovalSummary[] {
  return source.approvals.map((approval: RuntimeApprovalSource) => ({
    ...approval,
    requestedAt: normalizeIsoTimestamp(approval.requestedAt, `approval ${approval.id} requestedAt`) ?? new Date(0).toISOString(),
    expiresAt: normalizeIsoTimestamp(approval.expiresAt, `approval ${approval.id} expiresAt`),
  }));
}

function buildArtifacts(source: RuntimeAdapterSource): ArtifactSummary[] {
  return source.artifacts.map((artifact: RuntimeArtifactSource) => ({
    ...artifact,
    createdAt: normalizeIsoTimestamp(artifact.createdAt, `artifact ${artifact.id} createdAt`) ?? new Date(0).toISOString(),
  }));
}

function buildEvents(source: RuntimeAdapterSource): RunTimelineEvent[] {
  return source.events
    .map((event: RuntimeTimelineEventSource) => ({
      ...event,
      timestamp: normalizeIsoTimestamp(event.timestamp, `event ${event.id} timestamp`) ?? new Date(0).toISOString(),
    }))
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
}

function buildRuns(
  source: RuntimeAdapterSource,
  approvals: ApprovalSummary[],
  artifacts: ArtifactSummary[],
  events: RunTimelineEvent[],
): RunSummary[] {
  return source.runs.map((run: RuntimeRunSource) => ({
    ...run,
    startedAt: normalizeIsoTimestamp(run.startedAt, `run ${run.id} startedAt`) ?? new Date(0).toISOString(),
    endedAt: normalizeIsoTimestamp(run.endedAt, `run ${run.id} endedAt`),
    approvalIds: approvals.filter((approval) => approval.runId === run.id).map((approval) => approval.id),
    artifactIds: artifacts.filter((artifact) => artifact.runId === run.id).map((artifact) => artifact.id),
    eventCount: events.filter((event) => event.runId === run.id).length,
  }));
}

function buildSessions(source: RuntimeAdapterSource, runs: RunSummary[]): SessionSummary[] {
  const runsBySessionId = new Map<string, RunSummary[]>();

  for (const run of runs) {
    const existing = runsBySessionId.get(run.sessionId) ?? [];
    existing.push(run);
    runsBySessionId.set(run.sessionId, existing);
  }

  return source.sessionSources.map((sessionSource: RuntimeSessionSource) => {
    const { session, messages, workspaceId = null } = sessionSource;
    const sessionRuns = runsBySessionId.get(session.id) ?? [];
    const derivedWorkspaceIds = dedupe(sessionRuns.map((run) => run.workspaceId).filter((value): value is string => value !== null));
    const resolvedWorkspaceId = workspaceId ?? derivedWorkspaceIds[0] ?? null;

    if (derivedWorkspaceIds.length > 1) {
      throw new Error(`Runtime contract invariant failed: session ${session.id} spans multiple workspaces`);
    }

    if (workspaceId && derivedWorkspaceIds.length === 1 && workspaceId !== derivedWorkspaceIds[0]) {
      throw new Error(`Runtime contract invariant failed: session ${session.id} workspace ${workspaceId} does not match run workspace ${derivedWorkspaceIds[0]}`);
    }

    return {
      id: session.id,
      workspaceId: resolvedWorkspaceId,
      title: session.title,
      source: session.source,
      model: session.model,
      startedAt: unixSecondsToIso(session.started_at) ?? new Date(0).toISOString(),
      lastActiveAt: unixSecondsToIso(session.last_active) ?? unixSecondsToIso(session.started_at) ?? new Date(0).toISOString(),
      messageCount: session.message_count,
      runIds: dedupe(sessionRuns.map((run) => run.id)),
      preview: getSessionPreview(messages, session.preview),
    };
  });
}

function assertUniqueIds(values: string[], label: string) {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`Runtime contract invariant failed: duplicate ${label} id ${value}`);
    }

    seen.add(value);
  }
}

function validateSnapshot(snapshot: RuntimeContractSnapshot) {
  assertUniqueIds(snapshot.workspaces.map((workspace) => workspace.id), "workspace");
  assertUniqueIds(snapshot.sessions.map((session) => session.id), "session");
  assertUniqueIds(snapshot.runs.map((run) => run.id), "run");
  assertUniqueIds(snapshot.approvals.map((approval) => approval.id), "approval");
  assertUniqueIds(snapshot.artifacts.map((artifact) => artifact.id), "artifact");
  assertUniqueIds(snapshot.events.map((event) => event.id), "event");

  const runIds = new Set(snapshot.runs.map((run) => run.id));
  const sessionIds = new Set(snapshot.sessions.map((session) => session.id));
  const workspaceIds = new Set(snapshot.workspaces.map((workspace) => workspace.id));
  const sessionsById = new Map<string, SessionSummary>(snapshot.sessions.map((session) => [session.id, session]));
  const approvalsById = new Map<string, ApprovalSummary>(snapshot.approvals.map((approval) => [approval.id, approval]));
  const artifactsById = new Map<string, ArtifactSummary>(snapshot.artifacts.map((artifact) => [artifact.id, artifact]));
  const approvalsByRun = new Map<string, string[]>();
  const artifactsByRun = new Map<string, string[]>();
  const eventsByRun = new Map<string, number>();

  for (const session of snapshot.sessions) {
    if (session.workspaceId && !workspaceIds.has(session.workspaceId)) {
      throw new Error(`Runtime contract invariant failed: missing workspace ${session.workspaceId} for session ${session.id}`);
    }
  }

  for (const run of snapshot.runs) {
    const session = sessionsById.get(run.sessionId);

    if (!sessionIds.has(run.sessionId)) {
      throw new Error(`Runtime contract invariant failed: missing session ${run.sessionId} for run ${run.id}`);
    }

    if (run.workspaceId && !workspaceIds.has(run.workspaceId)) {
      throw new Error(`Runtime contract invariant failed: missing workspace ${run.workspaceId} for run ${run.id}`);
    }

    if (session?.workspaceId && run.workspaceId && session.workspaceId !== run.workspaceId) {
      throw new Error(`Runtime contract invariant failed: run ${run.id} workspace ${run.workspaceId} does not match session ${session.id} workspace ${session.workspaceId}`);
    }
  }

  for (const approval of snapshot.approvals) {
    if (!runIds.has(approval.runId)) {
      throw new Error(`Runtime contract invariant failed: missing run ${approval.runId} for approval ${approval.id}`);
    }

    const existing = approvalsByRun.get(approval.runId) ?? [];
    existing.push(approval.id);
    approvalsByRun.set(approval.runId, existing);
  }

  for (const artifact of snapshot.artifacts) {
    if (!runIds.has(artifact.runId)) {
      throw new Error(`Runtime contract invariant failed: missing run ${artifact.runId} for artifact ${artifact.id}`);
    }

    const existing = artifactsByRun.get(artifact.runId) ?? [];
    existing.push(artifact.id);
    artifactsByRun.set(artifact.runId, existing);
  }

  for (const event of snapshot.events) {
    if (!runIds.has(event.runId)) {
      throw new Error(`Runtime contract invariant failed: missing run ${event.runId} for event ${event.id}`);
    }

    if (event.kind === "approval") {
      if (!event.approvalId || event.artifactId || event.toolName) {
        throw new Error(`Runtime contract invariant failed: approval event ${event.id} has invalid link fields`);
      }
    }

    if (event.kind === "artifact") {
      if (!event.artifactId || event.approvalId || event.toolName) {
        throw new Error(`Runtime contract invariant failed: artifact event ${event.id} has invalid link fields`);
      }
    }

    if (event.kind === "tool_call") {
      if (!event.toolName || event.approvalId || event.artifactId) {
        throw new Error(`Runtime contract invariant failed: tool_call event ${event.id} has invalid link fields`);
      }
    }

    if ((event.kind === "system" || event.kind === "message") && (event.approvalId || event.artifactId)) {
      throw new Error(`Runtime contract invariant failed: ${event.kind} event ${event.id} should not link approvals or artifacts`);
    }

    eventsByRun.set(event.runId, (eventsByRun.get(event.runId) ?? 0) + 1);

    if (event.approvalId) {
      const approval = approvalsById.get(event.approvalId);

      if (!approval) {
        throw new Error(`Runtime contract invariant failed: missing approval ${event.approvalId} for event ${event.id}`);
      }

      if (approval.runId !== event.runId) {
        throw new Error(`Runtime contract invariant failed: approval ${approval.id} belongs to ${approval.runId}, not ${event.runId}`);
      }
    }

    if (event.artifactId) {
      const artifact = artifactsById.get(event.artifactId);

      if (!artifact) {
        throw new Error(`Runtime contract invariant failed: missing artifact ${event.artifactId} for event ${event.id}`);
      }

      if (artifact.runId !== event.runId) {
        throw new Error(`Runtime contract invariant failed: artifact ${artifact.id} belongs to ${artifact.runId}, not ${event.runId}`);
      }
    }
  }

  for (const run of snapshot.runs) {
    const expectedApprovals = dedupe(approvalsByRun.get(run.id) ?? []).sort();
    const expectedArtifacts = dedupe(artifactsByRun.get(run.id) ?? []).sort();
    const actualApprovals = [...run.approvalIds].sort();
    const actualArtifacts = [...run.artifactIds].sort();
    const actualEventCount = eventsByRun.get(run.id) ?? 0;

    if (JSON.stringify(expectedApprovals) !== JSON.stringify(actualApprovals)) {
      throw new Error(`Runtime contract invariant failed: approval linkage mismatch for run ${run.id}`);
    }

    if (JSON.stringify(expectedArtifacts) !== JSON.stringify(actualArtifacts)) {
      throw new Error(`Runtime contract invariant failed: artifact linkage mismatch for run ${run.id}`);
    }

    if (run.eventCount !== actualEventCount) {
      throw new Error(`Runtime contract invariant failed: event count mismatch for run ${run.id}`);
    }
  }
}

export function buildRuntimeSnapshot(source: RuntimeAdapterSource): RuntimeContractSnapshot {
  const approvals = buildApprovals(source);
  const artifacts = buildArtifacts(source);
  const events = buildEvents(source);
  const runs = buildRuns(source, approvals, artifacts, events);
  const workspaces = buildWorkspaces(source, runs);
  const sessions = buildSessions(source, runs);

  const snapshot: RuntimeContractSnapshot = {
    workspaces,
    sessions,
    runs,
    approvals,
    artifacts,
    events,
  };

  validateSnapshot(snapshot);

  return snapshot;
}

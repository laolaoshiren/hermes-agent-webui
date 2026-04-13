import { buildRuntimeSnapshot } from "@/features/runtime/adapters";
import type {
  RuntimeAdapterSource,
  RuntimeArtifactSource,
  RuntimeRunSource,
  RuntimeSessionSource,
  RuntimeTimelineEventSource,
  RuntimeWorkspaceSource,
} from "@/features/runtime/adapterTypes";
import type { RuntimeContractSnapshot } from "@/features/runtime/types";
import type { SessionInfo, SessionMessage } from "@/lib/api";

const LIVE_WORKSPACE_ID = "ws-hermes-runtime";
const ISO_EPOCH = new Date(0).toISOString();

function toIsoFromUnixSeconds(value: number | null | undefined): string | null {
  if (typeof value !== "number") {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function getRunStatus(session: SessionInfo): RuntimeRunSource["status"] {
  if (session.is_active) {
    return "running";
  }

  if (session.ended_at !== null && session.ended_at !== undefined) {
    return "completed";
  }

  return "queued";
}

function getRunTrigger(session: SessionInfo): RuntimeRunSource["trigger"] {
  return session.source === "cron" ? "cron" : "manual";
}

function getRunTitle(session: SessionInfo): string {
  return session.title?.trim() || `Session ${session.id}`;
}

function getRunSummary(session: SessionInfo, messages: SessionMessage[]): string {
  const preview = session.preview?.trim();

  if (preview) {
    return preview;
  }

  const latestTextMessage = [...messages]
    .reverse()
    .find(
      (message) =>
        (message.role === "user" || message.role === "assistant" || message.role === "tool") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    );

  return latestTextMessage?.content?.trim() || `Hydrated live session ${session.id}`;
}

function getPrimaryActor(session: SessionInfo): string {
  return session.source === "cron" ? "Hermes cron" : "Hermes operator";
}

function getSessionSourceMetadata(session: SessionInfo): string {
  return session.source ?? "unknown";
}

function getWorkspaceUpdatedAt(
  sessions: SessionInfo[],
  messagesBySessionId: Record<string, SessionMessage[]>,
): string {
  let latestTimestamp: number | null = null;

  for (const session of sessions) {
    for (const candidate of [session.started_at, session.last_active, session.ended_at]) {
      if (typeof candidate === "number" && (latestTimestamp === null || candidate > latestTimestamp)) {
        latestTimestamp = candidate;
      }
    }

    for (const message of messagesBySessionId[session.id] ?? []) {
      if (typeof message.timestamp === "number" && (latestTimestamp === null || message.timestamp > latestTimestamp)) {
        latestTimestamp = message.timestamp;
      }
    }
  }

  return toIsoFromUnixSeconds(latestTimestamp) ?? ISO_EPOCH;
}

function buildRun(session: SessionInfo, messages: SessionMessage[]): RuntimeRunSource {
  return {
    id: `run-${session.id}`,
    sessionId: session.id,
    workspaceId: LIVE_WORKSPACE_ID,
    title: getRunTitle(session),
    status: getRunStatus(session),
    trigger: getRunTrigger(session),
    summary: getRunSummary(session, messages),
    primaryActor: getPrimaryActor(session),
    startedAt: toIsoFromUnixSeconds(session.started_at) ?? ISO_EPOCH,
    endedAt: toIsoFromUnixSeconds(session.ended_at),
  };
}

function buildTranscriptArtifact(runId: string, session: SessionInfo, messages: SessionMessage[]): RuntimeArtifactSource[] {
  if (messages.length === 0) {
    return [];
  }

  return [
    {
      id: `artifact-${session.id}-transcript`,
      runId,
      kind: "transcript",
      label: `${getRunTitle(session)} transcript`,
      path: null,
      sizeBytes: messages.reduce((total, message) => total + (message.content?.length ?? 0), 0),
      createdAt:
        toIsoFromUnixSeconds(messages[messages.length - 1]?.timestamp) ??
        toIsoFromUnixSeconds(session.last_active) ??
        toIsoFromUnixSeconds(session.started_at) ??
        ISO_EPOCH,
    },
  ];
}

function buildLifecycleEvents(runId: string, session: SessionInfo): RuntimeTimelineEventSource[] {
  const startTimestamp = toIsoFromUnixSeconds(session.started_at) ?? ISO_EPOCH;
  const events: RuntimeTimelineEventSource[] = [
    {
      id: `evt-${session.id}-lifecycle-start`,
      runId,
      timestamp: startTimestamp,
      kind: "system",
      status: "completed",
      title: "Session started",
      detail: `Live Hermes session ${session.id} started.`,
      actor: "system",
      toolName: null,
      artifactId: null,
      approvalId: null,
      durationMs: null,
      metadata: {
        phase: "start",
        sessionSource: getSessionSourceMetadata(session),
      },
    },
  ];

  if (session.is_active) {
    events.push({
      id: `evt-${session.id}-lifecycle-active`,
      runId,
      timestamp: toIsoFromUnixSeconds(session.last_active) ?? startTimestamp,
      kind: "system",
      status: "active",
      title: "Session active",
      detail: `Live Hermes session ${session.id} is still active.`,
      actor: "system",
      toolName: null,
      artifactId: null,
      approvalId: null,
      durationMs: null,
      metadata: {
        phase: "heartbeat",
        sessionSource: getSessionSourceMetadata(session),
      },
    });
  } else if (session.ended_at !== null && session.ended_at !== undefined) {
    events.push({
      id: `evt-${session.id}-lifecycle-complete`,
      runId,
      timestamp: toIsoFromUnixSeconds(session.ended_at) ?? toIsoFromUnixSeconds(session.last_active) ?? startTimestamp,
      kind: "system",
      status: "completed",
      title: "Session completed",
      detail: `Live Hermes session ${session.id} ended.`,
      actor: "system",
      toolName: null,
      artifactId: null,
      approvalId: null,
      durationMs: null,
      metadata: {
        phase: "completion",
        sessionSource: getSessionSourceMetadata(session),
      },
    });
  }

  return events;
}

function buildArtifactEvents(artifact: RuntimeArtifactSource): RuntimeTimelineEventSource[] {
  return [
    {
      id: `evt-${artifact.id}-created`,
      runId: artifact.runId,
      timestamp: artifact.createdAt,
      kind: "artifact",
      status: "completed",
      title: "Transcript created",
      detail: `${artifact.label} created.`,
      actor: "system",
      toolName: null,
      artifactId: artifact.id,
      approvalId: null,
      durationMs: null,
      metadata: {
        artifactKind: artifact.kind,
      },
    },
  ];
}

function buildMessageEvents(runId: string, sessionId: string, message: SessionMessage, index: number): RuntimeTimelineEventSource[] {
  if ((message.role !== "user" && message.role !== "assistant") || !message.content?.trim()) {
    return [];
  }

  return [
    {
      id: `evt-${sessionId}-message-${index}`,
      runId,
      timestamp: toIsoFromUnixSeconds(message.timestamp) ?? ISO_EPOCH,
      kind: "message",
      status: "completed",
      title: message.role === "user" ? "User message" : "Assistant message",
      detail: message.content.trim(),
      actor: message.role,
      toolName: null,
      artifactId: null,
      approvalId: null,
      durationMs: null,
      metadata: { role: message.role },
    },
  ];
}

function buildToolEvents(runId: string, sessionId: string, message: SessionMessage, index: number): RuntimeTimelineEventSource[] {
  const events: RuntimeTimelineEventSource[] = [];
  const timestamp = toIsoFromUnixSeconds(message.timestamp) ?? ISO_EPOCH;

  if (message.role === "tool") {
    events.push({
      id: `evt-${sessionId}-tool-message-${index}`,
      runId,
      timestamp,
      kind: "tool_call",
      status: "completed",
      title: message.tool_name ? `${message.tool_name} result` : "Tool result",
      detail: message.content?.trim() || "Tool message captured from live session.",
      actor: "tool",
      toolName: message.tool_name ?? "tool",
      artifactId: null,
      approvalId: null,
      durationMs: null,
      metadata: {
        role: "tool",
        toolCallId: message.tool_call_id ?? "unknown",
      },
    });
  }

  for (const [toolCallIndex, toolCall] of (message.tool_calls ?? []).entries()) {
    events.push({
      id: `evt-${sessionId}-tool-call-${index}-${toolCallIndex}`,
      runId,
      timestamp,
      kind: "tool_call",
      status: "completed",
      title: `${toolCall.function.name} invoked`,
      detail: toolCall.function.arguments || "{}",
      actor: message.role,
      toolName: toolCall.function.name,
      artifactId: null,
      approvalId: null,
      durationMs: null,
      metadata: {
        role: message.role,
        toolCallId: toolCall.id,
      },
    });
  }

  return events;
}

export function buildRuntimeSnapshotFromSessions(input: {
  sessions: SessionInfo[];
  messagesBySessionId: Record<string, SessionMessage[]>;
}): RuntimeContractSnapshot {
  const workspaces: RuntimeWorkspaceSource[] = [
    {
      id: LIVE_WORKSPACE_ID,
      name: "Hermes Runtime",
      slug: "hermes-runtime",
      status: "active",
      repository: null,
      defaultBranch: null,
      policyPreset: "runtime-observe",
      updatedAt: getWorkspaceUpdatedAt(input.sessions, input.messagesBySessionId),
    },
  ];

  const sessionSources: RuntimeSessionSource[] = input.sessions.map((session) => ({
    session,
    workspaceId: LIVE_WORKSPACE_ID,
    messages: input.messagesBySessionId[session.id] ?? [],
  }));

  const runs: RuntimeRunSource[] = [];
  const artifacts: RuntimeArtifactSource[] = [];
  const events: RuntimeTimelineEventSource[] = [];

  for (const session of input.sessions) {
    const messages = input.messagesBySessionId[session.id] ?? [];
    const run = buildRun(session, messages);
    runs.push(run);

    events.push(...buildLifecycleEvents(run.id, session));

    const transcriptArtifacts = buildTranscriptArtifact(run.id, session, messages);
    artifacts.push(...transcriptArtifacts);

    for (const [index, message] of messages.entries()) {
      events.push(...buildMessageEvents(run.id, session.id, message, index));
      events.push(...buildToolEvents(run.id, session.id, message, index));
    }

    for (const artifact of transcriptArtifacts) {
      events.push(...buildArtifactEvents(artifact));
    }
  }

  const source: RuntimeAdapterSource = {
    workspaces,
    sessionSources,
    runs,
    approvals: [],
    artifacts,
    events,
  };

  return buildRuntimeSnapshot(source);
}

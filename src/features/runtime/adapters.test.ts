import type { SessionInfo, SessionMessage } from "@/lib/api";
import { buildRuntimeSnapshot } from "@/features/runtime/adapters";
import type {
  RuntimeAdapterSource,
  RuntimeApprovalSource,
  RuntimeArtifactSource,
  RuntimeRunSource,
  RuntimeSessionSource,
  RuntimeTimelineEventSource,
  RuntimeWorkspaceSource,
} from "@/features/runtime/adapterTypes";

function createSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    id: "sess-1",
    source: "cron",
    model: "gpt-5.4",
    title: "Runtime adapter coverage",
    started_at: Math.floor(Date.parse("2026-04-13T09:00:00Z") / 1000),
    ended_at: null,
    last_active: Math.floor(Date.parse("2026-04-13T09:30:00Z") / 1000),
    is_active: true,
    message_count: 3,
    tool_call_count: 1,
    input_tokens: 100,
    output_tokens: 50,
    preview: null,
    ...overrides,
  };
}

function createMessages(): SessionMessage[] {
  return [
    {
      role: "system",
      content: "Boot sequence started.",
      timestamp: Math.floor(Date.parse("2026-04-13T09:00:00Z") / 1000),
    },
    {
      role: "user",
      content: "Please verify the runtime adapter seam.",
      timestamp: Math.floor(Date.parse("2026-04-13T09:05:00Z") / 1000),
    },
    {
      role: "assistant",
      content: "Runtime adapter seam validated and ready.",
      timestamp: Math.floor(Date.parse("2026-04-13T09:06:00Z") / 1000),
    },
  ];
}

function createWorkspace(id: string, status: RuntimeWorkspaceSource["status"] = "active"): RuntimeWorkspaceSource {
  return {
    id,
    name: `Workspace ${id}`,
    slug: `workspace-${id}`,
    status,
    repository: {
      provider: "github",
      owner: "nousresearch",
      name: `repo-${id}`,
      url: `https://github.com/nousresearch/repo-${id}`,
    },
    defaultBranch: "main",
    policyPreset: "safe",
    updatedAt: "2026-04-13T09:10:00Z",
  };
}

function createRun(overrides: Partial<RuntimeRunSource> = {}): RuntimeRunSource {
  return {
    id: "run-1",
    sessionId: "sess-1",
    workspaceId: "ws-1",
    title: "Run 1",
    status: "running",
    trigger: "cron",
    summary: "Running adapter checks.",
    primaryActor: "Hermes",
    startedAt: "2026-04-13T09:02:00Z",
    endedAt: null,
    ...overrides,
  };
}

function createApproval(overrides: Partial<RuntimeApprovalSource> = {}): RuntimeApprovalSource {
  return {
    id: "approval-1",
    runId: "run-1",
    scope: "governance",
    status: "pending",
    title: "Approve adapter rollout",
    reason: "Need maintainer sign-off.",
    requestedBy: "Hermes",
    requestedAt: "2026-04-13T09:03:00Z",
    expiresAt: null,
    reviewer: null,
    resolutionNote: null,
    ...overrides,
  };
}

function createArtifact(overrides: Partial<RuntimeArtifactSource> = {}): RuntimeArtifactSource {
  return {
    id: "artifact-1",
    runId: "run-1",
    kind: "report",
    label: "Adapter report",
    path: "docs/report.md",
    sizeBytes: 1024,
    createdAt: "2026-04-13T09:04:00Z",
    ...overrides,
  };
}

function createEvent(overrides: Partial<RuntimeTimelineEventSource> = {}): RuntimeTimelineEventSource {
  return {
    id: "event-1",
    runId: "run-1",
    timestamp: "2026-04-13T09:07:00Z",
    kind: "system",
    status: "completed",
    title: "Runtime adapter booted",
    detail: "Boot complete.",
    actor: "scheduler",
    toolName: null,
    artifactId: null,
    approvalId: null,
    durationMs: null,
    metadata: {},
    ...overrides,
  };
}

function createSource(overrides: Partial<RuntimeAdapterSource> = {}): RuntimeAdapterSource {
  const primarySessionSource: RuntimeSessionSource = {
    session: createSession(),
    messages: createMessages(),
    workspaceId: null,
  };

  const secondarySessionSource: RuntimeSessionSource = {
    session: createSession({
      id: "sess-2",
      title: "Secondary session",
      started_at: Math.floor(Date.parse("2026-04-13T09:11:00Z") / 1000),
      last_active: Math.floor(Date.parse("2026-04-13T09:14:00Z") / 1000),
      message_count: 1,
      preview: "Pinned preview",
    }),
    messages: [{ role: "assistant", content: "Ignored because preview exists." }],
    workspaceId: "ws-2",
  };

  return {
    workspaces: [createWorkspace("ws-1"), createWorkspace("ws-2")],
    sessionSources: [primarySessionSource, secondarySessionSource],
    runs: [
      createRun(),
      createRun({
        id: "run-2",
        title: "Run 2",
        status: "completed",
        startedAt: "2026-04-13T09:08:00Z",
        endedAt: "2026-04-13T09:10:00Z",
      }),
      createRun({
        id: "run-3",
        sessionId: "sess-2",
        workspaceId: "ws-2",
        title: "Run 3",
        status: "awaiting_approval",
        startedAt: "2026-04-13T09:11:00Z",
      }),
    ],
    approvals: [
      createApproval(),
      createApproval({ id: "approval-2", runId: "run-2", status: "approved" }),
      createApproval({ id: "approval-3", runId: "run-3", status: "pending" }),
    ],
    artifacts: [
      createArtifact(),
      createArtifact({ id: "artifact-2", runId: "run-2", createdAt: "2026-04-13T09:09:00Z" }),
    ],
    events: [
      createEvent({
        id: "event-3",
        timestamp: "2026-04-13T09:12:00Z",
        runId: "run-2",
        kind: "artifact",
        artifactId: "artifact-2",
        title: "Artifact published",
      }),
      createEvent({
        id: "event-1",
        timestamp: "2026-04-13T09:05:00Z",
        runId: "run-1",
        kind: "approval",
        approvalId: "approval-1",
        title: "Approval requested",
      }),
      createEvent({
        id: "event-2",
        timestamp: "2026-04-13T09:06:00Z",
        runId: "run-1",
        kind: "tool_call",
        toolName: "terminal",
        title: "Tests executed",
      }),
    ],
    ...overrides,
  };
}

describe("buildRuntimeSnapshot", () => {
  it("maps Hermes-shaped source records into a normalized runtime snapshot", () => {
    const source = createSource({
      sessionSources: [
        {
          session: createSession(),
          messages: createMessages(),
        },
        {
          session: createSession({
            id: "sess-2",
            title: "Secondary session",
            started_at: Math.floor(Date.parse("2026-04-13T09:11:00Z") / 1000),
            last_active: Math.floor(Date.parse("2026-04-13T09:14:00Z") / 1000),
            message_count: 1,
            preview: "Pinned preview",
          }),
          messages: [{ role: "assistant", content: "Ignored because preview exists." }],
          workspaceId: "ws-2",
        },
      ],
    });

    const snapshot = buildRuntimeSnapshot(source);

    expect(snapshot.events.map((event) => event.id)).toEqual(["event-1", "event-2", "event-3"]);

    expect(snapshot.sessions).toEqual([
      expect.objectContaining({
        id: "sess-1",
        workspaceId: "ws-1",
        runIds: ["run-1", "run-2"],
        preview: "Runtime adapter seam validated and ready.",
        startedAt: "2026-04-13T09:00:00.000Z",
        lastActiveAt: "2026-04-13T09:30:00.000Z",
      }),
      expect.objectContaining({
        id: "sess-2",
        workspaceId: "ws-2",
        runIds: ["run-3"],
        preview: "Pinned preview",
      }),
    ]);

    expect(snapshot.runs).toEqual([
      expect.objectContaining({
        id: "run-1",
        approvalIds: ["approval-1"],
        artifactIds: ["artifact-1"],
        eventCount: 2,
      }),
      expect.objectContaining({
        id: "run-2",
        approvalIds: ["approval-2"],
        artifactIds: ["artifact-2"],
        eventCount: 1,
      }),
      expect.objectContaining({
        id: "run-3",
        approvalIds: ["approval-3"],
        artifactIds: [],
        eventCount: 0,
      }),
    ]);

    expect(snapshot.workspaces).toEqual([
      expect.objectContaining({ id: "ws-1", activeRunCount: 1 }),
      expect.objectContaining({ id: "ws-2", activeRunCount: 1 }),
    ]);
  });

  it("rejects duplicate entity ids", () => {
    const source = createSource({
      approvals: [createApproval(), createApproval()],
    });

    expect(() => buildRuntimeSnapshot(source)).toThrow(
      "Runtime contract invariant failed: duplicate approval id approval-1",
    );
  });

  it("rejects events linked to missing approvals", () => {
    const source = createSource({
      events: [
        createEvent({
          id: "event-missing-approval",
          kind: "approval",
          approvalId: "approval-missing",
          timestamp: "2026-04-13T09:07:00Z",
        }),
      ],
    });

    expect(() => buildRuntimeSnapshot(source)).toThrow(
      "Runtime contract invariant failed: missing approval approval-missing for event event-missing-approval",
    );
  });

  it("rejects events linked to missing artifacts", () => {
    const source = createSource({
      events: [
        createEvent({
          id: "event-missing-artifact",
          kind: "artifact",
          artifactId: "artifact-missing",
          approvalId: null,
          runId: "run-2",
          timestamp: "2026-04-13T09:08:00Z",
        }),
      ],
    });

    expect(() => buildRuntimeSnapshot(source)).toThrow(
      "Runtime contract invariant failed: missing artifact artifact-missing for event event-missing-artifact",
    );
  });

  it("rejects invalid event link fields by event kind", () => {
    const source = createSource({
      events: [
        createEvent({
          id: "event-invalid-kind",
          kind: "tool_call",
          toolName: null,
          approvalId: "approval-1",
        }),
      ],
    });

    expect(() => buildRuntimeSnapshot(source)).toThrow(
      "Runtime contract invariant failed: tool_call event event-invalid-kind has invalid link fields",
    );
  });

  it("rejects session and run workspace mismatches", () => {
    const source = createSource({
      sessionSources: [
        {
          session: createSession(),
          messages: createMessages(),
          workspaceId: "ws-2",
        },
      ],
      runs: [createRun({ workspaceId: "ws-1" })],
      approvals: [createApproval()],
      artifacts: [createArtifact()],
      events: [createEvent({ kind: "approval", approvalId: "approval-1" })],
    });

    expect(() => buildRuntimeSnapshot(source)).toThrow(
      "Runtime contract invariant failed: session sess-1 workspace ws-2 does not match run workspace ws-1",
    );
  });
});

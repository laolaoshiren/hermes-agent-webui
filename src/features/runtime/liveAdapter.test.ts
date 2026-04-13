import type { SessionInfo, SessionMessage } from "@/lib/api";
import { buildRuntimeSnapshotFromSessions } from "@/features/runtime/liveAdapter";

const ISO_EPOCH = new Date(0).toISOString();

function createSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    id: "sess-1",
    source: "cron",
    model: "gpt-5.4",
    title: "Live runtime hydration",
    started_at: Math.floor(Date.parse("2026-04-13T09:00:00Z") / 1000),
    ended_at: null,
    last_active: Math.floor(Date.parse("2026-04-13T09:05:00Z") / 1000),
    is_active: true,
    message_count: 0,
    tool_call_count: 0,
    input_tokens: 0,
    output_tokens: 0,
    preview: null,
    ...overrides,
  };
}

function createMessage(overrides: Partial<SessionMessage> = {}): SessionMessage {
  return {
    role: "user",
    content: "Investigate runtime bug",
    timestamp: Math.floor(Date.parse("2026-04-13T09:01:00Z") / 1000),
    ...overrides,
  };
}

describe("buildRuntimeSnapshotFromSessions", () => {
  it("builds one run per live session and derives lifecycle, message, tool, and artifact timeline events", () => {
    const snapshot = buildRuntimeSnapshotFromSessions({
      sessions: [createSession({ id: "sess-1", is_active: true })],
      messagesBySessionId: {
        "sess-1": [
          createMessage({ role: "user", content: "Investigate runtime bug", timestamp: 1776070860 }),
          createMessage({
            role: "assistant",
            content: "I am checking the run state now.",
            timestamp: 1776070870,
            tool_calls: [
              {
                id: "call-terminal-1",
                function: { name: "terminal", arguments: '{"command":"npm run lint"}' },
              },
            ],
          }),
          createMessage({
            role: "tool",
            content: "npm run lint",
            tool_name: "terminal",
            tool_call_id: "call-terminal-1",
            timestamp: 1776070890,
          }),
        ],
      },
    });

    expect(snapshot.workspaces[0]?.updatedAt).toBe("2026-04-13T09:05:00.000Z");
    expect(snapshot.runs).toHaveLength(1);
    expect(snapshot.runs[0]?.id).toBe("run-sess-1");
    expect(snapshot.runs[0]?.status).toBe("running");
    expect(snapshot.runs[0]?.trigger).toBe("cron");
    expect(snapshot.events.map((event) => event.kind)).toEqual([
      "system",
      "message",
      "message",
      "tool_call",
      "tool_call",
      "artifact",
      "system",
    ]);
    expect(snapshot.events.map((event) => event.toolName)).toEqual([null, null, null, "terminal", "terminal", null, null]);
    expect(snapshot.events[0]).toEqual(
      expect.objectContaining({
        kind: "system",
        status: "completed",
        title: "Session started",
        actor: "system",
      }),
    );
    expect(snapshot.events[5]).toEqual(
      expect.objectContaining({
        kind: "artifact",
        status: "completed",
        title: "Transcript created",
        artifactId: "artifact-sess-1-transcript",
      }),
    );
    expect(snapshot.events[6]).toEqual(
      expect.objectContaining({
        kind: "system",
        status: "active",
        title: "Session active",
        actor: "system",
      }),
    );
    expect(snapshot.approvals).toEqual([]);
  });

  it("adds transcript artifacts plus transcript-created and completion lifecycle events for ended sessions", () => {
    const snapshot = buildRuntimeSnapshotFromSessions({
      sessions: [createSession({ id: "sess-2", is_active: false, ended_at: 1776071800 })],
      messagesBySessionId: {
        "sess-2": [createMessage({ role: "assistant", content: "Done", timestamp: 1776071300 })],
      },
    });

    expect(snapshot.runs[0]?.status).toBe("completed");
    expect(snapshot.artifacts[0]).toEqual(
      expect.objectContaining({
        id: "artifact-sess-2-transcript",
        runId: "run-sess-2",
        kind: "transcript",
      }),
    );
    expect(snapshot.events.map((event) => event.kind)).toEqual(["system", "message", "artifact", "system"]);
    expect(snapshot.events[2]).toEqual(
      expect.objectContaining({
        kind: "artifact",
        artifactId: "artifact-sess-2-transcript",
      }),
    );
    expect(snapshot.events[3]).toEqual(
      expect.objectContaining({
        kind: "system",
        status: "completed",
        title: "Session completed",
      }),
    );
  });

  it("marks non-cron inactive sessions without an end timestamp as queued and still emits a session-start lifecycle event when empty", () => {
    const snapshot = buildRuntimeSnapshotFromSessions({
      sessions: [createSession({ id: "sess-3", source: "cli", is_active: false, ended_at: null })],
      messagesBySessionId: {
        "sess-3": [],
      },
    });

    expect(snapshot.runs[0]).toEqual(
      expect.objectContaining({
        id: "run-sess-3",
        trigger: "manual",
        status: "queued",
      }),
    );
    expect(snapshot.artifacts).toEqual([]);
    expect(snapshot.events).toEqual([
      expect.objectContaining({
        kind: "system",
        status: "completed",
        title: "Session started",
      }),
    ]);
  });

  it("uses deterministic workspace timestamps and falls back title and summary for blank session metadata", () => {
    const snapshot = buildRuntimeSnapshotFromSessions({
      sessions: [
        createSession({
          id: "sess-blank",
          title: "   ",
          preview: "   ",
          last_active: Math.floor(Date.parse("2026-04-13T09:12:00Z") / 1000),
        }),
      ],
      messagesBySessionId: {
        "sess-blank": [
          createMessage({ role: "system", content: "System note", timestamp: 1776071400 }),
          createMessage({ role: "assistant", content: "  Latest useful summary  ", timestamp: 1776071520 }),
        ],
      },
    });

    expect(snapshot.workspaces[0]?.updatedAt).toBe("2026-04-13T09:12:00.000Z");
    expect(snapshot.runs[0]).toEqual(
      expect.objectContaining({
        title: "Session sess-blank",
        summary: "Latest useful summary",
      }),
    );
  });

  it("falls back to tool text and deterministic defaults when preview and user assistant text are unavailable", () => {
    const snapshot = buildRuntimeSnapshotFromSessions({
      sessions: [
        createSession({
          id: "sess-fallback",
          source: null,
          title: null,
          preview: null,
          last_active: 0,
        }),
      ],
      messagesBySessionId: {
        "sess-fallback": [
          createMessage({ role: "assistant", content: "   ", timestamp: 1776071400 }),
          createMessage({ role: "tool", content: "  Tool supplied summary  ", timestamp: undefined }),
        ],
      },
    });

    expect(snapshot.workspaces[0]?.updatedAt).toBe("2026-04-13T09:10:00.000Z");
    expect(snapshot.runs[0]).toEqual(
      expect.objectContaining({
        trigger: "manual",
        title: "Session sess-fallback",
        summary: "Tool supplied summary",
        primaryActor: "Hermes operator",
      }),
    );
    expect(snapshot.sessions[0]?.source).toBeNull();
    expect(snapshot.events.find((event) => event.id === "evt-sess-fallback-lifecycle-start")).toEqual(
      expect.objectContaining({
        metadata: expect.objectContaining({
          sessionSource: "unknown",
        }),
      }),
    );
  });

  it("treats unix timestamp 0 as a valid ended-at value for status and lifecycle completion", () => {
    const snapshot = buildRuntimeSnapshotFromSessions({
      sessions: [
        createSession({
          id: "sess-zero-end",
          is_active: false,
          started_at: 0,
          last_active: 0,
          ended_at: 0,
        }),
      ],
      messagesBySessionId: {
        "sess-zero-end": [],
      },
    });

    expect(snapshot.runs[0]).toEqual(
      expect.objectContaining({
        id: "run-sess-zero-end",
        status: "completed",
        startedAt: ISO_EPOCH,
        endedAt: ISO_EPOCH,
      }),
    );
    expect(snapshot.events.map((event) => event.id)).toEqual([
      "evt-sess-zero-end-lifecycle-start",
      "evt-sess-zero-end-lifecycle-complete",
    ]);
    expect(snapshot.events[1]).toEqual(
      expect.objectContaining({
        timestamp: ISO_EPOCH,
        title: "Session completed",
        status: "completed",
      }),
    );
  });

  it("uses epoch fallbacks for missing message timestamps and empty summaries", () => {
    const snapshot = buildRuntimeSnapshotFromSessions({
      sessions: [
        createSession({
          id: "sess-epoch",
          source: null,
          title: null,
          preview: "   ",
          started_at: 0,
          last_active: 0,
          ended_at: null,
        }),
      ],
      messagesBySessionId: {
        "sess-epoch": [
          createMessage({ role: "assistant", content: "   ", timestamp: undefined }),
          createMessage({
            role: "tool",
            content: null,
            tool_name: undefined,
            tool_call_id: undefined,
            timestamp: undefined,
          }),
        ],
      },
    });

    expect(snapshot.workspaces[0]?.updatedAt).toBe(ISO_EPOCH);
    expect(snapshot.runs[0]).toEqual(
      expect.objectContaining({
        title: "Session sess-epoch",
        summary: "Hydrated live session sess-epoch",
        startedAt: ISO_EPOCH,
      }),
    );
    expect(snapshot.artifacts[0]).toEqual(
      expect.objectContaining({
        createdAt: ISO_EPOCH,
      }),
    );
    expect(snapshot.events.find((event) => event.id === "evt-sess-epoch-tool-message-1")).toEqual(
      expect.objectContaining({
        timestamp: ISO_EPOCH,
        title: "Tool result",
        detail: "Tool message captured from live session.",
        toolName: "tool",
        metadata: expect.objectContaining({
          toolCallId: "unknown",
        }),
      }),
    );
  });
});

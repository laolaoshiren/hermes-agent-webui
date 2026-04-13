import type { SessionInfo, SessionMessage } from "@/lib/api";
import { buildRuntimeSnapshotFromSessions } from "@/features/runtime/liveAdapter";

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
  it("builds one run per live session and derives message/tool timeline events", () => {
    const snapshot = buildRuntimeSnapshotFromSessions({
      sessions: [createSession({ id: "sess-1", is_active: true })],
      messagesBySessionId: {
        "sess-1": [
          createMessage({ role: "user", content: "Investigate runtime bug", timestamp: 1712991000 }),
          createMessage({
            role: "assistant",
            content: "I am checking the run state now.",
            timestamp: 1712991010,
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
            timestamp: 1712991030,
          }),
        ],
      },
    });

    expect(snapshot.runs).toHaveLength(1);
    expect(snapshot.runs[0]?.id).toBe("run-sess-1");
    expect(snapshot.runs[0]?.status).toBe("running");
    expect(snapshot.runs[0]?.trigger).toBe("cron");
    expect(snapshot.events.map((event) => event.kind)).toEqual(["message", "message", "tool_call", "tool_call"]);
    expect(snapshot.events.map((event) => event.toolName)).toEqual([null, null, "terminal", "terminal"]);
    expect(snapshot.approvals).toEqual([]);
  });

  it("adds transcript artifacts and completed status for ended sessions", () => {
    const snapshot = buildRuntimeSnapshotFromSessions({
      sessions: [createSession({ id: "sess-2", is_active: false, ended_at: 1712992000 })],
      messagesBySessionId: {
        "sess-2": [createMessage({ role: "assistant", content: "Done", timestamp: 1712991500 })],
      },
    });

    expect(snapshot.runs[0]?.status).toBe("completed");
    expect(snapshot.artifacts[0]).toEqual(
      expect.objectContaining({
        runId: "run-sess-2",
        kind: "transcript",
      }),
    );
  });

  it("marks non-cron inactive sessions without an end timestamp as queued and skips transcript artifacts when empty", () => {
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
    expect(snapshot.events).toEqual([]);
  });
});

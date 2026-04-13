import { api, type SessionInfo, type SessionMessage } from "@/lib/api";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { fetchRuntimeSnapshot } from "@/features/runtime/useRuntimeSnapshot";

function createSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    id: "sess-live-1",
    source: "cron",
    model: "gpt-5.4",
    title: "Hydration session",
    started_at: Math.floor(Date.parse("2026-04-13T10:00:00Z") / 1000),
    ended_at: null,
    last_active: Math.floor(Date.parse("2026-04-13T10:05:00Z") / 1000),
    is_active: true,
    message_count: 1,
    tool_call_count: 0,
    input_tokens: 0,
    output_tokens: 0,
    preview: "Hydration preview",
    ...overrides,
  };
}

function createMessage(overrides: Partial<SessionMessage> = {}): SessionMessage {
  return {
    role: "assistant",
    content: "Hydrated from the backend.",
    timestamp: Math.floor(Date.parse("2026-04-13T10:01:00Z") / 1000),
    ...overrides,
  };
}

describe("fetchRuntimeSnapshot", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hydrates sessions and messages into a live snapshot", async () => {
    vi.spyOn(api, "getSessions").mockResolvedValue([createSession(), createSession({ id: "sess-live-2", source: "cli" })]);
    vi.spyOn(api, "getSessionMessages").mockImplementation(async (sessionId) => ({
      session_id: sessionId,
      messages: [createMessage({ content: `Hydrated ${sessionId}` })],
    }));

    const result = await fetchRuntimeSnapshot();

    expect(result.source).toBe("live");
    expect(result.error).toBeNull();
    expect(result.snapshot.runs).toHaveLength(2);
    expect(result.snapshot.runs.map((run) => run.trigger)).toEqual(["cron", "manual"]);
  });

  it("falls back to fixture snapshot when live hydration fails", async () => {
    vi.spyOn(api, "getSessions").mockRejectedValue(new Error("boom"));

    const result = await fetchRuntimeSnapshot();

    expect(result.source).toBe("fixture");
    expect(result.snapshot).toBe(runtimeContractSnapshot);
    expect(result.error).toBe("boom");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";

describe("chat API helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("normalizes session creation responses from the fast MVP chat endpoint", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        session: {
          session_id: "sess-new",
          title: "New chat",
          model: "anthropic/claude-sonnet-4.6",
          created_at: 10,
          updated_at: 12,
          messages: [
            { role: "user", content: [{ text: "hello from array content" }] },
            { role: "assistant", content: "reply from Hermes" },
          ],
        },
      }),
    } as Response);

    const response = await api.createSession({ model: "anthropic/claude-sonnet-4.6" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/session/new",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      model: "anthropic/claude-sonnet-4.6",
    });
    expect(response.session.id).toBe("sess-new");
    expect(response.session.preview).toBe("reply from Hermes");
    expect(response.messages[0]?.content).toBe("hello from array content");
  });

  it("accepts direct session payloads and prefers non-system preview text", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        session_id: "sess-direct",
        title: null,
        model: null,
        created_at: 100,
        messages: [
          { role: "system", content: "system setup" },
          { role: "assistant", content: [{ text: "ready to help" }] },
          null,
        ],
      }),
    } as Response);

    const response = await api.createSession();

    expect(response.session.id).toBe("sess-direct");
    expect(response.session.preview).toBe("ready to help");
    expect(response.messages).toEqual([
      { role: "system", content: "system setup", timestamp: undefined, tool_calls: undefined, tool_name: undefined, tool_call_id: undefined },
      { role: "assistant", content: "ready to help", timestamp: undefined, tool_calls: undefined, tool_name: undefined, tool_call_id: undefined },
    ]);
  });

  it("sends chat payloads through the Hermes-backed sync endpoint", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: "done",
        status: "done",
        session: {
          session_id: "sess-existing",
          title: "Existing session",
          model: "anthropic/claude-sonnet-4.6",
          created_at: 10,
          updated_at: 18,
          tool_calls: [{ id: "call-1", function: { name: "search_files", arguments: "{}" } }],
          messages: [
            { role: "user", content: "ship the chat composer" },
            { role: "assistant", content: "done" },
          ],
        },
      }),
    } as Response);

    const response = await api.sendChatMessage({
      sessionId: "sess-existing",
      message: "ship the chat composer",
      model: "anthropic/claude-sonnet-4.6",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      session_id: "sess-existing",
      message: "ship the chat composer",
      model: "anthropic/claude-sonnet-4.6",
      workspace: undefined,
    });
    expect(response.session.id).toBe("sess-existing");
    expect(response.session.tool_call_count).toBe(1);
    expect(response.messages.at(-1)?.content).toBe("done");
  });

  it("sends session deletion through the sessions endpoint", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await expect(api.deleteSession("sess-delete")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sessions/sess-delete",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("falls back to top-level chat messages and derives the assistant answer when needed", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        session_id: "sess-fallback",
        title: "Fallback session",
        model: "anthropic/claude-sonnet-4.6",
        created_at: 20,
        updated_at: 30,
        messages: [
          { role: "user", content: "use fallback messages" },
          {
            role: "assistant",
            content: [{ text: "fallback answer" }],
            tool_calls: [{ id: "call-msg-1", function: { name: "search_files", arguments: "{}" } }],
          },
        ],
      }),
    } as Response);

    const response = await api.sendChatMessage({
      sessionId: "sess-fallback",
      message: "use fallback messages",
      workspace: "/root/hermes-control-center",
    });

    expect(response.answer).toBe("fallback answer");
    expect(response.status).toBe("done");
    expect(response.session.id).toBe("sess-fallback");
    expect(response.session.message_count).toBe(2);
    expect(response.session.tool_call_count).toBe(1);
    expect(response.session.preview).toBe("fallback answer");
    expect(response.messages[1]?.tool_calls?.[0]?.function.name).toBe("search_files");
  });
});

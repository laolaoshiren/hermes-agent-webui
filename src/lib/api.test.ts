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
});

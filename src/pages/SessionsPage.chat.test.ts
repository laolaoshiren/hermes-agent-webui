// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import SessionsPage from "@/pages/SessionsPage";
import type { SessionsPageProps } from "@/pages/SessionsPage";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { api, type SessionInfo, type SessionMessage } from "@/lib/api";

const selectedRuntimeSession = runtimeContractSnapshot.sessions[0]!;
const sessions: SessionInfo[] = [
  {
    id: selectedRuntimeSession.id,
    source: selectedRuntimeSession.source,
    workspace: "/root/hermes-control-center",
    model: selectedRuntimeSession.model,
    title: selectedRuntimeSession.title,
    started_at: 1713000000,
    ended_at: null,
    last_active: 1713000300,
    is_active: true,
    message_count: 9,
    tool_call_count: 2,
    input_tokens: 100,
    output_tokens: 150,
    preview: selectedRuntimeSession.preview,
  },
  {
    id: "sess-second",
    source: "cli",
    workspace: "/root/hermes-control-center",
    model: "anthropic/claude-sonnet-4.6",
    title: "Second chat",
    started_at: 1713000100,
    ended_at: null,
    last_active: 1713000200,
    is_active: false,
    message_count: 4,
    tool_call_count: 0,
    input_tokens: 40,
    output_tokens: 60,
    preview: "Second preview",
  },
];

type RuntimeQueryState = {
  data: {
    source: "fixture" | "live";
    snapshot: typeof runtimeContractSnapshot;
    error: string | null;
  };
  isPending: boolean;
};

let runtimeQueryState: RuntimeQueryState = {
  data: {
    source: "fixture",
    snapshot: runtimeContractSnapshot,
    error: null,
  },
  isPending: false,
};

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TestSessionsPage = SessionsPage as unknown as (props: SessionsPageProps) => ReturnType<typeof SessionsPage>;

vi.mock("@/features/runtime/useRuntimeSnapshot", () => ({
  useRuntimeSnapshot: () => runtimeQueryState,
}));

async function renderSessionsRoute(initialEntry: string, initialSessions: SessionInfo[] = sessions) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const router = createMemoryRouter(
    [
      {
        path: "/sessions",
        element: createElement(TestSessionsPage, { initialSessions }),
      },
      {
        path: "/sessions/:sessionId",
        element: createElement(TestSessionsPage, { initialSessions }),
      },
    ],
    { initialEntries: [initialEntry] },
  );

  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(RouterProvider, {
          router,
        }),
      ),
    );
    await Promise.resolve();
    await Promise.resolve();
  });

  return {
    container,
    root,
    router,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
        await Promise.resolve();
      });
      container.remove();
    },
  };
}

function findButtonByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes(text)) ?? null;
}

function findLinkByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("a")).find((link) => link.textContent?.includes(text)) ?? null;
}

describe("SessionsPage chat MVP surface", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    runtimeQueryState = {
      data: {
        source: "fixture",
        snapshot: runtimeContractSnapshot,
        error: null,
      },
      isPending: false,
    };

    vi.restoreAllMocks();
  });

  it("renders the composer-oriented conversation surface on the selected session route", async () => {
    vi.spyOn(api, "getSessionMessages").mockResolvedValue({
      session_id: selectedRuntimeSession.id,
      messages: [{ role: "assistant", content: "Existing transcript" } as SessionMessage],
    });

    const { container, cleanup } = await renderSessionsRoute(`/sessions/${selectedRuntimeSession.id}`);

    expect(container.textContent).toContain("Conversation");
    expect(container.textContent).toContain("New chat");
    expect(container.textContent).toContain("Existing transcript");
    expect(container.textContent).toContain("Composer");

    await cleanup();
  });

  it("switches the active conversation from the left session list", async () => {
    const getSessionMessages = vi.spyOn(api, "getSessionMessages");
    getSessionMessages
      .mockResolvedValueOnce({
        session_id: selectedRuntimeSession.id,
        messages: [{ role: "assistant", content: "Primary transcript" } as SessionMessage],
      })
      .mockResolvedValueOnce({
        session_id: "sess-second",
        messages: [{ role: "assistant", content: "Second transcript" } as SessionMessage],
      });

    runtimeQueryState = {
      data: {
        source: "fixture",
        snapshot: {
          ...runtimeContractSnapshot,
          sessions: [
            ...runtimeContractSnapshot.sessions,
            {
              ...runtimeContractSnapshot.sessions[0]!,
              id: "sess-second",
              title: "Second chat",
              source: "cli",
              model: "anthropic/claude-sonnet-4.6",
              preview: "Second preview",
              runIds: [],
            },
          ],
        },
        error: null,
      },
      isPending: false,
    };

    const { container, router, cleanup } = await renderSessionsRoute(`/sessions/${selectedRuntimeSession.id}`);
    const secondSessionLink = findLinkByText(container, "Second chat");

    expect(secondSessionLink).not.toBeNull();

    await act(async () => {
      secondSessionLink!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(router.state.location.pathname).toBe("/sessions/sess-second");
    expect(container.textContent).toContain("Second transcript");

    await cleanup();
  });

  it("preserves the active workspace scope when starting a new chat", async () => {
    vi.spyOn(api, "getSessionMessages").mockResolvedValue({
      session_id: selectedRuntimeSession.id,
      messages: [{ role: "assistant", content: "Existing transcript" } as SessionMessage],
    });
    const createSession = vi.spyOn(api, "createSession").mockResolvedValue({
      session: {
        ...sessions[0],
        id: "sess-workspace-new",
        title: "Scoped chat",
        preview: "Scoped chat",
        last_active: 1713000350,
      },
      messages: [],
    });

    const { container, router, cleanup } = await renderSessionsRoute(
      `/sessions/${selectedRuntimeSession.id}?workspace=hermes-control-center`,
    );
    const newChatButton = findButtonByText(container, "New chat");

    expect(newChatButton).not.toBeNull();

    await act(async () => {
      newChatButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createSession).toHaveBeenCalledWith({
      model: selectedRuntimeSession.model ?? undefined,
      workspace: "/root/hermes-control-center",
    });
    expect(router.state.location.pathname).toBe("/sessions/sess-workspace-new");
    expect(router.state.location.search).toBe("?workspace=hermes-control-center");

    await cleanup();
  });

  it("sends the next message from the chat composer and renders the returned response", async () => {
    vi.spyOn(api, "getSessionMessages").mockResolvedValue({
      session_id: selectedRuntimeSession.id,
      messages: [{ role: "assistant", content: "Existing transcript" } as SessionMessage],
    });
    const sendChatMessage = vi.spyOn(api, "sendChatMessage").mockResolvedValue({
      answer: "Hermes reply",
      status: "done",
      result: null,
      session: {
        ...sessions[0],
        last_active: 1713000400,
        message_count: 11,
        preview: "Hermes reply",
      },
      messages: [
        { role: "assistant", content: "Existing transcript" },
        { role: "user", content: "Ship the chat MVP" },
        { role: "assistant", content: "Hermes reply" },
      ],
    });

    const { container, cleanup } = await renderSessionsRoute(`/sessions/${selectedRuntimeSession.id}`);
    const textarea = container.querySelector("textarea");
    const sendButton = findButtonByText(container, "Send");

    expect(textarea).not.toBeNull();
    expect(sendButton).not.toBeNull();

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      valueSetter?.call(textarea, "Ship the chat MVP");
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
      textarea!.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });

    const sendButtonAfterInput = findButtonByText(container, "Send");

    await act(async () => {
      sendButtonAfterInput!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(sendChatMessage).toHaveBeenCalledWith({
      sessionId: selectedRuntimeSession.id,
      message: "Ship the chat MVP",
      model: selectedRuntimeSession.model ?? undefined,
      workspace: "/root/hermes-control-center",
    });
    expect(container.textContent).toContain("Hermes reply");

    await cleanup();
  });

  it("supports cmd-or-ctrl-enter as a fast send shortcut", async () => {
    vi.spyOn(api, "getSessionMessages").mockResolvedValue({
      session_id: selectedRuntimeSession.id,
      messages: [{ role: "assistant", content: "Existing transcript" } as SessionMessage],
    });
    const sendChatMessage = vi.spyOn(api, "sendChatMessage").mockResolvedValue({
      answer: "Shortcut reply",
      status: "done",
      result: null,
      session: {
        ...sessions[0],
        last_active: 1713000500,
        message_count: 11,
        preview: "Shortcut reply",
      },
      messages: [
        { role: "assistant", content: "Existing transcript" },
        { role: "user", content: "Send with shortcut" },
        { role: "assistant", content: "Shortcut reply" },
      ],
    });

    const { container, cleanup } = await renderSessionsRoute(`/sessions/${selectedRuntimeSession.id}`);
    const textarea = container.querySelector("textarea");

    expect(textarea).not.toBeNull();

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      valueSetter?.call(textarea, "Send with shortcut");
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
      textarea!.dispatchEvent(new Event("change", { bubbles: true }));
      textarea!.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", ctrlKey: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(sendChatMessage).toHaveBeenCalledWith({
      sessionId: selectedRuntimeSession.id,
      message: "Send with shortcut",
      model: selectedRuntimeSession.model ?? undefined,
      workspace: "/root/hermes-control-center",
    });
    expect(container.textContent).toContain("Shortcut reply");

    await cleanup();
  });

  it("preserves workspace scope when the composer creates the first session from an empty scoped route", async () => {
    const unrelatedSessions = sessions.map((session) => ({ ...session, id: `${session.id}-external` }));
    const createSession = vi.spyOn(api, "createSession").mockResolvedValue({
      session: {
        ...sessions[0],
        id: "sess-empty-scope",
        title: "Empty scope session",
        preview: "Scoped send reply",
        last_active: 1713000600,
      },
      messages: [],
    });
    const sendChatMessage = vi.spyOn(api, "sendChatMessage").mockResolvedValue({
      answer: "Scoped send reply",
      status: "done",
      result: null,
      session: {
        ...sessions[0],
        id: "sess-empty-scope",
        title: "Empty scope session",
        preview: "Scoped send reply",
        last_active: 1713000601,
        message_count: 2,
      },
      messages: [
        { role: "user", content: "Create from empty scope" },
        { role: "assistant", content: "Scoped send reply" },
      ],
    });

    const { container, router, cleanup } = await renderSessionsRoute(
      "/sessions?workspace=hermes-control-center",
      unrelatedSessions,
    );
    const textarea = container.querySelector("textarea");

    expect(container.textContent).toContain("No sessions are linked to this workspace yet");
    expect(textarea).not.toBeNull();

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      valueSetter?.call(textarea, "Create from empty scope");
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
      textarea!.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });

    const sendButton = findButtonByText(container, "Send");
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createSession).toHaveBeenCalledWith({
      model: undefined,
      workspace: "/root/hermes-control-center",
    });
    expect(sendChatMessage).toHaveBeenCalledWith({
      sessionId: "sess-empty-scope",
      message: "Create from empty scope",
      model: selectedRuntimeSession.model ?? undefined,
      workspace: "/root/hermes-control-center",
    });
    expect(router.state.location.pathname).toBe("/sessions/sess-empty-scope");
    expect(router.state.location.search).toBe("?workspace=hermes-control-center");
    expect(container.textContent).toContain("Scoped send reply");

    await cleanup();
  });
});

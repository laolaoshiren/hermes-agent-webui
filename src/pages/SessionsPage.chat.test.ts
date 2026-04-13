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
    });
    expect(container.textContent).toContain("Hermes reply");

    await cleanup();
  });
});

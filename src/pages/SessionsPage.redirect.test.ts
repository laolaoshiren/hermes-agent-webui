// @vitest-environment jsdom

import { act } from "react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import SessionsPage from "@/pages/SessionsPage";
import type { SessionsPageProps } from "@/pages/SessionsPage";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import type { SessionInfo } from "@/lib/api";

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
  });

  await act(async () => {
    root.unmount();
    await Promise.resolve();
  });
  container.remove();

  return router.state.location;
}

describe("SessionsPage redirect behavior", () => {
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
  });

  it("clears invalid workspace slugs on the base sessions route", async () => {
    const location = await renderSessionsRoute("/sessions?workspace=missing-workspace");

    expect(location.pathname).toBe("/sessions");
    expect(location.search).toBe("");
  });

  it("clears invalid workspace slugs on a selected session route", async () => {
    const location = await renderSessionsRoute(`/sessions/${selectedRuntimeSession.id}?workspace=missing-workspace`);

    expect(location.pathname).toBe(`/sessions/${selectedRuntimeSession.id}`);
    expect(location.search).toBe("");
  });

  it("preserves a valid workspace scope when canonicalizing a session route", async () => {
    const otherWorkspaceSession = {
      ...runtimeContractSnapshot.sessions[0],
      id: "sess-other-workspace",
      title: "Other workspace session",
      workspaceId: "ws-other",
      runIds: [],
    };
    const scopedSnapshot = {
      ...runtimeContractSnapshot,
      workspaces: [
        ...runtimeContractSnapshot.workspaces,
        {
          ...runtimeContractSnapshot.workspaces[0],
          id: "ws-other",
          slug: "other-workspace",
          name: "Other Workspace",
          repository: {
            ...(runtimeContractSnapshot.workspaces[0]?.repository ?? { provider: "github", owner: null, name: "other-workspace", branch: "main" }),
            owner: "example",
            name: "other-workspace",
            branch: "main",
          },
          defaultBranch: "main",
          policyPreset: "observer",
          activeRunCount: 0,
          updatedAt: runtimeContractSnapshot.workspaces[0]?.updatedAt ?? new Date(0).toISOString(),
        },
      ],
      sessions: [...runtimeContractSnapshot.sessions, otherWorkspaceSession],
    };
    runtimeQueryState = {
      data: {
        source: "fixture",
        snapshot: scopedSnapshot,
        error: null,
      },
      isPending: false,
    };
    const allSessions = [
      ...sessions,
      {
        ...sessions[0],
        id: "sess-other-workspace",
        title: "Other workspace session",
        is_active: false,
      },
    ];

    const location = await renderSessionsRoute("/sessions/sess-other-workspace?workspace=hermes-control-center", allSessions);

    expect(location.pathname).toBe(`/sessions/${selectedRuntimeSession.id}`);
    expect(location.search).toBe("?workspace=hermes-control-center");
  });
});

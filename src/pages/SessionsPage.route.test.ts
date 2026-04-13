import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import SessionsPage from "@/pages/SessionsPage";
import type { SessionsPageProps } from "@/pages/SessionsPage";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import type { SessionInfo } from "@/lib/api";

const selectedRuntimeSession = runtimeContractSnapshot.sessions[0]!;
const selectedRun = runtimeContractSnapshot.runs.find(
  (run) => run.sessionId === selectedRuntimeSession.id && run.status === "running",
)!;

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

const TestSessionsPage = SessionsPage as unknown as (props: SessionsPageProps) => ReturnType<typeof SessionsPage>;

function renderSessionsRoute(initialEntry: string, initialSessions: SessionInfo[] = sessions) {
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

  const markup = renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n },
      createElement(RouterProvider, {
        router,
      }),
    ),
  );

  return {
    markup,
    location: router.state.location,
  };
}

vi.mock("@/features/runtime/useRuntimeSnapshot", () => ({
  useRuntimeSnapshot: () => runtimeQueryState,
}));

describe("SessionsPage route review surface", () => {
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

  it("renders selected session review context and related run handoff for /sessions/:sessionId", () => {
    const { markup } = renderSessionsRoute(`/sessions/${selectedRuntimeSession.id}`);

    expect(markup).toContain("Selected session");
    expect(markup).toContain(selectedRuntimeSession.title ?? selectedRuntimeSession.id);
    expect(markup).toContain("Runtime handoff");
    expect(markup).toContain(selectedRun.title);
    expect(markup).toContain("Open run review");
  });

  it("shows a workspace-scoped session queue on the base sessions route", () => {
    const { markup } = renderSessionsRoute(`/sessions?workspace=hermes-control-center`);

    expect(markup).toContain("Workspace-scoped sessions");
    expect(markup).toContain("Showing 1 session linked to Hermes Control Center.");
    expect(markup).toContain("Return to workspace review");
  });

  it("shows runtime hydration loading before applying workspace-scoped redirects", () => {
    runtimeQueryState = {
      data: {
        source: "fixture",
        snapshot: runtimeContractSnapshot,
        error: null,
      },
      isPending: true,
    };

    const { markup } = renderSessionsRoute(`/sessions?workspace=hermes-control-center`);

    expect(markup).toContain("Hydrating live runtime");
    expect(markup).toContain("Loading sessions and replay data from the Hermes backend before rendering route-specific runtime details.");
  });

  it("keeps workspace scope on session review and related run handoff", () => {
    const { markup } = renderSessionsRoute(`/sessions/${selectedRuntimeSession.id}?workspace=hermes-control-center`);

    expect(markup).toContain("Workspace-scoped sessions");
    expect(markup).toContain("/runs/run-runtime-adapter?workspace=hermes-control-center");
    expect(markup).toContain(`/sessions/${selectedRuntimeSession.id}?workspace=hermes-control-center`);
  });

  // redirect behavior is covered in SessionsPage.redirect.test.tsx under jsdom so actual router navigation is observable.
});


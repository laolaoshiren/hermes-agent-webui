import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance, type i18n as I18nInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import enApp from "@/locales/en/app.json";
import zhApp from "@/locales/zh-CN/app.json";
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
  data?: {
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

async function createTestI18n(language: "en" | "zh-CN"): Promise<I18nInstance> {
  const instance = createInstance();
  await instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: "en",
    supportedLngs: ["en", "zh-CN"],
    defaultNS: "app",
    resources: {
      en: { app: enApp },
      "zh-CN": { app: zhApp },
    },
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
}

function renderSessionsRoute(
  initialEntry: string,
  initialSessions: SessionInfo[] = sessions,
  i18nInstance: I18nInstance = i18n,
) {
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
      { i18n: i18nInstance },
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

  it("renders selected session review context and replay-aware related run handoff for /sessions/:sessionId", () => {
    const { markup } = renderSessionsRoute(`/sessions/${selectedRuntimeSession.id}`);

    expect(markup).toContain("Selected session");
    expect(markup).toContain(selectedRuntimeSession.title ?? selectedRuntimeSession.id);
    expect(markup).toContain("Runtime handoff");
    expect(markup).toContain(selectedRun.title);
    expect(markup).toContain("Replay trust context");
    expect(markup).toContain("Latest replay event");
    expect(markup).toContain("Open run review");
  });

  it("shows a workspace-scoped session queue on the base sessions route", () => {
    const { markup } = renderSessionsRoute(`/sessions?workspace=hermes-control-center`);

    expect(markup).toContain("Workspace-scoped sessions");
    expect(markup).toContain("Showing 1 session linked to Hermes Agent Web UI.");
    expect(markup).toContain("Return to workspace review");
  });

  it("keeps the sessions shell visible while runtime hydration is still pending", () => {
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
    expect(markup).toContain("Workspace-scoped sessions");
    expect(markup).toContain("Return to workspace review");
    expect(markup).not.toContain(
      "Loading sessions and replay data from the Hermes backend before rendering route-specific runtime details.",
    );
  });

  it("keeps workspace scope on session review and related run handoff", () => {
    const { markup } = renderSessionsRoute(`/sessions/${selectedRuntimeSession.id}?workspace=hermes-control-center`);

    expect(markup).toContain("Workspace-scoped sessions");
    expect(markup).toContain("Replay trust context");
    expect(markup).toContain("3 replay events");
    expect(markup).toContain("System events");
    expect(markup).toContain("/runs/run-runtime-adapter?workspace=hermes-control-center");
    expect(markup).toContain(`/sessions/${selectedRuntimeSession.id}?workspace=hermes-control-center`);
  });

  it("renders an honest workspace-scoped empty state when no sessions are linked to the active workspace", () => {
    const unrelatedSessions = sessions.map((session) => ({ ...session, id: `${session.id}-external` }));
    const { markup } = renderSessionsRoute(`/sessions?workspace=hermes-control-center`, unrelatedSessions);

    expect(markup).toContain("Workspace-scoped sessions");
    expect(markup).toContain("No sessions are linked to this workspace yet");
    expect(markup).toContain("Hermes Agent Web UI does not currently expose any sessions in the shared runtime snapshot.");
  });

  it("localizes the replay trust surface in Simplified Chinese", async () => {
    const zhI18n = await createTestI18n("zh-CN");
    const { markup } = renderSessionsRoute(`/sessions/${selectedRuntimeSession.id}`, sessions, zhI18n);

    expect(markup).toContain("会话回放信任上下文");
    expect(markup).toContain("最近回放事件");
    expect(markup).toContain("查看运行审查");
  });

  // redirect behavior is covered in SessionsPage.redirect.test.tsx under jsdom so actual router navigation is observable.
});


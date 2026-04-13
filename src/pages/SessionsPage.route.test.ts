import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";

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

const TestSessionsPage = SessionsPage as unknown as (props: SessionsPageProps) => ReturnType<typeof SessionsPage>;

vi.mock("@/features/runtime/useRuntimeSnapshot", () => ({
  useRuntimeSnapshot: () => ({
    data: {
      source: "fixture",
      snapshot: runtimeContractSnapshot,
      error: null,
    },
    isPending: false,
  }),
}));

describe("SessionsPage route review surface", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders selected session review context and related run handoff for /sessions/:sessionId", () => {
    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(
          MemoryRouter,
          { initialEntries: [`/sessions/${selectedRuntimeSession.id}`] },
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: "/sessions/:sessionId",
              element: createElement(TestSessionsPage, { initialSessions: sessions }),
            }),
          ),
        ),
      ),
    );

    expect(markup).toContain("Selected session");
    expect(markup).toContain(selectedRuntimeSession.title ?? selectedRuntimeSession.id);
    expect(markup).toContain("Runtime handoff");
    expect(markup).toContain(selectedRun.title);
    expect(markup).toContain("Open run review");
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import RunsPage from "@/pages/RunsPage";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";

const singleReplaySnapshot = {
  ...runtimeContractSnapshot,
  sessions: runtimeContractSnapshot.sessions.map((session, index) =>
    index === 0
      ? {
          ...session,
          runIds: ["run-replay-focus"],
        }
      : session,
  ),
  runs: [
    {
      ...runtimeContractSnapshot.runs[0],
      id: "run-replay-focus",
      sessionId: runtimeContractSnapshot.sessions[0]?.id ?? runtimeContractSnapshot.runs[0].sessionId,
      title: "Replay focus run",
      summary: "Render the selected replay summary.",
      status: "running",
      approvalIds: [],
      artifactIds: [],
      eventCount: 1,
    },
  ],
  approvals: [],
  artifacts: [],
  events: [
    {
      ...runtimeContractSnapshot.events[0],
      id: "event-replay-focus",
      runId: "run-replay-focus",
      kind: "system",
      title: "Replay summary booted",
      detail: "Single event detail.",
      timestamp: "2026-04-13T09:00:00Z",
      artifactId: null,
      approvalId: null,
      toolName: null,
      metadata: {},
    },
  ],
};

vi.mock("@/features/runtime/useRuntimeSnapshot", () => ({
  useRuntimeSnapshot: () => ({
    data: {
      source: "fixture",
      snapshot: singleReplaySnapshot,
      error: null,
    },
    isPending: false,
  }),
}));

describe("RunsPage", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders the selected run replay summary card for the active run", () => {
    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(
          MemoryRouter,
          { initialEntries: ["/runs/run-replay-focus"] },
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: "/runs/:runId",
              element: createElement(RunsPage),
            }),
          ),
        ),
      ),
    );

    expect(markup).toContain("Replay focus run");
    expect(markup).toContain("Render the selected replay summary.");
    expect(markup).toContain("Selected run replay context");
    expect(markup).toContain("1 replay event");
    expect(markup).toContain("Single event detail.");
  });
});

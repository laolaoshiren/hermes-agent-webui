// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import StatusPage from "@/pages/StatusPage";
import type { SessionInfo, StatusResponse } from "@/lib/api";

const mockGetStatus = vi.fn<() => Promise<StatusResponse>>();
const mockGetSessions = vi.fn<() => Promise<SessionInfo[]>>();

vi.mock("@/lib/api", () => ({
  api: {
    getStatus: () => mockGetStatus(),
    getSessions: () => mockGetSessions(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const statusFixture: StatusResponse = {
  active_sessions: 1,
  config_path: "~/.hermes/config.yaml",
  config_version: 1,
  env_path: "~/.hermes/.env",
  gateway_exit_reason: null,
  gateway_pid: 4242,
  gateway_platforms: {
    telegram: {
      state: "connected",
      updated_at: "2026-04-14T00:00:00.000Z",
    },
  },
  gateway_running: true,
  gateway_state: "running",
  gateway_updated_at: "2026-04-14T00:00:00.000Z",
  hermes_home: "~/.hermes",
  latest_config_version: 1,
  release_date: "2026-04-14",
  version: "0.1.0",
};

const sessionFixture: SessionInfo[] = [
  {
    id: "sess-live",
    source: null,
    workspace: null,
    model: null,
    title: null,
    started_at: 1713050000,
    ended_at: null,
    last_active: 1713050600,
    is_active: true,
    message_count: 9,
    tool_call_count: 0,
    input_tokens: 0,
    output_tokens: 0,
    preview: null,
  },
  {
    id: "sess-recent",
    source: null,
    workspace: null,
    model: null,
    title: null,
    started_at: 1713040000,
    ended_at: 1713040900,
    last_active: 1713040900,
    is_active: false,
    message_count: 4,
    tool_call_count: 0,
    input_tokens: 0,
    output_tokens: 0,
    preview: "Recent preview",
  },
];

async function renderStatusPage(language: "en" | "zh-CN") {
  await i18n.changeLanguage(language);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(I18nextProvider, { i18n }, createElement(StatusPage)));
    await Promise.resolve();
    await Promise.resolve();
  });

  const html = container.innerHTML;

  await act(async () => {
    root.unmount();
    await Promise.resolve();
  });
  container.remove();

  return html;
}

describe("StatusPage", () => {
  beforeEach(() => {
    mockGetStatus.mockResolvedValue(statusFixture);
    mockGetSessions.mockResolvedValue(sessionFixture);
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders English localized runtime status copy", async () => {
    const html = await renderStatusPage("en");

    expect(html).toContain("Status");
    expect(html).toContain("Monitor Hermes runtime health");
    expect(html).toContain("Runtime heartbeat");
    expect(html).toContain("Gateway");
    expect(html).toContain("Active sessions");
    expect(html).toContain("Connected platforms");
    expect(html).toContain("Untitled");
    expect(html).toContain("unknown");
    expect(html).toContain("Last update");
  });

  it("renders Simplified Chinese localized runtime status copy", async () => {
    const html = await renderStatusPage("zh-CN");

    expect(html).toContain("状态");
    expect(html).toContain("运行时脉搏");
    expect(html).toContain("用一个中英双语概览页面集中查看 Hermes 运行时健康度");
    expect(html).toContain("活跃会话");
    expect(html).toContain("已连接平台");
    expect(html).toContain("未命名");
    expect(html).toContain("未知");
    expect(html).toContain("最近更新");
    expect(html).not.toContain("ago");
    expect(html).not.toContain("just now");
  });

  it("renders a localized load error when status loading fails", async () => {
    mockGetStatus.mockRejectedValue(new Error("boom"));
    mockGetSessions.mockResolvedValue([]);

    const html = await renderStatusPage("en");

    expect(html).toContain("Failed to load Hermes status.");
    expect(html).toContain("Check whether the Hermes backend is reachable");
  });
});

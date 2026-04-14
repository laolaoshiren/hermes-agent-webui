// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import CronPage from "@/pages/CronPage";
import type { CronJob } from "@/lib/api";

const mockGetCronJobs = vi.fn<() => Promise<CronJob[]>>();
const mockShowToast = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    getCronJobs: () => mockGetCronJobs(),
    createCronJob: vi.fn(),
    pauseCronJob: vi.fn(),
    resumeCronJob: vi.fn(),
    triggerCronJob: vi.fn(),
    deleteCronJob: vi.fn(),
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    toast: null,
    showToast: mockShowToast,
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderCronPage(language: "en" | "zh-CN") {
  await i18n.changeLanguage(language);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(I18nextProvider, { i18n }, createElement(CronPage)));
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

describe("CronPage", () => {
  beforeEach(() => {
    mockGetCronJobs.mockResolvedValue([
      {
        id: "cron-1",
        name: "Daily digest",
        prompt: "Summarize the last day of activity for the operator.",
        schedule: "0 9 * * *",
        status: "paused",
        deliver: "telegram",
        last_run_at: "2026-04-14T01:02:03.000Z",
        next_run_at: "2026-04-14T09:00:00.000Z",
      },
    ] satisfies CronJob[]);
    mockShowToast.mockReset();
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders localized English cron management copy", async () => {
    const html = await renderCronPage("en");

    expect(html).toContain("Cron jobs");
    expect(html).toContain("Schedule autonomous follow-up, reporting, and workflow tasks");
    expect(html).toContain("New cron job");
    expect(html).toContain("1 scheduled job");
    expect(html).toContain("Paused");
    expect(html).toContain("Telegram");
    expect(html).toContain("Last:");
    expect(html).toContain("Next:");
  });

  it("renders localized Simplified Chinese cron management copy", async () => {
    const html = await renderCronPage("zh-CN");

    expect(html).toContain("定时任务");
    expect(html).toContain("在 Hermes 产品壳层内直接编排自主跟进、汇报和工作流任务");
    expect(html).toContain("新建定时任务");
    expect(html).toContain("1 个定时任务");
    expect(html).toContain("已暂停");
    expect(html).toContain("上次运行");
    expect(html).toContain("下次运行");
  });

  it("shows the localized empty state when no jobs exist", async () => {
    mockGetCronJobs.mockResolvedValue([]);

    const html = await renderCronPage("en");

    expect(html).toContain("No cron jobs configured yet. Create one above.");
  });
});

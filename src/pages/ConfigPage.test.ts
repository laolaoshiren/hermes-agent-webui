// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import ConfigPage from "@/pages/ConfigPage";

const mockGetConfig = vi.fn<() => Promise<Record<string, unknown>>>();
const mockGetSchema = vi.fn<() => Promise<{ fields: Record<string, Record<string, unknown>>; category_order: string[] }>>();
const mockGetDefaults = vi.fn<() => Promise<Record<string, unknown>>>();
const mockGetConfigRaw = vi.fn<() => Promise<{ yaml: string }>>();
const mockSaveConfig = vi.fn();
const mockSaveConfigRaw = vi.fn();
const mockShowToast = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    getConfig: () => mockGetConfig(),
    getSchema: () => mockGetSchema(),
    getDefaults: () => mockGetDefaults(),
    getConfigRaw: () => mockGetConfigRaw(),
    saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
    saveConfigRaw: (...args: unknown[]) => mockSaveConfigRaw(...args),
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: null, showToast: mockShowToast }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const configFixture = {
  agent: { model: "claude-sonnet-4" },
  terminal: { default_shell: "/bin/bash" },
};

const schemaFixture = {
  fields: {
    "agent.model": { category: "agent", description: "Primary model", type: "string" },
    "terminal.default_shell": { category: "terminal", description: "Default shell", type: "string" },
  },
  category_order: ["agent", "terminal"],
};

async function renderConfigPage(language: "en" | "zh-CN") {
  await i18n.changeLanguage(language);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(I18nextProvider, { i18n }, createElement(ConfigPage)));
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

describe("ConfigPage", () => {
  beforeEach(() => {
    mockGetConfig.mockResolvedValue(configFixture);
    mockGetSchema.mockResolvedValue(schemaFixture);
    mockGetDefaults.mockResolvedValue(configFixture);
    mockGetConfigRaw.mockResolvedValue({ yaml: "agent:\n  model: claude-sonnet-4\n" });
    mockShowToast.mockReset();
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders English localized config surface copy", async () => {
    const html = await renderConfigPage("en");

    expect(html).toContain("Config");
    expect(html).toContain("Configuration surface");
    expect(html).toContain("Inspect, search, import, export, and edit Hermes configuration");
    expect(html).toContain("Search...");
    expect(html).toContain("Agent");
    expect(html).toContain("Terminal");
    expect(html).toContain("1 field");
  });

  it("renders Simplified Chinese localized config surface copy", async () => {
    const html = await renderConfigPage("zh-CN");

    expect(html).toContain("配置");
    expect(html).toContain("配置界面");
    expect(html).toContain("以结构化表单或原始 YAML 的方式查看、搜索、导入、导出和编辑 Hermes 配置");
    expect(html).toContain("搜索...");
    expect(html).toContain("代理");
    expect(html).toContain("终端");
    expect(html).toContain("1 个字段");
  });

  it("renders localized load errors when config loading fails", async () => {
    mockGetConfig.mockRejectedValue(new Error("boom"));
    mockGetSchema.mockRejectedValue(new Error("boom"));
    mockGetDefaults.mockRejectedValue(new Error("boom"));

    const html = await renderConfigPage("en");

    expect(html).toContain("Failed to load current config.");
    expect(html).toContain("The config surface could not initialize cleanly.");
  });
});

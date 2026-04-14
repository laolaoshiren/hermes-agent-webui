// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import SkillsPage from "@/pages/SkillsPage";
import type { SkillInfo, ToolsetInfo } from "@/lib/api";

const mockGetSkills = vi.fn<() => Promise<SkillInfo[]>>();
const mockGetToolsets = vi.fn<() => Promise<ToolsetInfo[]>>();
const mockToggleSkill = vi.fn<(name: string, enabled: boolean) => Promise<void>>();
const mockShowToast = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    getSkills: () => mockGetSkills(),
    getToolsets: () => mockGetToolsets(),
    toggleSkill: (name: string, enabled: boolean) => mockToggleSkill(name, enabled),
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    toast: null,
    showToast: mockShowToast,
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const skillsFixture: SkillInfo[] = [
  { name: "obsidian", description: "Manage notes in Obsidian.", category: "note-taking", enabled: true },
  { name: "whisper", description: "Transcribe audio files.", category: "mlops/models", enabled: false },
];

const toolsetsFixture: ToolsetInfo[] = [
  {
    name: "browser",
    label: "🌐 Browser",
    description: "Drive browser interactions.",
    enabled: true,
    configured: false,
    tools: ["open", "click"],
  },
  {
    name: "terminal",
    label: "⌨️ Terminal",
    description: "Run shell commands.",
    enabled: false,
    configured: false,
    tools: [],
  },
];

async function renderSkillsPage(language: "en" | "zh-CN") {
  await i18n.changeLanguage(language);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(I18nextProvider, { i18n }, createElement(SkillsPage)));
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

describe("SkillsPage", () => {
  beforeEach(() => {
    mockGetSkills.mockResolvedValue(skillsFixture);
    mockGetToolsets.mockResolvedValue(toolsetsFixture);
    mockToggleSkill.mockResolvedValue();
    mockShowToast.mockReset();
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders English localized skills inventory copy", async () => {
    const html = await renderSkillsPage("en");

    expect(html).toContain("Skills");
    expect(html).toContain("Capability registry");
    expect(html).toContain("Inspect reusable skills, category coverage, and toolset availability");
    expect(html).toContain("Search skills and toolsets...");
    expect(html).toContain("All (2)");
    expect(html).toContain("Note Taking");
    expect(html).toContain("MLOps / Models");
    expect(html).toContain("Toolsets (2)");
    expect(html).toContain("Setup needed");
    expect(html).toContain("Disabled for CLI");
    expect(html).toContain("skills inventory");
  });

  it("renders Simplified Chinese localized skills inventory copy", async () => {
    const html = await renderSkillsPage("zh-CN");

    expect(html).toContain("技能");
    expect(html).toContain("能力注册表");
    expect(html).toContain("查看可复用技能、分类覆盖范围与工具集可用性");
    expect(html).toContain("搜索技能与工具集...");
    expect(html).toContain("全部（2）");
    expect(html).toContain("笔记");
    expect(html).toContain("MLOps / 模型");
    expect(html).toContain("工具集（2）");
    expect(html).toContain("需要配置");
    expect(html).toContain("CLI 中不可用");
  });

  it("renders the localized empty state when no skills are returned", async () => {
    mockGetSkills.mockResolvedValue([]);
    mockGetToolsets.mockResolvedValue([]);

    const html = await renderSkillsPage("en");

    expect(html).toContain("No skills found. Skills are loaded from ~/.hermes/skills/.");
    expect(html).toContain("No toolsets match the search.");
  });
});

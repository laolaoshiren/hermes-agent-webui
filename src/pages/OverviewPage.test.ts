import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import OverviewPage from "@/pages/OverviewPage";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";

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

describe("OverviewPage", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders the renamed localized product title", () => {
    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(OverviewPage),
      ),
    );

    expect(markup).toContain("Hermes Agent Web UI");
    expect(markup).toContain("A product-grade web platform for Hermes Agent");
  });
});

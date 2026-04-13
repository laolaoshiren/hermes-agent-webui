import { describe, expect, it } from "vitest";

import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { deriveWorkspaceMetrics, deriveWorkspaceReview } from "@/pages/workspaceReview";

const snapshot = {
  ...runtimeContractSnapshot,
  approvals: runtimeContractSnapshot.approvals.map((approval, index) =>
    index === 0
      ? {
          ...approval,
          status: "pending" as const,
          requestedAt: "2026-04-13T09:05:00Z",
        }
      : approval,
  ),
  events: runtimeContractSnapshot.events.map((event, index) =>
    index === runtimeContractSnapshot.events.length - 1
      ? {
          ...event,
          timestamp: "2026-04-13T09:10:00Z",
        }
      : event,
  ),
};

describe("workspaceReview", () => {
  it("derives canonical workspace review state and linked metrics", () => {
    const review = deriveWorkspaceReview(snapshot, null);

    expect(review.canonicalWorkspaceSlug).toBe("hermes-control-center");
    expect(review.selectedWorkspace?.id).toBe("ws-hcc");
    expect(review.metrics.sessions).toBe(1);
    expect(review.metrics.runs).toBe(2);
    expect(review.metrics.activeRuns).toBe(1);
    expect(review.metrics.pendingApprovals).toBe(2);
    expect(review.metrics.artifacts).toBe(2);
    expect(review.primaryRun?.id).toBe("run-runtime-adapter");
    expect(review.primaryApproval?.id).toBe("approval-adapter-pr");
    expect(review.primarySession?.id).toBe("sess-20260413-runtime-contract");
  });

  it("redirects invalid workspace slugs back to the canonical workspace", () => {
    const review = deriveWorkspaceReview(snapshot, "missing-workspace");

    expect(review.shouldRedirectToCanonical).toBe(true);
    expect(review.canonicalWorkspaceSlug).toBe("hermes-control-center");
    expect(review.selectedWorkspace?.id).toBe("ws-hcc");
  });

  it("computes latest workspace activity from linked runtime records and events", () => {
    const metrics = deriveWorkspaceMetrics(snapshot, "ws-hcc");

    expect(metrics.latestActivityAt).toBe("2026-04-13T09:10:00Z");
  });
});

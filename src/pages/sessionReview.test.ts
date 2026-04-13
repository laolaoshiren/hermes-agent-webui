import { describe, expect, it } from "vitest";

import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { getApprovalsForRun, getArtifactsForRun, getTimelineForRun } from "@/features/runtime/selectors";
import type { SessionInfo } from "@/lib/api";
import { deriveSessionReview, getDefaultSession } from "@/pages/sessionReview";

function createSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    id: "session-live-1",
    source: "cli",
    model: "custom/gpt-5.4",
    title: "Live session",
    started_at: 1713000000,
    ended_at: null,
    last_active: 1713000600,
    is_active: true,
    message_count: 12,
    tool_call_count: 3,
    input_tokens: 100,
    output_tokens: 200,
    preview: "Inspect the selected session",
    ...overrides,
  };
}

describe("sessionReview", () => {
  it("prefers an active session as the default selection", () => {
    const selected = getDefaultSession([
      createSession({ id: "session-inactive", is_active: false }),
      createSession({ id: "session-active", is_active: true }),
    ]);

    expect(selected?.id).toBe("session-active");
  });

  it("returns the highest-priority related run for a selected session with multiple linked runs", () => {
    const selectedRuntimeSession = runtimeContractSnapshot.sessions[0]!;
    const runningRun = runtimeContractSnapshot.runs.find((run) => run.sessionId === selectedRuntimeSession.id && run.status === "running")!;

    const sessions: SessionInfo[] = [
      createSession({
        id: selectedRuntimeSession.id,
        title: selectedRuntimeSession.title,
        source: selectedRuntimeSession.source,
        model: selectedRuntimeSession.model,
        message_count: 17,
        tool_call_count: 5,
        preview: selectedRuntimeSession.preview,
      }),
    ];

    const review = deriveSessionReview(sessions, runtimeContractSnapshot, selectedRuntimeSession.id);

    expect(review.selectedSession?.id).toBe(selectedRuntimeSession.id);
    expect(review.runtimeSession?.id).toBe(selectedRuntimeSession.id);
    expect(review.relatedRun?.id).toBe(runningRun.id);
    expect(review.metrics.messages).toBe(17);
    expect(review.metrics.toolCalls).toBe(5);
    expect(review.metrics.linkedRuns).toBe(selectedRuntimeSession.runIds.length);
    expect(review.metrics.timelineEvents).toBe(
      runtimeContractSnapshot.events.filter((event) => event.runId === runningRun.id).length,
    );
  });

  it("derives replay trust context for the selected session's related run", () => {
    const selectedRuntimeSession = runtimeContractSnapshot.sessions[0]!;
    const review = deriveSessionReview(
      [createSession({ id: selectedRuntimeSession.id, is_active: true })],
      runtimeContractSnapshot,
      selectedRuntimeSession.id,
    );
    const expectedTimeline = review.relatedRun ? getTimelineForRun(runtimeContractSnapshot, review.relatedRun.id) : [];

    expect(review.replaySummary.messageCount + review.replaySummary.toolCallCount + review.replaySummary.systemEventCount).toBeGreaterThan(0);
    expect(review.latestReplayEvent?.runId).toBe(review.relatedRun?.id ?? null);
    expect(review.latestReplayEvent).toEqual(expectedTimeline[expectedTimeline.length - 1] ?? null);
    expect(review.relatedApprovals).toEqual(review.relatedRun ? getApprovalsForRun(runtimeContractSnapshot, review.relatedRun.id) : []);
    expect(review.relatedArtifacts).toEqual(review.relatedRun ? getArtifactsForRun(runtimeContractSnapshot, review.relatedRun.id) : []);
  });

  it("marks invalid route ids for redirect to the canonical selected session", () => {
    const sessions: SessionInfo[] = [
      createSession({ id: "session-one", is_active: false }),
      createSession({ id: "session-two", is_active: true }),
    ];

    const review = deriveSessionReview(sessions, runtimeContractSnapshot, "missing-session");

    expect(review.selectedSession?.id).toBe("session-two");
    expect(review.canonicalSessionId).toBe("session-two");
    expect(review.shouldRedirectToCanonical).toBe(true);
  });

  it("keeps a valid route id selected without redirecting", () => {
    const sessions: SessionInfo[] = [createSession({ id: "session-valid", is_active: true })];

    const review = deriveSessionReview(sessions, runtimeContractSnapshot, "session-valid");

    expect(review.selectedSession?.id).toBe("session-valid");
    expect(review.canonicalSessionId).toBe("session-valid");
    expect(review.shouldRedirectToCanonical).toBe(false);
  });
});

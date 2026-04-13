import { describe, expect, it } from "vitest";

import { deriveReplaySummary } from "@/pages/runsReplaySummary";
import type { RunTimelineEvent } from "@/features/runtime/types";

function createEvent(overrides: Partial<RunTimelineEvent> = {}): RunTimelineEvent {
  return {
    id: "event-1",
    runId: "run-1",
    timestamp: "2026-04-13T09:00:00Z",
    kind: "system",
    status: "completed",
    title: "Event",
    detail: "Event detail",
    actor: "scheduler",
    toolName: null,
    artifactId: null,
    approvalId: null,
    durationMs: null,
    metadata: {},
    ...overrides,
  };
}

describe("deriveReplaySummary", () => {
  it("counts replay event kinds and returns the latest replay timestamp", () => {
    const summary = deriveReplaySummary([
      createEvent({ id: "event-1", timestamp: "2026-04-13T09:01:00Z", kind: "message" }),
      createEvent({ id: "event-2", timestamp: "2026-04-13T09:03:00Z", kind: "tool_call", toolName: "terminal" }),
      createEvent({ id: "event-3", timestamp: "2026-04-13T09:02:00Z", kind: "system" }),
      createEvent({ id: "event-4", timestamp: "2026-04-13T09:04:00Z", kind: "tool_call", toolName: "search_files" }),
      createEvent({ id: "event-5", timestamp: "2026-04-13T09:05:00Z", kind: "approval", approvalId: "approval-1" }),
      createEvent({ id: "event-6", timestamp: "2026-04-13T09:06:00Z", kind: "artifact", artifactId: "artifact-1" }),
    ]);

    expect(summary).toEqual({
      totalEvents: 6,
      messageCount: 1,
      toolCallCount: 2,
      systemEventCount: 1,
      approvalEventCount: 1,
      artifactEventCount: 1,
      latestEventTimestamp: "2026-04-13T09:06:00Z",
    });
  });

  it("returns empty replay summary values when a run has no events", () => {
    expect(deriveReplaySummary([])).toEqual({
      totalEvents: 0,
      messageCount: 0,
      toolCallCount: 0,
      systemEventCount: 0,
      approvalEventCount: 0,
      artifactEventCount: 0,
      latestEventTimestamp: null,
    });
  });
});
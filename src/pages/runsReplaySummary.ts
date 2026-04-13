import type { RunTimelineEvent } from "@/features/runtime/types";

export interface ReplaySummary {
  totalEvents: number;
  messageCount: number;
  toolCallCount: number;
  systemEventCount: number;
  approvalEventCount: number;
  artifactEventCount: number;
  latestEventTimestamp: string | null;
}

export function deriveReplaySummary(events: RunTimelineEvent[]): ReplaySummary {
  return events.reduce<ReplaySummary>(
    (summary, event) => {
      summary.totalEvents += 1;

      if (event.kind === "message") {
        summary.messageCount += 1;
      }

      if (event.kind === "tool_call") {
        summary.toolCallCount += 1;
      }

      if (event.kind === "system") {
        summary.systemEventCount += 1;
      }

      if (event.kind === "approval") {
        summary.approvalEventCount += 1;
      }

      if (event.kind === "artifact") {
        summary.artifactEventCount += 1;
      }

      if (!summary.latestEventTimestamp || event.timestamp > summary.latestEventTimestamp) {
        summary.latestEventTimestamp = event.timestamp;
      }

      return summary;
    },
    {
      totalEvents: 0,
      messageCount: 0,
      toolCallCount: 0,
      systemEventCount: 0,
      approvalEventCount: 0,
      artifactEventCount: 0,
      latestEventTimestamp: null,
    },
  );
}

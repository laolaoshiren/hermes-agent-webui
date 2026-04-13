import type { RunTimelineEvent } from "@/features/runtime/types";

export interface ReplaySummary {
  messageCount: number;
  toolCallCount: number;
  systemEventCount: number;
  latestEventTimestamp: string | null;
}

export function deriveReplaySummary(events: RunTimelineEvent[]): ReplaySummary {
  return events.reduce<ReplaySummary>(
    (summary, event) => {
      if (event.kind === "message") {
        summary.messageCount += 1;
      }

      if (event.kind === "tool_call") {
        summary.toolCallCount += 1;
      }

      if (event.kind === "system") {
        summary.systemEventCount += 1;
      }

      if (!summary.latestEventTimestamp || event.timestamp > summary.latestEventTimestamp) {
        summary.latestEventTimestamp = event.timestamp;
      }

      return summary;
    },
    {
      messageCount: 0,
      toolCallCount: 0,
      systemEventCount: 0,
      latestEventTimestamp: null,
    },
  );
}

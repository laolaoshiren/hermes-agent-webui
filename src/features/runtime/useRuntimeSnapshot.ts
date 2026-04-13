import { useQuery } from "@tanstack/react-query";

import { buildRuntimeSnapshotFromSessions } from "@/features/runtime/liveAdapter";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { api } from "@/lib/api";

export interface RuntimeSnapshotResult {
  source: "live" | "fixture";
  snapshot: typeof runtimeContractSnapshot;
  error: string | null;
}

export async function fetchRuntimeSnapshot(): Promise<RuntimeSnapshotResult> {
  try {
    const sessions = await api.getSessions();
    const messageEntries = await Promise.all(
      sessions.map(async (session) => {
        const response = await api.getSessionMessages(session.id);
        return [session.id, response.messages] as const;
      }),
    );

    return {
      source: "live",
      snapshot: buildRuntimeSnapshotFromSessions({
        sessions,
        messagesBySessionId: Object.fromEntries(messageEntries),
      }),
      error: null,
    };
  } catch (error) {
    return {
      source: "fixture",
      snapshot: runtimeContractSnapshot,
      error: error instanceof Error ? error.message : "Unknown runtime hydration error",
    };
  }
}

export function useRuntimeSnapshot(enabled = true) {
  return useQuery({
    queryKey: ["runtime-snapshot"],
    queryFn: fetchRuntimeSnapshot,
    enabled,
  });
}

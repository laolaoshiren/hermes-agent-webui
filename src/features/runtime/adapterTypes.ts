import type { SessionInfo, SessionMessage } from "@/lib/api";
import type {
  ApprovalScope,
  ApprovalStatus,
  ArtifactKind,
  RunStatus,
  RunTimelineEvent,
  RunTrigger,
  TimelineEventStatus,
  WorkspaceRepositoryRef,
  WorkspaceStatus,
} from "@/features/runtime/types";

export interface RuntimeWorkspaceSource {
  id: string;
  name: string;
  slug: string;
  status: WorkspaceStatus;
  repository: WorkspaceRepositoryRef | null;
  defaultBranch: string | null;
  policyPreset: string | null;
  updatedAt: string;
}

export interface RuntimeSessionSource {
  session: SessionInfo;
  messages: SessionMessage[];
  workspaceId?: string | null;
}

export interface RuntimeRunSource {
  id: string;
  sessionId: string;
  workspaceId: string | null;
  title: string;
  status: RunStatus;
  trigger: RunTrigger;
  summary: string;
  primaryActor: string;
  startedAt: string;
  endedAt: string | null;
}

export interface RuntimeApprovalSource {
  id: string;
  runId: string;
  scope: ApprovalScope;
  status: ApprovalStatus;
  title: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string | null;
  reviewer: string | null;
  resolutionNote: string | null;
}

export interface RuntimeArtifactSource {
  id: string;
  runId: string;
  kind: ArtifactKind;
  label: string;
  path: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export interface RuntimeTimelineEventSource {
  id: string;
  runId: string;
  timestamp: string;
  kind: RunTimelineEvent["kind"];
  status: TimelineEventStatus;
  title: string;
  detail: string;
  actor: string;
  toolName: string | null;
  artifactId: string | null;
  approvalId: string | null;
  durationMs: number | null;
  metadata: Record<string, string | number | boolean>;
}

export interface RuntimeAdapterSource {
  workspaces: RuntimeWorkspaceSource[];
  sessionSources: RuntimeSessionSource[];
  runs: RuntimeRunSource[];
  approvals: RuntimeApprovalSource[];
  artifacts: RuntimeArtifactSource[];
  events: RuntimeTimelineEventSource[];
}

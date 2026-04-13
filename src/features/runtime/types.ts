export type WorkspaceStatus = "active" | "paused" | "archived";
export type RunStatus = "queued" | "running" | "awaiting_approval" | "completed" | "failed";
export type RunTrigger = "manual" | "cron" | "webhook" | "api";
export type TimelineEventKind = "message" | "tool_call" | "approval" | "artifact" | "system";
export type TimelineEventStatus = "pending" | "active" | "completed" | "failed";
export type ApprovalScope = "filesystem" | "secrets" | "network" | "deployment" | "governance";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type ArtifactKind = "diff" | "log" | "transcript" | "screenshot" | "report";

export interface WorkspaceRepositoryRef {
  provider: "github" | "gitlab" | "local";
  owner?: string;
  name: string;
  url?: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  status: WorkspaceStatus;
  repository: WorkspaceRepositoryRef | null;
  defaultBranch: string | null;
  policyPreset: string | null;
  activeRunCount: number;
  updatedAt: string;
}

export interface SessionSummary {
  id: string;
  workspaceId: string | null;
  title: string | null;
  source: string | null;
  model: string | null;
  startedAt: string;
  lastActiveAt: string;
  messageCount: number;
  runIds: string[];
  preview: string | null;
}

export interface RunSummary {
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
  approvalIds: string[];
  artifactIds: string[];
  eventCount: number;
}

export interface RunTimelineEvent {
  id: string;
  runId: string;
  timestamp: string;
  kind: TimelineEventKind;
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

export interface ApprovalSummary {
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

export interface ArtifactSummary {
  id: string;
  runId: string;
  kind: ArtifactKind;
  label: string;
  path: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export interface RuntimeContractSnapshot {
  workspaces: WorkspaceSummary[];
  sessions: SessionSummary[];
  runs: RunSummary[];
  approvals: ApprovalSummary[];
  artifacts: ArtifactSummary[];
  events: RunTimelineEvent[];
}

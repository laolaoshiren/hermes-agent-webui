import type {
  ApprovalSummary,
  ArtifactSummary,
  RunSummary,
  RunTimelineEvent,
  RuntimeContractSnapshot,
  SessionSummary,
  WorkspaceSummary,
} from "@/features/runtime/types";

const workspaces: WorkspaceSummary[] = [
  {
    id: "ws-hcc",
    name: "Hermes Control Center",
    slug: "hermes-control-center",
    status: "active",
    repository: {
      provider: "github",
      owner: "laolaoshiren",
      name: "hermes-control-center",
      url: "https://github.com/laolaoshiren/hermes-control-center",
    },
    defaultBranch: "develop",
    policyPreset: "maintainer-safe",
    activeRunCount: 1,
    updatedAt: "2026-04-13T07:40:00Z",
  },
];

const sessions: SessionSummary[] = [
  {
    id: "sess-20260413-runtime-contract",
    workspaceId: "ws-hcc",
    title: "Define runtime contract foundation for product shell",
    source: "cron",
    model: "gpt-5.4",
    startedAt: "2026-04-13T07:22:00Z",
    lastActiveAt: "2026-04-13T07:40:00Z",
    messageCount: 18,
    runIds: ["run-runtime-contract", "run-approval-review"],
    preview: "Designing shared run/session/event/approval objects before backend adapters land.",
  },
];

const runs: RunSummary[] = [
  {
    id: "run-runtime-contract",
    sessionId: "sess-20260413-runtime-contract",
    workspaceId: "ws-hcc",
    title: "Define runtime contract foundation",
    status: "running",
    trigger: "cron",
    summary: "Documenting product-facing runtime entities and wiring the Runs/Approvals shell to shared fixtures.",
    primaryActor: "Hermes maintainer cron",
    startedAt: "2026-04-13T07:25:00Z",
    endedAt: null,
    approvalIds: ["approval-push-develop"],
    artifactIds: ["artifact-runtime-doc", "artifact-runtime-plan"],
    eventCount: 5,
  },
  {
    id: "run-approval-review",
    sessionId: "sess-20260413-runtime-contract",
    workspaceId: "ws-hcc",
    title: "Review and promote repository governance PR",
    status: "completed",
    trigger: "manual",
    summary: "Merged the repository-governance work into develop after validating the branch state and CI status.",
    primaryActor: "Hermes maintainer cron",
    startedAt: "2026-04-13T07:12:00Z",
    endedAt: "2026-04-13T07:21:00Z",
    approvalIds: ["approval-repo-governance-merge"],
    artifactIds: ["artifact-pr-summary"],
    eventCount: 3,
  },
];

const approvals: ApprovalSummary[] = [
  {
    id: "approval-push-develop",
    runId: "run-runtime-contract",
    scope: "governance",
    status: "pending",
    title: "Promote runtime contract work for review",
    reason: "Open-source maintainer flow requires a reviewable branch and PR before changes land in develop.",
    requestedBy: "Hermes maintainer cron",
    requestedAt: "2026-04-13T07:36:00Z",
    expiresAt: "2026-04-14T07:36:00Z",
    reviewer: null,
    resolutionNote: null,
  },
  {
    id: "approval-repo-governance-merge",
    runId: "run-approval-review",
    scope: "governance",
    status: "approved",
    title: "Merge repository governance PR",
    reason: "The contribution guide and templates were verified as ready for develop promotion.",
    requestedBy: "Hermes maintainer cron",
    requestedAt: "2026-04-13T07:18:00Z",
    expiresAt: null,
    reviewer: "repository policy",
    resolutionNote: "Merged locally into develop and pushed after confirming the branch diff was documentation-only.",
  },
];

const artifacts: ArtifactSummary[] = [
  {
    id: "artifact-runtime-doc",
    runId: "run-runtime-contract",
    kind: "report",
    label: "Runtime contract foundation",
    path: "docs/RUNTIME_CONTRACT.md",
    sizeBytes: 8804,
    createdAt: "2026-04-13T07:34:00Z",
  },
  {
    id: "artifact-runtime-plan",
    runId: "run-runtime-contract",
    kind: "report",
    label: "Implementation plan",
    path: "docs/plans/2026-04-13-runtime-contract-foundation.md",
    sizeBytes: 5280,
    createdAt: "2026-04-13T07:31:00Z",
  },
  {
    id: "artifact-pr-summary",
    runId: "run-approval-review",
    kind: "report",
    label: "Repository governance promotion summary",
    path: null,
    sizeBytes: null,
    createdAt: "2026-04-13T07:21:00Z",
  },
];

const events: RunTimelineEvent[] = [
  {
    id: "evt-runtime-1",
    runId: "run-runtime-contract",
    timestamp: "2026-04-13T07:25:00Z",
    kind: "system",
    status: "completed",
    title: "Runtime contract task started",
    detail: "Cron-triggered maintainer run selected issue #2 as the highest-value next increment.",
    actor: "scheduler",
    toolName: null,
    artifactId: null,
    approvalId: null,
    durationMs: null,
    metadata: { issue: 2, trigger: "cron" },
  },
  {
    id: "evt-runtime-2",
    runId: "run-runtime-contract",
    timestamp: "2026-04-13T07:28:00Z",
    kind: "tool_call",
    status: "completed",
    title: "Repository state inspection",
    detail: "Checked git status, branches, recent commits, ROADMAP, DEVLOG, open PRs, and issues before making changes.",
    actor: "Hermes maintainer cron",
    toolName: "terminal",
    artifactId: null,
    approvalId: null,
    durationMs: 2200,
    metadata: { branch_count: 3, open_prs: 1 },
  },
  {
    id: "evt-runtime-3",
    runId: "run-runtime-contract",
    timestamp: "2026-04-13T07:31:00Z",
    kind: "artifact",
    status: "completed",
    title: "Implementation plan written",
    detail: "Saved a task-level plan for the runtime contract foundation increment under docs/plans.",
    actor: "Hermes maintainer cron",
    toolName: null,
    artifactId: "artifact-runtime-plan",
    approvalId: null,
    durationMs: null,
    metadata: { kind: "plan" },
  },
  {
    id: "evt-runtime-4",
    runId: "run-runtime-contract",
    timestamp: "2026-04-13T07:34:00Z",
    kind: "artifact",
    status: "completed",
    title: "Contract document updated",
    detail: "Defined workspace, session, run, timeline, approval, and artifact entities with an integration mapping back to Hermes surfaces.",
    actor: "Hermes maintainer cron",
    toolName: null,
    artifactId: "artifact-runtime-doc",
    approvalId: null,
    durationMs: null,
    metadata: { entities: 6 },
  },
  {
    id: "evt-runtime-5",
    runId: "run-runtime-contract",
    timestamp: "2026-04-13T07:36:00Z",
    kind: "approval",
    status: "active",
    title: "Review gate queued",
    detail: "A pending governance approval tracks the branch/PR promotion step for the runtime contract changes.",
    actor: "policy engine",
    toolName: null,
    artifactId: null,
    approvalId: "approval-push-develop",
    durationMs: null,
    metadata: { scope: "governance", status: "pending" },
  },
  {
    id: "evt-governance-1",
    runId: "run-approval-review",
    timestamp: "2026-04-13T07:14:00Z",
    kind: "tool_call",
    status: "completed",
    title: "PR #6 diff reviewed",
    detail: "Compared the repository-governance branch against develop and confirmed a documentation-only increment.",
    actor: "Hermes maintainer cron",
    toolName: "terminal",
    artifactId: null,
    approvalId: null,
    durationMs: 1500,
    metadata: { pr: 6 },
  },
  {
    id: "evt-governance-2",
    runId: "run-approval-review",
    timestamp: "2026-04-13T07:20:00Z",
    kind: "approval",
    status: "completed",
    title: "Governance merge approved",
    detail: "The repository governance increment was promoted into develop as a coherent baseline hardening step.",
    actor: "repository policy",
    toolName: null,
    artifactId: null,
    approvalId: "approval-repo-governance-merge",
    durationMs: null,
    metadata: { decision: "approved" },
  },
  {
    id: "evt-governance-3",
    runId: "run-approval-review",
    timestamp: "2026-04-13T07:21:00Z",
    kind: "system",
    status: "completed",
    title: "Develop updated",
    detail: "Squash-merged repository governance changes locally and pushed develop to keep the repository coherent for the next task branch.",
    actor: "Hermes maintainer cron",
    toolName: "git",
    artifactId: "artifact-pr-summary",
    approvalId: null,
    durationMs: 4800,
    metadata: { target_branch: "develop" },
  },
];

export const runtimeContractSnapshot: RuntimeContractSnapshot = {
  workspaces,
  sessions,
  runs,
  approvals,
  artifacts,
  events,
};

export function getRunById(runId: string): RunSummary | undefined {
  return runs.find((run) => run.id === runId);
}

export function getTimelineForRun(runId: string): RunTimelineEvent[] {
  return events
    .filter((event) => event.runId === runId)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function getApprovalsForRun(runId: string): ApprovalSummary[] {
  return approvals.filter((approval) => approval.runId === runId);
}

export function getArtifactsForRun(runId: string): ArtifactSummary[] {
  return artifacts.filter((artifact) => artifact.runId === runId);
}

export function getRuntimeCounts() {
  return {
    workspaces: workspaces.length,
    sessions: sessions.length,
    runs: runs.length,
    activeRuns: runs.filter((run) => run.status === "running" || run.status === "awaiting_approval").length,
    pendingApprovals: approvals.filter((approval) => approval.status === "pending").length,
    events: events.length,
    artifacts: artifacts.length,
  };
}

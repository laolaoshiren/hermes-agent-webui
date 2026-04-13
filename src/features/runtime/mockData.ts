import type { SessionInfo, SessionMessage } from "@/lib/api";
import { buildRuntimeSnapshot } from "@/features/runtime/adapters";
import type {
  RuntimeAdapterSource,
  RuntimeApprovalSource,
  RuntimeArtifactSource,
  RuntimeRunSource,
  RuntimeSessionSource,
  RuntimeTimelineEventSource,
  RuntimeWorkspaceSource,
} from "@/features/runtime/adapterTypes";

const workspaces: RuntimeWorkspaceSource[] = [
  {
    id: "ws-hcc",
    name: "Hermes Agent WebUI",
    slug: "hermes-agent-webui",
    status: "active",
    repository: {
      provider: "github",
      owner: "laolaoshiren",
      name: "hermes-agent-webui",
      url: "https://github.com/laolaoshiren/hermes-agent-webui",
    },
    defaultBranch: "develop",
    policyPreset: "maintainer-safe",
    updatedAt: "2026-04-13T08:38:00Z",
  },
];

const sessionCatalog: SessionInfo[] = [
  {
    id: "sess-20260413-runtime-contract",
    source: "cron",
    model: "gpt-5.4",
    title: "Runtime contract foundation and approval review slices",
    started_at: Math.floor(Date.parse("2026-04-13T07:12:00Z") / 1000),
    ended_at: null,
    last_active: Math.floor(Date.parse("2026-04-13T08:52:00Z") / 1000),
    is_active: true,
    message_count: 24,
    tool_call_count: 10,
    input_tokens: 18234,
    output_tokens: 6921,
    preview: "Promoted the approval review slice into develop and started runtime adapter scaffolding.",
  },
];

const sessionMessages: Record<string, SessionMessage[]> = {
  "sess-20260413-runtime-contract": [
    {
      role: "system",
      content: "Scheduled maintainer run booted for Hermes Agent WebUI.",
      timestamp: Math.floor(Date.parse("2026-04-13T07:12:00Z") / 1000),
    },
    {
      role: "assistant",
      content: "Checked repository state, merged ready review-surface work into develop, and opened the next adapter-focused branch.",
      timestamp: Math.floor(Date.parse("2026-04-13T08:38:00Z") / 1000),
    },
  ],
};

const sessionSources: RuntimeSessionSource[] = sessionCatalog.map((session) => ({
  session,
  workspaceId: "ws-hcc",
  messages: sessionMessages[session.id] ?? [],
}));

const runs: RuntimeRunSource[] = [
  {
    id: "run-approval-review",
    sessionId: "sess-20260413-runtime-contract",
    workspaceId: "ws-hcc",
    title: "Review and promote approval drill-in PR",
    status: "completed",
    trigger: "cron",
    summary: "Validated the approval review surface, fixed null-safety regressions, and promoted the slice into develop.",
    primaryActor: "Hermes maintainer cron",
    startedAt: "2026-04-13T08:13:00Z",
    endedAt: "2026-04-13T08:38:00Z",
  },
  {
    id: "run-runtime-adapter",
    sessionId: "sess-20260413-runtime-contract",
    workspaceId: "ws-hcc",
    title: "Scaffold runtime adapter seam",
    status: "running",
    trigger: "cron",
    summary: "Refactoring runtime fixtures so the UI consumes adapter-built product objects ahead of live API hydration.",
    primaryActor: "Hermes maintainer cron",
    startedAt: "2026-04-13T08:40:00Z",
    endedAt: null,
  },
];

const approvals: RuntimeApprovalSource[] = [
  {
    id: "approval-pr-9-promotion",
    runId: "run-approval-review",
    scope: "governance",
    status: "approved",
    title: "Promote approval drill-in surface into develop",
    reason: "The branch passed lint, typecheck, build, and independent review after null-safety hardening.",
    requestedBy: "Hermes maintainer cron",
    requestedAt: "2026-04-13T08:26:00Z",
    expiresAt: null,
    reviewer: "repository policy",
    resolutionNote: "Merged locally into develop after PR checks returned success.",
  },
  {
    id: "approval-adapter-pr",
    runId: "run-runtime-adapter",
    scope: "governance",
    status: "pending",
    title: "Open adapter scaffolding increment for review",
    reason: "The adapter seam should land as a focused branch before deeper live runtime integration continues.",
    requestedBy: "Hermes maintainer cron",
    requestedAt: "2026-04-13T08:52:00Z",
    expiresAt: "2026-04-14T08:52:00Z",
    reviewer: null,
    resolutionNote: null,
  },
];

const artifacts: RuntimeArtifactSource[] = [
  {
    id: "artifact-approval-plan",
    runId: "run-approval-review",
    kind: "report",
    label: "Approval review implementation plan",
    path: "docs/plans/2026-04-13-issue-4-approval-review-surface.md",
    sizeBytes: 6740,
    createdAt: "2026-04-13T08:16:00Z",
  },
  {
    id: "artifact-adapter-plan",
    runId: "run-runtime-adapter",
    kind: "report",
    label: "Runtime adapter scaffolding plan",
    path: "docs/plans/2026-04-13-issue-2-runtime-adapter-scaffolding.md",
    sizeBytes: 6430,
    createdAt: "2026-04-13T08:44:00Z",
  },
];

const events: RuntimeTimelineEventSource[] = [
  {
    id: "evt-approval-1",
    runId: "run-approval-review",
    timestamp: "2026-04-13T08:14:00Z",
    kind: "tool_call",
    status: "completed",
    title: "PR diff reviewed",
    detail: "Compared the approval review branch against develop and dispatched an independent reviewer before merge.",
    actor: "Hermes maintainer cron",
    toolName: "delegate_task",
    artifactId: null,
    approvalId: null,
    durationMs: 82940,
    metadata: { pr: 9, phase: "review" },
  },
  {
    id: "evt-approval-2",
    runId: "run-approval-review",
    timestamp: "2026-04-13T08:25:00Z",
    kind: "approval",
    status: "active",
    title: "Promotion gate re-opened",
    detail: "Null-safety fixes were required before the branch was ready for develop promotion.",
    actor: "repository policy",
    toolName: null,
    artifactId: null,
    approvalId: "approval-pr-9-promotion",
    durationMs: null,
    metadata: { decision: "changes_requested" },
  },
  {
    id: "evt-approval-3",
    runId: "run-approval-review",
    timestamp: "2026-04-13T08:29:00Z",
    kind: "tool_call",
    status: "completed",
    title: "Branch hardened and re-verified",
    detail: "Added empty-state guards for missing runs and approvals, then re-ran lint, typecheck, and build.",
    actor: "Hermes maintainer cron",
    toolName: "terminal",
    artifactId: null,
    approvalId: null,
    durationMs: 19000,
    metadata: { lint_warning_count: 1, typecheck: true, build: true },
  },
  {
    id: "evt-approval-4",
    runId: "run-approval-review",
    timestamp: "2026-04-13T08:36:00Z",
    kind: "approval",
    status: "completed",
    title: "Promotion approved",
    detail: "CI checks returned success and the branch was promoted into develop using the local fallback flow.",
    actor: "repository policy",
    toolName: null,
    artifactId: null,
    approvalId: "approval-pr-9-promotion",
    durationMs: null,
    metadata: { decision: "approved", merge_method: "local_squash" },
  },
  {
    id: "evt-runtime-adapter-1",
    runId: "run-runtime-adapter",
    timestamp: "2026-04-13T08:40:00Z",
    kind: "system",
    status: "completed",
    title: "Next branch selected",
    detail: "Issue #2 was chosen as the next high-value increment because the UI now needs a real adapter seam before deeper runtime work.",
    actor: "scheduler",
    toolName: null,
    artifactId: null,
    approvalId: null,
    durationMs: null,
    metadata: { issue: 2, branch: "feat/issue-2-runtime-adapter-scaffolding" },
  },
  {
    id: "evt-runtime-adapter-2",
    runId: "run-runtime-adapter",
    timestamp: "2026-04-13T08:44:00Z",
    kind: "artifact",
    status: "completed",
    title: "Adapter implementation plan saved",
    detail: "Wrote a plan that introduces typed adapter inputs, pure snapshot mappers, and documentation for the integration boundary.",
    actor: "Hermes maintainer cron",
    toolName: null,
    artifactId: "artifact-adapter-plan",
    approvalId: null,
    durationMs: null,
    metadata: { kind: "plan" },
  },
  {
    id: "evt-runtime-adapter-3",
    runId: "run-runtime-adapter",
    timestamp: "2026-04-13T08:52:00Z",
    kind: "approval",
    status: "active",
    title: "Adapter review gate queued",
    detail: "A pending governance approval tracks the branch and PR promotion step for the adapter scaffolding slice.",
    actor: "policy engine",
    toolName: null,
    artifactId: null,
    approvalId: "approval-adapter-pr",
    durationMs: null,
    metadata: { scope: "governance", status: "pending" },
  },
];

const runtimeAdapterSource: RuntimeAdapterSource = {
  workspaces,
  sessionSources,
  runs,
  approvals,
  artifacts,
  events,
};

export const runtimeContractSnapshot = buildRuntimeSnapshot(runtimeAdapterSource);

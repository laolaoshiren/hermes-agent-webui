import { Navigate, Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { getApprovalsForRun, getArtifactsForRun, getTimelineForRun } from "@/features/runtime/selectors";
import type {
  ApprovalSummary,
  ArtifactSummary,
  RunStatus,
  RunSummary,
  RunTimelineEvent,
  TimelineEventStatus,
} from "@/features/runtime/types";
import { useRuntimeSnapshot } from "@/features/runtime/useRuntimeSnapshot";
import { deriveReplaySummary } from "@/pages/runsReplaySummary";
import { getScopedHandoffWorkspaceSlug } from "@/pages/runsReviewHandoff";
import { deriveRunsWorkspaceFilterState } from "@/pages/runsWorkspaceFilter";

function formatTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusTone(status: RunStatus | TimelineEventStatus) {
  switch (status) {
    case "running":
    case "active":
      return "text-info";
    case "awaiting_approval":
    case "pending":
      return "text-warning";
    case "failed":
      return "text-destructive";
    default:
      return "text-success";
  }
}

function getRunTitle(run: RunSummary, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`runtimeContent.runs.${run.id}.title`, { defaultValue: run.title });
}

function getRunSummary(run: RunSummary, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`runtimeContent.runs.${run.id}.summary`, { defaultValue: run.summary });
}

function getEventText(
  event: RunTimelineEvent,
  field: "title" | "detail",
  fallback: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  return t(`runtimeContent.events.${event.id}.${field}`, { defaultValue: fallback });
}

function getArtifactLabel(artifact: ArtifactSummary, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`runtimeContent.artifacts.${artifact.id}.label`, { defaultValue: artifact.label });
}

function getApprovalText(
  approval: ApprovalSummary,
  field: "title" | "reason" | "resolutionNote",
  fallback: string | null,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!fallback) return "—";

  return t(`runtimeContent.approvals.${approval.id}.${field}`, { defaultValue: fallback });
}

function TimelineEventRow({ event }: { event: RunTimelineEvent }) {
  const { t } = useTranslation();

  return (
    <div className="border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium text-foreground">{getEventText(event, "title", event.title, t)}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {t(`runs.eventKinds.${event.kind}`)} · {formatTimestamp(event.timestamp)}
          </div>
        </div>
        <Badge variant="outline" className={getStatusTone(event.status)}>
          {t(`runs.eventStatuses.${event.status}`)}
        </Badge>
      </div>
      <div className="mt-3 text-sm leading-6 text-muted-foreground">{getEventText(event, "detail", event.detail, t)}</div>
      <div className="mt-3 flex flex-wrap gap-2 text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
        <span>{event.actor}</span>
        {event.toolName ? <span>· {event.toolName}</span> : null}
        {event.durationMs ? <span>· {event.durationMs}{t("runs.millisecondsLabel")}</span> : null}
      </div>
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: ArtifactSummary }) {
  const { t } = useTranslation();

  return (
    <div className="border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium text-foreground">{getArtifactLabel(artifact, t)}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {t(`runs.artifactKinds.${artifact.kind}`)} · {formatTimestamp(artifact.createdAt)}
          </div>
        </div>
        <Badge variant="outline">{artifact.path ?? t("runs.virtualArtifact")}</Badge>
      </div>
      {artifact.sizeBytes ? (
        <div className="mt-3 text-sm text-muted-foreground">
          {artifact.sizeBytes.toLocaleString()} {t("runs.bytesLabel")}
        </div>
      ) : null}
    </div>
  );
}

function getApprovalStatusTone(status: ApprovalSummary["status"]) {
  switch (status) {
    case "pending":
      return "text-warning";
    case "approved":
      return "text-success";
    case "rejected":
    case "expired":
      return "text-destructive";
    default:
      return "text-foreground";
  }
}

function getDefaultRunFromQueue(runs: RunSummary[]) {
  return runs.find((run) => run.status === "running") ?? runs[0] ?? null;
}

function buildRunHref(runId: string, workspaceSlug: string | null) {
  if (!workspaceSlug) {
    return `/runs/${runId}`;
  }

  const searchParams = new URLSearchParams({ workspace: workspaceSlug });
  return `/runs/${runId}?${searchParams.toString()}`;
}

function buildSessionHref(sessionId: string, workspaceSlug: string | null) {
  if (!workspaceSlug) {
    return `/sessions/${sessionId}`;
  }

  const searchParams = new URLSearchParams({ workspace: workspaceSlug });
  return `/sessions/${sessionId}?${searchParams.toString()}`;
}

function buildApprovalHref(approvalId: string, workspaceSlug: string | null) {
  if (!workspaceSlug) {
    return `/approvals/${approvalId}`;
  }

  const searchParams = new URLSearchParams({ workspace: workspaceSlug });
  return `/approvals/${approvalId}?${searchParams.toString()}`;
}

function buildRunsIndexHref(workspaceSlug: string | null) {
  if (!workspaceSlug) {
    return "/runs";
  }

  const searchParams = new URLSearchParams({ workspace: workspaceSlug });
  return `/runs?${searchParams.toString()}`;
}

export default function RunsPage() {
  const { t } = useTranslation();
  const { runId } = useParams();
  const [searchParams] = useSearchParams();
  const runtimeQuery = useRuntimeSnapshot();
  const snapshot = runtimeQuery.data?.snapshot ?? runtimeContractSnapshot;
  const runtimeSource = runtimeQuery.data?.source ?? "fixture";
  const hydrationError = runtimeQuery.data?.error ?? null;
  const workspaceSlug = searchParams.get("workspace");
  const workspaceFilter = deriveRunsWorkspaceFilterState(snapshot, workspaceSlug);
  const visibleRuns = workspaceFilter.filteredRuns;

  const defaultRun = getDefaultRunFromQueue(visibleRuns);
  const matchedRun = runId ? visibleRuns.find((run) => run.id === runId) ?? null : null;

  if (runtimeQuery.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("runs.eyebrow")}
          title={t("runs.title")}
          description={t("runs.description")}
          badge={t("runs.badge")}
        />

        <Card>
          <CardHeader>
            <CardTitle>{t("runtimeHydration.loadingTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">{t("runtimeHydration.loadingBody")}</CardContent>
        </Card>
      </div>
    );
  }

  if (workspaceFilter.shouldClearInvalidWorkspace) {
    if (runId) {
      return <Navigate to={`/runs/${runId}`} replace />;
    }

    return <Navigate to="/runs" replace />;
  }

  if (!defaultRun) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("runs.eyebrow")}
          title={t("runs.title")}
          description={t("runs.description")}
          badge={t("runs.badge")}
          actions={
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em]">
              <Badge variant="outline">
                {runtimeSource === "live" ? t("runtimeHydration.sourceLive") : t("runtimeHydration.sourceFixture")}
              </Badge>
              {hydrationError ? <span className="text-warning">{t("runtimeHydration.fallbackWarning", { message: hydrationError })}</span> : null}
            </div>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>
              {workspaceFilter.selectedWorkspace ? t("runs.emptyWorkspaceStateTitle") : t("runs.emptyStateTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            {workspaceFilter.selectedWorkspace
              ? t("runs.emptyWorkspaceStateBody", { workspace: workspaceFilter.selectedWorkspace.name })
              : t("runs.emptyStateBody")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (runId && !matchedRun) {
    return <Navigate to={buildRunsIndexHref(workspaceFilter.selectedWorkspace?.slug ?? null)} replace />;
  }

  const selectedRun = matchedRun ?? defaultRun;
  const selectedSession = snapshot.sessions.find((session) => session.id === selectedRun.sessionId) ?? null;
  const selectedWorkspace = snapshot.workspaces.find((workspace) => workspace.id === selectedRun.workspaceId) ?? null;
  const handoffWorkspaceSlug = getScopedHandoffWorkspaceSlug(
    workspaceFilter.selectedWorkspace?.id,
    workspaceFilter.selectedWorkspace?.slug,
    selectedRun.workspaceId,
  );
  const selectedTimeline = getTimelineForRun(snapshot, selectedRun.id);
  const selectedArtifacts = getArtifactsForRun(snapshot, selectedRun.id);
  const selectedApprovals = getApprovalsForRun(snapshot, selectedRun.id);
  const selectedStartedAt = formatTimestamp(selectedRun.startedAt);
  const selectedEndedAt = formatTimestamp(selectedRun.endedAt);
  const replaySummary = deriveReplaySummary(selectedTimeline);
  const latestReplayEventAt = formatTimestamp(replaySummary.latestEventTimestamp);
  const selectedSessionTitle = selectedSession?.title ?? selectedSession?.id ?? selectedRun.sessionId;
  const selectedRepositoryLabel = selectedWorkspace?.repository
    ? `${selectedWorkspace.repository.owner ? `${selectedWorkspace.repository.owner}/` : ""}${selectedWorkspace.repository.name}`
    : t("runs.noRepositoryLinked");

  const statusSummary = visibleRuns.map((run) => ({
    id: run.id,
    title: getRunTitle(run, t),
    status: run.status,
    summary: getRunSummary(run, t),
    isSelected: run.id === selectedRun.id,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("runs.eyebrow")}
        title={t("runs.title")}
        description={t("runs.description")}
        badge={t("runs.badge")}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em]">
            <Badge variant="outline">
              {runtimeSource === "live" ? t("runtimeHydration.sourceLive") : t("runtimeHydration.sourceFixture")}
            </Badge>
            {hydrationError ? <span className="text-warning">{t("runtimeHydration.fallbackWarning", { message: hydrationError })}</span> : null}
          </div>
        }
      />

      <div className="space-y-4">
        {workspaceFilter.selectedWorkspace ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("runs.workspaceQueueTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="border border-border bg-background/60 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.workspaceScopeLabel")}</div>
                <div className="mt-1 text-lg font-medium text-foreground">{workspaceFilter.selectedWorkspace.name}</div>
                <div className="mt-2 leading-6 text-muted-foreground">
                  {t("runs.workspaceQueueBody", {
                    workspace: workspaceFilter.selectedWorkspace.name,
                    count: visibleRuns.length,
                  })}
                </div>
                <Link
                  className="mt-3 inline-flex text-sm text-primary underline-offset-4 hover:underline"
                  to={`/workspaces/${workspaceFilter.selectedWorkspace.slug}`}
                >
                  {t("runs.returnToWorkspace")}
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("runs.statusSummaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {statusSummary.map((run) => (
              <Link
                key={run.id}
                to={buildRunHref(run.id, workspaceFilter.selectedWorkspace?.slug ?? null)}
                className={`block border bg-background/60 p-4 transition-colors hover:border-foreground/40 ${
                  run.isSelected ? "border-foreground/50" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium text-foreground">{run.title}</div>
                  <Badge variant="outline" className={getStatusTone(run.status)}>
                    {t(`runs.statuses.${run.status}`)}
                  </Badge>
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{run.summary}</div>
                <div className="mt-3 text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {run.isSelected ? t("runs.selectedRunLabel") : t("runs.openRunLabel")}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("runs.selectedRunTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 border border-border bg-background/60 p-4 text-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.selectedRunLabel")}</div>
              <div className="text-xl font-medium text-foreground">{getRunTitle(selectedRun, t)}</div>
              <div className="leading-6 text-muted-foreground">{getRunSummary(selectedRun, t)}</div>
            </div>

            <div className="border border-border bg-background/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.replaySummaryEyebrow")}</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{t("runs.replaySummaryTitle")}</div>
                </div>
                <Badge variant="outline">{t("runs.replayEventsBadge", { count: selectedTimeline.length })}</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="border border-border/80 bg-background p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.messageEventsLabel")}</div>
                  <div className="mt-2 font-collapse text-2xl tracking-[0.08em] text-foreground">{replaySummary.messageCount}</div>
                </div>
                <div className="border border-border/80 bg-background p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.toolCallEventsLabel")}</div>
                  <div className="mt-2 font-collapse text-2xl tracking-[0.08em] text-foreground">{replaySummary.toolCallCount}</div>
                </div>
                <div className="border border-border/80 bg-background p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.systemEventsLabel")}</div>
                  <div className="mt-2 font-collapse text-2xl tracking-[0.08em] text-foreground">{replaySummary.systemEventCount}</div>
                </div>
                <div className="border border-border/80 bg-background p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.latestReplayEventLabel")}</div>
                  <div className="mt-2 text-sm font-medium leading-6 text-foreground">
                    {latestReplayEventAt ?? t("runs.noReplayEvents")}
                  </div>
                </div>
              </div>

              {selectedTimeline.length === 0 ? (
                <div className="mt-4 text-sm leading-6 text-muted-foreground">{t("runs.replaySummaryEmptyBody")}</div>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4 border border-border bg-background/60 p-4 text-sm">
                <div className="border border-border/80 bg-background p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.trustContextLabel")}</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{t("runs.trustContextTitle")}</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.sessionHandoffLabel")}</div>
                      <div className="mt-1 font-medium text-foreground">{selectedSessionTitle}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{selectedRun.sessionId}</div>
                      <Link
                        to={buildSessionHref(selectedRun.sessionId, handoffWorkspaceSlug)}
                        className="mt-3 inline-flex text-xs uppercase tracking-[0.16em] text-primary underline-offset-4 hover:underline"
                      >
                        {t("runs.openSessionReview")}
                      </Link>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.workspaceLabel")}</div>
                      <div className="mt-1 font-medium text-foreground">{selectedWorkspace?.name ?? t("runs.noWorkspaceLinked")}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.repositoryLabel")}</div>
                      <div className="mt-1 font-medium text-foreground">{selectedRepositoryLabel}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.defaultBranchLabel")}</div>
                      <div className="mt-1 font-medium text-foreground">{selectedWorkspace?.defaultBranch ?? t("runs.notSet")}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.policyPresetLabel")}</div>
                      <div className="mt-1 font-medium text-foreground">{selectedWorkspace?.policyPreset ?? t("runs.notSet")}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.sessionLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedRun.sessionId}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.triggerLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{t(`runs.triggers.${selectedRun.trigger}`)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.actorLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedRun.primaryActor}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.startedLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedStartedAt}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.endedLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedEndedAt ?? t("runs.liveLabel")}</div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.approvalLabel")}</div>
                  <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{selectedRun.approvalIds.length}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.artifactLabel")}</div>
                  <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{selectedRun.artifactIds.length}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.eventLabel")}</div>
                  <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{selectedRun.eventCount}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("runs.timelineTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTimeline.length > 0 ? (
              selectedTimeline.map((event) => <TimelineEventRow key={event.id} event={event} />)
            ) : (
              <div className="text-sm leading-6 text-muted-foreground">{t("runs.emptyTimeline")}</div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("runs.relatedApprovalsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedApprovals.length > 0 ? (
                selectedApprovals.map((approval) => (
                  <Link
                    key={approval.id}
                    to={buildApprovalHref(approval.id, handoffWorkspaceSlug)}
                    className="block border border-border bg-background/60 p-4 transition-colors hover:border-foreground/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-medium text-foreground">{getApprovalText(approval, "title", approval.title, t)}</div>
                      <Badge variant="outline" className={getApprovalStatusTone(approval.status)}>
                        {t(`approvals.statuses.${approval.status}`)}
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">
                      {getApprovalText(approval, "reason", approval.reason, t)}
                    </div>
                    <div className="mt-3 text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">{t("runs.openApproval")}</div>
                  </Link>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">{t("runs.emptyApprovals")}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("runs.artifactsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedArtifacts.length > 0 ? (
                selectedArtifacts.map((artifact) => <ArtifactCard key={artifact.id} artifact={artifact} />)
              ) : (
                <div className="text-sm text-muted-foreground">{t("runs.emptyArtifacts")}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}

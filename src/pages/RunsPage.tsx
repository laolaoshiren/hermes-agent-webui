import { Navigate, Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { getApprovalsForRun, getArtifactsForRun, getDefaultRun, getRunById, getTimelineForRun } from "@/features/runtime/selectors";
import type {
  ApprovalSummary,
  ArtifactSummary,
  RunStatus,
  RunSummary,
  RunTimelineEvent,
  TimelineEventStatus,
} from "@/features/runtime/types";
import { useRuntimeSnapshot } from "@/features/runtime/useRuntimeSnapshot";

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

export default function RunsPage() {
  const { t } = useTranslation();
  const { runId } = useParams();
  const runtimeQuery = useRuntimeSnapshot();
  const snapshot = runtimeQuery.data?.snapshot ?? runtimeContractSnapshot;
  const runtimeSource = runtimeQuery.data?.source ?? "fixture";
  const hydrationError = runtimeQuery.data?.error ?? null;

  const defaultRun = getDefaultRun(snapshot);
  const matchedRun = runId ? getRunById(snapshot, runId) : null;

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
            <CardTitle>{t("runs.emptyStateTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">{t("runs.emptyStateBody")}</CardContent>
        </Card>
      </div>
    );
  }

  if (runId && !matchedRun) {
    return <Navigate to={`/runs/${defaultRun.id}`} replace />;
  }

  const selectedRun = matchedRun ?? defaultRun;
  const selectedTimeline = getTimelineForRun(snapshot, selectedRun.id);
  const selectedArtifacts = getArtifactsForRun(snapshot, selectedRun.id);
  const selectedApprovals = getApprovalsForRun(snapshot, selectedRun.id);
  const selectedStartedAt = formatTimestamp(selectedRun.startedAt);
  const selectedEndedAt = formatTimestamp(selectedRun.endedAt);

  const statusSummary = snapshot.runs.map((run) => ({
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

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("runs.statusSummaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {statusSummary.map((run) => (
              <Link
                key={run.id}
                to={`/runs/${run.id}`}
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

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4 border border-border bg-background/60 p-4 text-sm">
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
            {selectedTimeline.map((event) => (
              <TimelineEventRow key={event.id} event={event} />
            ))}
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
                    to={`/approvals/${approval.id}`}
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
  );
}

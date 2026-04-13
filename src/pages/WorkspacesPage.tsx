import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { deriveWorkspaceMetrics, deriveWorkspaceReview } from "@/pages/workspaceReview";
import { useRuntimeSnapshot } from "@/features/runtime/useRuntimeSnapshot";
import type { WorkspaceStatus, WorkspaceSummary } from "@/features/runtime/types";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getWorkspaceStatusTone(status: WorkspaceStatus) {
  switch (status) {
    case "active":
      return "text-success";
    case "paused":
      return "text-warning";
    case "archived":
      return "text-muted-foreground";
    default:
      return "text-foreground";
  }
}

function getRepositoryLabel(workspace: WorkspaceSummary, t: (key: string, options?: Record<string, unknown>) => string) {
  if (!workspace.repository) {
    return t("workspaces.noRepository");
  }

  const owner = workspace.repository.owner ? `${workspace.repository.owner}/` : "";
  return `${owner}${workspace.repository.name}`;
}

export default function WorkspacesPage() {
  const { t } = useTranslation();
  const { workspaceSlug } = useParams();
  const runtimeQuery = useRuntimeSnapshot();
  const snapshot = runtimeQuery.data?.snapshot ?? runtimeContractSnapshot;
  const runtimeSource = runtimeQuery.data?.source ?? "fixture";
  const hydrationError = runtimeQuery.data?.error ?? null;
  const review = deriveWorkspaceReview(snapshot, workspaceSlug);

  if (runtimeQuery.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("workspaces.eyebrow")}
          title={t("workspaces.title")}
          description={t("workspaces.description")}
          badge={t("workspaces.badge")}
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

  if (!review.selectedWorkspace) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("workspaces.eyebrow")}
          title={t("workspaces.title")}
          description={t("workspaces.description")}
          badge={t("workspaces.badge")}
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
            <CardTitle>{t("workspaces.emptyStateTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">{t("workspaces.emptyStateBody")}</CardContent>
        </Card>
      </div>
    );
  }

  if (review.shouldRedirectToCanonical && review.canonicalWorkspaceSlug) {
    return <Navigate to={`/workspaces/${review.canonicalWorkspaceSlug}`} replace />;
  }

  const selectedWorkspace = review.selectedWorkspace;
  const selectedRepositoryLabel = getRepositoryLabel(selectedWorkspace, t);
  const workspaceCards = snapshot.workspaces.map((workspace) => ({
    workspace,
    metrics: deriveWorkspaceMetrics(snapshot, workspace.id),
    isSelected: workspace.id === selectedWorkspace.id,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("workspaces.eyebrow")}
        title={t("workspaces.title")}
        description={t("workspaces.description")}
        badge={t("workspaces.badge")}
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
          <CardTitle>{t("workspaces.summaryTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="border border-border bg-background/60 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.metrics.sessions")}</div>
            <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{review.metrics.sessions}</div>
          </div>
          <div className="border border-border bg-background/60 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.metrics.runs")}</div>
            <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{review.metrics.runs}</div>
          </div>
          <div className="border border-border bg-background/60 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.metrics.activeRuns")}</div>
            <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{review.metrics.activeRuns}</div>
          </div>
          <div className="border border-border bg-background/60 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.metrics.pendingApprovals")}</div>
            <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{review.metrics.pendingApprovals}</div>
          </div>
          <div className="border border-border bg-background/60 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.metrics.artifacts")}</div>
            <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{review.metrics.artifacts}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("workspaces.indexTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            {workspaceCards.map(({ workspace, metrics, isSelected }) => (
              <Link
                key={workspace.id}
                to={`/workspaces/${workspace.slug}`}
                className={`block border bg-background/60 p-4 transition-colors hover:border-foreground/40 ${
                  isSelected ? "border-foreground/50" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-foreground">{workspace.name}</div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">{getRepositoryLabel(workspace, t)}</div>
                  </div>
                  <Badge variant="outline" className={getWorkspaceStatusTone(workspace.status)}>
                    {t(`workspaces.statuses.${workspace.status}`)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.metrics.activeRuns")}</div>
                    <div className="mt-1 font-medium text-foreground">{metrics.activeRuns}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.metrics.pendingApprovals")}</div>
                    <div className="mt-1 font-medium text-foreground">{metrics.pendingApprovals}</div>
                  </div>
                </div>

                <div className="mt-3 text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {isSelected ? t("workspaces.selectedWorkspaceLabel") : t("workspaces.openWorkspaceReview")}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("workspaces.selectedWorkspaceTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 border border-border bg-background/60 p-4 text-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.selectedWorkspaceLabel")}</div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-xl font-medium text-foreground">{selectedWorkspace.name}</div>
                  <Badge variant="outline" className={getWorkspaceStatusTone(selectedWorkspace.status)}>
                    {t(`workspaces.statuses.${selectedWorkspace.status}`)}
                  </Badge>
                </div>
                <div className="leading-6 text-muted-foreground">{t("workspaces.selectedWorkspaceBody")}</div>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.repositoryLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedRepositoryLabel}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.defaultBranchLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedWorkspace.defaultBranch ?? t("workspaces.notSet")}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.policyPresetLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedWorkspace.policyPreset ?? t("workspaces.notSet")}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.latestActivityLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{formatTimestamp(review.metrics.latestActivityAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("workspaces.operatorHandoffTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.metrics.sessions")}</div>
                  <div className="mt-1 font-medium text-foreground">{review.metrics.sessions}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.metrics.runs")}</div>
                  <div className="mt-1 font-medium text-foreground">{review.metrics.runs}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.metrics.pendingApprovals")}</div>
                  <div className="mt-1 font-medium text-foreground">{review.metrics.pendingApprovals}</div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.runQueueTitle")}</div>
                  <div className="mt-1 font-medium text-foreground">{t("workspaces.runQueueBody", { count: review.metrics.runs })}</div>
                  <Link className="mt-3 inline-flex text-sm text-primary underline-offset-4 hover:underline" to={`/runs?workspace=${selectedWorkspace.slug}`}>
                    {t("workspaces.openWorkspaceRunQueue")}
                  </Link>
                </div>

                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.primarySessionTitle")}</div>
                  <div className="mt-1 font-medium text-foreground">{review.primarySession?.title ?? t("workspaces.noSessionLinked")}</div>
                  {review.primarySession ? (
                    <Link className="mt-3 inline-flex text-sm text-primary underline-offset-4 hover:underline" to={`/sessions/${review.primarySession.id}`}>
                      {t("workspaces.openSessionReview")}
                    </Link>
                  ) : null}
                </div>

                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.primaryRunTitle")}</div>
                  <div className="mt-1 font-medium text-foreground">{review.primaryRun?.title ?? t("workspaces.noRunLinked")}</div>
                  {review.primaryRun ? (
                    <Link className="mt-3 inline-flex text-sm text-primary underline-offset-4 hover:underline" to={`/runs/${review.primaryRun.id}?workspace=${selectedWorkspace.slug}`}>
                      {t("workspaces.openRunReview")}
                    </Link>
                  ) : null}
                </div>

                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("workspaces.primaryApprovalTitle")}</div>
                  <div className="mt-1 font-medium text-foreground">{review.primaryApproval?.title ?? t("workspaces.noApprovalLinked")}</div>
                  {review.primaryApproval ? (
                    <Link className="mt-3 inline-flex text-sm text-primary underline-offset-4 hover:underline" to={`/approvals/${review.primaryApproval.id}`}>
                      {t("workspaces.openApprovalReview")}
                    </Link>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

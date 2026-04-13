import { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { getRunById, getTimelineForRun, getWorkspaceById } from "@/features/runtime/selectors";
import type { ApprovalStatus, ApprovalSummary, WorkspaceSummary } from "@/features/runtime/types";
import { useRuntimeSnapshot } from "@/features/runtime/useRuntimeSnapshot";
import { deriveApprovalsWorkspaceFilterState } from "@/pages/approvalsWorkspaceFilter";

function formatTimestamp(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusTone(status: ApprovalStatus) {
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

function getApprovalText(
  approval: ApprovalSummary,
  field: "title" | "reason" | "resolutionNote",
  fallback: string | null,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!fallback) return "—";

  return t(`runtimeContent.approvals.${approval.id}.${field}`, { defaultValue: fallback });
}

function getRunText(
  runId: string,
  field: "title" | "summary",
  fallback: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  return t(`runtimeContent.runs.${runId}.${field}`, { defaultValue: fallback });
}

function getRepositoryLabel(workspace: WorkspaceSummary | null, t: (key: string, options?: Record<string, unknown>) => string) {
  if (!workspace?.repository) {
    return t("approvals.noRepositoryLinked");
  }

  const owner = workspace.repository.owner ? `${workspace.repository.owner}/` : "";
  return `${owner}${workspace.repository.name}`;
}

function buildApprovalPath(approvalId: string, workspaceSlug: string | null) {
  return workspaceSlug ? `/approvals/${approvalId}?workspace=${workspaceSlug}` : `/approvals/${approvalId}`;
}

function buildRunPath(runId: string, workspaceSlug: string | null) {
  return workspaceSlug ? `/runs/${runId}?workspace=${workspaceSlug}` : `/runs/${runId}`;
}

export default function ApprovalsPage() {
  const { t } = useTranslation();
  const { approvalId } = useParams();
  const [searchParams] = useSearchParams();
  const workspaceSlug = searchParams.get("workspace");
  const runtimeQuery = useRuntimeSnapshot();
  const snapshot = runtimeQuery.data?.snapshot ?? runtimeContractSnapshot;
  const runtimeSource = runtimeQuery.data?.source ?? "fixture";
  const hydrationError = runtimeQuery.data?.error ?? null;

  const soonThresholdMs = 24 * 60 * 60 * 1000;
  const [comparisonTime] = useState(() => Date.now());
  const workspaceFilter = deriveApprovalsWorkspaceFilterState(snapshot, workspaceSlug);
  const visibleApprovals = workspaceFilter.filteredApprovals;
  const defaultApproval = visibleApprovals.find((approval) => approval.status === "pending") ?? visibleApprovals[0] ?? null;
  const matchedApproval = approvalId ? visibleApprovals.find((approval) => approval.id === approvalId) ?? null : null;

  if (runtimeQuery.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("approvals.eyebrow")}
          title={t("approvals.title")}
          description={t("approvals.description")}
          badge={t("approvals.badge")}
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
    return <Navigate to={approvalId ? `/approvals/${approvalId}` : "/approvals"} replace />;
  }

  if (!defaultApproval) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("approvals.eyebrow")}
          title={t("approvals.title")}
          description={t("approvals.description")}
          badge={t("approvals.badge")}
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
              {workspaceFilter.selectedWorkspace
                ? t("approvals.emptyWorkspaceStateTitle", { workspace: workspaceFilter.selectedWorkspace.name })
                : t("approvals.emptyStateTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            {workspaceFilter.selectedWorkspace
              ? t("approvals.emptyWorkspaceStateBody", { workspace: workspaceFilter.selectedWorkspace.name })
              : t("approvals.emptyStateBody")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (approvalId && !matchedApproval) {
    return <Navigate to={buildApprovalPath(defaultApproval.id, workspaceFilter.selectedWorkspace?.slug ?? null)} replace />;
  }

  const selectedApproval = matchedApproval ?? defaultApproval;
  const relatedRun = getRunById(snapshot, selectedApproval.runId);
  const relatedSession = relatedRun ? snapshot.sessions.find((session) => session.id === relatedRun.sessionId) ?? null : null;
  const relatedWorkspace = relatedRun?.workspaceId ? getWorkspaceById(snapshot, relatedRun.workspaceId) : null;
  const selectedWorkspace = workspaceFilter.selectedWorkspace ?? relatedWorkspace;
  const relatedTimeline = relatedRun ? getTimelineForRun(snapshot, relatedRun.id) : [];
  const latestRelatedEvent = relatedTimeline[relatedTimeline.length - 1] ?? null;
  const activeWorkspaceSlug = workspaceFilter.selectedWorkspace?.slug ?? null;

  const metrics = {
    pending: visibleApprovals.filter((approval) => approval.status === "pending").length,
    approved: visibleApprovals.filter((approval) => approval.status === "approved").length,
    expiringSoon: visibleApprovals.filter((approval) => {
      if (approval.status !== "pending" || !approval.expiresAt) {
        return false;
      }

      const remaining = new Date(approval.expiresAt).getTime() - comparisonTime;
      return remaining >= 0 && remaining <= soonThresholdMs;
    }).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("approvals.eyebrow")}
        title={t("approvals.title")}
        description={t("approvals.description")}
        badge={t("approvals.badge")}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em]">
            <Badge variant="outline">
              {runtimeSource === "live" ? t("runtimeHydration.sourceLive") : t("runtimeHydration.sourceFixture")}
            </Badge>
            {hydrationError ? <span className="text-warning">{t("runtimeHydration.fallbackWarning", { message: hydrationError })}</span> : null}
          </div>
        }
      />

      {workspaceFilter.selectedWorkspace ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("approvals.workspaceQueueTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.workspaceScopeLabel")}</div>
              <div className="font-medium text-foreground">{workspaceFilter.selectedWorkspace.name}</div>
              <div className="leading-6 text-muted-foreground">
                {t("approvals.workspaceQueueBody", {
                  count: visibleApprovals.length,
                  workspace: workspaceFilter.selectedWorkspace.name,
                })}
              </div>
            </div>
            <Link
              to={`/workspaces/${workspaceFilter.selectedWorkspace.slug}`}
              className="inline-flex items-center border border-border px-4 py-2 text-xs uppercase tracking-[0.16em] text-foreground transition-colors hover:border-foreground/40"
            >
              {t("approvals.returnToWorkspace")}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("approvals.summaryTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="border border-border bg-background/60 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.metrics.pending")}</div>
            <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{metrics.pending}</div>
          </div>
          <div className="border border-border bg-background/60 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.metrics.approved")}</div>
            <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{metrics.approved}</div>
          </div>
          <div className="border border-border bg-background/60 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.metrics.expiringSoon")}</div>
            <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{metrics.expiringSoon}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("approvals.queueTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {visibleApprovals.map((approval) => {
              const isSelected = approval.id === selectedApproval.id;
              const approvalRun = getRunById(snapshot, approval.runId);
              const approvalWorkspace = approvalRun?.workspaceId ? getWorkspaceById(snapshot, approvalRun.workspaceId) : null;

              return (
                <Link
                  key={approval.id}
                  to={buildApprovalPath(approval.id, workspaceFilter.selectedWorkspace?.slug ?? null)}
                  className={`block border bg-background/60 p-4 transition-colors hover:border-foreground/40 ${
                    isSelected ? "border-foreground/50" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">{getApprovalText(approval, "title", approval.title, t)}</div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">{getApprovalText(approval, "reason", approval.reason, t)}</div>
                    </div>
                    <Badge variant="outline" className={getStatusTone(approval.status)}>
                      {t(`approvals.statuses.${approval.status}`)}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.scopeLabel")}</div>
                      <div className="mt-1 font-medium text-foreground">{t(`approvals.scopes.${approval.scope}`)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.requestedByLabel")}</div>
                      <div className="mt-1 font-medium text-foreground">{approval.requestedBy}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.workspaceLabel")}</div>
                      <div className="mt-1 font-medium text-foreground">{approvalWorkspace?.name ?? "—"}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
                    {isSelected ? t("approvals.selectedApprovalLabel") : t("approvals.openApprovalLabel")}
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("approvals.selectedApprovalTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 border border-border bg-background/60 p-4 text-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.selectedApprovalLabel")}</div>
                <div className="text-xl font-medium text-foreground">{getApprovalText(selectedApproval, "title", selectedApproval.title, t)}</div>
                <div className="leading-6 text-muted-foreground">{getApprovalText(selectedApproval, "reason", selectedApproval.reason, t)}</div>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.workspaceLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedWorkspace?.name ?? "—"}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.repositoryLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{getRepositoryLabel(selectedWorkspace, t)}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.defaultBranchLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedWorkspace?.defaultBranch ?? t("approvals.notSet")}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.policyPresetLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedWorkspace?.policyPreset ?? t("approvals.notSet")}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.runLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{relatedRun ? getRunText(relatedRun.id, "title", relatedRun.title, t) : selectedApproval.runId}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.sessionLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{relatedSession?.title ?? relatedSession?.id ?? "—"}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.requestedAtLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{formatTimestamp(selectedApproval.requestedAt)}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.expiresLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{formatTimestamp(selectedApproval.expiresAt)}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.reviewerLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedApproval.reviewer ?? "—"}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.latestRunEventLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{latestRelatedEvent ? formatTimestamp(latestRelatedEvent.timestamp) : "—"}</div>
                </div>
                <div className="border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.replayEventsLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{relatedTimeline.length}</div>
                </div>
                <div className="border border-border bg-background/60 p-4 sm:col-span-2">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.resolutionLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">
                    {getApprovalText(selectedApproval, "resolutionNote", selectedApproval.resolutionNote, t)}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em]">
                {selectedWorkspace ? (
                  <Link
                    to={`/workspaces/${selectedWorkspace.slug}`}
                    className="inline-flex items-center border border-border px-4 py-2 text-foreground transition-colors hover:border-foreground/40"
                  >
                    {t("approvals.openWorkspaceReview")}
                  </Link>
                ) : null}
                {relatedSession ? (
                  <Link
                    to={`/sessions/${relatedSession.id}`}
                    className="inline-flex items-center border border-border px-4 py-2 text-foreground transition-colors hover:border-foreground/40"
                  >
                    {t("approvals.openSessionReview")}
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("approvals.relatedRunTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {relatedRun ? (
                <>
                  <div className="border border-border bg-background/60 p-4">
                    <div className="font-medium text-foreground">{getRunText(relatedRun.id, "title", relatedRun.title, t)}</div>
                    <div className="mt-2 leading-6 text-muted-foreground">{getRunText(relatedRun.id, "summary", relatedRun.summary, t)}</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.relatedRunStatusLabel")}</div>
                        <div className="mt-1 font-medium text-foreground">{t(`runs.statuses.${relatedRun.status}`)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.latestRunEventLabel")}</div>
                        <div className="mt-1 font-medium text-foreground">{latestRelatedEvent ? formatTimestamp(latestRelatedEvent.timestamp) : "—"}</div>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={buildRunPath(relatedRun.id, activeWorkspaceSlug)}
                    className="inline-flex items-center border border-border px-4 py-2 text-xs uppercase tracking-[0.16em] text-foreground transition-colors hover:border-foreground/40"
                  >
                    {t("approvals.openRunReview")}
                  </Link>
                </>
              ) : (
                <div className="border border-border bg-background/60 p-4 leading-6 text-muted-foreground">
                  {t("approvals.relatedRunMissingBody")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

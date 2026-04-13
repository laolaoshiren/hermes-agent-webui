import { useState } from "react";
import { Navigate, Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { getApprovalById, getRunById, getTimelineForRun } from "@/features/runtime/selectors";
import type { ApprovalStatus, ApprovalSummary } from "@/features/runtime/types";

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

export default function ApprovalsPage() {
  const { t } = useTranslation();
  const { approvalId } = useParams();

  const soonThresholdMs = 24 * 60 * 60 * 1000;
  const [comparisonTime] = useState(() => Date.now());
  const defaultApproval = runtimeContractSnapshot.approvals.find((approval) => approval.status === "pending") ?? runtimeContractSnapshot.approvals[0];
  const matchedApproval = approvalId ? getApprovalById(approvalId) : null;

  if (!defaultApproval) {
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
            <CardTitle>{t("approvals.emptyStateTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">{t("approvals.emptyStateBody")}</CardContent>
        </Card>
      </div>
    );
  }

  if (approvalId && !matchedApproval) {
    return <Navigate to={`/approvals/${defaultApproval.id}`} replace />;
  }

  const selectedApproval = matchedApproval ?? defaultApproval;
  const relatedRun = getRunById(selectedApproval.runId);
  const relatedTimeline = relatedRun ? getTimelineForRun(relatedRun.id) : [];
  const latestRelatedEvent = relatedTimeline[relatedTimeline.length - 1] ?? null;

  const metrics = {
    pending: runtimeContractSnapshot.approvals.filter((approval) => approval.status === "pending").length,
    approved: runtimeContractSnapshot.approvals.filter((approval) => approval.status === "approved").length,
    expiringSoon: runtimeContractSnapshot.approvals.filter((approval) => {
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
      />

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
            {runtimeContractSnapshot.approvals.map((approval) => {
              const isSelected = approval.id === selectedApproval.id;

              return (
                <Link
                  key={approval.id}
                  to={`/approvals/${approval.id}`}
                  className={`block border bg-background/60 p-4 transition-colors hover:border-foreground/40 ${
                    isSelected ? "border-foreground/50" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">{getApprovalText(approval, "title", approval.title, t)}</div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {getApprovalText(approval, "reason", approval.reason, t)}
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusTone(approval.status)}>
                      {t(`approvals.statuses.${approval.status}`)}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.scopeLabel")}</div>
                      <div className="mt-1 font-medium text-foreground">{t(`approvals.scopes.${approval.scope}`)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.requestedByLabel")}</div>
                      <div className="mt-1 font-medium text-foreground">{approval.requestedBy}</div>
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
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.runLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{selectedApproval.runId}</div>
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
                <div className="border border-border bg-background/60 p-4 sm:col-span-2">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.resolutionLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">
                    {getApprovalText(selectedApproval, "resolutionNote", selectedApproval.resolutionNote, t)}
                  </div>
                </div>
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
                    to={`/runs/${relatedRun.id}`}
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

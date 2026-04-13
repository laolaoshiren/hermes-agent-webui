import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
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

export default function ApprovalsPage() {
  const { t } = useTranslation();

  const referenceTime = new Date(runtimeContractSnapshot.workspaces[0]?.updatedAt ?? "1970-01-01T00:00:00Z").getTime();
  const soonThresholdMs = 24 * 60 * 60 * 1000;

  const metrics = {
    pending: runtimeContractSnapshot.approvals.filter((approval) => approval.status === "pending").length,
    approved: runtimeContractSnapshot.approvals.filter((approval) => approval.status === "approved").length,
    expiringSoon: runtimeContractSnapshot.approvals.filter((approval) => {
      if (approval.status !== "pending" || !approval.expiresAt) {
        return false;
      }

      const remaining = new Date(approval.expiresAt).getTime() - referenceTime;
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

      <Card>
        <CardHeader>
          <CardTitle>{t("approvals.queueTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {runtimeContractSnapshot.approvals.map((approval) => (
            <div key={approval.id} className="border border-border bg-background/60 p-4">
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
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.runLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{approval.runId}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.expiresLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{formatTimestamp(approval.expiresAt)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.reviewerLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">{approval.reviewer ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.resolutionLabel")}</div>
                  <div className="mt-1 font-medium text-foreground">
                    {getApprovalText(approval, "resolutionNote", approval.resolutionNote, t)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

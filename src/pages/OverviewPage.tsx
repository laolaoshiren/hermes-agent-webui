import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { getRuntimeCounts } from "@/features/runtime/mockData";

const runtimeCounts = getRuntimeCounts();

export default function OverviewPage() {
  const { t } = useTranslation();

  const focusAreas = [
    {
      title: t("overview.focusAreas.workspaceFirstTitle"),
      body: t("overview.focusAreas.workspaceFirstBody"),
    },
    {
      title: t("overview.focusAreas.replayableRunsTitle"),
      body: t("overview.focusAreas.replayableRunsBody"),
    },
    {
      title: t("overview.focusAreas.operationalReviewTitle"),
      body: t("overview.focusAreas.operationalReviewBody"),
    },
  ];

  const milestones = [
    [t("overview.milestones.foundationLabel"), t("overview.milestones.foundationDetail")],
    [t("overview.milestones.runtimeLabel"), t("overview.milestones.runtimeDetail")],
    [t("overview.milestones.opsLabel"), t("overview.milestones.opsDetail")],
    [t("overview.milestones.multiUserLabel"), t("overview.milestones.multiUserDetail")],
  ] as const;

  const runtimeMetrics = [
    { label: t("overview.metrics.activeRuns"), value: runtimeCounts.activeRuns },
    { label: t("overview.metrics.pendingApprovals"), value: runtimeCounts.pendingApprovals },
    { label: t("overview.metrics.timelineEvents"), value: runtimeCounts.events },
    { label: t("overview.metrics.artifacts"), value: runtimeCounts.artifacts },
  ];

  const tags = [
    t("overview.tags.openclaw"),
    t("overview.tags.poco"),
    t("overview.tags.missionControl"),
    t("overview.tags.openhands"),
    t("overview.tags.librechat"),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("overview.eyebrow")}
        title={t("overview.title")}
        description={t("overview.description")}
        badge={t("overview.badge")}
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("overview.thesisTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>{t("overview.thesisBody1")}</p>
            <p>{t("overview.thesisBody2")}</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("overview.executionRailsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {milestones.map(([label, detail]) => (
              <div key={label} className="border border-border p-3">
                <div className="font-medium text-foreground">{label}</div>
                <div className="mt-1 text-muted-foreground">{detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("overview.runtimePulseTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{t("overview.runtimePulseDescription")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {runtimeMetrics.map((metric) => (
                <div key={metric.label} className="border border-border bg-background/60 p-4">
                  <div className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</div>
                  <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{metric.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
          {focusAreas.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">{item.body}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

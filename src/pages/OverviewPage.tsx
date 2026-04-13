import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";

const focusAreas = [
  {
    title: "Workspace-first UX",
    body: "Move beyond a flat chat surface into project-scoped workspaces, reusable presets, and long-lived execution context.",
  },
  {
    title: "Replayable runs",
    body: "Represent tool calls, approvals, browser sessions, and process events as durable timeline entries that can be inspected after the fact.",
  },
  {
    title: "Operational review",
    body: "Support approval inboxes, release discipline, CI signals, and run-state monitoring in the same product shell.",
  },
];

const milestones = [
  ["Foundation", "routing, i18n, docs, CI, project shell"],
  ["Runtime UX", "chat/runs/events/streaming integration"],
  ["Collaborative Ops", "approvals, review queues, team workflows"],
  ["Multi-user readiness", "authn/authz, shared workspaces, deployment hardening"],
] as const;

export default function OverviewPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("overview.eyebrow")}
        title={t("overview.title")}
        description={t("overview.description")}
        badge="v0.1 foundation"
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Product thesis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              Hermes already has a strong runtime, session store, tool surface, and an emerging admin UI.
              This project extends that base into a product-grade control center rather than rewriting Hermes from scratch.
            </p>
            <p>
              The goal is to combine the best ideas from agent workbenches, operational dashboards, and collaborative run review systems into one cohesive web experience.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">OpenClaw control-plane mindset</Badge>
              <Badge variant="outline">Poco workspace ergonomics</Badge>
              <Badge variant="outline">Mission Control ops dashboard</Badge>
              <Badge variant="outline">OpenHands layering</Badge>
              <Badge variant="outline">LibreChat session UX</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execution rails</CardTitle>
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

      <div className="grid gap-4 md:grid-cols-3">
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
  );
}

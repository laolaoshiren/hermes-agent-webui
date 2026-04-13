import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";

const states = [
  ["queued", "Awaiting resources, policy checks, or explicit scheduling"],
  ["running", "Streaming tool activity, logs, deltas, and artifacts in real time"],
  ["awaiting_approval", "Blocked on human approval with a durable audit trail"],
  ["completed", "Terminal state with summary, outputs, and replay timeline"],
  ["failed", "Terminal state with root-cause clues, retry affordances, and debugging context"],
] as const;

export default function RunsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Runtime UX"
        title="Runs"
        description="Runs are modeled as first-class execution attempts inside a session. This page will evolve into the main autonomous execution console with streaming events and replay."
        badge="planned runtime integration"
      />

      <Card>
        <CardHeader>
          <CardTitle>Target run state model</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {states.map(([state, detail]) => (
            <div key={state} className="flex flex-col gap-2 border border-border p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium uppercase tracking-[0.14em] text-foreground">{state}</div>
                <div className="mt-1 text-muted-foreground">{detail}</div>
              </div>
              <Badge variant="outline">event-backed</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

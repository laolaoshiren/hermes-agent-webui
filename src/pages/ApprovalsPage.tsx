import { CheckCircle2, KeyRound, ShieldAlert, TimerReset, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";

const approvalKinds = [
  [ShieldAlert, "Destructive system action", "filesystem mutation, package install, service changes, deployment actions"],
  [KeyRound, "Secret or external account usage", "credential reveal, publishing, remote repository actions, external service access"],
  [TimerReset, "Long-running autonomous continuation", "background runs, persistent jobs, unsupervised execution windows"],
  [Trash2, "Data deletion or irreversible cleanup", "session deletion, artifact purge, remote branch cleanup"],
  [CheckCircle2, "Review completion gate", "promoting a run, release candidate, or change set after validation"],
] as const;

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Approvals"
        description="Approvals are being designed as durable objects with scope, actor, expiry, and audit metadata — not as one-off modal prompts."
        badge="policy design"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {approvalKinds.map(([Icon, title, detail]) => (
          <Card key={title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-warning" />
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">{detail}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

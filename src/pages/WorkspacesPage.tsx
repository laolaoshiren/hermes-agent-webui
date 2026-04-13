import { FolderGit2, Globe, LockKeyhole, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";

const tracks = [
  {
    icon: FolderGit2,
    title: "Project-scoped sessions",
    body: "Every long-running effort should live inside a workspace with its own repository context, presets, run history, artifacts, and review trail.",
  },
  {
    icon: Sparkles,
    title: "Reusable execution presets",
    body: "Teams need named presets for models, tools, approval policies, and prompts. The UX will expose them as configurable workspace defaults.",
  },
  {
    icon: LockKeyhole,
    title: "Policy envelopes",
    body: "Approval defaults and deployment boundaries should belong to workspaces, not only to the current browser tab or single session.",
  },
  {
    icon: Globe,
    title: "Local-first, internet-ready",
    body: "First deployments target LAN and personal servers, but the architecture reserves a path toward public multi-user hosting later.",
  },
];

export default function WorkspacesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Product surface"
        title="Workspaces"
        description="This route anchors the future project-centric experience: repositories, presets, policies, and long-lived autonomous work grouped into shareable units."
        badge="design lane"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {tracks.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">{body}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

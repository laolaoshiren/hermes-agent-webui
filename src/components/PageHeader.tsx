import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
}

export default function PageHeader({ eyebrow, title, description, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border border-border bg-card/50 p-6 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        {eyebrow ? (
          <div className="font-display text-[0.72rem] uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</div>
        ) : null}
        <div className="space-y-2">
          <h1 className="font-collapse text-3xl uppercase tracking-[0.08em] blend-lighter">{title}</h1>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
        {actions}
      </div>
    </div>
  );
}

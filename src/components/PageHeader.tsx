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
    <div className="flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        {eyebrow ? <div className="text-[0.72rem] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {(badge || actions) ? (
        <div className="flex flex-wrap items-center gap-3">
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Pause, Play, Plus, Trash2, Zap } from "lucide-react";
import { api } from "@/lib/api";
import type { CronJob } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/Toast";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function formatTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(locale);
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  enabled: "success",
  paused: "warning",
  error: "destructive",
};

const DELIVER_TARGETS = ["local", "telegram", "discord", "slack", "email"] as const;

export default function CronPage() {
  const { t, i18n } = useTranslation();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const [prompt, setPrompt] = useState("");
  const [schedule, setSchedule] = useState("");
  const [name, setName] = useState("");
  const [deliver, setDeliver] = useState<(typeof DELIVER_TARGETS)[number]>("local");
  const [creating, setCreating] = useState(false);

  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";

  const loadJobs = useCallback(() => {
    setLoading(true);
    api
      .getCronJobs()
      .then(setJobs)
      .catch(() => showToast(t("cron.toasts.loadFailed"), "error"))
      .finally(() => setLoading(false));
  }, [showToast, t]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const jobCountLabel = useMemo(
    () => t("cron.scheduledJobsCount", { count: jobs.length }),
    [jobs.length, t],
  );

  const renderJobLabel = useCallback((job: CronJob, max = 30) => {
    const base = job.name?.trim() || job.prompt.trim();
    return base.length > max ? `${base.slice(0, max)}…` : base;
  }, []);

  const handleCreate = async () => {
    if (!prompt.trim() || !schedule.trim()) {
      showToast(t("cron.toasts.promptScheduleRequired"), "error");
      return;
    }
    setCreating(true);
    try {
      await api.createCronJob({
        prompt: prompt.trim(),
        schedule: schedule.trim(),
        name: name.trim() || undefined,
        deliver,
      });
      showToast(t("cron.toasts.created"), "success");
      setPrompt("");
      setSchedule("");
      setName("");
      setDeliver("local");
      loadJobs();
    } catch (e) {
      showToast(t("cron.toasts.createFailed", { error: String(e) }), "error");
    } finally {
      setCreating(false);
    }
  };

  const handlePauseResume = async (job: CronJob) => {
    try {
      if (job.status === "paused") {
        await api.resumeCronJob(job.id);
        showToast(t("cron.toasts.resumed", { job: renderJobLabel(job) }), "success");
      } else {
        await api.pauseCronJob(job.id);
        showToast(t("cron.toasts.paused", { job: renderJobLabel(job) }), "success");
      }
      loadJobs();
    } catch (e) {
      showToast(t("cron.toasts.actionFailed", { error: String(e) }), "error");
    }
  };

  const handleTrigger = async (job: CronJob) => {
    try {
      await api.triggerCronJob(job.id);
      showToast(t("cron.toasts.triggered", { job: renderJobLabel(job) }), "success");
      loadJobs();
    } catch (e) {
      showToast(t("cron.toasts.triggerFailed", { error: String(e) }), "error");
    }
  };

  const handleDelete = async (job: CronJob) => {
    try {
      await api.deleteCronJob(job.id);
      showToast(t("cron.toasts.deleted", { job: renderJobLabel(job) }), "success");
      loadJobs();
    } catch (e) {
      showToast(t("cron.toasts.deleteFailed", { error: String(e) }), "error");
    }
  };

  const statusLabel = useCallback(
    (status: string) => {
      const key = `cron.statuses.${status}`;
      return t(key, { defaultValue: status });
    },
    [t],
  );

  const deliverLabel = useCallback(
    (value: string) => {
      const key = `cron.deliverTargets.${value}`;
      return t(key, { defaultValue: value });
    },
    [t],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" aria-label={t("runtimeHydration.loading")}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Toast toast={toast} />

      <PageHeader
        eyebrow={t("cron.eyebrow")}
        title={t("cron.title")}
        description={t("cron.description")}
        badge={t("cron.badge")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            {t("cron.newJobTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cron-name">{t("cron.fields.nameLabel")}</Label>
              <Input
                id="cron-name"
                placeholder={t("cron.fields.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cron-prompt">{t("cron.fields.promptLabel")}</Label>
              <textarea
                id="cron-prompt"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={t("cron.fields.promptPlaceholder")}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="cron-schedule">{t("cron.fields.scheduleLabel")}</Label>
                <Input
                  id="cron-schedule"
                  placeholder={t("cron.fields.schedulePlaceholder")}
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cron-deliver">{t("cron.fields.deliverLabel")}</Label>
                <Select
                  id="cron-deliver"
                  value={deliver}
                  onChange={(e) => setDeliver(e.target.value as (typeof DELIVER_TARGETS)[number])}
                >
                  {DELIVER_TARGETS.map((target) => (
                    <option key={target} value={target}>
                      {deliverLabel(target)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  <Plus className="h-3 w-3" />
                  {creating ? t("cron.actions.creating") : t("cron.actions.create")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Clock className="h-4 w-4" />
          {jobCountLabel}
        </h2>

        {jobs.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("cron.emptyState")}
            </CardContent>
          </Card>
        )}

        {jobs.map((job) => (
          <Card key={job.id}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {job.name || job.prompt.slice(0, 60) + (job.prompt.length > 60 ? "..." : "")}
                  </span>
                  <Badge variant={STATUS_VARIANT[job.status] ?? "secondary"}>{statusLabel(job.status)}</Badge>
                  {job.deliver && job.deliver !== "local" && <Badge variant="outline">{deliverLabel(job.deliver)}</Badge>}
                </div>
                {job.name && (
                  <p className="mb-1 truncate text-xs text-muted-foreground">
                    {job.prompt.slice(0, 100)}
                    {job.prompt.length > 100 ? "..." : ""}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-mono">{job.schedule}</span>
                  <span>{t("cron.timestamps.last")}: {formatTime(job.last_run_at, locale)}</span>
                  <span>{t("cron.timestamps.next")}: {formatTime(job.next_run_at, locale)}</span>
                </div>
                {job.error && <p className="mt-1 text-xs text-destructive">{job.error}</p>}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title={job.status === "paused" ? t("cron.actions.resume") : t("cron.actions.pause")}
                  aria-label={job.status === "paused" ? t("cron.actions.resumeJob") : t("cron.actions.pauseJob")}
                  onClick={() => handlePauseResume(job)}
                >
                  {job.status === "paused" ? (
                    <Play className="h-4 w-4 text-success" />
                  ) : (
                    <Pause className="h-4 w-4 text-warning" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  title={t("cron.actions.triggerNow")}
                  aria-label={t("cron.actions.triggerJobNow")}
                  onClick={() => handleTrigger(job)}
                >
                  <Zap className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  title={t("cron.actions.delete")}
                  aria-label={t("cron.actions.deleteJob")}
                  onClick={() => handleDelete(job)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

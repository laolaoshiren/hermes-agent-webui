import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  Database,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PlatformStatus, SessionInfo, StatusResponse } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PlatformBadgeDisplay = { variant: "success" | "warning" | "destructive" | "outline"; label: string };
type GatewayBadgeDisplay = { badge: "success" | "warning" | "destructive" | "outline"; label: string };

type RelativeTimeFormatter = {
  fromUnixSeconds: (ts: number) => string;
  fromIsoString: (iso: string) => string;
};

type StatusPageCopy = {
  gatewayValue: (status: StatusResponse) => string;
  gatewayBadge: (status: StatusResponse) => GatewayBadgeDisplay;
  platformBadge: (state: string) => PlatformBadgeDisplay;
  statusLabel: (status: string) => string;
  sessionTitle: (session: SessionInfo) => string;
  sessionModel: (session: SessionInfo) => string;
};

function useRelativeTimeFormatter(language: string, t: ReturnType<typeof useTranslation>["t"]): RelativeTimeFormatter {
  return useMemo(() => {
    const locale = language.startsWith("zh") ? "zh-CN" : language;
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    const formatDelta = (deltaSeconds: number): string => {
      if (Number.isNaN(deltaSeconds)) return t("status.unknownRelativeTime");
      if (deltaSeconds < 0) return t("status.unknownRelativeTime");
      if (deltaSeconds < 60) return rtf.format(0, "second");
      if (deltaSeconds < 3600) return rtf.format(-Math.floor(deltaSeconds / 60), "minute");
      if (deltaSeconds < 86400) return rtf.format(-Math.floor(deltaSeconds / 3600), "hour");
      return rtf.format(-Math.floor(deltaSeconds / 86400), "day");
    };

    return {
      fromUnixSeconds: (ts: number) => formatDelta(Date.now() / 1000 - ts),
      fromIsoString: (iso: string) => formatDelta((Date.now() - new Date(iso).getTime()) / 1000),
    };
  }, [language, t]);
}

function useStatusPageCopy(t: ReturnType<typeof useTranslation>["t"]): StatusPageCopy {
  return useMemo(
    () => ({
      gatewayValue: (status) => {
        if (status.gateway_running) return t("status.gatewayValue.pid", { pid: status.gateway_pid });
        if (status.gateway_state === "startup_failed") return t("status.gatewayValue.startFailed");
        return t("status.gatewayValue.notRunning");
      },
      gatewayBadge: (status) => {
        const state = status.gateway_state;
        if (state === "running") return { badge: "success", label: t("status.gatewayStates.running") };
        if (state === "starting") return { badge: "warning", label: t("status.gatewayStates.starting") };
        if (state === "startup_failed") return { badge: "destructive", label: t("status.gatewayStates.startup_failed") };
        if (state === "stopped") return { badge: "outline", label: t("status.gatewayStates.stopped") };
        return status.gateway_running
          ? { badge: "success", label: t("status.gatewayStates.running") }
          : { badge: "outline", label: t("status.gatewayStates.off") };
      },
      platformBadge: (state) => {
        if (state === "connected") return { variant: "success", label: t("status.platformStates.connected") };
        if (state === "disconnected") return { variant: "warning", label: t("status.platformStates.disconnected") };
        if (state === "fatal") return { variant: "destructive", label: t("status.platformStates.fatal") };
        return { variant: "outline", label: state };
      },
      statusLabel: (status) => t(`status.platformStates.${status}`, { defaultValue: status }),
      sessionTitle: (session) => session.title ?? t("status.untitledSession"),
      sessionModel: (session) => session.model ?? t("status.unknownModel"),
    }),
    [t],
  );
}

export default function StatusPage() {
  const { t, i18n } = useTranslation();
  const copy = useStatusPageCopy(t);
  const relativeTime = useRelativeTimeFormatter(i18n.resolvedLanguage ?? i18n.language ?? "en", t);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      setLoadError(null);
      api.getStatus().then(setStatus).catch(() => setLoadError(t("status.loadErrors.status")));
      api.getSessions().then(setSessions).catch(() => setLoadError((prev) => prev ?? t("status.loadErrors.sessions")));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [t]);

  if (!status) {
    if (loadError) {
      return (
        <div className="mx-auto max-w-2xl border border-destructive/30 bg-destructive/[0.06] p-6">
          <div className="text-sm font-medium text-destructive">{loadError}</div>
          <div className="mt-2 text-xs text-destructive/80">{t("status.loadErrors.retryHint")}</div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center py-24" aria-label={t("status.loadingLabel")}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const gwBadge = copy.gatewayBadge(status);

  const items = [
    {
      icon: Cpu,
      label: t("status.summary.agentLabel"),
      value: `v${status.version}`,
      badgeText: t("status.summary.liveBadge"),
      badgeVariant: "success" as const,
    },
    {
      icon: Radio,
      label: t("status.summary.gatewayLabel"),
      value: copy.gatewayValue(status),
      badgeText: gwBadge.label,
      badgeVariant: gwBadge.badge,
    },
    {
      icon: Activity,
      label: t("status.summary.activeSessionsLabel"),
      value:
        status.active_sessions > 0
          ? t("status.summary.activeSessionsValue", { count: status.active_sessions })
          : t("status.summary.noneValue"),
      badgeText: status.active_sessions > 0 ? t("status.summary.liveBadge") : t("status.summary.offBadge"),
      badgeVariant: (status.active_sessions > 0 ? "success" : "outline") as "success" | "outline",
    },
  ];

  const platforms = Object.entries(status.gateway_platforms ?? {});
  const activeSessions = sessions.filter((s) => s.is_active);
  const recentSessions = sessions.filter((s) => !s.is_active).slice(0, 5);

  const alerts: { message: string; detail?: string }[] = [];
  if (status.gateway_state === "startup_failed") {
    alerts.push({
      message: t("status.alerts.gatewayFailed"),
      detail: status.gateway_exit_reason ?? undefined,
    });
  }
  const failedPlatforms = platforms.filter(([, info]) => info.state === "fatal" || info.state === "disconnected");
  for (const [name, info] of failedPlatforms) {
    alerts.push({
      message: t("status.alerts.platformIssue", {
        platform: name.charAt(0).toUpperCase() + name.slice(1),
        state: copy.statusLabel(info.state).toLowerCase(),
      }),
      detail: info.error_message ?? undefined,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("status.eyebrow")}
        title={t("status.title")}
        description={t("status.description")}
        badge={t("status.badge")}
      />

      {alerts.length > 0 && (
        <div className="border border-destructive/30 bg-destructive/[0.06] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="min-w-0 flex flex-col gap-2">
              {alerts.map((alert, i) => (
                <div key={i}>
                  <p className="text-sm font-medium text-destructive">{alert.message}</p>
                  {alert.detail && <p className="mt-0.5 text-xs text-destructive/70">{alert.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(({ icon: Icon, label, value, badgeText, badgeVariant }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>

            <CardContent>
              <div className="font-display text-2xl font-bold">{value}</div>

              {badgeText && (
                <Badge variant={badgeVariant} className="mt-2">
                  {badgeVariant === "success" && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
                  {badgeText}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {platforms.length > 0 && <PlatformsCard platforms={platforms} copy={copy} relativeTime={relativeTime} />}

      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-success" />
              <CardTitle className="text-base">{t("status.activeSessionsTitle")}</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="grid gap-3">
            {activeSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between border border-border p-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{copy.sessionTitle(s)}</span>

                    <Badge variant="success" className="text-[10px]">
                      <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                      {t("status.summary.liveBadge")}
                    </Badge>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    <span className="font-mono-ui">{copy.sessionModel(s)}</span> · {t("status.sessionMeta", { count: s.message_count, ago: relativeTime.fromUnixSeconds(s.last_active) })}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {recentSessions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{t("status.recentSessionsTitle")}</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="grid gap-3">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between border border-border p-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{copy.sessionTitle(s)}</span>

                  <span className="text-xs text-muted-foreground">
                    <span className="font-mono-ui">{copy.sessionModel(s)}</span> · {t("status.sessionMeta", { count: s.message_count, ago: relativeTime.fromUnixSeconds(s.last_active) })}
                  </span>

                  {s.preview && <span className="max-w-md truncate text-xs text-muted-foreground/70">{s.preview}</span>}
                </div>

                <Badge variant="outline" className="text-[10px]">
                  <Database className="mr-1 h-3 w-3" />
                  {s.source ?? t("status.localSource")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlatformsCard({ platforms, copy, relativeTime }: PlatformsCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">{t("status.connectedPlatformsTitle")}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3">
        {platforms.map(([name, info]) => {
          const display = copy.platformBadge(info.state);
          const IconComponent = info.state === "connected" ? Wifi : info.state === "fatal" ? AlertTriangle : WifiOff;

          return (
            <div key={name} className="flex items-center justify-between border border-border p-3">
              <div className="flex items-center gap-3">
                <IconComponent
                  className={`h-4 w-4 ${
                    info.state === "connected"
                      ? "text-success"
                      : info.state === "fatal"
                        ? "text-destructive"
                        : "text-warning"
                  }`}
                />

                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium capitalize">{name}</span>

                  {info.error_message && <span className="text-xs text-destructive">{info.error_message}</span>}

                  {info.updated_at && (
                    <span className="text-xs text-muted-foreground">
                      {t("status.lastUpdate")}: {relativeTime.fromIsoString(info.updated_at)}
                    </span>
                  )}
                </div>
              </div>

              <Badge variant={display.variant}>
                {display.variant === "success" && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
                {display.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface PlatformsCardProps {
  platforms: [string, PlatformStatus][];
  copy: StatusPageCopy;
  relativeTime: RelativeTimeFormatter;
}

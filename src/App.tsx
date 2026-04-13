import { useMemo } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  Activity,
  BarChart3,
  CheckSquare,
  Clock3,
  FileText,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  Package,
  PlaySquare,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import OverviewPage from "@/pages/OverviewPage";
import WorkspacesPage from "@/pages/WorkspacesPage";
import RunsPage from "@/pages/RunsPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import StatusPage from "@/pages/StatusPage";
import SessionsPage from "@/pages/SessionsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import LogsPage from "@/pages/LogsPage";
import CronPage from "@/pages/CronPage";
import SkillsPage from "@/pages/SkillsPage";
import ConfigPage from "@/pages/ConfigPage";
import EnvPage from "@/pages/EnvPage";
import { Badge } from "@/components/ui/badge";

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage?.startsWith("zh") ? "zh-CN" : "en";
  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
      <button
        type="button"
        onClick={() => void i18n.changeLanguage("en")}
        className={current === "en" ? "text-foreground" : "hover:text-foreground"}
      >
        EN
      </button>
      <span>/</span>
      <button
        type="button"
        onClick={() => void i18n.changeLanguage("zh-CN")}
        className={current === "zh-CN" ? "text-foreground" : "hover:text-foreground"}
      >
        中文
      </button>
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();

  const nav = useMemo(
    () => [
      { to: "/overview", label: t("nav.overview"), icon: LayoutDashboard },
      { to: "/workspaces", label: t("nav.workspaces"), icon: FolderKanban },
      { to: "/runs", label: t("nav.runs"), icon: PlaySquare },
      { to: "/approvals", label: t("nav.approvals"), icon: CheckSquare },
      { to: "/status", label: t("nav.status"), icon: Activity },
      { to: "/sessions", label: t("nav.sessions"), icon: MessageSquareText },
      { to: "/analytics", label: t("nav.analytics"), icon: BarChart3 },
      { to: "/logs", label: t("nav.logs"), icon: FileText },
      { to: "/cron", label: t("nav.cron"), icon: Clock3 },
      { to: "/skills", label: t("nav.skills"), icon: Package },
      { to: "/config", label: t("nav.config"), icon: Settings },
      { to: "/keys", label: t("nav.keys"), icon: KeyRound },
    ],
    [t],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="noise-overlay" />
      <div className="warm-glow" />

      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex min-h-14 max-w-[1480px] items-stretch">
          <div className="flex min-w-[220px] items-center border-r border-border px-5 shrink-0">
            <div>
              <div className="font-collapse text-xl font-bold tracking-wider uppercase blend-lighter">
                {t("appShell.productName")}
              </div>
              <div className="font-display text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground">
                {t("appShell.productTagline")}
              </div>
            </div>
          </div>

          <nav className="flex items-stretch overflow-x-auto scrollbar-none">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group relative inline-flex items-center gap-1.5 border-r border-border px-4 py-2 font-display text-[0.78rem] tracking-[0.14em] uppercase whitespace-nowrap transition-colors shrink-0 ${
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    <span className="absolute inset-0 bg-foreground pointer-events-none transition-opacity duration-150 group-hover:opacity-5 opacity-0" />
                    {isActive && <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 px-4">
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] tracking-[0.18em] uppercase">
              {t("appShell.foundationBadge")}
            </Badge>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="relative z-2 mx-auto w-full max-w-[1480px] flex-1 px-6 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/runs/:runId" element={<RunsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/approvals/:approvalId" element={<ApprovalsPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:sessionId" element={<SessionsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/cron" element={<CronPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/keys" element={<EnvPage />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </main>

      <footer className="relative z-2 border-t border-border">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-6 py-3">
          <span className="font-display text-[0.8rem] tracking-[0.12em] uppercase opacity-70">
            {t("appShell.productName")}
          </span>
          <span className="font-display text-[0.7rem] tracking-[0.15em] uppercase text-foreground/40">
            {t("appShell.footerTagline")}
          </span>
        </div>
      </footer>
    </div>
  );
}

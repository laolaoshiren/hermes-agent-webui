import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Globe,
  Hash,
  MessageCircle,
  MessageSquare,
  PlaySquare,
  Plus,
  Search,
  SendHorizontal,
  ShieldCheck,
  Terminal,
  Trash2,
  X,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { Markdown } from "@/components/Markdown";
import { Toast } from "@/components/Toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RuntimeContractSnapshot } from "@/features/runtime/types";
import { useRuntimeSnapshot } from "@/features/runtime/useRuntimeSnapshot";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import type { SessionInfo, SessionMessage, SessionSearchResult } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { deriveSessionReview } from "@/pages/sessionReview";
import { deriveSessionsWorkspaceFilter } from "@/pages/sessionsWorkspaceFilter";

const ROLE_STYLES: Record<string, { bg: string; text: string; labelKey: string }> = {
  user: { bg: "bg-primary/10", text: "text-primary", labelKey: "sessions.roles.user" },
  assistant: { bg: "bg-success/10", text: "text-success", labelKey: "sessions.roles.assistant" },
  system: { bg: "bg-muted", text: "text-muted-foreground", labelKey: "sessions.roles.system" },
  tool: { bg: "bg-warning/10", text: "text-warning", labelKey: "sessions.roles.tool" },
};

const SOURCE_CONFIG: Record<string, { icon: typeof Terminal; color: string }> = {
  cli: { icon: Terminal, color: "text-primary" },
  telegram: { icon: MessageCircle, color: "text-[oklch(0.65_0.15_250)]" },
  discord: { icon: Hash, color: "text-[oklch(0.65_0.15_280)]" },
  slack: { icon: MessageSquare, color: "text-[oklch(0.7_0.15_155)]" },
  whatsapp: { icon: Globe, color: "text-success" },
  cron: { icon: Clock, color: "text-warning" },
};

const EMPTY_RUNTIME_SNAPSHOT: RuntimeContractSnapshot = {
  workspaces: [],
  sessions: [],
  runs: [],
  approvals: [],
  artifacts: [],
  events: [],
};

const SESSIONS_ONBOARDING_DISMISSED_KEY = "hermes-control-center.sessions-onboarding-dismissed";

function formatTimestamp(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value * 1000));
}

function formatRuntimeTimestamp(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildSessionsPath(workspaceSlug: string | null) {
  return workspaceSlug ? `/sessions?workspace=${workspaceSlug}` : "/sessions";
}

function buildSessionPath(sessionId: string, workspaceSlug: string | null) {
  return workspaceSlug ? `/sessions/${sessionId}?workspace=${workspaceSlug}` : `/sessions/${sessionId}`;
}

function readSessionsOnboardingDismissed() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(SESSIONS_ONBOARDING_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function persistSessionsOnboardingDismissed() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SESSIONS_ONBOARDING_DISMISSED_KEY, "1");
  } catch {
    // Ignore storage failures so the onboarding card still works in restricted browsers.
  }
}

function buildRunPath(runId: string, workspaceSlug: string | null) {
  return workspaceSlug ? `/runs/${runId}?workspace=${workspaceSlug}` : `/runs/${runId}`;
}

function sortSessionsByLastActive(sessions: SessionInfo[]) {
  return [...sessions].sort((left, right) => right.last_active - left.last_active);
}

function upsertSession(sessions: SessionInfo[], nextSession: SessionInfo) {
  return sortSessionsByLastActive([nextSession, ...sessions.filter((session) => session.id !== nextSession.id)]);
}

function createOptimisticUserMessage(content: string): SessionMessage {
  return {
    role: "user",
    content,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getConversationTitle(session: SessionInfo | null | undefined, fallback: string) {
  if (!session) {
    return fallback;
  }

  return session.title?.trim() || session.preview?.trim() || session.id || fallback;
}

function getConversationSubtitle(session: SessionInfo | null | undefined, fallback: string) {
  if (!session) {
    return fallback;
  }

  const source = session.source ?? fallback;
  const model = session.model ?? fallback;
  return `${source} · ${model}`;
}

function getRepositoryLabel(snapshot: RuntimeContractSnapshot, workspaceId: string | null | undefined, fallback: string) {
  if (!workspaceId) {
    return fallback;
  }

  const workspace = snapshot.workspaces.find((item) => item.id === workspaceId) ?? null;
  if (!workspace?.repository) {
    return fallback;
  }

  const owner = workspace.repository.owner ? `${workspace.repository.owner}/` : "";
  return `${owner}${workspace.repository.name}`;
}

function SnippetHighlight({ snippet }: { snippet: string }) {
  const parts: ReactNode[] = [];
  const regex = />>>(.*?)<<</g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(snippet)) !== null) {
    if (match.index > last) {
      parts.push(snippet.slice(last, match.index));
    }

    parts.push(
      <mark key={index++} className="rounded-sm bg-warning/30 px-0.5 text-warning">
        {match[1]}
      </mark>,
    );
    last = regex.lastIndex;
  }

  if (last < snippet.length) {
    parts.push(snippet.slice(last));
  }

  return <p className="mt-0.5 max-w-lg truncate text-xs text-muted-foreground/80">{parts}</p>;
}

function OnboardingConcept({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof MessageSquare;
  title: string;
  body: string;
}) {
  return (
    <div className="border border-border/70 bg-background/70 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function ToolCallBlock({ toolCall }: { toolCall: { id: string; function: { name: string; arguments: string } } }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  let args = toolCall.function.arguments;
  try {
    args = JSON.stringify(JSON.parse(args), null, 2);
  } catch {
    // keep original text
  }

  return (
    <div className="mt-2 rounded-md border border-warning/20 bg-warning/5">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs text-warning transition-colors hover:bg-warning/10"
        onClick={() => setOpen((current) => !current)}
        aria-label={t("sessions.toolCallToggle", {
          action: open ? t("sessions.collapse") : t("sessions.expand"),
          name: toolCall.function.name,
        })}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="font-mono-ui font-medium">{toolCall.function.name}</span>
        <span className="ml-auto text-warning/50">{toolCall.id}</span>
      </button>
      {open ? (
        <pre className="overflow-x-auto whitespace-pre-wrap border-t border-warning/20 px-3 py-2 font-mono text-xs text-warning/80">{args}</pre>
      ) : null}
    </div>
  );
}

function MessageBubble({ msg, highlight }: { msg: SessionMessage; highlight?: string }) {
  const { t } = useTranslation();
  const style = ROLE_STYLES[msg.role] ?? ROLE_STYLES.system;
  const label = msg.tool_name ? t("sessions.toolLabel", { name: msg.tool_name }) : t(style.labelKey);

  const isHit = (() => {
    if (!highlight || !msg.content) return false;
    const content = msg.content.toLowerCase();
    const terms = highlight.toLowerCase().split(/\s+/).filter(Boolean);
    return terms.some((term) => content.includes(term));
  })();

  const highlightTerms = isHit && highlight ? highlight.split(/\s+/).filter(Boolean) : undefined;

  return (
    <div className={`${style.bg} p-3 ${isHit ? "ring-1 ring-warning/40" : ""}`} data-search-hit={isHit || undefined}>
      <div className="mb-1 flex items-center gap-2">
        <span className={`text-xs font-semibold ${style.text}`}>{label}</span>
        {isHit ? (
          <Badge variant="warning" className="px-1.5 py-0 text-[9px]">
            {t("sessions.matchBadge")}
          </Badge>
        ) : null}
        {msg.timestamp ? <span className="text-[10px] text-muted-foreground">{timeAgo(msg.timestamp)}</span> : null}
      </div>
      {msg.content
        ? msg.role === "system"
          ? <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{msg.content}</div>
          : <Markdown content={msg.content} highlightTerms={highlightTerms} />
        : null}
      {msg.tool_calls?.length ? (
        <div className="mt-1">
          {msg.tool_calls.map((toolCall) => (
            <ToolCallBlock key={toolCall.id} toolCall={toolCall} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MessageList({ messages, highlight }: { messages: SessionMessage[]; highlight?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || highlight) return;

    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages, highlight]);

  useEffect(() => {
    if (!highlight || !containerRef.current) return;

    const timer = setTimeout(() => {
      const hit = containerRef.current?.querySelector("[data-search-hit]");
      if (hit) {
        hit.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [messages, highlight]);

  return (
    <div ref={containerRef} className="flex max-h-[600px] flex-col gap-3 overflow-y-auto pr-2">
      {messages.map((msg, index) => (
        <MessageBubble key={index} msg={msg} highlight={highlight} />
      ))}
    </div>
  );
}

function SessionRow({
  session,
  snippet,
  isSelected,
  onDelete,
  workspaceSlug,
}: {
  session: SessionInfo;
  snippet?: string;
  isSelected: boolean;
  onDelete: () => void;
  workspaceSlug: string | null;
}) {
  const { t } = useTranslation();
  const sourceInfo = (session.source ? SOURCE_CONFIG[session.source] : null) ?? {
    icon: Globe,
    color: "text-muted-foreground",
  };
  const SourceIcon = sourceInfo.icon;
  const hasTitle = session.title && session.title !== "Untitled";

  return (
    <div
      className={`overflow-hidden border transition-colors ${
        isSelected
          ? "border-primary/40 bg-primary/[0.04]"
          : session.is_active
            ? "border-success/30 bg-success/[0.03]"
            : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2 p-3 transition-colors hover:bg-secondary/30">
        <Link
          to={buildSessionPath(session.id, workspaceSlug)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-current={isSelected ? "page" : undefined}
        >
          <div className={`shrink-0 ${sourceInfo.color}`}>
            <SourceIcon className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className={`truncate pr-2 text-sm ${hasTitle ? "font-medium" : "italic text-muted-foreground"}`}>
                {hasTitle ? session.title : (session.preview ? session.preview.slice(0, 60) : t("sessions.untitledSession"))}
              </span>
              {session.is_active ? (
                <Badge variant="success" className="shrink-0 text-[10px]">
                  <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  {t("sessions.liveBadge")}
                </Badge>
              ) : null}
              {isSelected ? (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {t("sessions.selectedSessionLabel")}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="max-w-[180px] truncate">{(session.model ?? t("sessions.unknownModel")).split("/").pop()}</span>
              <span className="text-border">&#183;</span>
              <span>{t("sessions.messageCountLabel", { count: session.message_count })}</span>
              {session.tool_call_count > 0 ? (
                <>
                  <span className="text-border">&#183;</span>
                  <span>{t("sessions.toolCountLabel", { count: session.tool_call_count })}</span>
                </>
              ) : null}
              <span className="text-border">&#183;</span>
              <span>{timeAgo(session.last_active)}</span>
            </div>
            {snippet ? <SnippetHighlight snippet={snippet} /> : null}
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {session.source ?? t("sessions.localSource")}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label={t("sessions.deleteSession")}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface SessionsPageProps {
  initialSessions?: SessionInfo[];
}

export default function SessionsPage({ initialSessions }: SessionsPageProps = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const workspaceSlug = searchParams.get("workspace");
  const runtimeEnabled = initialSessions !== undefined || Boolean(sessionId) || Boolean(workspaceSlug);
  const runtimeQuery = useRuntimeSnapshot(runtimeEnabled);
  const snapshot = runtimeQuery.data?.snapshot ?? EMPTY_RUNTIME_SNAPSHOT;
  const runtimeSource = runtimeQuery.data?.source ?? null;
  const hydrationError = runtimeQuery.data?.error ?? null;

  const [sessions, setSessions] = useState<SessionInfo[]>(() => sortSessionsByLastActive(initialSessions ?? []));
  const [loading, setLoading] = useState(() => initialSessions === undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SessionSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<SessionMessage[] | null>(null);
  const [selectedMessagesLoading, setSelectedMessagesLoading] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState("");
  const [sendPending, setSendPending] = useState(false);
  const [optimisticWorkspaceSessionIdsBySlug, setOptimisticWorkspaceSessionIdsBySlug] = useState<Record<string, string[]>>({});
  const [showOnboarding, setShowOnboarding] = useState(() => !readSessionsOnboardingDismissed());
  const pendingHydrationSessionIdRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const loadSessions = useCallback(() => {
    setLoadError(null);
    api
      .getSessions()
      .then((nextSessions) => setSessions(sortSessionsByLastActive(nextSessions)))
      .catch((error) => setLoadError(getErrorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialSessions === undefined) {
      loadSessions();
    }
  }, [initialSessions, loadSessions]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!search.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      api
        .searchSessions(search.trim())
        .then((resp) => setSearchResults(resp.results))
        .catch(() => setSearchResults(null))
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const snippetMap = new Map<string, string>();
  if (searchResults) {
    for (const result of searchResults) {
      snippetMap.set(result.session_id, result.snippet);
    }
  }

  const filtered = searchResults ? sessions.filter((session) => snippetMap.has(session.id)) : sessions;
  const workspaceFilter = deriveSessionsWorkspaceFilter(snapshot, workspaceSlug);
  const activeWorkspaceSlug = workspaceFilter.selectedWorkspace?.slug ?? null;
  const runtimeStillLoading = runtimeQuery.isPending;
  const effectiveWorkspaceSlug = activeWorkspaceSlug ?? (runtimeStillLoading ? workspaceSlug : null);
  const shouldShowOnboarding = showOnboarding && !sessionId && !workspaceSlug && search.trim().length === 0;
  const hasRuntimeSnapshotData = runtimeQuery.data !== undefined;
  const visibleSessionIds = new Set(
    (hasRuntimeSnapshotData ? workspaceFilter.filteredSessions : filtered).map((session) => session.id),
  );
  if (effectiveWorkspaceSlug) {
    for (const optimisticSessionId of optimisticWorkspaceSessionIdsBySlug[effectiveWorkspaceSlug] ?? []) {
      visibleSessionIds.add(optimisticSessionId);
    }
  }
  const visibleSessions = filtered.filter((session) => visibleSessionIds.has(session.id));
  const reviewVisibleSessionIds = hasRuntimeSnapshotData || !sessionId ? visibleSessionIds : new Set<string>([sessionId]);
  const review = deriveSessionReview(sessions, snapshot, sessionId, reviewVisibleSessionIds);
  const scopedRepositoryLabel = getRepositoryLabel(snapshot, workspaceFilter.selectedWorkspace?.id, t("sessions.noRepositoryLinked"));
  const selectedSession = review.selectedSession ?? null;
  const pendingRequestedSession =
    runtimeStillLoading && !hasRuntimeSnapshotData && Boolean(sessionId) && !sessions.some((session) => session.id === sessionId);
  const workspacePathMatchesScope = (workspacePath: string | null | undefined) => {
    if (!effectiveWorkspaceSlug || typeof workspacePath !== "string" || workspacePath.length === 0) {
      return false;
    }

    const tail = workspacePath.split("/").filter(Boolean).at(-1) ?? null;
    const repositoryName = workspaceFilter.selectedWorkspace?.repository?.name ?? null;
    return tail === effectiveWorkspaceSlug || (repositoryName !== null && tail === repositoryName);
  };
  const scopedChatWorkspacePath =
    selectedSession?.workspace ??
    visibleSessions.find((session) => typeof session.workspace === "string" && session.workspace.length > 0)?.workspace ??
    sessions.find((session) => workspacePathMatchesScope(session.workspace))?.workspace ??
    null;

  useEffect(() => {
    if (!selectedSession) {
      setSelectedMessages([]);
      setSelectedMessagesLoading(false);
      setConversationError(null);
      return;
    }

    if (pendingHydrationSessionIdRef.current === selectedSession.id) {
      setSelectedMessagesLoading(false);
      return;
    }

    let cancelled = false;
    setSelectedMessagesLoading(true);
    setConversationError(null);

    api
      .getSessionMessages(selectedSession.id)
      .then((response) => {
        if (!cancelled) {
          setSelectedMessages(response.messages);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSelectedMessages(null);
          setConversationError(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSelectedMessagesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSession]);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((session) => session.id !== id));
      if (selectedSession?.id === id) {
        setSelectedMessages([]);
        setConversationError(null);
        navigate(buildSessionsPath(effectiveWorkspaceSlug));
      }
    } catch (error) {
      showToast(t("sessions.deleteSessionFailedToast", { message: getErrorMessage(error) }), "error");
    }
  };

  const createSession = useCallback(
    async ({
      navigateToSession = true,
      deferHydration = false,
      workspaceSlug: nextWorkspaceSlug = null,
      workspacePath = null,
    }: {
      navigateToSession?: boolean;
      deferHydration?: boolean;
      workspaceSlug?: string | null;
      workspacePath?: string | null;
    } = {}) => {
      const response = await api.createSession({
        model: selectedSession?.model ?? undefined,
        workspace: workspacePath ?? undefined,
      });
      if (deferHydration) {
        pendingHydrationSessionIdRef.current = response.session.id;
      }
      if (nextWorkspaceSlug) {
        setOptimisticWorkspaceSessionIdsBySlug((prev) => {
          const nextIds = prev[nextWorkspaceSlug] ?? [];
          if (nextIds.includes(response.session.id)) {
            return prev;
          }

          return {
            ...prev,
            [nextWorkspaceSlug]: [...nextIds, response.session.id],
          };
        });
      }
      setSessions((prev) => upsertSession(prev, response.session));
      setSelectedMessages(response.messages);
      setLoadError(null);
      setConversationError(null);
      if (navigateToSession) {
        navigate(buildSessionPath(response.session.id, nextWorkspaceSlug));
      }
      return response.session;
    },
    [navigate, selectedSession?.model],
  );

  const handleNewChat = async () => {
    try {
      await createSession({
        navigateToSession: true,
        workspaceSlug: effectiveWorkspaceSlug,
        workspacePath: scopedChatWorkspacePath,
      });
      setComposerValue("");
    } catch (error) {
      const message = getErrorMessage(error);
      setConversationError(message);
      showToast(t("sessions.createSessionFailedToast", { message }), "error");
    }
  };

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    persistSessionsOnboardingDismissed();
  };

  const handleSendMessage = async () => {
    const message = composerValue.trim();
    if (!message || sendPending) {
      return;
    }

    setSendPending(true);
    let activeSession = selectedSession;
    let previousMessages = selectedMessages ?? [];
    const nextWorkspaceSlug = effectiveWorkspaceSlug;
    const nextWorkspacePath = selectedSession?.workspace ?? scopedChatWorkspacePath;

    try {
      if (!activeSession) {
        activeSession = await createSession({
          navigateToSession: false,
          deferHydration: true,
          workspaceSlug: nextWorkspaceSlug,
          workspacePath: nextWorkspacePath,
        });
        previousMessages = [];
      }

      setConversationError(null);
      setSelectedMessages([...previousMessages, createOptimisticUserMessage(message)]);

      const response = await api.sendChatMessage({
        sessionId: activeSession.id,
        message,
        model: activeSession.model ?? undefined,
        workspace: activeSession.workspace ?? nextWorkspacePath ?? undefined,
      });

      pendingHydrationSessionIdRef.current = null;
      setSessions((prev) => upsertSession(prev, response.session));
      setSelectedMessages(response.messages);
      setComposerValue("");
      setLoadError(null);
      navigate(buildSessionPath(response.session.id, nextWorkspaceSlug));
    } catch (error) {
      pendingHydrationSessionIdRef.current = null;
      const message = getErrorMessage(error);
      setSelectedMessages(previousMessages);
      setConversationError(message);
      showToast(t("sessions.sendFailedToast", { message }), "error");
    } finally {
      setSendPending(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) {
      return;
    }

    event.preventDefault();
    void handleSendMessage();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("sessions.eyebrow")}
          title={t("sessions.title")}
          description={t("sessions.description")}
          badge={t("sessions.badge")}
        />
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!runtimeStillLoading && workspaceFilter.shouldClearInvalidWorkspace) {
    return <Navigate to={sessionId ? `/sessions/${sessionId}` : "/sessions"} replace />;
  }

  if (!runtimeStillLoading && review.shouldRedirectToCanonical && review.canonicalSessionId) {
    return <Navigate to={buildSessionPath(review.canonicalSessionId, effectiveWorkspaceSlug)} replace />;
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} />
      <PageHeader
        eyebrow={t("sessions.eyebrow")}
        title={t("sessions.title")}
        description={t("sessions.description")}
        badge={t("sessions.badge")}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em]">
            {runtimeSource ? (
              <Badge variant="outline">
                {runtimeSource === "live" ? t("runtimeHydration.sourceLive") : t("runtimeHydration.sourceFixture")}
              </Badge>
            ) : null}
            {runtimeStillLoading ? <span className="text-muted-foreground">{t("runtimeHydration.loadingTitle")}</span> : null}
            {hydrationError ? <span className="text-warning">{t("runtimeHydration.fallbackWarning", { message: hydrationError })}</span> : null}
          </div>
        }
      />

      {shouldShowOnboarding ? (
        <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_52%),linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0)_100%)]">
          <CardContent className="grid gap-6 p-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-primary">
                {t("sessions.onboardingEyebrow")}
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("sessions.onboardingTitle")}</h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("sessions.onboardingBody")}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <OnboardingConcept
                  icon={MessageSquare}
                  title={t("sessions.onboardingConcepts.sessionTitle")}
                  body={t("sessions.onboardingConcepts.sessionBody")}
                />
                <OnboardingConcept
                  icon={PlaySquare}
                  title={t("sessions.onboardingConcepts.runTitle")}
                  body={t("sessions.onboardingConcepts.runBody")}
                />
                <OnboardingConcept
                  icon={ShieldCheck}
                  title={t("sessions.onboardingConcepts.approvalTitle")}
                  body={t("sessions.onboardingConcepts.approvalBody")}
                />
              </div>
            </div>

            <div className="flex flex-col justify-between gap-4 border border-border/70 bg-background/70 p-5">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.onboardingPrimaryLabel")}</div>
                <div className="text-lg font-medium text-foreground">{t("sessions.onboardingPrimaryTitle")}</div>
                <p className="text-sm leading-6 text-muted-foreground">{t("sessions.onboardingPrimaryBody")}</p>
              </div>

              <div className="space-y-3">
                <Button type="button" className="w-full gap-2 sm:w-auto" onClick={() => void handleNewChat()}>
                  <Plus className="h-4 w-4" />
                  {t("sessions.newChat")}
                </Button>
                <div className="text-xs leading-5 text-muted-foreground">{t("sessions.onboardingHint")}</div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto justify-start px-0 text-xs uppercase tracking-[0.16em]"
                  onClick={handleDismissOnboarding}
                >
                  {t("sessions.onboardingDismiss")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("sessions.explorerTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div className="text-sm font-medium text-foreground">{t("sessions.explorerSummary")}</div>
                <Badge variant="secondary" className="text-xs">
                  {visibleSessions.length}
                </Badge>
              </div>
              <div className="relative w-full md:w-72">
                {searching ? (
                  <div className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-[1.5px] border-primary border-t-transparent" />
                ) : (
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  placeholder={t("sessions.searchPlaceholder")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-8 pl-8 pr-7 text-xs"
                />
                {search ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() => setSearch("")}
                    aria-label={t("sessions.clearSearch")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            </div>

            {workspaceFilter.selectedWorkspace ? (
              <div className="border border-border bg-background/60 p-4 text-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.workspaceScopeLabel")}</div>
                <div className="mt-1 font-medium text-foreground">{t("sessions.workspaceQueueTitle")}</div>
                <div className="mt-1 leading-6 text-muted-foreground">
                  {t("sessions.workspaceQueueBody", {
                    count: visibleSessions.length,
                    workspace: workspaceFilter.selectedWorkspace.name,
                  })}
                </div>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metadata.repository")}</div>
                    <div className="mt-1 font-medium text-foreground">{scopedRepositoryLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metadata.policyPreset")}</div>
                    <div className="mt-1 font-medium text-foreground">{workspaceFilter.selectedWorkspace.policyPreset ?? t("sessions.notSet")}</div>
                  </div>
                </div>
                <Link
                  to={`/workspaces/${workspaceFilter.selectedWorkspace.slug}`}
                  className="mt-3 inline-flex items-center rounded border border-border px-3 py-2 text-xs uppercase tracking-[0.16em] text-foreground transition-colors hover:border-foreground/40"
                >
                  {t("sessions.returnToWorkspace")}
                </Link>
              </div>
            ) : null}

            {loadError ? (
              <div className="border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                <div className="font-medium text-foreground">{t("sessions.backendUnavailableTitle")}</div>
                <div className="mt-1 leading-6">{t("sessions.backendUnavailableBody", { message: loadError })}</div>
              </div>
            ) : null}

            {visibleSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Clock className="mb-3 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium">
                  {search
                    ? t("sessions.noSearchResults")
                    : workspaceFilter.selectedWorkspace
                      ? t("sessions.emptyWorkspaceStateTitle", { workspace: workspaceFilter.selectedWorkspace.name })
                      : t("sessions.emptyStateTitle")}
                </p>
                {!search ? (
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    {workspaceFilter.selectedWorkspace
                      ? t("sessions.emptyWorkspaceStateBody", { workspace: workspaceFilter.selectedWorkspace.name })
                      : t("sessions.emptyStateBody")}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {visibleSessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    snippet={snippetMap.get(session.id)}
                    isSelected={review.selectedSession?.id === session.id}
                    onDelete={() => void handleDelete(session.id)}
                    workspaceSlug={effectiveWorkspaceSlug}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle>{t("sessions.chatTitle")}</CardTitle>
                <CardDescription>{t("sessions.chatDescription")}</CardDescription>
              </div>
              <Button type="button" variant="outline" className="gap-2" onClick={() => void handleNewChat()} disabled={sendPending}>
                <Plus className="h-4 w-4" />
                {t("sessions.newChat")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 border border-border bg-background/60 p-4 text-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.selectedSessionLabel")}</div>
                <div className="text-xl font-medium text-foreground">
                  {pendingRequestedSession
                    ? t("runtimeHydration.loadingTitle")
                    : getConversationTitle(selectedSession, t("sessions.emptyConversationTitle"))}
                </div>
                <div className="leading-6 text-muted-foreground">
                  {pendingRequestedSession
                    ? t("runtimeHydration.loadingBody")
                    : selectedSession?.preview ?? t("sessions.chatEmptyBody")}
                </div>
                {selectedSession ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <Badge variant="outline">{getConversationSubtitle(selectedSession, t("sessions.unknownModel"))}</Badge>
                    <span>{t("sessions.metadata.started")}: {formatTimestamp(selectedSession.started_at)}</span>
                    <span>{t("sessions.metadata.lastActive")}: {formatTimestamp(selectedSession.last_active)}</span>
                  </div>
                ) : null}
              </div>

              {conversationError ? (
                <div className="border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                  <div className="font-medium text-foreground">{t("sessions.chatErrorTitle")}</div>
                  <div className="mt-1 leading-6">{t("sessions.chatErrorBody", { message: conversationError })}</div>
                </div>
              ) : null}

              <div className="border border-border bg-background/40 p-4">
                {pendingRequestedSession || selectedMessagesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : selectedMessages && selectedMessages.length > 0 ? (
                  <MessageList messages={selectedMessages} />
                ) : (
                  <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 opacity-40" />
                    <div className="text-sm font-medium text-foreground">{t("sessions.chatEmptyTitle")}</div>
                    <div className="max-w-md text-sm leading-6">{t("sessions.chatEmptyBody")}</div>
                  </div>
                )}
              </div>

              <div className="space-y-3 border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.composerLabel")}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {pendingRequestedSession ? t("runtimeHydration.loadingBody") : t("sessions.composerHint")}
                    </div>
                  </div>
                  {sendPending ? <Badge variant="outline">{t("sessions.sending")}</Badge> : null}
                </div>
                <textarea
                  value={composerValue}
                  onChange={(event) => setComposerValue(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={t("sessions.composerPlaceholder")}
                  className="flex min-h-[110px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={pendingRequestedSession}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {loadError ? t("sessions.backendUnavailableShort") : t("sessions.chatLoopHint")}
                  </div>
                  <Button
                    type="button"
                    className="gap-2"
                    onClick={() => void handleSendMessage()}
                    disabled={pendingRequestedSession || sendPending || composerValue.trim().length === 0}
                  >
                    <SendHorizontal className="h-4 w-4" />
                    {sendPending ? t("sessions.sending") : t("sessions.send")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("sessions.runtimeHandoffTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {runtimeSource ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border border-border bg-background/60 p-4">
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metrics.messages")}</div>
                    <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{review.metrics.messages}</div>
                  </div>
                  <div className="border border-border bg-background/60 p-4">
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metrics.toolCalls")}</div>
                    <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{review.metrics.toolCalls}</div>
                  </div>
                  <div className="border border-border bg-background/60 p-4">
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metrics.timelineEvents")}</div>
                    <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{review.metrics.timelineEvents}</div>
                  </div>
                  <div className="border border-border bg-background/60 p-4">
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metrics.linkedRuns")}</div>
                    <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{review.metrics.linkedRuns}</div>
                  </div>
                  <div className="border border-border bg-background/60 p-4">
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metrics.approvals")}</div>
                    <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{review.metrics.approvals}</div>
                  </div>
                  <div className="border border-border bg-background/60 p-4">
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metrics.artifacts")}</div>
                    <div className="mt-2 font-collapse text-3xl tracking-[0.08em] text-foreground">{review.metrics.artifacts}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm leading-6 text-muted-foreground">{t("sessions.runtimeHandoffPending")}</div>
              )}

              {runtimeSource && review.relatedRun ? (
                <div className="space-y-3 border border-border bg-background/60 p-4 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.relatedRunLabel")}</div>
                    <div className="mt-1 font-medium text-foreground">{review.relatedRun.title}</div>
                    <div className="mt-1 leading-6 text-muted-foreground">{review.relatedRun.summary}</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metadata.runtimeStatus")}</div>
                      <div className="mt-1 font-medium text-foreground">{t(`runs.statuses.${review.relatedRun.status}`)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metadata.runtimeStarted")}</div>
                      <div className="mt-1 font-medium text-foreground">{formatRuntimeTimestamp(review.relatedRun.startedAt)}</div>
                    </div>
                  </div>

                  <div className="border border-border/80 bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.replayContextLabel")}</div>
                        <div className="mt-1 font-medium text-foreground">{t("sessions.replayContextTitle")}</div>
                      </div>
                      <Badge variant="outline">{t("sessions.replayEventsBadge", { count: review.replaySummary.totalEvents })}</Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <div className="border border-border/80 bg-background/60 p-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.messageEventsLabel")}</div>
                        <div className="mt-2 font-collapse text-2xl tracking-[0.08em] text-foreground">{review.replaySummary.messageCount}</div>
                      </div>
                      <div className="border border-border/80 bg-background/60 p-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.toolCallEventsLabel")}</div>
                        <div className="mt-2 font-collapse text-2xl tracking-[0.08em] text-foreground">{review.replaySummary.toolCallCount}</div>
                      </div>
                      <div className="border border-border/80 bg-background/60 p-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("runs.systemEventsLabel")}</div>
                        <div className="mt-2 font-collapse text-2xl tracking-[0.08em] text-foreground">{review.replaySummary.systemEventCount}</div>
                      </div>
                      <div className="border border-border/80 bg-background/60 p-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metrics.approvals")}</div>
                        <div className="mt-2 font-collapse text-2xl tracking-[0.08em] text-foreground">{review.replaySummary.approvalEventCount}</div>
                      </div>
                      <div className="border border-border/80 bg-background/60 p-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metrics.artifacts")}</div>
                        <div className="mt-2 font-collapse text-2xl tracking-[0.08em] text-foreground">{review.replaySummary.artifactEventCount}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.latestReplayEventLabel")}</div>
                        <div className="mt-1 font-medium text-foreground">
                          {review.latestReplayEvent ? formatRuntimeTimestamp(review.latestReplayEvent.timestamp) : t("sessions.noReplayEvents")}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metrics.linkedRuns")}</div>
                        <div className="mt-1 font-medium text-foreground">{review.metrics.linkedRuns}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.relatedRunLabel")}</div>
                        <div className="mt-1 font-medium text-foreground">{review.relatedRun.title}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.replayHandoffLabel")}</div>
                        <div className="mt-1 leading-6 text-muted-foreground">{t("sessions.replayHandoffBody")}</div>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={buildRunPath(review.relatedRun.id, effectiveWorkspaceSlug)}
                    className="inline-flex items-center rounded border border-border px-3 py-2 text-xs uppercase tracking-[0.16em] text-foreground transition-colors hover:border-foreground/40"
                  >
                    {t("sessions.openRunReview")}
                  </Link>
                </div>
              ) : null}

              {runtimeSource && !review.relatedRun ? (
                <div className="text-sm leading-6 text-muted-foreground">{t("sessions.runtimeHandoffEmpty")}</div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

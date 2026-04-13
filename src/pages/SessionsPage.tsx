import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Globe,
  Hash,
  MessageCircle,
  MessageSquare,
  Search,
  Terminal,
  Trash2,
  X,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { Markdown } from "@/components/Markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RuntimeContractSnapshot } from "@/features/runtime/types";
import { useRuntimeSnapshot } from "@/features/runtime/useRuntimeSnapshot";
import { api } from "@/lib/api";
import type { SessionInfo, SessionMessage, SessionSearchResult } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { deriveSessionReview } from "@/pages/sessionReview";

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
  searchQuery,
  isExpanded,
  isSelected,
  onToggle,
  onDelete,
}: {
  session: SessionInfo;
  snippet?: string;
  searchQuery?: string;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<SessionMessage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isExpanded && messages === null && !loading) {
      setLoading(true);
      api
        .getSessionMessages(session.id)
        .then((resp) => setMessages(resp.messages))
        .catch((err) => setError(String(err)))
        .finally(() => setLoading(false));
    }
  }, [isExpanded, session.id, messages, loading]);

  const sourceInfo = (session.source ? SOURCE_CONFIG[session.source] : null) ?? {
    icon: Globe,
    color: "text-muted-foreground",
  };
  const SourceIcon = sourceInfo.icon;
  const hasTitle = session.title && session.title !== "Untitled";

  return (
    <div className={`overflow-hidden border transition-colors ${session.is_active ? "border-success/30 bg-success/[0.03]" : "border-border"}`}>
      <div className="flex items-center justify-between p-3 transition-colors hover:bg-secondary/30">
        <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left" onClick={onToggle}>
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
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {session.source ?? t("sessions.localSource")}
          </Badge>
          <Link
            to={`/sessions/${session.id}`}
            className={`inline-flex items-center rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors ${
              isSelected ? "border-foreground/50 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {isSelected ? t("sessions.selectedSessionLabel") : t("sessions.openSessionReview")}
          </Link>
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

      {isExpanded ? (
        <div className="border-t border-border bg-background/50 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : null}
          {error ? <p className="py-4 text-center text-sm text-destructive">{error}</p> : null}
          {messages && messages.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{t("sessions.noMessages")}</p> : null}
          {messages && messages.length > 0 ? <MessageList messages={messages} highlight={searchQuery} /> : null}
        </div>
      ) : null}
    </div>
  );
}

export interface SessionsPageProps {
  initialSessions?: SessionInfo[];
}

export default function SessionsPage({ initialSessions }: SessionsPageProps = {}) {
  const { t } = useTranslation();
  const { sessionId } = useParams();
  const runtimeEnabled = initialSessions !== undefined || Boolean(sessionId);
  const runtimeQuery = useRuntimeSnapshot(runtimeEnabled);
  const snapshot = runtimeQuery.data?.snapshot ?? EMPTY_RUNTIME_SNAPSHOT;
  const runtimeSource = runtimeQuery.data?.source ?? null;
  const hydrationError = runtimeQuery.data?.error ?? null;

  const [sessions, setSessions] = useState<SessionInfo[]>(() => initialSessions ?? []);
  const [loading, setLoading] = useState(() => initialSessions === undefined);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SessionSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const loadSessions = useCallback(() => {
    api
      .getSessions()
      .then(setSessions)
      .catch(() => {})
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

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((session) => session.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      // ignore delete failure for now
    }
  };

  const snippetMap = new Map<string, string>();
  if (searchResults) {
    for (const result of searchResults) {
      snippetMap.set(result.session_id, result.snippet);
    }
  }

  const filtered = searchResults ? sessions.filter((session) => snippetMap.has(session.id)) : sessions;
  const review = deriveSessionReview(sessions, snapshot, sessionId);

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

  if (review.shouldRedirectToCanonical && review.canonicalSessionId) {
    return <Navigate to={`/sessions/${review.canonicalSessionId}`} replace />;
  }

  return (
    <div className="space-y-6">
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
            {hydrationError ? <span className="text-warning">{t("runtimeHydration.fallbackWarning", { message: hydrationError })}</span> : null}
          </div>
        }
      />

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
                  {sessions.length}
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

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Clock className="mb-3 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium">{search ? t("sessions.noSearchResults") : t("sessions.emptyStateTitle")}</p>
                {!search ? <p className="mt-1 text-xs text-muted-foreground/60">{t("sessions.emptyStateBody")}</p> : null}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filtered.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    snippet={snippetMap.get(session.id)}
                    searchQuery={search || undefined}
                    isExpanded={expandedId === session.id}
                    isSelected={review.selectedSession?.id === session.id}
                    onToggle={() => setExpandedId((prev) => (prev === session.id ? null : session.id))}
                    onDelete={() => void handleDelete(session.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("sessions.selectedTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {review.selectedSession ? (
                <>
                  <div className="space-y-2 border border-border bg-background/60 p-4 text-sm">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.selectedSessionLabel")}</div>
                    <div className="text-xl font-medium text-foreground">
                      {review.selectedSession.title?.trim() || review.selectedSession.preview?.trim() || review.selectedSession.id || t("sessions.untitledSession")}
                    </div>
                    <div className="leading-6 text-muted-foreground">{review.selectedSession.preview ?? t("sessions.noPreview")}</div>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="border border-border bg-background/60 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metadata.source")}</div>
                      <div className="mt-1 font-medium text-foreground">{review.selectedSession.source ?? t("sessions.localSource")}</div>
                    </div>
                    <div className="border border-border bg-background/60 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metadata.model")}</div>
                      <div className="mt-1 font-medium text-foreground">{review.selectedSession.model ?? t("sessions.unknownModel")}</div>
                    </div>
                    <div className="border border-border bg-background/60 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metadata.started")}</div>
                      <div className="mt-1 font-medium text-foreground">{formatTimestamp(review.selectedSession.started_at)}</div>
                    </div>
                    <div className="border border-border bg-background/60 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("sessions.metadata.lastActive")}</div>
                      <div className="mt-1 font-medium text-foreground">{formatTimestamp(review.selectedSession.last_active)}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-6 text-muted-foreground">{t("sessions.emptyStateBody")}</div>
              )}
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
                  <Link
                    to={`/runs/${review.relatedRun.id}`}
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

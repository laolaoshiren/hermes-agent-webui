const BASE = "";

// Ephemeral session token for protected endpoints (reveal).
// Fetched once on first reveal request and cached in memory.
let _sessionToken: string | null = null;

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

async function getSessionToken(): Promise<string> {
  if (_sessionToken) return _sessionToken;
  const resp = await fetchJSON<{ token: string }>("/api/auth/session-token");
  _sessionToken = resp.token;
  return _sessionToken;
}

function normalizeMessageContent(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const textParts = content
      .flatMap((part) => {
        if (typeof part === "string") {
          return [part];
        }

        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return [part.text];
        }

        return [];
      })
      .join("\n")
      .trim();

    return textParts || null;
  }

  return null;
}

function normalizeSessionMessages(messages: unknown): SessionMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.map((message) => {
    const role =
      message && typeof message === "object" && "role" in message && typeof message.role === "string"
        ? message.role
        : "system";
    const normalizedRole = role === "user" || role === "assistant" || role === "system" || role === "tool" ? role : "system";
    const timestamp =
      message && typeof message === "object" && "timestamp" in message && typeof message.timestamp === "number"
        ? message.timestamp
        : undefined;
    const toolCalls =
      message && typeof message === "object" && "tool_calls" in message && Array.isArray(message.tool_calls)
        ? (message.tool_calls as SessionMessage["tool_calls"])
        : undefined;

    return {
      role: normalizedRole,
      content: normalizeMessageContent(message && typeof message === "object" && "content" in message ? message.content : null),
      timestamp,
      tool_calls: toolCalls,
      tool_name:
        message && typeof message === "object" && "tool_name" in message && typeof message.tool_name === "string"
          ? message.tool_name
          : undefined,
      tool_call_id:
        message && typeof message === "object" && "tool_call_id" in message && typeof message.tool_call_id === "string"
          ? message.tool_call_id
          : undefined,
    };
  });
}

function buildPreview(messages: SessionMessage[]) {
  const previewSource = [...messages].reverse().find((message) => typeof message.content === "string" && message.content.trim().length > 0);
  return previewSource?.content ?? null;
}

export interface ChatSessionPayload {
  session_id: string;
  title?: string | null;
  workspace?: string | null;
  model?: string | null;
  message_count?: number;
  created_at?: number;
  updated_at?: number;
  source?: string | null;
  input_tokens?: number;
  output_tokens?: number;
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
  messages?: unknown;
}

export function normalizeSessionInfo(payload: ChatSessionPayload): SessionInfo {
  const messages = normalizeSessionMessages(payload.messages);
  const startedAt = payload.created_at ?? payload.updated_at ?? Math.floor(Date.now() / 1000);
  const lastActive = payload.updated_at ?? startedAt;

  return {
    id: payload.session_id,
    source: payload.source ?? "webui",
    model: payload.model ?? null,
    title: payload.title ?? null,
    started_at: startedAt,
    ended_at: null,
    last_active: lastActive,
    is_active: false,
    message_count: payload.message_count ?? messages.length,
    tool_call_count: payload.tool_calls?.length ?? 0,
    input_tokens: payload.input_tokens ?? 0,
    output_tokens: payload.output_tokens ?? 0,
    preview: buildPreview(messages),
  };
}

export const api = {
  getStatus: () => fetchJSON<StatusResponse>("/api/status"),
  getSessions: () => fetchJSON<SessionInfo[]>("/api/sessions"),
  getSessionMessages: (id: string) =>
    fetchJSON<SessionMessagesResponse>(`/api/sessions/${encodeURIComponent(id)}/messages`),
  createSession: async (options: { model?: string; workspace?: string } = {}) => {
    const response = await fetchJSON<{ session: ChatSessionPayload }>("/api/session/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });

    return {
      session: normalizeSessionInfo(response.session),
      messages: normalizeSessionMessages(response.session.messages),
    };
  },
  sendChatMessage: async (payload: { sessionId: string; message: string; model?: string; workspace?: string }) => {
    const response = await fetchJSON<{
      answer: string;
      status: string;
      session: ChatSessionPayload;
      result?: Record<string, unknown>;
    }>("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: payload.sessionId,
        message: payload.message,
        model: payload.model,
        workspace: payload.workspace,
      }),
    });

    return {
      answer: response.answer,
      status: response.status,
      session: normalizeSessionInfo(response.session),
      messages: normalizeSessionMessages(response.session.messages),
      result: response.result ?? null,
    };
  },
  deleteSession: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getLogs: (params: { file?: string; lines?: number; level?: string; component?: string }) => {
    const qs = new URLSearchParams();
    if (params.file) qs.set("file", params.file);
    if (params.lines) qs.set("lines", String(params.lines));
    if (params.level && params.level !== "ALL") qs.set("level", params.level);
    if (params.component && params.component !== "all") qs.set("component", params.component);
    return fetchJSON<LogsResponse>(`/api/logs?${qs.toString()}`);
  },
  getAnalytics: (days: number) =>
    fetchJSON<AnalyticsResponse>(`/api/analytics/usage?days=${days}`),
  getConfig: () => fetchJSON<Record<string, unknown>>("/api/config"),
  getDefaults: () => fetchJSON<Record<string, unknown>>("/api/config/defaults"),
  getSchema: () => fetchJSON<{ fields: Record<string, unknown>; category_order: string[] }>("/api/config/schema"),
  saveConfig: (config: Record<string, unknown>) =>
    fetchJSON<{ ok: boolean }>("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    }),
  getConfigRaw: () => fetchJSON<{ yaml: string }>("/api/config/raw"),
  saveConfigRaw: (yaml_text: string) =>
    fetchJSON<{ ok: boolean }>("/api/config/raw", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yaml_text }),
    }),
  getEnvVars: () => fetchJSON<Record<string, EnvVarInfo>>("/api/env"),
  setEnvVar: (key: string, value: string) =>
    fetchJSON<{ ok: boolean }>("/api/env", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    }),
  deleteEnvVar: (key: string) =>
    fetchJSON<{ ok: boolean }>("/api/env", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    }),
  revealEnvVar: async (key: string) => {
    const token = await getSessionToken();
    return fetchJSON<{ key: string; value: string }>("/api/env/reveal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key }),
    });
  },

  // Cron jobs
  getCronJobs: () => fetchJSON<CronJob[]>("/api/cron/jobs"),
  createCronJob: (job: { prompt: string; schedule: string; name?: string; deliver?: string }) =>
    fetchJSON<CronJob>("/api/cron/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    }),
  pauseCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/cron/jobs/${id}/pause`, { method: "POST" }),
  resumeCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/cron/jobs/${id}/resume`, { method: "POST" }),
  triggerCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/cron/jobs/${id}/trigger`, { method: "POST" }),
  deleteCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/cron/jobs/${id}`, { method: "DELETE" }),

  // Skills & Toolsets
  getSkills: () => fetchJSON<SkillInfo[]>("/api/skills"),
  toggleSkill: (name: string, enabled: boolean) =>
    fetchJSON<{ ok: boolean }>("/api/skills/toggle", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, enabled }),
    }),
  getToolsets: () => fetchJSON<ToolsetInfo[]>("/api/tools/toolsets"),

  // Session search (FTS5)
  searchSessions: (q: string) =>
    fetchJSON<SessionSearchResponse>(`/api/sessions/search?q=${encodeURIComponent(q)}`),
};

export interface PlatformStatus {
  error_code?: string;
  error_message?: string;
  state: string;
  updated_at: string;
}

export interface StatusResponse {
  active_sessions: number;
  config_path: string;
  config_version: number;
  env_path: string;
  gateway_exit_reason: string | null;
  gateway_pid: number | null;
  gateway_platforms: Record<string, PlatformStatus>;
  gateway_running: boolean;
  gateway_state: string | null;
  gateway_updated_at: string | null;
  hermes_home: string;
  latest_config_version: number;
  release_date: string;
  version: string;
}

export interface SessionInfo {
  id: string;
  source: string | null;
  model: string | null;
  title: string | null;
  started_at: number;
  ended_at: number | null;
  last_active: number;
  is_active: boolean;
  message_count: number;
  tool_call_count: number;
  input_tokens: number;
  output_tokens: number;
  preview: string | null;
}

export interface EnvVarInfo {
  is_set: boolean;
  redacted_value: string | null;
  description: string;
  url: string | null;
  category: string;
  is_password: boolean;
  tools: string[];
  advanced: boolean;
}

export interface SessionMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    function: { name: string; arguments: string };
  }>;
  tool_name?: string;
  tool_call_id?: string;
  timestamp?: number;
}

export interface SessionMessagesResponse {
  session_id: string;
  messages: SessionMessage[];
}

export interface LogsResponse {
  file: string;
  lines: string[];
}

export interface AnalyticsDailyEntry {
  day: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  reasoning_tokens: number;
  estimated_cost: number;
  actual_cost: number;
  sessions: number;
}

export interface AnalyticsModelEntry {
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  sessions: number;
}

export interface AnalyticsResponse {
  daily: AnalyticsDailyEntry[];
  by_model: AnalyticsModelEntry[];
  totals: {
    total_input: number;
    total_output: number;
    total_cache_read: number;
    total_reasoning: number;
    total_estimated_cost: number;
    total_actual_cost: number;
    total_sessions: number;
  };
}

export interface CronJob {
  id: string;
  name?: string;
  prompt: string;
  schedule: string;
  status: "enabled" | "paused" | "error";
  deliver?: string;
  last_run_at?: string | null;
  next_run_at?: string | null;
  error?: string | null;
}

export interface SkillInfo {
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

export interface ToolsetInfo {
  name: string;
  label: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  tools: string[];
}

export interface SessionSearchResult {
  session_id: string;
  snippet: string;
  role: string | null;
  source: string | null;
  model: string | null;
  session_started: number | null;
}

export interface SessionSearchResponse {
  results: SessionSearchResult[];
}

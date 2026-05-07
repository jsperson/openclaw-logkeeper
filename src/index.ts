import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { resolveConfig } from "./config.js";
import { resolveAssistantAlias, resolveUserAlias, type PluginApi } from "./identity.js";
import { appendTurn, extractText, formatEntry, truncate, type ContentBlock } from "./logger.js";
import { resolveFilename } from "./template.js";
import { join } from "node:path";

interface PluginHookMessage {
  role: "user" | "assistant" | "compactionSummary" | string;
  content: string | ContentBlock[];
  usage?: {
    input?: number;
    output?: number;
    total?: number;
  };
}

interface AgentEndEvent {
  messages: PluginHookMessage[];
  success: boolean;
  durationMs: number;
  error?: string;
  runId?: string;
}

interface AgentEndContext {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  workspaceDir?: string;
  messageProvider?: string | null;
  channelId?: string;
  modelId?: string;
  modelProviderId?: string;
  jobId?: string;
  [key: string]: unknown;
}

function localDate(): { date: string; time: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return { date, time };
}

const plugin = definePluginEntry({
  id: "openclaw-scribe",
  name: "OpenClaw Scribe",
  description:
    "Turn-by-turn conversation logger. Appends every agent exchange to daily markdown files.",
  register(api) {
    // Resolve config at startup — log error and disable if misconfigured.
    let config: ReturnType<typeof resolveConfig>;
    try {
      config = resolveConfig((api as unknown as { pluginConfig: unknown }).pluginConfig);
    } catch (err) {
      console.error(String(err));
      return;
    }

    const userAlias = resolveUserAlias(config);

    (api as unknown as { on: (event: string, handler: (event: AgentEndEvent, ctx: AgentEndContext) => Promise<void>, opts?: { timeoutMs?: number }) => void }).on(
      "agent_end",
      async (event: AgentEndEvent, ctx: AgentEndContext): Promise<void> => {
        try {
          // Guard: skip failed turns
          if (!event.success) return;

          // Guard: skip cron/heartbeat turns unless opted in
          if (ctx.jobId && !config.includeCron) return;

          // Find last user and assistant messages
          const messages = event.messages;
          let lastUser: PluginHookMessage | undefined;
          let lastAssistant: PluginHookMessage | undefined;
          for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i]!;
            if (!lastAssistant && m.role === "assistant") lastAssistant = m;
            if (!lastUser && m.role === "user") lastUser = m;
            if (lastUser && lastAssistant) break;
          }

          // Guard: skip tool-only or summary turns
          if (!lastUser || !lastAssistant) return;

          const { date, time } = localDate();
          const channel = ctx.messageProvider ?? "tui";
          const agentId = ctx.agentId ?? "main";

          const filename = resolveFilename(config, channel, date, agentId);
          const filePath = join(config.logDir, filename);

          const assistantAlias = resolveAssistantAlias(api as unknown as PluginApi, config, agentId);

          const userText = extractText(lastUser.content);
          const rawAssistantText = extractText(lastAssistant.content);
          const assistantText = truncate(rawAssistantText, config.maxLength);

          // Build optional metadata line
          let metaLine = "";
          if (config.metadata) {
            const model = ctx.modelId ?? null;
            const usage = lastAssistant.usage ?? null;
            if (model !== null || usage !== null) {
              const inputTok = usage?.input ?? "?";
              const outputTok = usage?.output ?? "?";
              metaLine = `· ${model ?? "?"} · ${inputTok}↑ ${outputTok}↓\n`;
            }
          }

          const entry = formatEntry({
            time,
            userAlias,
            assistantAlias,
            userText,
            assistantText,
            metaLine: metaLine || undefined,
          });

          await appendTurn(filePath, date, entry);
        } catch (err) {
          console.error("[openclaw-scribe] Error writing turn:", err);
        }
      },
      { timeoutMs: 25000 }
    );
  },
});

export default plugin;

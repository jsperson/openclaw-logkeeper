import { definePluginEntry, type OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { join } from "node:path";
import { resolveConfig } from "./config.js";
import { resolveAssistantAlias, resolveUserAlias, type PluginApi } from "./identity.js";
import { appendTurn, extractText, formatEntry, stripEnvelope, truncate, type ContentBlock } from "./logger.js";
import { resolveFilename } from "./template.js";

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

export default definePluginEntry({
  id: "openclaw-logkeeper",
  name: "OpenClaw Logkeeper",
  description:
    "Turn-by-turn conversation logger. Appends every agent exchange to daily markdown files.",
  register(api: OpenClawPluginApi) {
    let config: ReturnType<typeof resolveConfig>;
    try {
      config = resolveConfig(api.pluginConfig);
    } catch (err) {
      console.error(String(err));
      return;
    }

    const userAlias = resolveUserAlias(config);

    const hasAccess =
      (api.config as Record<string, unknown> & { plugins?: { entries?: Record<string, { hooks?: { allowConversationAccess?: boolean } }> } })
        ?.plugins?.entries?.["openclaw-logkeeper"]?.hooks?.allowConversationAccess === true;

    if (!hasAccess) {
      console.error(
        "[openclaw-logkeeper] WARNING: agent_end hook will be blocked because " +
        "plugins.entries.openclaw-logkeeper.hooks.allowConversationAccess is not set to true in openclaw.json. " +
        "No conversations will be logged until this is set. " +
        "Add the following to your openclaw.json under plugins.entries.openclaw-logkeeper: " +
        '{"hooks":{"allowConversationAccess":true}}'
      );
    }

    api.on(
      "agent_end",
      async (event: unknown, ctx: unknown): Promise<void> => {
        try {
          const e = event as AgentEndEvent;
          const c = ctx as AgentEndContext;

          if (!e.success) return;
          if (c.jobId && !config.includeCron) return;

          const messages = e.messages;
          let lastUser: PluginHookMessage | undefined;
          let lastAssistant: PluginHookMessage | undefined;
          for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i]!;
            if (!lastAssistant && m.role === "assistant") lastAssistant = m;
            if (!lastUser && m.role === "user") lastUser = m;
            if (lastUser && lastAssistant) break;
          }

          if (!lastUser || !lastAssistant) return;

          const { date, time } = localDate();
          const channel = c.messageProvider ?? "tui";
          const agentId = c.agentId ?? "main";

          const filename = resolveFilename(config, channel, date, agentId);
          const filePath = join(config.logDir, filename);

          const assistantAlias = resolveAssistantAlias(api as unknown as PluginApi, config, agentId);
          const userText = stripEnvelope(extractText(lastUser.content));
          const rawAssistantText = extractText(lastAssistant.content);
          const assistantText = truncate(rawAssistantText, config.maxLength);

          let metaLine = "";
          if (config.metadata) {
            const model = c.modelId ?? null;
            const usage = lastAssistant.usage ?? null;
            if (model !== null || usage !== null) {
              metaLine = `· ${model ?? "?"} · ${usage?.input ?? "?"}↑ ${usage?.output ?? "?"}↓\n`;
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
          console.error("[openclaw-logkeeper] Error writing turn:", err);
        }
      },
      { timeoutMs: 25000 }
    );
  },
});

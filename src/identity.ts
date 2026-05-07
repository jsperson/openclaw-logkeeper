import type { ScribeConfig } from "./config.js";

export interface PluginApi {
  config: unknown;
  runtime: {
    agent: {
      resolveAgentIdentity: (
        cfg: unknown,
        agentId?: string
      ) => { name?: string; emoji?: string; avatar?: string } | null | undefined;
    };
  };
}

export function resolveUserAlias(config: ScribeConfig): string {
  return config.userAlias ?? "user";
}

export function resolveAssistantAlias(
  api: PluginApi,
  config: ScribeConfig,
  agentId?: string
): string {
  try {
    const identity = api.runtime.agent.resolveAgentIdentity(api.config, agentId);
    if (identity?.name && typeof identity.name === "string") {
      return identity.name;
    }
  } catch {
    // resolveAgentIdentity unavailable or threw — fall through to config/default
  }
  return config.assistantAlias ?? "assistant";
}

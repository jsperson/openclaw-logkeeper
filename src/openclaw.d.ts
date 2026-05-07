// Type stubs for the openclaw peer dependency.
// These match the subset of the OpenClaw plugin SDK used by openclaw-scribe.
declare module "openclaw/plugin-sdk/plugin-entry" {
  export interface OpenClawPluginApi {
    config: unknown;
    pluginConfig: unknown;
    logger: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void };
    runtime: {
      agent: {
        resolveAgentIdentity: (
          cfg: unknown,
          agentId?: string
        ) => { name?: string; emoji?: string; avatar?: string } | null | undefined;
        resolveAgentWorkspaceDir: (cfg: unknown, agentId?: string) => string;
        resolveAgentDir: (cfg: unknown, agentId?: string) => string;
      };
      config?: {
        current?: () => unknown;
      };
    };
    on: (
      event: string,
      handler: (...args: unknown[]) => Promise<unknown> | unknown,
      opts?: { priority?: number; timeoutMs?: number }
    ) => void;
  }

  export interface PluginEntryDef {
    id: string;
    name?: string;
    description?: string;
    register: (api: OpenClawPluginApi) => void;
  }

  export function definePluginEntry(def: PluginEntryDef): PluginEntryDef;
}

import { homedir } from "node:os";

export interface ScribeConfig {
  logDir: string;
  filename: string;
  channels: Record<string, string>;
  userAlias: string;
  assistantAlias: string;
  maxLength: number;
  includeCron: boolean;
  metadata: boolean;
}

const DEFAULTS = {
  filename: "{date}-{channel}.md",
  channels: {},
  userAlias: "user",
  assistantAlias: "assistant",
  maxLength: 4000,
  includeCron: false,
  metadata: false,
} as const;

export function resolveConfig(raw: unknown): ScribeConfig {
  if (!raw || typeof raw !== "object") {
    throw new Error(
      "[openclaw-scribe] Plugin config is missing or invalid. Add a config block under plugins.entries.openclaw-scribe.config in openclaw.json."
    );
  }

  const cfg = raw as Record<string, unknown>;

  if (!cfg["logDir"] || typeof cfg["logDir"] !== "string") {
    throw new Error(
      "[openclaw-scribe] Required config field 'logDir' is missing. Set plugins.entries.openclaw-scribe.config.logDir in openclaw.json."
    );
  }

  return {
    logDir: expandHome(cfg["logDir"] as string),
    filename:
      typeof cfg["filename"] === "string"
        ? cfg["filename"]
        : DEFAULTS.filename,
    channels:
      cfg["channels"] && typeof cfg["channels"] === "object" && !Array.isArray(cfg["channels"])
        ? (cfg["channels"] as Record<string, string>)
        : DEFAULTS.channels,
    userAlias:
      typeof cfg["userAlias"] === "string" ? cfg["userAlias"] : DEFAULTS.userAlias,
    assistantAlias:
      typeof cfg["assistantAlias"] === "string"
        ? cfg["assistantAlias"]
        : DEFAULTS.assistantAlias,
    maxLength:
      typeof cfg["maxLength"] === "number" && cfg["maxLength"] >= 0
        ? cfg["maxLength"]
        : DEFAULTS.maxLength,
    includeCron:
      typeof cfg["includeCron"] === "boolean"
        ? cfg["includeCron"]
        : DEFAULTS.includeCron,
    metadata:
      typeof cfg["metadata"] === "boolean" ? cfg["metadata"] : DEFAULTS.metadata,
  };
}

export function expandHome(p: string): string {
  if (p.startsWith("~/")) {
    return homedir() + p.slice(1);
  }
  return p;
}

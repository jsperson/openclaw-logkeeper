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
  logDir: "~/.openclaw/logs",
  filename: "{date}-{channel}.md",
  channels: {},
  userAlias: "user",
  assistantAlias: "assistant",
  maxLength: 4000,
  includeCron: false,
  metadata: false,
} as const;

export function resolveConfig(raw: unknown): ScribeConfig {
  const cfg = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  return {
    logDir: expandHome(
      typeof cfg["logDir"] === "string" ? cfg["logDir"] : DEFAULTS.logDir
    ),
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

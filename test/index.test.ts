import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the OpenClaw plugin SDK before any imports
vi.mock("openclaw/plugin-sdk/plugin-entry", () => ({
  definePluginEntry: (def: {
    id: string;
    name: string;
    register: (api: unknown) => void;
  }) => def,
}));

type AgentEndHandler = (
  event: {
    messages: Array<{ role: string; content: string; usage?: { input?: number; output?: number } }>;
    success: boolean;
    durationMs?: number;
  },
  ctx: {
    messageProvider?: string | null;
    agentId?: string;
    jobId?: string;
    modelId?: string;
  }
) => Promise<void>;

interface Handlers {
  agent_end?: AgentEndHandler;
}

function makeApi(logDir: string, extra: Record<string, unknown> = {}) {
  const handlers: Handlers = {};
  return {
    pluginConfig: { logDir, ...extra },
    config: {},
    runtime: {
      agent: {
        resolveAgentIdentity: () => ({ name: "jomama" }),
      },
    },
    on: (
      event: string,
      handler: AgentEndHandler,
      _opts?: unknown
    ) => {
      if (event === "agent_end") handlers.agent_end = handler;
    },
    handlers,
  };
}

function makeEvent(
  userText: string,
  assistantText: string,
  overrides: Partial<{
    success: boolean;
    jobId: string;
    messageProvider: string | null;
    agentId: string;
    modelId: string;
    inputTok: number;
    outputTok: number;
  }> = {}
) {
  return {
    event: {
      messages: [
        { role: "user", content: userText },
        {
          role: "assistant",
          content: assistantText,
          usage: { input: overrides.inputTok ?? 10, output: overrides.outputTok ?? 20 },
        },
      ],
      success: overrides.success ?? true,
      durationMs: 500,
    },
    ctx: {
      messageProvider: overrides.messageProvider !== undefined ? overrides.messageProvider : "discord",
      agentId: overrides.agentId ?? "main",
      jobId: overrides.jobId,
      modelId: overrides.modelId,
    },
  };
}

describe("plugin entry point (integration)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `scribe-index-test-${Date.now()}-${Math.random()}`);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    vi.resetModules();
  });

  async function loadPlugin(logDir: string, extra: Record<string, unknown> = {}) {
    const mod = await import("../src/index.js?v=" + Date.now());
    const plugin = mod.default as { register: (api: unknown) => void };
    const api = makeApi(logDir, extra);
    plugin.register(api);
    return api;
  }

  it("writes a Discord turn to the correct daily file", async () => {
    const api = await loadPlugin(tmpDir);
    const { event, ctx } = makeEvent("hello", "hi there");

    await api.handlers.agent_end!(event, ctx);

    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const content = await readFile(join(tmpDir, `${date}-discord.md`), "utf8");
    expect(content).toContain("# " + date);
    expect(content).toContain("**user:** hello");
    expect(content).toContain("**jomama:** hi there");
  });

  it("routes TUI turns (null messageProvider) to {date}-tui.md", async () => {
    const api = await loadPlugin(tmpDir);
    const { event, ctx } = makeEvent("hey", "howdy", { messageProvider: null });

    await api.handlers.agent_end!(event, { ...ctx, messageProvider: null });

    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const content = await readFile(join(tmpDir, `${date}-tui.md`), "utf8");
    expect(content).toContain("**user:** hey");
  });

  it("does not write when event.success is false", async () => {
    const api = await loadPlugin(tmpDir);
    const { event, ctx } = makeEvent("hello", "hi", { success: false });

    await api.handlers.agent_end!(event, ctx);

    const { readdir } = await import("node:fs/promises");
    const files = await readdir(tmpDir).catch(() => []);
    expect(files.length).toBe(0);
  });

  it("skips cron turns by default (includeCron: false)", async () => {
    const api = await loadPlugin(tmpDir);
    const { event, ctx } = makeEvent("heartbeat", "ok", { jobId: "cron-job-1" });

    await api.handlers.agent_end!(event, { ...ctx, jobId: "cron-job-1" });

    const { readdir } = await import("node:fs/promises");
    const files = await readdir(tmpDir).catch(() => []);
    expect(files.length).toBe(0);
  });

  it("logs cron turns when includeCron: true", async () => {
    const api = await loadPlugin(tmpDir, { includeCron: true });
    const { event, ctx } = makeEvent("heartbeat", "ok", { jobId: "cron-job-1" });

    await api.handlers.agent_end!(event, { ...ctx, jobId: "cron-job-1" });

    const { readdir } = await import("node:fs/promises");
    const files = await readdir(tmpDir).catch(() => []);
    expect(files.length).toBeGreaterThan(0);
  });

  it("skips turns with no user message", async () => {
    const api = await loadPlugin(tmpDir);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    await api.handlers.agent_end!(
      {
        messages: [{ role: "assistant", content: "standalone" }],
        success: true,
        durationMs: 100,
      },
      { messageProvider: "discord", agentId: "main" }
    );

    const { readdir } = await import("node:fs/promises");
    const files = await readdir(tmpDir).catch(() => []);
    expect(files.length).toBe(0);
  });

  it("skips turns with no assistant message", async () => {
    const api = await loadPlugin(tmpDir);

    await api.handlers.agent_end!(
      {
        messages: [{ role: "user", content: "hello" }],
        success: true,
        durationMs: 100,
      },
      { messageProvider: "discord", agentId: "main" }
    );

    const { readdir } = await import("node:fs/promises");
    const files = await readdir(tmpDir).catch(() => []);
    expect(files.length).toBe(0);
  });

  it("applies per-channel filename override", async () => {
    const api = await loadPlugin(tmpDir, {
      channels: { discord: "{date}-chat.md" },
    });
    const { event, ctx } = makeEvent("q", "a");

    await api.handlers.agent_end!(event, ctx);

    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const content = await readFile(join(tmpDir, `${date}-chat.md`), "utf8");
    expect(content).toContain("**user:** q");
  });

  it("includes metadata line when metadata: true and modelId available", async () => {
    const api = await loadPlugin(tmpDir, { metadata: true });
    const { event, ctx } = makeEvent("q", "a", { modelId: "claude-opus-4-7" });

    await api.handlers.agent_end!(event, { ...ctx, modelId: "claude-opus-4-7" });

    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const content = await readFile(join(tmpDir, `${date}-discord.md`), "utf8");
    expect(content).toContain("claude-opus-4-7");
  });
});

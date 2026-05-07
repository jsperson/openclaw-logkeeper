import { describe, expect, it } from "vitest";
import type { ScribeConfig } from "../src/config.js";
import { renderTemplate, resolveFilename } from "../src/template.js";

const BASE_CONFIG: ScribeConfig = {
  logDir: "/tmp",
  filename: "{date}-{channel}.md",
  channels: {},
  userAlias: "user",
  assistantAlias: "assistant",
  maxLength: 4000,
  includeCron: false,
  metadata: false,
};

describe("renderTemplate", () => {
  it("substitutes {date} and {channel}", () => {
    expect(
      renderTemplate("{date}-{channel}.md", {
        date: "2026-05-07",
        channel: "discord",
        agent: "main",
      })
    ).toBe("2026-05-07-discord.md");
  });

  it("substitutes {agent}", () => {
    expect(
      renderTemplate("{date}-{agent}.md", {
        date: "2026-05-07",
        channel: "discord",
        agent: "research",
      })
    ).toBe("2026-05-07-research.md");
  });

  it("leaves unknown variables unchanged", () => {
    expect(
      renderTemplate("{date}-{foo}.md", {
        date: "2026-05-07",
        channel: "discord",
        agent: "main",
      })
    ).toBe("2026-05-07-{foo}.md");
  });

  it("returns template unchanged when no variables present", () => {
    expect(
      renderTemplate("static.md", { date: "2026-05-07", channel: "discord", agent: "main" })
    ).toBe("static.md");
  });

  it("replaces all occurrences of a variable", () => {
    expect(
      renderTemplate("{date}-{date}.md", {
        date: "2026-05-07",
        channel: "discord",
        agent: "main",
      })
    ).toBe("2026-05-07-2026-05-07.md");
  });
});

describe("resolveFilename", () => {
  it("uses default template when no override", () => {
    expect(resolveFilename(BASE_CONFIG, "discord", "2026-05-07", "main")).toBe(
      "2026-05-07-discord.md"
    );
  });

  it("uses per-channel override when present", () => {
    const cfg = {
      ...BASE_CONFIG,
      channels: { tui: "{date}-tui.md" },
    };
    expect(resolveFilename(cfg, "tui", "2026-05-07", "main")).toBe(
      "2026-05-07-tui.md"
    );
  });

  it("falls back to default when channel not in override map", () => {
    const cfg = {
      ...BASE_CONFIG,
      channels: { discord: "{date}-discord.md" },
    };
    expect(resolveFilename(cfg, "telegram", "2026-05-07", "main")).toBe(
      "2026-05-07-telegram.md"
    );
  });

  it("handles undefined channels map gracefully", () => {
    const cfg = { ...BASE_CONFIG, channels: {} };
    expect(resolveFilename(cfg, "discord", "2026-05-07", "main")).toBe(
      "2026-05-07-discord.md"
    );
  });
});

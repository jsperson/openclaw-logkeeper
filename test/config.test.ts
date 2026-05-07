import { homedir } from "node:os";
import { describe, expect, it } from "vitest";
import { expandHome, resolveConfig } from "../src/config.js";

describe("resolveConfig", () => {
  it("returns resolved config with defaults for minimal valid input", () => {
    const cfg = resolveConfig({ logDir: "/tmp/logs" });
    expect(cfg.logDir).toBe("/tmp/logs");
    expect(cfg.filename).toBe("{date}-{channel}.md");
    expect(cfg.maxLength).toBe(4000);
    expect(cfg.includeCron).toBe(false);
    expect(cfg.metadata).toBe(false);
    expect(cfg.userAlias).toBe("user");
    expect(cfg.assistantAlias).toBe("assistant");
    expect(cfg.channels).toEqual({});
  });

  it("uses default logDir when not set", () => {
    const cfg = resolveConfig({});
    expect(cfg.logDir).toBe(homedir() + "/.openclaw/logs");
  });

  it("uses default logDir when config is null", () => {
    const cfg = resolveConfig(null);
    expect(cfg.logDir).toBe(homedir() + "/.openclaw/logs");
  });

  it("expands ~/ in logDir", () => {
    const cfg = resolveConfig({ logDir: "~/clawcode/memory" });
    expect(cfg.logDir).toBe(homedir() + "/clawcode/memory");
  });

  it("passes through maxLength: 0 unchanged", () => {
    const cfg = resolveConfig({ logDir: "/tmp", maxLength: 0 });
    expect(cfg.maxLength).toBe(0);
  });

  it("applies all optional fields when provided", () => {
    const cfg = resolveConfig({
      logDir: "/tmp",
      filename: "{date}-{agent}.md",
      channels: { discord: "{date}-discord.md" },
      userAlias: "scott",
      assistantAlias: "jomama",
      maxLength: 2000,
      includeCron: true,
      metadata: true,
    });
    expect(cfg.filename).toBe("{date}-{agent}.md");
    expect(cfg.channels).toEqual({ discord: "{date}-discord.md" });
    expect(cfg.userAlias).toBe("scott");
    expect(cfg.assistantAlias).toBe("jomama");
    expect(cfg.maxLength).toBe(2000);
    expect(cfg.includeCron).toBe(true);
    expect(cfg.metadata).toBe(true);
  });

  it("ignores extra unknown keys without throwing", () => {
    expect(() =>
      resolveConfig({ logDir: "/tmp", unknownField: "whatever" })
    ).not.toThrow();
  });
});

describe("expandHome", () => {
  it("expands ~/ prefix", () => {
    expect(expandHome("~/foo/bar")).toBe(homedir() + "/foo/bar");
  });

  it("leaves absolute paths unchanged", () => {
    expect(expandHome("/absolute/path")).toBe("/absolute/path");
  });

  it("leaves relative paths unchanged", () => {
    expect(expandHome("relative/path")).toBe("relative/path");
  });
});

import { describe, expect, it } from "vitest";
import type { ScribeConfig } from "../src/config.js";
import type { PluginApi } from "../src/identity.js";
import { resolveAssistantAlias, resolveUserAlias } from "../src/identity.js";

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

function makeApi(
  identityName?: string
): PluginApi {
  return {
    config: {},
    runtime: {
      agent: {
        resolveAgentIdentity: () =>
          identityName !== undefined ? { name: identityName } : undefined,
      },
    },
  };
}

describe("resolveUserAlias", () => {
  it("returns configured userAlias", () => {
    const cfg = { ...BASE_CONFIG, userAlias: "scott_person" };
    expect(resolveUserAlias(cfg)).toBe("scott_person");
  });

  it("returns 'user' when userAlias is not set", () => {
    const cfg = { ...BASE_CONFIG, userAlias: "user" };
    expect(resolveUserAlias(cfg)).toBe("user");
  });
});

describe("resolveAssistantAlias", () => {
  it("returns name from resolveAgentIdentity when available", () => {
    expect(resolveAssistantAlias(makeApi("jomama"), BASE_CONFIG, "main")).toBe(
      "jomama"
    );
  });

  it("falls back to config.assistantAlias when identity unavailable", () => {
    const cfg = { ...BASE_CONFIG, assistantAlias: "MyBot" };
    expect(resolveAssistantAlias(makeApi(undefined), cfg, "main")).toBe("MyBot");
  });

  it("falls back to 'assistant' when identity and config.assistantAlias both missing", () => {
    const cfg = { ...BASE_CONFIG, assistantAlias: "assistant" };
    expect(resolveAssistantAlias(makeApi(undefined), cfg, "main")).toBe(
      "assistant"
    );
  });

  it("falls back gracefully when resolveAgentIdentity throws", () => {
    const api: PluginApi = {
      config: {},
      runtime: {
        agent: {
          resolveAgentIdentity: () => {
            throw new Error("SDK error");
          },
        },
      },
    };
    expect(resolveAssistantAlias(api, BASE_CONFIG, "main")).toBe("assistant");
  });
});

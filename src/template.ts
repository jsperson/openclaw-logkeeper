import type { ScribeConfig } from "./config.js";

export interface TemplateVars {
  date: string;
  channel: string;
  agent: string;
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{date\}/g, vars.date)
    .replace(/\{channel\}/g, vars.channel)
    .replace(/\{agent\}/g, vars.agent);
}

export function resolveFilename(
  config: ScribeConfig,
  channel: string,
  date: string,
  agentId: string
): string {
  const template =
    config.channels?.[channel] ?? config.filename ?? "{date}-{channel}.md";
  return renderTemplate(template, { date, channel, agent: agentId });
}
